const db = require('../config/database');

/**
 * Service Perhitungan SPK Metode SAW (Simple Additive Weighting)
 * 
 * Tahapan SAW:
 * 1. Penyusunan Matriks Keputusan (X) berdasarkan nilai kecocokan skala 1 - 5.
 * 2. Penentuan Nilai Maksimum tiap kriteria (karena seluruh kriteria bertipe BENEFIT).
 * 3. Normalisasi Matriks Keputusan (R): r_ij = x_ij / max(x_j)
 * 4. Perhitungan Nilai Preferensi / Skor Akhir (V): V_i = sum(w_j * r_ij)
 * 5. Perangkingan alternatif dari nilai preferensi tertinggi ke terendah.
 * 6. Pengecekan Pilihan Setara: jika |V_1 - V_2| < 0.05, kedua alternatif dinyatakan setara.
 */
class SawService {
  /**
   * Mengambil data kriteria dan bobot dari database
   */
  static getCriteria() {
    return db.prepare('SELECT * FROM criteria ORDER BY code ASC').all();
  }

  /**
   * Mengambil data seluruh alternatif pupuk
   */
  static getFertilizers() {
    return db.prepare('SELECT * FROM fertilizers ORDER BY code ASC').all();
  }

  /**
   * Mengambil nilai kecocokan spesifik untuk pupuk dan subkriteria tertentu.
   * Melempar error jika baris matriks tidak ditemukan (Point 6).
   */
  static getSuitabilityScore(criteriaCode, subcriteriaCode, fertilizerCode) {
    const row = db.prepare(`
      SELECT score, rationale 
      FROM suitability_matrix 
      WHERE criteria_code = ? AND subcriteria_code = ? AND fertilizer_code = ?
    `).get(criteriaCode, subcriteriaCode, fertilizerCode);

    if (!row) {
      throw new Error(`Data nilai kecocokan tidak ditemukan untuk kriteria '${criteriaCode}', subkriteria '${subcriteriaCode}', pupuk '${fertilizerCode}'.`);
    }

    return { score: row.score, rationale: row.rationale };
  }

  /**
   * Eksekusi Perhitungan SAW Lengkap
   * @param {object} inputConditions - { leafCondition, growthPhase, mediaPh, mediaMoisture }
   * @returns {object} hasil perhitungan SAW lengkap
   */
  static calculate(inputConditions) {
    const { leafCondition, growthPhase, mediaPh, mediaMoisture } = inputConditions;

    const criteriaList = this.getCriteria();
    const fertilizers = this.getFertilizers();

    // Mapping kriteria ke subkriteria yang dipilih pengguna
    const selectedSubcriteria = {
      C1: leafCondition,
      C2: growthPhase,
      C3: mediaPh,
      C4: mediaMoisture
    };

    // 1. Matriks Keputusan (X)
    // Inisialisasi maxPerCriteria secara dinamis dari criteriaList (Point 6)
    const decisionMatrix = [];
    const maxPerCriteria = {};
    for (const crit of criteriaList) {
      maxPerCriteria[crit.code] = 0;
    }

    for (const fert of fertilizers) {
      const rowScores = {};
      const rowRationales = {};

      for (const crit of criteriaList) {
        const subCode = selectedSubcriteria[crit.code];
        const { score, rationale } = this.getSuitabilityScore(crit.code, subCode, fert.code);
        rowScores[crit.code] = score;
        rowRationales[crit.code] = rationale;

        // Cari nilai maksimum per kriteria untuk normalisasi benefit
        if (score > maxPerCriteria[crit.code]) {
          maxPerCriteria[crit.code] = score;
        }
      }

      decisionMatrix.push({
        fertilizerCode: fert.code,
        fertilizerName: fert.name,
        category: fert.category,
        nutrientContent: fert.nutrient_content,
        scores: rowScores,
        rationales: rowRationales
      });
    }

    // 2. Normalisasi Matriks (R)
    // Karena semua kriteria bertipe BENEFIT: r_ij = x_ij / max(x_j)
    const normalizedMatrix = [];
    for (const row of decisionMatrix) {
      const normValues = {};
      for (const crit of criteriaList) {
        const maxVal = maxPerCriteria[crit.code] || 1;
        const normVal = row.scores[crit.code] / maxVal;
        normValues[crit.code] = Number(normVal.toFixed(4));
      }

      normalizedMatrix.push({
        fertilizerCode: row.fertilizerCode,
        fertilizerName: row.fertilizerName,
        values: normValues
      });
    }

    // 3. Matriks Terbobot & Perhitungan Nilai Preferensi (V)
    // V_i = sum(w_j * r_ij)
    const weights = {};
    criteriaList.forEach(c => { weights[c.code] = c.weight; });

    const weightedMatrix = [];
    const ranking = [];

    for (const normRow of normalizedMatrix) {
      let finalScore = 0;
      const weightedRow = {};

      for (const crit of criteriaList) {
        const w = weights[crit.code];
        const r = normRow.values[crit.code];
        const weightedVal = w * r;
        weightedRow[crit.code] = Number(weightedVal.toFixed(4));
        finalScore += weightedVal;
      }

      const fertDetail = fertilizers.find(f => f.code === normRow.fertilizerCode);

      weightedMatrix.push({
        fertilizerCode: normRow.fertilizerCode,
        fertilizerName: normRow.fertilizerName,
        values: weightedRow
      });

      ranking.push({
        fertilizerCode: normRow.fertilizerCode,
        fertilizerName: normRow.fertilizerName,
        category: fertDetail ? fertDetail.category : '',
        nutrientContent: fertDetail ? fertDetail.nutrient_content : '',
        score: Number(finalScore.toFixed(4)),
        scorePercent: Number((finalScore * 100).toFixed(2))
      });
    }

    // Urutkan ranking dari skor tertinggi ke terendah
    ranking.sort((a, b) => b.score - a.score);

    // Tambahkan nomor peringkat
    ranking.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 4. Pengecekan Pilihan Setara (Tie-Breaking Rule)
    // Jika selisih peringkat 1 dan 2 < 0.05
    let isEquivalent = false;
    let equivalenceDetails = null;

    if (ranking.length >= 2) {
      const top1 = ranking[0];
      const top2 = ranking[1];
      const diff = Number(Math.abs(top1.score - top2.score).toFixed(4));

      if (diff < 0.05) {
        isEquivalent = true;
        equivalenceDetails = {
          fertilizer1: top1,
          fertilizer2: top2,
          difference: diff,
          message: `Rekomendasi Setara: Alternatif ${top1.fertilizerName} (Skor: ${top1.score}) dan ${top2.fertilizerName} (Skor: ${top2.score}) memiliki selisih nilai sangat tipis (${diff} < 0.05). Keduanya berstatus setara dan dapat dipilih sesuai ketersediaan stok di gudang pembibitan.`
        };
      }
    }

    return {
      criteriaList,
      weights,
      selectedSubcriteria,
      decisionMatrix,
      maxPerCriteria,
      normalizedMatrix,
      weightedMatrix,
      ranking,
      topAlternative: ranking[0],
      isEquivalent,
      equivalenceDetails
    };
  }
}

module.exports = SawService;
