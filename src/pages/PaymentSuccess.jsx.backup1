// src/pages/PaymentSuccess.jsx
// The post-payment money-shot page.
// Generates a tailored CV from Gemini and lets the user download it as PDF.

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const cvPreviewRef = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [tailoredCV, setTailoredCV] = useState(null);
  const [error, setError] = useState("");
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    generateTailoredCV();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateTailoredCV = async () => {
    try {
      // Retrieve user's CV + JD from sessionStorage (set by ATSChecker before payment)
      const cvBase64 = sessionStorage.getItem("jobly_cv_base64");
      const jobDescription = sessionStorage.getItem("jobly_job_description");
      const atsAnalysisStr = sessionStorage.getItem("jobly_ats_analysis");

      if (!cvBase64 || !jobDescription) {
        setStatus("error");
        setError("Session expired. Please run ATS check again before payment.");
        return;
      }

      const atsAnalysis = atsAnalysisStr ? JSON.parse(atsAnalysisStr) : null;

      // Call our backend
      const response = await fetch("/api/tailor-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvBase64, jobDescription, atsAnalysis }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate CV");
      }

      const data = await response.json();
      if (!data.cv) {
        throw new Error("No CV in response");
      }

      setTailoredCV(data.cv);
      setStatus("success");
    } catch (err) {
      console.error("Generate CV error:", err);
      setStatus("error");
      setError(err.message || "Something went wrong. Please contact support.");
    }
  };

  const handleDownload = () => {
    if (!cvPreviewRef.current) return;

    setDownloadStarted(true);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${tailoredCV.fullName?.replace(/\s+/g, "_") || "Tailored"}_CV_Jobly.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().from(cvPreviewRef.current).set(opt).save();
  };

  // ============ RENDER STATES ============

  if (status === "loading") {
    return (
      <div style={styles.page}>
        <div style={styles.centerCard}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.h1}>Payment Received!</h1>
          <p style={styles.subtitle}>
            Our AI is now tailoring your CV to perfectly match the job. This takes about 20 seconds.
          </p>
          <div style={styles.spinnerContainer}>
            <div style={styles.spinner}></div>
            <span style={styles.spinnerText}>Generating your tailored CV...</span>
          </div>
          <div style={styles.progressSteps}>
            <div style={{ ...styles.step, ...styles.stepActive }}>
              <span>✓</span> Payment confirmed
            </div>
            <div style={{ ...styles.step, ...styles.stepActive }}>
              <span>⟳</span> Analyzing job requirements
            </div>
            <div style={styles.step}>
              <span>○</span> Tailoring your CV
            </div>
            <div style={styles.step}>
              <span>○</span> Ready to download
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={styles.page}>
        <div style={styles.centerCard}>
          <div style={{ ...styles.successIcon, backgroundColor: "#fee2e2", color: "#991b1b" }}>!</div>
          <h1 style={styles.h1}>Something went wrong</h1>
          <p style={styles.subtitle}>{error}</p>
          <p style={styles.supportNote}>
            Your payment is safe. Please WhatsApp us on{" "}
            <strong>+91-XXXXXXXXXX</strong> with your order details and we'll deliver your tailored CV manually within 1 hour.
          </p>
          <button style={styles.primaryBtn} onClick={() => navigate("/ats-check")}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS STATE — show the CV preview + download button
  return (
    <div style={styles.page}>
      <div style={styles.successBanner}>
        <div style={styles.bannerLeft}>
          <div style={styles.bannerIcon}>🎉</div>
          <div>
            <div style={styles.bannerTitle}>Your tailored CV is ready!</div>
            <div style={styles.bannerSubtitle}>Optimized for ATS · Keyword-matched · Ready to send</div>
          </div>
        </div>
        <button style={styles.downloadBtn} onClick={handleDownload}>
          {downloadStarted ? "↓ Downloading..." : "↓ Download PDF"}
        </button>
      </div>

      <div style={styles.previewWrapper}>
        <div ref={cvPreviewRef} style={styles.cvDocument}>
          <CVTemplate cv={tailoredCV} />
        </div>
      </div>

      <div style={styles.footer}>
        <p>
          Need changes? Reply to your confirmation email or WhatsApp us. We'll revise within 1 hour.
        </p>
        <button style={styles.secondaryBtn} onClick={() => navigate("/")}>
          ← Back to Jobly
        </button>
      </div>
    </div>
  );
}

