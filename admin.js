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
  if (!listEl || !statusEl) return;

  statusEl.textContent = "Loading pending cases...";
  listEl.innerHTML = "";

  try {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      statusEl.textContent = `Error loading cases: ${error.message}`;
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
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error loading pending cases.";
  }
}

async function updateCase(id, newStatus) {
  statusEl.textContent = "Updating case...";

  try {
    const { error } = await supabase
      .from("cases")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      statusEl.textContent = `Update failed: ${error.message}`;
      return;
    }

    statusEl.textContent = `Case marked as ${newStatus}.`;
    await loadPending();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error updating case.";
  }
}

async function signIn(email, password) {
  loginStatus.textContent = "Signing in...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginStatus.textContent = "Sign-in failed: " + error.message;
    return;
  }

  const user = data.user;

  if (!user) {
    loginStatus.textContent = "No user returned.";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
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

  loginStatus.textContent = "";
  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";
  await loadPending();
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

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      loginStatus.textContent = "Enter email and password.";
      return;
    }

    await signIn(email, password);
  });
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", async (event) => {
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
}

if (signoutBtn) {
  signoutBtn.addEventListener("click", signOut);
}

if (listEl) {
  listEl.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "approve") {
      await updateCase(id, "approved");
    } else if (action === "reject") {
      await updateCase(id, "rejected");
    }
  });
}

checkSession();
