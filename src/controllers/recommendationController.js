const db = require('../config/database');
const SawService = require('../services/sawService');
const DosageService = require('../services/dosageService');

class RecommendationController {
  /**
   * Menghasilkan batch code otomatis berformat BS-YYYY-NNN (Point 6)
   */
  static generateNextBatchCode() {
    const year = new Date().getFullYear();
    const prefix = `BS-${year}-`;
    const rows = db.prepare("SELECT batch_code FROM recommendations WHERE batch_code LIKE ?").all(`${prefix}%`);
    
    let maxNum = 0;
    for (const r of rows) {
      const match = r.batch_code.match(/BS-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Menampilkan form input kondisi bibit & media tanam
   */
  static getForm(req, res) {
    try {
      const criteria = db.prepare('SELECT * FROM criteria ORDER BY code ASC').all();
      const fertilizers = db.prepare('SELECT * FROM fertilizers ORDER BY code ASC').all();
      const nextBatchCode = RecommendationController.generateNextBatchCode();

      res.render('recommendation/form', {
        title: 'Form Analisis Rekomendasi Pupuk',
        criteria,
        fertilizers,
        nextBatchCode
      });
    } catch (error) {
      console.error('Error on getForm:', error);
      res.status(500).send('Terjadi kesalahan: ' + error.message);
    }
  }

  /**
   * Proses perhitungan SAW dan penentuan dosis
   */
  static postCalculate(req, res) {
    try {
      let {
        batch_code,
        variety,
        leaf_condition,
        growth_phase,
        media_ph,
        media_moisture
      } = req.body;

      // 1. Validasi Keberadaan Input
      if (!leaf_condition || !growth_phase || !media_ph || !media_moisture) {
        req.session.flash = {
          type: 'error',
          message: 'Mohon lengkapi seluruh parameter kondisi bibit dan media tanam!'
        };
        return res.redirect('/rekomendasi/baru');
      }

      // 2. Validasi Whitelist Subkriteria dari Database (Point 6)
      const validLeaves = db.prepare("SELECT DISTINCT subcriteria_code FROM suitability_matrix WHERE criteria_code = 'C1'").all().map(r => r.subcriteria_code);
      const validPhases = db.prepare("SELECT DISTINCT subcriteria_code FROM suitability_matrix WHERE criteria_code = 'C2'").all().map(r => r.subcriteria_code);
      const validPhs = db.prepare("SELECT DISTINCT subcriteria_code FROM suitability_matrix WHERE criteria_code = 'C3'").all().map(r => r.subcriteria_code);
      const validMoistures = db.prepare("SELECT DISTINCT subcriteria_code FROM suitability_matrix WHERE criteria_code = 'C4'").all().map(r => r.subcriteria_code);

      if (!validLeaves.includes(leaf_condition)) {
        req.session.flash = { type: 'error', message: 'Kondisi daun tidak valid atau tidak terdaftar!' };
        return res.redirect('/rekomendasi/baru');
      }
      if (!validPhases.includes(growth_phase)) {
        req.session.flash = { type: 'error', message: 'Fase bibit tidak valid atau tidak terdaftar!' };
        return res.redirect('/rekomendasi/baru');
      }
      if (!validPhs.includes(media_ph)) {
        req.session.flash = { type: 'error', message: 'pH media tidak valid atau tidak terdaftar!' };
        return res.redirect('/rekomendasi/baru');
      }
      if (!validMoistures.includes(media_moisture)) {
        req.session.flash = { type: 'error', message: 'Kelembapan media tidak valid atau tidak terdaftar!' };
        return res.redirect('/rekomendasi/baru');
      }

      // 3. Validasi Panjang batch_code dan variety (maksimal 40 karakter, Point 6)
      let cleanBatch = (batch_code && typeof batch_code === 'string') ? batch_code.trim() : '';
      let cleanVariety = (variety && typeof variety === 'string') ? variety.trim() : 'DxP Unggul';

      if (cleanBatch.length > 40) {
        req.session.flash = { type: 'error', message: 'Kode Batch maksimal 40 karakter!' };
        return res.redirect('/rekomendasi/baru');
      }
      if (cleanVariety.length > 40) {
        req.session.flash = { type: 'error', message: 'Varietas bibit maksimal 40 karakter!' };
        return res.redirect('/rekomendasi/baru');
      }

      if (!cleanBatch) {
        cleanBatch = RecommendationController.generateNextBatchCode();
      }

      // 4. CEK KELAYAKAN WAKTU PEMUPUKAN
      const timing = DosageService.checkTimingSuitability(media_moisture);

      let topFertilizerCode = null;
      let topFertilizerName = null;
      let topScore = null;
      let isEquivalent = 0;
      let secondFertilizerCode = null;
      let secondFertilizerName = null;
      let secondScore = null;
      let sawResult = null;
      let dosageSecond = null;

      let dosageInfo = {
        level: 'Tidak diaplikasikan',
        amount: '-',
        interval: '-',
        method: timing.actionGuidance,
        agronomicNotes: timing.description,
        verified: false,
        adjustedFrom: null,
        phAdjustment: null
      };

      // 5. Alur TUNDA (Point 7): Jika terlalu basah, JANGAN jalankan SAW dan JANGAN beri ranking
      if (timing.status === 'TUNDA') {
        topFertilizerName = 'Tidak ditentukan (Pemupukan Ditunda)';
        topFertilizerCode = null;
        topScore = null;
      } else {
        // Status LAYAK atau SIRAM_DAHULU: Jalankan SAW
        sawResult = SawService.calculate({
          leafCondition: leaf_condition,
          growthPhase: growth_phase,
          mediaPh: media_ph,
          mediaMoisture: media_moisture
        });

        const top1 = sawResult.topAlternative;
        topFertilizerCode = top1.fertilizerCode;
        topFertilizerName = top1.fertilizerName;
        topScore = top1.score;

        // Selalu simpan informasi pupuk peringkat 2 (Point 2)
        if (sawResult.ranking.length >= 2) {
          const top2 = sawResult.ranking[1];
          secondFertilizerCode = top2.fertilizerCode;
          secondFertilizerName = top2.fertilizerName;
          secondScore = top2.score;
        }

        // Cek pilihan setara (Point 5)
        if (sawResult.isEquivalent) {
          isEquivalent = 1;

          // Hitung dosis pupuk peringkat kedua (Point 5)
          dosageSecond = DosageService.determineDosage({
            fertilizerCode: secondFertilizerCode,
            fertilizerName: secondFertilizerName,
            growthPhase: growth_phase,
            mediaPh: media_ph,
            leafCondition: leaf_condition
          });
        }

        // Tentukan dosis pupuk utama (Point 4 & 18)
        dosageInfo = DosageService.determineDosage({
          fertilizerCode: topFertilizerCode,
          fertilizerName: topFertilizerName,
          growthPhase: growth_phase,
          mediaPh: media_ph,
          leafCondition: leaf_condition
        });
      }

      // 6. Simpan data lengkap perhitungan ke format JSON
      const calculationPayload = {
        input: {
          batch_code: cleanBatch,
          variety: cleanVariety,
          leaf_condition,
          growth_phase,
          media_ph,
          media_moisture
        },
        timing,
        saw: sawResult,
        dosage: dosageInfo,
        dosageSecond, // Point 5: Dosis pupuk setara
        calculatedAt: new Date().toISOString()
      };

      const stmt = db.prepare(`
        INSERT INTO recommendations (
          batch_code, variety, leaf_condition, growth_phase, media_ph, media_moisture,
          timing_status, timing_title, timing_note, top_fertilizer_code, top_fertilizer_name,
          top_score, is_equivalent, second_fertilizer_code, second_fertilizer_name, second_score,
          dosage_level, dosage_amount, application_method, agronomic_notes, calculation_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        cleanBatch,
        cleanVariety,
        leaf_condition,
        growth_phase,
        media_ph,
        media_moisture,
        timing.status,
        timing.title,
        timing.summary + ' ' + timing.actionGuidance,
        topFertilizerCode,
        topFertilizerName,
        topScore,
        isEquivalent,
        secondFertilizerCode,
        secondFertilizerName,
        secondScore,
        dosageInfo.level,
        dosageInfo.amount,
        dosageInfo.method,
        dosageInfo.agronomicNotes,
        JSON.stringify(calculationPayload)
      );

      req.session.flash = {
        type: 'success',
        message: 'Analisis rekomendasi pupuk berhasil dihitung!'
      };

      res.redirect(`/rekomendasi/hasil/${result.lastInsertRowid}`);
    } catch (error) {
      console.error('Error on postCalculate:', error);
      req.session.flash = {
        type: 'error',
        message: 'Gagal melakukan perhitungan: ' + error.message
      };
      res.redirect('/rekomendasi/baru');
    }
  }

  /**
   * Menampilkan hasil rekomendasi dan rincian langkah perhitungan SAW
   */
  static getResult(req, res) {
    try {
      const { id } = req.params;
      const rec = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);

      if (!rec) {
        req.session.flash = {
          type: 'error',
          message: 'Data rekomendasi tidak ditemukan.'
        };
        return res.redirect('/riwayat');
      }

      let calculationData = {};
      try {
        calculationData = JSON.parse(rec.calculation_json);
      } catch (e) {
        calculationData = {};
      }

      // Ambil detail pupuk terpilih dari database
      let topFertilizerDetail = null;
      if (rec.top_fertilizer_code) {
        topFertilizerDetail = db.prepare('SELECT * FROM fertilizers WHERE code = ?').get(rec.top_fertilizer_code);
      }

      let secondFertilizerDetail = null;
      if (rec.second_fertilizer_code) {
        secondFertilizerDetail = db.prepare('SELECT * FROM fertilizers WHERE code = ?').get(rec.second_fertilizer_code);
      }

      res.render('recommendation/result', {
        title: `Hasil Rekomendasi #${rec.batch_code}`,
        rec,
        calc: calculationData,
        topFert: topFertilizerDetail,
        secondFert: secondFertilizerDetail
      });
    } catch (error) {
      console.error('Error on getResult:', error);
      res.status(500).send('Terjadi kesalahan: ' + error.message);
    }
  }
}

module.exports = RecommendationController;
