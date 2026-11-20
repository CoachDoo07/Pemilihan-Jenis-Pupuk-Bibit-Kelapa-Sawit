const db = require('../config/database');

class HistoryController {
  /**
   * Menampilkan daftar seluruh riwayat rekomendasi
   */
  static getIndex(req, res) {
    try {
      const { status, phase, q } = req.query;

      let query = 'SELECT * FROM recommendations WHERE 1=1';
      const params = [];

      if (status && status !== 'all') {
        query += ' AND timing_status = ?';
        params.push(status);
      }

      if (phase && phase !== 'all') {
        query += ' AND growth_phase = ?';
        params.push(phase);
      }

      if (q && q.trim()) {
        query += ' AND (batch_code LIKE ? OR variety LIKE ? OR top_fertilizer_name LIKE ?)';
        const searchTerm = `%${q.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY id DESC';

      const recommendations = db.prepare(query).all(...params);

      res.render('history/index', {
        title: 'Riwayat Rekomendasi Pupuk',
        recommendations,
        filters: {
          status: status || 'all',
          phase: phase || 'all',
          q: q || ''
        }
      });
    } catch (error) {
      console.error('Error on history index:', error);
      res.status(500).send('Terjadi kesalahan: ' + error.message);
    }
  }

  /**
   * Hapus satu data riwayat
   */
  static deleteItem(req, res) {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM recommendations WHERE id = ?').run(id);

      req.session.flash = {
        type: 'success',
        message: 'Data riwayat berhasil dihapus.'
      };
      res.redirect('/riwayat');
    } catch (error) {
      console.error('Error on deleteItem:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal menghapus data: ' + error.message
      };
      res.redirect('/riwayat');
    }
  }

  /**
   * Hapus seluruh data riwayat (Admin)
   */
  static clearAll(req, res) {
    try {
      db.prepare('DELETE FROM recommendations').run();
      req.session.flash = {
        type: 'success',
        message: 'Seluruh data riwayat rekomendasi berhasil dikosongkan.'
      };
      res.redirect('/riwayat');
    } catch (error) {
      console.error('Error on clearAll:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal mengosongkan riwayat: ' + error.message
      };
      res.redirect('/riwayat');
    }
  }

  /**
   * Ekspor Riwayat ke Format CSV (dengan proteksi formula injection, Point 12)
   */
  static exportCsv(req, res) {
    try {
      const rows = db.prepare('SELECT * FROM recommendations ORDER BY id DESC').all();

      const headers = [
        'ID',
        'Kode Batch',
        'Varietas',
        'Kondisi Daun',
        'Fase Bibit',
        'pH Media',
        'Kelembapan Media',
        'Status Kelayakan Waktu',
        'Pupuk Rekomendasi (Top 1)',
        'Skor Preferensi SAW',
        'Pilihan Setara',
        'Pupuk Alternatif Setara',
        'Tingkat Dosis',
        'Takaran per Bibit',
        'Metode Aplikasi',
        'Waktu Pembuatan'
      ];

      // Format CSV escape dengan proteksi formula injection (Point 12)
      // Jika diawali '=', '+', '-', '@', atau '\t', awali dengan kutip tunggal "'"
      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        let s = String(val);
        if (/^[=+\-@\t]/.test(s)) {
          s = "'" + s;
        }
        s = s.replace(/"/g, '""');
        return `"${s}"`;
      };

      let csvContent = '\uFEFF'; // UTF-8 BOM agar terbaca di Excel tanpa issue karakter
      csvContent += headers.map(escapeCsv).join(',') + '\r\n';

      for (const row of rows) {
        const line = [
          row.id,
          row.batch_code,
          row.variety,
          row.leaf_condition,
          row.growth_phase,
          row.media_ph,
          row.media_moisture,
          row.timing_status,
          row.top_fertilizer_name || '-',
          row.top_score !== null ? row.top_score : '-',
          row.is_equivalent ? 'Ya' : 'Tidak',
          row.second_fertilizer_name || '-',
          row.dosage_level || '-',
          row.dosage_amount || '-',
          row.application_method || '-',
          row.created_at
        ];
        csvContent += line.map(escapeCsv).join(',') + '\r\n';
      }

      const filename = `riwayat_spk_pupuk_sawit_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).send('Gagal mengekspor data: ' + error.message);
    }
  }
}

module.exports = HistoryController;
