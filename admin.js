const supabase = window.supabase.createClient(
  window.UFO_APP_CONFIG.supabaseUrl,
  window.UFO_APP_CONFIG.supabaseAnonKey
);

const loginWrap = document.getElementById("admin-login");
const protectedWrap = document.getElementById("admin-protected");
const emailInput = document.getElementById("admin-email");
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

async function loadPending() {
  statusEl.textContent = "Loading pending cases...";
  listEl.innerHTML = "";

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    statusEl.textContent = "Error loading cases: " + error.message;
    return;
  }

  statusEl.textContent = "";

  if (!data || data.length === 0) {
    listEl.innerHTML = "<p>No pending cases.</p>";
    return;
  }

  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "case";
    card.innerHTML = `
      <h3>${escapeHtml(item.title || "Untitled")}</h3>
      <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
      <p><strong>Date:</strong> ${escapeHtml(item.date_observed || "Unknown")}</p>
      <p>${escapeHtml(item.summary || "")}</p>
      <div class="admin-actions">
        <button class="btn btn-primary" data-action="approve" data-id="${item.id}">Approve</button>
        <button class="btn btn-secondary" data-action="reject" data-id="${item.id}">Reject</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

async function updateCase(id, newStatus) {
  statusEl.textContent = "Updating case...";

  const { error } = await supabase
    .from("cases")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    statusEl.textContent = "Update failed: " + error.message;
    return;
  }

  statusEl.textContent = `Case marked as ${newStatus}.`;
  await loadPending();
}

async function signIn(email, password) {
  loginStatus.textContent = "Signing in...";
  loginBtn.disabled = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginStatus.textContent = "Sign-in failed: " + error.message;
      return;
    }

    if (!data.user) {
      loginStatus.textContent = "No user returned.";
      return;
    }

    loginStatus.textContent = "Checking admin profile...";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      loginStatus.textContent = "Profile check failed: " + profileError.message;
      return;
    }

    if (!profile || profile.role !== "admin") {
      loginStatus.textContent = "Not authorised.";
      await supabase.auth.signOut();
      return;
    }

    loginStatus.textContent = "Success.";
    loginWrap.style.display = "none";
    protectedWrap.style.display = "block";
    await loadPending();
  } catch (err) {
    console.error(err);
    loginStatus.textContent = "Unexpected error during sign-in.";
  } finally {
    loginBtn.disabled = false;
  }
}

async function checkSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    loginWrap.style.display = "block";
    protectedWrap.style.display = "none";
    return;
  }

  const user = data.session.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    loginWrap.style.display = "block";
    protectedWrap.style.display = "none";
    loginStatus.textContent = "Not authorised.";
    return;
  }

  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";
  await loadPending();
}

async function signOut() {
  await supabase.auth.signOut();
  protectedWrap.style.display = "none";
  loginWrap.style.display = "block";
  loginStatus.textContent = "Signed out.";
  statusEl.textContent = "";
  listEl.innerHTML = "";
  passwordInput.value = "";
}

loginBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginStatus.textContent = "Enter email and password.";
    return;
  }

  await signIn(email, password);
});

passwordInput?.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      loginStatus.textContent = "Enter email and password.";
      return;
    }

    await signIn(email, password);
  }
});

signoutBtn?.addEventListener("click", signOut);

listEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "approve") await updateCase(id, "approved");
  if (action === "reject") await updateCase(id, "rejected");
});

checkSession();
