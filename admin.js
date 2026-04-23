const supabase = window.supabase.createClient(
  window.UFO_APP_CONFIG.supabaseUrl,
  window.UFO_APP_CONFIG.supabaseAnonKey
);

const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const casesDiv = document.getElementById("cases");
const status = document.getElementById("status");
const logoutBtn = document.getElementById("logout");

// ================= LOGIN =================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  status.textContent = "Signing in...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    status.textContent = error.message;
    return;
  }

  checkAdmin(data.user);
});

// ================= CHECK ADMIN =================
async function checkAdmin(user) {
  status.textContent = "Checking admin...";

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data || data.role !== "admin") {
    status.textContent = "Not an admin";
    return;
  }

  loginForm.style.display = "none";
  adminPanel.style.display = "block";

  loadCases();
}

// ================= LOAD CASES =================
async function loadCases() {
  status.textContent = "Loading cases...";

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "pending");

  if (error) {
    status.textContent = error.message;
    return;
  }

  casesDiv.innerHTML = "";

  if (data.length === 0) {
    status.textContent = "No pending cases";
    return;
  }

  data.forEach(c => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${c.title}</h3>
      <p>${c.location}</p>
      <p>${c.summary}</p>
      <button onclick="approve('${c.id}')">Approve</button>
      <button onclick="reject('${c.id}')">Reject</button>
      <hr>
    `;

    casesDiv.appendChild(div);
  });

  status.textContent = "";
}

// ================= APPROVE =================
async function approve(id) {
  await supabase.from("cases").update({ status: "approved" }).eq("id", id);
  loadCases();
}

// ================= REJECT =================
async function reject(id) {
  await supabase.from("cases").update({ status: "rejected" }).eq("id", id);
  loadCases();
}

// ================= LOGOUT =================
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ================= AUTO LOGIN =================
(async () => {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    checkAdmin(data.session.user);
  }
})();
