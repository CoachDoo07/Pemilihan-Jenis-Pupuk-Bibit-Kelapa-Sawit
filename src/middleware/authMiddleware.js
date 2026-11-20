const crypto = require('crypto');

/**
 * Middleware untuk otentikasi admin, proteksi CSRF, dan variabel global view
 */

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.session.flash = {
    type: 'error',
    message: 'Silakan login sebagai Petugas/Admin terlebih dahulu untuk mengakses fitur ini.'
  };
  return res.redirect('/login');
}

/**
 * Helper untuk mencegah Stored XSS pada JSON yang disisipkan di dalam tag <script> (Point 8)
 */
function safeJson(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Middleware inisialisasi locals, session info, dan token CSRF (Point 8 & 10)
 */
function setLocals(req, res, next) {
  // Pastikan session CSRF token ada
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  res.locals.safeJson = safeJson;
  res.locals.user = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  
  // Flash message handling
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  } else {
    res.locals.flash = null;
  }

  // Info Akademik Kelompok
  res.locals.appInfo = {
    title: 'SPK Pupuk Bibit Sawit (SAW)',
    version: '1.0.0',
    authors: [
      { name: 'Rafael Rizky Luga Tanjung', nrp: '3125522007' },
      { name: 'Aldo Rachmat Hidayat', nrp: '3125522003' }
    ],
    course: 'Sistem Pendukung Keputusan (SPK)',
    year: '2026'
  };

  next();
}

/**
 * Middleware verifikasi CSRF untuk request manipulasi (POST/PUT/DELETE) (Point 10)
 */
function verifyCsrf(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.body?._csrf || req.headers['x-csrf-token'];
    if (!token || !req.session?.csrfToken || token !== req.session.csrfToken) {
      return res.status(403).send('Akses Ditolak: Token CSRF tidak valid atau telah kedaluwarsa. Silakan muat ulang (refresh) halaman.');
    }
  }
  next();
}

module.exports = {
  requireAdmin,
  setLocals,
  verifyCsrf,
  safeJson
};
