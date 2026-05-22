import { Link } from "react-router-dom";
import Footer from "./Footer";

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Jobly?",
        a: "Jobly is an AI-powered career platform that helps you (1) check your CV's ATS score for free, (2) find matching jobs across 20+ countries, and (3) get a tailored CV for any specific job description. Built by a solo founder in Delhi, India."
      },
      {
        q: "Do I need to sign up to use Jobly?",
        a: "Not for the free ATS Checker — just visit /ats-check and start uploading. For job search and CV tailoring, you'll need a free account (email or Google sign-in)."
      },
      {
        q: "Is Jobly really free?",
        a: "The ATS Checker is 100% free, unlimited use, no signup needed. Job search gives you 2 free searches per account. CV tailoring is paid (₹99 one-time or ₹299/month for Pro)."
      },
      {
        q: "What's the ATS Checker?",
        a: "It's a free tool that analyzes your CV against a specific job description and gives you: an ATS score (0-100), your strengths, recommended additions, format observations, and key recommendations to improve your match. Takes 30 seconds."
      }
    ]
  },
  {
    category: "Pricing & Payments",
    items: [
      {
        q: "How much does Jobly cost?",
        a: "Free ATS Checker (unlimited). ₹99 one-time for a tailored CV for a specific job. ₹299/month for Jobly Pro (unlimited tailored CVs). All payments via UPI for Indian users."
      },
      {
        q: "How do I pay?",
        a: "We currently accept payments via UPI. You'll get a UPI ID to pay, then send the payment screenshot to our WhatsApp. Your tailored CV is delivered within 30 minutes of confirmation."
      },
      {
        q: "Why UPI and not Razorpay/Stripe?",
        a: "We're an early-stage business validating our product. UPI works perfectly for Indian users and lets us launch faster. We'll add automated payment gateways soon."
      },
      {
        q: "Can I cancel my Jobly Pro subscription?",
        a: "Yes, you can cancel future renewals anytime by emailing website140244@gmail.com. You'll retain access until the end of your paid month. However, please note: subscription fees are NON-refundable. You can only stop future billing, not get a refund for the current month."
      },
      {
        q: "Do you offer refunds?",
        a: "Limited refunds. Subscriptions (₹299/month) are NON-refundable. For the ₹99 CV tailoring, refunds are available ONLY if there's a verifiable error in the tailored CV, and you must provide a screenshot as proof within 48 hours of delivery. See our Refund Policy for full details."
      }
    ]
  },
  {
    category: "How It Works",
    items: [
      {
        q: "How accurate is the ATS Checker?",
        a: "Very accurate for major ATS systems (Workday, Greenhouse, Lever, Taleo). However, every company configures their ATS differently. Use our score as a strong indicator, but it's not a perfect prediction. Treat the suggestions as professional advice, not a guarantee."
      },
      {
        q: "What file formats can I upload?",
        a: "We accept PDF and TXT files. PDFs work best — most professional CVs are in PDF format. Maximum file size: 5MB."
      },
      {
        q: "Does Jobly support non-English CVs?",
        a: "Currently, Jobly works best with English-language CVs. Most ATS systems globally process English content, and our AI delivers the most accurate analysis in English. If you upload a non-English CV, you'll see a notice. We may add multi-language support in the future based on user demand."
      },
      {
        q: "Will my CV data be saved?",
        a: "No. Your CV is processed in real-time and NOT stored on our servers. The text content is sent to Google Gemini for AI analysis (per their data handling policy). We don't keep copies."
      },
      {
        q: "How long does CV tailoring take?",
        a: "We promise delivery within 30 minutes of payment confirmation during business hours (9 AM - 11 PM IST). Outside hours, may take up to 6 hours but usually faster."
      },
      {
        q: "Will the AI invent fake experience on my CV?",
        a: "No, never. The AI is specifically instructed to NEVER add experience, skills, or qualifications you don't have. It only reorders, rephrases, and emphasizes what's already true on your CV. If you spot any inaccuracy, email us immediately."
      }
    ]
  },
  {
    category: "Technical & Privacy",
    items: [
      {
        q: "What AI does Jobly use?",
        a: "We use Google Gemini AI (specifically gemini-flash-latest) for CV analysis, ATS scoring, and tailoring. We chose it for its balance of quality, speed, and affordability — passing those savings to you."
      },
      {
        q: "Is my data safe?",
        a: "Yes. We use HTTPS encryption, never store your CV permanently, don't sell your data, and don't train AI models on your content. Read our Privacy Policy for full details."
      },
      {
        q: "Does Jobly work on mobile?",
        a: "Yes! Recent updates have significantly improved the mobile experience. If you find any issues on your phone, please email us with a screenshot — we fix issues fast."
      },
      {
        q: "Which browsers are supported?",
        a: "Chrome, Safari, Firefox, Edge — all modern browsers. We recommend Chrome for the best experience."
      },
      {
        q: "Can I delete my account and data?",
        a: "Yes. Email website140244@gmail.com requesting account deletion. We'll delete all your data within 7 working days, as required by the DPDP Act 2023."
      }
    ]
  },
  {
    category: "Job Search",
    items: [
      {
        q: "Where do the job listings come from?",
        a: "Jobly aggregates listings from public job APIs including Adzuna, JSearch, and Remotive. These cover companies worldwide, with strong coverage of UK, US, India, EU, and remote positions."
      },
      {
        q: "Why are some listings outdated?",
        a: "We pull live data, but sometimes listings remain on source APIs after companies close them. Always check the original posting before applying."
      },
      {
        q: "Why only 2 free searches?",
        a: "Each search uses real API calls and AI processing, which costs us money. 2 free searches let you test the platform genuinely. After that, Jobly Pro (₹299/month) gives you unlimited searches."
      },
      {
        q: "Can I search for jobs in [specific city]?",
        a: "Yes — when you search, you can choose your country, and many listings include city info. We're working on more granular city-level filters."
      }
    ]
  },
  {
    category: "Help & Support",
    items: [
      {
        q: "How do I report a bug?",
        a: "Email website140244@gmail.com with the subject 'Bug Report'. Include: what you were doing, what happened, screenshots if possible, and your browser/device. We typically fix bugs within 24 hours."
      },
      {
        q: "I have a feature suggestion!",
        a: "We'd love to hear it. Email us with 'Feature Request' in the subject. The best features come from real user needs — we read every suggestion seriously."
      },
      {
        q: "Who can I contact for support?",
        a: "Email website140244@gmail.com. The founder (Atul) personally reads and responds to emails. Response time is usually within 24 hours."
      },
      {
        q: "Can Jobly help me find a job in 2 weeks?",
        a: "We can't guarantee timelines — job hunting depends on many factors. But we CAN help you: (1) optimize your CV to pass ATS, (2) discover relevant jobs you might have missed, (3) tailor applications faster so you can apply to more roles."
      }
    ]
  }
];

export default function FAQ() {
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
        <h1>Frequently Asked Questions</h1>
        <p className="updated">Quick answers to common questions about Jobly.</p>

        <p>
          Can't find what you're looking for? Email us at{" "}
          <a href="mailto:website140244@gmail.com">website140244@gmail.com</a>{" "}
          — we respond within 24 hours.
        </p>

        {faqs.map((category, ci) => (
          <div key={ci}>
            <h2>{category.category}</h2>
            {category.items.map((faq, fi) => (
              <details key={fi} className="faq-item">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        ))}

        <div className="info-box" style={{ marginTop: "48px" }}>
          <p>
            <strong>Still have questions?</strong>{" "}
            <Link to="/contact">Contact us</Link> — we'd love to hear from you.
          </p>
        </div>

        <Link to="/" className="back-link" style={{ marginTop: "32px", display: "inline-flex" }}>
          ← Back to Home
        </Link>
      </div>

      <Footer />
    </>
  );
}
