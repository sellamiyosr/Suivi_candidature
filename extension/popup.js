const DEFAULT_API = 'http://localhost:8080/api';

const els = {
  viewConfig: document.getElementById('view-config'),
  viewHome: document.getElementById('view-home'),
  viewForm: document.getElementById('view-form'),
  apiUrl: document.getElementById('apiUrl'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  btnSaveConfig: document.getElementById('btn-save-config'),
  btnSettings: document.getElementById('btn-settings'),
  btnExtract: document.getElementById('btn-extract'),
  btnBack: document.getElementById('btn-back'),
  btnSubmit: document.getElementById('btn-submit'),
  configError: document.getElementById('config-error'),
  homeStatus: document.getElementById('home-status'),
  formStatus: document.getElementById('form-status'),
  formError: document.getElementById('form-error'),
  company: document.getElementById('company'),
  jobTitle: document.getElementById('jobTitle'),
  jobUrl: document.getElementById('jobUrl'),
  platform: document.getElementById('platform'),
  location: document.getElementById('location'),
  reference: document.getElementById('reference'),
  description: document.getElementById('description'),
  applied: document.getElementById('applied')
};

let config = {
  apiUrl: DEFAULT_API,
  token: '',
  email: ''
};

init();

async function init() {
  const stored = await chrome.storage.local.get(['apiUrl', 'token', 'email']);
  config = {
    apiUrl: stored.apiUrl || DEFAULT_API,
    token: stored.token || '',
    email: stored.email || ''
  };
  els.apiUrl.value = config.apiUrl;
  els.email.value = config.email || '';

  if (config.token) {
    showView('home');
  } else {
    showView('config');
  }
}

function showView(name) {
  els.viewConfig.classList.toggle('hidden', name !== 'config');
  els.viewHome.classList.toggle('hidden', name !== 'home');
  els.viewForm.classList.toggle('hidden', name !== 'form');
}

els.btnSettings.addEventListener('click', () => {
  els.configError.textContent = '';
  showView('config');
});

els.btnBack.addEventListener('click', () => {
  showView('home');
});

els.btnSaveConfig.addEventListener('click', async () => {
  els.configError.textContent = '';
  const apiUrl = normalizeApiUrl(els.apiUrl.value.trim());
  const email = els.email.value.trim().toLowerCase();
  const password = els.password.value;

  if (!apiUrl || !email || !password) {
    els.configError.textContent = 'Tous les champs sont requis';
    return;
  }

  const loginUrl = `${apiUrl}/auth/login`;
  els.btnSaveConfig.disabled = true;
  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.message || data.error || `HTTP ${res.status}`;
      if (res.status === 401) {
        throw new Error('Email ou mot de passe incorrect');
      }
      throw new Error(`Connexion refusée (${detail}). URL : ${loginUrl}`);
    }
    if (!data.token) {
      throw new Error('Réponse API invalide (pas de token)');
    }

    config = { apiUrl, token: data.token, email: data.email || email };
    await chrome.storage.local.set({
      apiUrl: config.apiUrl,
      token: config.token,
      email: config.email
    });
    els.password.value = '';
    showView('home');
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      els.configError.textContent =
        `API injoignable. Vérifiez que le backend tourne, puis utilisez exactement : http://localhost:8080/api (actuel : ${loginUrl})`;
    } else {
      els.configError.textContent = msg;
    }
  } finally {
    els.btnSaveConfig.disabled = false;
  }
});

els.btnExtract.addEventListener('click', async () => {
  els.homeStatus.textContent = '';
  els.formError.textContent = '';
  els.formStatus.textContent = '';
  els.btnExtract.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('Aucun onglet actif');
    }
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Ouvrez une page d\'offre (LinkedIn, Indeed, WTTJ…)');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const extracted = results?.[0]?.result;
    if (!extracted) {
      throw new Error('Extraction impossible sur cette page');
    }

    fillForm(extracted);
    showView('form');
  } catch (err) {
    els.homeStatus.textContent = '';
    els.homeStatus.style.color = 'var(--danger)';
    els.homeStatus.textContent = err.message || 'Erreur';
  } finally {
    els.btnExtract.disabled = false;
  }
});

els.btnSubmit.addEventListener('click', async () => {
  els.formError.textContent = '';
  els.formStatus.textContent = '';
  els.btnSubmit.disabled = true;

  const applied = els.applied.checked;
  const payload = {
    company: els.company.value.trim(),
    jobTitle: els.jobTitle.value.trim(),
    jobUrl: els.jobUrl.value.trim() || null,
    platform: els.platform.value.trim() || null,
    location: els.location.value.trim() || null,
    reference: els.reference.value.trim() || null,
    description: els.description.value.trim() || null,
    status: 'EN_ATTENTE',
    priority: 'MOYENNE',
    applicationDate: applied ? todayIso() : null
  };

  if (!payload.company || !payload.jobTitle) {
    els.formError.textContent = 'Entreprise et poste sont requis';
    els.btnSubmit.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${config.apiUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      await chrome.storage.local.remove(['token']);
      config.token = '';
      throw new Error('Session expirée — reconnectez-vous');
    }
    if (!res.ok) {
      throw new Error(data.message || 'Enregistrement impossible');
    }

    els.formStatus.textContent = 'Candidature enregistrée';
    await tryUploadScreenshot(data.id);
    setTimeout(() => showView('home'), 900);
  } catch (err) {
    els.formError.textContent = err.message || 'Erreur';
    if (!config.token) {
      showView('config');
    }
  } finally {
    els.btnSubmit.disabled = false;
  }
});

function fillForm(data) {
  els.company.value = data.company || '';
  els.jobTitle.value = data.jobTitle || '';
  els.jobUrl.value = data.jobUrl || '';
  els.platform.value = data.platform || '';
  els.location.value = data.location || '';
  els.reference.value = data.reference || '';
  els.description.value = data.description || '';
  els.applied.checked = true;
  els.homeStatus.style.color = 'var(--ok)';
}

function normalizeApiUrl(url) {
  let value = url.trim().replace(/\/+$/, '');
  if (!/\/api$/i.test(value)) {
    value = `${value}/api`;
  }
  return value;
}

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function tryUploadScreenshot(applicationId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    if (!dataUrl) {
      return;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append('file', blob, 'screenshot.png');

    await fetch(`${config.apiUrl}/applications/${applicationId}/screenshot`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      body: formData
    });
    els.formStatus.textContent = 'Candidature + capture enregistrées';
  } catch {
    // Ne pas bloquer si la capture échoue
    els.formStatus.textContent = 'Candidature enregistrée (capture non disponible)';
  }
}
