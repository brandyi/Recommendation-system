import express from 'express';
import {getMovies, getChanged, rateMovies, getLikedMovies, likeMovie, unlikeMovie } from '../controllers/moviesController.js';
const router = express.Router();

router.get('/', getMovies);

router.get('/change', getChanged);

router.get('/liked', getLikedMovies);

router.post('/rate', rateMovies); 

router.post('/like/:movieId', likeMovie);

router.delete('/unlike/:movieId', unlikeMovie);

export default router;