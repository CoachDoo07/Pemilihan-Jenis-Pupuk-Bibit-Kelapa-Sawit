require('./src/config/database');
const { seedDatabase } = require('./src/config/seed');

// Jalankan seeder awal hanya jika tabel kosong (Point 1)
seedDatabase();

const app = require('./src/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` SPK PEMILIHAN JENIS PUPUK BIBIT KELAPA SAWIT (METODE SAW)`);
  console.log(` Anggota Kelompok:`);
  console.log(` 1. Rafael Rizky Luga Tanjung (3125522007)`);
  console.log(` 2. Aldo Rachmat Hidayat      (3125522003)`);
  console.log(`================================================================`);
  console.log(` Server aktif dan siap digunakan pada:`);
  console.log(` 👉 http://localhost:${PORT}`);
  console.log(` Akun demo admin: admin / admin123`);
  console.log(`================================================================`);
});
