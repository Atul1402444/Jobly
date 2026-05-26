import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, firstname, phone, productinfo, amount } = req.body;

    // Validation
    if (!email || !firstname || !phone || !productinfo || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get credentials from env
    const PAYU_KEY = process.env.PAYU_KEY;
    const PAYU_SALT = process.env.PAYU_SALT;
    const JOBLY_BASE_URL = process.env.JOBLY_BASE_URL;

    if (!PAYU_KEY || !PAYU_SALT) {
      return res.status(500).json({ error: "Payment gateway not configured" });
    }

    // Generate unique transaction ID
    const txnid = "JOBLY_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Build hash string (PayU exact format)
    // hash = sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
    const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    // Return data needed by frontend to submit PayU form
    return res.status(200).json({
      success: true,
      key: PAYU_KEY,
      txnid: txnid,
      amount: amount,
      productinfo: productinfo,
      firstname: firstname,
      email: email,
      phone: phone,
      hash: hash,
      surl: `${JOBLY_BASE_URL}/api/payu-success`,
      furl: `${JOBLY_BASE_URL}/api/payu-success`,
    });
  } catch (error) {
    console.error("PayU initiate error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}