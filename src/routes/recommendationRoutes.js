const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');

// Halaman form input baru
router.get('/baru', RecommendationController.getForm);

// Submit form & hitung SAW
router.post('/hitung', RecommendationController.postCalculate);

// Halaman hasil rekomendasi & rincian matriks
router.get('/hasil/:id', RecommendationController.getResult);

module.exports = router;
