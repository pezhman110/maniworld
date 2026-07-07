const API_BASE = '/api';

const PROVIDER_FIELDS = {
  twilio: ['accountSid', 'authToken'],
  whatsapp: ['phoneNumberId', 'accessToken'],
  telegram: ['botToken'],
  vapi: ['apiKey'],
  zoom: ['accountId', 'clientId', 'clientSecret'],
  'google-meet': ['joinUrl'],
  apollo: ['apiKey'],
  instagram: ['igUserId', 'accessToken'],
  facebook: ['pageId', 'accessToken'],
  linkedin: ['accessToken', 'authorUrn'],
  tiktok: ['accessToken'],
  snapchat: [],
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
    refreshMissionGroups();
    refreshConnections();
    refreshMarkets();
    refreshAudienceProfiles();
    refreshCommissionModels();
    refreshResumes();
    refreshLandingPages();
    refreshProspects();
    refreshDutyScopes();
    refreshPipelineOverview();
    refreshContentBriefs();
    refreshContentFallbackQueue();
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
  approved: [{ label: 'Record reference check', action: 'reference-check' }],
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
      case 'reference-check': {
        const contacted = confirm('Confirm: the previous employer/workplace has been contacted?');
        const confirmedBy = prompt('Confirmed by:');
        if (!confirmedBy) return;
        const notes = prompt('Notes (optional):') || undefined;
        await apiFetch(`/outreach/prospects/${id}/reference-check`, {
          method: 'POST',
          body: JSON.stringify({ contactedPreviousEmployer: contacted, confirmedBy, notes }),
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
    refreshPipelineOverview();
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
            if (p.status === 'approved' && p.referenceCheck?.contactedPreviousEmployer) {
              actions.push({ label: 'Send contract', action: 'send-contract' });
            }
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
            }${
              p.referenceCheck
                ? `<div>Reference check: ${p.referenceCheck.contactedPreviousEmployer ? 'confirmed' : 'not confirmed'}</div>`
                : ''
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

function setupCompliancePolicyForm() {
  document.getElementById('compliancePolicyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cpId').value.trim();
    const scope = document.getElementById('cpScope').value;
    const route = document.getElementById('cpRoute').value;
    const audienceProfileId = document.getElementById('cpAudienceProfileId').value.trim() || undefined;
    const rules = document
      .getElementById('cpRules')
      .value.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [prefix, ...rest] = line.split(':');
        const kind = prefix.trim().toLowerCase() === 'must-not' ? 'must-not' : 'must';
        const text = rest.length ? rest.join(':').trim() : line;
        return { id: `${id}-rule-${index}`, kind, text };
      });
    try {
      await apiFetch('/compliance-policy', {
        method: 'POST',
        body: JSON.stringify({ id, scope, route, audienceProfileId, rules }),
      });
      e.target.reset();
      refreshCompliancePolicies();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function runCompliancePolicyAction(id, action) {
  try {
    if (action === 'confirm-same') {
      await apiFetch(`/compliance-policy/${id}/confirm-same`, { method: 'POST' });
    } else if (action === 'revise-rules') {
      const text = prompt('New rules, one per line, prefix "must:" or "must-not:":');
      if (text === null) return;
      const rules = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [prefix, ...rest] = line.split(':');
          const kind = prefix.trim().toLowerCase() === 'must-not' ? 'must-not' : 'must';
          const ruleText = rest.length ? rest.join(':').trim() : line;
          return { id: `${id}-rule-${index}`, kind, text: ruleText };
        });
      await apiFetch(`/compliance-policy/${id}/revise-rules`, {
        method: 'POST',
        body: JSON.stringify({ rules }),
      });
    } else if (action === 'delete') {
      await apiFetch(`/compliance-policy/${id}`, { method: 'DELETE' });
    }
    refreshCompliancePolicies();
  } catch (err) {
    alert(err.message);
  }
}

async function refreshCompliancePolicies() {
  const container = document.getElementById('compliancePoliciesList');
  try {
    const { policies } = await apiFetch('/compliance-policy?onlyActive=false');
    container.innerHTML = policies.length
      ? policies
          .map((p) => {
            const rulesHtml = p.rules
              .map((r) => `<li><strong>${r.kind}</strong>: ${r.text}</li>`)
              .join('');
            return `<div class="card"><h4>${p.id} (${p.scope} / ${p.route})</h4>${
              p.audienceProfileId ? `<div>Audience: ${p.audienceProfileId}</div>` : ''
            }<div>Version: ${p.version}</div><div>Last confirmed: ${new Date(p.lastConfirmedAt).toLocaleString()}</div><ul>${rulesHtml}</ul><div>
              <button data-action="confirm-same" data-id="${p.id}">Confirm same</button>
              <button data-action="revise-rules" data-id="${p.id}">Revise rules</button>
              <button data-action="delete" data-id="${p.id}">Delete</button>
            </div></div>`;
          })
          .join('')
      : '<p class="hint">No compliance policies defined yet.</p>';
    container.querySelectorAll('button[data-action]').forEach((btn) =>
      btn.addEventListener('click', () => runCompliancePolicyAction(btn.dataset.id, btn.dataset.action))
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

async function refreshDutyScopes() {
  const container = document.getElementById('dutyScopesList');
  try {
    const { dutyScopes } = await apiFetch('/duty-scope');
    container.innerHTML = dutyScopes.length
      ? dutyScopes
          .map(
            (d) =>
              `<div class="card"><h4>${d.id}</h4><div>Prospect: ${d.prospectId}${
                d.locationId ? ` @ ${d.locationId}` : ''
              }</div><div>${d.visitsPerPeriod} visit(s) / ${d.period}</div><div>Services: ${
                d.servicesCovered.join(', ') || '-'
              }</div>${d.commissionPercent !== undefined ? `<div>Commission: ${d.commissionPercent}%</div>` : ''}${
                d.quotas && d.quotas.length
                  ? `<div>Contract quotas: ${d.quotas.map((q) => `${q.metric} ≥ ${q.minCount}`).join(', ')}</div>`
                  : ''
              }<div>Status: <strong>${
                d.active ? 'active' : 'inactive'
              }</strong></div><div><button data-checkin="${d.id}">Log check-in (now)</button> <button data-quota-status="${d.id}">Check quota status</button> ${
                d.active ? `<button data-deactivate="${d.id}">Deactivate</button>` : ''
              }</div></div>`
          )
          .join('')
      : '<p class="hint">No duty scopes defined yet.</p>';
    container.querySelectorAll('button[data-checkin]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/duty-scope/${btn.dataset.checkin}/check-in`, {
            method: 'POST',
            body: JSON.stringify({ checkedInAt: Date.now() }),
          });
          refreshDutyScopes();
        } catch (err) {
          alert(err.message);
        }
      })
    );
    container.querySelectorAll('button[data-deactivate]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/duty-scope/${btn.dataset.deactivate}/deactivate`, { method: 'POST' });
          refreshDutyScopes();
        } catch (err) {
          alert(err.message);
        }
      })
    );
    container.querySelectorAll('button[data-quota-status]').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.getElementById('dqrDutyScopeId').value = btn.dataset.quotaStatus;
        renderQuotaStatus(btn.dataset.quotaStatus);
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function parseQuotasInput(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [metric, minCountRaw] = line.split(':').map((s) => s.trim());
      return { metric, minCount: Number(minCountRaw) };
    });
}

