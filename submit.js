const form = document.getElementById("submit-form");
const statusEl = document.getElementById("submit-status");

const supabaseClient = supabase.createClient(
  window.UFO_APP_CONFIG.supabaseUrl,
  window.UFO_APP_CONFIG.supabaseAnonKey
);

function safeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  statusEl.textContent = "Submitting report...";

  const formData = new FormData(form);
  const file = document.getElementById("media").files[0];

  let mediaUrl = null;
  let mediaPath = null;
  let mediaType = null;

  try {
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        statusEl.textContent = "File is too large. Maximum size is 50MB.";
        return;
      }

      const timestamp = Date.now();
      const filename = `${timestamp}-${safeFileName(file.name)}`;
      mediaPath = `submissions/${filename}`;
      mediaType = file.type;

      statusEl.textContent = "Uploading media...";

      const uploadResult = await supabaseClient.storage
        .from("ufo-media")
        .upload(mediaPath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const publicUrlResult = supabaseClient.storage
        .from("ufo-media")
        .getPublicUrl(mediaPath);

      mediaUrl = publicUrlResult.data.publicUrl;
    }

    statusEl.textContent = "Saving report...";

    const report = {
      title: formData.get("title"),
      location: formData.get("location"),
      date_observed: formData.get("date_observed"),
      tags: formData.get("tags"),
      summary: formData.get("summary"),
      status: "pending",
      media_url: mediaUrl,
      media_path: mediaPath,
      media_type: mediaType
    };

    const { error } = await supabaseClient
      .from("cases")
      .insert([report]);

    if (error) {
      throw error;
    }

    form.reset();
    statusEl.textContent = "Report submitted successfully. It is now pending review.";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Submission failed: " + error.message;
  }
});
