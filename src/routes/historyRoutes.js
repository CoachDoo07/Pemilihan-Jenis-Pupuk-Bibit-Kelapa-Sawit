const express = require('express');
const router = express.Router();
const HistoryController = require('../controllers/historyController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Daftar riwayat (publik dapat melihat)
router.get('/', HistoryController.getIndex);

// Ekspor CSV
router.get('/export/csv', HistoryController.exportCsv);

// Hapus satu data riwayat (HANYA ADMIN, Point 9)
router.post('/hapus/:id', requireAdmin, HistoryController.deleteItem);

// Kosongkan seluruh riwayat (HANYA ADMIN)
router.post('/kosongkan', requireAdmin, HistoryController.clearAll);

module.exports = router;
