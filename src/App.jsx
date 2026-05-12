import { useState } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
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
        contents: [{
          parts: [{
            text: `Extract the following from this CV and return as JSON only, no extra text:
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
${text}`
          }]
        }]
      })
    }
  );
  
  const data = await res.json();
  console.log("Gemini response:", data);
  
  if (data.error) {
    throw new Error(data.error.message || "API error");
  }
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No response from Gemini. Wait 60 seconds and try again (rate limit).");
  }
  
  const raw = data.candidates[0].content.parts[0].text;
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default function App() {
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 
      "text/plain": [".txt"],
      "application/pdf": [".pdf"]
    },
    onDrop: async (files) => {
      const file = files[0];
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }
      setCvText(text);
      setStep("ready");
    }
  });

  async function handleAnalyse() {
    setLoading(true);
    setError("");
    try {
      const result = await parseCV(cvText);
      setProfile(result);
      setStep("result");
    } catch (e) {
      setError("error:"+e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08090d",
      color: "#e8eaf0",
      fontFamily: "sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "60px 20px"
    }}>
      <h1 style={{ fontSize: "2.5rem", color: "#00e5a0", marginBottom: "8px" }}>ApplyAI</h1>
      <p style={{ color: "#6b7080", marginBottom: "48px" }}>Upload your CV — let AI do the rest</p>

      {step === "upload" && (
        <div {...getRootProps()} style={{
          border: "2px dashed #1e2130",
          borderRadius: "16px",
          padding: "64px 48px",
          textAlign: "center",
          cursor: "pointer",
          width: "100%",
          maxWidth: "500px",
          background: isDragActive ? "rgba(0,229,160,0.05)" : "#0f1117",
          borderColor: isDragActive ? "#00e5a0" : "#1e2130",
          transition: "all 0.2s"
        }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📄</div>
          <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Drag & drop your CV here</p>
<p style={{ color: "#6b7080", fontSize: "0.85rem" }}>Supports .pdf and .txt files</p>        </div>
      )}

      {step === "ready" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
          <p style={{ marginBottom: "24px", fontSize: "1.1rem" }}>CV loaded! Ready to analyse.</p>
          <button onClick={handleAnalyse} disabled={loading} style={{
            background: "#00e5a0",
            color: "#000",
            border: "none",
            padding: "16px 40px",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "700",
            cursor: "pointer"
          }}>
            {loading ? "Analysing with AI..." : "Analyse My CV →"}
          </button>
          {error && <p style={{ color: "#ff6b6b", marginTop: "16px" }}>{error}</p>}
        </div>
      )}

      {step === "result" && profile && (
        <div style={{
          background: "#0f1117",
          border: "1px solid #1e2130",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "600px",
          width: "100%"
        }}>
          <h2 style={{ color: "#00e5a0", marginBottom: "24px" }}>✨ CV Analysis Complete</h2>
          <Row label="Name" value={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Experience" value={profile.years_experience} />
          <Row label="Education" value={profile.education} />
          <Row label="Skills" value={profile.skills?.join(", ")} />
          <Row label="Target Roles" value={profile.job_titles?.join(", ")} />
          <Row label="Summary" value={profile.summary} />
          <button onClick={() => setStep("upload")} style={{
            marginTop: "24px",
            background: "transparent",
            color: "#00e5a0",
            border: "1px solid #00e5a0",
            padding: "10px 24px",
            borderRadius: "8px",
            cursor: "pointer"
          }}>Upload another CV</button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ color: "#6b7080", fontSize: "0.75rem", marginBottom: "4px", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: "0.95rem" }}>{value || "—"}</div>
    </div>
  );
}