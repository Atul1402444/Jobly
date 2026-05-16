import jsPDF from "jspdf";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
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
// ============== JSEARCH (Google Jobs via RapidAPI) ==============
async function fetchJSearchJobs(profile, country) {
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
  
  if (!RAPIDAPI_KEY) {
    console.error("❌ JSearch: RAPIDAPI_KEY not found in .env");
    return [];
  }
  
  console.log("🔑 JSearch: API key loaded, length:", RAPIDAPI_KEY.length);
  
  const topRole = (profile.job_titles && profile.job_titles[0]) || "professional";
  const query = encodeURIComponent(topRole);
  
  const countryMap = {
    gb: "gb", us: "us", in: "in", ca: "ca", au: "au",
    de: "de", fr: "fr", nl: "nl", ie: "ie", es: "es"
  };
  const jsearchCountry = countryMap[country] || "us";
  
  const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1&country=${jsearchCountry}`;
  
  console.log("📡 JSearch fetching:", url);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
      }
    });
    
    console.log("📡 JSearch response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ JSearch error:", response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    console.log("✅ JSearch raw data:", data);
    
    if (!data.data || data.data.length === 0) {
      console.warn("⚠️ JSearch returned no jobs");
      return [];
    }
    
    const jobs = data.data.map(j => ({
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
    
    console.log(`✅ JSearch returned: ${jobs.length} jobs`);
    return jobs;
    
  } catch (error) {
    console.error("❌ JSearch fetch failed:", error.message);
    return [];
  }
}
async function fetchRealJobs(profile, country, category = "all") {  const queries = [];  
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
    logo: "💼",
    employment_type: job.contract_time?.toUpperCase() || "FULLTIME",
    is_remote: (job.location?.display_name || "").toLowerCase().includes("remote"),
    jobText: (job.title + " " + (job.description || "")).toLowerCase()
  }));
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

export default function App() {
  const { user } = useUser();
  const FREE_LIMIT = 2;
  
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [originalJobs, setOriginalJobs] = useState([]);
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

  // Load saved state once user is known
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
    alert("✅ Copied!");
  }
const downloadTailoredCV = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPos = 25;
    
    // GREEN HEADER BAR
    doc.setFillColor(0, 229, 160);
    doc.rect(0, 0, pageWidth, 8, "F");
    
    // Parse CV
    const lines = tailoredCV.split("\n");
    const name = lines[0]?.trim() || "Professional CV";
    
    // NAME - Big & Bold
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text(name, margin, yPos);
    yPos += 9;
    
    // "Tailored for" badge
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(0, 150, 105);
    doc.text(`✨ Tailored for: ${tailoringJob.title} at ${tailoringJob.company}`, margin, yPos);
    yPos += 8;
    
    // Green divider line
    doc.setDrawColor(0, 229, 160);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    // Body text default
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 50);
    
    // Process all lines
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        yPos += 3;
        continue;
      }
      
      // Page break
      if (yPos > pageHeight - 25) {
        doc.addPage();
        // New page header
        doc.setFillColor(0, 229, 160);
        doc.rect(0, 0, pageWidth, 8, "F");
        yPos = 25;
      }
      
      // Section header detection (**HEADER** or UPPERCASE)
      const isBoldHeader = line.match(/^\*\*(.+?)\*\*$/);
      const isUppercaseHeader = line.length < 50 && line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line);
      
      if (isBoldHeader || isUppercaseHeader) {
        const headerText = line.replace(/\*\*/g, "").trim();
        yPos += 4;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 150, 105);
        doc.text(headerText, margin, yPos);
        yPos += 2;
        
        // Small underline
        doc.setDrawColor(0, 229, 160);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 45, yPos);
        yPos += 6;
        
        // Reset body style
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 50);
      } else if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•")) {
        // Bullet
        const bulletText = line.replace(/^[\*\-•]\s*/, "").replace(/\*\*/g, "");
        const wrappedLines = doc.splitTextToSize("• " + bulletText, maxWidth - 5);
        doc.text(wrappedLines, margin + 3, yPos);
        yPos += wrappedLines.length * 5;
      } else {
        // Normal paragraph
        const cleanLine = line.replace(/\*\*/g, "");
        const wrappedLines = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrappedLines, margin, yPos);
        yPos += wrappedLines.length * 5;
      }
    }
    
    // FOOTER
    const footerY = pageHeight - 12;
    doc.setDrawColor(0, 229, 160);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated with Jobly - AI-Powered Job Applications", margin, footerY);
    
    // Save PDF
    const safeName = (tailoringJob.title || "CV").replace(/[^a-z0-9]/gi, "_").substring(0, 30);
    const safeCompany = (tailoringJob.company || "Tailored").replace(/[^a-z0-9]/gi, "_").substring(0, 20);
    doc.save(`CV-${safeName}-${safeCompany}.pdf`);
  };
 async function handleFilterChange(newFilter) {
    if (newFilter === "all") {
      setJobFilter("all");
      setJobs(originalJobs);
      return;
    }
    
    if (!profile) return;
    
    setJobFilter(newFilter);
    setLoading(true);
    setError("");
    
    try {
      const categoryProfile = {
        ...profile,
        job_titles: profile.job_titles.map(t => getCategorySearchTerms(newFilter, t))
      };
      
      console.log(`🔍 Searching for ${newFilter} jobs...`);
      
      const [adzunaJobs, remotiveJobs] = await Promise.all([
        fetchRealJobs(categoryProfile, country),
        fetchRemotiveJobs(categoryProfile)
      ]);
      
      console.log(`📊 ${newFilter}: ${adzunaJobs.length} Adzuna + ${remotiveJobs.length} Remotive`);
      
      const scoredAdzuna = adzunaJobs.map(j => ({
        ...j,
        matchScore: calculateRealMatchScore(profile.skills, profile.job_titles, j.title, j.jobText)
      }));
      const scoredRemotive = remotiveJobs.map(j => ({
        ...j,
        matchScore: calculateRealMatchScore(profile.skills, profile.job_titles, j.title, j.jobText)
      }));
      
      scoredAdzuna.sort((a, b) => b.matchScore - a.matchScore);
      scoredRemotive.sort((a, b) => b.matchScore - a.matchScore);
      
      const topJobs = [
        ...scoredAdzuna.slice(0, 5),
        ...scoredRemotive.slice(0, 5)
      ];
      
      topJobs.sort((a, b) => b.matchScore - a.matchScore);
      
      if (topJobs.length === 0) {
        setError(`No ${newFilter} jobs found. Try a different filter!`);
      }
      
      setJobs(topJobs);
      
    } catch (err) {
      console.error(`Filter ${newFilter} error:`, err);
      setError(`Couldn't load ${newFilter} jobs. Try again.`);
    } finally {
      setLoading(false);
    }
  }
 
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
      
      // Fetch from BOTH Adzuna and JSearch in PARALLEL (super fast!)
