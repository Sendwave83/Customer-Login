export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        error: "Missing submission ID"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ntfyTopic = process.env.NTFY_TOPIC;

    if (!supabaseUrl || !supabaseKey || !ntfyTopic) {
      return res.status(500).json({
        error: "Server environment variables missing"
      });
    }

    const recordUrl =
      `${supabaseUrl}/rest/v1/submissions?id=eq.${encodeURIComponent(id)}&select=name,task`;

    const recordResponse = await fetch(recordUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!recordResponse.ok) {
      throw new Error("Could not verify submission");
    }

    const records = await recordResponse.json();

    if (!records.length) {
      return res.status(404).json({
        error: "Submission not found"
      });
    }

    const worker = records[0];

    const notification = await fetch(
      `https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`,
      {
        method: "POST",
        headers: {
          Title: "New Worker",
          Priority: "default"
        },
        body: `${worker.name} submitted a task: ${worker.task || "New submission"}`
      }
    );

    if (!notification.ok) {
      throw new Error("ntfy delivery failed");
    }

    return res.status(200).json({
      success: true,
      message: "Notification sent"
    });

  } catch (error) {
    console.error("Notification error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
