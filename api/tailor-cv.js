// api/tailor-cv.js
// Vercel serverless function that takes a CV (as base64 PDF) + job description
// + ATS analysis, and returns a tailored version of the CV optimized for the role.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cvBase64, jobDescription, atsAnalysis } = req.body;

    // Validate input
    if (!cvBase64 || !jobDescription) {
      return res.status(400).json({ error: "Missing cvBase64 or jobDescription" });
    }

    // Backend env var (no VITE_ prefix)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const prompt = `You are an expert ATS-optimization resume writer.

You have:
1. A user's CV (provided as PDF)
2. A target job description (provided below)
3. An ATS analysis showing missing keywords and recommendations (provided below)

Your task: Rewrite this CV to be perfectly tailored for the job. The output should be a complete, professional, ATS-optimized resume.

CRITICAL RULES:
- Keep ALL the user's REAL experience, education, and skills — do NOT invent fake jobs, degrees, or accomplishments
- Naturally weave in missing keywords from the job description where the user genuinely has related experience
- Rewrite bullet points to use power verbs and quantifiable impact
- Reorder sections to emphasize most relevant experience first
- Match the language and terminology of the job description
- Keep it ATS-friendly: single column, clear section headers, no graphics
- Output MUST be valid JSON

Return ONLY this JSON structure, no markdown or extra text:

{
  "fullName": "Candidate's full name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "linkedin": "linkedin url or empty string",
  "summary": "3-4 sentence professional summary tailored to the role",
  "skills": ["skill1", "skill2", "skill3", "..."],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "startDate": "Month Year",
      "endDate": "Month Year or Present",
      "bullets": [
        "Achievement bullet with quantifiable impact and keywords",
        "Another bullet emphasizing relevant skills"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "location": "City, Country",
      "startDate": "Year",
      "endDate": "Year",
      "details": "GPA or honors if mentioned, otherwise empty string"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "year": "Year"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "1-2 sentence description emphasizing relevant skills",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

If a section has no data in the original CV, return an empty array for it.

JOB DESCRIPTION:
${jobDescription}

ATS ANALYSIS (for context on what to emphasize):
${JSON.stringify(atsAnalysis || {}, null, 2)}`;

    // Call Gemini with the PDF + prompt
    const geminiResponse = await fetch(
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
                  data: cvBase64,
                },
              },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return res.status(500).json({ 
        error: "AI service error", 
        status: geminiResponse.status 
      });
    }

    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    const cleanText = text.replace(/```json|```/g, "").trim();

    let tailoredCV;
    try {
      tailoredCV = JSON.parse(cleanText);
    } catch (parseErr) {
      // Try to recover from partial JSON
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          tailoredCV = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("JSON parse failed:", cleanText);
          return res.status(500).json({ error: "Could not parse AI response" });
        }
      } else {
        return res.status(500).json({ error: "Invalid AI response format" });
      }
    }

    return res.status(200).json({ success: true, cv: tailoredCV });
  } catch (err) {
    console.error("Tailor CV error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}