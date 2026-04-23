const ADMIN_PASSWORD = "MyUfoAdmin2026!";

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
  loginArea.style.display = "block";
}

async function loadPendingCases() {
  statusEl.textContent = "Loading pending cases...";
  casesEl.innerHTML = "";

  try {
    const url =
      `${window.UFO_APP_CONFIG.supabaseUrl}/rest/v1/cases` +
      `?select=*&status=eq.pending&order=created_at.desc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      statusEl.textContent = "Error loading cases: " + text;
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = "No pending cases.";
      return;
    }

    statusEl.textContent = "";

    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "-")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || "-")}</p>
        <p>${escapeHtml(item.summary || "")}</p>
        <div class="actions">
          <button type="button" data-action="approve" data-id="${item.id}">Approve</button>
          <button type="button" class="secondary" data-action="reject" data-id="${item.id}">Reject</button>
        </div>
      `;
      casesEl.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected error loading cases.";
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

    await loadPendingCases();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unexpected update error.";
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
  loadPendingCases();
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
});

if (sessionStorage.getItem("ufo_admin_unlocked") === "yes") {
  showAdmin();
  loadPendingCases();
} else {
  showLogin();
}
