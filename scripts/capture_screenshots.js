const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const db = require('../src/config/database');
const SawService = require('../src/services/sawService');
const DosageService = require('../src/services/dosageService');
const { hashPassword } = require('../src/utils/authUtil');

const ARTIFACT_DIR = 'C:\\Users\\HYPE AMD\\.gemini\\antigravity\\brain\\f122ee3f-e910-4cad-a7e9-5734c350dcf2';
const PROJECT_SS_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(PROJECT_SS_DIR)) {
  fs.mkdirSync(PROJECT_SS_DIR, { recursive: true });
}

// 1. Reset dan populate 6 skenario demo standar
console.log('Menyiapkan data skenario demo di basis data...');
db.prepare('DELETE FROM recommendations').run();

const demoScenarios = [
  {
    batch_code: 'BS-2026-001',
    variety: 'DxP Yangambi 1',
    leaf_condition: 'menguning_merata',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'optimal'
  },
  {
    batch_code: 'BS-2026-002',
    variety: 'DxP Marihat B2',
    leaf_condition: 'normal',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'terlalu_basah'
  },
  {
    batch_code: 'BS-2026-003',
    variety: 'DxP Socfindo A3',
    leaf_condition: 'menguning_merata',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'rendah'
  },
  {
    batch_code: 'BS-2026-004',
    variety: 'DxP Dami Mas C1',
    leaf_condition: 'pucat_kerdil',
    growth_phase: 'main_nursery_awal',
    media_ph: 'asam',
    media_moisture: 'optimal'
  },
  {
    batch_code: 'BS-2026-005',
    variety: 'DxP PPKS 540',
    leaf_condition: 'normal',
    growth_phase: 'pre_nursery',
    media_ph: 'optimal',
    media_moisture: 'optimal'
  },
  {
    batch_code: 'BS-2026-006',
    variety: 'DxP Avros L2',
    leaf_condition: 'menguning_tepi',
    growth_phase: 'main_nursery_lanjut',
    media_ph: 'optimal',
    media_moisture: 'optimal'
  }
];

const insertStmt = db.prepare(`
  INSERT INTO recommendations (
    batch_code, variety, leaf_condition, growth_phase, media_ph, media_moisture,
    timing_status, timing_title, timing_note,
    top_fertilizer_code, top_fertilizer_name, top_score, is_equivalent,
    second_fertilizer_code, second_fertilizer_name, second_score,
    dosage_level, dosage_amount, application_method, agronomic_notes,
    calculation_json
  ) VALUES (
    @batch_code, @variety, @leaf_condition, @growth_phase, @media_ph, @media_moisture,
    @timing_status, @timing_title, @timing_note,
    @top_fertilizer_code, @top_fertilizer_name, @top_score, @is_equivalent,
    @second_fertilizer_code, @second_fertilizer_name, @second_score,
    @dosage_level, @dosage_amount, @application_method, @agronomic_notes,
    @calculation_json
  )
`);

const insertedIds = [];

