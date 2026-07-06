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

function refreshOutreachScriptPreview() {
  const key = document.getElementById('oScriptKey').value.trim();
  const preview = document.getElementById('outreachScriptPreview');
  if (!key) {
    preview.textContent = '';
    return;
  }
  apiFetch(`/outreach/scripts/${encodeURIComponent(key)}`)
    .then(({ script }) => {
      preview.textContent = `Combined script for "${key}": ${script}`;
    })
    .catch((err) => {
      preview.textContent = `Failed to load: ${err.message}`;
    });
}

function setupOutreachScriptForm() {
  document.getElementById('outreachScriptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('oScriptKey').value.trim();
    const base = document.getElementById('oScriptBase').value;
    const custom = document.getElementById('oScriptCustom').value;
    try {
      if (base) {
        await apiFetch(`/outreach/scripts/${encodeURIComponent(key)}/base`, {
          method: 'PUT',
          body: JSON.stringify({ text: base }),
        });
      }
      if (custom) {
        await apiFetch(`/outreach/scripts/${encodeURIComponent(key)}/custom-segments`, {
          method: 'POST',
          body: JSON.stringify({ text: custom }),
        });
      }
      document.getElementById('oScriptCustom').value = '';
      refreshOutreachScriptPreview();
    } catch (err) {
      alert(err.message);
    }
  });
}

const PROSPECT_ACTIONS = {
  sourced: [{ label: 'Qualify (>=80%)', action: 'qualify' }],
  qualified: [{ label: 'Contact on platform', action: 'platform-outreach' }],
  'platform-contacted': [{ label: 'Convert to email/phone', action: 'convert-contact' }],
  'contact-converted': [{ label: 'Direct outreach (email/phone)', action: 'direct-outreach' }],
  'direct-contacted': [{ label: 'Invite online session', action: 'online-invite' }],
  'online-invited': [
    { label: 'Online: completed', action: 'online-outcome-completed' },
    { label: 'Online: no-show', action: 'online-outcome-no-show' },
  ],
  'online-completed': [{ label: 'Invite in person', action: 'in-person-invite' }],
  'online-no-show': [{ label: 'Re-invite online session', action: 'online-invite' }],
  'in-person-invited': [
    { label: 'In-person: completed', action: 'in-person-outcome-completed' },
    { label: 'In-person: no-show', action: 'in-person-outcome-no-show' },
  ],
  'in-person-no-show': [{ label: 'Re-invite in person', action: 'in-person-invite' }],
  'in-person-completed': [{ label: 'Submit for approval', action: 'submit-for-approval' }],
  'pending-approval': [
    { label: 'Approve', action: 'approve' },
    { label: 'Reject', action: 'reject' },
  ],
  approved: [{ label: 'Send contract', action: 'send-contract' }],
};

