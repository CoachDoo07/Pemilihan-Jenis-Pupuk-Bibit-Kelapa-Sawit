const express = require('express');
const path = require('path');
const session = require('express-session');

const { setLocals, verifyCsrf } = require('./middleware/authMiddleware');
const routes = require('./routes');

const app = express();

// Konfigurasi Session Secret (Point 11)
const sessionSecret = process.env.SESSION_SECRET || 'spk-sawit-saw-dev-secret-key-2026';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('PERINGATAN: Menggunakan default SESSION_SECRET. Tetapkan variabel lingkungan SESSION_SECRET di production!');
}

// Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware Parsing Body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware Session dengan cookie httpOnly dan sameSite: 'lax' (Point 11)
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // ubah true jika HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 hari
  }
}));

// Inisialisasi Locals & Token CSRF (Point 10)
app.use(setLocals);

// Verifikasi CSRF pada method POST/PUT/DELETE (Point 10)
app.use(verifyCsrf);

// Registrasi Seluruh Routes
app.use('/', routes);

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('dashboard', {
    title: 'Halaman Tidak Ditemukan',
    totalRecs: 0,
    topFert: '-',
    topFertCount: 0,
    timingStats: { LAYAK: 0, SIRAM_DAHULU: 0, TUNDA: 0 },
    fertDistribution: [],
    phaseDistribution: [],
    recentRecs: [],
    criteria: []
  });
});

module.exports = app;
