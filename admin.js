(() => {
  const supabase = window.supabase.createClient(
    window.UFO_APP_CONFIG.supabaseUrl,
    window.UFO_APP_CONFIG.supabaseAnonKey
  );

  const loginWrap = document.getElementById("admin-login");
  const protectedWrap = document.getElementById("admin-protected");
  const emailInput = document.getElementById("admin-email");
  const passwordInput = document.getElementById("admin-password");
  const loginBtn = document.getElementById("admin-login-btn");
  const logoutBtn = document.getElementById("admin-logout-btn");
  const loginStatus = document.getElementById("admin-login-status");
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

  async function getCurrentAdminProfile() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return null;
    }

    return { user, profile };
  }

  function showProtectedArea() {
    loginWrap.style.display = "block";
    protectedWrap.style.display = "block";
    logoutBtn.style.display = "inline-flex";
  }

  function hideProtectedArea() {
    protectedWrap.style.display = "none";
    logoutBtn.style.display = "none";
    listEl.innerHTML = "";
    statusEl.textContent = "";
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
  }

  async function updateCase(id, newStatus) {
    statusEl.textContent = "Updating case...";

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
  }

  async function signIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      loginStatus.textContent = "Enter email and password.";
      return;
    }

    loginStatus.textContent = "Signing in...";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginStatus.textContent = `Sign-in failed: ${error.message}`;
      hideProtectedArea();
      return;
    }

    const admin = await getCurrentAdminProfile();

    if (!admin) {
      loginStatus.textContent = "This account is not an admin.";
      await supabase.auth.signOut();
      hideProtectedArea();
      return;
    }

    loginStatus.textContent = `Signed in as ${admin.profile.email}.`;
    showProtectedArea();
    await loadPending();
  }

  async function signOut() {
    await supabase.auth.signOut();
    loginStatus.textContent = "Signed out.";
    hideProtectedArea();
  }

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

  loginBtn.addEventListener("click", signIn);
  logoutBtn.addEventListener("click", signOut);

  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") signIn();
  });

  emailInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") signIn();
  });

  (async () => {
    const admin = await getCurrentAdminProfile();

    if (admin) {
      loginStatus.textContent = `Signed in as ${admin.profile.email}.`;
      showProtectedArea();
      await loadPending();
    } else {
      hideProtectedArea();
    }
  })();
})();