// ============ CV TEMPLATE COMPONENT ============
// This is the visual layout that becomes the PDF.
// Clean, professional, ATS-friendly single-column layout.

function CVTemplate({ cv }) {
  return (
    <div style={cvStyles.container}>
      {/* HEADER */}
      <header style={cvStyles.header}>
        <h1 style={cvStyles.name}>{cv.fullName || "Your Name"}</h1>
        <div style={cvStyles.contact}>
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span> · {cv.phone}</span>}
          {cv.location && <span> · {cv.location}</span>}
          {cv.linkedin && <span> · {cv.linkedin}</span>}
        </div>
      </header>

      {/* SUMMARY */}
      {cv.summary && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Professional Summary</h2>
          <p style={cvStyles.summary}>{cv.summary}</p>
        </section>
      )}

      {/* SKILLS */}
      {cv.skills?.length > 0 && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Core Skills</h2>
          <div style={cvStyles.skillsRow}>{cv.skills.join(" · ")}</div>
        </section>
      )}

      {/* EXPERIENCE */}
      {cv.experience?.length > 0 && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Professional Experience</h2>
          {cv.experience.map((exp, i) => (
            <div key={i} style={cvStyles.expItem}>
              <div style={cvStyles.expHeader}>
                <div>
                  <div style={cvStyles.jobTitle}>{exp.title}</div>
                  <div style={cvStyles.company}>{exp.company}{exp.location ? ` · ${exp.location}` : ""}</div>
                </div>
                <div style={cvStyles.dates}>{exp.startDate} – {exp.endDate}</div>
              </div>
              {exp.bullets?.length > 0 && (
                <ul style={cvStyles.bullets}>
                  {exp.bullets.map((b, j) => <li key={j} style={cvStyles.bullet}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* PROJECTS */}
      {cv.projects?.length > 0 && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Projects</h2>
          {cv.projects.map((p, i) => (
            <div key={i} style={cvStyles.projectItem}>
              <div style={cvStyles.projectName}>{p.name}</div>
              <div style={cvStyles.projectDesc}>{p.description}</div>
              {p.technologies?.length > 0 && (
                <div style={cvStyles.projectTech}>
                  <strong>Tech:</strong> {p.technologies.join(", ")}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* EDUCATION */}
      {cv.education?.length > 0 && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Education</h2>
          {cv.education.map((edu, i) => (
            <div key={i} style={cvStyles.eduItem}>
              <div style={cvStyles.expHeader}>
                <div>
                  <div style={cvStyles.degree}>{edu.degree}</div>
                  <div style={cvStyles.institution}>{edu.institution}{edu.location ? ` · ${edu.location}` : ""}</div>
                </div>
                <div style={cvStyles.dates}>{edu.startDate} – {edu.endDate}</div>
              </div>
              {edu.details && <div style={cvStyles.eduDetails}>{edu.details}</div>}
            </div>
          ))}
        </section>
      )}

      {/* CERTIFICATIONS */}
      {cv.certifications?.length > 0 && (
        <section style={cvStyles.section}>
          <h2 style={cvStyles.sectionTitle}>Certifications</h2>
          {cv.certifications.map((c, i) => (
            <div key={i} style={cvStyles.certItem}>
              <strong>{c.name}</strong> — {c.issuer} {c.year && `(${c.year})`}
            </div>
          ))}
        </section>
      )}

      {/* SUBTLE FOOTER — your marketing hook */}
      <div style={cvStyles.cvFooter}>
        ✨ Tailored with Jobly · joblyai-eight.vercel.app
      </div>
    </div>
  );
}

// ============ PAGE STYLES ============

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "40px 20px",
  },
  centerCard: {
    maxWidth: 600,
    margin: "60px auto",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 48,
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: 32,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px",
    fontFamily: "'Source Serif 4', Georgia, serif",
  },
  subtitle: { fontSize: 16, color: "#6b7280", margin: "0 0 32px", lineHeight: 1.6 },
  spinnerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #e5e7eb",
    borderTopColor: "#0a66c2",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  spinnerText: { fontSize: 14, color: "#6b7280" },
  progressSteps: {
    textAlign: "left",
    maxWidth: 320,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#9ca3af",
  },
  stepActive: { color: "#0a66c2", fontWeight: 600 },
  supportNote: {
    fontSize: 13,
    color: "#6b7280",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    margin: "20px 0",
    lineHeight: 1.6,
  },
  primaryBtn: {
    padding: "14px 28px",
    backgroundColor: "#0a66c2",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    color: "#0a66c2",
    border: "1px solid #0a66c2",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
  },
  successBanner: {
    maxWidth: 850,
    margin: "0 auto 24px",
    background: "linear-gradient(135deg, #0a66c2 0%, #0073e6 100%)",
    color: "#ffffff",
    padding: "20px 28px",
    borderRadius: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    boxShadow: "0 10px 30px rgba(10,102,194,0.25)",
  },
  bannerLeft: { display: "flex", alignItems: "center", gap: 16 },
  bannerIcon: { fontSize: 32 },
  bannerTitle: { fontSize: 18, fontWeight: 700 },
  bannerSubtitle: { fontSize: 13, opacity: 0.9, marginTop: 2 },
  downloadBtn: {
    padding: "12px 24px",
    backgroundColor: "#ffffff",
    color: "#0a66c2",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  },
  previewWrapper: {
    maxWidth: 850,
    margin: "0 auto",
    backgroundColor: "#e5e7eb",
    padding: 24,
    borderRadius: 12,
  },
  cvDocument: {
    backgroundColor: "#ffffff",
    minHeight: "1100px",
    padding: "60px 70px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  footer: {
    maxWidth: 850,
    margin: "32px auto 0",
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
  },
};

// ============ CV TEMPLATE STYLES ============
// These render the CV layout. Keep ATS-friendly: single column, no graphics, clear hierarchy.

const cvStyles = {
  container: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: "#1a1a1a",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
    paddingBottom: 18,
    borderBottom: "2px solid #1a1a1a",
  },
  name: {
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 8px",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  contact: { fontSize: 11, color: "#444" },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    color: "#1a1a1a",
    margin: "0 0 10px",
    paddingBottom: 4,
    borderBottom: "1px solid #d1d5db",
  },
  summary: { fontSize: 11, lineHeight: 1.6, margin: 0, color: "#333" },
  skillsRow: { fontSize: 11, lineHeight: 1.6 },
  expItem: { marginBottom: 14 },
  expHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  jobTitle: { fontSize: 12, fontWeight: 700 },
  company: { fontSize: 11, fontStyle: "italic", color: "#444" },
  dates: { fontSize: 10, color: "#666", whiteSpace: "nowrap", marginLeft: 12 },
  bullets: { margin: "6px 0 0", paddingLeft: 18 },
  bullet: { fontSize: 11, lineHeight: 1.55, marginBottom: 3 },
  projectItem: { marginBottom: 10 },
  projectName: { fontSize: 12, fontWeight: 700 },
  projectDesc: { fontSize: 11, margin: "3px 0", color: "#333" },
  projectTech: { fontSize: 10, color: "#666", fontStyle: "italic" },
  eduItem: { marginBottom: 10 },
  degree: { fontSize: 12, fontWeight: 700 },
  institution: { fontSize: 11, fontStyle: "italic", color: "#444" },
  eduDetails: { fontSize: 10, color: "#666", marginTop: 3 },
  certItem: { fontSize: 11, marginBottom: 5 },
  cvFooter: {
    marginTop: 30,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
};