async function renderQuotaStatus(dutyScopeId) {
  const container = document.getElementById('dutyQuotaStatusList');
  if (!dutyScopeId) {
    container.innerHTML = '';
    return;
  }
  try {
    const { statuses } = await apiFetch(`/duty-scope/${dutyScopeId}/quota-status`);
    container.innerHTML = statuses.length
      ? statuses
          .map(
            (s) =>
              `<div class="card"><h4>${s.metric}</h4><div>Required: ≥ ${s.minCount}</div><div>Current: ${
                s.currentCount
              }</div><div>Status: <strong class="${s.compliant ? 'status connected' : 'status invalid'}">${
                s.compliant ? 'compliant' : `short by ${s.deficit}`
              }</strong></div></div>`
          )
          .join('')
      : '<p class="hint">This duty scope has no contract-term quotas defined.</p>';
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupDutyScopeForm() {
  document.getElementById('dutyScopeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('dsId').value || undefined;
    const prospectId = document.getElementById('dsProspectId').value;
    const locationId = document.getElementById('dsLocationId').value || undefined;
    const visitsPerPeriod = Number(document.getElementById('dsVisitsPerPeriod').value);
    const period = document.getElementById('dsPeriod').value;
    const servicesCovered = document
      .getElementById('dsServicesCovered')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const commissionPercentRaw = document.getElementById('dsCommissionPercent').value;
    const commissionPercent = commissionPercentRaw ? Number(commissionPercentRaw) : undefined;
    const quotas = parseQuotasInput(document.getElementById('dsQuotas').value);
    try {
      await apiFetch('/duty-scope', {
        method: 'POST',
        body: JSON.stringify({
          id,
          prospectId,
          locationId,
          visitsPerPeriod,
          period,
          servicesCovered,
          commissionPercent,
          quotas: quotas.length ? quotas : undefined,
        }),
      });
      refreshDutyScopes();
    } catch (err) {
      alert(err.message);
    }
  });
}

function setupDutyQuotaReadingForm() {
  document.getElementById('dutyQuotaReadingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dutyScopeId = document.getElementById('dqrDutyScopeId').value;
    const metric = document.getElementById('dqrMetric').value;
    const count = Number(document.getElementById('dqrCount').value);
    try {
      await apiFetch(`/duty-scope/${dutyScopeId}/quota-readings`, {
        method: 'POST',
        body: JSON.stringify({ metric, count }),
      });
      renderQuotaStatus(dutyScopeId);
    } catch (err) {
      alert(err.message);
    }
  });
}

