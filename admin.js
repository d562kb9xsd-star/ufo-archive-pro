const supabase = window.supabase.createClient(
  UFO_APP_CONFIG.supabaseUrl,
  UFO_APP_CONFIG.supabaseAnonKey
);

async function loadPending() {
  const { data } = await supabase
    .from('cases')
    .select('*')
    .eq('status', 'pending');

  const container = document.getElementById('adminCases');
  container.innerHTML = '';

  data.forEach(c => {
    const el = document.createElement('div');
    el.innerHTML = `
      <h3>${c.title}</h3>
      <button onclick="approve('${c.id}')">Approve</button>
    `;
    container.appendChild(el);
  });
}

async function approve(id) {
  await supabase
    .from('cases')
    .update({ status: 'approved' })
    .eq('id', id);

  loadPending();
}

loadPending();
