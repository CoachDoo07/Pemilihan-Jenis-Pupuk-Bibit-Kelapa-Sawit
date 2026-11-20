const db = require('./database');
const { hashPassword } = require('../utils/authUtil');
const SawService = require('../services/sawService');
const DosageService = require('../services/dosageService');

// Data 60 kombinasi matriks kecocokan default (rancangan awal)
const DEFAULT_MATRIX_DATA = [
  // --- C1: KONDISI DAUN ---
  // Pilihan 1: Menguning Merata (Klorosis Defisiensi N)
  ['C1', 'menguning_merata', 'Menguning merata (Defisiensi N)', 'A1', 5, 'Urea sangat cocok karena merupakan donor N terkonsentrasi tinggi (46% N) untuk memulihkan klorofil dengan cepat.'],
  ['C1', 'menguning_merata', 'Menguning merata (Defisiensi N)', 'A2', 4, 'NPK cocok menyuplai N sekaligus menjaga keseimbangan P dan K.'],
  ['C1', 'menguning_merata', 'Menguning merata (Defisiensi N)', 'A3', 1, 'SP-36 tidak menyuplai unsur N yang dibutuhkan untuk pemulihan klorosis.'],
  ['C1', 'menguning_merata', 'Menguning merata (Defisiensi N)', 'A4', 1, 'KCl tidak menyuplai unsur N.'],
  ['C1', 'menguning_merata', 'Menguning merata (Defisiensi N)', 'A5', 3, 'POC menyuplai N organik tetapi laju pelepasan hara lebih lambat dari urea sintetis.'],

  // Pilihan 2: Menguning di tepi atau bercak (Defisiensi K)
  ['C1', 'menguning_tepi', 'Menguning di tepi atau bercak (Defisiensi K)', 'A1', 1, 'Urea berlebihan justru memperburuk rasio N/K dan memperparah nekrosis tepi daun.'],
  ['C1', 'menguning_tepi', 'Menguning di tepi atau bercak (Defisiensi K)', 'A2', 4, 'NPK cocok karena mengandung kalium dalam formulasi majemuk seimbang.'],
  ['C1', 'menguning_tepi', 'Menguning di tepi atau bercak (Defisiensi K)', 'A3', 1, 'SP-36 tidak mengandung Kalium.'],
  ['C1', 'menguning_tepi', 'Menguning di tepi atau bercak (Defisiensi K)', 'A4', 5, 'KCl sangat cocok sebagai sumber kalium murni 60% K2O untuk mengatasi nekrosis tepi secara tuntas.'],
  ['C1', 'menguning_tepi', 'Menguning di tepi atau bercak (Defisiensi K)', 'A5', 3, 'POC cukup cocok menyuplai kalium organik dan enzim perbaikan jaringan.'],

  // Pilihan 3: Pucat dan kerdil (Defisiensi P)
  ['C1', 'pucat_kerdil', 'Pucat dan kerdil (Defisiensi P)', 'A1', 2, 'Urea kurang cocok karena tanaman kerdil membutuhkan stimulasi pemanjangan akar melalui fosfat.'],
  ['C1', 'pucat_kerdil', 'Pucat dan kerdil (Defisiensi P)', 'A2', 4, 'NPK cocok karena menyediakan fosfat majemuk bersama N dan K.'],
  ['C1', 'pucat_kerdil', 'Pucat dan kerdil (Defisiensi P)', 'A3', 5, 'SP-36 sangat cocok memasok fosfat 36% P2O5 untuk memacu pembelahan sel dan perakaran bibit kerdil.'],
  ['C1', 'pucat_kerdil', 'Pucat dan kerdil (Defisiensi P)', 'A4', 1, 'KCl tidak memasok fosfat.'],
  ['C1', 'pucat_kerdil', 'Pucat dan kerdil (Defisiensi P)', 'A5', 3, 'POC cukup cocok karena mengandung asam humat yang mempermudah serapan fosfat.'],

  // Pilihan 4: Normal (Pemeliharaan Nutrisi Sehat)
  ['C1', 'normal', 'Normal (Pemeliharaan Berkala)', 'A1', 3, 'Urea cukup cocok sebagai pupuk pemeliharaan vegetatif.'],
  ['C1', 'normal', 'Normal (Pemeliharaan Berkala)', 'A2', 5, 'NPK majemuk menyediakan nutrisi makro lengkap seimbang untuk bibit berdaun normal.'],
  ['C1', 'normal', 'Normal (Pemeliharaan Berkala)', 'A3', 3, 'SP-36 cukup cocok untuk mempertahankan pertumbuhan perakaran.'],
  ['C1', 'normal', 'Normal (Pemeliharaan Berkala)', 'A4', 3, 'KCl cukup cocok untuk menjaga ketegaran pelepah.'],
  ['C1', 'normal', 'Normal (Pemeliharaan Berkala)', 'A5', 5, 'POC sangat cocok untuk bibit normal karena aman, memperbaiki kualitas tanah, dan ramah lingkungan.'],

  // --- C2: FASE BIBIT ---
  // Pilihan 1: Pre-nursery (1-3 bulan)
  ['C2', 'pre_nursery', 'Pre-nursery (1-3 bulan)', 'A1', 2, 'Urea pekat berisiko membakar akar bibit muda yang masih sangat rentan.'],
  ['C2', 'pre_nursery', 'Pre-nursery (1-3 bulan)', 'A2', 3, 'NPK cukup cocok jika diaplikasikan dalam bentuk larutan encer (konsentrasi 0.2%).'],
  ['C2', 'pre_nursery', 'Pre-nursery (1-3 bulan)', 'A3', 2, 'SP-36 butiran padat lambat larut di polybag kecil (baby polybag).'],
  ['C2', 'pre_nursery', 'Pre-nursery (1-3 bulan)', 'A4', 2, 'KCl memiliki indeks garam relatif tinggi untuk akar muda pre-nursery.'],
  ['C2', 'pre_nursery', 'Pre-nursery (1-3 bulan)', 'A5', 5, 'POC sangat cocok untuk bibit pre-nursery karena lembut bagi perakaran muda dan mudah diserap.'],

  // Pilihan 2: Main nursery awal (4-7 bulan)
  ['C2', 'main_nursery_awal', 'Main nursery awal (4-7 bulan)', 'A1', 4, 'Urea cocok memacu pembentukan pelepah baru pada fase pertumbuhan pesat.'],
  ['C2', 'main_nursery_awal', 'Main nursery awal (4-7 bulan)', 'A2', 5, 'NPK majemuk seimbang sangat cocok untuk main nursery awal (didukung temuan Kasno & Anggria, 2016).'],
  ['C2', 'main_nursery_awal', 'Main nursery awal (4-7 bulan)', 'A3', 4, 'SP-36 cocok memperkuat percabangan akar sekunder di polybag besar.'],
  ['C2', 'main_nursery_awal', 'Main nursery awal (4-7 bulan)', 'A4', 4, 'KCl cocok menjaga kekuatan batang bibit.'],
  ['C2', 'main_nursery_awal', 'Main nursery awal (4-7 bulan)', 'A5', 4, 'POC cocok sebagai suplemen hara mikro dan pembenah media tanah polybag.'],

  // Pilihan 3: Main nursery lanjut (8-12 bulan)
  ['C2', 'main_nursery_lanjut', 'Main nursery lanjut (8-12 bulan)', 'A1', 4, 'Urea cocok mempertahankan fotosintesis pelepah tua menjelang salur.'],
  ['C2', 'main_nursery_lanjut', 'Main nursery lanjut (8-12 bulan)', 'A2', 5, 'NPK sangat cocok untuk menjaga vigor prima tanaman siap tanam lapangan.'],
  ['C2', 'main_nursery_lanjut', 'Main nursery lanjut (8-12 bulan)', 'A3', 4, 'SP-36 cocok memperkuat perakaran jangkar.'],
  ['C2', 'main_nursery_lanjut', 'Main nursery lanjut (8-12 bulan)', 'A4', 5, 'KCl sangat cocok untuk bibit siap salur agar pelepah kokoh dan tahan stres kekeringan saat transplanting.'],
  ['C2', 'main_nursery_lanjut', 'Main nursery lanjut (8-12 bulan)', 'A5', 3, 'POC cukup cocok sebagai pupuk selingan ramah lingkungan.'],

  // --- C3: pH MEDIA ---
  // Pilihan 1: Asam (pH < 5.0)
  ['C3', 'asam', 'Asam (pH < 5.0)', 'A1', 2, 'Urea kurang cocok karena hidrolisisnya jangka menengah cenderung menurunkan pH tanah lebih lanjut.'],
  ['C3', 'asam', 'Asam (pH < 5.0)', 'A2', 3, 'NPK cukup cocok, namun butuh penambahan dolomit agar serapan hara tidak terganggu kemasaman.'],
  ['C3', 'asam', 'Asam (pH < 5.0)', 'A3', 2, 'SP-36 kurang cocok pada tanah sangat masam karena ion fosfat akan terikat (terfiksasi) oleh Al dan Fe.'],
  ['C3', 'asam', 'Asam (pH < 5.0)', 'A4', 3, 'KCl cukup cocok karena tidak mengubah pH tanah secara signifikan.'],
  ['C3', 'asam', 'Asam (pH < 5.0)', 'A5', 5, 'POC sangat cocok pada tanah asam karena mengandung asam humat yang meningkatkan kapasitas penyangga (buffering) tanah.'],

  // Pilihan 2: Optimal (pH 5.5 - 6.5)
  ['C3', 'optimal', 'Optimal (pH 5.5 - 6.5)', 'A1', 5, 'Urea sangat cocok karena ketersediaan hara dan mikroba pengurai urea aktif maksimal.'],
  ['C3', 'optimal', 'Optimal (pH 5.5 - 6.5)', 'A2', 5, 'NPK sangat cocok karena pada rentang pH ini seluruh N, P, dan K berada pada kelarutan optimum.'],
  ['C3', 'optimal', 'Optimal (pH 5.5 - 6.5)', 'A3', 4, 'SP-36 cocok karena ion fosfat larut sempurna tanpa fiksasi kation berbahaya.'],
  ['C3', 'optimal', 'Optimal (pH 5.5 - 6.5)', 'A4', 5, 'KCl sangat cocok larut dan diserap oleh sistem perakaran.'],
  ['C3', 'optimal', 'Optimal (pH 5.5 - 6.5)', 'A5', 5, 'POC sangat cocok memacu populasi mikroba rhizosfer yang menguntungkan.'],

  // Pilihan 3: Basa (pH > 6.5)
  ['C3', 'basa', 'Basa (pH > 6.5)', 'A1', 4, 'Urea cocok karena reaksi fisiologisnya membantu sedikit menetralkan media basa.'],
  ['C3', 'basa', 'Basa (pH > 6.5)', 'A2', 4, 'NPK cocok memenuhi kebutuhan hara komplit.'],
  ['C3', 'basa', 'Basa (pH > 6.5)', 'A3', 2, 'SP-36 kurang cocok karena pada pH basa ion fosfat akan mengendap terikat kalsium (Ca-P insoluble).'],
  ['C3', 'basa', 'Basa (pH > 6.5)', 'A4', 3, 'KCl cukup cocok untuk menjaga ketersediaan kalium.'],
  ['C3', 'basa', 'Basa (pH > 6.5)', 'A5', 4, 'POC cocok membantu pelarutan hara mikro yang sering tertekan pada pH tinggi.'],

  // --- C4: KELEMBAPAN MEDIA ---
  // Pilihan 1: Rendah (Kering / Di bawah kapasitas lapang)
  ['C4', 'rendah', 'Rendah (Kering / Butuh Air)', 'A1', 2, 'Urea pekat pada media kering berisiko tinggi membakar perakaran (plasmolisis).'],
  ['C4', 'rendah', 'Rendah (Kering / Butuh Air)', 'A2', 3, 'NPK cukup cocok, namun butiran prill sulit melarut bila air tanah kurang.'],
  ['C4', 'rendah', 'Rendah (Kering / Butuh Air)', 'A3', 3, 'SP-36 cukup cocok namun membutuhkan air untuk mobilitas ion fosfat.'],
  ['C4', 'rendah', 'Rendah (Kering / Butuh Air)', 'A4', 2, 'KCl berisiko meningkatkan salinitas larutan tanah saat kekurangan air.'],
  ['C4', 'rendah', 'Rendah (Kering / Butuh Air)', 'A5', 4, 'POC cocok diaplikasikan melalui penyiraman cairan sehingga sekaligus menambah lengas media.'],

  // Pilihan 2: Optimal (Kapasitas Lapang / Lembap Seimbang)
  ['C4', 'optimal', 'Optimal (Kapasitas Lapang)', 'A1', 5, 'Urea sangat cocok larut dan terdistribusi sempurna ke perakaran.'],
  ['C4', 'optimal', 'Optimal (Kapasitas Lapang)', 'A2', 5, 'NPK sangat cocok karena prill melarut merata dan diserap optimal.'],
  ['C4', 'optimal', 'Optimal (Kapasitas Lapang)', 'A3', 5, 'SP-36 sangat cocok karena kelembapan memfasilitasi difusi lambat fosfat.'],
  ['C4', 'optimal', 'Optimal (Kapasitas Lapang)', 'A4', 5, 'KCl sangat cocok larut cepat tanpa mencuci perakaran.'],
  ['C4', 'optimal', 'Optimal (Kapasitas Lapang)', 'A5', 5, 'POC sangat cocok terserap cepat oleh daun dan akar.'],

  // Pilihan 3: Terlalu basah (Jenuh Air / Menggenang)
  ['C4', 'terlalu_basah', 'Terlalu basah (Jenuh Air)', 'A1', 1, 'Urea sangat tidak dianjurkan karena pupuk akan terbuang oleh pencucian (leaching) dan denitrifikasi.'],
  ['C4', 'terlalu_basah', 'Terlalu basah (Jenuh Air)', 'A2', 1, 'NPK sangat kurang cocok karena butiran prill hanyut dan terbuang sia-sia.'],
  ['C4', 'terlalu_basah', 'Terlalu basah (Jenuh Air)', 'A3', 1, 'SP-36 sangat kurang cocok pada kondisi anaerobik tanah tergenang.'],
  ['C4', 'terlalu_basah', 'Terlalu basah (Jenuh Air)', 'A4', 1, 'KCl sangat mudah tercuci terbawa air drainase berlebih.'],
  ['C4', 'terlalu_basah', 'Terlalu basah (Jenuh Air)', 'A5', 2, 'POC kurang cocok karena larutan akan hanyut bersama kelebihan air media.']
];

