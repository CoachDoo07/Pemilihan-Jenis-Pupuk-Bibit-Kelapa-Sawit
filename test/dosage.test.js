const assert = require('assert');
const DosageService = require('../src/services/dosageService');

console.log('=== MEMULAI PENGUJIAN UNIT ATURAN DOSIS (DOSAGE SERVICE) ===\n');

// 1. Pengujian Timing Check
console.log('1. Pengujian Aturan Kelayakan Waktu (Timing Check):');
const tunda = DosageService.checkTimingSuitability('terlalu_basah');
assert.strictEqual(tunda.status, 'TUNDA');
assert.strictEqual(tunda.allowRanking, false);
assert.ok(tunda.actionGuidance.includes('Tunda'));

const siram = DosageService.checkTimingSuitability('rendah');
assert.strictEqual(siram.status, 'SIRAM_DAHULU');
assert.strictEqual(siram.allowRanking, true);
assert.ok(siram.actionGuidance.includes('penyiraman'));

const layak = DosageService.checkTimingSuitability('optimal');
assert.strictEqual(layak.status, 'LAYAK');
assert.strictEqual(layak.allowRanking, true);
console.log('   ✓ Status TUNDA, SIRAM_DAHULU, dan LAYAK sesuai spesifikasi');

// 2. Pengujian Aturan Dosis NPK Main Nursery Awal (Literatur Kasno & Anggria, 2016)
console.log('\n2. Pengujian Dosis NPK Main Nursery Awal (Satu-satunya yang verified=true):');
const npkOpt = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'optimal'
});
assert.strictEqual(npkOpt.fertilizerCode, 'A2');
assert.strictEqual(npkOpt.fertilizerName, 'NPK Majemuk');
assert.strictEqual(npkOpt.verified, true, 'NPK main nursery awal harus verified: true sesuai Kasno & Anggria (2016)');
assert.ok(npkOpt.amount.includes('5 - 6 gram'), 'Takaran harus 5-6 g/bibit');
assert.strictEqual(npkOpt.phAdjustment, null);
assert.strictEqual(npkOpt.adjustedFrom, null);
console.log('   ✓ Dosis NPK Main Nursery Awal: verified=true, 5-6 gram/bibit');

// 3. Pengujian Penyesuaian pH Asam & Basa pada NPK Main Nursery Awal
console.log('\n3. Pengujian Penyesuaian pH Media pada NPK Main Nursery Awal:');
const npkAsam = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'asam'
});
assert.strictEqual(npkAsam.level, 'Rendah (Disesuaikan karena pH Asam)');
assert.strictEqual(npkAsam.adjustedFrom, 'Sedang (Optimum Vegetatif)');
assert.ok(npkAsam.amount.includes('5 gram / bibit'));
assert.ok(npkAsam.amount.includes('Batas bawah'));
assert.ok(npkAsam.phAdjustment.includes('pH media asam'));
assert.strictEqual(npkAsam.verified, true);

const npkBasa = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'basa'
});
assert.strictEqual(npkBasa.level, 'Rendah (Disesuaikan karena pH Basa)');
assert.strictEqual(npkBasa.adjustedFrom, 'Sedang (Optimum Vegetatif)');
assert.ok(npkBasa.phAdjustment.includes('pH media basa'));
console.log('   ✓ Penyesuaian pH asam & basa pada NPK menurunkan level dan memakai batas bawah');

// 4. Pengujian Pre-Nursery Konsistensi Konsentrasi & Angka Dosis (Point 17)
console.log('\n4. Pengujian Konsistensi Konsentrasi Larutan Pre-Nursery:');
const npkPre = DosageService.determineDosage({
  fertilizerCode: 'A2',
  growthPhase: 'pre_nursery',
  mediaPh: 'optimal'
});
assert.strictEqual(npkPre.verified, false, 'Pre-nursery berstatus verified: false (rancangan awal)');
assert.ok(npkPre.amount.includes('0.2%'), 'Harus konsisten konsentrasi larutan 0.2%');
assert.ok(npkPre.amount.includes('0.2 - 0.3 g NPK/bibit'), 'Harus konsisten setara 0.2 - 0.3 g NPK/bibit');

const ureaPre = DosageService.determineDosage({
  fertilizerCode: 'A1',
  growthPhase: 'pre_nursery',
  mediaPh: 'optimal'
});
assert.strictEqual(ureaPre.verified, false);
assert.ok(ureaPre.amount.includes('0.1% - 0.2%'));
assert.ok(ureaPre.amount.includes('~0.2 g Urea/bibit'));
console.log('   ✓ Takaran pre-nursery NPK & Urea konsisten antara konsentrasi dan gram per bibit');

// 5. Pengujian Status verified: false pada Pupuk & Fase Lainnya (Point 16)
console.log('\n5. Pengujian Flag verified: false pada Aturan Rancangan Awal:');
const sp36 = DosageService.determineDosage({ fertilizerCode: 'A3', growthPhase: 'main_nursery_awal', mediaPh: 'optimal' });
const kcl = DosageService.determineDosage({ fertilizerCode: 'A4', growthPhase: 'main_nursery_lanjut', mediaPh: 'optimal' });
const poc = DosageService.determineDosage({ fertilizerCode: 'A5', growthPhase: 'main_nursery_awal', mediaPh: 'optimal' });

assert.strictEqual(sp36.verified, false);
assert.strictEqual(kcl.verified, false);
assert.strictEqual(poc.verified, false);
console.log('   ✓ SP-36, KCl, dan POC terkonfirmasi berstatus verified: false (rancangan awal)');

// 6. Pengujian Aturan Bebas SP-36 dari Klaim Pengasam (Point 17)
console.log('\n6. Pengujian Catatan Pupuk Pengasam pada pH Asam:');
assert.ok(!sp36.agronomicNotes.toLowerCase().includes('pengasam'), 'SP-36 tidak boleh diklaim sebagai pupuk pengasam');
assert.ok(!npkAsam.phAdjustment.includes('SP-36'), 'phAdjustment tidak boleh menyebut SP-36 sebagai pupuk pengasam');
console.log('   ✓ SP-36 bersih dari klaim pupuk pengasam tanah');

// 7. Pengujian Penyesuaian pH pada POC (Pupuk Organik Cair)
console.log('\n7. Pengujian Penyesuaian pH pada POC:');
const pocAsam = DosageService.determineDosage({
  fertilizerCode: 'A5',
  growthPhase: 'main_nursery_lanjut',
  mediaPh: 'asam'
});
assert.ok(pocAsam.phAdjustment.includes('pH media asam'));
assert.strictEqual(pocAsam.adjustedFrom, 'Tinggi / Standar Lanjut', 'POC disesuaikan dari level standar lanjut');
console.log('   ✓ POC disesuaikan ke batas bawah pada media masam');

console.log('\n=== SEMUA 7 PENGUJIAN DOSAGE SERVICE BERHASIL 100%! ===\n');