const [adzunaJobs, jsearchJobs, remotiveJobs, museJobs, findworkJobs] = await Promise.all([
        fetchRealJobs(result, country),
        fetchJSearchJobs(result, country),
        fetchRemotiveJobs(result),
        fetchMuseJobs(result),
        fetchFindworkJobs(result)
      ]);
      
      console.log(`📊 Total: ${adzunaJobs.length} Adzuna + ${jsearchJobs.length} JSearch + ${remotiveJobs.length} Remotive + ${museJobs.length} Muse + ${findworkJobs.length} Findwork`);      
      console.log(`📊 Total: ${adzunaJobs.length} Adzuna + ${jsearchJobs.length} JSearch + ${remotiveJobs.length} Remotive`);      
      console.log(`📊 Total: ${adzunaJobs.length} Adzuna + ${jsearchJobs.length} JSearch = ${adzunaJobs.length + jsearchJobs.length} jobs`);
      
      // Combine all jobs
      // Score each platform's jobs separately
      const scoredAdzuna = adzunaJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredJSearch = jsearchJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredRemotive = remotiveJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredMuse = museJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      const scoredFindwork = findworkJobs.map(j => ({ ...j, matchScore: calculateRealMatchScore(result.skills, result.job_titles, j.title, j.jobText) }));
      
      // Sort each by match score, keep TOP 4 from each platform
      scoredAdzuna.sort((a, b) => b.matchScore - a.matchScore);
      scoredJSearch.sort((a, b) => b.matchScore - a.matchScore);
      scoredRemotive.sort((a, b) => b.matchScore - a.matchScore);
      scoredMuse.sort((a, b) => b.matchScore - a.matchScore);
      scoredFindwork.sort((a, b) => b.matchScore - a.matchScore);
      
      // Combine top 4 from each platform
      const topFromEach = [
        ...scoredAdzuna.slice(0, 4),
        ...scoredJSearch.slice(0, 4),
        ...scoredRemotive.slice(0, 4),
        ...scoredMuse.slice(0, 4),
        ...scoredFindwork.slice(0, 4)
      ];
      
      console.log(`🏆 Best matches: ${scoredAdzuna.slice(0,4).length} Adzuna + ${scoredJSearch.slice(0,4).length} JSearch + ${scoredRemotive.slice(0,4).length} Remotive + ${scoredMuse.slice(0,4).length} Muse + ${scoredFindwork.slice(0,4).length} Findwork = ${topFromEach.length} total`);      // Final sort across all platforms
      topFromEach.sort((a, b) => b.matchScore - a.matchScore);
      
      console.log(`✅ Final: Top ${scoredAdzuna.slice(0,4).length} Adzuna + Top ${scoredJSearch.slice(0,4).length} JSearch = ${topFromEach.length} best matches`);
      
      setJobs(topFromEach);
      setOriginalJobs(topFromEach);
      setStep("result");
      const newCount = searchesUsed + 1;
      setSearchesUsed(newCount);
      if (user?.id) localStorage.setItem(`searches_${user.id}`, newCount.toString());
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }
async function fetchMuseJobs(profile) {
  console.log("🎭 The Muse: fetching jobs...");
  
  const topRole = (profile.job_titles && profile.job_titles[0]) || "marketing";
  const category = encodeURIComponent(topRole);
  
  const url = `https://www.themuse.com/api/public/jobs?category=${category}&page=0`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("❌ The Muse error:", response.status);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ The Muse returned: ${data.results?.length || 0} jobs`);
    
    if (!data.results || data.results.length === 0) return [];
    
    const jobs = data.results.slice(0, 15).map(j => ({
      id: `muse_${j.id}`,
      title: j.name || "Position",
      company: j.company?.name || "Company",
      location: j.locations?.[0]?.name || "Multiple Locations",
      salary: "Not specified",
      description: (j.contents || "").replace(/<[^>]*>/g, "").substring(0, 500),
      url: j.refs?.landing_page || "#",
      source: "The Muse 🎭",
      jobText: `${j.name || ""} ${j.contents || ""} ${j.categories?.map(c=>c.name).join(" ") || ""}`.toLowerCase()
    }));
    
    return jobs;
    
  } catch (error) {
    console.error("❌ The Muse fetch failed:", error.message);
    return [];
  }
}
async function fetchFindworkJobs(profile) {
  console.log("🔎 Findwork: fetching jobs...");
  
  const topRole = (profile.job_titles && profile.job_titles[0]) || "marketing";
  const search = encodeURIComponent(topRole);
  
  const url = `https://findwork.dev/api/jobs/?search=${search}&sort_by=relevance`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("❌ Findwork error:", response.status);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ Findwork returned: ${data.results?.length || 0} jobs`);
    
    if (!data.results || data.results.length === 0) return [];
    
    const jobs = data.results.slice(0, 15).map(j => ({
      id: `findwork_${j.id}`,
      title: j.role || "Position",
      company: j.company_name || "Company",
      location: j.location || (j.remote ? "Remote" : "Not specified"),
      salary: "Not specified",
      description: (j.text || "").replace(/<[^>]*>/g, "").substring(0, 500),
      url: j.url || "#",
      source: "Findwork 🔎",
      jobText: `${j.role || ""} ${j.text || ""} ${j.keywords?.join(" ") || ""}`.toLowerCase()
    }));
    
    return jobs;
    
  } catch (error) {
    console.error("❌ Findwork fetch failed:", error.message);
    return [];
  }
}


  async function fetchRemotiveJobs(profile) {
  console.log("🌐 Remotive: fetching remote jobs...");
  
  const topRole = (profile.job_titles && profile.job_titles[0]) || "marketing";
  const searchTerm = encodeURIComponent(topRole);
  
  const url = `https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=20`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("❌ Remotive error:", response.status);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ Remotive returned: ${data.jobs?.length || 0} jobs`);
    
    if (!data.jobs || data.jobs.length === 0) return [];
    
    const jobs = data.jobs.map(j => ({
      id: `remotive_${j.id}`,
      title: j.title || "Position",
      company: j.company_name || "Company",
      location: j.candidate_required_location || "Remote Worldwide",
      salary: j.salary || "Not specified",
      description: (j.description || "").replace(/<[^>]*>/g, "").substring(0, 500),
      url: j.url || "#",
      source: "Remotive 🌍",
      jobText: `${j.title || ""} ${j.description || ""} ${j.tags?.join(" ") || ""}`.toLowerCase()
    }));
    
    return jobs;
    
  } catch (error) {
    console.error("❌ Remotive fetch failed:", error.message);
    return [];
  }
}

  function handlePayment() {
    if (confirm(`Simulate payment of ${userPricing.symbol}${userPricing.amount}?\n\n(Real Stripe payment coming in Phase C)`)) {
      setHasPaid(true);
      if (user?.id) localStorage.setItem(`paid_${user.id}`, "true");
      setShowPaywall(false);
      setTimeout(() => alert("🎉 Welcome to Pro! Enjoy unlimited access."), 100);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090d", color: "#e8eaf0", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
      
      <SignedOut>
        <div style={{ textAlign: "center", maxWidth: "500px", marginTop: "60px" }}>
          <h1 style={{ fontSize: "3.5rem", color: "#00e5a0", marginBottom: "16px", letterSpacing: "-0.02em" }}>Jobly</h1>
          <p style={{ color: "#e8eaf0", fontSize: "1.2rem", marginBottom: "12px" }}>AI-powered career platform — for job seekers and companies</p>
          <p style={{ color: "#6b7080", marginBottom: "40px", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Upload your CV → AI finds matching jobs → AI tailors your CV for each role.<br/><br/>
            <span style={{ color: "#00e5a0", fontWeight: 600 }}>2 free searches</span> to get started, then {userPricing.symbol}{userPricing.amount} one-time for unlimited.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <SignUpButton mode="modal">
              <button style={{ background: "#00e5a0", color: "#000", border: "none", padding: "16px 40px", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Sign Up Free →</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button style={{ background: "transparent", color: "#00e5a0", border: "1px solid #00e5a0", padding: "16px 40px", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Sign In</button>
            </SignInButton>
          </div>
          <div style={{ marginTop: "60px", display: "flex", gap: "32px", justifyContent: "center", flexWrap: "wrap", color: "#6b7080", fontSize: "0.85rem" }}>
            <div>🤖 AI-powered</div>
            <div>🌍 20 countries</div>
            <div>🪄 CV tailoring</div>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <div style={{ position: "absolute", top: "20px", right: "30px" }}>
          <UserButton afterSignOutUrl="/" />
        </div>
        
        <h1 style={{ fontSize: "2.5rem", color: "#00e5a0", marginBottom: "8px" }}>Jobly</h1>
        <p style={{ color: "#6b7080", marginBottom: "16px" }}>Upload your CV — let AI do the rest</p>

        <div style={{
          background: hasPaid ? "rgba(91,111,255,0.1)" : (searchesUsed >= FREE_LIMIT ? "rgba(255,107,107,0.1)" : "rgba(0,229,160,0.08)"),
          border: `1px solid ${hasPaid ? "rgba(91,111,255,0.3)" : (searchesUsed >= FREE_LIMIT ? "rgba(255,107,107,0.3)" : "rgba(0,229,160,0.25)")}`,
          color: hasPaid ? "#8b9fff" : (searchesUsed >= FREE_LIMIT ? "#ff6b6b" : "#00e5a0"),
          padding: "6px 14px", borderRadius: "100px", fontSize: "0.78rem", fontFamily: "monospace", marginBottom: "32px", letterSpacing: "0.05em"
        }}>
          {hasPaid ? "💎 PRO MEMBER — UNLIMITED SEARCHES" : (searchesUsed >= FREE_LIMIT ? "⚠️ 0 FREE SEARCHES LEFT — UPGRADE TO CONTINUE" : `✨ ${FREE_LIMIT - searchesUsed} FREE SEARCH${FREE_LIMIT - searchesUsed !== 1 ? "ES" : ""} LEFT`)}
        </div>

        {step === "upload" && (
          <div style={{ width: "100%", maxWidth: "500px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7080", letterSpacing: "0.1em", marginBottom: "10px", textAlign: "center" }}>🌍 SEARCH JOBS IN:</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { code: "gb", name: "🇬🇧 UK" }, { code: "us", name: "🇺🇸 USA" }, { code: "in", name: "🇮🇳 India" },
                  { code: "ie", name: "🇮🇪 Ireland" }, { code: "au", name: "🇦🇺 Australia" }, { code: "ca", name: "🇨🇦 Canada" },
                  { code: "nz", name: "🇳🇿 New Zealand" }, { code: "de", name: "🇩🇪 Germany" }, { code: "fr", name: "🇫🇷 France" },
                  { code: "nl", name: "🇳🇱 Netherlands" }, { code: "it", name: "🇮🇹 Italy" }, { code: "es", name: "🇪🇸 Spain" },
                  { code: "at", name: "🇦🇹 Austria" }, { code: "be", name: "🇧🇪 Belgium" }, { code: "ch", name: "🇨🇭 Switzerland" },
                  { code: "pl", name: "🇵🇱 Poland" }, { code: "br", name: "🇧🇷 Brazil" }, { code: "mx", name: "🇲🇽 Mexico" },
                  { code: "za", name: "🇿🇦 South Africa" }, { code: "sg", name: "🇸🇬 Singapore" }
                ].map(c => (
                  <button key={c.code} onClick={() => setCountry(c.code)} style={{
                    background: country === c.code ? "#00e5a0" : "transparent",
                    color: country === c.code ? "#000" : "#e8eaf0",
                    border: `1px solid ${country === c.code ? "#00e5a0" : "#1e2130"}`,
                    padding: "8px 14px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
                  }}>{c.name}</button>
                ))}
              </div>
            </div>
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
            <button onClick={handleAnalyse} disabled={loading} style={{ background: "#00e5a0", color: "#000", border: "none", padding: "16px 40px", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
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
              <h2 style={{ marginBottom: "20px", fontSize: "1.3rem" }}>🎯 Top Jobs For You</h2>
{/* JOB TYPE FILTERS */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { id: "all", label: "All Jobs", icon: "🌐" },
                { id: "fulltime", label: "Full-time", icon: "💼" },
                { id: "parttime", label: "Part-time", icon: "⏰" },
                { id: "contract", label: "Contract", icon: "📝" },
                { id: "internship", label: "Internship", icon: "🎓" },
                { id: "remote", label: "Remote", icon: "🌍" }
              ].map((filterOption) => (
                <button
                  key={filterOption.id}
onClick={() => handleFilterChange(filterOption.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: jobFilter === filterOption.id ? "2px solid #00e5a0" : "1px solid #2a2a3e",
                    background: jobFilter === filterOption.id ? "rgba(0,229,160,0.15)" : "transparent",
                    color: jobFilter === filterOption.id ? "#00e5a0" : "#aaa",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  {filterOption.icon} {filterOption.label}
                </button>
              ))}
            </div>
            {jobs.filter(job => jobFilter === "all" || detectJobType(job) === jobFilter).map((job, idx) => (     
                         <div key={idx} style={{ background: "#13151e", border: "1px solid #1e2130", borderRadius: "10px", padding: "16px 18px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "16px" }}>
<div style={{ width: "44px", height: "44px", background: "rgba(0,229,160,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  {job.source?.includes("Remotive") ? "🌍" : job.source?.includes("Muse") ? "🎭" : job.source?.includes("Findwork") ? "🔎" : job.source?.includes("JSearch") ? "🔍" : "💼"}
                </div>                  <div style={{ flex: 1, minWidth: 0 }}>
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
              {jobs.length === 0 && <p style={{ color: "#6b7080", textAlign: "center", padding: "20px" }}>No matching jobs found.</p>}
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
                  <p style={{ color: "#00e5a0" }}>AI is tailoring your CV...</p>
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

        {showPaywall && (
          <div onClick={() => setShowPaywall(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 2000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(135deg, #0f1117 0%, #131520 100%)", border: "1px solid #1e2130", borderRadius: "20px", padding: "48px 40px", maxWidth: "500px", width: "100%", textAlign: "center", position: "relative" }}>
              <button onClick={() => setShowPaywall(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", color: "#6b7080", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚀</div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "12px", color: "#00e5a0" }}>You're loving Jobly!</h2>
              <p style={{ color: "#6b7080", marginBottom: "32px", lineHeight: 1.6 }}>You've used all {FREE_LIMIT} free searches. Unlock unlimited access — pay once, use forever.</p>
              <div style={{ background: "#08090d", border: "2px solid #00e5a0", borderRadius: "16px", padding: "32px 24px", marginBottom: "24px" }}>
                <div style={{ fontSize: "0.7rem", color: "#00e5a0", letterSpacing: "0.12em", marginBottom: "8px", fontFamily: "monospace" }}>✨ LIFETIME ACCESS · ONE-TIME PAYMENT</div>
                <div style={{ fontSize: "3.2rem", fontWeight: 800, color: "#00e5a0", marginBottom: "4px", lineHeight: 1 }}>{userPricing.symbol}{userPricing.amount}</div>
                <p style={{ color: "#6b7080", fontSize: "0.82rem", marginBottom: "20px" }}>One-time payment · No subscriptions · No hidden fees</p>
                <ul style={{ listStyle: "none", textAlign: "left", padding: 0 }}>
                  <li style={{ marginBottom: "10px", color: "#e8eaf0", fontSize: "0.9rem" }}>✅ Unlimited CV searches forever</li>
                  <li style={{ marginBottom: "10px", color: "#e8eaf0", fontSize: "0.9rem" }}>✅ Unlimited AI CV tailoring</li>
                  <li style={{ marginBottom: "10px", color: "#e8eaf0", fontSize: "0.9rem" }}>✅ Jobs from 20 countries</li>
                  <li style={{ marginBottom: "10px", color: "#e8eaf0", fontSize: "0.9rem" }}>✅ All future features included</li>
                </ul>
              </div>
              <button onClick={handlePayment} style={{ background: "#00e5a0", color: "#000", border: "none", padding: "16px 40px", borderRadius: "10px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: "12px" }}>Unlock for {userPricing.symbol}{userPricing.amount} →</button>
              <button onClick={() => setShowPaywall(false)} style={{ background: "transparent", color: "#6b7080", border: "none", fontSize: "0.85rem", cursor: "pointer" }}>Maybe later</button>
              <p style={{ color: "#6b7080", fontSize: "0.72rem", marginTop: "20px" }}>💳 Secure payment · Money-back guarantee</p>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}
function getCategorySearchTerms(category, baseRole) {
  const role = baseRole || "professional";
  
  switch(category) {
    case "internship":
      return `${role} internship`;
    case "parttime":
      return `${role} part time`;
    case "contract":
      return `${role} contract freelance`;
    case "remote":
      return `${role} remote`;
    case "fulltime":
      return `${role} full time`;
    default:
      return role;
  }
}
function detectJobType(job) {
  const text = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  
  if (text.includes("intern") || text.includes("internship")) return "internship";
  if (text.includes("contract") || text.includes("freelance") || text.includes("contractor")) return "contract";
  if (text.includes("part-time") || text.includes("part time")) return "parttime";
  if (text.includes("remote") || text.includes("worldwide") || text.includes("anywhere") || job.source?.includes("Remotive")) return "remote";
  return "fulltime"; // default
}
function Row({ label, value }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ color: "#6b7080", fontSize: "0.75rem", marginBottom: "4px", letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: "0.95rem" }}>{value || "—"}</div>
    </div>
  );
}
