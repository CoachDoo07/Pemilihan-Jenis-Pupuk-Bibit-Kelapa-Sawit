const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Pengaturan bisa dilihat publik / mahasiswa, tetapi edit & reset membutuhkan otentikasi admin
router.get('/', SettingsController.getIndex);

// Update bobot kriteria
router.post('/bobot', requireAdmin, SettingsController.updateWeights);

// Update sel kecocokan matriks
router.post('/matriks', requireAdmin, SettingsController.updateMatrixCell);

// Reset default literatur
router.post('/reset', requireAdmin, SettingsController.resetDefault);

module.exports = router;
