// DEMO_DEFAULTS: farmer.latest_score yoxdursa POST /api/score üçün istifadə olunur.
// land_size_ha və cooperative_member farmer məlumatından dinamik alınır.
const DEMO_SCORE_DEFAULTS = {
  farming_history_years: 10,
  tarsim_history_score: 0.6,
  fertilizer_purchases: 8,
  climate_risk_score: 0.3,
  region_profitability_index: 1.0,
};

const session = {
  state: 'IDLE',
  phone: '',
  farmer: null,
  contracts: [],
  selectedContract: null,
  pinBuffer: '',
  dialBuffer: '',
  contractsMode: 'view', // 'view' | 'confirm'
};

function resetSession() {
  session.state = 'IDLE';
  session.farmer = null;
  session.contracts = [];
  session.selectedContract = null;
  session.pinBuffer = '';
  session.contractsMode = 'view';
}

// ── UI referanslar ──────────────────────────────────────────────
const screenEl    = document.getElementById('screen-text');
const dialBarEl   = document.getElementById('dial-bar');
const indicatorEl = document.getElementById('screen-indicator');

function setScreen(text, loading = false) {
  screenEl.textContent = text;
  screenEl.className = 'screen-text' + (loading ? ' loading' : '');
  indicatorEl.className = 'screen-indicator' + (session.state === 'IDLE' ? ' off' : '');
}

function updateDialBar() {
  dialBarEl.textContent = session.dialBuffer || ' ';
}

// ── API köməkçiləri ──────────────────────────────────────────────
async function apiFetch(path, options) {
  const res = await fetch(BACKEND_URL + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'Hata'), { status: res.status, body });
  return body;
}

