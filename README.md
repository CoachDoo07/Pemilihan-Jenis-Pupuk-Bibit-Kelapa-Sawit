# Sistem Pendukung Keputusan Pemilihan Jenis Pupuk Bibit Kelapa Sawit Menggunakan Metode SAW

Aplikasi web Sistem Pendukung Keputusan (SPK) untuk membantu petugas pembibitan (*nursery*) kelapa sawit menentukan jenis pupuk paling tepat, mengevaluasi kelayakan waktu pemupukan, dan menentukan tingkat dosis spesifik berdasarkan kondisi visual bibit serta media tanam.

Proyek ini dikembangkan untuk memenuhi tugas mata kuliah **Sistem Pendukung Keputusan (SPK)**.

---

## 👥 Identitas Kelompok Mahasiswa

| No | Nama Lengkap | NRP | Peran |
|:--:|:---|:---:|:---|
| 1 | **Rafael Rizky Luga Tanjung** | `3125522007` | Pengembang Sistem & Implementasi SAW |
| 2 | **Aldo Rachmat Hidayat** | `3125522003` | Analis Agronomi, Basis Data & UI/UX |

---

## 🌿 Latar Belakang & Masalah

Pemupukan bibit kelapa sawit di *pre-nursery* maupun *main nursery* seringkali dilakukan secara seragam hanya berdasarkan jadwal kalender atau perkiraan subjektif petugas, tanpa meninjau kondisi riil bibit dan lengas tanah. Pemupukan yang kurang tepat atau berlebihan dapat menghambat laju pertumbuhan bibit (*stunting*) serta memicu keracunan perakaran atau pemborosan biaya operasional.

Sistem ini memecahkan masalah tersebut dengan pendekatan berlapis:
1. **Pengecekan Kelayakan Waktu (Timing Rule)**: Mencegah risiko pencucian hara (*leaching*) bila tanah terlalu basah dan risiko kerusakan akar (*plasmolisis*) bila tanah kering.
   - **TUNDA**: Bila tanah terlalu basah, algoritma SAW **tidak dijalankan** dan tabel ranking tidak ditampilkan demi efisiensi dan keamanan tanaman.
   - **SIRAM DAHULU** / **LAYAK**: Algoritma SAW dijalankan untuk menghasilkan ranking pupuk.
2. **Pemilihan Pupuk Terbaik dengan Metode SAW (Simple Additive Weighting)**: Menilai 5 alternatif pupuk secara transparan berdasarkan 4 kriteria agronomi.
3. **Pengecekan Pilihan Setara (Tie-Breaking)**: Mengidentifikasi jika peringkat 1 dan 2 memiliki selisih nilai $< 0.05$. Jika setara, sistem menghitung dan menyajikan panduan dosis lengkap untuk **kedua pupuk**, memberikan fleksibilitas substitusi sesuai stok gudang.
4. **Penentuan Dosis & Cara Aplikasi Berdasarkan Fase & pH Media**: Memberikan takaran gram/bibit, interval pemupukan, serta penyesuaian dosis otomatis jika pH media tanam bersifat asam atau basa.

---

## ⚠️ Batasan Akademik & Kejujuran Ilmiah (Academic Disclaimer)

Sebagai transparansi ilmiah dan integritas akademik:
1. **Status Bobot & Matriks Kecocokan**:
   - Bobot kriteria ($C_1 = 0.35, C_2 = 0.25, C_3 = 0.20, C_4 = 0.20$) dan nilai matriks kecocokan (skala 1–5) pada sistem ini berstatus **default rancangan awal (belum tervalidasi literatur/petugas pembibitan)**.
   - Nilai-nilai ini dirancang sebagai instrumen simulasi awal SPK dan dapat disesuaikan sewaktu-waktu oleh pengelola/ahli perkebunan melalui halaman **Pengaturan**.
2. **Batasan Penggunaan Literatur Kasno & Anggria (2016)**:
   - Rujukan publikasi *Kasno & Anggria (2016)* dalam sistem ini **hanya digunakan untuk mendukung dua klaim spesifik**:
     1. Pupuk NPK majemuk memberikan respons pertumbuhan bibit kelapa sawit yang lebih baik dibandingkan pupuk tunggal.
     2. Dosis optimum pupuk NPK majemuk (formula 11-7-12) adalah sekitar **5 - 6 gram/pohon** untuk bibit *main nursery* awal (umur 3 bulan).
   - Rule ini ditandai dengan flag sistem `verified: true`.
