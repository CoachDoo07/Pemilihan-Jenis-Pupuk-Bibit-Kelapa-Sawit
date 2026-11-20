const express = require('express');
const router = express.Router();

const DashboardController = require('../controllers/dashboardController');
const recommendationRoutes = require('./recommendationRoutes');
const historyRoutes = require('./historyRoutes');
const settingsRoutes = require('./settingsRoutes');
const authRoutes = require('./authRoutes');

// Halaman Utama: Dashboard
router.get('/', DashboardController.getIndex);

// Sub-routes
router.use('/rekomendasi', recommendationRoutes);
router.use('/riwayat', historyRoutes);
router.use('/pengaturan', settingsRoutes);
router.use('/', authRoutes);

module.exports = router;
