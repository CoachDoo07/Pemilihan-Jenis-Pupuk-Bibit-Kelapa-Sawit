const assert = require('assert');
const DosageService = require('../src/services/dosageService');
const SawService = require('../src/services/sawService');

console.log('=== MEMULAI PENGUJIAN METODE SAW & ATURAN DOSIS ===\n');

// 1. Uji Timing Check
console.log('1. Pengujian Pengecekan Kelayakan Waktu:');
const tundaCheck = DosageService.checkTimingSuitability('terlalu_basah');
assert.strictEqual(tundaCheck.status, 'TUNDA');
assert.strictEqual(tundaCheck.allowRanking, false);
console.log('   ✓ Kelembapan "terlalu_basah" berhasil menghasilkan status TUNDA');

const siramCheck = DosageService.checkTimingSuitability('rendah');
assert.strictEqual(siramCheck.status, 'SIRAM_DAHULU');
assert.strictEqual(siramCheck.allowRanking, true);
console.log('   ✓ Kelembapan "rendah" berhasil menghasilkan status SIRAM_DAHULU');

const layakCheck = DosageService.checkTimingSuitability('optimal');
assert.strictEqual(layakCheck.status, 'LAYAK');
assert.strictEqual(layakCheck.allowRanking, true);
console.log('   ✓ Kelembapan "optimal" berhasil menghasilkan status LAYAK');

// 2. Uji Penentuan Dosis & Pengaruh pH (Point 4)
console.log('\n2. Pengujian Penentuan Dosis & Pengaruh pH Media:');
const dosisAwal = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'optimal',
  leafCondition: 'normal'
});
assert.ok(dosisAwal.amount.includes('5 - 6 gram'), 'Dosis NPK main nursery awal harus mencakup 5-6 g sesuai Kasno & Anggria (2016)');
assert.strictEqual(dosisAwal.phAdjustment, null);
assert.strictEqual(dosisAwal.adjustedFrom, null);
console.log(`   ✓ Dosis NPK Main Nursery Awal terverifikasi: ${dosisAwal.amount}`);

const dosisAsamNPK = DosageService.determineDosage({
  fertilizerCode: 'A2',
  fertilizerName: 'NPK Majemuk',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'asam',
  leafCondition: 'normal'
});
assert.notStrictEqual(dosisAsamNPK.level, dosisAwal.level, 'Level dosis pada pH asam harus berbeda dari pH optimal');
assert.strictEqual(dosisAsamNPK.adjustedFrom, 'Sedang (Optimum Vegetatif)');
assert.ok(dosisAsamNPK.phAdjustment && dosisAsamNPK.phAdjustment.includes('pH media asam'), 'Harus menyertakan penjelasan penyesuaian pH asam');
assert.ok(dosisAsamNPK.amount.includes('Batas bawah'), 'Harus menyertakan batas bawah takaran pada pH asam');
console.log(`   ✓ Penyesuaian dosis karena pH asam terverifikasi: ${dosisAsamNPK.level} (${dosisAsamNPK.amount})`);

// 3. Uji Perhitungan SAW (Skenario Defisiensi Nitrogen & Pilihan Setara)
console.log('\n3. Pengujian Perhitungan SAW - Skenario Defisiensi N:');
const sawN = SawService.calculate({
  leafCondition: 'menguning_merata',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'optimal',
  mediaMoisture: 'optimal'
});

assert.strictEqual(sawN.ranking.length, 5, 'Jumlah alternatif pupuk harus 5');
const topCodes = [sawN.ranking[0].fertilizerCode, sawN.ranking[1].fertilizerCode];
assert.ok(topCodes.includes('A1') && topCodes.includes('A2'), 'Top 2 untuk defisiensi N harus Urea dan NPK');
console.log(`   ✓ Peringkat 1: ${sawN.ranking[0].fertilizerName} (${sawN.ranking[0].score})`);
console.log(`   ✓ Peringkat 2: ${sawN.ranking[1].fertilizerName} (${sawN.ranking[1].score})`);
console.log(`   ✓ Selisih skor: ${Math.abs(sawN.ranking[0].score - sawN.ranking[1].score).toFixed(4)} (< 0.05) -> Pilihan Setara: ${sawN.isEquivalent}`);
assert.strictEqual(sawN.isEquivalent, true, 'Selisih < 0.05 harus memicu status pilihan setara');

// 4. Uji Perhitungan SAW (Skenario Defisiensi Kalium)
console.log('\n4. Pengujian Perhitungan SAW - Skenario Defisiensi K:');
const sawK = SawService.calculate({
  leafCondition: 'menguning_tepi',
  growthPhase: 'main_nursery_lanjut',
  mediaPh: 'optimal',
  mediaMoisture: 'optimal'
});
assert.strictEqual(sawK.ranking[0].fertilizerCode, 'A4', 'Untuk menguning di tepi, KCl harus berada di peringkat 1');
assert.strictEqual(sawK.ranking[0].score, 1.0);
console.log(`   ✓ Peringkat 1: ${sawK.ranking[0].fertilizerName} dengan skor ${sawK.ranking[0].score}`);

// 5. Uji Perhitungan SAW (Skenario Pre-Nursery Normal)
console.log('\n5. Pengujian Perhitungan SAW - Skenario Pre-Nursery Normal:');
const sawPre = SawService.calculate({
  leafCondition: 'normal',
  growthPhase: 'pre_nursery',
  mediaPh: 'optimal',
  mediaMoisture: 'optimal'
});
assert.strictEqual(sawPre.ranking[0].fertilizerCode, 'A5', 'Untuk pre-nursery daun normal, POC harus menjadi peringkat 1');
assert.strictEqual(sawPre.ranking[0].score, 1.0);
console.log(`   ✓ Peringkat 1: ${sawPre.ranking[0].fertilizerName} dengan skor ${sawPre.ranking[0].score}`);

// 6. Uji Perhitungan SAW Ketat (Skenario Defisiensi Fosfat, Point 3)
console.log('\n6. Pengujian Perhitungan SAW Ketat - Skenario Defisiensi P:');
const sawP = SawService.calculate({
  leafCondition: 'pucat_kerdil',
  growthPhase: 'main_nursery_awal',
  mediaPh: 'asam',
  mediaMoisture: 'optimal'
});

assert.strictEqual(sawP.ranking[0].fertilizerCode, 'A2', 'Peringkat 1 harus NPK (A2)');
assert.strictEqual(sawP.ranking[0].score, 0.85, 'Skor peringkat 1 harus tepat 0.85');
assert.strictEqual(sawP.ranking[1].fertilizerCode, 'A3', 'Peringkat 2 harus SP-36 (A3)');
assert.strictEqual(sawP.ranking[1].score, 0.83, 'Skor peringkat 2 harus tepat 0.83');
assert.strictEqual(sawP.isEquivalent, true, 'isEquivalent harus true karena selisih 0.02 < 0.05');
console.log(`   ✓ Peringkat 1: ${sawP.ranking[0].fertilizerName} (${sawP.ranking[0].score})`);
console.log(`   ✓ Peringkat 2: ${sawP.ranking[1].fertilizerName} (${sawP.ranking[1].score})`);
console.log(`   ✓ Selisih 0.02 (< 0.05) -> isEquivalent: ${sawP.isEquivalent} teruji ketat`);

console.log('\n=== SEMUA 6 UJI PENGUJIAN METODE SAW DAN ATURAN DOSIS BERHASIL 100%! ===');