3. **Status Takaran Dosis Lainnya**:
   - Takaran dosis selain NPK main nursery awal (seperti dosis pre-nursery, main nursery lanjut, Urea, SP-36, KCl, POC, serta interval aplikasi) berstatus **angka indikatif rancangan awal (`verified: false`)**. Seluruhnya wajib diverifikasi dan dikalibrasi lebih lanjut dengan SOP perkebunan setempat sebelum diterapkan di lapangan.
4. **Koreksi Agronomi Pupuk**:
   - Sifat pengasaman tanah pada media asam diatribusikan secara tepat pada pupuk **Urea**, sedangkan klaim pengasaman tanah tidak dilekatkan pada SP-36.
   - Takaran larutan pre-nursery telah diselaraskan secara matematis: NPK konsentrasi 0.2% (2 g/L air) setara 0.2 - 0.3 g NPK/bibit pada volume siraman 100-150 ml; larutan Urea konsentrasi 0.1% - 0.2% setara ~0.2 g Urea/bibit untuk melindungi perakaran bibit muda baby polybag.

---

## 🛠️ Tech Stack & Keamanan

- **Runtime & Backend**: Node.js (v18+) + Express.js 5
- **Database**: SQLite3 via `better-sqlite3` (cepat, ACID, tanpa server terpisah)
- **Template Engine**: EJS (Embedded JavaScript Templates)
- **Styling & UI**: Tailwind CSS (CDN) + FontAwesome 6 (CDN) + Inter Google Font
- **Visualisasi & Grafik**: Chart.js (CDN)
- **Keamanan**:
  - **Hashing Password**: Menggunakan `crypto.scrypt` bawaan Node.js dengan salt acak 16-byte dan verifikasi `crypto.timingSafeEqual` untuk mencegah *timing attacks*.
  - **Proteksi CSRF**: Token acak berbasis sesi (`_csrf`) pada setiap form manipulasi data POST dan verifikasi middleware ketat.
  - **Mitigasi Stored XSS**: Output JSON pada tag `<script>` diproteksi menggunakan sanitizer `safeJson()` yang mereplace karakter `<, >, &, \u2028, \u2029`.
  - **Mitigasi CSV Formula Injection**: Penyanitasian sel CSV yang diawali karakter `=`, `+`, `-`, `@`, atau `\t` dengan tanda petik tunggal (`'`).
  - **Otentikasi & Sesi**: Sesi diamankan dengan flag cookie `httpOnly`, `sameSite: 'lax'`, dan regenerasi ID sesi saat login. Route penghapusan riwayat diproteksi khusus admin (`requireAdmin`).

---

## 📁 Struktur Direktori Proyek

```text
proyek-nyawit/
├── package.json               # Konfigurasi dependensi dan scripts npm test/start
├── server.js                  # Entry point listener server (app.listen)
├── .env.example               # Contoh konfigurasi environment variable
├── .gitignore                 # Konfigurasi pengabaian file git (node_modules, db, env)
├── README.md                  # Dokumentasi lengkap, panduan instalasi, demo & rujukan
├── data/
│   └── spk_sawit.db           # Berkas basis data SQLite3 (dibuat otomatis)
├── src/
│   ├── app.js                 # Konfigurasi aplikasi Express, middleware, session & router
│   ├── config/
│   │   ├── database.js        # Koneksi SQLite (DB_PATH) & pembuatan skema tabel
│   │   └── seed.js            # Seeder data awal cerdas (tidak menimpa edit admin)
│   ├── controllers/
│   │   ├── dashboardController.js       # KPI, statistik & ringkasan chart
│   │   ├── recommendationController.js  # Alur input form & halaman hasil SAW
│   │   ├── historyController.js         # Pengelolaan arsip & ekspor aman CSV
│   │   ├── settingsController.js        # Pengaturan bobot & tabel kecocokan
│   │   └── authController.js            # Login petugas & sesi terproteksi
│   ├── services/
│   │   ├── sawService.js      # Logika murni SAW (Matriks, Normalisasi, Skor V)
│   │   └── dosageService.js   # Konfigurasi DOSAGE_CONFIG & penyesuaian pH media
│   ├── middleware/
│   │   └── authMiddleware.js  # CSRF guard, auth check & sanitizer safeJson
│   ├── utils/
│   │   └── authUtil.js        # Hashing scrypt & verifikasi timingSafeEqual
│   ├── routes/
│   │   ├── index.js           # Router agregator
│   │   ├── recommendationRoutes.js
│   │   ├── historyRoutes.js
│   │   ├── settingsRoutes.js
│   │   └── authRoutes.js
│   ├── views/
│   │   ├── layouts/
│   │   │   ├── header.ejs     # Navigasi & meta CSRF
│   │   │   ├── footer.ejs     # Footer akademik & informasi tim
│   │   │   └── alerts.ejs     # Notifikasi flash message
│   │   ├── dashboard.ejs      # Dashboard statistik & visualisasi aman Chart.js
│   │   ├── recommendation/
│   │   │   ├── form.ejs       # Form input kondisi bibit + 6 tombol simulasi
│   │   │   └── result.ejs     # Hasil rekomendasi, panduan 2 dosis & tabel SAW
│   │   ├── history/
│   │   │   └── index.ejs      # Riwayat analisis tersaring & ekspor CSV
│   │   ├── settings/
│   │   │   └── index.ejs      # Editor bobot & matriks kecocokan (data-* binding)
│   │   └── auth/
│   │       └── login.ejs      # Halaman login petugas nursery / admin
│   └── public/
│       ├── css/
│       │   └── custom.css     # Kustomisasi CSS & print PDF styling
│       └── js/
│           └── simulation.js  # Preset skenario demo interaktif
└── test/
    ├── saw.test.js            # Unit test perhitungan SAW & tie-breaking ketat
    ├── dosage.test.js         # Unit test aturan dosis, timing rule & pengaruh pH
    ├── audit.test.js          # Integration test 10 poin audit keamanan & fungsional
    └── e2e.test.js            # End-to-end HTTP request testing
```

