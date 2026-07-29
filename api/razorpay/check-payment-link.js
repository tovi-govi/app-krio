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
    const paymentLinkId = String(body.paymentLinkId || "");
    if (!paymentLinkId) return res.status(400).json({ error: "paymentLinkId is required" });

    const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}`, {
      method: "GET",
      headers: { Authorization: razorpayAuthHeader() },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.description || data.error || "Could not fetch Razorpay payment link" });
    }

    const payments = Array.isArray(data.payments) ? data.payments : [];
    const successfulPayment = payments.find((payment) =>
      ["captured", "authorized"].includes(String(payment.status || "").toLowerCase())
    );
    const verified = String(data.status || "").toLowerCase() === "paid" || Boolean(successfulPayment);

    return res.status(200).json({
      verified,
      status: data.status,
      paymentId: successfulPayment?.payment_id || successfulPayment?.id || data.payment_id || null,
      amountPaid: Number(data.amount_paid || 0) / 100,
      referenceId: data.reference_id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
