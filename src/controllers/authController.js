const crypto = require('crypto');
const db = require('../config/database');
const { verifyPassword, hashPassword } = require('../utils/authUtil');

class AuthController {
  static getLogin(req, res) {
    if (req.session && req.session.user) {
      return res.redirect('/pengaturan');
    }
    res.render('auth/login', {
      title: 'Login Petugas Nursery / Admin'
    });
  }

  static postLogin(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      req.session.flash = {
        type: 'error',
        message: 'Username dan password wajib diisi!'
      };
      return res.redirect('/login');
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

    if (user && verifyPassword(password, user.password)) {
      // Auto-migrasi ke hash jika sebelumnya masih format plaintext (Point 11)
      if (!user.password.includes(':')) {
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);
      }

      // Session regeneration saat login untuk mencegah session fixation (Point 11)
      const flashMsg = `Selamat datang kembali, ${user.name}!`;
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regenerate error:', err);
        }
        req.session.user = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        };
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        req.session.flash = {
          type: 'success',
          message: flashMsg
        };
        return res.redirect('/pengaturan');
      });
    } else {
      req.session.flash = {
        type: 'error',
        message: 'Username atau password salah! (Demo: admin / admin123)'
      };
      return res.redirect('/login');
    }
  }

  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  }
}

module.exports = AuthController;
