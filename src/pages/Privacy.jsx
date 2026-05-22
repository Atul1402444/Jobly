import { Link } from "react-router-dom";
import Footer from "./Footer";

export default function Privacy() {
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
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: November 2025</p>

        <p>
          Atul Tandon ("we", "us", "our") operates the Jobly website (the
          "Service") at joblyai-eight.vercel.app. This Privacy Policy explains
          how we collect, use, and protect your information when you use our
          Service.
        </p>

        <p>
          By using Jobly, you agree to the collection and use of information in
          accordance with this policy. This Policy complies with the Indian IT
          Act 2000 and the Digital Personal Data Protection Act, 2023 (DPDP
          Act).
        </p>

        <h2>1. Information We Collect</h2>

        <h3>Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> When you sign up, we collect your email address and name via our authentication provider (Clerk).</li>
          <li><strong>CV/Resume content:</strong> When you upload a CV for ATS checking or job matching, we temporarily process the text content of your CV.</li>
          <li><strong>Job descriptions:</strong> When you paste a job description, we process it to provide ATS analysis.</li>
          <li><strong>Payment information:</strong> If you make a payment, we collect your UPI transaction reference (we do NOT store your bank or card details).</li>
          <li><strong>Communications:</strong> Any messages you send us via email or WhatsApp.</li>
        </ul>

        <h3>Information Collected Automatically</h3>
        <ul>
          <li><strong>Usage data:</strong> Pages visited, features used, time spent on Service.</li>
          <li><strong>Device information:</strong> Browser type, operating system, device type (mobile/desktop).</li>
          <li><strong>Location:</strong> We detect your country (via timezone) to show local pricing — we do NOT track precise location.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide ATS scoring and analysis of your CV against job descriptions</li>
          <li>Match you with relevant job listings from public job APIs</li>
          <li>Tailor your CV for specific roles (paid service)</li>
          <li>Process payments and deliver paid services</li>
          <li>Respond to your queries and provide support</li>
          <li>Improve our Service based on usage patterns</li>
          <li>Send service-related communications (no marketing emails without consent)</li>
        </ul>

        <h2>3. Third-Party Services We Use</h2>
        <p>Jobly uses the following third-party services to operate:</p>
        <ul>
          <li><strong>Google Gemini AI:</strong> For CV analysis and ATS scoring. Your CV text is sent to Google's AI for processing.</li>
          <li><strong>Clerk:</strong> For authentication (email/Google sign-in).</li>
          <li><strong>Adzuna, JSearch, Remotive:</strong> Job search APIs.</li>
          <li><strong>Vercel:</strong> Web hosting infrastructure.</li>
        </ul>

        <p>
          We recommend reviewing the privacy policies of these services for more
          information about how they handle data.
        </p>

        <h2>4. Data Retention</h2>
        <ul>
          <li><strong>CV content:</strong> Processed in real-time and NOT permanently stored on our servers.</li>
          <li><strong>Account data:</strong> Retained as long as your account is active.</li>
          <li><strong>Payment records:</strong> Retained for 7 years as required by Indian tax law.</li>
          <li><strong>Communications:</strong> Retained for 2 years for support purposes.</li>
        </ul>

        <div className="info-box">
          <p>
            <strong>🔒 Important:</strong> We do NOT sell, rent, or trade your
            personal information to third parties. We do NOT use your CV data
            to train AI models. Your CV is yours.
          </p>
        </div>

        <h2>5. Your Rights Under Indian Law (DPDP Act 2023)</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate data</li>
          <li><strong>Deletion:</strong> Request deletion of your account and data</li>
          <li><strong>Withdraw consent:</strong> Stop using the Service at any time</li>
          <li><strong>Grievance redressal:</strong> File a complaint with our Grievance Officer (see Section 9)</li>
        </ul>

        <p>
          To exercise these rights, email{" "}
          <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>.
          We will respond within 30 days.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We
          do NOT use tracking cookies for advertising. You can disable cookies
          in your browser, but this may affect Service functionality.
        </p>

        <h2>7. Security</h2>
        <p>
          We use industry-standard security measures including:
        </p>
        <ul>
          <li>HTTPS encryption for all data in transit</li>
          <li>Secure authentication via Clerk</li>
          <li>No storage of payment card details</li>
          <li>Limited access to data on a need-to-know basis</li>
        </ul>

        <p>
          However, no method of transmission over the Internet is 100% secure.
          While we strive to protect your data, we cannot guarantee absolute
          security.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Jobly is intended for users aged 18 and above. We do not knowingly
          collect personal information from anyone under 18. If we discover that
          a minor has provided personal data, we will delete it immediately.
        </p>

        <h2>9. Grievance Officer</h2>
        <p>
          In accordance with the Information Technology Act, 2000 and rules
          made thereunder, the contact details of the Grievance Officer are:
        </p>
        <div className="info-box">
          <p>
            <strong>Name:</strong> Atul Tandon<br />
            <strong>Email:</strong>{" "}
            <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>
            <br />
            <strong>Location:</strong> Delhi, India<br />
            <strong>Response time:</strong> Within 7 working days
          </p>
        </div>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Policy on this page and
          updating the "Last updated" date.
        </p>

        <h2>11. Contact</h2>
        <p>
          For any privacy-related questions, contact us at{" "}
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
