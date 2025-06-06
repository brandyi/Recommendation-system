import json
import sys
import os
import argparse
import traceback
import numpy as np
import pandas as pd
import tensorflow as tf
from recommenders.models.ncf.ncf_singlenode import NCF
from recommenders.models.ncf.dataset import Dataset as NCFDataset
from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

##############################################################################
# INITIALIZATION
##############################################################################

# Constants for recommendation settings
TOP_K = 10  # Number of top recommendations to return

# Paths for project directories and files
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '../..'))

# Debug output for paths
print(f"SCRIPT_DIR: {SCRIPT_DIR}", file=sys.stderr)
print(f"PROJECT_ROOT: {PROJECT_ROOT}", file=sys.stderr)

# Paths for model and data files
MODEL_PATH = os.path.join(PROJECT_ROOT, "model_training/ncf_neuMF/")
TRAIN_FILE = os.path.join(PROJECT_ROOT, "model_training/ml-32m/train.csv")
MOVIES_FILE = os.path.join(PROJECT_ROOT, "model_training/ml-32m/movies.csv")

# Debug output for file existence
print(f"Final MODEL_PATH: {MODEL_PATH}", file=sys.stderr)
print(f"MODEL_PATH exists: {os.path.exists(MODEL_PATH)}", file=sys.stderr)

##############################################################################
# NCF RELATED FUNCTIONS
##############################################################################

def create_user_embedding_from_items(model, user_ratings):
    """
    Create user embeddings directly from rated items using the NCF model.
    Args:
        model: NCF model with loaded embeddings.
        user_ratings: Dictionary of {item_id: rating} for the target user.
    Returns:
        Tuple of (gmf_embedding, mlp_embedding) for the user.
    """
    print(f"Creating user embedding from {len(user_ratings)} rated items", file=sys.stderr)

    # Filter valid items that exist in the model
    valid_items = [(model.item2id[item_id], rating) 
                   for item_id, rating in user_ratings.items() 
                   if item_id in model.item2id]

    if not valid_items:
        print("No valid items found for embedding creation", file=sys.stderr)
        return None

    item_ids, ratings = zip(*valid_items)
    item_ids = list(item_ids)
    ratings = np.array(ratings)

    # Normalize ratings to [0, 1]
    rating_weights = (ratings - 1) / 4.0  # assumes ratings from 1 to 5

    # Prevent division by zero
    if rating_weights.sum() == 0:
        rating_weights = np.ones_like(rating_weights)
    rating_weights /= rating_weights.sum()

    # Perform batched embedding lookups
    gmf_item_embeddings = model.sess.run(
        tf.nn.embedding_lookup(model.embedding_gmf_Q, item_ids)
    )
    mlp_item_embeddings = model.sess.run(
        tf.nn.embedding_lookup(model.embedding_mlp_Q, item_ids)
    )

    # Compute weighted average of embeddings
    avg_gmf_embedding = np.average(gmf_item_embeddings, axis=0, weights=rating_weights)
    avg_mlp_embedding = np.average(mlp_item_embeddings, axis=0, weights=rating_weights)

    return avg_gmf_embedding, avg_mlp_embedding

