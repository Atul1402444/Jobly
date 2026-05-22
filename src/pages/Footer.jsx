import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <h2>Jobly</h2>
          <p>
            AI-powered career platform helping job seekers land their dream
            roles. Free ATS checker, smart job matching, and tailored CVs in
            seconds.
          </p>
          <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
            Made with ❤️ in Delhi, India
          </p>
        </div>

        <div>
          <h3>Company</h3>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/ats-check">Free ATS Check</Link>
        </div>

        <div>
          <h3>Legal</h3>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/refunds">Refund Policy</Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div>© 2026 Jobly · All rights reserved</div>
        <div>
          <a
            href="mailto:website140244@gmail.com"
            style={{ color: "#94a3b8", display: "inline" }}
          >
            website140244@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
