import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResponse, Slide } from "../types";
import { ProcessedFilePart } from "../utils/fileHelpers";

// ✅ 1. استدعاء المفتاح بالطريقة الصحيحة
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const localizedContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questionSummary: { type: Type.STRING, description: "عنوان احترافي للسؤال (Bold)." },
    keyIndicator: { type: Type.STRING, description: "المفتاح الرياضي أو المنطقي للحل." },
    solutionSteps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "خطوات حل مفصلة. استخدم رموز رياضية واضحة (Unicode) مثل √ و ² و × بدلاً من LaTeX."
    },
    tips: { type: Type.STRING, description: "نصيحة من الحاج للطالب." },
    practiceQuestion: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        answer: { type: Type.STRING },
        explanation: { type: Type.STRING }
      },
      required: ["question", "answer", "explanation"]
    }
  },
  required: ["questionSummary", "keyIndicator", "solutionSteps", "tips", "practiceQuestion"]
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallSummaryAr: { type: Type.STRING, description: "ملخص عام للمحتوى بأسلوب أكاديمي راقٍ بالعامية المصرية." },
    overallSummaryEn: { type: Type.STRING, description: "Professional English summary." },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING, description: "نص السؤال الأصلي باستخدام رموز رياضية واضحة (Unicode)." },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard", "Expert"] },
          ar: localizedContentSchema,
          en: localizedContentSchema
        },
        required: ["questionText", "category", "difficulty", "ar", "en"]
      }
    }
  },
  required: ["questions", "overallSummaryAr", "overallSummaryEn"]
};

const slideDeckSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING }
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
  
  const parts: any[] = [];
  fileParts.forEach(part => {
    if (part.inlineData) parts.push({ inlineData: part.inlineData });
    else if (part.text) parts.push({ text: part.text });
  });

  const prompt = `
    You are "El7ag" (الحاج), an expert academic tutor designed to help students understand complex Math and Physics problems.
    Your task is to analyze the provided content and output a JSON response based on the schema.
    **CRITICAL MATH FORMATTING RULES:**
    Format **any mathematical expression** into readable mathematical symbols using Unicode/Math symbols.
    1. Square roots → √  
    2. Powers → superscript (², ³, or ^n)  
    3. Fractions → ÷ or use fraction style (a/b)  
    4. Multiplication → ×  
    **Language & Persona:** Respond in clear, professional **Arabic** mixed with a friendly Egyptian tutor persona.
    Additional user input: ${textInput}
  `;

  parts.push({ text: prompt });

  // ✅ 2. استخدام موديل موجود فعلياً (Flash سريع ورخيص)
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash', 
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  if (response.text) {
    const data = JSON.parse(response.text);
    data.questions = data.questions.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));
    return data as AnalysisResponse;
  }
  throw new Error("No response generated");
};

export const generateSlideDeck = async (analysis: AnalysisResponse, language: 'ar' | 'en'): Promise<Slide[]> => {
  const prompt = `Convert this analysis into a presentation (Slides). Use Unicode Math symbols (√, ², ×, etc.) for all math. Do NOT use LaTeX.`;
  
  // ✅ 3. استخدام موديل موجود فعلياً
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: { parts: [{ text: prompt + JSON.stringify(analysis) }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: slideDeckSchema,
    },
  });
  return response.text ? JSON.parse(response.text).slides : [];
};

export const chatWithContext = async (history: any[], newMessage: string) => {
  const chat = ai.chats.create({
    model: 'gemini-1.5-pro', // ✅ 4. استخدام Pro للشات لأنه أذكى
    history: history,
    config: {
       systemInstruction: `You are "El7ag" (الحاج), an expert academic tutor.
       Format **any mathematical expression** into readable mathematical symbols using Unicode/Math symbols.
       Persona: Speak in professional Arabic with a friendly Egyptian spirit.`
    }
  });
  const result = await chat.sendMessage({ message: newMessage });
  return result.text;
};
