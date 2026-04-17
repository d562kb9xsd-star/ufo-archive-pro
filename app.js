const cfg = window.UFO_APP_CONFIG || {};
const hasKeys =
  cfg.supabaseUrl &&
  cfg.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  cfg.supabaseAnonKey &&
  cfg.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient = hasKeys
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  : null;

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setSiteName() {
  qsa('[data-site-name]').forEach((el) => {
    el.textContent = cfg.siteName || 'UFO Archive Pro';
  });
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function renderMedia(caseItem) {
  if (!caseItem.media_url) return '';

  if (caseItem.type === 'video') {
    return `<video class="media" controls src="${caseItem.media_url}"></video>`;
  }

  if (caseItem.type === 'image') {
    return `<img class="media" src="${caseItem.media_url}" alt="${escapeHtml(caseItem.title || '')}">`;
  }

  return `<a class="button button-secondary inline-button" href="${caseItem.media_url}" target="_blank" rel="noreferrer">Open attachment</a>`;
}

function showNotice(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

async function getCurrentUser() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getUser();
  return data.user || null;
}

async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) return false;
  return data.role === 'admin';
}

async function uploadMedia(file) {
  if (!file) return { path: '', url: '' };

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabaseClient
    .storage
    .from('ufo-media')
    .upload(safeName, file, { upsert: false });

  if (error) throw error;

  const { data: pub } = supabaseClient
    .storage
    .from('ufo-media')
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: pub.publicUrl
  };
}

function caseDetails(caseItem) {
  return `
    <div class="case-detail">
      <div class="badges">
        <span class="badge">${escapeHtml(caseItem.type || '')}</span>
        <span class="badge badge-${escapeHtml(caseItem.status || 'pending')}">${escapeHtml(caseItem.status || 'pending')}</span>
        <span class="badge">${escapeHtml(caseItem.location || '')}</span>
      </div>
      <h2>${escapeHtml(caseItem.title || 'Untitled')}</h2>
      <p class="meta">Observed: ${formatDate(caseItem.date_observed || caseItem.created_at)}</p>
      <p>${escapeHtml(caseItem.summary || '')}</p>
      ${renderMedia(caseItem)}
      ${caseItem.description ? `<h3>Description</h3><p>${escapeHtml(caseItem.description)}</p>` : ''}
      ${caseItem.case_study ? `<h3>Case study</h3><p>${escapeHtml(caseItem.case_study).replace(/\n/g, '<br>')}</p>` : ''}
      ${caseItem.submitter_email ? `<p class="meta">Submitter email: ${escapeHtml(caseItem.submitter_email)}</p>` : ''}
    </div>
  `;
}

function bindDetailButtons(items) {
  qsa('[data-view]').forEach((btn) => {
    btn.onclick = () => {
      const selected = items.find((item) => String(item.id) === String(btn.dataset.view));
      if (!selected) return;

      const content = qs('#case-modal-content');
      if (content) content.innerHTML = caseDetails(selected);

      qs('#case-modal')?.classList.remove('hidden');
    };
  });
}

