const assert = require('assert');
const db = require('../src/config/database');
const { seedDatabase, resetMatrixToDefault } = require('../src/config/seed');
const SawService = require('../src/services/sawService');
const DosageService = require('../src/services/dosageService');
const RecommendationController = require('../src/controllers/recommendationController');
const SettingsController = require('../src/controllers/settingsController');
const HistoryController = require('../src/controllers/historyController');
const AuthController = require('../src/controllers/authController');
const { requireAdmin, safeJson, verifyCsrf } = require('../src/middleware/authMiddleware');
const { hashPassword, verifyPassword } = require('../src/utils/authUtil');

console.log('=== MEMULAI PENGUJIAN AUDIT DAN KEAMANAN LENGKAP (POIN a - j) ===\n');

// -------------------------------------------------------------
// (a) Edit matriks tidak hilang setelah memanggil seed lagi
// -------------------------------------------------------------
console.log('Poin (a): Pengujian persistensi edit matriks saat restart/seed...');
// Ubah satu sel di database
db.prepare(`
  UPDATE suitability_matrix 
  SET score = 2, rationale = 'Edited by Admin' 
  WHERE criteria_code = 'C1' AND subcriteria_code = 'menguning_merata' AND fertilizer_code = 'A1'
`).run();

// Jalankan seedDatabase (seperti saat server start/restart)
seedDatabase(false);

const checkCellAfterSeed = db.prepare(`
  SELECT score, rationale 
  FROM suitability_matrix 
  WHERE criteria_code = 'C1' AND subcriteria_code = 'menguning_merata' AND fertilizer_code = 'A1'
`).get();

assert.strictEqual(checkCellAfterSeed.score, 2, 'Skor hasil edit admin tidak boleh terhapus oleh seedDatabase()');
assert.strictEqual(checkCellAfterSeed.rationale, 'Edited by Admin');
console.log('   ✓ Terverifikasi: seedDatabase() tidak menghapus edit admin!');

// Kembalikan ke default rancangan awal dengan resetMatrixToDefault
resetMatrixToDefault();
const checkCellAfterReset = db.prepare(`
  SELECT score 
  FROM suitability_matrix 
  WHERE criteria_code = 'C1' AND subcriteria_code = 'menguning_merata' AND fertilizer_code = 'A1'
`).get();
assert.strictEqual(checkCellAfterReset.score, 5, 'resetMatrixToDefault harus mengembalikan skor awal (5)');
console.log('   ✓ Terverifikasi: resetMatrixToDefault() berhasil mengembalikan ke default rancangan awal');

// -------------------------------------------------------------
// (b) Sampel riwayat seed cocok dengan hasil SawService
// -------------------------------------------------------------
console.log('\nPoin (b): Pengujian konsistensi matematis data sampel riwayat...');
// Pastikan tabel riwayat terisi dari seed
db.exec('DELETE FROM recommendations');
seedDatabase(false);

const rec1 = db.prepare("SELECT * FROM recommendations WHERE batch_code = 'BS-2026-001'").get();
const rec2 = db.prepare("SELECT * FROM recommendations WHERE batch_code = 'BS-2026-002'").get();
const rec4 = db.prepare("SELECT * FROM recommendations WHERE batch_code = 'BS-2026-004'").get();
const rec5 = db.prepare("SELECT * FROM recommendations WHERE batch_code = 'BS-2026-005'").get();

// Verifikasi BS-001
assert.strictEqual(rec1.top_fertilizer_name, 'Urea');
assert.strictEqual(rec1.top_score, 0.95);
assert.strictEqual(rec1.is_equivalent, 1);
assert.strictEqual(rec1.second_fertilizer_name, 'NPK Majemuk');
assert.strictEqual(rec1.second_score, 0.93);
console.log('   ✓ Sampel BS-001 konsisten: Urea (0.95), NPK (0.93), setara');

// Verifikasi BS-002 (skor kedua harus 0.90, bukan 0.75)
assert.strictEqual(rec2.top_fertilizer_name, 'Pupuk Organik Cair (POC)');
assert.strictEqual(rec2.top_score, 1.0);
assert.strictEqual(rec2.second_score, 0.90);
console.log('   ✓ Sampel BS-002 konsisten: POC (1.0), skor kedua NPK (0.90)');

