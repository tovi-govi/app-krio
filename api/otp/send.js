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

function normalizeIndianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const tenDigits = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(tenDigits)) return "";
  return tenDigits;
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = await readJsonBody(req);
    const phone = normalizeIndianPhone(body.phone);
    if (!phone) return res.status(400).json({ error: "Enter a valid 10-digit phone number." });

    const apiKey = getTwoFactorApiKey();
    const templateName = process.env.TWO_FACTOR_TEMPLATE_NAME;
    const endpoint = templateName
      ? `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(phone)}/AUTOGEN/${encodeURIComponent(templateName)}`
      : `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(phone)}/AUTOGEN`;

    const response = await fetch(endpoint);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.Status !== "Success" || !data.Details) {
      return res.status(response.ok ? 400 : response.status).json({
        error: data.Details || data.Status || "Could not send OTP.",
      });
    }

    return res.status(200).json({
      requestId: data.Details,
      phone,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
