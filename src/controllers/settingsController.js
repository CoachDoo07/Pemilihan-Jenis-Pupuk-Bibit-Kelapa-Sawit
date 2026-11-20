const db = require('../config/database');
const { resetMatrixToDefault } = require('../config/seed');

class SettingsController {
  /**
   * Menampilkan halaman pengaturan bobot dan tabel kecocokan
   */
  static getIndex(req, res) {
    try {
      const criteria = db.prepare('SELECT * FROM criteria ORDER BY code ASC').all();
      const fertilizers = db.prepare('SELECT * FROM fertilizers ORDER BY code ASC').all();
      const matrixRows = db.prepare(`
        SELECT sm.*, f.name as fertilizer_name 
        FROM suitability_matrix sm
        JOIN fertilizers f ON sm.fertilizer_code = f.code
        ORDER BY sm.criteria_code ASC, sm.subcriteria_code ASC, sm.fertilizer_code ASC
      `).all();

      // Hitung total bobot saat ini
      const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
      const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001;

      // Group matrix by subcriteria
      const groupedMatrix = {};
      matrixRows.forEach(row => {
        const key = `${row.criteria_code}_${row.subcriteria_code}`;
        if (!groupedMatrix[key]) {
          groupedMatrix[key] = {
            criteriaCode: row.criteria_code,
            subcriteriaCode: row.subcriteria_code,
            subcriteriaName: row.subcriteria_name,
            items: []
          };
        }
        groupedMatrix[key].items.push(row);
      });

      res.render('settings/index', {
        title: 'Pengaturan Bobot Kriteria & Tabel Kecocokan',
        criteria,
        fertilizers,
        groupedMatrix,
        totalWeight: Number(totalWeight.toFixed(4)),
        isWeightValid
      });
    } catch (error) {
      console.error('Error on settings index:', error);
      res.status(500).send('Terjadi kesalahan: ' + error.message);
    }
  }

  /**
   * Update Bobot Kriteria (Validasi Total Bobot Harus = 1.0)
   */
  static updateWeights(req, res) {
    try {
      const { w_C1, w_C2, w_C3, w_C4 } = req.body;

      const c1 = parseFloat(w_C1);
      const c2 = parseFloat(w_C2);
      const c3 = parseFloat(w_C3);
      const c4 = parseFloat(w_C4);

      if (isNaN(c1) || isNaN(c2) || isNaN(c3) || isNaN(c4)) {
        req.session.flash = {
          type: 'error',
          message: 'Nilai bobot kriteria harus berupa angka valid!'
        };
        return res.redirect('/pengaturan');
      }

      const total = c1 + c2 + c3 + c4;
      if (Math.abs(total - 1.0) > 0.001) {
        req.session.flash = {
          type: 'error',
          message: `Total bobot kriteria harus tepat bernilai 1.00 (100%). Total input saat ini: ${total.toFixed(4)}.`
        };
        return res.redirect('/pengaturan');
      }

      const updateStmt = db.prepare('UPDATE criteria SET weight = ? WHERE code = ?');
      const transaction = db.transaction(() => {
        updateStmt.run(c1, 'C1');
        updateStmt.run(c2, 'C2');
        updateStmt.run(c3, 'C3');
        updateStmt.run(c4, 'C4');
      });
      transaction();

      req.session.flash = {
        type: 'success',
        message: 'Bobot kriteria berhasil diperbarui! (Total bobot = 1.00)'
      };
      res.redirect('/pengaturan');
    } catch (error) {
      console.error('Error updating weights:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal memperbarui bobot: ' + error.message
      };
      res.redirect('/pengaturan');
    }
  }

  /**
   * Update Nilai Kecocokan dalam Tabel Matrix
   */
  static updateMatrixCell(req, res) {
    try {
      const { id, score, rationale } = req.body;
      const numScore = parseInt(score, 10);

      if (isNaN(numScore) || numScore < 1 || numScore > 5) {
        req.session.flash = {
          type: 'error',
          message: 'Nilai kecocokan harus bernilai antara 1 sampai 5!'
        };
        return res.redirect('/pengaturan');
      }

      db.prepare(`
        UPDATE suitability_matrix 
        SET score = ?, rationale = ?
        WHERE id = ?
      `).run(numScore, rationale || '', id);

      req.session.flash = {
        type: 'success',
        message: 'Nilai kecocokan berhasil disimpan!'
      };
      res.redirect('/pengaturan');
    } catch (error) {
      console.error('Error updating matrix cell:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal memperbarui nilai kecocokan: ' + error.message
      };
      res.redirect('/pengaturan');
    }
  }

  /**
   * Reset Bobot dan Tabel Kecocokan ke Default Rancangan Awal (Point 1 & 13)
   */
  static resetDefault(req, res) {
    try {
      // Panggil fungsi resetMatrixToDefault yang khusus untuk reset (Point 1)
      resetMatrixToDefault();

      req.session.flash = {
        type: 'success',
        message: 'Pengaturan bobot dan tabel kecocokan berhasil dikembalikan ke default rancangan awal (belum tervalidasi literatur/petugas).'
      };
      res.redirect('/pengaturan');
    } catch (error) {
      console.error('Error resetting defaults:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal mereset pengaturan: ' + error.message
      };
      res.redirect('/pengaturan');
    }
  }
}

module.exports = SettingsController;
