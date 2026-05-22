import { Link } from "react-router-dom";
import Footer from "./Footer";

export default function About() {
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
        <h1>About Jobly</h1>
        <p className="updated">Real founder. Real product. Built for job seekers.</p>

        <h2>Our Mission</h2>
        <p>
          Jobly exists for one reason: <strong>job hunting in 2026 is broken,
          and AI can fix it</strong>.
        </p>

        <p>
          Most job seekers spend hours tailoring CVs, hoping their resume passes
          the invisible ATS robot wall. They get ghosted. They wonder what went
          wrong. The truth? Their CV probably never made it to a human.
        </p>

        <p>
          We built Jobly to flip the script — to give job seekers the same AI
          edge that recruiters use. To make CV optimization fast, affordable,
          and accessible to everyone — not just people who can afford ₹5,000
          career consultants.
        </p>

        <h2>Who's Behind Jobly?</h2>
        <p>
          Hi, I'm <strong>Atul Tandon</strong>, the founder, developer, designer,
          and customer support of Jobly — all rolled into one. I'm based in
          Delhi, India.
        </p>

        <p>
          I built Jobly because I watched friends and family struggle with the
          same problem: they were qualified for jobs they applied to, but never
          heard back. The ATS systems were filtering them out before any human
          saw their CV.
        </p>

        <p>
          So I started building. ATS Checker came first — a free tool that
          tells you exactly why your CV gets rejected, and what to fix.
          Hundreds of users in the early days. Now we're growing one user at
          a time, with real word-of-mouth.
        </p>

        <h2>What Makes Jobly Different?</h2>

        <h3>🎯 Built for Indian Job Seekers (But Works Globally)</h3>
        <p>
          Most CV tools are built in the US, priced in dollars, designed for
          American job markets. Jobly is built in India, priced in rupees,
          and understands what Indian job seekers actually need. Our pricing
          starts at ₹99 — accessible to students and freshers, not just
          senior professionals.
        </p>

        <h3>🆓 Free Where It Should Be Free</h3>
        <p>
          The ATS Checker is completely free. No signup. No credit card. No
          paywall. You get full results in 30 seconds. We believe basic CV
          checking should be a universal right, not a paid privilege.
        </p>

        <h3>🧠 AI That Actually Helps</h3>
        <p>
          We use Google's Gemini AI to analyze your CV against real job
          descriptions. Not just keyword matching — actual understanding of
          your experience, skills, and how they map to the role. The
          suggestions are specific, actionable, and grounded in what hiring
          managers actually want.
        </p>

        <h3>💬 Real Human Support</h3>
        <p>
          Email or WhatsApp me directly. I respond within 24 hours. You're not
          talking to a chatbot or a support team in another country — you're
          talking to the founder who built this thing.
        </p>

        <h2>Our Values</h2>

        <ul>
          <li><strong>Honesty first.</strong> If our AI gets something wrong, we say so. No fake guarantees.</li>
          <li><strong>Affordable.</strong> Every Indian job seeker should afford basic AI help. Period.</li>
          <li><strong>Privacy respected.</strong> Your CV is yours. We don't train on it. We don't sell your data.</li>
          <li><strong>Iterating fast.</strong> Real feedback &gt; perfect features. We ship, listen, improve.</li>
          <li><strong>Founder accessible.</strong> Email me. I'll reply. No corporate runaround.</li>
        </ul>

        <h2>The Story So Far</h2>
        <p>
          Jobly started as a weekend project in late 2025. The first version
          was a clunky CV-to-job matcher built with React, Vite, and a Gemini
          API call. The first user was my brother, Yash.
        </p>

        <p>
          He used it. Said it was actually useful. That was the moment I knew
          this could be something more than a side project.
        </p>

        <p>
          Today, Jobly is still early. We're not Naukri. We're not LinkedIn.
          We're a focused tool that does a few things really well: ATS
          checking, smart job matching, and AI-powered CV tailoring.
        </p>

        <p>
          Every week, new users try us. Some love it. Some give brutal feedback.
          We listen to all of it. That's how we get better.
        </p>

        <h2>What's Next?</h2>
        <p>
          We're building the future of Jobly based on what our users tell us
          they need. On the roadmap:
        </p>
        <ul>
          <li>Better mobile experience (you're seeing the result of recent fixes!)</li>
          <li>Cover letter generation</li>
          <li>Interview question prediction based on your CV</li>
          <li>Application tracker for the jobs you've applied to</li>
          <li>Bulk job matching with priority ranking</li>
        </ul>

        <p>
          Want a feature? <Link to="/contact">Email us</Link>. Honestly, the
          best features come from users telling us what they need.
        </p>

        <h2>Get In Touch</h2>
        <p>
          Whether you have feedback, a bug report, want to partner, or just
          want to chat — I read every email.
        </p>

        <div className="info-box">
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>
            <br />
            <strong>Based in:</strong> Delhi, India<br />
            <strong>Operating:</strong> Globally (we serve users worldwide)
          </p>
        </div>

        <p style={{ textAlign: "center", margin: "48px 0 16px", fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.3rem", color: "#0a66c2" }}>
          Welcome to Jobly. Let's get you hired.
        </p>

        <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.95rem" }}>
          — Atul
        </p>

        <Link to="/" className="back-link" style={{ marginTop: "32px", display: "inline-flex" }}>
          ← Back to Home
        </Link>
      </div>

      <Footer />
    </>
  );
}
