import { AnalysisResponse, Slide } from "../types";
import { ProcessedFilePart } from "../utils/fileHelpers";

const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1";

interface GeminiRequestBody {
  contents: Array<{
    role?: string;
    parts: Array<{ text?: string; inlineData?: any }>;
  }>;
  generationConfig?: {
    responseMimeType?: string;
    responseSchema?: any;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

async function callGemini(model: string, body: GeminiRequestBody): Promise<string> {
  const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error("No text content in response");
  }
  
  return text;
}

const localizedContentSchema = {
  type: "object",
  properties: {
    questionSummary: { type: "string", description: "عنوان احترافي للسؤال (Bold)." },
    keyIndicator: { type: "string", description: "المفتاح الرياضي أو المنطقي للحل." },
    solutionSteps: { 
      type: "array", 
      items: { type: "string" },
      description: "خطوات حل مفصلة. استخدم رموز رياضية واضحة (Unicode) مثل √ و ² و × بدلاً من LaTeX."
    },
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
    overallSummaryAr: { type: "string", description: "ملخص عام للمحتوى بأسلوب أكاديمي راقٍ بالعامية المصرية." },
    overallSummaryEn: { type: "string", description: "Professional English summary." },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionText: { type: "string", description: "نص السؤال الأصلي باستخدام رموز رياضية واضحة (Unicode)." },
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

export const analyzeContent = async (
  textInput: string,
  fileParts: ProcessedFilePart[] = []
): Promise<AnalysisResponse> => {
  
  const parts: Array<{ text?: string; inlineData?: any }> = [];
  
  fileParts.forEach(part => {
    if (part.inlineData) parts.push({ inlineData: part.inlineData });
    else if (part.text) parts.push({ text: part.text });
  });

  const prompt = `
    You are "El7ag" (الحاج), an expert academic tutor designed to help students understand complex Math and Physics problems.
    
    Your task is to analyze the provided content and output a JSON response based on the schema.
    
    **CRITICAL MATH FORMATTING RULES:**
    You are a math formatting AI. Format **any mathematical expression** into readable mathematical symbols using Unicode/Math symbols for direct display to users. Follow these rules:

    1. Square roots → √  
    2. Powers → superscript (², ³, or ^n)  
    3. Fractions → ÷ or use fraction style (a/b)  
    4. Multiplication → ×  
    5. Parentheses → () for grouping  
    6. Trigonometric functions → sin, cos, tan (display normally)  
    7. Logarithms → log, ln (display normally)  
    8. Greek letters → α, β, θ, π, etc.  
    9. Matrices → use brackets [ ] or ⎡ ⎤  
    10. Exponents, roots, and fractions should always use proper symbols, not plain text.  
    11. Keep the equation readable in one line if possible, or use line breaks for large expressions.
    
    **Examples:**
    * Input: "square root of x plus x squared divided by 3" -> Output: "(√x + x²) ÷ 3"
    * Input: "sin(theta) squared plus cos(theta) squared equals 1" -> Output: "sin²(θ) + cos²(θ) = 1"
    
    **Language & Persona:** * Respond in clear, professional **Arabic** mixed with a friendly Egyptian tutor persona ("Ya Habeeb El7ag").
    
    Additional user input: ${textInput}
  `;

  parts.push({ text: prompt });

  const responseText = await callGemini("gemini-1.5-flash-latest", {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const data = JSON.parse(responseText);
  data.questions = data.questions.map((q: any, index: number) => ({
    ...q,
    id: `q-${Date.now()}-${index}`
  }));
  
  return data as AnalysisResponse;
};

export const generateSlideDeck = async (analysis: AnalysisResponse, language: 'ar' | 'en'): Promise<Slide[]> => {
  const prompt = `Convert this analysis into a presentation (Slides). Use Unicode Math symbols (√, ², ×, etc.) for all math. Do NOT use LaTeX.`;
  
  const responseText = await callGemini("gemini-1.5-flash-latest", {
    contents: [{ parts: [{ text: prompt + JSON.stringify(analysis) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: slideDeckSchema,
    },
  });

  return JSON.parse(responseText).slides;
};

export const chatWithContext = async (history: any[], newMessage: string): Promise<string> => {
  const systemInstruction = `You are "El7ag" (الحاج), an expert academic tutor.
       
       **CRITICAL MATH FORMATTING RULES:**
       Format **any mathematical expression** into readable mathematical symbols using Unicode/Math symbols for direct display.
       1. Square roots → √
       2. Powers → superscript (², ³, or ^n)
       3. Fractions → ÷ or (a/b)
       4. Multiplication → ×
       5. NO LaTeX syntax (no $, no \\frac, etc.).
       
       **Persona:** Speak in professional Arabic with a friendly Egyptian spirit.`;

  const contents = [
    ...history.map((msg: any) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content || msg.parts?.[0]?.text || "" }]
    })),
    {
      role: "user",
      parts: [{ text: newMessage }]
    }
  ];

  const responseText = await callGemini("gemini-1.5-flash-latest", {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  });

  return responseText;
};