async function loadArchive() {
  const root = qs('#archive-results');
  if (!root) return;

  if (!supabaseClient) {
    root.innerHTML = '<div class="glass empty-state">Add your Supabase keys in config.js to load live data.</div>';
    return;
  }

  const search = (qs('#search')?.value || '').toLowerCase().trim();
  const type = qs('#type-filter')?.value || 'all';

  let query = supabaseClient
    .from('cases')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    root.innerHTML = `<div class="glass empty-state">${escapeHtml(error.message)}</div>`;
    return;
  }

  const filtered = (data || []).filter((item) => {
    if (!search) return true;

    return [
      item.title,
      item.location,
      item.summary,
      item.description,
      item.case_study,
      ...(item.tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  if (!filtered.length) {
    root.innerHTML = '<div class="glass empty-state">No approved cases match that search.</div>';
    return;
  }

  root.innerHTML = filtered.map((item) => `
    <article class="glass case-card" data-id="${item.id}">
      <div class="card-top">
        <div>
          <div class="badges">
            <span class="badge">${escapeHtml(item.type || '')}</span>
            <span class="badge badge-${escapeHtml(item.status || 'approved')}">${escapeHtml(item.status || 'approved')}</span>
          </div>
          <h3>${escapeHtml(item.title || 'Untitled')}</h3>
          <p class="meta">${escapeHtml(item.location || '')} • ${formatDate(item.date_observed || item.created_at)}</p>
        </div>
      </div>

      <p>${escapeHtml(item.summary || '')}</p>
      ${renderMedia(item)}

      ${(item.tags || []).length
        ? `<div class="badges">${item.tags.map((t) => `<span class="badge">#${escapeHtml(t)}</span>`).join('')}</div>`
        : ''}

      <div class="card-actions">
        <button class="button button-secondary" data-view="${item.id}">View details</button>
      </div>
    </article>
  `).join('');

  bindDetailButtons(filtered);
}

function bindModalClose() {
  qsa('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => {
      qs('#case-modal')?.classList.add('hidden');
    });
  });
}

async function handleSubmit() {
  const form = qs('#submit-form');
  if (!form) return;

  const notice = qs('#submit-notice');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      showNotice(notice, 'Add your Supabase keys in config.js first.', true);
      return;
    }

    try {
      showNotice(notice, 'Uploading and saving your case...');

      const formData = new FormData(form);
      const file = formData.get('media');
      const upload = file && file.size ? await uploadMedia(file) : { path: '', url: '' };
      const tags = String(formData.get('tags') || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const user = await getCurrentUser();

      const payload = {
        title: String(formData.get('title') || '').trim(),
        type: String(formData.get('type') || '').trim(),
        date_observed: formData.get('date_observed') || null,
        location: String(formData.get('location') || '').trim(),
        summary: String(formData.get('summary') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        case_study: String(formData.get('case_study') || '').trim(),
        tags,
        media_path: upload.path,
        media_url: upload.url,
        status: 'pending',
        submitter_email: String(formData.get('submitter_email') || '').trim() || null,
        created_by: user?.id || null
      };

      const { error } = await supabaseClient.from('cases').insert(payload);
      if (error) throw error;

      form.reset();
      showNotice(notice, 'Submission received. It is now pending review.');
    } catch (error) {
      showNotice(notice, error.message || 'Submission failed.', true);
    }
  });
}