def retrieve_candidates_ncf(genre_preferences=None, decade_preferences=None, k=5000, exploration_ratio=0.2):
    """
    Pre-filter to get candidate items based on genre and decade preferences.
    Args:
        genre_preferences: List of preferred genres.
        decade_preferences: List of preferred decades.
        k: Number of candidates to retrieve.
        exploration_ratio: Ratio of exploration items.
    Returns:
        List of candidate item IDs.
    """
    print(f"Using genre preferences: {genre_preferences}", file=sys.stderr)
    print(f"Using year preferences: {decade_preferences}", file=sys.stderr)

    genre_sample_size = max(int(k * 0.01), 5)
    all_genre_matches_size = max(int(k * 0.005), 10)
    max_reserved = int(k * 0.3)  # Cap reserved candidates to 30% of k

    try:
        movies_metadata = pd.read_csv(MOVIES_FILE)
        movies_metadata['release_year'] = movies_metadata['title'].str.extract(r'\((\d{4})\)').astype(float)

        if decade_preferences:
            year_mask = movies_metadata['release_year'].isin(decade_preferences)
            movies_metadata = movies_metadata[year_mask]

        if 'genres' not in movies_metadata.columns:
            raise ValueError("Movies metadata must contain a 'genres' column")

        if genre_preferences:
            genre_set = set(genre_preferences)
            
            # Compute Jaccard similarity for genre preferences
            def jaccard_score(genres):
                movie_genres = set(genres.split('|'))
                intersection = genre_set & movie_genres
                union = genre_set | movie_genres
                return len(intersection) / len(union) if union else 0

            movies_metadata['genre_score'] = movies_metadata['genres'].apply(jaccard_score)
            
            reserved_candidates = []

            if len(genre_preferences) > 1:
                full_matches = movies_metadata[movies_metadata['genres'].apply(
                    lambda g: genre_set.issubset(set(g.split('|')))
                )]
                if not full_matches.empty:
                    full_match_sample = full_matches.sample(n=min(all_genre_matches_size, len(full_matches)), random_state=42)
                    reserved_candidates.extend(full_match_sample['movieId'].tolist())

            for genre in genre_preferences:
                genre_movies = movies_metadata[movies_metadata['genres'].apply(lambda g: genre in g.split('|'))]
                genre_movies = genre_movies[~genre_movies['movieId'].isin(reserved_candidates)]
                genre_sample = genre_movies.sample(n=min(genre_sample_size, len(genre_movies)), random_state=42)
                reserved_candidates.extend(genre_sample['movieId'].tolist())

            reserved_candidates = reserved_candidates[:max_reserved]

            matching_movies = movies_metadata[movies_metadata['genre_score'] > 0]
            matching_movies = matching_movies[~matching_movies['movieId'].isin(reserved_candidates)]
            non_matching_movies = movies_metadata[movies_metadata['genre_score'] == 0]
        else:
            movies_metadata['genre_score'] = 1
            matching_movies = movies_metadata
            non_matching_movies = pd.DataFrame()
            reserved_candidates = []

        exploration_count = int(k * exploration_ratio)
        reserved_count = len(reserved_candidates)
        main_count = k - exploration_count - reserved_count

        main_candidates = []
        if not matching_movies.empty and main_count > 0:
            matching_movies = matching_movies.sort_values('genre_score', ascending=False)
            for _, group in matching_movies.groupby('genre_score'):
                shuffled = group.sample(frac=1, random_state=42)
                main_candidates.append(shuffled)
            main_candidates = pd.concat(main_candidates)['movieId'].tolist()[:main_count]

        exploration_candidates = []
        if not non_matching_movies.empty and exploration_count > 0:
            # Prefer popular ones in exploration
            if 'popularity' in non_matching_movies.columns:
                non_matching_movies = non_matching_movies.sort_values('popularity', ascending=False)
            exploration_candidates = non_matching_movies.sample(n=min(exploration_count, len(non_matching_movies)), random_state=42)['movieId'].tolist()

        candidate_items = reserved_candidates + main_candidates + exploration_candidates

        print(f"Retrieved {len(reserved_candidates)} reserved, {len(main_candidates)} preference-based, and {len(exploration_candidates)} exploration items", file=sys.stderr)

        return candidate_items

    except Exception as e:
        print(f"Error retrieving candidates: {str(e)}", file=sys.stderr)
        return []

def batch_predict_with_embeddings(model, gmf_embed, mlp_embed, items_to_score, batch_size=500):
    """
    Make predictions in batches for better performance using embeddings.
    Args:
        model: NCF model.
        gmf_embed: GMF embedding for the user.
        mlp_embed: MLP embedding for the user.
        items_to_score: List of item IDs to score.
        batch_size: Batch size for predictions.
    Returns:
        List of predictions for the items.
    """
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

