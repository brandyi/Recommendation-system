import pandas as pd
import json
import sys
import os
import argparse
import traceback
import numpy as np
import tensorflow as tf
from recommenders.models.ncf.ncf_singlenode import NCF
from recommenders.models.ncf.dataset import Dataset as NCFDataset
from sklearn.metrics.pairwise import cosine_similarity

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 

TOP_K = 10


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '../..'))


MODEL_PATH = os.path.join(PROJECT_ROOT, "backend/model/trained_model")
TRAIN_FILE = os.path.join(PROJECT_ROOT, "backend/model/model_data/train.csv")
TEST_FILE = os.path.join(PROJECT_ROOT, "backend/model/model_data/test.csv")


def find_similar_users(new_user_ratings, existing_user_ratings, n_neighbors=5, user_col="userID", item_col="itemID", rating_col="rating"):
    """Find n most similar users based on cosine similarity."""
    matrix = existing_user_ratings.pivot(index=user_col, columns=item_col, values=rating_col).fillna(0)
    
    matrix.loc["new_user"] = 0
    for item, rating in new_user_ratings.items():
        if item in matrix.columns:
            matrix.loc["new_user", item] = rating
    
    similarities = cosine_similarity(matrix)
    sim_df = pd.DataFrame(similarities, index=matrix.index, columns=matrix.index)
    
    # Get top N similar users with their similarity scores
    similar_users = sim_df["new_user"].drop("new_user").sort_values(ascending=False).head(n_neighbors)
    return similar_users  # Returns Series with user IDs as index and similarity scores as values

def extract_user_embeddings(model, user_id):
    """Extract GMF and MLP embeddings for a user from the model."""
    # Convert to internal ID
    internal_user_id = model.user2id.get(user_id)
    if internal_user_id is None:
        return None
    
    # Get user embeddings
    user_input_val = np.array([[internal_user_id]])
    
    # Extract GMF embedding
    gmf_embed = model.sess.run(
        model.embedding_gmf_P, 
        {model.user_input: user_input_val}
    )[0]
    
    # Extract MLP embedding
    mlp_embed = model.sess.run(
        model.embedding_mlp_P, 
        {model.user_input: user_input_val}
    )[0]
    
    return gmf_embed, mlp_embed


def retrieve_candidates_cf(genre_preferences=None, decade_preferences=None, k=300, exploration_ratio=0.2, user_id=None):
    """Pre-filter to get candidate items instead of scoring all items."""
       
    print(f"Using genre preferences: {genre_preferences}", file=sys.stderr)
    print(f"Using year preferences: {decade_preferences}", file=sys.stderr)
    
    try:
        # Load movies with genre information
        movies_metadata = pd.read_csv(os.path.join(PROJECT_ROOT, "backend/model/model_data/movies.csv"))
        
        # Extract release year from the title
        movies_metadata['release_year'] = movies_metadata['title'].str.extract(r'\((\d{4})\)').astype(float)

        # Check if the 'genres' column exists
        if 'genres' not in movies_metadata.columns:
            raise ValueError("Movies metadata must contain a 'genres' column")
        
        # Calculate genre preference scores instead of strict filtering
        if genre_preferences and len(genre_preferences) > 0:
            # Add genre match score (count how many preferred genres each movie matches)
            movies_metadata['genre_score'] = movies_metadata['genres'].apply(
                lambda genres: sum(genre in genres.split('|') for genre in genre_preferences)
            )
            
            # Get primary matching candidates (70-80% of recommendations)
            matching_movies = movies_metadata[movies_metadata['genre_score'] > 0]
            # Get exploration candidates (20-30% of recommendations)
            non_matching_movies = movies_metadata[movies_metadata['genre_score'] == 0]
        else:
            # If no genre preferences, give all movies same score
            movies_metadata['genre_score'] = 1
            matching_movies = movies_metadata
            non_matching_movies = pd.DataFrame()
        
        # Apply decade filtering if specified
        if decade_preferences and len(decade_preferences) > 0:
            if not matching_movies.empty:
                year_mask = matching_movies['release_year'].isin(decade_preferences)
                matching_movies = matching_movies[year_mask]
            
            if not non_matching_movies.empty:
                year_mask = non_matching_movies['release_year'].isin(decade_preferences)
                non_matching_movies = non_matching_movies[year_mask]
        
        # Calculate how many items to take from each pool
        exploration_count = int(k * exploration_ratio)
        main_count = k - exploration_count
        
        # Generate user-specific random seed
        random_seed = hash(str(user_id) + str(genre_preferences)) % 10000 if user_id else None
        
        # Get main recommendations - sorted by genre score but randomized within same scores
        if not matching_movies.empty:
            # Sort by genre score (highest first)
            matching_movies = matching_movies.sort_values('genre_score', ascending=False)
            
            # For each genre score group, shuffle separately to maintain preference ranking
            # but add randomness within same-preference items
            main_candidates = []
            for score, group in matching_movies.groupby('genre_score'):
                shuffled_group = group.sample(frac=1, random_state=random_seed)
                main_candidates.append(shuffled_group)
            
            main_candidates = pd.concat(main_candidates)['movieId'].tolist()[:main_count]
        else:
            main_candidates = []
        
        # Get exploration recommendations - completely different genres
        if not non_matching_movies.empty and exploration_count > 0:
            exploration_candidates = non_matching_movies.sample(
                n=min(exploration_count, len(non_matching_movies)), 
                random_state=random_seed
            )['movieId'].tolist()
        else:
            exploration_candidates = []
        
        # Combine both lists
        candidate_items = main_candidates + exploration_candidates
        
        print(f"Retrieved {len(main_candidates)} preference-based and {len(exploration_candidates)} exploration items", file=sys.stderr)
        
        return candidate_items
    
    except Exception as e:
        print(f"Error retrieving candidates: {str(e)}", file=sys.stderr)
        return []

