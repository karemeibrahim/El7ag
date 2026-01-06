export interface LocalizedContent {
  questionSummary: string;
  keyIndicator: string;
  solutionSteps: string[];
  tips: string;
  practiceQuestion: {
    question: string;
    answer: string;
    explanation: string;
  };
}

export interface QuestionAnalysis {
  id: string;
  questionText: string;    // The original text (math symbols should be LaTeX)
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  
  // Content available in both languages
  ar: LocalizedContent;
  en: LocalizedContent;
}

export interface Slide {
  title: string;
  bulletPoints: string[];
  speakerNotes: string;
}

export interface AnalysisResponse {
  questions: QuestionAnalysis[];
  overallSummaryAr: string;
  overallSummaryEn: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export enum ProcessingState {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export type Language = 'ar' | 'en';