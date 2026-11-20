const db = require('../config/database');

class DashboardController {
  static getIndex(req, res) {
    try {
      // 1. Total Rekomendasi
      const totalRecs = db.prepare('SELECT COUNT(*) as count FROM recommendations').get().count;

      // 2. Pupuk Terbanyak Direkomendasikan
      const topFert = db.prepare(`
        SELECT top_fertilizer_name, COUNT(*) as count 
        FROM recommendations 
        WHERE timing_status != 'TUNDA' AND top_fertilizer_name IS NOT NULL
        GROUP BY top_fertilizer_name 
        ORDER BY count DESC 
        LIMIT 1
      `).get();

      // 3. Distribusi Status Waktu
      const timingCounts = db.prepare(`
        SELECT timing_status, COUNT(*) as count 
        FROM recommendations 
        GROUP BY timing_status
      `).all();

      const timingStats = {
        LAYAK: 0,
        SIRAM_DAHULU: 0,
        TUNDA: 0
      };
      timingCounts.forEach(t => {
        if (timingStats.hasOwnProperty(t.timing_status)) {
          timingStats[t.timing_status] = t.count;
        }
      });

      // 4. Distribusi Pupuk Terpilih (untuk Chart.js)
      const fertDistribution = db.prepare(`
        SELECT top_fertilizer_name, COUNT(*) as count 
        FROM recommendations 
        WHERE timing_status != 'TUNDA' AND top_fertilizer_name IS NOT NULL
        GROUP BY top_fertilizer_name 
        ORDER BY count DESC
      `).all();

      // 5. Distribusi Fase Bibit (untuk Chart.js)
      const phaseDistribution = db.prepare(`
        SELECT growth_phase, COUNT(*) as count 
        FROM recommendations 
        GROUP BY growth_phase
      `).all();

      // 6. Rekomendasi Terbaru (5 Terakhir)
      const recentRecs = db.prepare(`
        SELECT id, batch_code, variety, growth_phase, leaf_condition, media_ph, media_moisture,
               timing_status, top_fertilizer_name, top_score, is_equivalent, created_at
        FROM recommendations 
        ORDER BY id DESC 
        LIMIT 5
      `).all();

      // 7. Info Kriteria & Bobot Aktif
      const criteria = db.prepare('SELECT code, name, weight FROM criteria ORDER BY code ASC').all();

      res.render('dashboard', {
        title: 'Dashboard Pembibitan Kelapa Sawit',
        totalRecs,
        topFert: topFert ? topFert.top_fertilizer_name : 'Belum Ada',
        topFertCount: topFert ? topFert.count : 0,
        timingStats,
        fertDistribution,
        phaseDistribution,
        recentRecs,
        criteria
      });
    } catch (error) {
      console.error('Error on dashboard:', error);
      res.status(500).send('Terjadi kesalahan pada dashboard: ' + error.message);
    }
  }
}

module.exports = DashboardController;