// ── Axın funksiyaları ───────────────────────────────────────────
async function startSession(simPhone) {
  session.phone = simPhone;
  setScreen('Sorgu gönderiliyor...', true);
  try {
    const farmer = await apiFetch(`/api/farmers?phone=${encodeURIComponent(simPhone)}`);
    session.farmer = farmer;
    showMainMenu();
  } catch (err) {
    if (err.status === 404) {
      showError('Bu numara kayıtlı değil.');
      session.farmer = null;
    } else {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
    session.state = 'ERROR_IDLE';
  }
}

function showMainMenu() {
  session.state = 'MAIN_MENU';
  setScreen(
    'AgriKöprü\n' +
    '─────────────\n' +
    '1: Kredi skorum\n' +
    '2: Sözleşme teklifleri\n' +
    '3: Sözleşmeyi onayla\n' +
    '─────────────\n' +
    '0: Çıkış'
  );
}

async function fetchScore() {
  session.state = 'SCORE_FETCH';
  if (session.farmer.latest_score) {
    showScore(session.farmer.latest_score);
    return;
  }
  setScreen('Skor hesaplanıyor...', true);
  try {
    const parcels = []; // V1: parsel sorğusu yoxdur, DEMO_DEFAULTS istifadə edilir
    const inputs = {
      farmer_id: session.farmer.id,
      land_size_ha: 10.0,             // DEMO_DEFAULT
      cooperative_member: session.farmer.cooperative_member,
      ...DEMO_SCORE_DEFAULTS,
    };
    const result = await apiFetch('/api/score', { method: 'POST', body: JSON.stringify(inputs) });
    session.farmer.latest_score = result;
    showScore(result);
  } catch {
    showError('Skor alınamadı.');
  }
}

function showScore(s) {
  session.state = 'SCORE_SHOW';
  const limit = s.credit_limit_tl
    ? Number(s.credit_limit_tl).toLocaleString('tr-TR') + ' TL'
    : 'Bilgi yok';
  const band = { LOW: 'DÜŞÜK', MEDIUM: 'ORTA', HIGH: 'YÜKSEK' }[s.risk_band] || s.risk_band;
  setScreen(
    `Kredi Skoru: ${s.score}/1000\n` +
    `Risk: ${band}\n` +
    `Limit: ${limit}\n` +
    `─────────────\n` +
    `[${s.model_version}]\n` +
    `\n0: Geri`
  );
}

async function fetchContracts(mode) {
  session.contractsMode = mode;
  session.state = 'CONTRACTS_FETCH';
  setScreen('Sözleşmeler yükleniyor...', true);
  try {
    const list = await apiFetch(
      `/api/contracts?farmer_id=${session.farmer.id}&status=draft`
    );
    session.contracts = list;
    if (!list.length) {
      session.state = 'CONTRACTS_EMPTY';
      setScreen('Aktif sözleşme\nteklifi yok.\n\n0: Geri');
    } else {
      showContractsList();
    }
  } catch {
    showError('Sözleşmeler alınamadı.');
  }
}

function showContractsList() {
  session.state = 'CONTRACTS_LIST';
  const header = session.contractsMode === 'confirm'
    ? 'Onay için seçin:\n─────────────\n'
    : 'Sözleşme Teklifleri:\n─────────────\n';
  const lines = session.contracts.map((c, i) => {
    const val = Number(c.total_value_tl).toLocaleString('tr-TR');
    return `${i + 1}: ${c.buyer_name}\n   ${c.product_type} — ${val} TL`;
  });
  setScreen(header + lines.join('\n') + '\n─────────────\n0: Geri');
}

function showPinPrompt() {
  session.state = 'PIN_PROMPT';
  session.pinBuffer = '';
  renderPinScreen();
}

function renderPinScreen() {
  const masked = '*'.repeat(session.pinBuffer.length).padEnd(4, '_');
  setScreen(
    'PIN kodunuzu\ngirin:\n\n' +
    `  [ ${masked} ]\n\n` +
    '#: Gönder   *: Sil'
  );
}

async function verifyPin() {
  session.state = 'PIN_VERIFY';
  setScreen('Doğrulanıyor...', true);
  try {
    const confirmed = await apiFetch(
      `/api/contracts/${session.selectedContract.id}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ farmer_id: session.farmer.id, pin: session.pinBuffer }),
      }
    );
    session.state = 'CONFIRM_SUCCESS';
    const val = Number(confirmed.total_value_tl).toLocaleString('tr-TR');
    setScreen(
      'Sözleşme\nonaylandı! ✓\n─────────────\n' +
      `${confirmed.buyer_name}\n${confirmed.product_type}\n${val} TL\n` +
      '─────────────\n0: Ana menü'
    );
  } catch (err) {
    if (err.status === 403) {
      session.state = 'PIN_ERROR';
      setScreen('Yanlış PIN.\n\n1: Tekrar dene\n0: Geri');
    } else if (err.status === 404) {
      showError('Sözleşme bulunamadı.');
    } else {
      showError('Bir hata oluştu.');
    }
  }
}

function showError(msg) {
  session.state = 'ERROR';
  setScreen(msg + '\n\n0: Geri');
}

function endSession() {
  session.state = 'END';
  setScreen('Bağlantı kesildi.');
  indicatorEl.className = 'screen-indicator off';
  setTimeout(() => {
    resetSession();
    setScreen('');
    updateDialBar();
  }, 2000);
}

// ── Klaviatura işləyicisi ────────────────────────────────────────
function handleKey(key) {
  const st = session.state;

  // PIN axını — rəqəm, * və # özəl davranış
  if (st === 'PIN_PROMPT') {
    if (key === '*') { session.pinBuffer = ''; renderPinScreen(); return; }
    if (key === '#') { if (session.pinBuffer.length === 4) verifyPin(); return; }
    if (/^\d$/.test(key) && session.pinBuffer.length < 4) {
      session.pinBuffer += key;
      renderPinScreen();
    }
    return;
  }

  // PIN axınından kənar hallarda # klaviaturada hər hansı funksiya daşımır
  // (yalnız IDLE-də dial bar-a əlavə olunur)

  // IDLE — yığım çubuğu
  if (st === 'IDLE' || st === 'ERROR_IDLE') {
    if (key === 'CALL') {
      if (session.dialBuffer === '*123#') {
        session.dialBuffer = '';
        updateDialBar();
        const simPhone = document.getElementById('sim-phone').value.trim();
        if (!simPhone) { setScreen('SIM numarası\ngirilmedi.'); return; }
        startSession(simPhone);
      }
      return;
    }
    if (key === 'END') { session.dialBuffer = ''; updateDialBar(); return; }
    session.dialBuffer += key;
    updateDialBar();
    return;
  }

  // Aktiv sessiya — END düyməsi sessiyanı bitirir
  if (key === 'END') { endSession(); return; }

  // Menyu seçimləri
  if (st === 'MAIN_MENU') {
    if (key === '1') fetchScore();
    else if (key === '2') fetchContracts('view');
    else if (key === '3') fetchContracts('confirm');
    else if (key === '0') endSession();
    return;
  }

  if (st === 'SCORE_SHOW') {
    if (key === '0') showMainMenu();
    return;
  }

  if (st === 'CONTRACTS_LIST') {
    if (key === '0') { showMainMenu(); return; }
    const idx = parseInt(key, 10) - 1;
    if (idx >= 0 && idx < session.contracts.length) {
      session.selectedContract = session.contracts[idx];
      if (session.contractsMode === 'confirm') showPinPrompt();
      // 'view' modunda: seçilmiş müqavilənin detalları (passiv)
    }
    return;
  }

  if (st === 'CONTRACTS_EMPTY') {
    if (key === '0') showMainMenu();
    return;
  }

  if (st === 'CONFIRM_SUCCESS') {
    if (key === '0') showMainMenu();
    return;
  }

  if (st === 'PIN_ERROR') {
    if (key === '1') showPinPrompt();
    else if (key === '0') showMainMenu();
    return;
  }

  if (st === 'ERROR') {
    if (key === '0') {
      if (session.farmer) showMainMenu();
      else { resetSession(); setScreen(''); updateDialBar(); }
    }
    return;
  }
}

// ── DOM hazır olduqda ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateDialBar();
  setScreen('');

  document.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('click', () => handleKey(btn.dataset.key));
  });
  document.getElementById('btn-call').addEventListener('click', () => handleKey('CALL'));
  document.getElementById('btn-end').addEventListener('click',  () => handleKey('END'));

  // Fiziki klaviatura dəstəyi
  document.addEventListener('keydown', e => {
    const map = { Enter: 'CALL', Escape: 'END', Backspace: '*' };
    const key = map[e.key] || (/^[0-9*#]$/.test(e.key) ? e.key : null);
    if (key) { e.preventDefault(); handleKey(key); }
  });
});
