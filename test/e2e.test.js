const http = require('http');
const app = require('../src/app');

const PORT = 3001; // Use separate port for e2e test to prevent collision

let sessionCookie = '';
let csrfToken = '';

const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}...`);

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const headers = { ...(options.headers || {}) };
      if (sessionCookie) {
        headers['Cookie'] = sessionCookie;
      }

      const req = http.request(`http://127.0.0.1:${PORT}${path}`, { ...options, headers }, (res) => {
        let data = '';
        if (res.headers['set-cookie']) {
          sessionCookie = res.headers['set-cookie'][0].split(';')[0];
        }
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      });
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  try {
    // 1. Test GET / (Dashboard)
    console.log('Testing GET / ...');
    const resHome = await request('/');
    console.log('GET / Status:', resHome.statusCode);
    if (resHome.statusCode !== 200 || !resHome.body.includes('SPK Pupuk Sawit')) {
      throw new Error(`GET / failed with status ${resHome.statusCode}`);
    }
    console.log('✓ GET / (Dashboard) OK');

    // 2. Test GET /rekomendasi/baru (Form)
    console.log('Testing GET /rekomendasi/baru ...');
    const resForm = await request('/rekomendasi/baru');
    console.log('GET /rekomendasi/baru Status:', resForm.statusCode);
    if (resForm.statusCode !== 200 || !resForm.body.includes('Form Analisis Kondisi Bibit')) {
      throw new Error(`GET /rekomendasi/baru failed with status ${resForm.statusCode}`);
    }
    // Extract CSRF token from form
    const csrfMatch = resForm.body.match(/name="_csrf"\s+value="([a-f0-9]+)"/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
    }
    console.log('✓ GET /rekomendasi/baru (Form) OK (CSRF token diperoleh)');

    // 3. Test POST /rekomendasi/hitung (Perhitungan SAW)
    console.log('Testing POST /rekomendasi/hitung ...');
    const postData = new URLSearchParams({
      _csrf: csrfToken,
      batch_code: 'TEST-E2E-01',
      variety: 'DxP Socfindo',
      leaf_condition: 'menguning_merata',
      growth_phase: 'main_nursery_awal',
      media_ph: 'optimal',
      media_moisture: 'optimal'
    }).toString();

    const resCalc = await request('/rekomendasi/hitung', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    });

    console.log('POST /rekomendasi/hitung Status:', resCalc.statusCode);
    if (resCalc.statusCode !== 302 || !resCalc.headers.location) {
      throw new Error(`POST /rekomendasi/hitung failed with status ${resCalc.statusCode}`);
    }
    console.log('✓ POST /rekomendasi/hitung redirected to:', resCalc.headers.location);

    // 4. Test GET Hasil Rekomendasi
    console.log(`Testing GET ${resCalc.headers.location} ...`);
    const resResult = await request(resCalc.headers.location);
    console.log('GET Hasil Status:', resResult.statusCode);
    if (resResult.statusCode !== 200 || !resResult.body.includes('Transparansi Tahapan Perhitungan Metode SAW')) {
      throw new Error(`GET Hasil failed with status ${resResult.statusCode}`);
    }
    console.log('✓ GET Hasil (Transparansi SAW & Dosis) OK');

    // 5. Test POST dengan Kelembapan Terlalu Basah (Uji Aturan Tunda)
    console.log('Testing POST /rekomendasi/hitung (Aturan Tunda) ...');
    const postDataTunda = new URLSearchParams({
      _csrf: csrfToken,
      batch_code: 'TEST-TUNDA-02',
      variety: 'DxP Marihat',
      leaf_condition: 'normal',
      growth_phase: 'main_nursery_awal',
      media_ph: 'optimal',
      media_moisture: 'terlalu_basah'
    }).toString();

    const resCalcTunda = await request('/rekomendasi/hitung', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postDataTunda)
      },
      body: postDataTunda
    });
    console.log('POST Tunda Status:', resCalcTunda.statusCode);
    const resResultTunda = await request(resCalcTunda.headers.location);
    if (!resResultTunda.body.includes('TUNDA Pemupukan')) {
      throw new Error('Hasil uji tunda tidak menampilkan badge TUNDA Pemupukan');
    }
    console.log('✓ Uji Rule Kelayakan Waktu (TUNDA Pemupukan) OK');

    // 6. Test GET /riwayat
    console.log('Testing GET /riwayat ...');
    const resHistory = await request('/riwayat');
    console.log('GET /riwayat Status:', resHistory.statusCode);
    if (resHistory.statusCode !== 200 || !resHistory.body.includes('Riwayat Analisis Rekomendasi')) {
      throw new Error(`GET /riwayat failed with status ${resHistory.statusCode}`);
    }
    console.log('✓ GET /riwayat (Tabel Riwayat) OK');

    // 7. Test GET /riwayat/export/csv
    console.log('Testing GET /riwayat/export/csv ...');
    const resCsv = await request('/riwayat/export/csv');
    console.log('GET /riwayat/export/csv Status:', resCsv.statusCode);
    if (resCsv.statusCode !== 200 || !resCsv.headers['content-type'].includes('text/csv')) {
      throw new Error(`GET CSV export failed with status ${resCsv.statusCode}`);
    }
    console.log('✓ GET /riwayat/export/csv OK');

    // 8. Test GET /pengaturan
    console.log('Testing GET /pengaturan ...');
    const resSettings = await request('/pengaturan');
    console.log('GET /pengaturan Status:', resSettings.statusCode);
    if (resSettings.statusCode !== 200 || !resSettings.body.includes('Pengaturan Bobot & Tabel Kecocokan')) {
      throw new Error(`GET /pengaturan failed with status ${resSettings.statusCode}`);
    }
    console.log('✓ GET /pengaturan (Bobot & Matriks) OK');

    // 9. Test GET /login
    console.log('Testing GET /login ...');
    const resLogin = await request('/login');
    console.log('GET /login Status:', resLogin.statusCode);
    if (resLogin.statusCode !== 200 || !resLogin.body.includes('Login Petugas Nursery')) {
      throw new Error(`GET /login failed with status ${resLogin.statusCode}`);
    }
    console.log('✓ GET /login OK');

    console.log('\n============================================================');
    console.log('🎉 SEMUA 9 PENGUJIAN END-TO-END BERHASIL 100% TANPA KENDALA!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Error during e2e tests:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('Test server closed.');
      process.exit(process.exitCode || 0);
    });
  }
});
