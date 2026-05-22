import jsPDF from "jspdf";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ADZUNA_APP_ID = import.meta.env.VITE_ADZUNA_APP_ID;
const ADZUNA_APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY;
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

// ============== PRICING BY COUNTRY ==============
const PRICING = {
  IN: { symbol: "₹", amount: 299 },
  GB: { symbol: "£", amount: 5 },
  US: { symbol: "$", amount: 6 },
  CA: { symbol: "$", amount: 6 },
  AU: { symbol: "$", amount: 6 },
  IE: { symbol: "€", amount: 5 },
  DE: { symbol: "€", amount: 5 },
  FR: { symbol: "€", amount: 5 },
  NL: { symbol: "€", amount: 5 },
  IT: { symbol: "€", amount: 5 },
  ES: { symbol: "€", amount: 5 },
  AT: { symbol: "€", amount: 5 },
  BE: { symbol: "€", amount: 5 },
  CH: { symbol: "CHF ", amount: 5 },
  PL: { symbol: "€", amount: 5 },
  BR: { symbol: "$", amount: 6 },
  MX: { symbol: "$", amount: 6 },
  ZA: { symbol: "$", amount: 6 },
  SG: { symbol: "$", amount: 6 },
  NZ: { symbol: "$", amount: 6 }
};

function detectUserCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map = {
      "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
      "Europe/London": "GB",
      "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "America/Denver": "US",
      "Europe/Dublin": "IE", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Amsterdam": "NL",
      "Europe/Rome": "IT", "Europe/Madrid": "ES", "Europe/Vienna": "AT", "Europe/Brussels": "BE",
      "Europe/Zurich": "CH", "Europe/Warsaw": "PL",
      "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
      "Africa/Johannesburg": "ZA", "Asia/Singapore": "SG",
      "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
      "America/Toronto": "CA", "America/Vancouver": "CA",
      "Pacific/Auckland": "NZ"
    };
    return map[tz] || "US";
  } catch { return "US"; }
}

const userPricing = PRICING[detectUserCountry()] || { symbol: "$", amount: 6 };

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it => it.str).join(" ") + "\n";
  }
  return fullText;
}

