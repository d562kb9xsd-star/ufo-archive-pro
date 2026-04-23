(() => {
  const form = document.getElementById("submit-form");
  const statusEl = document.getElementById("submit-status");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Submitting report...";

    const formData = new FormData(form);
    const tags = String(formData.get("tags") || "")
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      title: String(formData.get("title") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      date_observed: formData.get("date_observed") || null,
      summary: String(formData.get("summary") || "").trim(),
      description: String(formData.get("summary") || "").trim(),
      tags,
      status: "pending"
    };

    try {
      const url = window.UFO_APP_CONFIG.supabaseUrl + "/rest/v1/cases";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        statusEl.textContent = `Submission failed: ${text}`;
        return;
      }

      form.reset();
      statusEl.textContent = "Report submitted successfully. It is now pending review.";
    } catch (error) {
      console.error(error);
      statusEl.textContent = "Error submitting report.";
    }
  });
})();
