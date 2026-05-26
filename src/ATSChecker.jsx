import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "./pages/Footer.jsx";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function ATSChecker() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [cvFile, setCvFile] = useState(null);
  const [cvBase64, setCvBase64] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  // Handle CV upload — converts PDF to base64, works on ALL devices
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setCvFile(file);
    setError("");
    setCvBase64("");

    try {
      // FileReader works on every browser including iOS Safari and Android Chrome
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // result is "data:application/pdf;base64,XXXX" — we only want the XXXX part
          const base64Data = reader.result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(file);
      });

      if (!base64 || base64.length < 100) {
        throw new Error("Empty or invalid PDF");
      }

      setCvBase64(base64);
      console.log("PDF converted to base64, length:", base64.length);
    } catch (err) {
      console.error("File read error:", err);
      setError("Could not read file. Please try again with a different PDF.");
      setCvFile(null);
    }
  };

  // Main analyzer — sends PDF directly to Gemini as base64 (no PDF.js)
  const analyzeATS = async () => {
    if (!cvBase64 || !jobDescription) {
      setError("Please upload your CV and paste the job description");
      return;
    }

    if (jobDescription.length < 100) {
      setError("📝 Job description is too short. Please paste the FULL job description (at least 100 characters) for accurate analysis.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setResults(null);

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume reviewer who provides professional, supportive guidance to job seekers.

Analyze the CV (provided as a PDF) against the job description below and return ONLY valid JSON in this exact format:

{
  "score": <number 0-100>,
  "verdict": "<one of: Excellent, Good, Needs Work, Poor>",
  "summary": "<2-3 sentence professional, constructive summary of the match>",
  "strongMatches": [
    {"keyword": "<keyword>", "context": "<where/how it appears in CV>"}
  ],
  "missingKeywords": [
    {"keyword": "<recommended keyword>", "importance": "<Critical/Important/Nice-to-have>", "suggestion": "<professional, encouraging suggestion on how to add it>"}
  ],
  "formatIssues": [
    {"issue": "<format observation>", "severity": "<Critical/Important/Nice-to-have>", "fix": "<professional, helpful fix recommendation>"}
  ],
  "topSuggestions": [
    "<actionable, encouraging suggestion 1>",
    "<actionable, encouraging suggestion 2>",
    "<actionable, encouraging suggestion 3>"
  ],
  "skillsGap": [
    {"skill": "<skill from JD to consider adding>", "priority": "<Critical/Important/Nice-to-have>"}
  ]
}

Rules:
- Score 90-100 = Excellent, 75-89 = Good, 50-74 = Needs Work, <50 = Poor
- Find 5-10 strong matches if they exist
- Find 5-10 recommended keyword additions that would strengthen the CV
- Find 2-5 format observations
- Give 3-5 actionable, professional suggestions
- TONE: Be supportive and constructive, like a career coach. Never use negative or harsh language.
- Use professional language: "Consider adding...", "Recommended to include...", "Would strengthen the profile..."
- Importance levels: Critical = must-have for this role, Important = significantly helps, Nice-to-have = optional polish
- Return ONLY the JSON, no markdown, no extra text

Job Description:
${jobDescription}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: cvBase64
                  }
                },
                { text: prompt }
              ]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini error:", errorText);
        if (response.status === 429) throw new Error("RATE_LIMIT");
        else if (response.status === 403) throw new Error("INVALID_KEY");
        else if (response.status === 400) throw new Error("BAD_REQUEST");
        else throw new Error(`API_ERROR_${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("EMPTY_RESPONSE");

      const cleanText = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch {
        try {
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          else throw new Error("No JSON found");
        } catch {
          try {
            let fixed = cleanText
              .replace(/,(\s*[}\]])/g, "$1")
              .replace(/(\r\n|\n|\r)/g, " ")
              .replace(/\t/g, " ");
            const openCount = (fixed.match(/\{/g) || []).length;
            const closeCount = (fixed.match(/\}/g) || []).length;
            if (openCount > closeCount) fixed += "}".repeat(openCount - closeCount);
            parsed = JSON.parse(fixed);
          } catch {
            throw new Error("JSON_PARSE_FAILED");
          }
        }
      }

      setResults(parsed);
    } catch (err) {
      console.error("Analysis error:", err);
      if (err.message === "RATE_LIMIT") {
        setError("⏱️ Too many requests. Please wait 60 seconds and try again.");
      } else if (err.message === "INVALID_KEY") {
        setError("🔑 API key issue. Please contact support.");
      } else if (err.message === "BAD_REQUEST") {
        setError("📝 Could not process this PDF. Make sure it's a text-based PDF (not a scanned image).");
      } else if (err.message === "EMPTY_RESPONSE") {
        setError("🤖 AI couldn't analyze this. Try with a more detailed job description.");
      } else if (err.message === "JSON_PARSE_FAILED") {
        setError("🤖 AI response was incomplete. Please try again — usually works on retry.");
      } else {
        setError("❌ Something went wrong. Please try again in a moment.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "#10b981";
    if (score >= 75) return "#0a66c2";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs Work";
    return "Poor";
  };



  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => navigate("/")} role="button" tabIndex={0}>
          <img src="/jobly-logo.svg" alt="Jobly" style={{ height: 32 }} onError={(e) => (e.target.style.display = "none")} />
          <span style={styles.logoText}>Jobly</span>
        </div>
        <button style={styles.signInBtn} onClick={() => navigate("/")}>Sign In</button>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroBadge}><span style={{ marginRight: 6 }}>✨</span> 100% Free · No Signup Required</div>
        <h1 style={styles.heroTitle}>Free ATS Resume Checker</h1>
        <p style={styles.heroSubtitle}>See how well your CV matches the job in 30 seconds. Get your ATS score, missing keywords, and actionable fixes.</p>
      </section>

      <main style={styles.main}>
        {!results ? (
          <div style={styles.card}>
            <div style={styles.section}>
              <div style={styles.stepHeader}>
                <div style={styles.stepNumber}>1</div>
                <h2 style={styles.stepTitle}>Upload your CV</h2>
              </div>
              <div
                style={{ ...styles.uploadBox, ...(cvFile ? styles.uploadBoxActive : {}) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: "none" }} />
                {cvFile ? (
                  <>
                    <div style={styles.uploadIcon}>📄</div>
                    <div style={styles.uploadFileName}>{cvFile.name}</div>
                    <div style={styles.uploadHint}>Click to upload a different file</div>
                  </>
                ) : (
                  <>
                    <div style={styles.uploadIcon}>📁</div>
                    <div style={styles.uploadText}>Click to upload your CV</div>
                    <div style={styles.uploadHint}>PDF only · Max 5MB · English CVs work best</div>
                  </>
                )}
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.stepHeader}>
                <div style={styles.stepNumber}>2</div>
                <h2 style={styles.stepTitle}>Paste the job description</h2>
              </div>
              <textarea
                style={styles.textarea}
                placeholder="Paste the full job description here (the more detail, the better the analysis)..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
              />
              <div style={styles.charCount}>
                {jobDescription.length} characters
                {jobDescription.length < 100 && jobDescription.length > 0 && " · Tip: longer descriptions give better results"}
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              style={{ ...styles.analyzeBtn, ...((!cvBase64 || jobDescription.length < 100 || analyzing) ? styles.analyzeBtnDisabled : {}) }}
              onClick={analyzeATS}
              disabled={!cvBase64 || jobDescription.length < 100 || analyzing}
            >
              {analyzing ? (<><span style={styles.spinner}></span>Analyzing your CV...</>) : <>Check My ATS Score →</>}
            </button>

            <div style={styles.privacyNote}>🔒 Your CV is analyzed instantly and never stored</div>
          </div>
        ) : (
          <ResultsView
            cvBase64={cvBase64}
            jobDescription={jobDescription}
            results={results}
            onReset={() => { setResults(null); setCvFile(null); setCvBase64(""); setJobDescription(""); }}
            getScoreColor={getScoreColor}
            getScoreLabel={getScoreLabel}
            navigate={navigate}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function ResultsView({ results, onReset, getScoreColor, navigate, cvBase64, jobDescription }) {
  const scoreColor = getScoreColor(results.score);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFirstName, setPayFirstName] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [payProcessing, setPayProcessing] = useState(false);
  const [payError, setPayError] = useState("");

  const handlePayNow = async () => {
    setPayError("");

    if (!payFirstName.trim() || payFirstName.trim().length < 2) {
      setPayError("Please enter your first name");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payEmail)) {
      setPayError("Please enter a valid email");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(payPhone)) {
      setPayError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setPayProcessing(true);

    sessionStorage.setItem("jobly_cv_base64", cvBase64);
    sessionStorage.setItem("jobly_job_description", jobDescription);
    sessionStorage.setItem("jobly_ats_analysis", JSON.stringify(results));
    sessionStorage.setItem("jobly_customer_email", payEmail);
    sessionStorage.setItem("jobly_customer_name", payFirstName);

    try {
      const response = await fetch("/api/payu-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payEmail,
          firstname: payFirstName.trim(),
          phone: payPhone,
          productinfo: "Jobly Tailored CV",
          amount: "99",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("PayU initiate failed:", data);
        setPayError("Payment setup failed. Please try again or contact support.");
        setPayProcessing(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://secure.payu.in/_payment";
      form.style.display = "none";

      const fields = {
        key: data.key,
        txnid: data.txnid,
        amount: data.amount,
        productinfo: data.productinfo,
        firstname: data.firstname,
        email: data.email,
        phone: data.phone,
        surl: data.surl,
        furl: data.furl,
        hash: data.hash,
      };

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment error:", err);
      setPayError("Something went wrong. Please try again or contact us on WhatsApp.");
      setPayProcessing(false);
    }
  };

  return (
    <div style={styles.resultsContainer}>
      <div style={styles.scoreCard}>
        <div style={styles.scoreLabel}>Your ATS Score</div>
        <div style={{ ...styles.scoreNumber, color: scoreColor }}>
          {results.score}<span style={styles.scoreOutOf}>/100</span>
        </div>
        <div style={{ ...styles.verdict, color: scoreColor }}>{results.verdict}</div>
        <div style={styles.scoreBar}>
          <div style={{ ...styles.scoreBarFill, width: `${results.score}%`, backgroundColor: scoreColor }} />
        </div>
        <p style={styles.summary}>{results.summary}</p>
      </div>

      <div className="ats-results-grid" style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>✅ Your Strengths ({results.strongMatches?.length || 0})</h3>
          {results.strongMatches?.length > 0 ? (
            <ul style={styles.list}>
              {results.strongMatches.map((m, i) => (
                <li key={i} style={styles.listItem}>
                  <strong style={{ color: "#10b981" }}>{m.keyword}</strong>
                  <div style={styles.listSub}>{m.context}</div>
                </li>
              ))}
            </ul>
          ) : <p style={styles.emptyState}>Add more job-relevant skills to strengthen your profile</p>}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>💡 Recommended Additions ({results.missingKeywords?.length || 0})</h3>
          {results.missingKeywords?.length > 0 ? (
            <ul style={styles.list}>
              {results.missingKeywords.map((k, i) => (
                <li key={i} style={styles.listItem}>
                  <div style={styles.keywordRow}>
                    <strong style={{ color: "#0a66c2" }}>{k.keyword}</strong>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: k.importance === "Critical" || k.importance === "High" ? "#fee2e2" : k.importance === "Important" || k.importance === "Medium" ? "#fef3c7" : "#e0f2fe",
                      color: k.importance === "Critical" || k.importance === "High" ? "#991b1b" : k.importance === "Important" || k.importance === "Medium" ? "#92400e" : "#075985",
                    }}>{k.importance}</span>
                  </div>
                  <div style={styles.listSub}>{k.suggestion}</div>
                </li>
              ))}
            </ul>
          ) : <p style={styles.emptyState}>Excellent! Your CV covers all key requirements for this role</p>}
        </div>
      </div>

      {results.formatIssues?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 Format Observations ({results.formatIssues.length})</h3>
          <ul style={styles.list}>
            {results.formatIssues.map((f, i) => (
              <li key={i} style={styles.listItem}>
                <strong style={{ color: "#f59e0b" }}>{f.issue}</strong>
                <div style={styles.listSub}>{f.fix}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>🎯 Key Recommendations</h3>
        <ol style={styles.suggestionsList}>
          {results.topSuggestions?.map((s, i) => <li key={i} style={styles.suggestion}>{s}</li>)}
        </ol>
      </div>

      {results.skillsGap?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📚 Skills to Consider Adding</h3>
          <div style={styles.skillsContainer}>
            {results.skillsGap.map((s, i) => (
              <span key={i} style={{
                ...styles.skillChip,
                backgroundColor: s.priority === "Critical" || s.priority === "High" ? "#fee2e2" : s.priority === "Important" || s.priority === "Medium" ? "#fef3c7" : "#e0f2fe",
                color: s.priority === "Critical" || s.priority === "High" ? "#991b1b" : s.priority === "Important" || s.priority === "Medium" ? "#92400e" : "#075985",
              }}>{s.skill}</span>
            ))}
          </div>
        </div>
      )}

      <div style={styles.pricingSection}>
        <div style={styles.pricingHeader}>
          <h2 style={styles.pricingMainTitle}>Want to FIX all of this?</h2>
          <p style={styles.pricingMainSubtitle}>Our AI rewrites your CV with all missing keywords, fixes format issues, and makes it ATS-perfect in 30 seconds.</p>
        </div>

        <div className="ats-pricing-grid" style={styles.pricingGrid}>
          <div style={styles.pricingCard}>
            <div style={styles.pricingBadge}>ONE-TIME</div>
            <div style={styles.pricingIcon}>⚡</div>
            <h3 style={styles.pricingCardTitle}>Fix This CV</h3>
            <div style={styles.pricingPrice}>
              <span style={styles.priceCurrency}>₹</span>
              <span style={styles.priceAmount}>99</span>
            </div>
            <p style={styles.pricingCardSubtitle}>Perfect for one application</p>
            <ul style={styles.featureList}>
              {["AI rewrites this exact CV", "Adds all missing keywords naturally", "Fixes all format issues", "Delivered in 30 seconds", "PDF download"].map((f, i) => (
                <li key={i} style={styles.featureItem}><span style={styles.featureCheck}>✓</span><span>{f}</span></li>
              ))}
            </ul>
            <button style={styles.pricingButtonOneTime} onClick={() => setShowPayModal(true)}>Get Tailored CV — ₹99 →</button>
            <p style={styles.pricingFootnote}>Save ₹4,901 vs CV writer</p>
          </div>

        </div>

        <div style={styles.trustStrip}>
          {[["🔒", "Secure UPI payment"], ["⚡", "Delivered in 30 seconds"], ["💯", "Money-back guarantee"]].map(([icon, text], i) => (
            <div key={i} style={styles.trustItem}><span style={styles.trustIcon}>{icon}</span><span>{text}</span></div>
          ))}
        </div>
      </div>

      <div style={styles.tryAgain}>
        <button style={styles.tryAgainBtn} onClick={onReset}>← Check Another CV</button>
      </div>

      {showPayModal && (
        <div style={styles.modalBackdrop} onClick={() => !payProcessing && setShowPayModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => !payProcessing && setShowPayModal(false)} disabled={payProcessing}>×</button>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Almost there! 🎉</h2>
              <p style={styles.modalSubtitle}>Just 3 details to send your tailored CV</p>
            </div>
            <div style={styles.modalForm}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>First Name</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={payFirstName}
                  onChange={(e) => setPayFirstName(e.target.value)}
                  placeholder="e.g. Atul"
                  disabled={payProcessing}
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Email</label>
                <input
                  type="email"
                  style={styles.modalInput}
                  value={payEmail}
                  onChange={(e) => setPayEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={payProcessing}
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Phone (Indian mobile)</label>
                <input
                  type="tel"
                  style={styles.modalInput}
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  disabled={payProcessing}
                  maxLength={10}
                />
              </div>
              {payError && <div style={styles.modalError}>{payError}</div>}
              <button
                style={{ ...styles.modalSubmit, opacity: payProcessing ? 0.6 : 1, cursor: payProcessing ? "wait" : "pointer" }}
                onClick={handlePayNow}
                disabled={payProcessing}
              >
                {payProcessing ? "Processing..." : "Pay ₹99 →"}
              </button>
              <p style={styles.modalFooter}>🔒 Secure payment via PayU · UPI / Card / Wallet</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", color: "#1f2937" },
  header: { backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
  logo: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  logoText: { fontSize: 20, fontWeight: 700, color: "#0a66c2", fontFamily: "'Source Serif 4', Georgia, serif" },
  signInBtn: { padding: "8px 20px", backgroundColor: "transparent", color: "#0a66c2", border: "1px solid #0a66c2", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  hero: { textAlign: "center", padding: "60px 24px 40px", maxWidth: 800, margin: "0 auto" },
  heroBadge: { display: "inline-flex", alignItems: "center", backgroundColor: "#dbeafe", color: "#1e40af", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 },
  heroTitle: { fontSize: 48, fontWeight: 700, color: "#111827", margin: "0 0 16px", lineHeight: 1.1, fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: "-0.02em" },
  heroSubtitle: { fontSize: 18, color: "#6b7280", margin: 0, lineHeight: 1.6 },
  main: { maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" },
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 32, marginBottom: 20, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  section: { marginBottom: 32 },
  stepHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  stepNumber: { width: 32, height: 32, borderRadius: "50%", backgroundColor: "#0a66c2", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 },
  stepTitle: { fontSize: 20, fontWeight: 600, margin: 0, color: "#111827" },
  uploadBox: { border: "2px dashed #d1d5db", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", backgroundColor: "#f9fafb", transition: "all 0.2s" },
  uploadBoxActive: { borderColor: "#0a66c2", backgroundColor: "#dbeafe" },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 4 },
  uploadFileName: { fontSize: 16, fontWeight: 600, color: "#0a66c2", marginBottom: 4 },
  uploadHint: { fontSize: 13, color: "#6b7280" },
  textarea: { width: "100%", padding: 16, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 200, boxSizing: "border-box", backgroundColor: "#ffffff" },
  charCount: { marginTop: 8, fontSize: 13, color: "#6b7280" },
  analyzeBtn: { width: "100%", padding: "16px 24px", backgroundColor: "#0a66c2", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  analyzeBtnDisabled: { backgroundColor: "#9ca3af", cursor: "not-allowed" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" },
  privacyNote: { textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 16 },
  error: { backgroundColor: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16, border: "1px solid #fecaca" },
  resultsContainer: { maxWidth: 900, margin: "0 auto" },
  scoreCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 40, marginBottom: 20, border: "1px solid #e5e7eb", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
  scoreLabel: { fontSize: 14, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  scoreNumber: { fontSize: 96, fontWeight: 700, lineHeight: 1, margin: "8px 0", fontFamily: "'Source Serif 4', Georgia, serif" },
  scoreOutOf: { fontSize: 32, color: "#9ca3af", fontWeight: 400 },
  verdict: { fontSize: 20, fontWeight: 600, marginBottom: 24 },
  scoreBar: { width: "100%", height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginBottom: 16 },
  scoreBarFill: { height: "100%", transition: "width 0.5s ease" },
  summary: { fontSize: 16, color: "#4b5563", lineHeight: 1.6, margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 16px" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  listItem: { padding: "12px 0", borderBottom: "1px solid #f3f4f6" },
  listSub: { fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.5 },
  keywordRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, textTransform: "uppercase" },
  emptyState: { color: "#9ca3af", fontSize: 14, fontStyle: "italic", margin: 0 },
  suggestionsList: { paddingLeft: 24, margin: 0 },
  suggestion: { padding: "8px 0", color: "#374151", lineHeight: 1.6 },
  skillsContainer: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillChip: { padding: "6px 14px", borderRadius: 16, fontSize: 13, fontWeight: 600 },
  pricingSection: { marginBottom: 20 },
  pricingHeader: { textAlign: "center", marginBottom: 32 },
  pricingMainTitle: { fontSize: 36, fontWeight: 700, margin: "0 0 12px", color: "#111827", fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: 1.2 },
  pricingMainSubtitle: { fontSize: 16, color: "#6b7280", margin: "0 auto", lineHeight: 1.6, maxWidth: 600 },
  pricingGrid: { display: "flex", justifyContent: "center", marginBottom: 24 },
  pricingCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 32, border: "2px solid #e5e7eb", position: "relative", display: "flex", flexDirection: "column" },
  pricingCardFeatured: { background: "linear-gradient(135deg, #0a66c2 0%, #0073e6 100%)", borderRadius: 16, padding: 32, color: "#ffffff", position: "relative", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(10,102,194,0.3)", transform: "scale(1.02)" },
  popularBadge: { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", backgroundColor: "#fbbf24", color: "#78350f", padding: "4px 16px", borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" },
  pricingBadge: { display: "inline-block", backgroundColor: "#f3f4f6", color: "#374151", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 16, alignSelf: "flex-start" },
  pricingBadgeFeatured: { display: "inline-block", backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 16, alignSelf: "flex-start" },
  pricingIcon: { fontSize: 36, marginBottom: 12 },
  pricingCardTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#111827" },
  pricingCardTitleFeatured: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#ffffff" },
  pricingPrice: { display: "flex", alignItems: "baseline", marginBottom: 6 },
  priceCurrency: { fontSize: 28, fontWeight: 600, color: "#111827" },
  priceCurrencyFeatured: { fontSize: 28, fontWeight: 600, color: "#ffffff" },
  priceAmount: { fontSize: 56, fontWeight: 700, color: "#111827", lineHeight: 1, fontFamily: "'Source Serif 4', Georgia, serif" },
  priceAmountFeatured: { fontSize: 56, fontWeight: 700, color: "#ffffff", lineHeight: 1, fontFamily: "'Source Serif 4', Georgia, serif" },
  pricePeriod: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginLeft: 6 },
  pricingCardSubtitle: { fontSize: 14, color: "#6b7280", margin: "0 0 24px" },
  pricingCardSubtitleFeatured: { fontSize: 14, color: "rgba(255,255,255,0.9)", margin: "0 0 24px" },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  featureListFeatured: { listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  featureItem: { display: "flex", alignItems: "center", gap: 10, fontSize: 14, lineHeight: 1.5 },
  featureCheck: { width: 20, height: 20, backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  featureCheckFeatured: { width: 20, height: 20, backgroundColor: "rgba(255,255,255,0.25)", color: "#ffffff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  pricingButtonOneTime: { width: "100%", padding: "14px 24px", backgroundColor: "#111827", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  pricingButtonFeatured: { width: "100%", padding: "14px 24px", backgroundColor: "#ffffff", color: "#0a66c2", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  pricingFootnote: { fontSize: 12, color: "#15803d", textAlign: "center", margin: "12px 0 0", fontWeight: 600 },
  pricingFootnoteFeatured: { fontSize: 12, color: "rgba(255,255,255,0.95)", textAlign: "center", margin: "12px 0 0", fontWeight: 600 },
  trustStrip: { display: "flex", justifyContent: "center", gap: 32, padding: "16px", backgroundColor: "#f9fafb", borderRadius: 12, flexWrap: "wrap" },
  trustItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280", fontWeight: 500 },
  trustIcon: { fontSize: 16 },
  tryAgain: { textAlign: "center", padding: "24px 0" },
  tryAgainBtn: { background: "none", border: "none", color: "#0a66c2", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  modalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" },
  modalCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" },
  modalClose: { position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 28, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 4 },
  modalHeader: { marginBottom: 24, textAlign: "center" },
  modalTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 8px", fontFamily: "'Source Serif 4', Georgia, serif" },
  modalSubtitle: { fontSize: 14, color: "#6b7280", margin: 0 },
  modalForm: { display: "flex", flexDirection: "column", gap: 16 },
  modalField: { display: "flex", flexDirection: "column", gap: 6 },
  modalLabel: { fontSize: 13, fontWeight: 600, color: "#374151" },
  modalInput: { padding: "12px 14px", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" },
  modalError: { padding: "10px 12px", backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, fontWeight: 500 },
  modalSubmit: { padding: "14px 24px", backgroundColor: "#0a66c2", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, marginTop: 4 },
  modalFooter: { fontSize: 12, color: "#6b7280", textAlign: "center", margin: "8px 0 0" },
};
