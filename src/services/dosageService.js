/**
 * Service untuk aturan berbasis aturan (rule-based agronomi):
 * 1. Pengecekan kelayakan waktu pemupukan berdasarkan kelembapan media
 * 2. Penentuan tingkat dosis, takaran gram/bibit, metode aplikasi, dan catatan agronomi
 * 
 * Rujukan literatur:
 * - Kasno, A., & Anggria, L. (2016):
 *   (a) NPK majemuk lebih baik daripada pupuk tunggal pada pembibitan kelapa sawit.
 *   (b) Dosis optimum NPK 11-7-12 sekitar 5-6 g/pohon pada bibit main nursery (umur 3 bulan).
 * Catatan: Seluruh aturan dan takaran selain NPK main nursery awal merupakan angka rancangan awal indikatif
 * yang belum tervalidasi secara empiris oleh literatur/petugas pembibitan.
 */

/**
 * Konfigurasi aturan dosis per fase bibit dan pupuk (Point 18)
 * Dilengkapi flag `verified`: true HANYA untuk NPK main nursery awal berdasarkan Kasno & Anggria (2016).
 */
const DOSAGE_CONFIG = {
  pre_nursery: {
    // Bibit umur 1-3 bulan di baby polybag. Perakaran muda sangat peka garam pupuk pekat.
    // Ditargetkan larutan encer (konsentrasi 0.1% - 0.2%) untuk mencegah plasmolisis.
    A1: {
      fertilizerName: 'Urea',
      level: 'Rendah (Aman Akar Muda)',
      amount: 'Larutan 0.1% - 0.2% (1 - 2 g/L air) disiramkan untuk 5 - 10 bibit (setara ~0.2 g Urea/bibit)',
      lowerBoundAmount: 'Larutan 0.1% (1 g/L air) disiramkan untuk 10 bibit (setara ~0.1 g Urea/bibit)',
      interval: 'Aplikasi setiap 10 - 14 hari sekali',
      method: 'Siram kocor encer pada zona perakaran, hindari mengenai helaian daun muda.',
      verified: false,
      note: 'Dosis pre-nursery dirancang dalam larutan encer konsentrasi rendah agar tidak membakar akar muda.'
    },
    A2: {
      fertilizerName: 'NPK Majemuk',
      level: 'Rendah (Aman Akar Muda)',
      // Penurunan matematis konsisten: konsentrasi 0.2% = 2 g/L air. Jika disiramkan 100-150 ml per bibit,
      // maka dosis riil per bibit adalah (2 g / 1000 ml) * 100-150 ml = 0.2 - 0.3 g NPK per bibit.
      amount: 'Larutan 0.2% (2 g/L air), disiramkan 100 - 150 ml per bibit (setara 0.2 - 0.3 g NPK/bibit)',
      lowerBoundAmount: 'Larutan 0.15% (1.5 g/L air), disiramkan 100 ml per bibit (setara 0.15 g NPK/bibit)',
      interval: 'Aplikasi setiap 10 - 14 hari sekali',
      method: 'Siramkan 100 - 150 ml larutan pupuk per polybag kecil (baby polybag).',
      verified: false,
      note: 'Dosis NPK pre-nursery dihitung berdasarkan larutan kocor 0.2% (setara 0.2-0.3 g/bibit) agar akar halus tidak rusak.'
    },
    A3: {
      fertilizerName: 'SP-36',
      level: 'Rendah (Aman Akar Muda)',
      amount: '1.5 - 2 gram / bibit',
      lowerBoundAmount: '1.5 gram / bibit',
      interval: 'Aplikasi setiap 2 - 3 minggu sekali',
      method: 'Dibenamkan dangkal (1 cm) melingkari bibit di polybag kecil.',
      verified: false,
      note: 'Fosfat memiliki kelarutan lambat di polybag kecil; aplikasi dangkal membantu kontak akar.'
    },
    A4: {
      fertilizerName: 'KCl',
      level: 'Rendah (Aman Akar Muda)',
      amount: 'Larutan 0.1% (1 g/L air) disiramkan 100 ml per bibit (setara 0.1 g KCl/bibit)',
      lowerBoundAmount: 'Larutan 0.08% (0.8 g/L air) disiramkan 100 ml per bibit',
      interval: 'Aplikasi setiap 14 hari sekali',
      method: 'Dilarutkan dalam air siraman untuk mencegah stres osmotik akar muda.',
      verified: false,
      note: 'Indeks garam KCl tinggi sehingga wajib diaplikasikan encer pada bibit pre-nursery.'
    },
    A5: {
      fertilizerName: 'Pupuk Organik Cair (POC)',
      level: 'Rendah (Aman Akar Muda)',
      amount: '5 - 10 ml / liter air',
      lowerBoundAmount: '5 ml / liter air',
      interval: 'Aplikasi setiap 7 - 10 hari sekali',
      method: 'Siram kocor merata pada media perakaran pada pagi hari (sebelum pukul 09.00).',
      verified: false,
      note: 'POC formula organik sangat lembut dan aman bagi bulu perakaran bibit pre-nursery.'
    }
  },

  main_nursery_awal: {
    // Bibit umur 4-7 bulan di large polybag. Fase pertumbuhan vegetatif pesat.
    A1: {
      fertilizerName: 'Urea',
      level: 'Sedang (Optimum Vegetatif)',
      amount: '3 - 5 gram / bibit',
      lowerBoundAmount: '3 gram / bibit',
      interval: 'Aplikasi setiap 2 - 3 minggu sekali',
      method: 'Tabur melingkar pada jarak 5 cm dari pangkal batang di dalam polybag besar.',
      verified: false,
      note: 'Urea memacu pembentukan pelepah dan klorofil daun.'
    },
    A2: {
      fertilizerName: 'NPK Majemuk',
      level: 'Sedang (Optimum Vegetatif)',
      // Terverifikasi literatur: Kasno & Anggria (2016)
      amount: '5 - 6 gram / bibit (Dosis optimum riset Kasno & Anggria, 2016)',
      lowerBoundAmount: '5 gram / bibit',
      interval: 'Aplikasi setiap 2 - 3 minggu sekali',
      method: 'Tabur merata melingkar pada batas proyeksi kanopi daun, lalu tutup tipis dengan tanah.',
      verified: true, // Satu-satunya aturan yang tervalidasi literatur
      note: 'Mengacu pada hasil penelitian Kasno & Anggria (2016), NPK majemuk 11-7-12 dosis 5-6 g/pohon merupakan dosis optimum untuk bibit main nursery umur 3 bulan.'
    },
    A3: {
      fertilizerName: 'SP-36',
      level: 'Sedang (Optimum Vegetatif)',
      amount: '4 - 5 gram / bibit',
      lowerBoundAmount: '4 gram / bibit',
      interval: 'Aplikasi setiap 3 - 4 minggu sekali',
      method: 'Dibenamkan sedalam 2 - 3 cm ke dalam tanah dekat zona perakaran.',
      verified: false,
      note: 'Fosfat mendukung perkembangan akar sekunder bibit.'
    },
    A4: {
      fertilizerName: 'KCl',
      level: 'Sedang (Optimum Vegetatif)',
      amount: '3 - 4 gram / bibit',
      lowerBoundAmount: '3 gram / bibit',
      interval: 'Aplikasi setiap 2 - 3 minggu sekali',
      method: 'Tabur melingkar di atas media tanah polybag yang telah disiram lembap.',
      verified: false,
      note: 'Kalium memperkuat integritas dinding sel batang bibit.'
    },
    A5: {
      fertilizerName: 'Pupuk Organik Cair (POC)',
      level: 'Sedang (Optimum Vegetatif)',
      amount: '10 - 15 ml / liter air (disiramkan 250 ml per bibit)',
      lowerBoundAmount: '10 ml / liter air',
      interval: 'Aplikasi setiap 10 - 14 hari sekali',
      method: 'Siram kocor ke sekeliling perakaran polybag.',
      verified: false,
      note: 'POC memasok hara mikro dan asam humat pembenah tanah.'
    }
  },

  main_nursery_lanjut: {
    // Bibit umur 8-12 bulan menjelang pindah tanam ke lapangan.
    A1: {
      fertilizerName: 'Urea',
      level: 'Tinggi / Standar Lanjut',
      amount: '5 - 8 gram / bibit',
      lowerBoundAmount: '5 gram / bibit',
      interval: 'Aplikasi setiap 3 - 4 minggu sekali',
      method: 'Tabur melingkar pada radius 7-10 cm dari pangkal batang polybag.',
      verified: false,
      note: 'Mempertahankan aktivitas fotosintesis pelepah tua.'
    },
    A2: {
      fertilizerName: 'NPK Majemuk',
      level: 'Tinggi / Standar Lanjut',
      amount: '8 - 12 gram / bibit',
      lowerBoundAmount: '8 gram / bibit',
      interval: 'Aplikasi setiap 3 - 4 minggu sekali',
      method: 'Tabur melingkar pada sekeliling polybag atau dibenamkan pada 3 titik sekeliling tajuk.',
      verified: false,
      note: 'Menjaga vigor prima tanaman siap tanam lapangan.'
    },
    A3: {
      fertilizerName: 'SP-36',
      level: 'Tinggi / Standar Lanjut',
      amount: '6 - 8 gram / bibit',
      lowerBoundAmount: '6 gram / bibit',
      interval: 'Aplikasi setiap 4 minggu sekali',
      method: 'Dibenamkan ke dalam tanah dekat perakaran aktif.',
      verified: false,
      note: 'Membentuk perakaran jangkar yang kokoh.'
    },
    A4: {
      fertilizerName: 'KCl',
      level: 'Tinggi / Standar Lanjut',
      amount: '5 - 8 gram / bibit',
      lowerBoundAmount: '5 gram / bibit',
      interval: 'Aplikasi setiap 3 - 4 minggu sekali',
      method: 'Tabur melingkar untuk mempertebal kutikula pelepah dan ketahanan terhadap kekeringan saat transplanting.',
      verified: false,
      note: 'Kalium meningkatkan ketahanan bibit terhadap cekaman saat transplanting.'
    },
    A5: {
      fertilizerName: 'Pupuk Organik Cair (POC)',
      level: 'Tinggi / Standar Lanjut',
      amount: '15 - 20 ml / liter air (disiramkan 300 ml per bibit)',
      lowerBoundAmount: '15 ml / liter air',
      interval: 'Aplikasi setiap 14 hari sekali',
      method: 'Siram kocor pada perakaran atau semprotkan ke permukaan bawah daun.',
      verified: false,
      note: 'Membantu menjaga aktivitas mikroba tanah polybag besar.'
    }
  }
};