def retrieve_candidates_ncf(genre_preferences=None, decade_preferences=None, k=300, exploration_ratio=0.2, user_id=None):
    """Pre-filter to get candidate items instead of scoring all items."""
       
    print(f"Using genre preferences: {genre_preferences}", file=sys.stderr)
    print(f"Using year preferences: {decade_preferences}", file=sys.stderr)
    
    try:
        # Load movies with genre information
        movies_metadata = pd.read_csv(os.path.join(PROJECT_ROOT, "backend/model/model_data/movies.csv"))
        
        # Extract release year from the title
        movies_metadata['release_year'] = movies_metadata['title'].str.extract(r'\((\d{4})\)').astype(float)

          # Apply decade filtering if specified
        if decade_preferences and len(decade_preferences) > 0:
            year_mask = movies_metadata['release_year'].isin(decade_preferences)
            movies_metadata = movies_metadata[year_mask]

        # Check if the 'genres' column exists
        if 'genres' not in movies_metadata.columns:
            raise ValueError("Movies metadata must contain a 'genres' column")
        
        # Generate user-specific random seed
        random_seed = hash(str(user_id) + str(genre_preferences)) % 10000 if user_id else None
        
        # Calculate genre preference scores instead of strict filtering
        if genre_preferences and len(genre_preferences) > 0:
            # Add genre match score (count how many preferred genres each movie matches)
            movies_metadata['genre_score'] = movies_metadata['genres'].apply(
                lambda genres: sum(genre in genres.split('|') for genre in genre_preferences)
            )
            
            # Reserve specific spots for each preferred genre
            reserved_candidates = []
            
            # 1. First add movies that match ALL selected genres (highest priority)
            if len(genre_preferences) > 1:
                full_matches = movies_metadata[movies_metadata['genres'].apply(
                    lambda genres: all(genre in genres.split('|') for genre in genre_preferences)
                )]
                
                if not full_matches.empty:
                    # Take up to 10 movies that match ALL genres
                    full_match_sample = full_matches.sample(
                        n=min(10, len(full_matches)), 
                        random_state=random_seed
                    )
                    reserved_candidates.extend(full_match_sample['movieId'].tolist())
                    print(f"Added {len(full_match_sample)} movies matching ALL genres", file=sys.stderr)
            
            # 2. Then ensure at least 5 movies from EACH individual genre
            for genre in genre_preferences:
                genre_movies = movies_metadata[movies_metadata['genres'].apply(
                    lambda genres: genre in genres.split('|')
                )]
                
                if not genre_movies.empty:
                    # Exclude movies already added
                    genre_movies = genre_movies[~genre_movies['movieId'].isin(reserved_candidates)]
                    
                    # Take up to 5 movies from this genre
                    genre_sample = genre_movies.sample(
                        n=min(5, len(genre_movies)), 
                        random_state=random_seed
                    )
                    reserved_candidates.extend(genre_sample['movieId'].tolist())
                    print(f"Added {len(genre_sample)} movies for genre {genre}", file=sys.stderr)
            
            # Get remaining candidates with genre matches
            matching_movies = movies_metadata[movies_metadata['genre_score'] > 0]
            matching_movies = matching_movies[~matching_movies['movieId'].isin(reserved_candidates)]
            
            # Get exploration candidates (movies with no genre matches)
            non_matching_movies = movies_metadata[movies_metadata['genre_score'] == 0]
        else:
            # If no genre preferences, give all movies same score
            movies_metadata['genre_score'] = 1
            matching_movies = movies_metadata
            non_matching_movies = pd.DataFrame()
            reserved_candidates = []
        
        # Calculate how many items to take from each pool
        exploration_count = int(k * exploration_ratio)
        reserved_count = len(reserved_candidates)
        main_count = k - exploration_count - reserved_count
        
        # Get main recommendations - sorted by genre score but randomized within same scores
        if not matching_movies.empty and main_count > 0:
            # Sort by genre score (highest first)
            matching_movies = matching_movies.sort_values('genre_score', ascending=False)
            
            # For each genre score group, shuffle separately to maintain preference ranking
            main_candidates = []
            for score, group in matching_movies.groupby('genre_score'):
                shuffled_group = group.sample(frac=1, random_state=random_seed)
                main_candidates.append(shuffled_group)
            
            main_candidates = pd.concat(main_candidates)['movieId'].tolist()[:main_count]
        else:
            main_candidates = []
        
        # Get exploration recommendations - completely different genres
        if not non_matching_movies.empty and exploration_count > 0:
            exploration_candidates = non_matching_movies.sample(
                n=min(exploration_count, len(non_matching_movies)), 
                random_state=random_seed
            )['movieId'].tolist()
        else:
            exploration_candidates = []
        
        # Combine all lists - reserved candidates first for priority
        candidate_items = reserved_candidates + main_candidates + exploration_candidates
        
        print(f"Retrieved {len(reserved_candidates)} reserved, {len(main_candidates)} preference-based, and {len(exploration_candidates)} exploration items", file=sys.stderr)
        
        return candidate_items
    
    except Exception as e:
        print(f"Error retrieving candidates: {str(e)}", file=sys.stderr)
        return []

