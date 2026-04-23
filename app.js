(async () => {
  const container = document.getElementById("archive-list");

  if (!container) {
    console.error("archive-list not found");
    return;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normaliseTags(tags) {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string" && tags.trim() !== "") {
      return tags.split(",").map(t => t.trim()).filter(Boolean);
    }
    return [];
  }

  try {
    container.innerHTML = "<p>Loading approved UFO cases...</p>";

    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      "/rest/v1/cases?status=eq.approved&select=*";

    const res = await fetch(url, {
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
      }
    });

    const data = await res.json();

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No approved cases found.</p>";
      return;
    }

    container.innerHTML = "";

    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "case";

      const tags = normaliseTags(item.tags)
        .map(t => `<span class="badge">${escapeHtml(t)}</span>`)
        .join(" ");

      div.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled Case")}</h3>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
        <p>${escapeHtml(item.description || "")}</p>
        <p>${tags}</p>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading cases.</p>";
  }
})();