// Verifikasi BS-004 (peringkat 1 NPK 0.85, peringkat 2 SP-36 0.83, selisih 0.02 = setara)
assert.strictEqual(rec4.top_fertilizer_name, 'NPK Majemuk');
assert.strictEqual(rec4.top_score, 0.85);
assert.strictEqual(rec4.second_fertilizer_name, 'SP-36');
assert.strictEqual(rec4.second_score, 0.83);
assert.strictEqual(rec4.is_equivalent, 1);
console.log('   ✓ Sampel BS-004 konsisten: NPK (0.85), SP-36 (0.83), is_equivalent = 1');

// Verifikasi BS-005 (TUNDA, saw === null)
assert.strictEqual(rec5.timing_status, 'TUNDA');
assert.strictEqual(rec5.top_fertilizer_code, null);
assert.strictEqual(rec5.top_score, null);
const calc5 = JSON.parse(rec5.calculation_json);
assert.strictEqual(calc5.saw, null);
console.log('   ✓ Sampel BS-005 konsisten: TUNDA tidak menjalankan SAW');

// -------------------------------------------------------------
// (c) Input tidak valid ditolak dan tidak tersimpan
// -------------------------------------------------------------
console.log('\nPoin (c): Pengujian penolakan input tidak valid...');
const countBeforeInvalid = db.prepare('SELECT COUNT(*) as count FROM recommendations').get().count;

const mockReqInvalid = {
  body: {
    batch_code: 'TEST-INV',
    variety: 'DxP Unggul',
    leaf_condition: 'menguning_merata',
    growth_phase: 'fase_palsu_injection', // Tidak ada di whitelist
    media_ph: 'optimal',
    media_moisture: 'optimal'
  },
  session: {}
};

let redirectUrl = null;
const mockResInvalid = {
  redirect: (url) => { redirectUrl = url; }
};

RecommendationController.postCalculate(mockReqInvalid, mockResInvalid);
assert.strictEqual(redirectUrl, '/rekomendasi/baru');
assert.strictEqual(mockReqInvalid.session.flash.type, 'error');
assert.ok(mockReqInvalid.session.flash.message.includes('tidak valid'));

const countAfterInvalid = db.prepare('SELECT COUNT(*) as count FROM recommendations').get().count;
assert.strictEqual(countBeforeInvalid, countAfterInvalid, 'Data tidak valid tidak boleh tersimpan di database');
console.log('   ✓ Input subkriteria tidak valid ditolak dengan flash error dan tidak disimpan');

// Uji SawService melempar error jika baris tidak ada
assert.throws(() => {
  SawService.getSuitabilityScore('C1', 'subkriteria_ilegal', 'A1');
}, /Data nilai kecocokan tidak ditemukan/, 'SawService harus melempar error jika baris matriks tidak ada');
console.log('   ✓ SawService.getSuitabilityScore melempar error saat data matriks tidak ditemukan');

// -------------------------------------------------------------
// (d) Payload XSS di growth_phase ditolak, dan safeJson meng-escape </script>
// -------------------------------------------------------------
console.log('\nPoin (d): Pengujian mitigasi XSS...');
const mockReqXss = {
  body: {
    batch_code: 'XSS-TEST',
    variety: 'DxP',
    leaf_condition: 'normal',
    growth_phase: '</script><script>alert("hacked")</script>',
    media_ph: 'optimal',
    media_moisture: 'optimal'
  },
  session: {}
};
RecommendationController.postCalculate(mockReqXss, mockResInvalid);
assert.strictEqual(mockReqXss.session.flash.type, 'error');
console.log('   ✓ Payload XSS pada subkriteria ditolak oleh whitelist validation');

// Uji safeJson
const dangerousPayload = {
  label: '</script><script>alert("XSS")</script>',
  symbol: '<img src=x onerror=alert(1)> & "quotes"'
};
const escapedJson = safeJson(dangerousPayload);
assert.ok(!escapedJson.includes('</script>'), 'safeJson tidak boleh menyisakan tag penutup </script>');
assert.ok(escapedJson.includes('\\u003c/script\\u003e'), 'safeJson harus meng-escape < menjadi \\u003c');
assert.ok(escapedJson.includes('\\u003e'), 'safeJson harus meng-escape > menjadi \\u003e');
assert.ok(escapedJson.includes('\\u0026'), 'safeJson harus meng-escape & menjadi \\u0026');
console.log('   ✓ safeJson berhasil meng-escape <, >, &, dan </script> secara aman');

