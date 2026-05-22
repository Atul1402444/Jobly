import { Link } from "react-router-dom";
import Footer from "./Footer";

export default function Refunds() {
  return (
    <>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid #e5e5e5", maxWidth: "1280px", margin: "0 auto" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <img src="/jobly-logo.svg" alt="Jobly" style={{ height: "32px" }} />
        </Link>
        <Link to="/" style={{ color: "#0a66c2", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}>
          ← Back to Home
        </Link>
      </nav>

      <div className="legal-page">
        <h1>Refund Policy</h1>
        <p className="updated">Last updated: November 2025</p>

        <p>
          Jobly operates with a strict but fair refund policy. We deliver
          quality work, and we ask customers to understand our service limits
          before purchasing. Please read carefully before making any payment.
        </p>

        <div className="warning-box">
          <p>
            <strong>⚠️ Important Summary:</strong>
            <br />
            <strong>Subscription (₹299/month):</strong> Non-refundable. No exceptions.
            <br />
            <strong>ATS Tailored CV (₹99):</strong> Refund only if there's a clear technical error in the tailored CV — and you must provide a screenshot as proof.
          </p>
        </div>

        <h2>1. Jobly Pro Subscription (₹299/month) — NON-REFUNDABLE</h2>

        <p>
          The Jobly Pro monthly subscription is <strong>completely non-refundable</strong>.
          Once payment is made, no refund will be processed under any circumstances,
          including but not limited to:
        </p>
        <ul>
          <li>Not using the service after payment</li>
          <li>Changing your mind after subscribing</li>
          <li>Forgetting to cancel before renewal</li>
          <li>Dissatisfaction with the service quality</li>
          <li>Not getting a job after using the service</li>
        </ul>

        <h3>What You Can Do Instead</h3>
        <ul>
          <li><strong>Cancel future renewals:</strong> Email us anytime to stop auto-billing. You retain access until the end of your paid month.</li>
          <li><strong>Use the free ATS Checker:</strong> Available to everyone, no signup required.</li>
        </ul>

        <div className="info-box">
          <p>
            <strong>💡 Try Before You Subscribe:</strong> We strongly encourage you to use our
            free ATS Checker first to evaluate our service quality before committing to a paid
            subscription. Once you pay, the fee is final.
          </p>
        </div>

        <h2>2. ATS Tailored CV (₹99 one-time) — Refund ONLY If There's an Error</h2>

        <p>
          Refunds for the ₹99 CV tailoring service are processed{" "}
          <strong>only when there is a verifiable technical error</strong> in the
          tailored CV we deliver, AND you provide visual proof of the error.
        </p>

        <h3>✅ Eligible for Full Refund (with proof)</h3>
        <p>You may request a refund if the tailored CV has:</p>
        <ul>
          <li><strong>Factual errors:</strong> Information that contradicts what was in your original CV (wrong dates, wrong company names, invented experience)</li>
          <li><strong>Broken formatting:</strong> Unreadable layout, broken text, corrupted file, or unusable PDF</li>
          <li><strong>Wrong job targeting:</strong> The CV is tailored for a completely different job than the one you provided</li>
          <li><strong>Incomplete delivery:</strong> Missing sections that were in your original CV (e.g., education section deleted)</li>
          <li><strong>Severe quality issues:</strong> Output is clearly broken, garbled, or non-professional</li>
        </ul>

        <h3>❌ NOT Eligible for Refund</h3>
        <ul>
          <li>You changed your mind after receiving the CV</li>
          <li>You didn't get the job, interview, or callback</li>
          <li>You provided an incorrect or incomplete job description</li>
          <li>You provided a poor quality original CV</li>
          <li>You don't like the wording or style (this is subjective)</li>
          <li>You wanted a different tone or structure than what was delivered</li>
          <li>You already used the CV for an application</li>
          <li>More than 48 hours have passed since delivery</li>
          <li>You cannot provide a screenshot of the error</li>
        </ul>

        <h2>3. MANDATORY Proof Requirement — Screenshot of Error</h2>

        <div className="warning-box">
          <p>
            <strong>🚨 Critical:</strong> All refund requests for ₹99 CV tailoring MUST
            include a clear screenshot showing the specific error in the tailored CV.
            Without screenshot proof, refund requests will be rejected automatically.
          </p>
        </div>

        <h3>What Counts as Valid Proof:</h3>
        <ul>
          <li>Screenshot showing the factual error (with original CV for comparison)</li>
          <li>Screenshot showing the broken formatting</li>
          <li>Screenshot of the corrupted file or error message</li>
          <li>Side-by-side comparison showing the mismatch between job description and tailored CV</li>
        </ul>

        <h3>What Doesn't Count:</h3>
        <ul>
          <li>Verbal description without screenshot</li>
          <li>Screenshot of just the original CV (without showing the delivered CV)</li>
          <li>Generic "I don't like it" complaints</li>
          <li>Screenshots from third parties (your friend's opinion, etc.)</li>
        </ul>

        <h2>4. How to Request a Refund (₹99 Only)</h2>

        <ol style={{ paddingLeft: "24px", marginBottom: "16px" }}>
          <li style={{ marginBottom: "12px" }}>
            <strong>Within 48 hours</strong> of receiving the tailored CV, email{" "}
            <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <strong>Subject line:</strong> "Refund Request - Error in Tailored CV"
          </li>
          <li style={{ marginBottom: "12px" }}>
            Include in your email:
            <ul style={{ marginTop: "8px" }}>
              <li>UPI transaction reference number</li>
              <li>The original CV you submitted</li>
              <li>The tailored CV we delivered</li>
              <li>The job description you provided</li>
              <li><strong>Screenshot(s) clearly showing the error</strong> (REQUIRED)</li>
              <li>Brief description of the specific issue</li>
            </ul>
          </li>
          <li style={{ marginBottom: "12px" }}>
            We will review and respond within <strong>48 hours</strong>
          </li>
          <li style={{ marginBottom: "12px" }}>
            If approved, refund processed to your UPI account within <strong>3-7 business days</strong>
          </li>
        </ol>

        <h2>5. Our Right to Verify</h2>
        <p>
          We reserve the right to:
        </p>
        <ul>
          <li>Verify the authenticity of screenshots provided as proof</li>
          <li>Reject refund requests with insufficient or unclear proof</li>
          <li>Offer a free re-tailoring instead of refund for minor issues</li>
          <li>Investigate patterns of refund requests from the same customer</li>
          <li>Refuse service to customers who abuse the refund process</li>
        </ul>

        <h2>6. Re-Tailoring Option (Alternative to Refund)</h2>
        <p>
          For minor issues that don't qualify for a refund, we may offer:
        </p>
        <ul>
          <li>One free re-tailoring of the CV at no additional cost</li>
          <li>Specific corrections to the existing tailored CV</li>
          <li>Email consultation to address concerns</li>
        </ul>

        <p>
          This is offered at our discretion and is often a faster resolution than
          a refund.
        </p>

        <h2>7. Time Limits</h2>
        <ul>
          <li><strong>Refund request window:</strong> 48 hours from CV delivery</li>
          <li><strong>Our review time:</strong> Up to 48 hours</li>
          <li><strong>Refund processing:</strong> 3-7 business days after approval</li>
          <li><strong>After 48 hours:</strong> No refund requests accepted, no exceptions</li>
        </ul>

        <h2>8. What We DON'T Refund — Important Clarifications</h2>

        <p><strong>Job Search Results:</strong> Jobly is a tool, not a hiring agency. We do NOT guarantee:</p>
        <ul>
          <li>That you will be hired</li>
          <li>That you will get an interview</li>
          <li>That you will get a callback</li>
          <li>That your tailored CV will pass every ATS system</li>
          <li>Specific ATS score improvements</li>
          <li>Any specific career outcome</li>
        </ul>

        <p>
          Refunds are based <em>only</em> on the technical quality of our deliverable,
          NOT on what happens after you use it.
        </p>

        <h2>9. Chargebacks & Payment Disputes</h2>

        <div className="warning-box">
          <p>
            <strong>⚠️ Please contact us FIRST before initiating any chargeback
            or payment dispute.</strong> Filing a chargeback without prior communication
            will result in:
          </p>
        </div>

        <ul>
          <li>Immediate termination of your Jobly account</li>
          <li>Permanent ban from future services</li>
          <li>Reporting to your payment provider</li>
        </ul>

        <p>
          We are a small business that takes payment fraud seriously. Honest
          customers always get a fair hearing — please give us the chance to
          resolve your issue before escalating.
        </p>

        <h2>10. Free Services — No Refund Applicable</h2>
        <p>
          The Free ATS Checker is completely free of charge. No payment, no
          refund question. Use it as much as you want.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Refund Policy as our business evolves. Changes will
          be posted here with an updated date. Refunds will be processed
          according to the policy in effect at the time of your purchase.
        </p>

        <h2>12. Contact for Refund Requests</h2>
        <div className="info-box">
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>
            <br />
            <strong>Subject line:</strong> "Refund Request - Error in Tailored CV"<br />
            <strong>Required:</strong> Screenshot proof of the error<br />
            <strong>Response time:</strong> Within 48 hours<br />
            <strong>Window:</strong> 48 hours from CV delivery
          </p>
        </div>

        <p style={{ fontSize: "0.9rem", color: "#6b7280", fontStyle: "italic", marginTop: "32px" }}>
          By making a payment for Jobly services, you acknowledge that you have
          read, understood, and agree to this Refund Policy.
        </p>

        <Link to="/" className="back-link" style={{ marginTop: "32px", display: "inline-flex" }}>
          ← Back to Home
        </Link>
      </div>

      <Footer />
    </>
  );
}
