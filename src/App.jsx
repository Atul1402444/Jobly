import { useState } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ADZUNA_APP_ID = import.meta.env.VITE_ADZUNA_APP_ID;
const ADZUNA_APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY;

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(" ") + "\n";
  }
  return fullText;
}

async function parseCV(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Extract the following from this CV and return as JSON only, no extra text:
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "job_titles": [],
  "years_experience": "",
  "education": "",
  "summary": ""
}

CV TEXT:
${text}` }] }]
      })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates) throw new Error("No response from Gemini. Wait 60 seconds and try again (rate limit).");
  const raw = data.candidates[0].content.parts[0].text;
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

async function tailorCV(originalCvText, job) {
  const prompt = `You are an expert CV writer. Rewrite the following CV to be perfectly tailored for this specific job. Rules:
1. Keep the candidate's REAL experience and education — never invent anything
2. Reorder and rephrase to emphasize skills matching the job
3. Use keywords from the job description (for ATS systems)
4. Keep the same name, contact info, education
5. Make the summary directly relevant to this job
6. Return ONLY the tailored CV in clean text format (no markdown)

=== JOB ===
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

=== ORIGINAL CV ===
${originalCvText}

=== TAILORED CV ===`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.candidates) throw new Error("No response from Gemini");
  return data.candidates[0].content.parts[0].text;
}

async function fetchRealJobs(profile, country)  {
  ;
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
    salary: job.salary_min ? `£${Math.round(job.salary_min/1000)}k-${Math.round(job.salary_max/1000)}k` : "Not specified",
    source: "Adzuna",
    description: job.description || "",
    url: job.redirect_url,
    logo: "💼",
    jobText: (job.title + " " + (job.description || "")).toLowerCase()
  }));
}

function calculateRealMatchScore(candidateSkills, candidateJobTitles, jobTitle, jobText) {
  if (!candidateSkills || candidateSkills.length === 0) return 0;
  const allTerms = [...(candidateSkills || []), ...(candidateJobTitles || [])].map(s => s.toLowerCase());
  const fullJobText = (jobTitle + " " + jobText).toLowerCase();
  let matchCount = 0, strongMatchCount = 0;
  allTerms.forEach(term => {
    const words = term.split(/\s+/).filter(w => w.length > 3);
    let termMatched = false;
    words.forEach(word => {
      const stem = word.slice(0, Math.min(5, word.length));
      if (fullJobText.includes(stem)) termMatched = true;
    });
    if (termMatched) {
      matchCount++;
      if (jobTitle.toLowerCase().includes(term)) strongMatchCount += 2;
    }
  });
  const score = Math.min(98, Math.round((matchCount / allTerms.length) * 70 + (strongMatchCount / allTerms.length) * 30 + 20));
  return Math.max(score, 35);
}

export default function App() {
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [country, setCountry] = useState("gb");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tailoringJob, setTailoringJob] = useState(null);
  const [tailoredCV, setTailoredCV] = useState("");
  const [tailorLoading, setTailorLoading] = useState(false);

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
      const tailored = await tailorCV(cvText, job);
      setTailoredCV(tailored);
    } catch (e) {
      setTailoredCV("Error: " + e.message);
    }
    setTailorLoading(false);
  }

  function copyTailoredCV() {
    navigator.clipboard.writeText(tailoredCV);
    alert("✅ Copied!");
  }

  function downloadTailoredCV() {
    const blob = new Blob([tailoredCV], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CV-${tailoringJob.company.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAnalyse() {
    setLoading(true);
    setError("");
    try {
      const result = await parseCV(cvText);
      setProfile(result);
      const realJobs = await fetchRealJobs(result, country);
      const scored = realJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      scored.sort((a, b) => b.matchScore - a.matchScore);
      setJobs(scored.slice(0, 10));
      setStep("result");
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090d", color: "#e8eaf0", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
      <h1 style={{ fontSize: "2.5rem", color: "#00e5a0", marginBottom: "8px" }}>ApplyAI</h1>
      <p style={{ color: "#6b7080", marginBottom: "48px" }}>Upload your CV — let AI do the rest</p>

      {step === "upload" && (
        <div style={{ width: "100%", maxWidth: "500px" }}>
          
          {/* COUNTRY SELECTOR */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7080", letterSpacing: "0.1em", marginBottom: "10px", textAlign: "center" }}>
              🌍 SEARCH JOBS IN:
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
{[
                { code: "gb", name: "🇬🇧 UK" },
                { code: "us", name: "🇺🇸 USA" },
                { code: "in", name: "🇮🇳 India" },
                { code: "ie", name: "🇮🇪 Ireland" },
                { code: "au", name: "🇦🇺 Australia" },
                { code: "ca", name: "🇨🇦 Canada" },
                { code: "nz", name: "🇳🇿 New Zealand" },
                { code: "de", name: "🇩🇪 Germany" },
                { code: "fr", name: "🇫🇷 France" },
                { code: "nl", name: "🇳🇱 Netherlands" },
                { code: "it", name: "🇮🇹 Italy" },
                { code: "es", name: "🇪🇸 Spain" },
                { code: "at", name: "🇦🇹 Austria" },
                { code: "be", name: "🇧🇪 Belgium" },
                { code: "ch", name: "🇨🇭 Switzerland" },
                { code: "pl", name: "🇵🇱 Poland" },
                { code: "br", name: "🇧🇷 Brazil" },
                { code: "mx", name: "🇲🇽 Mexico" },
                { code: "za", name: "🇿🇦 South Africa" },
                { code: "sg", name: "🇸🇬 Singapore" }
              ].map(c => (                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  style={{
                    background: country === c.code ? "#00e5a0" : "transparent",
                    color: country === c.code ? "#000" : "#e8eaf0",
                    border: `1px solid ${country === c.code ? "#00e5a0" : "#1e2130"}`,
                    padding: "8px 14px",
                    borderRadius: "100px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* DROPZONE */}
          <div {...getRootProps()} style={{ border: "2px dashed " + (isDragActive ? "#00e5a0" : "#1e2130"), borderRadius: "16px", padding: "64px 48px", textAlign: "center", cursor: "pointer", background: isDragActive ? "rgba(0,229,160,0.05)" : "#0f1117" }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📄</div>
            <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Drag & drop your CV here</p>
            <p style={{ color: "#6b7080", fontSize: "0.85rem" }}>Supports .pdf and .txt files</p>
          </div>
          
        </div>
      )}
      {step === "ready" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
          <p style={{ marginBottom: "24px", fontSize: "1.1rem" }}>CV loaded! Ready to analyse.</p>
          <button onClick={handleAnalyse} disabled={loading} style={{ background: "#00e5a0", color: "#000", border: "none", padding: "16px 40px", borderRadius: "8px", fontSize: "1rem", fontWeight: "700", cursor: "pointer" }}>
            {loading ? "Analysing & finding jobs..." : "Analyse My CV →"}
          </button>
          {error && <p style={{ color: "#ff6b6b", marginTop: "16px" }}>{error}</p>}
        </div>
      )}

      {step === "result" && profile && (
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "16px", padding: "40px", maxWidth: "700px", width: "100%" }}>
          <h2 style={{ color: "#00e5a0", marginBottom: "24px" }}>✨ CV Analysis Complete</h2>
          <Row label="Name" value={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Experience" value={profile.years_experience} />
          <Row label="Education" value={profile.education} />
          <Row label="Skills" value={profile.skills?.join(", ")} />
          <Row label="Target Roles" value={profile.job_titles?.join(", ")} />
          <Row label="Summary" value={profile.summary} />

          <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: "1px solid #1e2130" }}>
            <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#00e5a0", letterSpacing: "0.12em", marginBottom: "8px" }}>// {jobs.length} MATCHING JOBS FOUND</div>
            <h3 style={{ marginBottom: "20px", fontSize: "1.3rem" }}>🎯 Top Jobs For You</h3>

            {jobs.map((job, i) => (
              <div key={i} style={{ background: "#13151e", border: "1px solid #1e2130", borderRadius: "10px", padding: "16px 18px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "44px", height: "44px", background: "rgba(0,229,160,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{job.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>{job.title}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7080" }}>{job.source} · {job.company} · {job.location} · {job.salary}</div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.72rem", padding: "5px 11px", borderRadius: "100px", background: job.matchScore >= 80 ? "rgba(0,229,160,0.12)" : "rgba(91,111,255,0.12)", color: job.matchScore >= 80 ? "#00e5a0" : "#8b9fff", border: `1px solid ${job.matchScore >= 80 ? "rgba(0,229,160,0.3)" : "rgba(91,111,255,0.3)"}`, whiteSpace: "nowrap" }}>{job.matchScore}% match</div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => handleTailor(job)} style={{ background: "transparent", color: "#00e5a0", border: "1px solid #00e5a0", borderRadius: "6px", padding: "8px 12px", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}>🪄 Tailor</button>
                  <button onClick={() => window.open(job.url, "_blank")} style={{ background: "#00e5a0", color: "#000", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}>Apply →</button>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <p style={{ color: "#6b7080", textAlign: "center", padding: "20px" }}>No matching jobs found.</p>
            )}
          </div>

          <button onClick={() => setStep("upload")} style={{ marginTop: "24px", background: "transparent", color: "#00e5a0", border: "1px solid #00e5a0", padding: "10px 24px", borderRadius: "8px", cursor: "pointer" }}>Upload another CV</button>
        </div>
      )}

      {tailoringJob && (
        <div onClick={() => setTailoringJob(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "16px", padding: "32px", maxWidth: "800px", width: "100%", maxHeight: "85vh", overflow: "auto", position: "relative" }}>
            <button onClick={() => setTailoringJob(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", color: "#6b7080", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#00e5a0", letterSpacing: "0.1em", marginBottom: "6px" }}>🪄 AI-TAILORED CV</div>
              <h2 style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{tailoringJob.title}</h2>
              <p style={{ color: "#6b7080", fontSize: "0.85rem" }}>{tailoringJob.company} · {tailoringJob.location}</p>
            </div>
            {tailorLoading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🪄</div>
                <p style={{ color: "#00e5a0" }}>AI is tailoring your CV for this role...</p>
                <p style={{ color: "#6b7080", fontSize: "0.8rem", marginTop: "8px" }}>Takes 5-15 seconds</p>
              </div>
            )}
            {!tailorLoading && tailoredCV && (
              <>
                <div style={{ background: "#08090d", border: "1px solid #1e2130", borderRadius: "10px", padding: "20px", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: "1.6", whiteSpace: "pre-wrap", color: "#e8eaf0", marginBottom: "20px", maxHeight: "400px", overflow: "auto" }}>{tailoredCV}</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={copyTailoredCV} style={{ background: "#00e5a0", color: "#000", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", flex: 1 }}>📋 Copy</button>
                  <button onClick={downloadTailoredCV} style={{ background: "transparent", color: "#00e5a0", border: "1px solid #00e5a0", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", flex: 1 }}>💾 Download</button>
                  <button onClick={() => window.open(tailoringJob.url, "_blank")} style={{ background: "#5b6fff", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", flex: 1 }}>🚀 Apply Now</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ color: "#6b7080", fontSize: "0.75rem", marginBottom: "4px", letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: "0.95rem" }}>{value || "—"}</div>
    </div>
  );
}