class DosageService {
  /**
   * Pengecekan Kelayakan Waktu Pemupukan
   * @param {string} moisture - 'rendah' | 'optimal' | 'terlalu_basah'
   * @returns {object} status kelayakan waktu
   */
  static checkTimingSuitability(moisture) {
    switch (moisture) {
      case 'terlalu_basah':
        return {
          status: 'TUNDA',
          badgeClass: 'bg-red-100 text-red-800 border-red-300',
          icon: 'fas fa-ban',
          title: 'TUNDA Pemupukan',
          summary: 'Kondisi media tanam saat ini terlalu basah / jenuh air.',
          description: 'Pemupukan pada tanah jenuh air berisiko tinggi menyebabkan pencucian hara (leaching) ke luar polybag dan memicu denitrifikasi. Selain itu, aerasi tanah yang terhambat meningkatkan risiko pembusukan perakaran bibit.',
          actionGuidance: 'Tunda pemupukan 1 - 2 hari hingga air berlebih mengalir tuntas melalui lubang drainase polybag dan kelembapan media mencapai kapasitas lapang.',
          allowRanking: false
        };

      case 'rendah':
        return {
          status: 'SIRAM_DAHULU',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: 'fas fa-tint',
          title: 'SIRAM DAHULU, Pemupukan Setelahnya',
          summary: 'Media tanam dalam kondisi kering (di bawah kapasitas lapang).',
          description: 'Aplikasi pupuk anorganik langsung pada media kering dapat memicu stres osmotik (plasmolisis) yang merusak bulu-bulu perakaran bibit kelapa sawit.',
          actionGuidance: 'Lakukan penyiraman air bersih hingga media lembap secara merata. Setelah air meresap (kurang lebih 30-60 menit), segera aplikasikan pupuk rekomendasi berikut.',
          allowRanking: true
        };

      case 'optimal':
      default:
        return {
          status: 'LAYAK',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: 'fas fa-check-circle',
          title: 'LAYAK Pemupukan Langsung',
          summary: 'Kondisi lengas tanah berada pada kapasitas lapang optimal.',
          description: 'Kelembapan media ideal untuk melarutkan butiran pupuk, memfasilitasi difusi hara, dan mendukung penyerapan aktif oleh perakaran bibit secara maksimal.',
          actionGuidance: 'Aplikasi pupuk rekomendasi dapat segera dilaksanakan sesuai dosis dan metode yang dianjurkan.',
          allowRanking: true
        };
    }
  }

