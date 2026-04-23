const ADMIN_PASSWORD = "ufocases123";

const loginArea = document.getElementById("loginArea");
const adminArea = document.getElementById("adminArea");
const passwordInput = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const lockBtn = document.getElementById("lockBtn");
const loginStatus = document.getElementById("loginStatus");
const statusEl = document.getElementById("status");
const casesEl = document.getElementById("cases");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showAdmin() {
  loginArea.style.display = "none";
  adminArea.style.display = "block";
}

function showLogin() {
  adminArea.style.display = "none";
  loginArea.style.display = "grid";
}

async function loadCases() {
  statusEl.textContent = "Loading reports...";
  casesEl.innerHTML = "";

  try {
    const url =
      `${window.UFO_APP_CONFIG.supabaseUrl}/rest/v1/cases?select=*&order=created_at.desc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      statusEl.textContent = "Error loading reports: " + text;
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = "No reports found.";
      return;
    }

    statusEl.textContent = "";

    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "case";

      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Status:</strong> ${escapeHtml(item.status || "unknown")}</p>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "-")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || "-")}</p>
        <p>${escapeHtml(item.summary || "")}</p>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" data-action="approve" data-id="${item.id}">Approve</button>
          <button type="button" class="btn btn-secondary" data-action="reject" data-id="${item.id}">Reject</button>
          <button type="button" class="btn btn-secondary" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      `;

      casesEl.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected error loading reports.";
  }
}

async function updateCaseStatus(id, newStatus) {
  statusEl.textContent = `Updating case to ${newStatus}...`;

  try {
    const url = `${window.UFO_APP_CONFIG.supabaseUrl}/rest/v1/cases?id=eq.${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const text = await response.text();
      statusEl.textContent = "Update failed: " + text;
      return;
    }

    await loadCases();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected update error.";
  }
}

async function deleteCase(id) {
  statusEl.textContent = "Deleting case...";

  try {
    const url = `${window.UFO_APP_CONFIG.supabaseUrl}/rest/v1/cases?id=eq.${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
        Prefer: "return=minimal"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      statusEl.textContent = "Delete failed: " + text;
      return;
    }

    await loadCases();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected delete error.";
  }
}

function unlockAdmin() {
  const entered = passwordInput.value.trim();

  if (entered !== ADMIN_PASSWORD) {
    loginStatus.textContent = "Wrong password.";
    return;
  }

  sessionStorage.setItem("ufo_admin_unlocked", "yes");
  loginStatus.textContent = "";
  showAdmin();
  loadCases();
}

function lockAdmin() {
  sessionStorage.removeItem("ufo_admin_unlocked");
  passwordInput.value = "";
  loginStatus.textContent = "";
  statusEl.textContent = "";
  casesEl.innerHTML = "";
  showLogin();
}

loginBtn.addEventListener("click", unlockAdmin);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    unlockAdmin();
  }
});

lockBtn.addEventListener("click", lockAdmin);

casesEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "approve") {
    await updateCaseStatus(id, "approved");
  }

  if (action === "reject") {
    await updateCaseStatus(id, "rejected");
  }

  if (action === "delete") {
    const ok = confirm("Delete this report permanently?");
    if (!ok) return;
    await deleteCase(id);
  }
});

if (sessionStorage.getItem("ufo_admin_unlocked") === "yes") {
  showAdmin();
  loadCases();
} else {
  showLogin();
}
