function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (error) { reject(error); }
    });
  });
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getTwoFactorApiKey() {
  const apiKey = process.env.TWO_FACTOR_API_KEY;
  if (!apiKey) throw new Error("2Factor API key is missing on the server.");
  return apiKey;
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = await readJsonBody(req);
    const requestId = String(body.requestId || "").trim();
    const otp = String(body.otp || "").replace(/\D/g, "");

    if (!requestId) return res.status(400).json({ error: "OTP request ID is required." });
    if (!/^\d{4,8}$/.test(otp)) return res.status(400).json({ error: "Enter a valid OTP." });

    const apiKey = getTwoFactorApiKey();
    const endpoint = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(requestId)}/${encodeURIComponent(otp)}`;
    const response = await fetch(endpoint);
    const data = await response.json().catch(() => ({}));
    const verified = response.ok && data.Status === "Success";

    if (!verified) {
      return res.status(400).json({
        verified: false,
        error: data.Details || data.Status || "Invalid or expired OTP.",
      });
    }

    return res.status(200).json({
      verified: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