function setupDutyComplianceForm() {
  document.getElementById('dutyComplianceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const weekStartDate = document.getElementById('dsWeekStart').value;
    if (!weekStartDate) return;
    const weekStart = new Date(`${weekStartDate}T00:00:00`).getTime();
    const nonCompliantOnly = document.getElementById('dsNonCompliantOnly').checked;
    const container = document.getElementById('dutyComplianceList');
    try {
      const { compliance } = await apiFetch(
        `/duty-scope/compliance?weekStart=${weekStart}${nonCompliantOnly ? '&nonCompliantOnly=true' : ''}`
      );
      container.innerHTML = compliance.length
        ? compliance
            .map(
              (c) =>
                `<div class="card"><h4>${c.dutyScopeId}</h4><div>Prospect: ${c.prospectId}</div><div>Expected: ${c.expectedVisits} / Actual: ${c.actualVisits}</div><div>Status: <strong>${
                  c.compliant ? 'compliant' : `short by ${c.deficit}`
                }</strong></div></div>`
            )
            .join('')
        : '<p class="hint">No duty scopes to report on for this week.</p>';
    } catch (err) {
      container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
    }
  });
}

/**
 * The end-to-end pipeline, expressed as a fixed sequence of steps a
 * prospect moves through: advertisement/landing page + resume intake feed
 * candidates in, then every `ProspectStatus` value maps onto exactly one
 * step below (a "fail" branch — disqualified/no-show/rejected — is tracked
 * per step rather than as its own step).
 */
const PIPELINE_STEPS = [
  { id: 'sourced', label: 'Sourced from network', statuses: ['sourced'] },
  { id: 'qualified', label: 'Qualified (match ≥ 80%)', statuses: ['qualified'], failStatuses: ['disqualified'] },
  { id: 'platform-contacted', label: 'Contacted on platform', statuses: ['platform-contacted'] },
  { id: 'contact-converted', label: 'Converted to email/phone', statuses: ['contact-converted'] },
  { id: 'direct-contacted', label: 'Direct outreach sent', statuses: ['direct-contacted'] },
  {
    id: 'online-session',
    label: 'Online consultation',
    statuses: ['online-invited', 'online-completed'],
    failStatuses: ['online-no-show'],
  },
  {
    id: 'in-person',
    label: 'In-person screening',
    statuses: ['in-person-invited', 'in-person-completed'],
    failStatuses: ['in-person-no-show'],
  },
  { id: 'pending-approval', label: 'Pending approval', statuses: ['pending-approval'] },
  { id: 'approved', label: 'Approved', statuses: ['approved'], failStatuses: ['rejected'] },
  { id: 'contract-sent', label: 'Contract sent', statuses: ['contract-sent'] },
];