async function parseCV(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Extract the following from this CV and return as JSON only, no extra text:
{"name":"","email":"","phone":"","skills":[],"job_titles":[],"years_experience":"","education":"","summary":""}

CV TEXT:
${text}` }] }] })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates) throw new Error("No response from Gemini");
  return JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
}

async function tailorCV(originalCvText, job) {
  const prompt = `Rewrite this CV to perfectly match this job. Rules:
1. Keep real experience and education — never invent
2. Reorder/rephrase to emphasize matching skills
3. Use keywords from the job description
4. Keep name, contact info, education same
5. Make summary directly relevant to this job
6. Return ONLY the tailored CV in clean text

=== JOB ===
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

=== ORIGINAL CV ===
${originalCvText}

=== TAILORED CV ===`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates) throw new Error("No response");
  return data.candidates[0].content.parts[0].text;
}

async function fetchJSearchJobs(profile, country) {
  if (!RAPIDAPI_KEY) return [];
  const topRole = (profile.job_titles && profile.job_titles[0]) || "professional";
  const query = encodeURIComponent(topRole);
  const countryMap = { gb: "gb", us: "us", in: "in", ca: "ca", au: "au", de: "de", fr: "fr", nl: "nl", ie: "ie", es: "es" };
  const jsearchCountry = countryMap[country] || "us";
  const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1&country=${jsearchCountry}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" }
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.data || data.data.length === 0) return [];
    return data.data.map(j => ({
      id: `jsearch_${j.job_id}`,
      title: j.job_title || "Position",
      company: j.employer_name || "Company",
      location: `${j.job_city || ""} ${j.job_country || ""}`.trim() || "Remote",
      salary: j.job_min_salary ? `${j.job_min_salary} - ${j.job_max_salary}` : "Not specified",
      description: j.job_description || "",
      url: j.job_apply_link || j.job_google_link || "#",
      source: "JSearch",
      jobText: `${j.job_title || ""} ${j.job_description || ""}`.toLowerCase()
    }));
  } catch (error) { return []; }
}

async function fetchRealJobs(profile, country) {
  const queries = [];
  if (profile.job_titles?.length > 0) profile.job_titles.slice(0, 3).forEach(r => queries.push(r));
  if (queries.length < 3 && profile.skills?.length > 0) queries.push(profile.skills.slice(0, 2).join(" "));
  if (queries.length === 0) queries.push("marketing");

  const allResults = [];
  for (const q of queries) {
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=10&what=${encodeURIComponent(q)}&content-type=application/json`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) allResults.push(...data.results);
    } catch (e) { console.error(e); }
  }

  const uniqueJobs = [];
  const seenIds = new Set();
  const seenTitles = new Set();
  const companyCounts = {};
  for (const job of allResults) {
    const titleKey = `${job.title?.toLowerCase()}_${job.company?.display_name?.toLowerCase()}`;
    const company = job.company?.display_name?.toLowerCase() || "unknown";
    if (!companyCounts[company]) companyCounts[company] = 0;
    if (!seenIds.has(job.id) && !seenTitles.has(titleKey) && companyCounts[company] < 2) {
      seenIds.add(job.id);
      seenTitles.add(titleKey);
      companyCounts[company]++;
      uniqueJobs.push(job);
    }
  }

  return uniqueJobs.map(job => ({
    title: job.title,
    company: job.company?.display_name || "Unknown",
    location: job.location?.display_name || "Remote",
    salary: job.salary_min ? `${userPricing.symbol}${Math.round(job.salary_min/1000)}k-${Math.round(job.salary_max/1000)}k` : "Not specified",
    source: "Adzuna",
    description: job.description || "",
    url: job.redirect_url,
    jobText: (job.title + " " + (job.description || "")).toLowerCase()
  }));
}

async function fetchRemotiveJobs(profile) {
  const topRole = (profile.job_titles && profile.job_titles[0]) || "marketing";
  const searchTerm = encodeURIComponent(topRole);
  const url = `https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=20`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.jobs || data.jobs.length === 0) return [];
    return data.jobs.map(j => ({
      id: `remotive_${j.id}`,
      title: j.title || "Position",
      company: j.company_name || "Company",
      location: j.candidate_required_location || "Remote",
      salary: j.salary || "Not specified",
      description: (j.description || "").replace(/<[^>]*>/g, "").substring(0, 500),
      url: j.url || "#",
      source: "Remotive",
      jobText: `${j.title || ""} ${j.description || ""} ${j.tags?.join(" ") || ""}`.toLowerCase()
    }));
  } catch (error) { return []; }
}

function calculateRealMatchScore(skills, titles, jobTitle, jobText) {
  if (!skills || skills.length === 0) return 0;
  const allTerms = [...(skills || []), ...(titles || [])].map(s => s.toLowerCase());
  const fullText = (jobTitle + " " + jobText).toLowerCase();
  let matches = 0, strong = 0;
  allTerms.forEach(term => {
    const words = term.split(/\s+/).filter(w => w.length > 3);
    let matched = false;
    words.forEach(w => { if (fullText.includes(w.slice(0, Math.min(5, w.length)))) matched = true; });
    if (matched) {
      matches++;
      if (jobTitle.toLowerCase().includes(term)) strong += 2;
    }
  });
  return Math.max(35, Math.min(98, Math.round((matches/allTerms.length)*70 + (strong/allTerms.length)*30 + 20)));
}

function detectJobType(job) {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  if (text.includes("intern") || text.includes("internship")) return "internship";
  if (text.includes("contract") || text.includes("freelance")) return "contract";
  if (text.includes("part-time") || text.includes("part time")) return "parttime";
  if (text.includes("remote") || text.includes("worldwide") || job.source?.includes("Remotive")) return "remote";
  return "fulltime";
}