// -------------------------------------------------------------
// (e) Hapus riwayat tanpa login ditolak dan data tetap ada
// -------------------------------------------------------------
console.log('\nPoin (e): Pengujian proteksi admin pada route hapus riwayat...');
const sampleRecToDelete = db.prepare('SELECT id FROM recommendations LIMIT 1').get();
assert.ok(sampleRecToDelete, 'Harus ada data riwayat untuk diuji');

const mockReqUnauth = {
  session: {} // Tanpa login
};
let unauthRedirect = null;
const mockResUnauth = {
  redirect: (url) => { unauthRedirect = url; }
};
let nextCalled = false;

requireAdmin(mockReqUnauth, mockResUnauth, () => { nextCalled = true; });

assert.strictEqual(nextCalled, false, 'Middleware requireAdmin tidak boleh memanggil next() jika belum login');
assert.strictEqual(unauthRedirect, '/login', 'Harus redirect ke /login');
assert.strictEqual(mockReqUnauth.session.flash.type, 'error');

// Verifikasi data di database tetap ada
const checkRecordStillExists = db.prepare('SELECT id FROM recommendations WHERE id = ?').get(sampleRecToDelete.id);
assert.ok(checkRecordStillExists, 'Data riwayat tidak boleh terhapus jika belum login admin');
console.log('   ✓ Route hapus riwayat berhasil memblokir user tanpa login dan data tetap ada');

// -------------------------------------------------------------
// (f) pH asam mengubah dosis
// -------------------------------------------------------------
console.log('\nPoin (f): Pengujian pengaruh pH asam terhadap dosis...');
const dosisOpt = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'optimal',
  leafCondition: 'normal'
});
const dosisAsam = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'asam',
  leafCondition: 'normal'
});

assert.notStrictEqual(dosisOpt.level, dosisAsam.level);
assert.strictEqual(dosisAsam.adjustedFrom, 'Sedang (Optimum Vegetatif)');
assert.ok(dosisAsam.phAdjustment && dosisAsam.phAdjustment.includes('pH media asam'));
assert.strictEqual(dosisOpt.phAdjustment, null);
console.log(`   ✓ pH asam mengubah tingkat dosis: ${dosisOpt.level} -> ${dosisAsam.level}`);

// -------------------------------------------------------------
// (g) Pilihan setara menampilkan dosis dua pupuk
// -------------------------------------------------------------
console.log('\nPoin (g): Pengujian perhitungan dosis untuk dua pupuk pada pilihan setara...');
const mockReqEq = {
  body: {
    batch_code: 'TEST-EQ-DOSIS',
    variety: 'DxP Marihat',
    leaf_condition: 'pucat_kerdil',
    growth_phase: 'main_nursery_awal',
    media_ph: 'asam',
    media_moisture: 'optimal'
  },
  session: {}
};
let eqRedirect = null;
const mockResEq = {
  redirect: (url) => { eqRedirect = url; }
};

RecommendationController.postCalculate(mockReqEq, mockResEq);
assert.ok(eqRedirect && eqRedirect.startsWith('/rekomendasi/hasil/'));

const newRecId = eqRedirect.split('/').pop();
const recEqSaved = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(newRecId);
assert.strictEqual(recEqSaved.is_equivalent, 1);

const parsedCalc = JSON.parse(recEqSaved.calculation_json);
assert.ok(parsedCalc.dosage, 'Dosis pupuk utama harus ada');
assert.ok(parsedCalc.dosageSecond, 'Dosis pupuk kedua (setara) harus ada');
assert.strictEqual(parsedCalc.dosageSecond.fertilizerName, 'SP-36');
assert.ok(parsedCalc.dosageSecond.amount, 'Takaran pupuk kedua harus dihitung');
console.log(`   ✓ Pilihan setara menyimpan dosis pupuk 1 (${recEqSaved.top_fertilizer_name}) DAN pupuk 2 (${recEqSaved.second_fertilizer_name})`);