/**
 * Reset tabel kecocokan & bobot ke rancangan awal default (Point 1 & 13)
 * HANYA dipanggil oleh tombol reset di pengaturan, TIDAK saat server start.
 */
function resetMatrixToDefault() {
  const transaction = db.transaction(() => {
    // 1. Reset bobot kriteria ke default
    const updateWeight = db.prepare('UPDATE criteria SET weight = ? WHERE code = ?');
    updateWeight.run(0.35, 'C1');
    updateWeight.run(0.25, 'C2');
    updateWeight.run(0.20, 'C3');
    updateWeight.run(0.20, 'C4');

    // 2. Kosongkan dan masukkan kembali 60 baris default
    db.exec('DELETE FROM suitability_matrix;');
    const insertMatrix = db.prepare(`
      INSERT INTO suitability_matrix (criteria_code, subcriteria_code, subcriteria_name, fertilizer_code, score, rationale)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of DEFAULT_MATRIX_DATA) {
      insertMatrix.run(...item);
    }
  });

  transaction();
  console.log('✓ Matriks kecocokan & bobot kriteria berhasil direset ke default rancangan awal.');
}

/**
 * Seeding data awal untuk aplikasi SPK Pupuk Sawit
 * Memastikan tidak menimpa data yang sudah ada saat restart server (Point 1).
 */
function seedDatabase(forceReset = false) {
  if (forceReset) {
    db.exec(`
      DELETE FROM users;
      DELETE FROM criteria;
      DELETE FROM fertilizers;
      DELETE FROM suitability_matrix;
      DELETE FROM recommendations;
    `);
  }

  // 1. Seed Pengguna Admin dengan crypto.scrypt hash (Point 11)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `);
    insertUser.run('admin', hashPassword('admin123'), 'Petugas Pengawas Nursery', 'admin');
    console.log('✓ Admin user seeded dengan hash crypto.scrypt (admin / admin123)');
  } else {
    // Migrasi otomatis jika masih ada user dengan password plaintext (Point 11)
    const existingUsers = db.prepare('SELECT id, password FROM users').all();
    const updatePw = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    for (const u of existingUsers) {
      if (!u.password.includes(':')) {
        updatePw.run(hashPassword(u.password), u.id);
        console.log(`✓ Password user ID ${u.id} berhasil dimigrasikan ke crypto.scrypt hash.`);
      }
    }
  }

  // 2. Seed Kriteria SAW (jika kosong)
  const criteriaCount = db.prepare('SELECT COUNT(*) as count FROM criteria').get().count;
  if (criteriaCount === 0) {
    const insertCriteria = db.prepare(`
      INSERT INTO criteria (code, name, weight, type, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const criteriaData = [
      ['C1', 'Kondisi Daun', 0.35, 'benefit', 'Kondisi visual morfologi daun bibit (gejala defisiensi unsur hara spesifik)'],
      ['C2', 'Fase Bibit', 0.25, 'benefit', 'Tahapan umur pertumbuhan bibit kelapa sawit (Pre-nursery vs Main nursery)'],
      ['C3', 'pH Media', 0.20, 'benefit', 'Tingkat kemasaman media tanam tanah di polybag'],
      ['C4', 'Kelembapan Media', 0.20, 'benefit', 'Ketersediaan air tanah / kelembapan media sebelum aplikasi pupuk']
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) insertCriteria.run(...item);
    });
    insertMany(criteriaData);
    console.log('✓ Kriteria SAW seeded (Total bobot = 1.00)');
  }

  // 3. Seed Alternatif Pupuk (jika kosong)
  const fertilizerCount = db.prepare('SELECT COUNT(*) as count FROM fertilizers').get().count;
  if (fertilizerCount === 0) {
    const insertFertilizer = db.prepare(`
      INSERT INTO fertilizers (code, name, category, nutrient_content, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const fertilizerData = [
      ['A1', 'Urea', 'Anorganik Tunggal', '46% Nitrogen (N)', 'Pupuk sumber nitrogen pekat untuk memacu pertumbuhan vegetatif dan pembentukan klorofil daun.'],
      ['A2', 'NPK Majemuk', 'Anorganik Majemuk', '11-7-12 / 15-15-15 (N, P2O5, K2O)', 'Pupuk majemuk seimbang yang diuji pada pembibitan oleh Kasno & Anggria (2016).'],
      ['A3', 'SP-36', 'Anorganik Tunggal', '36% Fosfat (P2O5)', 'Pupuk fosfat untuk merangsang pertumbuhan perakaran awal bibit dan pembelahan sel jaringan.'],
      ['A4', 'KCl', 'Anorganik Tunggal', '60% Kalium (K2O)', 'Pupuk kalium untuk memperkuat dinding sel pelepah, turgor daun, dan ketahanan bibit terhadap cekaman.'],
      ['A5', 'Pupuk Organik Cair (POC)', 'Organik Hayati', 'Unsur hara makro-mikro hayati & asam humat', 'Pupuk organik hayati yang lembut bagi akar muda, memperbaiki mikroba tanah, dan ramah lingkungan.']
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) insertFertilizer.run(...item);
    });
    insertMany(fertilizerData);
    console.log('✓ Alternatif pupuk seeded (5 Alternatif)');
  }

  // 4. Seed Tabel Kecocokan HANYA JIKA TABEL KOSONG (Point 1: Jangan hapus edit admin!)
  const matrixCount = db.prepare('SELECT COUNT(*) as count FROM suitability_matrix').get().count;
  if (matrixCount === 0) {
    const insertMatrix = db.prepare(`
      INSERT INTO suitability_matrix (criteria_code, subcriteria_code, subcriteria_name, fertilizer_code, score, rationale)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertManyMatrix = db.transaction((items) => {
      for (const item of items) insertMatrix.run(...item);
    });
    insertManyMatrix(DEFAULT_MATRIX_DATA);
    console.log('✓ Matriks kecocokan awal seeded (60 Kombinasi)');
  }

  // 5. Seed Riwayat Rekomendasi (HANYA JIKA TABEL KOSONG, Point 2: Dihitung lewat SawService + DosageService!)
  const recCount = db.prepare('SELECT COUNT(*) as count FROM recommendations').get().count;
  if (recCount === 0) {
    const scenarios = [
      {
        batch_code: 'BS-2026-001',
        variety: 'DxP Socfindo',
        leaf_condition: 'menguning_merata',
        growth_phase: 'main_nursery_awal',
        media_ph: 'optimal',
        media_moisture: 'optimal',
        created_at: '2026-11-15 09:30:00'
      },
      {
        batch_code: 'BS-2026-002',
        variety: 'DxP Marihat',
        leaf_condition: 'normal',
        growth_phase: 'pre_nursery',
        media_ph: 'optimal',
        media_moisture: 'optimal',
        created_at: '2026-11-16 10:15:00'
      },
      {
        batch_code: 'BS-2026-003',
        variety: 'DxP Dami Mas',
        leaf_condition: 'menguning_tepi',
        growth_phase: 'main_nursery_lanjut',
        media_ph: 'optimal',
        media_moisture: 'optimal',
        created_at: '2026-11-17 14:00:00'
      },
      {
        batch_code: 'BS-2026-004',
        variety: 'DxP Topaz',
        leaf_condition: 'pucat_kerdil',
        growth_phase: 'main_nursery_awal',
        media_ph: 'asam',
        media_moisture: 'optimal',
        created_at: '2026-11-18 11:20:00'
      },
      {
        batch_code: 'BS-2026-005',
        variety: 'DxP Yangambi',
        leaf_condition: 'normal',
        growth_phase: 'main_nursery_awal',
        media_ph: 'optimal',
        media_moisture: 'terlalu_basah',
        created_at: '2026-11-19 07:45:00'
      }
    ];

    const insertRec = db.prepare(`
      INSERT INTO recommendations (
        batch_code, variety, leaf_condition, growth_phase, media_ph, media_moisture,
        timing_status, timing_title, timing_note, top_fertilizer_code, top_fertilizer_name,
        top_score, is_equivalent, second_fertilizer_code, second_fertilizer_name, second_score,
        dosage_level, dosage_amount, application_method, agronomic_notes, calculation_json, created_at
      ) VALUES (
        @batch_code, @variety, @leaf_condition, @growth_phase, @media_ph, @media_moisture,
        @timing_status, @timing_title, @timing_note, @top_fertilizer_code, @top_fertilizer_name,
        @top_score, @is_equivalent, @second_fertilizer_code, @second_fertilizer_name, @second_score,
        @dosage_level, @dosage_amount, @application_method, @agronomic_notes, @calculation_json, @created_at
      )
    `);

    const insertManyRecs = db.transaction((list) => {
      for (const sc of list) {
        const timing = DosageService.checkTimingSuitability(sc.media_moisture);

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

        // Alur TUNDA (Point 7): Jangan jalankan SAW
        if (timing.status === 'TUNDA') {
          topFertilizerName = 'Tidak ditentukan (Pemupukan Ditunda)';
          topFertilizerCode = null;
          topScore = null;
        } else {
          // SIRAM_DAHULU atau LAYAK: Jalankan SAW
          sawResult = SawService.calculate({
            leafCondition: sc.leaf_condition,
            growthPhase: sc.growth_phase,
            mediaPh: sc.media_ph,
            mediaMoisture: sc.media_moisture
          });

          const top1 = sawResult.topAlternative;
          topFertilizerCode = top1.fertilizerCode;
          topFertilizerName = top1.fertilizerName;
          topScore = top1.score;

          // Selalu simpan data peringkat 2 (Point 2)
          if (sawResult.ranking.length >= 2) {
            const top2 = sawResult.ranking[1];
            secondFertilizerCode = top2.fertilizerCode;
            secondFertilizerName = top2.fertilizerName;
            secondScore = top2.score;
          }

          if (sawResult.isEquivalent) {
            isEquivalent = 1;
            // Hitung dosis pupuk kedua (Point 5)
            dosageSecond = DosageService.determineDosage({
              fertilizerCode: secondFertilizerCode,
              fertilizerName: secondFertilizerName,
              growthPhase: sc.growth_phase,
              mediaPh: sc.media_ph,
              leafCondition: sc.leaf_condition
            });
          }

          dosageInfo = DosageService.determineDosage({
            fertilizerCode: topFertilizerCode,
            fertilizerName: topFertilizerName,
            growthPhase: sc.growth_phase,
            mediaPh: sc.media_ph,
            leafCondition: sc.leaf_condition
          });
        }

        const calculationPayload = {
          input: sc,
          timing,
          saw: sawResult,
          dosage: dosageInfo,
          dosageSecond,
          calculatedAt: sc.created_at
        };

        insertRec.run({
          batch_code: sc.batch_code,
          variety: sc.variety,
          leaf_condition: sc.leaf_condition,
          growth_phase: sc.growth_phase,
          media_ph: sc.media_ph,
          media_moisture: sc.media_moisture,
          timing_status: timing.status,
          timing_title: timing.title,
          timing_note: timing.summary + ' ' + timing.actionGuidance,
          top_fertilizer_code: topFertilizerCode,
          top_fertilizer_name: topFertilizerName,
          top_score: topScore,
          is_equivalent: isEquivalent,
          second_fertilizer_code: secondFertilizerCode,
          second_fertilizer_name: secondFertilizerName,
          second_score: secondScore,
          dosage_level: dosageInfo.level,
          dosage_amount: dosageInfo.amount,
          application_method: dosageInfo.method,
          agronomic_notes: dosageInfo.agronomicNotes,
          calculation_json: JSON.stringify(calculationPayload),
          created_at: sc.created_at
        });
      }
    });

    insertManyRecs(scenarios);
    console.log('✓ Riwayat contoh seeded secara dinamis (konsisten dengan SawService & DosageService)');
  }
}

if (require.main === module) {
  seedDatabase();
  console.log('Seeding database selesai dengan sukses!');
}

module.exports = {
  seedDatabase,
  resetMatrixToDefault
};
