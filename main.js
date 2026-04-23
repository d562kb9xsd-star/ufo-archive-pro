const supabase = window.supabase.createClient(
  UFO_APP_CONFIG.supabaseUrl,
  UFO_APP_CONFIG.supabaseAnonKey
);

async function loadCases() {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById('cases');
  container.innerHTML = '';

  data.forEach(c => {
    const el = document.createElement('div');
    el.className = 'case';
    el.innerHTML = `
      <h3>${c.title}</h3>
      <p>${c.location} - ${c.date_observed}</p>
      <p>${c.summary}</p>
    `;
    container.appendChild(el);
  });
}

loadCases();