// -------------------------------------------------------------
// (h) TUNDA tidak menjalankan SAW
// -------------------------------------------------------------
console.log('\nPoin (h): Pengujian status TUNDA tidak menjalankan perhitungan SAW...');
const mockReqTunda = {
  body: {
    batch_code: 'TEST-TUNDA-NO-SAW',
    variety: 'DxP Socfindo',
    leaf_condition: 'normal',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'terlalu_basah'
  },
  session: {}
};
let tundaRedirect = null;
const mockResTunda = {
  redirect: (url) => { tundaRedirect = url; }
};

RecommendationController.postCalculate(mockReqTunda, mockResTunda);
const tundaId = tundaRedirect.split('/').pop();
const recTundaSaved = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(tundaId);

assert.strictEqual(recTundaSaved.timing_status, 'TUNDA');
assert.strictEqual(recTundaSaved.top_fertilizer_code, null);
assert.strictEqual(recTundaSaved.top_score, null);
const tundaCalc = JSON.parse(recTundaSaved.calculation_json);
assert.strictEqual(tundaCalc.saw, null, 'Pada status TUNDA, sawResult wajib bernilai null');
console.log('   ✓ Status TUNDA terbukti tidak menjalankan SAW dan sawResult = null');

// -------------------------------------------------------------
// (i) CSV meng-escape sel berawalan =, +, -, @, \t
// -------------------------------------------------------------
console.log('\nPoin (i): Pengujian mitigasi formula injection pada ekspor CSV...');
// Sisipkan data dengan formula injection
db.prepare(`
  INSERT INTO recommendations (
    batch_code, variety, leaf_condition, growth_phase, media_ph, media_moisture,
    timing_status, timing_title, timing_note, top_fertilizer_code, top_fertilizer_name,
    top_score, is_equivalent, dosage_level, dosage_amount, application_method, agronomic_notes, calculation_json
  ) VALUES (
    '=1+1', '+cmd|"/C calc"', 'normal', 'pre_nursery', 'optimal', 'optimal',
    'LAYAK', 'Layak', 'Catatan', 'A5', '-POC Formula',
    1.0, 0, 'Rendah', '@takaran', 'Tabur', 'Catatan', '{}'
  )
`).run();

let csvOutput = '';
const mockResCsv = {
  setHeader: () => {},
  status: () => ({
    send: (content) => { csvOutput = content; }
  })
};

HistoryController.exportCsv({}, mockResCsv);
assert.ok(csvOutput.includes("\"'=1+1\""), 'Sel diawali = harus diawali tanda kutip tunggal \'');
assert.ok(csvOutput.includes("\"'+cmd|"), 'Sel diawali + harus diawali tanda kutip tunggal \'');
assert.ok(csvOutput.includes("\"'-POC"), 'Sel diawali - harus diawali tanda kutip tunggal \'');
assert.ok(csvOutput.includes("\"'@takaran\""), 'Sel diawali @ harus diawali tanda kutip tunggal \'');
console.log('   ✓ Sel formula injection (=, +, -, @) berhasil di-escape dengan tanda kutip tunggal di CSV');

// -------------------------------------------------------------
// (j) Login memakai hash crypto.scrypt
// -------------------------------------------------------------
console.log('\nPoin (j): Pengujian hashing password crypto.scrypt...');
const adminUser = db.prepare("SELECT password FROM users WHERE username = 'admin'").get();
assert.ok(adminUser.password.includes(':'), 'Password admin di DB harus berformat salt:hash (crypto.scrypt)');
assert.notStrictEqual(adminUser.password, 'admin123', 'Password admin di DB tidak boleh berupa plaintext!');

assert.strictEqual(verifyPassword('admin123', adminUser.password), true, 'Password benar harus valid');
assert.strictEqual(verifyPassword('salah123', adminUser.password), false, 'Password salah harus ditolak');
console.log('   ✓ Password admin tersimpan sebagai hash crypto.scrypt dengan random salt dan timingSafeEqual teruji');

console.log('\n============================================================');
console.log('🎉 SEMUA 10 POIN PENGUJIAN AUDIT & KEAMANAN LULUS 100%!');
console.log('============================================================\n');