async function handleAdmin() {
  const loginView = qs('#login-view');
  const adminView = qs('#admin-view');
  const loginForm = qs('#admin-login-form');
  const notice = qs('#admin-notice');
  const logout = qs('#logout-button');
  const listRoot = qs('#admin-cases');

  if (!loginView || !adminView || !loginForm) return;

  let currentAdminFilter = 'pending';

  async function renderAdminCases() {
    let query = supabaseClient
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (currentAdminFilter !== 'all') {
      query = query.eq('status', currentAdminFilter);
    }

    const { data, error } = await query;

    if (error) {
      showNotice(notice, error.message, true);
      return;
    }

    if (!listRoot) return;

    window.adminCases = data || [];

    const toolbar = `
      <div class="glass archive-toolbar">
        <button class="button ${currentAdminFilter === 'pending' ? '' : 'button-secondary'}" onclick="window.setAdminFilter('pending')">Pending</button>
        <button class="button ${currentAdminFilter === 'approved' ? '' : 'button-secondary'}" onclick="window.setAdminFilter('approved')">Approved</button>
        <button class="button ${currentAdminFilter === 'rejected' ? '' : 'button-secondary'}" onclick="window.setAdminFilter('rejected')">Rejected</button>
        <button class="button ${currentAdminFilter === 'all' ? '' : 'button-secondary'}" onclick="window.setAdminFilter('all')">All</button>
      </div>
    `;

    const cards = (data || []).map((item) => `
      <article class="glass case-card">
        <div class="badges">
          <span class="badge">${escapeHtml(item.type || '')}</span>
          <span class="badge badge-${escapeHtml(item.status || 'pending')}">${escapeHtml(item.status || 'pending')}</span>
        </div>

        <h3>${escapeHtml(item.title || 'Untitled')}</h3>
        <p class="meta">${escapeHtml(item.location || '')} • ${formatDate(item.date_observed || item.created_at)}</p>
        <p>${escapeHtml(item.description || item.summary || '')}</p>

        ${item.media_url ? renderMedia(item) : ''}

        <div class="card-actions">
          <button class="button" onclick="window.updateCaseStatus('${item.id}', 'approved')">Approve</button>
          <button class="button button-secondary" onclick="window.updateCaseStatus('${item.id}', 'rejected')">Reject</button>
          <button class="button button-secondary" onclick="window.viewAdminCase('${item.id}')">View</button>
          <button class="button button-danger" onclick="window.deleteAdminCase('${item.id}')">Delete</button>
        </div>
      </article>
    `).join('');

    const emptyState = `
      <div class="glass empty-state">
        No ${escapeHtml(currentAdminFilter)} cases found.
      </div>
    `;

    listRoot.innerHTML = toolbar + ((data || []).length ? `<div class="cases-grid">${cards}</div>` : emptyState);
  }

  async function updateStatus(id, status) {
    const { error } = await supabaseClient
      .from('cases')
      .update({ status })
      .eq('id', id);

    if (error) {
      showNotice(notice, error.message, true);
      return;
    }

    showNotice(notice, `Case ${status}.`);
    await renderAdminCases();
  }

  async function deleteCase(id) {
    const { data: item } = await supabaseClient
      .from('cases')
      .select('media_path')
      .eq('id', id)
      .maybeSingle();

    if (item?.media_path) {
      await supabaseClient.storage.from('ufo-media').remove([item.media_path]);
    }

    const { error } = await supabaseClient
      .from('cases')
      .delete()
      .eq('id', id);

    if (error) {
      showNotice(notice, error.message, true);
      return;
    }

    showNotice(notice, 'Case deleted.');
    await renderAdminCases();
  }

  window.updateCaseStatus = updateStatus;
  window.deleteAdminCase = deleteCase;

  window.viewAdminCase = function (id) {
    const selected = (window.adminCases || []).find((item) => String(item.id) === String(id));
    if (!selected) return;

    const content = qs('#case-modal-content');
    if (content) content.innerHTML = caseDetails(selected);

    qs('#case-modal')?.classList.remove('hidden');
  };

  window.setAdminFilter = async function (filter) {
    currentAdminFilter = filter;
    await renderAdminCases();
  };

  async function refreshAuthView() {
    if (!supabaseClient) {
      loginView.classList.remove('hidden');
      adminView.classList.add('hidden');
      showNotice(notice, 'Supabase not configured', true);
      return;
    }

    const admin = await isAdmin();
    loginView.classList.toggle('hidden', admin);
    adminView.classList.toggle('hidden', !admin);

    if (admin) {
      await renderAdminCases();
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = qs('#admin-email')?.value?.trim();
    const password = qs('#admin-password')?.value;

    if (!supabaseClient) {
      showNotice(notice, 'Supabase not configured', true);
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showNotice(notice, error.message, true);
      return;
    }

    const user = data?.user;
    if (!user) {
      showNotice(notice, 'Login failed', true);
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      showNotice(notice, profileError.message, true);
      return;
    }

    if (!profile || profile.role !== 'admin') {
      showNotice(notice, `Signed in, but no admin profile matched this user. UID: ${user.id}`, true);
      return;
    }

    showNotice(notice, 'Signed in.');
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
    await renderAdminCases();
  });

  logout?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    adminView.classList.add('hidden');
    loginView.classList.remove('hidden');
    showNotice(notice, '');
  });

  await refreshAuthView();
}

function bindArchiveFilters() {
  qs('#search')?.addEventListener('input', loadArchive);
  qs('#type-filter')?.addEventListener('change', loadArchive);
}

setSiteName();
bindModalClose();
bindArchiveFilters();
loadArchive();
handleSubmit();
handleAdmin();
