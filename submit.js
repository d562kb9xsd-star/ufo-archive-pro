const supabase = window.supabase.createClient(
  UFO_APP_CONFIG.supabaseUrl,
  UFO_APP_CONFIG.supabaseAnonKey
);

document.getElementById('submitForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;

  const { error } = await supabase.from('cases').insert([{
    title: form.title.value,
    location: form.location.value,
    summary: form.summary.value,
    status: 'pending'
  }]);

  if (error) {
    alert('Error submitting');
    console.error(error);
  } else {
    alert('Submitted for review');
    form.reset();
  }
});
