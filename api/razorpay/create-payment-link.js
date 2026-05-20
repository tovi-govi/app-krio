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

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay keys are missing on the server.");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const customer = body.customer || {};
    const appOrderId = String(body.appOrderId || `KRIO-${Date.now()}`);

    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (!customer.name || !customer.phone) return res.status(400).json({ error: "Customer name and phone are required" });

    const referenceId = `${appOrderId}-${Date.now()}`.slice(0, 40);
    const payload = {
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      reference_id: referenceId,
      description: `KrioH2O order ${appOrderId}`,
      customer: {
        name: String(customer.name).slice(0, 100),
        contact: String(customer.phone).replace(/\D/g, "").slice(-10),
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: {
        appOrderId,
        source: "krioh2o-expo-app",
        itemCount: Array.isArray(body.items) ? String(body.items.length) : "0",
      },
    };

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: razorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.description || data.error || "Razorpay payment link creation failed" });
    }

    return res.status(200).json({
      paymentLinkId: data.id,
      paymentLinkUrl: data.short_url,
      referenceId: data.reference_id,
      amount: data.amount / 100,
      status: data.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