for (const sc of demoScenarios) {
  const timing = DosageService.checkTimingSuitability(sc.media_moisture);
  let sawResult = null;
  let topRank = null;
  let secondRank = null;
  let dosage = null;
  let dosageSecond = null;

  if (timing.allowRanking) {
    sawResult = SawService.calculate({
      leafCondition: sc.leaf_condition,
      growthPhase: sc.growth_phase,
      mediaPh: sc.media_ph,
      mediaMoisture: sc.media_moisture
    });

    topRank = sawResult.ranking[0];
    secondRank = sawResult.ranking[1] || null;

    dosage = DosageService.determineDosage({
      fertilizerCode: topRank.fertilizerCode,
      fertilizerName: topRank.fertilizerName,
      growthPhase: sc.growth_phase,
      mediaPh: sc.media_ph,
      leafCondition: sc.leaf_condition
    });

    if (sawResult.isEquivalent && secondRank) {
      dosageSecond = DosageService.determineDosage({
        fertilizerCode: secondRank.fertilizerCode,
        fertilizerName: secondRank.fertilizerName,
        growthPhase: sc.growth_phase,
        mediaPh: sc.media_ph,
        leafCondition: sc.leaf_condition
      });
    }
  }

  const calcJson = JSON.stringify({
    timing,
    saw: sawResult,
    dosage,
    dosageSecond
  });

  const res = insertStmt.run({
    batch_code: sc.batch_code,
    variety: sc.variety,
    leaf_condition: sc.leaf_condition,
    growth_phase: sc.growth_phase,
    media_ph: sc.media_ph,
    media_moisture: sc.media_moisture,
    timing_status: timing.status,
    timing_title: timing.title,
    timing_note: timing.actionGuidance,
    top_fertilizer_code: topRank ? topRank.fertilizerCode : null,
    top_fertilizer_name: topRank ? topRank.fertilizerName : 'Tidak ditentukan (Pemupukan Ditunda)',
    top_score: topRank ? topRank.score : null,
    is_equivalent: sawResult && sawResult.isEquivalent ? 1 : 0,
    second_fertilizer_code: secondRank ? secondRank.fertilizerCode : null,
    second_fertilizer_name: secondRank ? secondRank.fertilizerName : null,
    second_score: secondRank ? secondRank.score : null,
    dosage_level: dosage ? dosage.level : null,
    dosage_amount: dosage ? dosage.amount : null,
    application_method: dosage ? dosage.method : null,
    agronomic_notes: dosage ? dosage.agronomicNotes : timing.actionGuidance,
    calculation_json: calcJson
  });

  insertedIds.push(res.lastInsertRowid);
  console.log(`  ✓ Tersimpan: ID ${res.lastInsertRowid} (${sc.batch_code} - ${timing.status})`);
}

// 2. Start Express app
const app = require('../src/app');
const PORT = 3000;

