// ATSChecker.jsx
// Drop this file into: ~/Desktop/applyai/frontend/src/ATSChecker.jsx
// Then update App.jsx to add the route (instructions below)

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "./pages/Footer.jsx";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function ATSChecker() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  // Handle CV upload (PDF)
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

    // Extract text from PDF using pdf.js (legacy build for Vite compatibility)
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs?url");
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      if (!fullText.trim()) {
        throw new Error("Empty PDF content");
      }

      console.log("PDF extracted successfully, length:", fullText.length);

      // Simple English-language detection
      // Counts common English words vs total words
      const englishWordsCommon = [
        "the", "and", "of", "to", "in", "a", "is", "with", "for", "on",
        "as", "at", "by", "an", "or", "be", "this", "from", "are", "have",
        "experience", "work", "skills", "education", "company", "team",
        "project", "data", "manage", "develop", "design", "lead", "build",
        "support", "system", "client", "service", "report", "analysis"
      ];
      const words = fullText.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const englishMatches = words.filter(w => englishWordsCommon.includes(w)).length;
      const englishRatio = words.length > 0 ? englishMatches / words.length : 0;

      if (words.length > 50 && englishRatio < 0.05) {
        // Less than 5% common English words = likely non-English CV
        setError(
          "🌐 This CV doesn't appear to be in English. Jobly currently works best with English-language CVs. Please upload an English version for accurate ATS analysis."
        );
        setCvFile(null);
        return;
      }

      setCvText(fullText);
    } catch (err) {
      console.error("PDF parse error:", err);
      setError(
        "Could not read PDF. Make sure it's a text-based PDF (not a scanned image). Try a different file."
      );
      setCvFile(null);
    }

  };

  // Main analyzer function
  const analyzeATS = async () => {
    if (!cvText || !jobDescription) {
      setError("Please upload your CV and paste the job description");
      return;
    }

    if (jobDescription.length < 100) {
      setError(
        "📝 Job description is too short. Please paste the FULL job description (at least 100 characters) for accurate analysis."
      );
      return;
    }

    setAnalyzing(true);
    setError("");
    setResults(null);

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume reviewer who provides professional, supportive guidance to job seekers.

Analyze this CV against the job description and return ONLY valid JSON in this exact format:

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
- Find 2-5 format observations (common ATS considerations: dates, headings, tables, etc.)
- Give 3-5 actionable, professional suggestions
- TONE: Be supportive and constructive, like a career coach. Never use negative or harsh language.
- Frame suggestions as opportunities for improvement, not failures.
- Use professional language: "Consider adding...", "Recommended to include...", "Would strengthen the profile..."
- Importance levels: Critical = must-have for this role, Important = significantly helps, Nice-to-have = optional polish
- Return ONLY the JSON, no markdown, no extra text

CV:
${cvText}

Job Description:
${jobDescription}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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

        // Parse Gemini-specific error codes
        if (response.status === 429) {
          throw new Error("RATE_LIMIT");
        } else if (response.status === 403) {
          throw new Error("INVALID_KEY");
        } else if (response.status === 400) {
          throw new Error("BAD_REQUEST");
        } else {
          throw new Error(`API_ERROR_${response.status}`);
        }
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("EMPTY_RESPONSE");
      }

      const cleanText = text.replace(/```json|```/g, "").trim();

      // Robust JSON parsing with multi-layer fallback
      let parsed;
      try {
        // Attempt 1: Parse as-is
        parsed = JSON.parse(cleanText);
      } catch (parseErr) {
        console.warn("First parse failed, attempting recovery...", parseErr.message);

        try {
          // Attempt 2: Find JSON object boundaries and extract
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON object found");
          }
        } catch (recoverErr) {
          console.warn("Second parse failed, fixing common issues...", recoverErr.message);

          try {
            // Attempt 3: Fix common JSON issues
            // - Remove trailing commas
            // - Fix unescaped newlines in strings
            // - Truncate at last valid closing brace
            let fixed = cleanText
              .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
              .replace(/(\r\n|\n|\r)/g, " ") // remove newlines that break strings
              .replace(/\t/g, " "); // remove tabs

            // Find last balanced closing brace
            const openCount = (fixed.match(/\{/g) || []).length;
            const closeCount = (fixed.match(/\}/g) || []).length;
            if (openCount > closeCount) {
              // Add missing closing braces
              fixed += "}".repeat(openCount - closeCount);
            }

            parsed = JSON.parse(fixed);
          } catch (finalErr) {
            console.error("All JSON parsing attempts failed:", finalErr);
            console.error("Raw response:", cleanText);
            throw new Error("JSON_PARSE_FAILED");
          }
        }
      }

      setResults(parsed);
    } catch (err) {
      console.error("Analysis error:", err);

      // User-friendly error messages
      if (err.message === "RATE_LIMIT") {
        setError(
          "⏱️ Too many requests. Please wait 60 seconds and try again. (Free tier limit)"
        );
      } else if (err.message === "INVALID_KEY") {
        setError(
          "🔑 API key issue. Please contact support."
        );
      } else if (err.message === "BAD_REQUEST") {
        setError(
          "📝 Please make sure your job description is detailed (at least 100 characters)."
        );
      } else if (err.message === "EMPTY_RESPONSE") {
        setError(
          "🤖 AI couldn't analyze this. Try with a more detailed job description."
        );
      } else if (err.message === "JSON_PARSE_FAILED" || err.message.includes("JSON")) {
        setError(
          "🤖 AI response was incomplete (possibly due to a long CV). Please try again — usually works on retry."
        );
      } else {
        setError(
          "❌ Something went wrong. Please try again in a moment."
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "#10b981"; // green
    if (score >= 75) return "#0a66c2"; // linkedin blue
    if (score >= 50) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs Work";
    return "Poor";
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div
          style={styles.logo}
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
        >
          <img
            src="/jobly-logo.svg"
            alt="Jobly"
            style={{ height: 32 }}
            onError={(e) => (e.target.style.display = "none")}
          />
          <span style={styles.logoText}>Jobly</span>
        </div>
        <button
          style={styles.signInBtn}
          onClick={() => navigate("/")}
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroBadge}>
          <span style={{ marginRight: 6 }}>✨</span> 100% Free · No Signup
          Required
        </div>
        <h1 style={styles.heroTitle}>
          Free ATS Resume Checker
        </h1>
        <p style={styles.heroSubtitle}>
          See how well your CV matches the job in 30 seconds. Get your ATS
          score, missing keywords, and actionable fixes.
        </p>
      </section>

      {/* Main Content */}
      <main style={styles.main}>
        {!results ? (
          <div style={styles.card}>
            {/* Step 1: Upload CV */}
            <div style={styles.section}>
              <div style={styles.stepHeader}>
                <div style={styles.stepNumber}>1</div>
                <h2 style={styles.stepTitle}>Upload your CV</h2>
              </div>

              <div
                style={{
                  ...styles.uploadBox,
                  ...(cvFile ? styles.uploadBoxActive : {}),
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                {cvFile ? (
                  <>
                    <div style={styles.uploadIcon}>📄</div>
                    <div style={styles.uploadFileName}>{cvFile.name}</div>
                    <div style={styles.uploadHint}>
                      Click to upload a different file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.uploadIcon}>📁</div>
                    <div style={styles.uploadText}>
                      Click to upload your CV
                    </div>
                    <div style={styles.uploadHint}>
                      PDF only · Max 5MB · English CVs work best
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Step 2: Paste JD */}
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
                {jobDescription.length < 100 &&
                  jobDescription.length > 0 &&
                  " · Tip: longer descriptions give better results"}
              </div>
            </div>

            {/* Error */}
            {error && <div style={styles.error}>{error}</div>}

            {/* Action Button */}
            <button
              style={{
                ...styles.analyzeBtn,
                ...((!cvText || jobDescription.length < 100 || analyzing)
                  ? styles.analyzeBtnDisabled
                  : {}),
              }}
              onClick={analyzeATS}
              disabled={!cvText || jobDescription.length < 100 || analyzing}
            >
              {analyzing ? (
                <>
                  <span style={styles.spinner}></span>
                  Analyzing your CV...
                </>
              ) : (
                <>Check My ATS Score →</>
              )}
            </button>

            <div style={styles.privacyNote}>
              🔒 Your CV is analyzed instantly and never stored
            </div>
          </div>
        ) : (
          <ResultsView
            results={results}
            onReset={() => {
              setResults(null);
              setCvFile(null);
              setCvText("");
              setJobDescription("");
            }}
            getScoreColor={getScoreColor}
            getScoreLabel={getScoreLabel}
            navigate={navigate}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Results View Component
function ResultsView({
  results,
  onReset,
  getScoreColor,
  getScoreLabel,
  navigate,
}) {
  const scoreColor = getScoreColor(results.score);

  return (
    <div style={styles.resultsContainer}>
      {/* Score Card */}
      <div style={styles.scoreCard}>
        <div style={styles.scoreLabel}>Your ATS Score</div>
        <div style={{ ...styles.scoreNumber, color: scoreColor }}>
          {results.score}
          <span style={styles.scoreOutOf}>/100</span>
        </div>
        <div style={{ ...styles.verdict, color: scoreColor }}>
          {results.verdict}
        </div>
        <div style={styles.scoreBar}>
          <div
            style={{
              ...styles.scoreBarFill,
              width: `${results.score}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
        <p style={styles.summary}>{results.summary}</p>
      </div>

      {/* Grid: Strengths + Recommendations */}
      <div className="ats-results-grid" style={styles.grid}>
        {/* Your Strengths */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            ✅ Your Strengths ({results.strongMatches?.length || 0})
          </h3>
          {results.strongMatches?.length > 0 ? (
            <ul style={styles.list}>
              {results.strongMatches.map((m, i) => (
                <li key={i} style={styles.listItem}>
                  <strong style={{ color: "#10b981" }}>{m.keyword}</strong>
                  <div style={styles.listSub}>{m.context}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyState}>Add more job-relevant skills to strengthen your profile</p>
          )}
        </div>

        {/* Recommended Additions */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            💡 Recommended Additions ({results.missingKeywords?.length || 0})
          </h3>
          {results.missingKeywords?.length > 0 ? (
            <ul style={styles.list}>
              {results.missingKeywords.map((k, i) => (
                <li key={i} style={styles.listItem}>
                  <div style={styles.keywordRow}>
                    <strong style={{ color: "#0a66c2" }}>{k.keyword}</strong>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor:
                          k.importance === "Critical" || k.importance === "High" ? "#fee2e2" :
                          k.importance === "Important" || k.importance === "Medium" ? "#fef3c7" : "#e0f2fe",
                        color:
                          k.importance === "Critical" || k.importance === "High" ? "#991b1b" :
                          k.importance === "Important" || k.importance === "Medium" ? "#92400e" : "#075985",
                      }}
                    >
                      {k.importance}
                    </span>
                  </div>
                  <div style={styles.listSub}>{k.suggestion}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.emptyState}>Excellent! Your CV covers all key requirements for this role</p>
          )}
        </div>
      </div>

      {/* Format Observations */}
      {results.formatIssues?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            📋 Format Observations ({results.formatIssues.length})
          </h3>
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

      {/* Key Recommendations */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>🎯 Key Recommendations</h3>
        <ol style={styles.suggestionsList}>
          {results.topSuggestions?.map((s, i) => (
            <li key={i} style={styles.suggestion}>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* Skills to Consider */}
      {results.skillsGap?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📚 Skills to Consider Adding</h3>
          <div style={styles.skillsContainer}>
            {results.skillsGap.map((s, i) => (
              <span
                key={i}
                style={{
                  ...styles.skillChip,
                  backgroundColor:
                    s.priority === "Critical" || s.priority === "High"
                      ? "#fee2e2"
                      : s.priority === "Important" || s.priority === "Medium"
                      ? "#fef3c7"
                      : "#e0f2fe",
                  color:
                    s.priority === "Critical" || s.priority === "High"
                      ? "#991b1b"
                      : s.priority === "Important" || s.priority === "Medium"
                      ? "#92400e"
                      : "#075985",
                }}
              >
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* The Money CTA - Two-tier pricing */}
      <div style={styles.pricingSection}>
        <div style={styles.pricingHeader}>
          <h2 style={styles.pricingMainTitle}>
            Want to FIX all of this?
          </h2>
          <p style={styles.pricingMainSubtitle}>
            Our AI rewrites your CV with all missing keywords, fixes format issues, and makes it ATS-perfect in 30 seconds.
          </p>
        </div>

        <div className="ats-pricing-grid" style={styles.pricingGrid}>
          {/* One-Time Option */}
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
              <li style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>AI rewrites this exact CV</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Adds all missing keywords naturally</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Fixes all format issues</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Delivered in 30 seconds</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>PDF download</span>
              </li>
            </ul>

            <button
              style={styles.pricingButtonOneTime}
              onClick={() => navigate("/?pay=99")}
            >
              Get Tailored CV — ₹99 →
            </button>
            <p style={styles.pricingFootnote}>Save ₹4,901 vs CV writer</p>
          </div>

          {/* Subscription Option - HIGHLIGHTED */}
          <div style={styles.pricingCardFeatured}>
            <div style={styles.popularBadge}>⭐ MOST POPULAR</div>
            <div style={styles.pricingBadgeFeatured}>UNLIMITED</div>
            <div style={styles.pricingIcon}>💎</div>
            <h3 style={styles.pricingCardTitleFeatured}>Jobly Pro</h3>
            <div style={styles.pricingPrice}>
              <span style={styles.priceCurrencyFeatured}>₹</span>
              <span style={styles.priceAmountFeatured}>299</span>
              <span style={styles.pricePeriod}>/month</span>
            </div>
            <p style={styles.pricingCardSubtitleFeatured}>For active job hunters</p>

            <ul style={styles.featureListFeatured}>
              <li style={styles.featureItem}>
                <span style={styles.featureCheckFeatured}>✓</span>
                <span><strong>Unlimited</strong> CV tailoring</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheckFeatured}>✓</span>
                <span>Apply to 100+ jobs without rewriting</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheckFeatured}>✓</span>
                <span>Save all your CV versions</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheckFeatured}>✓</span>
                <span>AI job search across 20+ countries</span>
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureCheckFeatured}>✓</span>
                <span>Priority support</span>
              </li>
            </ul>

            <button
              style={styles.pricingButtonFeatured}
              onClick={() => navigate("/?pay=299")}
            >
              Subscribe ₹299/mo →
            </button>
            <p style={styles.pricingFootnoteFeatured}>
              💡 Just 3 applications = cheaper than ₹99/CV
            </p>
          </div>
        </div>

        {/* Trust Strip */}
        <div style={styles.trustStrip}>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>🔒</span>
            <span>Secure UPI payment</span>
          </div>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>⚡</span>
            <span>Delivered in 30 seconds</span>
          </div>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>💯</span>
            <span>Money-back guarantee</span>
          </div>
        </div>
      </div>

      {/* Try Again */}
      <div style={styles.tryAgain}>
        <button style={styles.tryAgainBtn} onClick={onReset}>
          ← Check Another CV
        </button>
      </div>
    </div>
  );
}

// Styles
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#1f2937",
  },

  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },

  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0a66c2",
    fontFamily: "'Source Serif 4', Georgia, serif",
  },

  signInBtn: {
    padding: "8px 20px",
    backgroundColor: "transparent",
    color: "#0a66c2",
    border: "1px solid #0a66c2",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  hero: {
    textAlign: "center",
    padding: "60px 24px 40px",
    maxWidth: 800,
    margin: "0 auto",
  },

  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
  },

  heroTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
    lineHeight: 1.1,
    fontFamily: "'Source Serif 4', Georgia, serif",
    letterSpacing: "-0.02em",
  },

  heroSubtitle: {
    fontSize: 18,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.6,
  },

  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "0 24px 60px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 32,
    marginBottom: 20,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },

  section: {
    marginBottom: 32,
  },

  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: "#0a66c2",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
  },

  stepTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "#111827",
  },

  uploadBox: {
    border: "2px dashed #d1d5db",
    borderRadius: 12,
    padding: 40,
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#f9fafb",
    transition: "all 0.2s",
  },

  uploadBoxActive: {
    borderColor: "#0a66c2",
    backgroundColor: "#dbeafe",
  },

  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  uploadText: {
    fontSize: 16,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
  },

  uploadFileName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0a66c2",
    marginBottom: 4,
  },

  uploadHint: {
    fontSize: 13,
    color: "#6b7280",
  },

  textarea: {
    width: "100%",
    padding: 16,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: 200,
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  },

  charCount: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
  },

  analyzeBtn: {
    width: "100%",
    padding: "16px 24px",
    backgroundColor: "#0a66c2",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  analyzeBtnDisabled: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
  },

  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid #ffffff",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  privacyNote: {
    textAlign: "center",
    fontSize: 13,
    color: "#6b7280",
    marginTop: 16,
  },

  error: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    border: "1px solid #fecaca",
  },

  // Results styles
  resultsContainer: {
    maxWidth: 900,
    margin: "0 auto",
  },

  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    border: "1px solid #e5e7eb",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
  },

  scoreLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 8,
  },

  scoreNumber: {
    fontSize: 96,
    fontWeight: 700,
    lineHeight: 1,
    margin: "8px 0",
    fontFamily: "'Source Serif 4', Georgia, serif",
  },

  scoreOutOf: {
    fontSize: 32,
    color: "#9ca3af",
    fontWeight: 400,
  },

  verdict: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 24,
  },

  scoreBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },

  scoreBarFill: {
    height: "100%",
    transition: "width 0.5s ease",
  },

  summary: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 1.6,
    margin: 0,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 16px",
  },

  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  listItem: {
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  },

  listSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 1.5,
  },

  keywordRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 12,
    textTransform: "uppercase",
  },

  emptyState: {
    color: "#9ca3af",
    fontSize: 14,
    fontStyle: "italic",
    margin: 0,
  },

  suggestionsList: {
    paddingLeft: 24,
    margin: 0,
  },

  suggestion: {
    padding: "8px 0",
    color: "#374151",
    lineHeight: 1.6,
  },

  skillsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  skillChip: {
    padding: "6px 14px",
    borderRadius: 16,
    fontSize: 13,
    fontWeight: 600,
  },

  ctaCard: {
    background:
      "linear-gradient(135deg, #0a66c2 0%, #0073e6 100%)",
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    color: "#ffffff",
    textAlign: "center",
  },

  ctaTitle: {
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 12px",
    fontFamily: "'Source Serif 4', Georgia, serif",
    lineHeight: 1.2,
  },

  ctaSubtitle: {
    fontSize: 16,
    margin: "0 0 24px",
    opacity: 0.95,
    lineHeight: 1.6,
  },

  ctaFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 500,
    margin: "0 auto 28px",
    textAlign: "left",
  },

  ctaFeature: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 15,
  },

  ctaCheck: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },

  ctaButton: {
    padding: "16px 40px",
    backgroundColor: "#ffffff",
    color: "#0a66c2",
    border: "none",
    borderRadius: 30,
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
  },

  ctaPriceNote: {
    fontSize: 13,
    marginTop: 16,
    opacity: 0.9,
  },

  // PRICING SECTION - Two-tier
  pricingSection: {
    marginBottom: 20,
  },

  pricingHeader: {
    textAlign: "center",
    marginBottom: 32,
  },

  pricingMainTitle: {
    fontSize: 36,
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#111827",
    fontFamily: "'Source Serif 4', Georgia, serif",
    lineHeight: 1.2,
  },

  pricingMainSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 600,
    marginLeft: "auto",
    marginRight: "auto",
  },

  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  },

  pricingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    border: "2px solid #e5e7eb",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },

  pricingCardFeatured: {
    background: "linear-gradient(135deg, #0a66c2 0%, #0073e6 100%)",
    borderRadius: 16,
    padding: 32,
    color: "#ffffff",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 30px rgba(10, 102, 194, 0.3)",
    transform: "scale(1.02)",
  },

  popularBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#fbbf24",
    color: "#78350f",
    padding: "4px 16px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
  },

  pricingBadge: {
    display: "inline-block",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  pricingBadgeFeatured: {
    display: "inline-block",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  pricingIcon: {
    fontSize: 36,
    marginBottom: 12,
  },

  pricingCardTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 8px",
    color: "#111827",
  },

  pricingCardTitleFeatured: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 8px",
    color: "#ffffff",
  },

  pricingPrice: {
    display: "flex",
    alignItems: "baseline",
    marginBottom: 6,
  },

  priceCurrency: {
    fontSize: 28,
    fontWeight: 600,
    color: "#111827",
  },

  priceCurrencyFeatured: {
    fontSize: 28,
    fontWeight: 600,
    color: "#ffffff",
  },

  priceAmount: {
    fontSize: 56,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1,
    fontFamily: "'Source Serif 4', Georgia, serif",
  },

  priceAmountFeatured: {
    fontSize: 56,
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1,
    fontFamily: "'Source Serif 4', Georgia, serif",
  },

  pricePeriod: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 6,
  },

  pricingCardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: "0 0 24px",
  },

  pricingCardSubtitleFeatured: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    margin: "0 0 24px",
  },

  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },

  featureListFeatured: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },

  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    lineHeight: 1.5,
  },

  featureCheck: {
    width: 20,
    height: 20,
    backgroundColor: "#dcfce7",
    color: "#15803d",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },

  featureCheckFeatured: {
    width: 20,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },

  pricingButtonOneTime: {
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  pricingButtonFeatured: {
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "#ffffff",
    color: "#0a66c2",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  pricingFootnote: {
    fontSize: 12,
    color: "#15803d",
    textAlign: "center",
    margin: "12px 0 0",
    fontWeight: 600,
  },

  pricingFootnoteFeatured: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    margin: "12px 0 0",
    fontWeight: 600,
  },

  trustStrip: {
    display: "flex",
    justifyContent: "center",
    gap: 32,
    padding: "16px",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    flexWrap: "wrap",
  },

  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: 500,
  },

  trustIcon: {
    fontSize: 16,
  },

  tryAgain: {
    textAlign: "center",
    padding: "24px 0",
  },

  tryAgainBtn: {
    background: "none",
    border: "none",
    color: "#0a66c2",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: 32,
    color: "#9ca3af",
    fontSize: 13,
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
};
