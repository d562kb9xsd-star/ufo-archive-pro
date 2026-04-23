const supabase = window.supabase.createClient(
  window.UFO_APP_CONFIG.supabaseUrl,
  window.UFO_APP_CONFIG.supabaseAnonKey
);

const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const casesList = document.getElementById("cases-list");
const statusEl = document.getElementById("status");
const signoutBtn = document.getElementById("signout-btn");

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
  console.log(message);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function checkAdmin(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  console.log("PROFILE:", profile, error);

  if (error) {
    setStatus("Profile error: " + error.message);
    return false;
  }

  if (!profile || profile.role !== "admin") {
    setStatus("Access denied: not admin");
    return false;
  }

  return true;
}

async function loadCases() {
  setStatus("Loading cases...");

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log("CASES:", data, error);

  if (error) {
    setStatus("Cases error: " + error.message);
    return;
  }

  casesList.innerHTML = "";

  if (!data || data.length === 0) {
    setStatus("No pending cases");
    return;
  }

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "case";

    div.innerHTML = `
      <h3>${escapeHtml(item.title || "No title")}</h3>
      <p><strong>Location:</strong> ${escapeHtml(item.location || "-")}</p>
      <p><strong>Date:</strong> ${escapeHtml(item.date_observed || "-")}</p>
      <p>${escapeHtml(item.summary || "")}</p>
      <div class="admin-actions">
        <button class="btn btn-primary" data-action="approve" data-id="${item.id}">Approve</button>
        <button class="btn btn-secondary" data-action="reject" data-id="${item.id}">Reject</button>
      </div>
    `;

    casesList.appendChild(div);
  });

  setStatus("");
}

async function approve(id) {
  setStatus("Approving...");

  const { error } = await supabase
    .from("cases")
    .update({ status: "approved" })
    .eq("id", id);

  console.log("APPROVE:", error);

  if (error) {
    setStatus("Approve error: " + error.message);
    return;
  }

  await loadCases();
}

async function reject(id) {
  setStatus("Rejecting...");

  const { error } = await supabase
    .from("cases")
    .update({ status: "rejected" })
    .eq("id", id);

  console.log("REJECT:", error);

  if (error) {
    setStatus("Reject error: " + error.message);
    return;
  }

  await loadCases();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setStatus("Enter email and password");
    return;
  }

  setStatus("Signing in...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("LOGIN:", data, error);

  if (error) {
    setStatus("Login failed: " + error.message);
    return;
  }

  if (!data.user) {
    setStatus("No user returned");
    return;
  }

  setStatus("Checking admin access...");

  const isAdmin = await checkAdmin(data.user.id);
  if (!isAdmin) {
    return;
  }

  loginForm.style.display = "none";
  adminPanel.style.display = "block";
  await loadCases();
});

casesList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "approve") {
    await approve(id);
  } else if (action === "reject") {
    await reject(id);
  }
});

signoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  adminPanel.style.display = "none";
  loginForm.style.display = "grid";
  casesList.innerHTML = "";
  setStatus("Signed out");
});

(async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  console.log("SESSION:", session);

  if (!session || !session.user) return;

  const isAdmin = await checkAdmin(session.user.id);
  if (!isAdmin) return;

  loginForm.style.display = "none";
  adminPanel.style.display = "block";
  await loadCases();
})();