async function runProspectAction(id, action) {
  try {
    switch (action) {
      case 'qualify':
        await apiFetch(`/outreach/prospects/${id}/qualify`, { method: 'POST' });
        break;
      case 'platform-outreach': {
        const message = prompt('Message to send inside their own platform:');
        if (message === null) return;
        await apiFetch(`/outreach/prospects/${id}/platform-outreach`, {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
        break;
      }
      case 'convert-contact': {
        const email = prompt('Email (optional):') || undefined;
        const phone = prompt('Phone (optional):') || undefined;
        await apiFetch(`/outreach/prospects/${id}/convert-contact`, {
          method: 'POST',
          body: JSON.stringify({ email, phone }),
        });
        break;
      }
      case 'direct-outreach': {
        const channel = prompt('Channel ("email" or "phone"):', 'email');
        if (!channel) return;
        const message = prompt('Direct message:');
        if (message === null) return;
        await apiFetch(`/outreach/prospects/${id}/direct-outreach`, {
          method: 'POST',
          body: JSON.stringify({ channel, message }),
        });
        break;
      }
      case 'online-invite': {
        const dateStr = prompt('Online session date/time (e.g. 2026-01-01T10:00):');
        if (!dateStr) return;
        const script = prompt('Script for the call:');
        if (script === null) return;
        await apiFetch(`/outreach/prospects/${id}/online-session/invite`, {
          method: 'POST',
          body: JSON.stringify({ scheduledAt: new Date(dateStr).getTime(), script }),
        });
        break;
      }
      case 'online-outcome-completed':
        await apiFetch(`/outreach/prospects/${id}/online-session/outcome`, {
          method: 'POST',
          body: JSON.stringify({ outcome: 'completed' }),
        });
        break;
      case 'online-outcome-no-show':
        await apiFetch(`/outreach/prospects/${id}/online-session/outcome`, {
          method: 'POST',
          body: JSON.stringify({ outcome: 'no-show' }),
        });
        break;
      case 'in-person-invite': {
        const locationId = prompt('Location id (salon/office):');
        if (!locationId) return;
        const dateStr = prompt('In-person visit date/time (controlled visiting hours):');
        if (!dateStr) return;
        await apiFetch(`/outreach/prospects/${id}/in-person/invite`, {
          method: 'POST',
          body: JSON.stringify({ locationId, scheduledAt: new Date(dateStr).getTime() }),
        });
        break;
      }
      case 'in-person-outcome-completed':
        await apiFetch(`/outreach/prospects/${id}/in-person/outcome`, {
          method: 'POST',
          body: JSON.stringify({ outcome: 'completed' }),
        });
        break;
      case 'in-person-outcome-no-show':
        await apiFetch(`/outreach/prospects/${id}/in-person/outcome`, {
          method: 'POST',
          body: JSON.stringify({ outcome: 'no-show' }),
        });
        break;
      case 'submit-for-approval': {
        const responsibleContact = prompt('Responsible person (email/contact) to hand the list to:');
        if (!responsibleContact) return;
        await apiFetch(`/outreach/prospects/${id}/submit-for-approval`, {
          method: 'POST',
          body: JSON.stringify({ responsibleContact }),
        });
        break;
      }
      case 'approve':
      case 'reject': {
        const decidedBy = prompt('Decided by:');
        if (!decidedBy) return;
        await apiFetch(`/outreach/prospects/${id}/decide-approval`, {
          method: 'POST',
          body: JSON.stringify({ decision: action === 'approve' ? 'approved' : 'rejected', decidedBy }),
        });
        break;
      }
      case 'send-contract':
        await apiFetch(`/outreach/prospects/${id}/send-contract`, { method: 'POST' });
        break;
      default:
        break;
    }
    refreshProspects();
  } catch (err) {
    alert(err.message);
  }
}

async function refreshProspects() {
  const container = document.getElementById('prospectsList');
  try {
    const { prospects } = await apiFetch('/outreach/prospects');
    container.innerHTML = prospects.length
      ? prospects
          .map((p) => {
            const actions = PROSPECT_ACTIONS[p.status] || [];
            const buttons = actions
              .map(
                (a) =>
                  `<button data-action="${a.action}" data-id="${p.id}">${a.label}</button>`
              )
              .join(' ');
            return `<div class="card"><h4>${p.displayName || p.accountHandle} (${p.id})</h4><div>Platform: ${p.platform} (${p.accountHandle})</div><div>Plan: ${p.planId}${
              p.audienceProfileId ? ` / Audience: ${p.audienceProfileId}` : ''
            }</div><div>Match score: ${p.matchScore}%</div><div>Status: <strong>${p.status}</strong></div>${
              p.email || p.phone ? `<div>Contact: ${p.email || ''} ${p.phone || ''}</div>` : ''
            }<div>${buttons}</div></div>`;
          })
          .join('')
      : '<p class="hint">No prospects sourced yet.</p>';
    container.querySelectorAll('button[data-action]').forEach((btn) =>
      btn.addEventListener('click', () => runProspectAction(btn.dataset.id, btn.dataset.action))
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupProspectForm() {
  document.getElementById('prospectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('pId').value || undefined;
    const planId = document.getElementById('pPlanId').value;
    const audienceProfileId = document.getElementById('pAudienceProfileId').value || undefined;
    const platform = document.getElementById('pPlatform').value;
    const accountHandle = document.getElementById('pAccountHandle').value;
    const displayName = document.getElementById('pDisplayName').value || undefined;
    const matchScore = Number(document.getElementById('pMatchScore').value);
    try {
      await apiFetch('/outreach/prospects', {
        method: 'POST',
        body: JSON.stringify({ id, planId, audienceProfileId, platform, accountHandle, displayName, matchScore }),
      });
      refreshProspects();
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
setupOutreachScriptForm();
setupProspectForm();
refreshConnections();
refreshMarkets();
refreshAudienceProfiles();
refreshCommissionModels();
refreshResumes();
refreshLandingPages();
refreshProspects();
