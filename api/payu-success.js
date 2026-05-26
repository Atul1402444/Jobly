import crypto from "crypto";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  // PayU sends data as form-encoded POST
  if (req.method !== "POST") {
    return res.redirect(302, "/?payment_error=invalid_method");
  }

  try {
    const PAYU_SALT = process.env.PAYU_SALT;
    const PAYU_KEY = process.env.PAYU_KEY;
    const JOBLY_BASE_URL = process.env.JOBLY_BASE_URL;

    if (!PAYU_SALT || !PAYU_KEY) {
      return res.redirect(302, "/?payment_error=not_configured");
    }

    // PayU sends these fields back to us
    const {
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      hash: receivedHash,
      mihpayid,
    } = req.body;

    // Reconstruct hash to verify it's really from PayU (security check)
    // Reverse hash format: sha512(salt|status|||||||||||email|firstname|productinfo|amount|txnid|key)
    const hashString = `${PAYU_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_KEY}`;
    const calculatedHash = crypto.createHash("sha512").update(hashString).digest("hex");

    // Verify hash matches (anti-tampering check)
    if (calculatedHash !== receivedHash) {
      console.error("Hash mismatch! Possible tampering. txnid:", txnid);
      return res.redirect(302, "/?payment_error=hash_mismatch");
    }

    // Hash verified - check payment status
    if (status === "success") {
      // Build redirect URL with payment details (frontend will pick these up)
      const params = new URLSearchParams({
        txnid: txnid,
        mihpayid: mihpayid || "",
        amount: amount,
        status: "success",
      });
      return res.redirect(302, `${JOBLY_BASE_URL}/payment-success?${params.toString()}`);
    } else {
      // Payment failed
      return res.redirect(302, `${JOBLY_BASE_URL}/?payment_error=failed&txnid=${txnid}`);
    }
  } catch (error) {
    console.error("PayU success handler error:", error);
    return res.redirect(302, "/?payment_error=server_error");
  }
}