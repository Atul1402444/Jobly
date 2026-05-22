import { Link } from "react-router-dom";
import Footer from "./Footer";

export default function Terms() {
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
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: November 2025</p>

        <p>
          Welcome to Jobly. These Terms of Service ("Terms") govern your use of
          the Jobly website and services (collectively, the "Service") operated
          by Atul Tandon ("we", "us", "our") based in Delhi, India.
        </p>

        <p>
          By accessing or using our Service, you agree to be bound by these
          Terms. If you disagree with any part of the Terms, you may not use the
          Service.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old to use Jobly. By using the Service,
          you represent that you meet this age requirement and have the legal
          capacity to enter into a binding contract.
        </p>

        <h2>2. What Jobly Provides</h2>
        <p>Jobly offers:</p>
        <ul>
          <li><strong>Free ATS Checker:</strong> An AI-powered tool to score your CV against job descriptions, identify missing keywords, and suggest improvements. No signup required.</li>
          <li><strong>Job Search:</strong> Aggregated job listings from third-party APIs (Adzuna, JSearch, Remotive).</li>
          <li><strong>CV Tailoring (Paid - ₹99):</strong> Custom-tailored CV for a specific job description, delivered via WhatsApp within 30 minutes of payment confirmation.</li>
          <li><strong>Jobly Pro Subscription (Paid - ₹299/month):</strong> Unlimited CV tailoring and premium features.</li>
        </ul>

        <h2>3. Your Account</h2>
        <p>
          When you create an account:
        </p>
        <ul>
          <li>You must provide accurate, current, and complete information</li>
          <li>You are responsible for safeguarding your password and account access</li>
          <li>You are responsible for all activities under your account</li>
          <li>You must notify us immediately of any unauthorized use</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree NOT to:</p>
        <ul>
          <li>Upload CVs that are not your own without permission</li>
          <li>Use the Service to scrape, crawl, or harvest job listings or any data</li>
          <li>Submit false, misleading, or fraudulent information</li>
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Attempt to interfere with, disrupt, or hack the Service</li>
          <li>Bypass usage limits or payment requirements</li>
          <li>Resell or redistribute our paid CV tailoring service</li>
          <li>Use automated systems (bots, scripts) to access the Service</li>
        </ul>

        <h2>5. Free vs Paid Services</h2>

        <h3>Free Services</h3>
        <ul>
          <li>2 free job searches per account</li>
          <li>Unlimited use of ATS Checker (no signup required)</li>
          <li>Subject to fair usage policy</li>
        </ul>

        <h3>Paid Services</h3>
        <ul>
          <li><strong>One-time CV Tailoring (₹99):</strong> Delivered manually via WhatsApp within 30 minutes</li>
          <li><strong>Jobly Pro (₹299/month):</strong> Recurring monthly subscription, cancel anytime</li>
        </ul>

        <h2>6. Payment Terms</h2>
        <ul>
          <li>All payments are processed via UPI (Unified Payments Interface)</li>
          <li>Payments are in Indian Rupees (₹) for Indian users</li>
          <li>Service delivery starts only after payment confirmation</li>
          <li>You must send a payment screenshot via WhatsApp to confirm transaction</li>
          <li>For subscription, you must initiate next month's payment manually until automatic billing is enabled</li>
        </ul>

        <h2>7. Refunds</h2>
        <p>
          Please see our separate <Link to="/refunds">Refund Policy</Link> for
          detailed information on refund eligibility, process, and timelines.
        </p>

        <p>
          In summary:
        </p>
        <ul>
          <li><strong>Jobly Pro Subscription (₹299/month):</strong> Non-refundable under all circumstances</li>
          <li><strong>ATS Tailored CV (₹99):</strong> Refunds available only if there is a verifiable error in the delivered CV, with mandatory screenshot proof required within 48 hours of delivery</li>
        </ul>

        <h2>8. AI-Generated Content Disclaimer</h2>
        <div className="warning-box">
          <p>
            <strong>⚠️ Important:</strong> The ATS scores, suggestions, and
            tailored CVs are generated using AI (Google Gemini). While we strive
            for accuracy, AI outputs may contain errors. The advice is suggestive,
            NOT guaranteed. You are responsible for reviewing all AI outputs
            before using them in actual job applications.
          </p>
        </div>

        <h2>9. No Guarantee of Employment</h2>
        <p>
          Jobly is a tool to help improve your job application materials and find
          opportunities. We do NOT guarantee:
        </p>
        <ul>
          <li>That you will be hired or get interviews</li>
          <li>That your ATS score reflects what real ATS systems will give</li>
          <li>The accuracy or availability of third-party job listings</li>
          <li>Any specific outcome from using our Service</li>
        </ul>

        <h2>10. Intellectual Property</h2>
        <p>
          The Service, including its design, code, content, and branding, is
          owned by Atul Tandon and protected by Indian and international
          intellectual property laws. You may NOT:
        </p>
        <ul>
          <li>Copy, modify, or distribute our content without permission</li>
          <li>Use our branding or logo without written consent</li>
          <li>Reverse-engineer or attempt to extract our source code</li>
        </ul>

        <p>
          You retain all rights to the CVs you upload. By uploading, you grant
          us a limited license to process them for the purpose of providing the
          Service.
        </p>

        <h2>11. Third-Party Job Listings</h2>
        <p>
          Job listings shown on Jobly are aggregated from third-party APIs. We
          do NOT verify the authenticity of these listings. Always research
          companies independently before applying. Jobly is not responsible for:
        </p>
        <ul>
          <li>Fraudulent or fake job postings from third-party sources</li>
          <li>Information accuracy or job availability</li>
          <li>Communications between you and employers</li>
        </ul>

        <h2>12. Termination</h2>
        <p>
          We may suspend or terminate your account if you violate these Terms.
          You may close your account at any time by emailing us at{" "}
          <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law:
        </p>
        <ul>
          <li>Jobly is provided "as is" without warranties of any kind</li>
          <li>We are not liable for indirect, incidental, or consequential damages</li>
          <li>Our total liability for any claim shall not exceed the amount you paid us in the preceding 12 months</li>
          <li>We are not responsible for missed job opportunities or career outcomes</li>
        </ul>

        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Jobly and its operator from
          any claims, damages, or expenses arising from your use of the Service
          or violation of these Terms.
        </p>

        <h2>15. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          Service after changes constitutes acceptance. Major changes will be
          communicated via email or prominent notice on the Service.
        </p>

        <h2>16. Governing Law</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts in Delhi, India.
        </p>

        <h2>17. Contact</h2>
        <p>
          For any questions about these Terms, contact us at{" "}
          <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>.
        </p>

        <Link to="/" className="back-link" style={{ marginTop: "32px", display: "inline-flex" }}>
          ← Back to Home
        </Link>
      </div>

      <Footer />
    </>
  );
}