const server = app.listen(PORT, async () => {
  console.log(`\nExpress app running on http://127.0.0.1:${PORT}`);

  // Simulasikan login admin untuk mendapatkan cookie session
  let adminCookie = '';
  await new Promise(resolve => {
    // 1. Dapatkan CSRF token dari GET /login
    const req1 = http.request(`http://127.0.0.1:${PORT}/login`, res1 => {
      let body = '';
      const setCookie = res1.headers['set-cookie'] ? res1.headers['set-cookie'][0].split(';')[0] : '';
      res1.on('data', c => body += c);
      res1.on('end', () => {
        const csrfMatch = body.match(/name="_csrf"\s+value="([a-f0-9]+)"/);
        const csrfToken = csrfMatch ? csrfMatch[1] : '';

        // 2. POST /login dengan username admin dan password admin123
        const postData = new URLSearchParams({
          _csrf: csrfToken,
          username: 'admin',
          password: 'admin123'
        }).toString();

        const req2 = http.request(`http://127.0.0.1:${PORT}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': setCookie
          }
        }, res2 => {
          if (res2.headers['set-cookie']) {
            adminCookie = res2.headers['set-cookie'][0].split(';')[0];
          } else {
            adminCookie = setCookie;
          }
          console.log('✓ Admin login berhasil untuk capture halaman pengaturan (Cookie:', adminCookie.split('=')[0], ')');
          resolve();
        });
        req2.write(postData);
        req2.end();
      });
    });
    req1.end();
  });

  // 3. Start Headless Chrome dengan CDP
  console.log('\nMemulai Headless Chrome dengan remote debugging port 9222...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1400,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // Helper untuk membuka tab dan mengambil screenshot via CDP
  async function captureCDP(url, filename, options = {}) {
    console.log(`\nMenangkap screenshot: ${filename} dari ${url}...`);

    // 1. Buat target tab baru menggunakan PUT /json/new
    const targetInfo = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 9222,
        path: `/json/new?${encodeURIComponent(url)}`,
        method: 'PUT'
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    const wsUrl = targetInfo.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const payload = JSON.stringify({ id, method, params });
        function handler(event) {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        }
        ws.addEventListener('message', handler);
        ws.send(payload);
      });
    }

    await new Promise(resolve => ws.addEventListener('open', resolve));

    // Enable Network & Page
    await sendCommand('Network.enable');
    await sendCommand('Page.enable');

    // Set cookie jika halaman membutuhkan admin
    if (options.cookie) {
      const parts = options.cookie.split('=');
      await sendCommand('Network.setCookie', {
        name: parts[0],
        value: parts[1],
        domain: '127.0.0.1',
        path: '/'
      });
    }

    // Set viewport
    const width = options.width || 1400;
    const height = options.height || 900;
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1.5, // 1.5x retina-like high-dpi
      mobile: false
    });

    // Navigate
    await sendCommand('Page.navigate', { url });

    // Tunggu event load dan delay untuk rendering CSS / Chart.js
    await new Promise(r => setTimeout(r, options.delay || 1500));

    // Capture screenshot
    const shot = await sendCommand('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: options.fullPage || false
    });

    const buffer = Buffer.from(shot.data, 'base64');

    // Simpan ke direktori proyek
    const projectPath = path.join(PROJECT_SS_DIR, filename);
    fs.writeFileSync(projectPath, buffer);

    // Simpan ke direktori artifacts agar bisa langsung di-embed dan dilihat
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(artifactPath, buffer);

    console.log(`  ✓ Tersimpan di: ${projectPath} (${buffer.length} bytes)`);
    console.log(`  ✓ Tersimpan di artifact: ${artifactPath}`);

    // Tutup tab target
    await sendCommand('Page.close');
    ws.close();

    // Hapus target di chrome
    await new Promise(resolve => {
      http.get(`http://127.0.0.1:9222/json/close/${targetInfo.id}`, () => resolve());
    });
  }

  try {
    // A. [SCREENSHOT: dashboard]
    await captureCDP(
      `http://127.0.0.1:${PORT}/`,
      '01_dashboard.png',
      { delay: 2000, width: 1400, height: 950 }
    );

    // B. [SCREENSHOT: halaman riwayat dan pengaturan]
    // 1. Halaman Riwayat
    await captureCDP(
      `http://127.0.0.1:${PORT}/riwayat`,
      '02_halaman_riwayat.png',
      { delay: 1500, width: 1400, height: 900, cookie: adminCookie }
    );

    // 2. Halaman Pengaturan (Admin)
    await captureCDP(
      `http://127.0.0.1:${PORT}/pengaturan`,
      '03_halaman_pengaturan.png',
      { delay: 1500, width: 1400, height: 1000, cookie: adminCookie }
    );

    // C. [SCREENSHOT: halaman hasil + tabel SAW]
    // Skenario 1 — Pilihan Setara: Daun menguning merata, main nursery awal -> Urea 0.95 vs NPK 0.93
    await captureCDP(
      `http://127.0.0.1:${PORT}/rekomendasi/hasil/${insertedIds[0]}`,
      '04_hasil_pilihan_setara_saw.png',
      { delay: 1500, width: 1400, height: 1200, fullPage: true }
    );

    // D. [SCREENSHOT: hasil TUNDA]
    // Skenario 2 — Status TUNDA: Kelembapan terlalu basah -> pemupukan ditunda tanpa ranking SAW
    await captureCDP(
      `http://127.0.0.1:${PORT}/rekomendasi/hasil/${insertedIds[1]}`,
      '05_hasil_tunda.png',
      { delay: 1500, width: 1400, height: 900 }
    );

    // E. [SCREENSHOT: hasil siram dahulu]
    // Skenario 3 — SIRAM DAHULU: Kelembapan rendah -> anjuran menyiram media lebih dulu sebelum pupuk
    await captureCDP(
      `http://127.0.0.1:${PORT}/rekomendasi/hasil/${insertedIds[2]}`,
      '06_hasil_siram_dahulu.png',
      { delay: 1500, width: 1400, height: 950 }
    );

    // F. [SCREENSHOT: hasil pH asam]
    // Skenario 4 — Kondisi pH Asam: Dosis diturunkan satu tingkat disertai anjuran pemberian dolomit
    await captureCDP(
      `http://127.0.0.1:${PORT}/rekomendasi/hasil/${insertedIds[3]}`,
      '07_hasil_ph_asam.png',
      { delay: 1500, width: 1400, height: 1050 }
    );

    console.log('\n============================================================');
    console.log('🎉 SELURUH 7 SCREENSHOT BERHASIL DITANGKAP DAN DISIMPAN!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Gagal saat menangkap screenshot:', err);
  } finally {
    chrome.kill();
    server.close(() => {
      console.log('Server ditutup.');
      process.exit(0);
    });
  }
});
