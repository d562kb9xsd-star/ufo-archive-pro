// ===== CONFIG =====
const ADMIN_PASSWORD = "ufocases123"; // change this if you want

// ===== ELEMENTS =====
const loginWrap = document.getElementById("admin-login");
const protectedWrap = document.getElementById("admin-protected");
const passwordInput = document.getElementById("admin-password");
const loginBtn = document.getElementById("admin-login-btn");
const loginStatus = document.getElementById("admin-login-status");
const signoutBtn = document.getElementById("admin-signout-btn");
const listEl = document.getElementById("admin-list");
const statusEl = document.getElementById("admin-status");

// ===== HELPERS =====
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
    return `
      <div style="margin:14px 0;">
        <video src="${url}" controls style="max-width:100%; border-radius:12px;"></video>
      </div>
    `;
  }

  return `
    <div style="margin:14px 0;">
      <img src="${url}" alt="UFO evidence" style="max-width:100%; border-radius:12px;" />
    </div>
  `;
}

// ===== LOAD CASES =====
async function loadPending() {
  statusEl.textContent = "Loading pending cases...";
  listEl.innerHTML = "";

  try {
    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      "/rest/v1/cases?status=eq.pending&select=*&order=created_at.desc";

    const res = await fetch(url, {
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      statusEl.textContent = "Error loading cases: " + text;
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = "No pending cases.";
      return;
    }

    statusEl.textContent = "";

    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "case";

      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || "Unknown")}</p>
        <p>${escapeHtml(item.summary || "")}</p>

        ${mediaHtml(item)}

        <div class="admin-actions">
          <button data-action="approve" data-id="${item.id}">Approve</button>
          <button data-action="reject" data-id="${item.id}">Reject</button>
        </div>
        <hr>
      `;

      listEl.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected error loading cases.";
  }
}

// ===== UPDATE CASE =====
async function updateCase(id, newStatus) {
  statusEl.textContent = "Updating case...";

  try {
    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      `/rest/v1/cases?id=eq.${encodeURIComponent(id)}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      const text = await res.text();
      statusEl.textContent = "Update failed: " + text;
      return;
    }

    statusEl.textContent = `Case marked as ${newStatus}.`;
    await loadPending();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected update error.";
  }
}

// ===== LOGIN =====
function unlockAdmin() {
  const entered = passwordInput.value.trim();

  console.log("Entered:", entered); // debug

  if (entered !== ADMIN_PASSWORD) {
    loginStatus.textContent = "Wrong password.";
    return;
  }

  sessionStorage.setItem("ufo_admin_unlocked", "yes");

  loginStatus.textContent = "";
  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";

  loadPending();
}

// ===== LOGOUT =====
function lockAdmin() {
  sessionStorage.removeItem("ufo_admin_unlocked");

  protectedWrap.style.display = "none";
  loginWrap.style.display = "block";

  loginStatus.textContent = "Admin locked.";
  statusEl.textContent = "";
  listEl.innerHTML = "";
  passwordInput.value = "";
}

// ===== EVENTS =====
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
});

// ===== AUTO LOGIN =====
if (sessionStorage.getItem("ufo_admin_unlocked") === "yes") {
  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";
  loadPending();
}
