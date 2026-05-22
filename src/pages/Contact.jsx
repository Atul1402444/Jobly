import { Link } from "react-router-dom";
import Footer from "./Footer";

export default function Contact() {
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
        <h1>Contact Us</h1>
        <p className="updated">We'd love to hear from you.</p>

        <p>
          Have a question, feedback, bug report, or business inquiry? Reach out
          using any of the methods below. We typically respond within{" "}
          <strong>24 hours</strong> on business days.
        </p>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="icon">📧</div>
            <h3>Email Support</h3>
            <p>For general questions, bug reports, refund requests, and feedback.</p>
            <a href="mailto:website140244@gmail.com">Send Email</a>
          </div>

          <div className="contact-card">
            <div className="icon">💼</div>
            <h3>Business Inquiries</h3>
            <p>For partnerships, press, or B2B opportunities.</p>
            <a href="mailto:website140244@gmail.com?subject=Business Inquiry">Get in Touch</a>
          </div>
        </div>

        <h2>Office Location</h2>
        <p>
          Jobly is operated by <strong>Atul Tandon</strong> from{" "}
          <strong>Delhi, India</strong>. We don't have a public office address as
          we're a remote-first early-stage venture. All correspondence should be
          sent via email.
        </p>

        <h2>Response Times</h2>
        <ul>
          <li><strong>General queries:</strong> Within 24 hours</li>
          <li><strong>Bug reports:</strong> Within 12 hours</li>
          <li><strong>Refund requests:</strong> Within 48 hours</li>
          <li><strong>Paid CV tailoring delivery:</strong> Within 30 minutes of payment confirmation</li>
        </ul>

        <div className="info-box">
          <p>
            <strong>💡 Quick tip:</strong> For the fastest response, please
            include your CV (if relevant), the job description you applied for,
            and a clear description of the issue. This helps us help you faster.
          </p>
        </div>

        <h2>Frequently Asked Questions</h2>
        <p>
          Before contacting us, you might find your answer in our{" "}
          <Link to="/faq">FAQ section</Link>. Common questions about pricing,
          refunds, and how the ATS Checker works are answered there.
        </p>

        <h2>Feedback Welcome</h2>
        <p>
          Jobly is built by a solo founder who genuinely reads every message. If
          something feels broken, confusing, or could be better — please tell us.
          Honest feedback is what helps us improve.
        </p>

        <Link to="/" className="back-link" style={{ marginTop: "32px", display: "inline-flex" }}>
          ← Back to Home
        </Link>
      </div>

      <Footer />
    </>
  );
}