def add_diversity(recommendations_df, movies_metadata, diversity_weight=0.3, k=10, genre_preferences=None):
    """
    Add diversity to recommendations to avoid similar items dominating results.
    
    Args:
        recommendations_df: DataFrame with itemID and prediction columns
        movies_metadata: DataFrame with movie metadata
        diversity_weight: Weight given to diversity vs prediction score (0-1)
        k: Number of recommendations to return
        genre_preferences: List of preferred genres to boost rather than penalize
    """
    if len(recommendations_df) <= k:
        return recommendations_df
    
    # Merge with metadata to get genre information
    recs_with_meta = recommendations_df.merge(
        movies_metadata[['movieId', 'genres', 'release_year']], 
        left_on='itemID', right_on='movieId', how='left'
    )
    
    # Start with the top predicted item
    selected_ids = [recs_with_meta.iloc[0]['itemID']]
    selected_indices = [0]
    
    # Track genres and decades for diversity
    selected_genres = set()
    for genre in recs_with_meta.iloc[0]['genres'].split('|'):
        selected_genres.add(genre)
    
    # Track which preferred genres are already covered
    covered_preferences = set()
    if genre_preferences:
        for genre in recs_with_meta.iloc[0]['genres'].split('|'):
            if genre in genre_preferences:
                covered_preferences.add(genre)
    
    selected_decades = set()
    year = recs_with_meta.iloc[0]['release_year']
    if not pd.isna(year):
        selected_decades.add(int(year) // 10 * 10)
    
    # Process remaining items
    remaining = recs_with_meta.iloc[1:].copy()
    
    while len(selected_ids) < k and not remaining.empty:
        # Calculate diversity scores for each remaining item
        diversity_scores = []
        
        for idx, row in remaining.iterrows():
            movie_genres = set(row['genres'].split('|'))
            
            # IMPROVED GENRE DIVERSITY CALCULATION
            if genre_preferences:
                # Calculate two types of overlap
                preferred_overlap = len(movie_genres.intersection(set(genre_preferences)))
                non_preferred_overlap = len(movie_genres.intersection(selected_genres - set(genre_preferences)))
                
                # Calculate how many new preferred genres this movie would add
                new_preferences = len(movie_genres.intersection(set(genre_preferences) - covered_preferences))
                
                # Boost for adding new preferred genres, penalize only for non-preferred overlap
                genre_diversity = 0.5  # Base score
                genre_diversity += new_preferences * 0.3  # Big boost for new preferred genres
                genre_diversity += preferred_overlap * 0.1  # Small boost for any preferred genre
                genre_diversity -= non_preferred_overlap / max(1, len(movie_genres)) * 0.2  # Small penalty for non-preferred overlap
            else:
                # Original calculation if no genre preferences specified
                genre_overlap = len(movie_genres.intersection(selected_genres))
                genre_diversity = 1 - (genre_overlap / max(1, len(movie_genres)))
            
            # Ensure genre_diversity is in [0,1] range
            genre_diversity = max(0, min(1, genre_diversity))
            
            # Decade diversity - penalize same decade
            year = row['release_year']
            if not pd.isna(year):
                decade = int(year) // 10 * 10
                decade_diversity = 0 if decade in selected_decades else 1
            else:
                decade_diversity = 1
            
            # Combined diversity score
            diversity_score = (genre_diversity + decade_diversity) / 2
            
            # Balance prediction score with diversity
            combined_score = (1 - diversity_weight) * row['prediction'] + diversity_weight * diversity_score
            diversity_scores.append(combined_score)
        
        # Select item with best combined score
        remaining['diversity_score'] = diversity_scores
        best_idx = remaining['diversity_score'].idxmax()
        best_item = remaining.loc[best_idx]
        
        # Add to selected items
        selected_ids.append(best_item['itemID'])
        selected_indices.append(best_idx)
        
        # Update tracking sets
        for genre in best_item['genres'].split('|'):
            selected_genres.add(genre)
            # Also update covered preferences
            if genre_preferences and genre in genre_preferences:
                covered_preferences.add(genre)
        
        year = best_item['release_year']
        if not pd.isna(year):
            selected_decades.add(int(year) // 10 * 10)
        
        # Remove from remaining pool
        remaining = remaining.drop(best_idx)
    
    # Return the diversified recommendations
    return recommendations_df.iloc[selected_indices]
    

def batch_predict_with_embeddings(model, gmf_embed, mlp_embed, items_to_score, batch_size=100):
    """Make predictions in batches for better performance."""
    try:
        with tf.compat.v1.variable_scope("", reuse=tf.compat.v1.AUTO_REUSE):
            # Load weights once
            mlp_weights1 = model.sess.run(tf.compat.v1.get_variable("mlp/fully_connected/weights"))
            mlp_biases1 = model.sess.run(tf.compat.v1.get_variable("mlp/fully_connected/biases"))
            mlp_weights2 = model.sess.run(tf.compat.v1.get_variable("mlp/fully_connected_1/weights"))
            mlp_biases2 = model.sess.run(tf.compat.v1.get_variable("mlp/fully_connected_1/biases"))
            final_weights = model.sess.run(tf.compat.v1.get_variable("ncf/fully_connected/weights"))
    except Exception as e:
        print(f"Error loading model weights: {str(e)}", file=sys.stderr)
        return [0.5] * len(items_to_score)

    all_predictions = []
    
    # Process in batches
    for i in range(0, len(items_to_score), batch_size):
        batch_items = items_to_score[i:i+batch_size]
        batch_predictions = []
        
        # Get all item embeddings in one go for this batch
        item_ids = [model.item2id.get(item, 0) for item in batch_items]
        item_input_val = np.array([[id] for id in item_ids])
        
        gmf_item_embeds = model.sess.run(
            tf.nn.embedding_lookup(model.embedding_gmf_Q, item_input_val),
            {model.item_input: item_input_val}
        )
        
        mlp_item_embeds = model.sess.run(
            tf.nn.embedding_lookup(model.embedding_mlp_Q, item_input_val),
            {model.item_input: item_input_val}
        )
        
        # Process each item in the batch
        for j, item_id in enumerate(batch_items):
            if item_id not in model.item2id:
                batch_predictions.append(0.0)
                continue
                
            # Get embeddings for this item
            gmf_item_embed = gmf_item_embeds[j][0]
            mlp_item_embed = mlp_item_embeds[j][0]
            
            # GMF path
            gmf_vector = np.multiply(gmf_embed, gmf_item_embed)
            
            # MLP path
            mlp_vector = np.concatenate([mlp_embed, mlp_item_embed])
            mlp_vector = np.maximum(0, np.dot(mlp_vector, mlp_weights1) + mlp_biases1)
            mlp_vector = np.maximum(0, np.dot(mlp_vector, mlp_weights2) + mlp_biases2)
            
            # Final prediction
            ncf_vector = np.concatenate([gmf_vector, mlp_vector])
            prediction = 1.0 / (1.0 + np.exp(-np.dot(ncf_vector, final_weights)))
            batch_predictions.append(float(prediction.item()))
        
        all_predictions.extend(batch_predictions)
        print(f"Processed batch {i//batch_size + 1}/{(len(items_to_score)-1)//batch_size + 1}", file=sys.stderr)
    
    return all_predictions

def get_user_based_cf_recommendations(new_user_ratings, train_data, candidate_items, k=10):
    """
    Generate recommendations using traditional user-based collaborative filtering.
    
    Args:
        new_user_ratings: Dictionary of {item_id: rating} for the target user
        train_data: Training data DataFrame with columns [userID, itemID, rating]
        candidate_items: List of pre-filtered candidate items
        k: Number of recommendations to return
    """
    print("Starting traditional User-Based CF recommendation...", file=sys.stderr)
    
    # Find similar users based on ratings
    similar_users = find_similar_users(new_user_ratings, train_data, n_neighbors=10)
    print(f"Found {len(similar_users)} similar users for UBCF", file=sys.stderr)
    
    # Create user-item matrix with similar users
    similar_user_ids = similar_users.index.tolist()
    user_subset = train_data[train_data['userID'].isin(similar_user_ids)]
    
    
    # Calculate weighted ratings for each item
    cf_predictions = []
    
    # Convert similarity Series to dict for easier lookup
    similarities = similar_users.to_dict()
    
    # Items the target user hasn't rated yet
    candidate_set = set(candidate_items)
    rated_items = set(new_user_ratings.keys())
    items_to_predict = candidate_set - rated_items
    
    for item_id in items_to_predict:
        # Users who rated this item
        users_rated = user_subset[user_subset['itemID'] == item_id]
        
        if users_rated.empty:
            continue
            
        # Calculate weighted average rating
        weighted_sum = 0
        similarity_sum = 0
        
        for user_id in users_rated['userID'].unique():
            if user_id in similarities:
                user_rating = users_rated[users_rated['userID'] == user_id]['rating'].iloc[0]
                user_similarity = similarities[user_id]
                
                weighted_sum += user_rating * user_similarity
                similarity_sum += abs(user_similarity)
        
        if similarity_sum > 0:
            prediction = weighted_sum / similarity_sum
            cf_predictions.append({"itemID": int(item_id), "prediction": float(prediction)})
    
    # Sort and return top-k recommendations
    cf_predictions.sort(key=lambda x: x["prediction"], reverse=True)
    return cf_predictions[:k]

def get_recommendations(user_id=None, ratings_json=None, genre_preferences=None, decade_preferences=None):
    # Existing code for loading model and data...
    print(f"Using model path: {MODEL_PATH}", file=sys.stderr)
    print(f"Using train file: {TRAIN_FILE}", file=sys.stderr)
    print(f"Using test file: {TEST_FILE}", file=sys.stderr)
    
    # Verify files exist
    if not os.path.exists(TRAIN_FILE):
        raise FileNotFoundError(f"Training data file not found: {TRAIN_FILE}")
    if not os.path.exists(TEST_FILE):
        raise FileNotFoundError(f"Test data file not found: {TEST_FILE}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model directory not found: {MODEL_PATH}")
    
    train = pd.read_csv(TRAIN_FILE)
    data = NCFDataset(train_file=TRAIN_FILE, test_file=TEST_FILE)

    # Load model
    model = NCF(
        n_users=data.n_users, 
        n_items=data.n_items,
        model_type="NeuMF",
        n_factors=64,
        layer_sizes=[128,64,32],
        n_epochs=50,
        batch_size=256,
        learning_rate=0.004,
        verbose=10,
        seed=42
    )
    
    model.load(neumf_dir=MODEL_PATH)
    model.user2id = data.user2id
    model.item2id = data.item2id
    model.id2user = data.id2user
    model.id2item = data.id2item
    
    if ratings_json:
        # COLD START APPROACH
        new_user_ratings = json.loads(ratings_json)
        new_user_ratings = {int(k): float(v) for k, v in new_user_ratings.items()}
        
        # 1. RETRIEVAL PHASE - Get candidate items 
        print("Starting retrieval phase...", file=sys.stderr)
        ncf_candidates = retrieve_candidates_ncf(
            genre_preferences=genre_preferences,
            decade_preferences=decade_preferences, 
            k=500
        )
        cf_candidates = retrieve_candidates_cf(
            genre_preferences=genre_preferences,
            decade_preferences=decade_preferences,
            exploration_ratio=0.05, 
            k=800
        )
        print(f"Retrieved {len(ncf_candidates)} candidate items", file=sys.stderr)
        print(f"Retrieved {len(cf_candidates)} candidate items", file=sys.stderr)
        
        # 2A NCF PHASE
        # 2. RANKING PHASE - Find similar users
        similar_users = find_similar_users(new_user_ratings, train, n_neighbors=5)
        
        if len(similar_users) == 0:
            raise ValueError("Could not find similar users")
        
        print(f"Found {len(similar_users)} similar users", file=sys.stderr)
        
        # Collect embeddings for each similar user
        gmf_embeddings = []
        mlp_embeddings = []
        weights = []
        
        for user_id, similarity in similar_users.items():
            embeddings = extract_user_embeddings(model, user_id)
            if embeddings:
                gmf_embed, mlp_embed = embeddings
                gmf_embeddings.append(gmf_embed)
                mlp_embeddings.append(mlp_embed)
                weights.append(similarity)
                print(f"User {user_id} with similarity {similarity:.4f}", file=sys.stderr)
        
        if not gmf_embeddings:
            raise ValueError("Could not extract embeddings for similar users")
        
        weights = np.array(weights)
        weights /= weights.sum()

        # Calculate weighted average embeddings
        avg_gmf_embedding = np.average(gmf_embeddings, axis=0, weights=weights)
        avg_mlp_embedding = np.average(mlp_embeddings, axis=0, weights=weights)
        
        # Make predictions on candidate items using batched prediction
        try:
            print("Making batch predictions with embeddings...", file=sys.stderr)
            predictions = batch_predict_with_embeddings(
                model, 
                avg_gmf_embedding, 
                avg_mlp_embedding, 
                ncf_candidates,
                batch_size=50
            )
        except Exception as e:
            print(f"Error in batch prediction: {str(e)}", file=sys.stderr)
            # Fallback to regular prediction
            most_similar_user = similar_users.index[0]
            user_list = [most_similar_user] * len(ncf_candidates)
            predictions = model.predict(user_list, ncf_candidates, is_list=True)
        
        user_for_prediction = 0  # Placeholder for cold start user
        items_to_score = ncf_candidates
    
    # Create recommendation dataframe
    recs_df = pd.DataFrame({
        "userID": [user_for_prediction] * len(items_to_score),
        "itemID": items_to_score,
        "prediction": predictions
    }).sort_values(by="prediction", ascending=False).head(TOP_K)

    movies_metadata = pd.read_csv(os.path.join(PROJECT_ROOT, "backend/model/model_data/movies.csv"))

    diversified_recs_df = add_diversity(recs_df, movies_metadata, diversity_weight=0.5, k=TOP_K, genre_preferences=genre_preferences)

    #2B USER-BASED CF PHASE
    ubcf_recs = get_user_based_cf_recommendations(
            new_user_ratings, 
            train, 
            cf_candidates,
            k=TOP_K
        )
    
    return{"ncf_recommendations": diversified_recs_df.to_dict(orient='records'),
            "cf_recommendations": ubcf_recs}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Get movie recommendations')
    parser.add_argument('--user_id', type=str, help='User ID for recommendations')
    parser.add_argument('--ratings', type=str, help='JSON string with item IDs and ratings')
    parser.add_argument('--genres', type=str, help='JSON string with genre preferences')
    parser.add_argument('--decade', type=str, help='JSON string with decade preferences')
    
    args = parser.parse_args()
    
    if not args.user_id and not args.ratings:
        print(json.dumps({"error": "Either user_id or ratings must be provided"}))
        sys.exit(1)
    
    genre_preferences = None
    if args.genres:
        genre_preferences = json.loads(args.genres)

    decade_preferences = None
    if args.decade:
        decade_preferences = json.loads(args.decade)

    try:
        recommendations = get_recommendations(args.user_id, args.ratings, genre_preferences, decade_preferences)
        print(json.dumps(recommendations), flush=True)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)