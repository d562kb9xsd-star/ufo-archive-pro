(async () => {
  const container = document.getElementById("archive-list");

  if (!container) return;

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

  function mediaHtml(item) {
    if (!item.media_url) return "";

    const url = escapeHtml(item.media_url);
    const type = item.media_type || "";

    if (type.startsWith("video")) {
      return `
        <div style="margin:14px 0;">
          <video src="${url}" controls style="max-width:100%; border-radius:12px;"></video>
        </div>
      `;
    }

    return `
      <div style="margin:14px 0;">
        <img src="${url}" alt="UFO evidence" style="max-width:100%; border-radius:12px;" />
      </div>
    `;
  }

  try {
    container.innerHTML = "<p>Loading approved UFO cases...</p>";

    const url =
      window.UFO_APP_CONFIG.supabaseUrl +
      "/rest/v1/cases?status=eq.approved&select=*&order=created_at.desc";

    const res = await fetch(url, {
      headers: {
        apikey: window.UFO_APP_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${window.UFO_APP_CONFIG.supabaseAnonKey}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      container.innerHTML = `<p>Error ${res.status}: ${escapeHtml(text)}</p>`;
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p>No approved UFO cases found.</p>";
      return;
    }

    container.innerHTML = "";

    data.forEach(item => {
      const tags = normaliseTags(item.tags);
      const tagHtml = tags
        .map(tag => `<span class="badge">${escapeHtml(tag)}</span>`)
        .join("");

      const card = document.createElement("div");
      card.className = "case";

      card.innerHTML = `
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "Unknown")}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date_observed || item.created_at || "Unknown")}</p>
        <p>${escapeHtml(item.summary || item.description || "")}</p>

        ${mediaHtml(item)}

        ${tagHtml ? `<div>${tagHtml}</div>` : ""}
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error loading cases.</p>`;
  }
})();
