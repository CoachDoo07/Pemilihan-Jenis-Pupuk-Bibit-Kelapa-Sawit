/**
 * Script untuk simulasi otomatis form rekomendasi pupuk
 */

const presets = {
  scenario1: {
    batch_code: 'SIM-PRE-001',
    variety: 'DxP Marihat',
    leaf_condition: 'normal',
    growth_phase: 'pre_nursery',
    media_ph: 'optimal',
    media_moisture: 'optimal',
    label: 'Pre-Nursery Daun Normal (Pemeliharaan Akar Muda - Target POC)'
  },
  scenario2: {
    batch_code: 'SIM-DEF-N02',
    variety: 'DxP Socfindo',
    leaf_condition: 'menguning_merata',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'optimal',
    label: 'Main Nursery Awal Menguning Merata (Defisiensi N - Target Urea/NPK)'
  },
  scenario3: {
    batch_code: 'SIM-DEF-P03',
    variety: 'DxP Topaz',
    leaf_condition: 'pucat_kerdil',
    growth_phase: 'main_nursery_awal',
    media_ph: 'asam',
    media_moisture: 'optimal',
    label: 'Main Nursery Pucat Kerdil Tanah Masam (Defisiensi P - NPK & SP-36 bersaing (pilihan setara))'
  },
  scenario4: {
    batch_code: 'SIM-DEF-K04',
    variety: 'DxP Dami Mas',
    leaf_condition: 'menguning_tepi',
    growth_phase: 'main_nursery_lanjut',
    media_ph: 'optimal',
    media_moisture: 'optimal',
    label: 'Main Nursery Lanjut Tepi Menguning (Defisiensi K - Target KCl)'
  },
  scenario5: {
    batch_code: 'SIM-WET-005',
    variety: 'DxP Yangambi',
    leaf_condition: 'normal',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'terlalu_basah',
    label: 'Media Terlalu Basah Pasca Hujan (Uji Aturan Tunda Pemupukan)'
  },
  scenario6: {
    batch_code: 'SIM-DRY-006',
    variety: 'DxP Socfindo',
    leaf_condition: 'menguning_merata',
    growth_phase: 'main_nursery_awal',
    media_ph: 'optimal',
    media_moisture: 'rendah',
    label: 'Media Kering di Bawah Kapasitas Lapang (Uji Aturan Siram Dahulu)'
  }
};

function fillPreset(key) {
  const data = presets[key];
  if (!data) return;

  document.getElementById('batch_code').value = data.batch_code + '-' + Math.floor(100 + Math.random() * 900);
  document.getElementById('variety').value = data.variety;
  
  // Radio or select
  setFieldValue('leaf_condition', data.leaf_condition);
  setFieldValue('growth_phase', data.growth_phase);
  setFieldValue('media_ph', data.media_ph);
  setFieldValue('media_moisture', data.media_moisture);

  // Trigger feedback banner
  updateMoistureWarning();

  // Scroll smoothly to form
  document.getElementById('recommendation-form').scrollIntoView({ behavior: 'smooth' });
}

function randomizeSimulation() {
  const keys = Object.keys(presets);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  fillPreset(randomKey);
}

function setFieldValue(name, value) {
  const elem = document.querySelector(`[name="${name}"][value="${value}"]`);
  if (elem) {
    elem.checked = true;
    // Highlight parent card if exists
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
      const card = input.closest('.option-card');
      if (card) {
        if (input.checked) {
          card.classList.add('border-palm-500', 'bg-palm-50/60', 'ring-2', 'ring-palm-400');
          card.classList.remove('border-slate-200');
        } else {
          card.classList.remove('border-palm-500', 'bg-palm-50/60', 'ring-2', 'ring-palm-400');
          card.classList.add('border-slate-200');
        }
      }
    });
  }
}

function updateMoistureWarning() {
  const moistureInput = document.querySelector('input[name="media_moisture"]:checked');
  const banner = document.getElementById('moisture-feedback-banner');
  const bannerText = document.getElementById('moisture-feedback-text');
  const bannerIcon = document.getElementById('moisture-feedback-icon');

  if (!moistureInput || !banner) return;

  const val = moistureInput.value;
  if (val === 'terlalu_basah') {
    banner.className = 'mt-4 p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 block transition';
    bannerIcon.className = 'fas fa-exclamation-triangle text-red-600 text-xl mr-3';
    bannerText.innerHTML = '<strong>Aturan Evaluasi Waktu:</strong> Media tanam terlalu basah / jenuh air. Sistem akan mengeluarkan hasil <strong>TUNDA PEMUPUKAN</strong> untuk mencegah hilangnya pupuk akibat pencucian (leaching) dan risiko busuk akar.';
  } else if (val === 'rendah') {
    banner.className = 'mt-4 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 block transition';
    bannerIcon.className = 'fas fa-tint text-amber-600 text-xl mr-3';
    bannerText.innerHTML = '<strong>Aturan Evaluasi Waktu:</strong> Media tanam kering. Sistem akan menyarankan <strong>SIRAM DAHULU</strong> hingga kapasitas lapang sebelum memupuk agar perakaran tidak mengalami plasmolisis.';
  } else {
    banner.className = 'mt-4 p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 block transition';
    bannerIcon.className = 'fas fa-check-circle text-emerald-600 text-xl mr-3';
    bannerText.innerHTML = '<strong>Status Kelembapan Ideal:</strong> Media tanam berada pada kapasitas lapang optimal untuk melarutkan pupuk dan penyerapan hara maksimal.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Listen for moisture changes
  document.querySelectorAll('input[name="media_moisture"]').forEach(r => {
    r.addEventListener('change', updateMoistureWarning);
  });

  // Listen for option card clicks
  document.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      setFieldValue(radio.name, radio.value);
    });
  });

  updateMoistureWarning();
});
