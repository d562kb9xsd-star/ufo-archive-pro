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

function log(msg) {
  console.log(msg);
  loginStatus.textContent = msg;
}

async function signIn() {
  log("Signing in...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    log("Login failed: " + error.message);
    return;
  }

  log("Checking profile...");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    log("Profile error: " + profileError.message);
    return;
  }

  if (profile.role !== "admin") {
    log("Not admin");
    return;
  }

  loginWrap.style.display = "none";
  protectedWrap.style.display = "block";

  loadCases();
}

async function loadCases() {
  statusEl.textContent = "Loading...";

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "pending");

  if (error) {
    statusEl.textContent = error.message;
    return;
  }

  listEl.innerHTML = "";

  data.forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.location}</p>
      <p>${item.summary}</p>
      <button onclick="approve('${item.id}')">Approve</button>
      <button onclick="reject('${item.id}')">Reject</button>
      <hr>
    `;

    listEl.appendChild(div);
  });

  statusEl.textContent = "";
}

async function approve(id) {
  await supabase.from("cases").update({ status: "approved" }).eq("id", id);
  loadCases();
}

async function reject(id) {
  await supabase.from("cases").update({ status: "rejected" }).eq("id", id);
  loadCases();
}

async function signOut() {
  await supabase.auth.signOut();
  protectedWrap.style.display = "none";
  loginWrap.style.display = "block";
}

loginBtn.onclick = signIn;
signoutBtn.onclick = signOut;
