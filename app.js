(async () => {
  const container = document.getElementById("archive-list");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function mediaHtml(item) {
    if (!item.media_url) return "";

    const url = escapeHtml(item.media_url);
    const type = item.media_type || "";

    if (type.startsWith("video")) {
      return `<video src="${url}" controls style="max-width:100%; border-radius:12px; margin-top:10px;"></video>`;
    }

    return `<img src="${url}" alt="UFO evidence" style="max-width:100%; border-radius:12px; margin-top:10px;" />`;
  }

  container.innerHTML = "<p>Loading approved UFO cases...</p>";

  try {
    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      "/rest/v1/cases?status=eq.approved&select=*&order=created_at.desc&_=" +
      Date.now();

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`,
        "Cache-Control": "no-cache"
      }
    });

    const data = await res.json();

    container.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p>No approved UFO cases yet.</p>";
      return;
    }

    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "case";

      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || item.created_at || "Unknown")}</p>
        <p>${escapeHtml(item.summary || item.description || "")}</p>
        ${mediaHtml(item)}
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading archive.</p>";
  }
})();