export default function App() {
  const navigate = useNavigate();
  const { user } = useUser();
  const FREE_LIMIT = 2;
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("gb");
  const [tailoringJob, setTailoringJob] = useState(null);
  const [tailoredCV, setTailoredCV] = useState("");
  const [tailorLoading, setTailorLoading] = useState(false);
  const [searchesUsed, setSearchesUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [jobFilter, setJobFilter] = useState("all");

  if (user?.id && !loaded) {
    const saved = localStorage.getItem(`searches_${user.id}`);
    if (saved) setSearchesUsed(parseInt(saved));
    const paid = localStorage.getItem(`paid_${user.id}`);
    if (paid === "true") setHasPaid(true);
    setLoaded(true);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"] },
    onDrop: async (files) => {
      const file = files[0];
      const text = file.type === "application/pdf" ? await extractTextFromPDF(file) : await file.text();
      setCvText(text);
      setStep("ready");
    }
  });

  async function handleTailor(job) {
    setTailoringJob(job);
    setTailoredCV("");
    setTailorLoading(true);
    try {
      setTailoredCV(await tailorCV(cvText, job));
    } catch (e) { setTailoredCV("Error: " + e.message); }
    setTailorLoading(false);
  }

  function copyTailoredCV() {
    navigator.clipboard.writeText(tailoredCV);
    alert("Copied!");
  }

  const downloadTailoredCV = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPos = 25;
    doc.setFillColor(10, 102, 194);
    doc.rect(0, 0, pageWidth, 8, "F");
    const lines = tailoredCV.split("\n");
    const name = lines[0]?.trim() || "Professional CV";
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text(name, margin, yPos);
    yPos += 9;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(10, 102, 194);
    doc.text(`Tailored for: ${tailoringJob.title} at ${tailoringJob.company}`, margin, yPos);
    yPos += 8;
    doc.setDrawColor(10, 102, 194);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 50);
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) { yPos += 3; continue; }
      if (yPos > pageHeight - 25) {
        doc.addPage();
        doc.setFillColor(10, 102, 194);
        doc.rect(0, 0, pageWidth, 8, "F");
        yPos = 25;
      }
      const isBoldHeader = line.match(/^\*\*(.+?)\*\*$/);
      const isUppercaseHeader = line.length < 50 && line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line);
      if (isBoldHeader || isUppercaseHeader) {
        const headerText = line.replace(/\*\*/g, "").trim();
        yPos += 4;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 102, 194);
        doc.text(headerText, margin, yPos);
        yPos += 2;
        doc.setDrawColor(10, 102, 194);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 45, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 50);
      } else if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•")) {
        const bulletText = line.replace(/^[\*\-•]\s*/, "").replace(/\*\*/g, "");
        const wrappedLines = doc.splitTextToSize("• " + bulletText, maxWidth - 5);
        doc.text(wrappedLines, margin + 3, yPos);
        yPos += wrappedLines.length * 5;
      } else {
        const cleanLine = line.replace(/\*\*/g, "");
        const wrappedLines = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrappedLines, margin, yPos);
        yPos += wrappedLines.length * 5;
      }
    }
    const footerY = pageHeight - 12;
    doc.setDrawColor(10, 102, 194);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated with Jobly - AI-Powered Job Applications", margin, footerY);
    const safeName = (tailoringJob.title || "CV").replace(/[^a-z0-9]/gi, "_").substring(0, 30);
    const safeCompany = (tailoringJob.company || "Tailored").replace(/[^a-z0-9]/gi, "_").substring(0, 20);
    doc.save(`CV-${safeName}-${safeCompany}.pdf`);
  };

  async function handleAnalyse() {
    if (!hasPaid && searchesUsed >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await parseCV(cvText);
      setProfile(result);
      const [adzunaJobs, jsearchJobs, remotiveJobs] = await Promise.all([
        fetchRealJobs(result, country),
        fetchJSearchJobs(result, country),
        fetchRemotiveJobs(result)
      ]);
      const scoredAdzuna = adzunaJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredJSearch = jsearchJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredRemotive = remotiveJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      scoredAdzuna.sort((a, b) => b.matchScore - a.matchScore);
      scoredJSearch.sort((a, b) => b.matchScore - a.matchScore);
      scoredRemotive.sort((a, b) => b.matchScore - a.matchScore);
      const topFromEach = [
        ...scoredAdzuna.slice(0, 4),
        ...scoredJSearch.slice(0, 4),
        ...scoredRemotive.slice(0, 4)
      ];
      topFromEach.sort((a, b) => b.matchScore - a.matchScore);
      setJobs(topFromEach);
      setStep("result");
      const newCount = searchesUsed + 1;
      setSearchesUsed(newCount);
      if (user?.id) localStorage.setItem(`searches_${user.id}`, newCount.toString());
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  function handlePayment() {
    if (confirm(`Simulate payment of ${userPricing.symbol}${userPricing.amount}?`)) {
      setHasPaid(true);
      if (user?.id) localStorage.setItem(`paid_${user.id}`, "true");
      setShowPaywall(false);
      setTimeout(() => alert("Welcome to Pro!"), 100);
    }
  }

  const filteredJobs = jobs.filter(job => jobFilter === "all" || detectJobType(job) === jobFilter);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0a0a0a", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* ============ SIGNED OUT — LANDING PAGE ============ */}
      <SignedOut>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid #e5e5e5", maxWidth: "1280px", margin: "0 auto" }}>
          <img src="/jobly-logo.svg" alt="Jobly" style={{ height: "32px" }} />
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button
              onClick={() => navigate("/ats-check")}
              style={{
                background: "#ecfdf5",
                color: "#047857",
                padding: "10px 18px",
                borderRadius: "24px",
                fontSize: "0.9rem",
                fontWeight: 600,
                border: "1px solid #a7f3d0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#d1fae5";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ecfdf5";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ⚡ Free ATS Check
            </button>
            <SignInButton mode="modal">
              <button style={{ background: "transparent", color: "#0a0a0a", padding: "8px 16px", fontSize: "0.95rem", fontWeight: 500, border: "none", cursor: "pointer" }}>Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button style={{ background: "#0a66c2", color: "#ffffff", padding: "10px 20px", borderRadius: "24px", fontSize: "0.95rem", fontWeight: 600, border: "none", cursor: "pointer" }}>Try Jobly Free</button>
            </SignUpButton>
          </div>
        </nav>

        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 48px 120px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#e7f3ff", color: "#0a66c2", padding: "6px 14px", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "24px" }}>
              ✨ AI-Powered Job Search
            </div>
            <h1 style={{ fontSize: "64px", lineHeight: 1.05, marginBottom: "24px", fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
              Land your <span style={{ color: "#0a66c2" }}>dream job</span> with AI.
            </h1>
            <p style={{ fontSize: "1.2rem", color: "#525252", marginTop: "24px", marginBottom: "40px", lineHeight: 1.6, maxWidth: "520px" }}>
              Upload your CV and let AI find matching jobs across 20+ countries, then tailor your application for every role — in seconds.
            </p>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "32px" }}>
              <SignUpButton mode="modal">
                <button style={{ background: "#0a66c2", color: "#ffffff", padding: "16px 32px", borderRadius: "100px", fontSize: "1rem", fontWeight: 600, border: "none", cursor: "pointer" }}>Get Started Free →</button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button style={{ background: "transparent", color: "#0a0a0a", padding: "16px 24px", fontSize: "1rem", fontWeight: 600, border: "1px solid #e5e5e5", borderRadius: "100px", cursor: "pointer" }}>Sign In</button>
              </SignInButton>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#737373" }}>
              <span style={{ color: "#0a66c2", fontWeight: 600 }}>2 free searches</span> — no credit card required.
            </p>
          </div>
          <div style={{ background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "0.8rem", color: "#737373", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "16px" }}>// 12 MATCHING JOBS FOUND</div>
            {[
              { title: "Senior Product Manager", company: "Google", match: 94, location: "London, UK" },
              { title: "Full-stack Engineer", company: "Stripe", match: 89, location: "Remote" },
              { title: "AI Research Lead", company: "Anthropic", match: 86, location: "San Francisco" }
            ].map((j, i) => (
              <div key={i} style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "16px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>{j.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#737373" }}>{j.company} · {j.location}</div>
                </div>
                <div style={{ background: "#e7f3ff", color: "#0a66c2", padding: "4px 10px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 600 }}>{j.match}% match</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#fafafa", borderTop: "1px solid #e5e5e5", padding: "80px 48px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "40px", marginBottom: "16px", fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600 }}>How Jobly works</h2>
            <p style={{ color: "#525252", marginBottom: "64px", fontSize: "1.1rem" }}>Three simple steps from CV to offer letter.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
              {[
                { num: "01", title: "Upload your CV", desc: "Drop your PDF and our AI extracts your skills, experience, and goals automatically." },
                { num: "02", title: "Get matched jobs", desc: "We search across 20+ countries and multiple platforms to find roles that fit your profile." },
                { num: "03", title: "Tailor & apply", desc: "Generate a personalised CV for every role with one click. Download as a polished PDF." }
              ].map((f, i) => (
                <div key={i} style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "16px", padding: "32px", textAlign: "left" }}>
                  <div style={{ color: "#0a66c2", fontWeight: 700, fontSize: "0.9rem", marginBottom: "16px", letterSpacing: "0.05em" }}>{f.num}</div>
                  <h3 style={{ fontSize: "1.4rem", marginBottom: "12px", fontFamily: "'Source Serif 4', Georgia, serif" }}>{f.title}</h3>
                  <p style={{ color: "#525252", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer style={{ padding: "48px", borderTop: "1px solid #e5e5e5", textAlign: "center", color: "#737373", fontSize: "0.9rem" }}>
          © 2026 Jobly · AI-powered career platform
        </footer>
      </SignedOut>

      {/* ============ SIGNED IN — DASHBOARD ============ */}
      <SignedIn>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 48px", borderBottom: "1px solid #e5e5e5", background: "#ffffff", position: "sticky", top: 0, zIndex: 10 }}>
          <img src="/jobly-logo.svg" alt="Jobly" style={{ height: "32px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => navigate("/ats-check")}
              style={{
                background: "#ecfdf5",
                color: "#047857",
                padding: "8px 14px",
                borderRadius: "100px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid #a7f3d0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              ⚡ ATS Check
            </button>
            <div style={{
              background: hasPaid ? "#eef2ff" : (searchesUsed >= FREE_LIMIT ? "#fef2f0" : "#e7f3ff"),
              color: hasPaid ? "#4338ca" : (searchesUsed >= FREE_LIMIT ? "#b24020" : "#0a66c2"),
              padding: "6px 14px", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 600
            }}>
              {hasPaid ? "💎 Pro Member" : (searchesUsed >= FREE_LIMIT ? "Upgrade to continue" : `${FREE_LIMIT - searchesUsed} free ${FREE_LIMIT - searchesUsed !== 1 ? "searches" : "search"} left`)}
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "64px 48px" }}>

          {step === "upload" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <h1 style={{ fontSize: "44px", lineHeight: 1.1, marginBottom: "16px", fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, margin: 0 }}>
                  Find your next role with <span style={{ color: "#0a66c2" }}>AI</span>.
                </h1>
                <p style={{ color: "#525252", fontSize: "1.15rem", marginTop: "16px" }}>Upload your CV and we'll match you to the best jobs.</p>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#0a0a0a", marginBottom: "8px" }}>Search jobs in</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={{
                  width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d4d4d4",
                  fontSize: "1rem", marginBottom: "24px", background: "#ffffff", color: "#0a0a0a",
                  fontFamily: "inherit", cursor: "pointer", outline: "none"
                }}>
                  <option value="gb">🇬🇧 United Kingdom</option>
                  <option value="us">🇺🇸 United States</option>
                  <option value="in">🇮🇳 India</option>
                  <option value="ie">🇮🇪 Ireland</option>
                  <option value="au">🇦🇺 Australia</option>
                  <option value="ca">🇨🇦 Canada</option>
                  <option value="nz">🇳🇿 New Zealand</option>
                  <option value="de">🇩🇪 Germany</option>
                  <option value="fr">🇫🇷 France</option>
                  <option value="nl">🇳🇱 Netherlands</option>
                  <option value="it">🇮🇹 Italy</option>
                  <option value="es">🇪🇸 Spain</option>
                  <option value="at">🇦🇹 Austria</option>
                  <option value="be">🇧🇪 Belgium</option>
                  <option value="ch">🇨🇭 Switzerland</option>
                  <option value="pl">🇵🇱 Poland</option>
                  <option value="br">🇧🇷 Brazil</option>
                  <option value="mx">🇲🇽 Mexico</option>
                  <option value="za">🇿🇦 South Africa</option>
                  <option value="sg">🇸🇬 Singapore</option>
                </select>

                <div {...getRootProps()} style={{
                  border: `2px dashed ${isDragActive ? "#0a66c2" : "#d4d4d4"}`,
                  borderRadius: "12px", padding: "56px 32px", textAlign: "center", cursor: "pointer",
                  background: isDragActive ? "#f0f7ff" : "#fafafa", transition: "all 0.15s ease"
                }}>
                  <input {...getInputProps()} />
                  <div style={{ width: "48px", height: "48px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e7f3ff", borderRadius: "50%" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "4px", color: "#0a0a0a" }}>Drag & drop your CV here</p>
                  <p style={{ color: "#737373", fontSize: "0.9rem" }}>or click to browse · PDF or TXT</p>
                </div>
              </div>
            </div>
          )}

          {step === "ready" && (
            <div style={{ textAlign: "center", padding: "64px 32px" }}>
              <div style={{ width: "64px", height: "64px", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", background: "#dcfce7", borderRadius: "50%" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: "32px", marginBottom: "12px", fontFamily: "'Source Serif 4', Georgia, serif" }}>CV loaded successfully</h2>
              <p style={{ color: "#525252", fontSize: "1.05rem", marginBottom: "32px" }}>Ready to analyse and find your perfect matches.</p>
              <button onClick={handleAnalyse} disabled={loading} style={{
                background: loading ? "#a3a3a3" : "#0a66c2", color: "#ffffff", border: "none",
                padding: "14px 32px", borderRadius: "100px", fontSize: "1rem", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer"
              }}>
                {loading ? "Analysing & finding jobs..." : "Analyse My CV →"}
              </button>
              {error && <p style={{ color: "#b24020", marginTop: "24px", padding: "12px 16px", background: "#fef2f0", borderRadius: "8px", borderLeft: "3px solid #b24020", display: "inline-block" }}>{error}</p>}
            </div>
          )}

          {step === "result" && profile && (
            <div>
              {/* Profile card */}
              <div style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "16px", padding: "32px", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "24px", marginBottom: "24px", fontFamily: "'Source Serif 4', Georgia, serif" }}>Your Profile</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                  <Row label="Name" value={profile.name} />
                  <Row label="Email" value={profile.email} />
                  <Row label="Phone" value={profile.phone} />
                  <Row label="Experience" value={profile.years_experience} />
                </div>
                <div style={{ marginTop: "16px" }}>
                  <Row label="Education" value={profile.education} />
                  <Row label="Skills" value={profile.skills?.join(", ")} />
                  <Row label="Target Roles" value={profile.job_titles?.join(", ")} />
                  <Row label="Summary" value={profile.summary} />
                </div>
              </div>

              {/* Jobs section */}
              <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "28px", fontFamily: "'Source Serif 4', Georgia, serif", margin: 0 }}>{filteredJobs.length} matching jobs</h2>
                  <p style={{ color: "#737373", fontSize: "0.95rem", marginTop: "4px" }}>Curated for your profile</p>
                </div>
                <button onClick={() => setStep("upload")} style={{ background: "transparent", color: "#0a66c2", border: "1px solid #0a66c2", padding: "10px 20px", borderRadius: "100px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>Upload another CV</button>
              </div>

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, borderBottom: "1px solid #e5e5e5", paddingBottom: 0 }}>
                {[
                  { id: "all", label: "All Jobs" },
                  { id: "fulltime", label: "Full-time" },
                  { id: "parttime", label: "Part-time" },
                  { id: "contract", label: "Contract" },
                  { id: "internship", label: "Internship" },
                  { id: "remote", label: "Remote" }
                ].map((filterOption) => (
                  <button
                    key={filterOption.id}
                    onClick={() => setJobFilter(filterOption.id)}
                    style={{
                      padding: "12px 4px",
                      marginRight: "20px",
                      borderRadius: 0,
                      border: "none",
                      borderBottom: jobFilter === filterOption.id ? "2px solid #0a66c2" : "2px solid transparent",
                      background: "transparent",
                      color: jobFilter === filterOption.id ? "#0a66c2" : "#525252",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: jobFilter === filterOption.id ? 600 : 500,
                      transition: "all 0.15s"
                    }}
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>

              {/* Job cards */}
              {filteredJobs.map((job, idx) => (
                <div key={idx} style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "20px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px", transition: "all 0.15s", cursor: "default" }}>
                  <div style={{ width: "48px", height: "48px", background: "#f0f7ff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "4px", color: "#0a0a0a" }}>{job.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "#525252" }}>{job.company} · {job.location} · <span style={{ color: "#737373" }}>{job.source}</span></div>
                    {job.salary && job.salary !== "Not specified" && <div style={{ fontSize: "0.85rem", color: "#16a34a", marginTop: "4px", fontWeight: 500 }}>{job.salary}</div>}
                  </div>
                  <div style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "100px", background: job.matchScore >= 80 ? "#dcfce7" : "#e7f3ff", color: job.matchScore >= 80 ? "#15803d" : "#0a66c2", fontWeight: 600, whiteSpace: "nowrap" }}>{job.matchScore}% match</div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => handleTailor(job)} style={{ background: "transparent", color: "#0a66c2", border: "1px solid #0a66c2", borderRadius: "100px", padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>Tailor CV</button>
                    <button onClick={() => window.open(job.url, "_blank")} style={{ background: "#0a66c2", color: "#ffffff", border: "none", borderRadius: "100px", padding: "8px 20px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>Apply →</button>
                  </div>
                </div>
              ))}
              {filteredJobs.length === 0 && <p style={{ color: "#737373", textAlign: "center", padding: "40px", background: "#fafafa", borderRadius: "12px" }}>No matching jobs found. Try a different filter.</p>}
            </div>
          )}
        </div>

        {/* Tailored CV Modal */}
        {tailoringJob && (
          <div onClick={() => setTailoringJob(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "16px", padding: "32px", maxWidth: "800px", width: "100%", maxHeight: "85vh", overflow: "auto", position: "relative" }}>
              <button onClick={() => setTailoringJob(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", color: "#737373", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "0.85rem", color: "#0a66c2", fontWeight: 600, marginBottom: "8px" }}>AI-Tailored CV</div>
                <h2 style={{ fontSize: "1.6rem", marginBottom: "6px", fontFamily: "'Source Serif 4', Georgia, serif" }}>{tailoringJob.title}</h2>
                <p style={{ color: "#525252", fontSize: "0.9rem" }}>{tailoringJob.company} · {tailoringJob.location}</p>
              </div>
              {tailorLoading && (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <p style={{ color: "#0a66c2", fontWeight: 600 }}>AI is tailoring your CV...</p>
                  <p style={{ color: "#737373", fontSize: "0.85rem", marginTop: "8px" }}>Takes 5-15 seconds</p>
                </div>
              )}
              {!tailorLoading && tailoredCV && (
                <>
                  <div style={{ background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "20px", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: "1.6", whiteSpace: "pre-wrap", color: "#0a0a0a", marginBottom: "20px", maxHeight: "400px", overflow: "auto" }}>{tailoredCV}</div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={copyTailoredCV} style={{ background: "transparent", color: "#0a66c2", border: "1px solid #0a66c2", padding: "12px 24px", borderRadius: "100px", fontWeight: 600, cursor: "pointer", flex: 1 }}>Copy</button>
                    <button onClick={downloadTailoredCV} style={{ background: "#0a66c2", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "100px", fontWeight: 600, cursor: "pointer", flex: 1 }}>Download PDF</button>
                    <button onClick={() => window.open(tailoringJob.url, "_blank")} style={{ background: "#0a0a0a", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "100px", fontWeight: 600, cursor: "pointer", flex: 1 }}>Apply Now →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Paywall Modal */}
        {showPaywall && (
          <div onClick={() => setShowPaywall(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 2000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", position: "relative" }}>
              <button onClick={() => setShowPaywall(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", color: "#737373", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "12px", fontFamily: "'Source Serif 4', Georgia, serif" }}>You're loving Jobly!</h2>
              <p style={{ color: "#525252", marginBottom: "32px", lineHeight: 1.6 }}>You've used all {FREE_LIMIT} free searches. Unlock unlimited access — pay once, use forever.</p>
              <div style={{ background: "#f0f7ff", border: "2px solid #0a66c2", borderRadius: "16px", padding: "32px 24px", marginBottom: "24px" }}>
                <div style={{ fontSize: "0.75rem", color: "#0a66c2", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>LIFETIME ACCESS · ONE-TIME PAYMENT</div>
                <div style={{ fontSize: "3.2rem", fontWeight: 700, color: "#0a66c2", marginBottom: "4px", lineHeight: 1, fontFamily: "'Source Serif 4', Georgia, serif" }}>{userPricing.symbol}{userPricing.amount}</div>
                <p style={{ color: "#737373", fontSize: "0.85rem", marginBottom: "20px" }}>No subscriptions · No hidden fees</p>
                <ul style={{ listStyle: "none", textAlign: "left", padding: 0 }}>
                  <li style={{ marginBottom: "8px", color: "#0a0a0a", fontSize: "0.9rem" }}>✓ Unlimited CV searches forever</li>
                  <li style={{ marginBottom: "8px", color: "#0a0a0a", fontSize: "0.9rem" }}>✓ Unlimited AI CV tailoring</li>
                  <li style={{ marginBottom: "8px", color: "#0a0a0a", fontSize: "0.9rem" }}>✓ Jobs from 20 countries</li>
                  <li style={{ marginBottom: "8px", color: "#0a0a0a", fontSize: "0.9rem" }}>✓ All future features included</li>
                </ul>
              </div>
              <button onClick={handlePayment} style={{ background: "#0a66c2", color: "#fff", border: "none", padding: "16px 40px", borderRadius: "100px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: "12px" }}>Unlock for {userPricing.symbol}{userPricing.amount} →</button>
              <button onClick={() => setShowPaywall(false)} style={{ background: "transparent", color: "#737373", border: "none", fontSize: "0.85rem", cursor: "pointer" }}>Maybe later</button>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ color: "#737373", fontSize: "0.75rem", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "0.95rem", color: "#0a0a0a" }}>{value || "—"}</div>
    </div>
  );
}
