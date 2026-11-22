import crypto from "node:crypto";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

function rawRequestBody(event) {
  const body = event?.body ?? "";
  return event?.isBase64Encoded
    ? Buffer.from(body, "base64")
    : Buffer.from(body, "utf8");
}

function safeEqualHex(actual, expected) {
  if (!/^[a-f0-9]{64}$/i.test(actual || "")) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const handler = async (event) => {
  const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const walletSecret = process.env.WALLET_RAZORPAY_INTERNAL_SECRET;
  const appsScriptUrl = process.env.WALLET_APPS_SCRIPT_URL;
  if (!razorpaySecret || !walletSecret || !appsScriptUrl) {
    console.error("Missing Lambda environment configuration.");
    return json(500, { ok: false, error: "Webhook is not configured." });
  }

  const rawBody = rawRequestBody(event);
  const headers = Object.fromEntries(
    Object.entries(event?.headers || {}).map(([key, value]) => [key.toLowerCase(), value])
  );
  const suppliedSignature = String(headers["x-razorpay-signature"] || "");
  const expectedSignature = crypto
    .createHmac("sha256", razorpaySecret)
    .update(rawBody)
    .digest("hex");

  if (!safeEqualHex(suppliedSignature, expectedSignature)) {
    console.warn("Rejected Razorpay webhook: invalid signature.");
    return json(401, { ok: false, error: "Invalid webhook signature." });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return json(400, { ok: false, error: "Invalid JSON payload." });
  }

  const eventName = String(payload?.event || "").toLowerCase();
  if (!["payment.captured", "payment.failed", "order.paid"].includes(eventName)) {
    return json(200, { ok: true, ignored: true, event: eventName });
  }

  const payment = payload?.payload?.payment?.entity || {};
  const paymentId = String(payment.id || "");
  if (!paymentId) return json(400, { ok: false, error: "Payment ID missing." });

  const normalized = {
    action: "moneyWalletRazorpayWebhook",
    webhookSecret: walletSecret,
    eventId: String(headers["x-razorpay-event-id"] || payload?.id || ""),
    event: eventName,
    payment: {
      id: paymentId,
      email: String(payment.email || ""),
      contact: String(payment.contact || ""),
      amount: Number(payment.amount || 0),
      currency: String(payment.currency || "INR"),
      status: String(payment.status || ""),
    },
  };

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText); }
    catch { throw new Error("Apps Script returned a non-JSON response."); }
    if (!response.ok || result?.ok === false) {
      console.error("Apps Script webhook processing failed.", { status: response.status, result });
      return json(502, { ok: false, error: "Wallet webhook processing failed." });
    }
    return json(200, { ok: true, result: result.data || result });
  } catch (error) {
    console.error("Wallet webhook forwarding failed.", String(error?.message || error));
    return json(502, { ok: false, error: "Could not update the Wallet ledger." });
  }
};
