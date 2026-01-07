import { AnalysisResponse, Slide } from "../types";
import { ProcessedFilePart } from "../utils/fileHelpers";

const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1";

// --- Call Gemini API ---
async function callGemini(
  model: string,
  contents: Array<{ role?: string; parts: Array<{ text: string }> }>
): Promise<string> {
  const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("No text content in response");

  return text;
}

// --- Schemas ---
const localizedContentSchema = {
  type: "object",
  properties: {
    questionSummary: { type: "string", description: "عنوان احترافي للسؤال (Bold)." },
    keyIndicator: { type: "string", description: "المفتاح الرياضي أو المنطقي للحل." },
    solutionSteps: { type: "array", items: { type: "string" }, description: "خطوات حل مفصلة مع رموز رياضية." },
    tips: { type: "string", description: "نصيحة من الحاج للطالب." },
    practiceQuestion: {
      type: "object",
      properties: {
        question: { type: "string" },
        answer: { type: "string" },
        explanation: { type: "string" }
      },
      required: ["question", "answer", "explanation"]
    }
  },
  required: ["questionSummary", "keyIndicator", "solutionSteps", "tips", "practiceQuestion"]
};

const analysisSchema = {
  type: "object",
  properties: {
    overallSummaryAr: { type: "string" },
    overallSummaryEn: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionText: { type: "string" },
          category: { type: "string" },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Expert"] },
          ar: localizedContentSchema,
          en: localizedContentSchema
        },
        required: ["questionText", "category", "difficulty", "ar", "en"]
      }
    }
  },
  required: ["questions", "overallSummaryAr", "overallSummaryEn"]
};

const slideDeckSchema = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          bulletPoints: { type: "array", items: { type: "string" } },
          speakerNotes: { type: "string" }
        },
        required: ["title", "bulletPoints", "speakerNotes"]
      }
    }
  },
  required: ["slides"]
};

// --- Helper: sanitize parts to avoid 400 ---
function sanitizeParts(parts: Array<{ text?: string; inlineData?: any }>) {
  return parts
    .filter(p => p.text && p.text.trim().length > 0)
    .map(p => ({ text: p.text!.trim() }));
}

// --- Analyze Content ---
export const analyzeContent = async (
  textInput: string,
  fileParts: ProcessedFilePart[] = []
): Promise<AnalysisResponse> => {
  const parts: Array<{ text?: string }> = [];

  fileParts.forEach(part => {
    if (part.text) parts.push({ text: part.text });
  });

  parts.push({ text: textInput });

  const contents = [
    { role: "system", parts: [{ text: "You are El7ag, a friendly Egyptian academic tutor. Format math using Unicode symbols." }] },
    { role: "user", parts: sanitizeParts(parts) }
  ];

  const responseText = await callGemini("gemini-1.5-flash-latest", contents);

  const data = JSON.parse(responseText);
  data.questions = data.questions.map((q: any, index: number) => ({
    ...q,
    id: `q-${Date.now()}-${index}`
  }));

  return data as AnalysisResponse;
};

// --- Generate Slide Deck ---
export const generateSlideDeck = async (analysis: AnalysisResponse, language: 'ar' | 'en'): Promise<Slide[]> => {
  const prompt = `Convert this analysis into slides. Use Unicode math symbols. No LaTeX.`;

  const contents = [
    { role: "system", parts: [{ text: "You are El7ag, a friendly Egyptian academic tutor. Convert analysis to slides." }] },
    { role: "user", parts: [{ text: prompt + JSON.stringify(analysis) }] }
  ];

  const responseText = await callGemini("gemini-1.5-flash-latest", contents);

  return JSON.parse(responseText).slides;
};

// --- Chat with Context ---
export const chatWithContext = async (history: any[], newMessage: string): Promise<string> => {
  const systemInstruction = `
You are "El7ag" (الحاج), an expert academic tutor.
Format math expressions using Unicode symbols. Speak professionally with a friendly Egyptian spirit.
  `;

  const contents = [
    { role: "system", parts: [{ text: systemInstruction }] },
    ...history.map(msg => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content || msg.parts?.[0]?.text || "" }]
    })),
    { role: "user", parts: [{ text: newMessage }] }
  ];

  const responseText = await callGemini("gemini-1.5-flash-latest", contents);
  return responseText;
};
