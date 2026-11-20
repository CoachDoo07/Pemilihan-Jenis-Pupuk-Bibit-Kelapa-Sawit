const crypto = require('crypto');

/**
 * Utilitas keamanan autentikasi password menggunakan crypto.scrypt
 */

/**
 * Membuat hash password dengan random salt (format salt:key dalam hex)
 * @param {string} password 
 * @returns {string} salt:hashHex
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifikasi password terhadap hash tersimpan dengan timingSafeEqual
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Jika format salt:key
  if (storedHash.includes(':')) {
    const [salt, keyHex] = storedHash.split(':');
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedKey);
  }

  // Fallback transparan jika masih plaintext (untuk keperluan auto-migrasi)
  return password === storedHash;
}

module.exports = {
  hashPassword,
  verifyPassword
};