##############################################################################
# CF RELATED FUNCTIONS
##############################################################################

def get_recommendations_ubcf(user_id, new_user_ratings, genre_preferences=None, decade_preferences=None):
    """
    Generate recommendations using User-Based Collaborative Filtering (UBCF).
    Args:
        user_id: ID of the user requesting recommendations.
        new_user_ratings: Dictionary of {item_id: rating} for the new user.
        genre_preferences: List of preferred genres.
        decade_preferences: List of preferred decades.
    Returns:
        List of recommendations with predicted ratings.
    """
    try:
        # 1. Load ratings data
        print("Starting User-Based CF recommendation process...", file=sys.stderr)
        
        # Load ratings data from the training file
        ratings_df = pd.read_csv(TRAIN_FILE)
        
        # Create a new user ID
        new_user_id = ratings_df['userID'].max() + 1
        print(f"Created new user with ID {new_user_id} with {len(new_user_ratings)} ratings", file=sys.stderr)
        
        # Append new user ratings
        new_rows = pd.DataFrame([
            {'userID': new_user_id, 'itemID': int(iid), 'rating': r}
            for iid, r in new_user_ratings.items()
        ])
        ratings_df = pd.concat([ratings_df, new_rows], ignore_index=True)
        
        # 2. Create mappings for user and item IDs
        unique_users = ratings_df['userID'].unique()
        unique_items = ratings_df['itemID'].unique()
        user_idx_map = {uid: i for i, uid in enumerate(unique_users)}
        item_idx_map = {iid: i for i, iid in enumerate(unique_items)}
        
        # Track mapping back to original IDs
        idx_to_item = {v: k for k, v in item_idx_map.items()}
        
        # Get new user's index
        new_user_idx = user_idx_map[new_user_id]
        
        # 3. Create sparse user-item matrix
        row_indices = [user_idx_map[uid] for uid in ratings_df['userID']]
        col_indices = [item_idx_map[iid] for iid in ratings_df['itemID']]
        data_values = ratings_df['rating'].values
        
        user_item_sparse = sparse.csr_matrix(
            (data_values, (row_indices, col_indices)),
            shape=(len(unique_users), len(unique_items))
        )
        
        print(f"Created sparse user-item matrix with shape {user_item_sparse.shape}", file=sys.stderr)
        
        # 4. Calculate user means
        user_ratings_count = np.diff(user_item_sparse.indptr)
        user_ratings_sum = np.zeros(user_item_sparse.shape[0])
        for i in range(user_item_sparse.shape[0]):
            user_ratings_sum[i] = user_item_sparse[i].sum()
        
        user_means = np.zeros(user_item_sparse.shape[0])
        nonzero_counts = (user_ratings_count > 0)
        user_means[nonzero_counts] = user_ratings_sum[nonzero_counts] / user_ratings_count[nonzero_counts]
        
        # Get new user's mean
        u_mean = user_means[new_user_idx]
        
        # 5. Center the ratings by subtracting user means
        centered_sparse = user_item_sparse.copy()
        for i in range(centered_sparse.shape[0]):
            if user_ratings_count[i] > 0:
                start_idx = centered_sparse.indptr[i]
                end_idx = centered_sparse.indptr[i+1]
                centered_sparse.data[start_idx:end_idx] -= user_means[i]
        
        # 6. Compute similarity - an approximation of Pearson using cosine on centered data
        new_user_vec = centered_sparse[new_user_idx]
        user_similarities = cosine_similarity(new_user_vec, centered_sparse).flatten()
        
        # Get item overlap counts for shrinkage
        new_user_items = set(new_user_ratings.keys())
        overlap_counts = np.zeros(len(unique_users))
        
        # Calculate overlap more efficiently using sparse matrix properties
        new_user_nonzero = set(user_item_sparse[new_user_idx].nonzero()[1])
        for i in range(user_item_sparse.shape[0]):
            if i != new_user_idx:
                user_nonzero = set(user_item_sparse[i].nonzero()[1])
                overlap_counts[i] = len(new_user_nonzero.intersection(user_nonzero))
        
        # 7. Apply shrinkage: shrunk = (n / (n + λ)) * ρ
        λ = 10  # regularization constant
        shrinkage = overlap_counts / (overlap_counts + λ)
        user_similarities *= shrinkage
        
        # 8. Select top-K neighbors
        K = 20
        # Set self-similarity to 0 to exclude from neighbors
        user_similarities[new_user_idx] = 0
        
        # Find indices of top K users by similarity
        top_neighbors_idx = np.argsort(-user_similarities)[:K]
        # Filter out users with zero similarity
        top_neighbors_idx = [idx for idx in top_neighbors_idx if user_similarities[idx] > 0]
        top_neighbors_weights = {idx: user_similarities[idx] for idx in top_neighbors_idx}
        
        print(f"Selected {len(top_neighbors_idx)} neighbors for CF", file=sys.stderr)
        
        # 9. Predict ratings for unrated items
        rated_items_idx = set(new_user_vec.nonzero()[1])
        all_items_idx = set(range(len(unique_items)))
        unrated_items_idx = all_items_idx - rated_items_idx

        # Add after loading ratings data in get_recommendations_ubcf
        if genre_preferences or decade_preferences:
            # Load movie metadata
            movies_metadata = pd.read_csv(MOVIES_FILE)
            movies_metadata['release_year'] = movies_metadata['title'].str.extract(r'\((\d{4})\)').astype(float)
            
            # Filter by decade if specified
            filtered_items = set(movies_metadata['movieId'].tolist())
            if decade_preferences:
                year_mask = movies_metadata['release_year'].isin(decade_preferences)
                filtered_items = set(movies_metadata[year_mask]['movieId'].tolist())
            
            # Filter by genre if specified
            if genre_preferences:
                genre_mask = movies_metadata['genres'].apply(
                    lambda g: any(genre in g.split('|') for genre in genre_preferences)
                )
                genre_items = set(movies_metadata[genre_mask]['movieId'].tolist())
                filtered_items = filtered_items.intersection(genre_items) if decade_preferences else genre_items
            
            # Only predict for items that match preferences
            unrated_items_idx = [idx for idx in unrated_items_idx 
                                 if idx_to_item[idx] in filtered_items]
        
        print(f"Predicting ratings for {len(unrated_items_idx)} unrated items", file=sys.stderr)
        
        predictions = {}
        for item_idx in unrated_items_idx:
            num, den = 0.0, 0.0
            for neighbor_idx, weight in top_neighbors_weights.items():
                # Get the neighbor's original rating for this item
                rating = user_item_sparse[neighbor_idx, item_idx]
                if rating != 0:  # If the neighbor rated this item
                    neigh_mean = user_means[neighbor_idx]
                    num += weight * (rating - neigh_mean)
                    den += abs(weight)
            
            if den > 0:
                pred = u_mean + num / den
                # Map back to original item ID
                orig_item_id = idx_to_item[item_idx]
                # Clamp to valid rating range
                predictions[orig_item_id] = float(max(1.0, min(5.0, pred)))
        
        # 10. Generate top-N recommendations
        TOP_N = 10
        top_N = sorted(
            predictions.items(),
            key=lambda x: x[1],
            reverse=True
        )[:TOP_N]
        
        print(f"Generated {len(top_N)} recommendations using User-Based CF", file=sys.stderr)
        
        # Format results
        recommendations = [
            {
                "userID": int(new_user_id),
                "itemID": int(item_id),
                "prediction": float(score)
            }
            for item_id, score in top_N
        ]
        
        return recommendations
    
    except Exception as e:
        print(f"Error in User-Based CF: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

###############################################################################
# MAIN FUNCTION
###############################################################################

def get_recommendations(user_id=None, ratings_json=None, genre_preferences=None, decade_preferences=None):
    """
    Generate movie recommendations using NCF and UBCF methods.
    Args:
        user_id: ID of the user requesting recommendations.
        ratings_json: JSON string with item IDs and ratings.
        genre_preferences: List of preferred genres.
        decade_preferences: List of preferred decades.
    Returns:
        Dictionary containing NCF and UBCF recommendations.
    """
    # Existing code for loading model and data...
    print(f"Using model path: {MODEL_PATH}", file=sys.stderr)
    print(f"Using train file: {TRAIN_FILE}", file=sys.stderr)
    
    # Verify files exist
    if not os.path.exists(TRAIN_FILE):
        raise FileNotFoundError(f"Training data file not found: {TRAIN_FILE}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model directory not found: {MODEL_PATH}")
    
    
    data = NCFDataset(train_file=TRAIN_FILE)

    # Load model
    model = NCF (
        n_users=data.n_users, 
        n_items=data.n_items,
        model_type="NeuMF",
        n_factors=128,
        layer_sizes=[256, 128, 64],
        n_epochs=10,
        batch_size=8192,
        learning_rate=0.001,
        verbose=1,
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
            exploration_ratio=0.1,
            k=5000
        )

        print(f"Retrieved {len(ncf_candidates)} ncf candidate items", file=sys.stderr)

        
        # 2A NCF PHASE
        print("Creating user embedding from rated items...", file=sys.stderr)
        user_embeddings = create_user_embedding_from_items(model, new_user_ratings)
    
        if not user_embeddings:
            raise ValueError("Could not create user embedding from rated items")
    
        avg_gmf_embedding, avg_mlp_embedding = user_embeddings
        try:
            print("Making batch predictions with embeddings...", file=sys.stderr)
            predictions = batch_predict_with_embeddings(
                model, 
                avg_gmf_embedding, 
                avg_mlp_embedding, 
                ncf_candidates,
                batch_size=100
            )
        except Exception as e:
            print(f"Error in batch prediction: {str(e)}", file=sys.stderr)
        
        user_for_prediction = 0  # Placeholder for cold start user
        items_to_score = ncf_candidates
    
    # Create recommendation dataframe
    recs_df = pd.DataFrame({
        "userID": [user_for_prediction] * len(items_to_score),
        "itemID": items_to_score,
        "prediction": predictions
    }).sort_values(by="prediction", ascending=False).head(TOP_K)

    #2B USER-BASED CF PHASE
    ubcf_recs = get_recommendations_ubcf(user_id, new_user_ratings, genre_preferences, decade_preferences)

    
    return{"ncf_recommendations": recs_df.to_dict(orient='records'),
            "cf_recommendations": ubcf_recs}

###############################################################################
# MAIN EXEC
###############################################################################

if __name__ == "__main__":
    # Parse command-line arguments for recommendation inputs
    parser = argparse.ArgumentParser(description='Get movie recommendations')
    parser.add_argument('--user_id', type=str, help='User ID for recommendations')
    parser.add_argument('--ratings', type=str, help='JSON string with item IDs and ratings')
    parser.add_argument('--genres', type=str, help='JSON string with genre preferences')
    parser.add_argument('--decade', type=str, help='JSON string with decade preferences')
    
    args = parser.parse_args()
    
    # Ensure either user_id or ratings are provided
    if not args.user_id and not args.ratings:
        print(json.dumps({"error": "Either user_id or ratings must be provided"}))
        sys.exit(1)
    
    # Parse genre and decade preferences
    genre_preferences = None
    if args.genres:
        genre_preferences = json.loads(args.genres)

    decade_preferences = None
    if args.decade:
        decade_preferences = json.loads(args.decade)

    try:
        # Generate recommendations and output as JSON
        recommendations = get_recommendations(args.user_id, args.ratings, genre_preferences, decade_preferences)
        print(json.dumps(recommendations), flush=True)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)