function stepIndexForStatus(status) {
  const idx = PIPELINE_STEPS.findIndex((s) => s.statuses.includes(status));
  if (idx !== -1) return { index: idx, failed: false };
  const failIdx = PIPELINE_STEPS.findIndex((s) => (s.failStatuses || []).includes(status));
  if (failIdx !== -1) return { index: failIdx, failed: true };
  return { index: -1, failed: false };
}

/** Renders a single prospect's current position along the fixed step sequence. */
function renderStepper(container, currentIndex, failed) {
  const items = PIPELINE_STEPS.map((step, i) => {
    let cls = 'step';
    if (i < currentIndex) cls += ' step-done';
    else if (i === currentIndex) cls += failed ? ' step-failed' : ' step-current';
    return `<div class="${cls}"><span class="step-index">${i + 1}</span><span class="step-label">${step.label}</span></div>`;
  });
  container.innerHTML = `<div class="stepper-row">${items.join('<div class="step-connector"></div>')}</div>`;
}

async function refreshPipelineOverview() {
  const kpiContainer = document.getElementById('pipelineKpis');
  const funnelContainer = document.getElementById('pipelineFunnel');
  const quotaAlerts = document.getElementById('pipelineQuotaAlerts');
  try {
    const [{ resumes }, { landingPages }, { prospects }, { dutyScopes }, { nonCompliant }] = await Promise.all([
      apiFetch('/presentation/resumes'),
      apiFetch('/presentation/landing-pages'),
      apiFetch('/outreach/prospects'),
      apiFetch('/duty-scope'),
      apiFetch('/duty-scope/quota-status/non-compliant'),
    ]);

    const contractsSent = prospects.filter((p) => p.status === 'contract-sent').length;
    const activeDutyScopes = dutyScopes.filter((d) => d.active).length;

    kpiContainer.innerHTML = [
      { label: 'Landing pages', value: landingPages.length },
      { label: 'Resumes received', value: resumes.length },
      { label: 'Prospects sourced', value: prospects.length },
      { label: 'Contracts sent', value: contractsSent },
      { label: 'Active duty scopes', value: activeDutyScopes },
      { label: 'Quotas currently short', value: nonCompliant.length },
    ]
      .map((k) => `<div class="kpi-card"><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>`)
      .join('');

    const counts = PIPELINE_STEPS.map(() => 0);
    let failedCount = 0;
    prospects.forEach((p) => {
      const { index, failed } = stepIndexForStatus(p.status);
      if (index === -1) return;
      if (failed) failedCount += 1;
      else counts[index] += 1;
    });
    const funnelSteps = PIPELINE_STEPS.map(
      (step, i) =>
        `<div class="step step-done"><span class="step-index">${i + 1}</span><span class="step-label">${step.label}</span><span class="step-count">${counts[i]}</span></div>`
    ).join('<div class="step-connector"></div>');
    funnelContainer.innerHTML =
      `<div class="stepper-row">${funnelSteps}</div>` +
      (failedCount ? `<p class="hint">${failedCount} prospect(s) disqualified / no-show / rejected along the way.</p>` : '');

    quotaAlerts.innerHTML = nonCompliant.length
      ? nonCompliant
          .map(
            (entry) =>
              `<div class="card"><h4>${entry.dutyScopeId}</h4><div>Prospect: ${entry.prospectId}</div>${entry.statuses
                .map((s) => `<div>${s.metric}: ${s.currentCount}/${s.minCount} (short by ${s.deficit})</div>`)
                .join('')}</div>`
          )
          .join('')
      : '<p class="hint">All contract-term quotas are currently met.</p>';
  } catch (err) {
    kpiContainer.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupPipelineTrackForm() {
  document.getElementById('pipelineTrackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('pipelineProspectId').value.trim();
    const container = document.getElementById('pipelineProspectStepper');
    if (!id) return;
    try {
      const { prospect } = await apiFetch(`/outreach/prospects/${encodeURIComponent(id)}`);
      const { index, failed } = stepIndexForStatus(prospect.status);
      renderStepper(container, index, failed);

      let extraHtml = `<p class="hint">Status: <strong>${prospect.status}</strong></p>`;
      if (prospect.status === 'contract-sent') {
        const { dutyScopes } = await apiFetch(`/duty-scope?prospectId=${encodeURIComponent(id)}`);
        if (dutyScopes.length) {
          const cards = await Promise.all(
            dutyScopes.map(async (d) => {
              const { statuses } = await apiFetch(`/duty-scope/${d.id}/quota-status`);
              return `<div class="card"><h4>Duty scope ${d.id}</h4><div>${d.visitsPerPeriod} visit(s) / ${d.period}</div>${
                statuses.length
                  ? statuses
                      .map(
                        (s) =>
                          `<div>${s.metric}: ${s.currentCount}/${s.minCount} — ${
                            s.compliant ? 'OK' : `short by ${s.deficit}`
                          }</div>`
                      )
                      .join('')
                  : '<div>No contract-term quotas set.</div>'
              }</div>`;
            })
          );
          extraHtml += `<div class="cards">${cards.join('')}</div>`;
        } else {
          extraHtml += '<p class="hint">No duty scope defined yet for this prospect.</p>';
        }
      }
      container.insertAdjacentHTML('beforeend', extraHtml);
    } catch (err) {
      container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setupTrendForm() {
  document.getElementById('trendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const platform = document.getElementById('trendPlatform').value;
    const keyword = document.getElementById('trendKeyword').value;
    const source = document.getElementById('trendSource').value;
    try {
      await apiFetch('/content-studio/trends', {
        method: 'POST',
        body: JSON.stringify({ platform, keyword, source }),
      });
      document.getElementById('trendKeyword').value = '';
      document.getElementById('trendSource').value = '';
      refreshTrends(platform);
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshTrends(platform) {
  const container = document.getElementById('trendsList');
  try {
    const { trends } = await apiFetch(`/content-studio/trends?platform=${encodeURIComponent(platform)}`);
    container.innerHTML = trends.length
      ? trends
          .map((t) => `<div class="card"><h4>${escapeHtml(t.keyword)}</h4><div>${escapeHtml(t.platform)} — ${escapeHtml(t.source)}</div></div>`)
          .join('')
      : `<p class="hint">No trends recorded yet for ${escapeHtml(platform)}.</p>`;
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupContentBriefForm() {
  document.getElementById('contentBriefForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cbId').value || undefined;
    const platform = document.getElementById('cbPlatform').value;
    const accountKind = document.getElementById('cbAccountKind').value;
    const topic = document.getElementById('cbTopic').value;
    const referenceStyle = document.getElementById('cbReferenceStyle').value || undefined;
    const trendKeywords = document
      .getElementById('cbTrendKeywords')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const { brief } = await apiFetch('/content-studio/briefs', {
        method: 'POST',
        body: JSON.stringify({ id, platform, accountKind, topic, referenceStyle, trendKeywords }),
      });
      document.getElementById('cpBriefId').value = brief.id;
      refreshContentBriefs();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshContentBriefs() {
  const container = document.getElementById('contentBriefsList');
  try {
    const { briefs } = await apiFetch('/content-studio/briefs');
    container.innerHTML = briefs.length
      ? briefs
          .map(
            (b) =>
              `<div class="card"><h4>${escapeHtml(b.id)}</h4><div>${escapeHtml(b.platform)} / ${escapeHtml(
                b.accountKind
              )}</div><div>Bio: ${escapeHtml(b.bio)}</div><div>Description: ${escapeHtml(
                b.description
              )}</div><div><button data-view-items="${b.id}">View content plan</button></div></div>`
          )
          .join('')
      : '<p class="hint">No content briefs yet.</p>';
    container.querySelectorAll('button[data-view-items]').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.getElementById('cpBriefId').value = btn.dataset.viewItems;
        refreshContentItems(btn.dataset.viewItems);
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupContentPlanForm() {
  document.getElementById('contentPlanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const briefId = document.getElementById('cpBriefId').value;
    const count = Number(document.getElementById('cpCount').value) || 9;
    try {
      await apiFetch(`/content-studio/briefs/${briefId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      refreshContentItems(briefId);
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderDestination(itemId, d) {
  const statusClass = d.status === 'published' ? 'connected' : d.status === 'manual-fallback' ? 'invalid' : 'unverified';
  return `<div>${escapeHtml(d.channel)}: <strong class="status ${statusClass}">${escapeHtml(d.status)}</strong>${
    d.failureReason ? ` — ${escapeHtml(d.failureReason)}` : ''
  } <button data-publish-item="${itemId}" data-publish-channel="${d.channel}">Publish</button></div>`;
}

async function refreshContentItems(briefId) {
  const container = document.getElementById('contentItemsList');
  if (!briefId) {
    container.innerHTML = '';
    return;
  }
  try {
    const { items } = await apiFetch(`/content-studio/briefs/${briefId}/items`);
    container.innerHTML = items.length
      ? items
          .map(
            (i) =>
              `<div class="card"><h4>#${i.index + 1} — ${escapeHtml(i.type)}</h4><div>${escapeHtml(
                i.caption
              )}</div><div class="hint">${escapeHtml(i.mediaBrief)}</div>${i.destinations
                .map((d) => renderDestination(i.id, d))
                .join('')}</div>`
          )
          .join('')
      : '<p class="hint">No content plan generated yet for this brief.</p>';
    container.querySelectorAll('button[data-publish-item]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(
            `/content-studio/items/${btn.dataset.publishItem}/publish/${btn.dataset.publishChannel}`,
            { method: 'POST' }
          );
          refreshContentItems(briefId);
          refreshContentFallbackQueue();
        } catch (err) {
          alert(err.message);
        }
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

const ROUTE_LABELS = {
  'direct-network': '1. Direct network search & outreach',
  'job-posting': '2. Job posting + landing page',
  'resume-intake': '3. Resume intake (LinkedIn/Indeed)',
};

function switchToTab(tabName) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
}

async function refreshMissionGroups() {
  const container = document.getElementById('missionGroupsList');
  try {
    const { audienceProfiles } = await apiFetch('/presentation/audience-profiles?onlyActive=false');
    container.innerHTML = audienceProfiles.length
      ? audienceProfiles
          .map((p) => {
            const routeLabel = p.route ? ROUTE_LABELS[p.route] || p.route : 'no route chosen yet';
            const regions = p.regions && p.regions.length ? p.regions.join(', ') : '—';
            const cap = p.dailyCap !== undefined && p.dailyCap !== null ? p.dailyCap : 'no cap';
            const hours = p.workingHours ? `${p.workingHours.startHour}:00-${p.workingHours.endHour}:00` : '—';
            return `<div class="card">
              <h4>${escapeHtml(p.label)} (${escapeHtml(p.id)}) ${p.active ? '<span class="status connected">active</span>' : '<span class="status unverified">inactive</span>'}</h4>
              <div>Route: ${escapeHtml(routeLabel)}</div>
              <div>Goals: ${escapeHtml(p.goals.join(', '))}</div>
              <div>Regions: ${escapeHtml(regions)}</div>
              <div>Daily cap: ${escapeHtml(String(cap))} · Hours: ${escapeHtml(hours)}</div>
              <div>
                <button data-action="mission-steps" data-id="${escapeHtml(p.id)}">Manage steps</button>
                <button data-action="mission-landing" data-id="${escapeHtml(p.id)}">Build landing page</button>
                <button data-action="mission-run" data-id="${escapeHtml(p.id)}">${p.active ? 'Open in Pipeline' : 'Start'}</button>
              </div>
            </div>`;
          })
          .join('')
      : '<p class="hint">No groups yet — add one below (e.g. freelancers-beauty, influencers, banking-network, plan-adjacent).</p>';

    container.querySelectorAll('button[data-action="mission-steps"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.getElementById('msGroupId').value = btn.dataset.id;
        refreshMissionStepPreview();
      })
    );
    container.querySelectorAll('button[data-action="mission-landing"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.getElementById('lpAudienceProfileId').value = btn.dataset.id;
        switchToTab('presentation');
      })
    );
    container.querySelectorAll('button[data-action="mission-run"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/presentation/audience-profiles/${btn.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ active: true }),
          });
          await refreshMissionGroups();
          switchToTab('pipeline');
        } catch (err) {
          alert(err.message);
        }
      })
    );
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

function setupMissionGroupForm() {
  document.getElementById('missionGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('mgId').value;
    const label = document.getElementById('mgLabel').value;
    const targetText = document.getElementById('mgTargetText').value;
    const goals = document
      .getElementById('mgGoals')
      .value.split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    const route = document.getElementById('mgRoute').value || undefined;
    const regions = document
      .getElementById('mgRegions')
      .value.split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const dailyCapRaw = document.getElementById('mgDailyCap').value;
    const dailyCap = dailyCapRaw ? Number(dailyCapRaw) : undefined;
    const startRaw = document.getElementById('mgHoursStart').value;
    const endRaw = document.getElementById('mgHoursEnd').value;
    const workingHours =
      startRaw && endRaw ? { startHour: Number(startRaw), endHour: Number(endRaw) } : undefined;
    try {
      const existing = await apiFetch('/presentation/audience-profiles?onlyActive=false');
      const already = existing.audienceProfiles.some((p) => p.id === id);
      const payload = {
        id,
        label,
        targetText,
        goals,
        route,
        regions: regions.length ? regions : undefined,
        dailyCap,
        workingHours,
      };
      if (already) {
        await apiFetch(`/presentation/audience-profiles/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/presentation/audience-profiles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      refreshMissionGroups();
      refreshAudienceProfiles();
    } catch (err) {
      alert(err.message);
    }
  });
}

function refreshMissionStepPreview() {
  const key = document.getElementById('msGroupId').value.trim();
  const preview = document.getElementById('missionStepPreview');
  if (!key) {
    preview.textContent = '';
    return;
  }
  apiFetch(`/outreach/scripts/${encodeURIComponent(key)}`)
    .then(({ script }) => {
      preview.textContent = `Steps/script for "${key}": ${script}`;
    })
    .catch((err) => {
      preview.textContent = `Failed to load: ${err.message}`;
    });
}

function setupMissionStepForm() {
  document.getElementById('msGroupId').addEventListener('change', refreshMissionStepPreview);
  document.getElementById('missionStepForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('msGroupId').value.trim();
    const base = document.getElementById('msBase').value;
    const custom = document.getElementById('msCustom').value;
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
      document.getElementById('msCustom').value = '';
      refreshMissionStepPreview();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function refreshContentFallbackQueue() {
  const container = document.getElementById('contentFallbackQueue');
  try {
    const { items } = await apiFetch('/content-studio/fallback-queue');
    container.innerHTML = items.length
      ? items
          .map(
            (i) =>
              `<div class="card"><h4>${escapeHtml(i.id)} — ${escapeHtml(i.type)}</h4><div>${escapeHtml(
                i.caption
              )}</div>${i.destinations
                .filter((d) => d.status === 'manual-fallback')
                .map((d) => `<div>${escapeHtml(d.channel)}: ${escapeHtml(d.failureReason || '')}</div>`)
                .join('')}</div>`
          )
          .join('')
      : '<p class="hint">Nothing waiting for manual posting.</p>';
  } catch (err) {
    container.innerHTML = `<p class="hint">Failed to load: ${err.message}</p>`;
  }
}

setupTabs();
setupApiKeyBar();
populateProviderSelect();
setupMissionGroupForm();
setupMissionStepForm();
setupConnectionForm();
setupMarketForm();
setupAudienceProfileForm();
setupCommissionModelForm();
setupResumeForm();
setupLandingPageForm();
setupOutreachScriptForm();
setupProspectForm();
setupCompliancePolicyForm();
setupDutyScopeForm();
setupDutyQuotaReadingForm();
setupDutyComplianceForm();
setupPipelineTrackForm();
setupTrendForm();
setupContentBriefForm();
setupContentPlanForm();
refreshMissionGroups();
refreshConnections();
refreshMarkets();
refreshAudienceProfiles();
refreshCommissionModels();
refreshResumes();
refreshLandingPages();
refreshProspects();
refreshCompliancePolicies();
refreshDutyScopes();
refreshPipelineOverview();
refreshContentBriefs();
refreshContentFallbackQueue();
