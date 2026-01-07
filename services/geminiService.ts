import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResponse, Slide } from "../types";
import { ProcessedFilePart } from "../utils/fileHelpers";



// 1. استخدام import.meta.env المتوافق مع Vite
// تأكد أنك سميت المتغير في Netlify/Vercel بـ VITE_API_KEY
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

// ... (باقي تعريفات الـ Schema اتركها كما هي) ...
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

  // 2. تصحيح اسم الموديل هنا
  const response = await ai.models.generateContent({
    model: model: 'gemini-1.5-flash-latest',
    contents: [ // ✅ تعديل مهم: لازم تكون مصفوفة
      {
        role: 'user',
        parts: parts
      }
    ],
    config: {
      responseMimeType: "application/json",
     
    },
  });
const responseText = response.text();
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
  // 3. تصحيح اسم الموديل هنا
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash-latest', // تم التعديل من gemini-3-flash-preview
    contents: { parts: [{ text: prompt + JSON.stringify(analysis) }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: slideDeckSchema,
    },
  });
  const responseText = response.text();
  return response.text ? JSON.parse(response.text).slides : [];
};

export const chatWithContext = async (history: any[], newMessage: string) => {
  const chat = ai.chats.create({
    model: 'gemini-1.5-pro', // تم التعديل من gemini-3-pro-preview (نستخدم pro للشات عشان يكون أذكى)
    history: history,
    config: {
       systemInstruction: `You are "El7ag" (الحاج), an expert academic tutor.
       
       **CRITICAL MATH FORMATTING RULES:**
       Format **any mathematical expression** into readable mathematical symbols using Unicode/Math symbols for direct display.
       1. Square roots → √
       2. Powers → superscript (², ³, or ^n)
       3. Fractions → ÷ or (a/b)
       4. Multiplication → ×
       5. NO LaTeX syntax (no $, no \\frac, etc.).
       
       **Persona:** Speak in professional Arabic with a friendly Egyptian spirit.
       `
   }
  });

  const result = await chat.sendMessage({ 
    content: [ // ✅ تعديل: sendMessage بياخد content array أحياناً في النسخة الجديدة، أو string
       { role: 'user', parts: [{ text: newMessage }] } 
    ] 
  });
  
  // ✅ تعديل: استخدام .text()
  return result.text();
};
