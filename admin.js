const ADMIN_PASSWORD = "ufocases123";

const loginWrap = document.getElementById("admin-login");
const protectedWrap = document.getElementById("admin-protected");
const passwordInput = document.getElementById("admin-password");
const loginBtn = document.getElementById("admin-login-btn");
const loginStatus = document.getElementById("admin-login-status");
const signoutBtn = document.getElementById("admin-signout-btn");
const listEl = document.getElementById("admin-list");
const statusEl = document.getElementById("admin-status");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mediaHtml(item) {
  if (!item.media_url) return "";

  const url = escapeHtml(item.media_url);
  const type = item.media_type || "";

  if (type.startsWith("video")) {
    return `<video src="${url}" controls></video>`;
  }

  return `<img src="${url}" alt="UFO evidence" />`;
}

async function loadCases() {
  statusEl.textContent = "Loading cases...";
  listEl.innerHTML = "";

  try {
    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      "/rest/v1/cases?select=*&order=created_at.desc&_=" +
      Date.now();

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
        "Cache-Control": "no-cache"
      }
    });

    const data = await res.json();

    listEl.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = "No cases found.";
      return;
    }

    statusEl.textContent = "";

    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "case";

      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Status:</strong> ${escapeHtml(item.status || "Unknown")}</p>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || item.created_at || "Unknown")}</p>
        <p>${escapeHtml(item.summary || item.description || "")}</p>

        ${mediaHtml(item)}

        <button data-action="approve" data-id="${item.id}">Approve</button>
        <button data-action="reject" data-id="${item.id}">Reject</button>
        <button class="danger" data-action="delete" data-id="${item.id}">Delete</button>
      `;

      listEl.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error loading cases.";
  }
}

async function updateCase(id, status) {
  statusEl.textContent = "Updating case...";

  const url =
    window.UFO_APP_CONFIG.supabaseUrl +
    `/rest/v1/cases?id=eq.${encodeURIComponent(id)}`;

  await fetch(url, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ status })
  });

  await loadCases();
}

async function deleteCase(id) {
  if (!confirm("Delete this case permanently?")) return;

  statusEl.textContent = "Deleting case...";

  const getUrl =
    window.UFO_APP_CONFIG.supabaseUrl +
    `/rest/v1/cases?id=eq.${encodeURIComponent(id)}&select=media_path`;

  const getRes = await fetch(getUrl, {
    cache: "no-store",
    headers: {
      apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
      "Cache-Control": "no-cache"
    }
  });

  let mediaPath = null;

  if (getRes.ok) {
    const data = await getRes.json();
    mediaPath = data?.[0]?.media_path || null;
  }

  if (mediaPath) {
    await fetch(
      window.UFO_APP_CONFIG.supabaseUrl +
        `/storage/v1/object/ufo-media/${mediaPath}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: {
          apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
        }
      }
    );
  }

  const deleteUrl =
    window.UFO_APP_CONFIG.supabaseUrl +
    `/rest/v1/cases?id=eq.${encodeURIComponent(id)}`;

  await fetch(deleteUrl, {
    method: "DELETE",
    cache: "no-store",
    headers: {
      apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
      "Cache-Control": "no-cache",
      Prefer: "return=minimal"
    }
  });

  await loadCases();
}

function unlockAdmin() {
  const entered = passwordInput.value.trim();

  if (entered !== ADMIN_PASSWORD) {
    loginStatus.textContent = "Wrong password.";
    return;
  }

  sessionStorage.setItem("ufo_admin_unlocked", "yes");

  loginStatus.textContent = "";
  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";

  loadCases();
}

function lockAdmin() {
  sessionStorage.removeItem("ufo_admin_unlocked");
  protectedWrap.style.display = "none";
  loginWrap.style.display = "block";
  listEl.innerHTML = "";
  statusEl.textContent = "";
  passwordInput.value = "";
}

loginBtn.addEventListener("click", unlockAdmin);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlockAdmin();
});

signoutBtn.addEventListener("click", lockAdmin);

listEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "approve") await updateCase(id, "approved");
  if (action === "reject") await updateCase(id, "rejected");
  if (action === "delete") await deleteCase(id);
});

if (sessionStorage.getItem("ufo_admin_unlocked") === "yes") {
  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";
  loadCases();
}