---

## ⚡ Panduan Instalasi & Menjalankan Aplikasi

Pastikan di lingkungan komputer Anda telah terinstal **Node.js** (versi 18 atau lebih baru).

### 1. Masuk ke Direktori Proyek
```bash
cd "d:\Proyek nyawit"
```

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi pada file `.env`:
```env
PORT=3000
SESSION_SECRET=kunci_rahasia_sesi_anda_yang_sangat_panjang_dan_aman_12345
DB_PATH=data/spk_sawit.db
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Jalankan Pengujian Otomatis (Test Suite)
Jalankan seluruh rangkaian unit test, pengujian dosis, dan pengujian audit:
```bash
npm test
```
*Output akan memverifikasi 100% kelulusan seluruh tes unit SAW, dosis, persistensi restart, hashing scrypt, mitigasi XSS/CSRF, dan aturan fungsional lainnya.*

### 5. Jalankan Aplikasi
```bash
npm start
```
*Atau mode pengembangan:*
```bash
npm run dev
```

### 6. Buka di Peramban Web (Browser)
Akses alamat:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Kredensial Akun Demo Admin

Untuk mengakses pengubahan bobot kriteria, manipulasi nilai matriks kecocokan, dan penghapusan arsip riwayat:
- **Username**: `admin`
- **Password**: `admin123`

*(Password tersimpan dalam bentuk hash `crypto.scrypt` ber-salt di basis data SQLite; sistem secara otomatis memigrasikan password plaintext lama menjadi hash saat server pertama kali dijalankan).*

---

## 📐 Metode Simple Additive Weighting (SAW)

Metode SAW mengevaluasi tingkat preferensi tiap pupuk secara transparan:

### 1. Kriteria & Bobot Awal (Seluruhnya Kriteria Benefit)
Total penjumlahan bobot kriteria harus selalu bernilai tepat **1.00 (100%)**:

| Kode | Kriteria | Bobot ($w_j$) | Sifat | Deskripsi Pilihan Masukan |
|:---:|:---|:---:|:---:|:---|
| **C1** | **Kondisi Daun** | **0.35** | *Benefit* | Menguning merata / Menguning di tepi atau bercak / Pucat dan kerdil / Normal |
| **C2** | **Fase Bibit** | **0.25** | *Benefit* | Pre-nursery (1-3 bln) / Main nursery awal (4-7 bln) / Main nursery lanjut (8-12 bln) |
| **C3** | **pH Media** | **0.20** | *Benefit* | Asam ($< 5.0$) / Optimal ($5.5 - 6.5$) / Basa ($> 6.5$) |
| **C4** | **Kelembapan Media**| **0.20** | *Benefit* | Rendah (kering) / Optimal (kapasitas lapang) / Terlalu basah (jenuh air) |

### 2. Alternatif Pupuk

| Kode | Nama Pupuk | Golongan | Kandungan Utama | Karakteristik Agronomi |
|:---:|:---|:---|:---|:---|
| **A1** | **Urea** | Anorganik Tunggal | 46% Nitrogen (N) | Memacu vegetatif, sintesis klorofil cepat (bereaksi masam) |
| **A2** | **NPK Majemuk** | Anorganik Majemuk | 11-7-12 / 15-15-15 | Formula hara makro seimbang pembibitan sawit |
| **A3** | **SP-36** | Anorganik Tunggal | 36% Fosfat ($P_2O_5$) | Memacu perakaran primer & sekunder bibit |
| **A4** | **KCl** | Anorganik Tunggal | 60% Kalium ($K_2O$) | Memperkuat kutikula pelepah & regulasi air |
| **A5** | **POC** | Organik Hayati | Hara makro-mikro hayati | Aman untuk bulu akar muda, memperbaiki mikroba tanah |

### 3. Rumus Normalisasi & Perankingan
1. **Normalisasi Matriks (Benefit)**:
   $$r_{ij} = \frac{x_{ij}}{\max_k(x_{kj})}$$
2. **Nilai Preferensi / Skor Akhir**:
   $$V_i = \sum_{j=1}^{m} \left( w_j \times r_{ij} \right)$$
3. **Aturan Pilihan Setara (Tie-Breaking Rule)**:
   Jika selisih nilai peringkat 1 ($V_{(1)}$) dan peringkat 2 ($V_{(2)}$) $< 0.05$, keduanya disajikan sebagai **"Pilihan Setara"** lengkap dengan rekomendasi dosis kedua pupuk.

---

## 🎯 Panduan Skenario Pengujian untuk Sidang / Demo

Sistem menyediakan 6 tombol simulasi preset pada halaman [Input Rekomendasi](http://localhost:3000/rekomendasi/baru):

| No | Skenario Uji | Parameter Masukan | Hasil Sistem |
|:--:|:---|:---|:---|
| **1** | **Pre-Nursery Sehat** | Daun Normal, Pre-nursery, pH Optimal, Lengas Optimal | **LAYAK**, Peringkat 1: **POC** (Skor 1.000). Dosis rendah aman akar muda bibit. |
| **2** | **Defisiensi Nitrogen (N)** | Menguning Merata, Main Nursery Awal, pH Optimal, Lengas Optimal | **LAYAK**, Juara: **Urea (0.95)** & **NPK (0.93)**. Terdeteksi **Pilihan Setara** ($\Delta = 0.02$). |
| **3** | **NPK & SP-36 Bersaing** | Pucat Kerdil, Main Nursery Awal, pH Asam, Lengas Optimal | **LAYAK**, Peringkat 1: **NPK (0.85)**, Peringkat 2: **SP-36 (0.83)**. Terdeteksi **Pilihan Setara** ($\Delta = 0.02$). Dosis diturunkan ke batas bawah karena pH asam. |
| **4** | **Defisiensi Kalium (K)** | Menguning di Tepi, Main Nursery Lanjut, pH Optimal, Lengas Optimal | **LAYAK**, Peringkat 1: **KCl** (Skor 1.000). Takaran standar lanjut penguat pelepah. |
| **5** | **Uji Rule Waktu: Hujan Lebat** | Daun Normal, Main Nursery Awal, pH Optimal, **Terlalu Basah** | **TUNDA PEMUPUKAN** (Banner Merah). Perhitungan SAW tidak dijalankan, ranking disembunyikan. |
| **6** | **Uji Rule Waktu: Tanah Kering** | Menguning Merata, Main Nursery Awal, pH Optimal, **Rendah** | **SIRAM DAHULU** (Banner Kuning). SAW tetap menghitung rekomendasi setelah penyiraman air bersih. |

---

## 📚 Daftar Pustaka

1. **Kasno, A., & Anggria, L. (2016)**. *Peningkatan Pertumbuhan Kelapa Sawit di Pembibitan dengan Pemupukan NPK*. Jurnal Littri, 22(3), 107-114.
2. **Siregar, S. W., Wijaya, D. P., Danianti, D., & Pramuntadi, A. (2025)**. *Sistem Pendukung Keputusan dalam Menentukan Kualitas Bibit Kelapa Sawit Menggunakan Metode SAW*. JRAMI, 6(3), 704-713.
3. **As-Siddiqi, M. H., Auliasari, K., & Prasetya, R. P. (2022)**. *Pembangunan Sistem Rekomendasi Jenis Pupuk pada Tanaman Sawit Menggunakan Metode AHP*. JATI, 6(2), 957-964.
4. **Ayu, F., & Mustofa, A. (2021)**. *Perancangan Aplikasi Penentuan Dosis Pemupukan Kelapa Sawit Menggunakan Metode SAW Berbasis Android*. ITJRD, 5(2), 147-157.
5. **Sitohang, H., Himmah, E. F., & Zulkarnain, D. (2026)**. *Sistem Pendukung Keputusan Penentuan Pupuk pada Tanaman Kelapa Sawit Menggunakan Metode Simple Additive Weighting (SAW) Berbasis Web*. JUSIBI, 8(1), 22-30.
