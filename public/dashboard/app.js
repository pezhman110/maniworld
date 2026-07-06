const API_BASE = '/api';

const PROVIDER_FIELDS = {
  twilio: ['accountSid', 'authToken'],
  whatsapp: ['phoneNumberId', 'accessToken'],
  telegram: ['botToken'],
  vapi: ['apiKey'],
  zoom: ['accountId', 'clientId', 'clientSecret'],
  'google-meet': ['joinUrl'],
  apollo: ['apiKey'],
};

// Kept only in memory (not localStorage/sessionStorage) so the admin API key
// is never written to disk in clear text; it must be re-entered per page load.
let adminApiKey = '';

function getApiKey() {
  return adminApiKey;
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const apiKey = getApiKey();
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed with status ${res.status}`);
  return body;
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

function setupApiKeyBar() {
  const input = document.getElementById('apiKey');
  const status = document.getElementById('apiKeyStatus');
  document.getElementById('saveApiKey').addEventListener('click', () => {
    adminApiKey = input.value;
    status.textContent = 'Saved for this session.';
    refreshConnections();
    refreshMarkets();
    refreshAudienceProfiles();
    refreshCommissionModels();
    refreshResumes();
    refreshLandingPages();
    setTimeout(() => (status.textContent = ''), 2000);
  });
}

function populateProviderSelect() {
  const select = document.getElementById('providerSelect');
  select.innerHTML = '';
  Object.keys(PROVIDER_FIELDS).forEach((provider) => {
    const opt = document.createElement('option');
    opt.value = provider;
    opt.textContent = provider;
    select.appendChild(opt);
  });
  renderFieldInputs(select.value);
  select.addEventListener('change', () => renderFieldInputs(select.value));
}

function renderFieldInputs(provider) {
  const container = document.getElementById('fieldsContainer');
  container.innerHTML = '';
  (PROVIDER_FIELDS[provider] || []).forEach((field) => {
    const label = document.createElement('label');
    label.textContent = field;
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.field = field;
    input.required = true;
    label.appendChild(input);
    container.appendChild(label);
  });
}

async function refreshConnections() {
  const list = document.getElementById('connectionsList');
  list.innerHTML = 'Loading…';
  try {
    const { credentials } = await apiFetch('/credentials');
    list.innerHTML = '';
    if (credentials.length === 0) {
      list.innerHTML = '<p class="hint">No connections configured yet.</p>';
      return;
    }
    credentials.forEach((cred) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${cred.provider}</h4>
        <div>${cred.label}</div>
        <span class="status ${cred.status}">${cred.status}</span>
        <div>
          <button data-action="test" data-provider="${cred.provider}">Test</button>
          <button data-action="remove" data-provider="${cred.provider}">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('button[data-action="test"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        btn.textContent = 'Testing…';
        try {
          const result = await apiFetch(`/credentials/${btn.dataset.provider}/test`, { method: 'POST' });
          alert(result.result.message);
        } catch (err) {
          alert(err.message);
        }
        refreshConnections();
      })
    );
    list.querySelectorAll('button[data-action="remove"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/credentials/${btn.dataset.provider}`, { method: 'DELETE' });
        refreshConnections();
      })
    );
  } catch (err) {
    list.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupConnectionForm() {
  document.getElementById('connectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const provider = document.getElementById('providerSelect').value;
    const label = document.getElementById('providerLabel').value;
    const fields = {};
    document.querySelectorAll('#fieldsContainer input').forEach((input) => {
      fields[input.dataset.field] = input.value;
    });
    try {
      await apiFetch(`/credentials/${provider}`, { method: 'PUT', body: JSON.stringify({ label, fields }) });
      refreshConnections();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshMarkets() {
  const builtInContainer = document.getElementById('builtInMarkets');
  const customContainer = document.getElementById('customMarkets');
  try {
    const { markets: builtIn } = await apiFetch('/markets/built-in');
    builtInContainer.innerHTML = builtIn
      .map(
        (m) =>
          `<div class="card"><h4>${m.id}</h4><div>${m.workingHours.startHour}:00-${m.workingHours.endHour}:00</div><div>${m.targetRules
            .map((r) => `${r.metric}: ${r.minPerDay}${r.maxPerDay ? '-' + r.maxPerDay : '+'}`)
            .join(', ')}</div></div>`
      )
      .join('');
  } catch (err) {
    builtInContainer.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }

  try {
    const { markets: custom } = await apiFetch('/markets?onlyActive=false');
    customContainer.innerHTML = custom.length
      ? custom
          .map(
            (m) =>
              `<div class="card"><h4>${m.id}</h4><div>${m.label}</div><div>${m.workingHours.startHour}:00-${m.workingHours.endHour}:00</div><span class="status ${m.active ? 'connected' : 'invalid'}">${m.active ? 'active' : 'inactive'}</span><div><button data-action="remove-market" data-id="${m.id}">Remove</button></div></div>`
          )
          .join('')
      : '<p class="hint">No custom markets yet.</p>';
    customContainer.querySelectorAll('button[data-action="remove-market"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/markets/${btn.dataset.id}`, { method: 'DELETE' });
        refreshMarkets();
      })
    );
  } catch (err) {
    customContainer.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupMarketForm() {
  document.getElementById('marketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('marketId').value;
    const label = document.getElementById('marketLabel').value;
    const startHour = Number(document.getElementById('marketStartHour').value);
    const endHour = Number(document.getElementById('marketEndHour').value);
    const metric = document.getElementById('marketMetric').value;
    const minPerDay = Number(document.getElementById('marketMin').value);
    const maxRaw = document.getElementById('marketMax').value;
    const maxPerDay = maxRaw ? Number(maxRaw) : undefined;

    try {
      await apiFetch('/markets', {
        method: 'POST',
        body: JSON.stringify({
          id,
          label,
          workingHours: { startHour, endHour },
          targetRules: [{ metric, minPerDay, maxPerDay }],
        }),
      });
      refreshMarkets();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshAudienceProfiles() {
  const container = document.getElementById('audienceProfilesList');
  try {
    const { audienceProfiles } = await apiFetch('/presentation/audience-profiles?onlyActive=false');
    container.innerHTML = audienceProfiles.length
      ? audienceProfiles
          .map(
            (p) =>
              `<div class="card"><h4>${p.label} (${p.id})</h4><div>${p.targetText}</div><div>Goals: ${p.goals.join(', ')}</div>${
                p.vertical ? `<div>Vertical: ${p.vertical}</div>` : ''
              }<div><button data-action="remove-ap" data-id="${p.id}">Remove</button></div></div>`
          )
          .join('')
      : '<p class="hint">No audience profiles yet.</p>';
    container.querySelectorAll('button[data-action="remove-ap"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/presentation/audience-profiles/${btn.dataset.id}`, { method: 'DELETE' });
        refreshAudienceProfiles();
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupAudienceProfileForm() {
  document.getElementById('audienceProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('apId').value;
    const label = document.getElementById('apLabel').value;
    const vertical = document.getElementById('apVertical').value || undefined;
    const targetText = document.getElementById('apTargetText').value;
    const goals = document
      .getElementById('apGoals')
      .value.split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    try {
      await apiFetch('/presentation/audience-profiles', {
        method: 'POST',
        body: JSON.stringify({ id, label, vertical, targetText, goals }),
      });
      refreshAudienceProfiles();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshCommissionModels() {
  const container = document.getElementById('commissionModelsList');
  try {
    const { commissionModels } = await apiFetch('/presentation/commission-models?onlyActive=false');
    container.innerHTML = commissionModels.length
      ? commissionModels
          .map((m) => {
            const detail =
              m.type === 'tiered'
                ? (m.tiers || []).map((t) => `${t.upToCount ?? '∞'}:${t.rate}`).join(', ')
                : `${m.rate}${m.type === 'percentage' ? '%' : ''}`;
            return `<div class="card"><h4>${m.label} (${m.id})</h4><div>${m.type}: ${detail}</div>${
              m.audienceProfileId ? `<div>Audience: ${m.audienceProfileId}</div>` : ''
            }<div><button data-action="remove-cm" data-id="${m.id}">Remove</button></div></div>`;
          })
          .join('')
      : '<p class="hint">No commission models yet.</p>';
    container.querySelectorAll('button[data-action="remove-cm"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/presentation/commission-models/${btn.dataset.id}`, { method: 'DELETE' });
        refreshCommissionModels();
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function parseTiers(raw) {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [upTo, rate] = part.split(':').map((s) => s.trim());
      return { upToCount: upTo ? Number(upTo) : undefined, rate: Number(rate) };
    });
}

function setupCommissionModelForm() {
  document.getElementById('commissionModelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cmId').value;
    const label = document.getElementById('cmLabel').value;
    const type = document.getElementById('cmType').value;
    const rateRaw = document.getElementById('cmRate').value;
    const rate = rateRaw ? Number(rateRaw) : undefined;
    const tiersRaw = document.getElementById('cmTiers').value;
    const tiers = type === 'tiered' && tiersRaw ? parseTiers(tiersRaw) : undefined;
    const audienceProfileId = document.getElementById('cmAudienceProfileId').value || undefined;
    try {
      await apiFetch('/presentation/commission-models', {
        method: 'POST',
        body: JSON.stringify({ id, label, type, rate, tiers, audienceProfileId }),
      });
      refreshCommissionModels();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshResumes() {
  const container = document.getElementById('resumesList');
  try {
    const { resumes } = await apiFetch('/presentation/resumes');
    container.innerHTML = resumes.length
      ? resumes
          .map(
            (r) =>
              `<div class="card"><h4>${r.candidateName}</h4><div>${r.source}${r.url ? ': ' + r.url : ''}</div><div><button data-action="remove-res" data-id="${r.id}">Remove</button></div></div>`
          )
          .join('')
      : '<p class="hint">No resumes recorded yet.</p>';
    container.querySelectorAll('button[data-action="remove-res"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/presentation/resumes/${btn.dataset.id}`, { method: 'DELETE' });
        refreshResumes();
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupResumeForm() {
  document.getElementById('resumeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const candidateName = document.getElementById('resCandidateName').value;
    const source = document.getElementById('resSource').value;
    const url = document.getElementById('resUrl').value || undefined;
    const audienceProfileId = document.getElementById('resAudienceProfileId').value || undefined;
    try {
      await apiFetch('/presentation/resumes', {
        method: 'POST',
        body: JSON.stringify({ candidateName, source, url, audienceProfileId }),
      });
      refreshResumes();
    } catch (err) {
      alert(err.message);
    }
  });
}

function parseContentBlocks(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { label: line, content: line };
      return { label: line.slice(0, idx).trim(), content: line.slice(idx + 1).trim() };
    });
}

async function refreshLandingPages() {
  const container = document.getElementById('landingPagesList');
  try {
    const { landingPages } = await apiFetch('/presentation/landing-pages?onlyActive=false');
    container.innerHTML = landingPages.length
      ? landingPages
          .map(
            (p) =>
              `<div class="card"><h4>${p.slug} (${p.id})</h4>${p.domain ? `<div>Domain: ${p.domain}</div>` : ''}<div>${p.heroText}</div><div>Blocks: ${p.contentBlocks
                .map((b) => `${b.label}=${b.content}`)
                .join('; ')}</div><div><button data-action="remove-lp" data-id="${p.id}">Remove</button></div></div>`
          )
          .join('')
      : '<p class="hint">No landing pages yet.</p>';
    container.querySelectorAll('button[data-action="remove-lp"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await apiFetch(`/presentation/landing-pages/${btn.dataset.id}`, { method: 'DELETE' });
        refreshLandingPages();
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupLandingPageForm() {
  document.getElementById('landingPageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('lpId').value;
    const slug = document.getElementById('lpSlug').value;
    const domain = document.getElementById('lpDomain').value || undefined;
    const audienceProfileId = document.getElementById('lpAudienceProfileId').value || undefined;
    const heroText = document.getElementById('lpHeroText').value;
    const contentBlocks = parseContentBlocks(document.getElementById('lpContentBlocks').value);
    const leadFormFieldsRaw = document.getElementById('lpLeadFormFields').value;
    const leadFormFields = leadFormFieldsRaw
      ? leadFormFieldsRaw
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
      : undefined;
    try {
      await apiFetch('/presentation/landing-pages', {
        method: 'POST',
        body: JSON.stringify({ id, slug, domain, audienceProfileId, heroText, contentBlocks, leadFormFields }),
      });
      refreshLandingPages();
    } catch (err) {
      alert(err.message);
    }
  });
}

setupTabs();
setupApiKeyBar();
populateProviderSelect();
setupConnectionForm();
setupMarketForm();
setupAudienceProfileForm();
setupCommissionModelForm();
setupResumeForm();
setupLandingPageForm();
refreshConnections();
refreshMarkets();
refreshAudienceProfiles();
refreshCommissionModels();
refreshResumes();
refreshLandingPages();
