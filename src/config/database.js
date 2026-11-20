const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'spk_sawit.db');

if (dbPath !== ':memory:') {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const db = new Database(dbPath);

// Enable WAL mode for file-based DB for performance and concurrent reads
if (dbPath !== ':memory:') {
  db.pragma('journal_mode = WAL');
}

/**
 * Inisialisasi tabel-tabel utama
 */
function initDatabase() {
  db.exec(`
    -- Tabel Pengguna / Admin
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabel Kriteria SAW
    CREATE TABLE IF NOT EXISTS criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'benefit',
      description TEXT
    );

    -- Tabel Alternatif Pupuk
    CREATE TABLE IF NOT EXISTS fertilizers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      nutrient_content TEXT NOT NULL,
      description TEXT
    );

    -- Tabel Nilai Kecocokan (Rating Kecocokan 1 - 5)
    CREATE TABLE IF NOT EXISTS suitability_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      criteria_code TEXT NOT NULL,
      subcriteria_code TEXT NOT NULL,
      subcriteria_name TEXT NOT NULL,
      fertilizer_code TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      rationale TEXT,
      UNIQUE(criteria_code, subcriteria_code, fertilizer_code)
    );

    -- Tabel Riwayat Rekomendasi
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_code TEXT NOT NULL,
      variety TEXT DEFAULT 'DxP Unggul',
      leaf_condition TEXT NOT NULL,
      growth_phase TEXT NOT NULL,
      media_ph TEXT NOT NULL,
      media_moisture TEXT NOT NULL,
      timing_status TEXT NOT NULL,
      timing_title TEXT NOT NULL,
      timing_note TEXT NOT NULL,
      top_fertilizer_code TEXT,
      top_fertilizer_name TEXT,
      top_score REAL,
      is_equivalent INTEGER DEFAULT 0,
      second_fertilizer_code TEXT,
      second_fertilizer_name TEXT,
      second_score REAL,
      dosage_level TEXT,
      dosage_amount TEXT,
      application_method TEXT,
      agronomic_notes TEXT,
      calculation_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDatabase();

module.exports = db;