  /**
   * Penentuan Tingkat Dosis & Panduan Teknis Pemupukan
   * Menyesuaikan dosis berdasarkan fase bibit DAN pH media (Point 4)
   * @param {object} params - { fertilizerCode, fertilizerName, growthPhase, mediaPh, leafCondition }
   * @returns {object} rincian dosis & agronomi
   */
  static determineDosage({ fertilizerCode, fertilizerName, growthPhase, mediaPh, leafCondition }) {
    const phaseRules = DOSAGE_CONFIG[growthPhase] || DOSAGE_CONFIG.main_nursery_awal;
    const rule = phaseRules[fertilizerCode] || phaseRules.A2;

    let baseLevel = rule.level;
    let finalLevel = baseLevel;
    let finalAmount = rule.amount;
    let adjustedFrom = null;
    let phAdjustment = null;
    const notes = [];

    // Tambahkan catatan dasar pupuk
    if (rule.note) {
      notes.push(rule.note);
    }

    // Penyesuaian Dosis Berdasarkan Kondisi pH Media (Point 4)
    if (mediaPh === 'asam') {
      adjustedFrom = baseLevel;
      // Turunkan tingkat dosis satu tingkat / gunakan batas bawah rentang
      if (baseLevel.startsWith('Tinggi')) {
        finalLevel = 'Sedang (Disesuaikan karena pH Asam)';
      } else if (baseLevel.startsWith('Sedang')) {
        finalLevel = 'Rendah (Disesuaikan karena pH Asam)';
      } else {
        finalLevel = 'Rendah (Batas Minimum karena pH Asam)';
      }
      finalAmount = `${rule.lowerBoundAmount} [Batas bawah rentang disesuaikan karena pH asam]`;
      phAdjustment = 'Dosis disesuaikan ke batas bawah karena pH media asam (< 5.0). Mengurangi risiko keasaman dan dianjurkan aplikasi kapur Dolomit.';

      // Catatan agronomi pH asam: Urea bersifat mengasamkan; hindari klaim SP-36 mengasamkan (Point 17)
      notes.push('PERINGATAN pH ASAM (< 5.0): Media tanam bersifat masam. Disarankan menggunakan batas bawah rentang dosis untuk pupuk yang bereaksi asam (Urea), serta aplikasikan kapur pertanian Dolomit (5 - 10 gram/polybag) 2 minggu terpisah untuk menaikkan pH ke rentang ideal 5.5 - 6.5.');

    } else if (mediaPh === 'basa') {
      adjustedFrom = baseLevel;
      if (baseLevel.startsWith('Tinggi')) {
        finalLevel = 'Sedang (Disesuaikan karena pH Basa)';
      } else if (baseLevel.startsWith('Sedang')) {
        finalLevel = 'Rendah (Disesuaikan karena pH Basa)';
      } else {
        finalLevel = 'Rendah (Batas Minimum karena pH Basa)';
      }
      finalAmount = `${rule.lowerBoundAmount} [Batas bawah rentang disesuaikan karena pH basa]`;
      phAdjustment = 'Dosis disesuaikan ke batas bawah karena pH media basa (> 6.5). Ketersediaan hara mikro dapat terhambat.';
      notes.push('PERHATIAN pH BASA (> 6.5): Ketersediaan hara mikro dan kelarutan fosfat dapat terhambat. Hindari aplikasi kapur dan pertahankan penyiraman teratur.');

    } else {
      // pH optimal (5.5 - 6.5)
      notes.push('KONDISI pH OPTIMAL (5.5 - 6.5): Efisiensi serapan pupuk berlangsung optimal pada dosis standar.');
    }

    // Catatan Agronomi Gejala Daun
    if (leafCondition === 'menguning_merata') {
      notes.push('Gejala klorosis merata daun tua ke muda menandakan defisiensi Nitrogen. Pemupukan ditargetkan untuk merestorasi klorofil.');
    } else if (leafCondition === 'menguning_tepi') {
      notes.push('Gejala nekrosis tepi daun menandakan defisiensi Kalium. Pemupukan Kalium membantu menjaga tekanan turgor sel tanaman.');
    } else if (leafCondition === 'pucat_kerdil') {
      notes.push('Bibit kerdil dan daun pucat kaku mengindikasikan defisiensi Fosfat. Fosfat sangat esensial untuk transfer energi ATP dan pertumbuhan akar.');
    }

    return {
      fertilizerCode,
      fertilizerName: fertilizerName || rule.fertilizerName,
      level: finalLevel,
      amount: finalAmount,
      interval: rule.interval,
      method: rule.method,
      verified: rule.verified, // Point 16: true hanya untuk NPK main nursery awal
      adjustedFrom,            // Point 4: level asli sebelum penyesuaian pH
      phAdjustment,            // Point 4: teks penjelasan penyesuaian pH
      agronomicNotes: notes.join(' ')
    };
  }
}

module.exports = DosageService;
