const supabase = window.supabase.createClient(
  window.UFO_APP_CONFIG.supabaseUrl,
  window.UFO_APP_CONFIG.supabaseAnonKey
);

const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const listEl = document.getElementById("cases-list");
const statusEl = document.getElementById("status");

// =====================
// LOGIN
// =====================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  statusEl.textContent = "Signing in...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("LOGIN:", data, error);

  if (error) {
    statusEl.textContent = "Login failed: " + error.message;
    return;
  }

  checkAdmin();
});

// =====================
// CHECK ADMIN ROLE
// =====================
async function checkAdmin() {
  statusEl.textContent = "Checking admin access...";

  const {
    data: { user }
  } = await supabase.auth.getUser();

  console.log("USER:", user);

  if (!user) {
    statusEl.textContent = "No user found";
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("PROFILE:", profile, error);

  if (error || !profile || profile.role !== "admin") {
    statusEl.textContent = "Access denied (not admin)";
    return;
  }

  // ✅ SHOW ADMIN PANEL
  loginForm.style.display = "none";
  adminPanel.style.display = "block";

  loadCases();
}

// =====================
// LOAD CASES
// =====================
async function loadCases() {
  statusEl.textContent = "Loading cases...";

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log("CASES:", data, error);

  if (error) {
    statusEl.textContent = "ERROR: " + error.message;
    return;
  }

  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    statusEl.textContent = "No pending cases";
    return;
  }

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "case";

    div.innerHTML = `
      <h3>${item.title || "No title"}</h3>
      <p><strong>Location:</strong> ${item.location || "-"}</p>
      <p><strong>Date:</strong> ${item.date_observed || "-"}</p>
      <p>${item.summary || ""}</p>
      <button onclick="approve('${item.id}')">Approve</button>
      <button onclick="reject('${item.id}')">Reject</button>
      <hr>
    `;

    listEl.appendChild(div);
  });

  statusEl.textContent = "";
}

// =====================
// APPROVE
// =====================
async function approve(id) {
  statusEl.textContent = "Approving...";

  const { error } = await supabase
    .from("cases")
    .update({ status: "approved" })
    .eq("id", id);

  console.log("APPROVE:", error);

  if (error) {
    statusEl.textContent = error.message;
    return;
  }

  loadCases();
}

// =====================
// REJECT
// =====================
async function reject(id) {
  statusEl.textContent = "Rejecting...";

  const { error } = await supabase
    .from("cases")
    .update({ status: "rejected" })
    .eq("id", id);

  console.log("REJECT:", error);

  if (error) {
    statusEl.textContent = error.message;
    return;
  }

  loadCases();
}

// =====================
// AUTO LOGIN (if already signed in)
// =====================
(async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    checkAdmin();
  }
})();
