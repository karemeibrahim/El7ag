
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  BrainCircuit, 
  Lightbulb, 
  ArrowRight,
  Loader2,
  X,
  File as FileIcon,
  Trash2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  FileText,
  Globe,
  Presentation,
  Sparkles,
  Plus,
  Moon,
  Sun,
  LayoutDashboard,
  BookOpen,
  Menu,
  MessageSquare,
  StickyNote,
  HelpCircle
} from 'lucide-react';
import { analyzeContent, chatWithContext, generateSlideDeck } from './services/geminiService';
import { processFiles } from './utils/fileHelpers';
import { AnalysisResponse, ProcessingState, ChatMessage, Language, Slide, QuestionAnalysis } from './types';

const BACKGROUND_IMAGE_URL = "unnamed.jpg"; // تعريف المتغير

function App() {
  return (
    // هنا بنستخدم المتغير عشان نغير الخلفية
    <div style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}>
     
    </div>
  );
}

/**
 * Robust Math rendering component that avoids KaTeX auto-render's strict quirks-mode check
 * by manually parsing and calling katex.render.
 */
const MathText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Check if katex is available globally
    const katex = (window as any).katex;
    if (!katex) {
      containerRef.current.innerText = text;
      return;
    }

    try {
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Split by $$...$$ first (display mode), then by $...$ (inline mode)
      const displayParts = text.split(/(\$\$.*?\$\$)/gs);
      
      displayParts.forEach(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          const div = document.createElement('div');
          div.className = 'my-4 flex justify-center overflow-x-auto overflow-y-hidden py-2';
          div.dir = 'ltr';
          try {
            katex.render(formula, div, { displayMode: true, throwOnError: false });
          } catch (e) {
            div.textContent = part;
          }
          containerRef.current?.appendChild(div);
        } else {
          // Process inline math within this text segment
          const inlineParts = part.split(/(\$.*?\$)/gs);
          const segmentContainer = document.createElement('span');
          
          inlineParts.forEach(inlinePart => {
            if (inlinePart.startsWith('$') && inlinePart.endsWith('$')) {
              const formula = inlinePart.slice(1, -1).trim();
              const span = document.createElement('span');
              span.dir = 'ltr';
              span.className = 'inline-block mx-1';
              try {
                katex.render(formula, span, { displayMode: false, throwOnError: false });
              } catch (e) {
                span.textContent = inlinePart;
              }
              segmentContainer.appendChild(span);
            } else {
              const textNode = document.createTextNode(inlinePart);
              segmentContainer.appendChild(textNode);
            }
          });
          
          containerRef.current?.appendChild(segmentContainer);
        }
      });
    } catch (err) {
      console.error("MathText rendering error:", err);
      if (containerRef.current) containerRef.current.innerText = text;
    }
  }, [text]);

  return <div ref={containerRef} className={`${className} leading-relaxed whitespace-pre-wrap`} />;
};

const PracticeSection: React.FC<{ practice: any; lang: Language }> = ({ practice, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-8 border-t-2 border-dashed border-slate-200 dark:border-zinc-800 pt-6">
      <div 
        className="flex items-center justify-between cursor-pointer group p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl transition-all hover:bg-red-100/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg">
            <GraduationCap size={20} />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-zinc-100">
              {lang === 'ar' ? 'تمرين "حبيب الحاج"' : 'Practice Case'}
            </h5>
            <p className="text-xs text-slate-500">{lang === 'ar' ? 'اختبر فهمك يا حاج' : 'Test your knowledge'}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      
      {isOpen && (
        <div className="mt-4 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-inner animate-in fade-in slide-in-from-top-2">
          <MathText text={practice.question} className="text-lg font-semibold mb-6 text-slate-800 dark:text-zinc-200" />
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700">
            <p className="text-sm font-bold text-green-600 mb-2">{lang === 'ar' ? 'الإجابة النموذجية:' : 'Correct Answer:'}</p>
            <MathText text={practice.answer} className="text-slate-900 dark:text-zinc-100 mb-4" />
            <p className="text-sm font-bold text-slate-500 mb-2">{lang === 'ar' ? 'ليه كده؟ (شرح الحاج):' : 'Why? (El7ag\'s logic):'}</p>
            <MathText text={practice.explanation} className="text-slate-600 dark:text-zinc-400 italic" />
          </div>
        </div>
      )}
    </div>
  );
};

const SlideDeckViewer: React.FC<{ slides: Slide[]; onClose: () => void; lang: Language }> = ({ slides, onClose, lang }) => {
  const [current, setCurrent] = useState(0);
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[90vh] lg:h-[700px] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-white/10">
        <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Presentation className="text-red-600" />
            <h3 className="font-bold text-lg lg:text-xl">{lang === 'ar' ? 'سبورة الحاج' : 'El7ag\'s Blackboard'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-colors"><X /></button>
        </div>
        <div className="flex-1 p-6 lg:p-12 flex flex-col justify-center items-center text-center bg-gradient-to-b from-transparent to-red-50/20 dark:to-red-900/5 overflow-y-auto">
          <h2 className="text-2xl lg:text-4xl font-black mb-6 lg:mb-10 text-slate-900 dark:text-white leading-tight">{slides[current].title}</h2>
          <div className="space-y-4 lg:space-y-6 max-w-3xl w-full">
            {slides[current].bulletPoints.map((bp, i) => (
              <div key={i} className="flex items-start gap-4 text-left group bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-600 mt-3 group-hover:scale-150 transition-transform shrink-0"></div>
                <MathText text={bp} className="text-lg lg:text-2xl text-slate-700 dark:text-zinc-300 font-medium" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 lg:p-6 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
          <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="px-4 lg:px-6 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold disabled:opacity-30 transition-all hover:shadow-md text-sm lg:text-base">
            {lang === 'ar' ? 'اللي فات' : 'Previous'}
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 lg:w-8 bg-red-600' : 'w-2 bg-slate-300 dark:bg-zinc-700'}`} />
            ))}
          </div>
          <button disabled={current === slides.length - 1} onClick={() => setCurrent(c => c + 1)} className="px-4 lg:px-6 py-2 rounded-xl bg-red-600 text-white font-bold disabled:opacity-30 transition-all hover:bg-red-700 shadow-lg shadow-red-600/20 text-sm lg:text-base">
            {lang === 'ar' ? 'الي بعده' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [status, setStatus] = useState<ProcessingState>(ProcessingState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Mobile UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'content' | 'chat'>('content');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setErrorMsg(null);
    }
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleAnalyze = async () => {
    if (files.length === 0 && !textInput.trim()) {
      setErrorMsg(language === 'ar' ? "ارفع حاجة طيب يا حبيب الحاج!" : "Please upload something first!");
      return;
    }
    setStatus(ProcessingState.ANALYZING);
    setErrorMsg(null);
    setIsSidebarOpen(false); // Close sidebar on mobile when starting
    try {
      const processedParts = await processFiles(files);
      const result = await analyzeContent(textInput, processedParts);
      setAnalysis(result);
      setStatus(ProcessingState.COMPLETE);
      setChatMessages([{ role: 'model', content: language === 'ar' ? `خلصت يا حاج! حللتلك ${result.questions.length} أسئلة بأسلوب الكتاب الجامعي. أي خدمة تانية؟` : `Done! I analyzed ${result.questions.length} items. Ready for questions.` }]);
    } catch (err) {
      setErrorMsg(language === 'ar' ? "حصلت مشكلة في التحليل، جرب تاني يا حاج." : "Analysis failed, try again.");
      setStatus(ProcessingState.ERROR);
    }
  };

  const handleExplainMore = async (q: QuestionAnalysis, idx: number) => {
    if (isChatLoading) return;
    
    // Switch tab if mobile
    setActiveMobileTab('chat');

    const userVisibleText = language === 'ar' 
      ? `ممكن تشرح لي السؤال رقم ${idx + 1} بتفصيل أكتر؟` 
      : `Can you explain Question ${idx + 1} in more detail?`;

    // Optimistically update UI
    setChatMessages(prev => [...prev, { role: 'user', content: userVisibleText }]);
    setIsChatLoading(true);

    try {
      // Build history from existing messages
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      
      // Construct the actual prompt with context
      const content = language === 'ar' ? q.ar : q.en;
      const detailedPrompt = `
        I need a detailed explanation for the following question from the analysis:
        
        Question: ${q.questionText}
        Summary: ${content.questionSummary}
        Key Indicator identified: ${content.keyIndicator}
        Brief steps provided: ${content.solutionSteps.join(' -> ')}
        
        Please provide a comprehensive, step-by-step breakdown of the solution, explaining the underlying concepts clearly as if teaching a student who didn't understand the brief steps. Use the "El7ag" persona.
      `;

      const response = await chatWithContext(history, detailedPrompt);
      
      setChatMessages(prev => [...prev, { role: 'model', content: response || "" }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', content: language === 'ar' ? "معلش حصل مشكلة، جرب تاني." : "Sorry, an error occurred." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const response = await chatWithContext(history, chatInput);
      setChatMessages(prev => [...prev, { role: 'model', content: response || "" }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', content: "معلش يا حبيب الحاج، النت علق. جرب تاني." }]);
    } finally { setIsChatLoading(false); }
  };

  useEffect(() => {
    if (status === ProcessingState.COMPLETE && activeMobileTab === 'chat') {
       chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeMobileTab, status]);

  return (
    <div className={`${theme} h-full overflow-hidden font-cairo`}>
      <div className="h-full flex bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-500 relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} 
          w-80 bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-md lg:bg-slate-50/50 lg:dark:bg-zinc-900/50
          border-e border-slate-100 dark:border-zinc-900 
          flex flex-col flex-shrink-0 z-50 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}
          lg:translate-x-0 shadow-2xl lg:shadow-none
        `}>
          <div className="h-20 flex items-center px-6 gap-3 justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative">
                <img 
                  src="Gemini_Generated_Image_jkgj43jkgj43jkgj%20(1).png" 
                  alt="El7ag Logo" 
                  className="w-full h-full rounded-2xl shadow-xl shadow-red-600/20 object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-600/20">
                  <BrainCircuit size={28} />
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight">{language === 'ar' ? 'الحاج' : 'El7ag'}</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المصادر المرفوعة' : 'Uploads'}</h2>
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full font-bold">{files.length}</span>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 transition-all group"
              >
                <Plus size={24} className="group-hover:scale-125 transition-transform" />
                <span className="text-xs font-bold">{language === 'ar' ? 'أضف سؤال أو ملف' : 'Add Question/File'}</span>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
              </button>

              {files.map((f, i) => (
                <div key={i} className="flex flex-col p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {f.type.startsWith('image/') ? <ImageIcon className="text-red-500" size={18} /> : <FileText className="text-red-500" size={18} />}
                      <div className="truncate flex flex-col items-start">
                        <span className="text-sm font-bold truncate w-28">{f.name}</span>
                        <span className="text-[10px] opacity-50 uppercase">{f.type.split('/')[1]}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    className="mt-3 w-full py-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} />
                    {language === 'ar' ? 'شعبولي يا حاج' : 'Explain This!'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{language === 'ar' ? 'ملاحظات إضافية' : 'Notes'}</h2>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={language === 'ar' ? "مثلاً: ركز على القوانين، اشرح بالتفصيل..." : "e.g. Focus on formulas..."}
                className="w-full h-32 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-sm focus:ring-2 ring-red-500/20 outline-none resize-none"
              />
            </div>
            
            {status === ProcessingState.COMPLETE && (
              <button
                onClick={handleAnalyze}
                className="mt-6 w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"
              >
                 <Sparkles />
                 {language === 'ar' ? 'حلل تاني يا حاج' : 'Analyze Again'}
              </button>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-zinc-900 flex gap-3">
            <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')} className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-red-50 font-bold transition-colors flex items-center justify-center gap-2 text-sm">
              <Globe size={18} /> {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-red-50 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative w-full overflow-hidden">
          <header className="h-16 lg:h-20 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between px-4 lg:px-8 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ms-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Menu />
              </button>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest hidden sm:block">
                {status === ProcessingState.COMPLETE ? 'Ready to Study' : 'Waiting for Input'}
              </div>
            </div>
            
            {status === ProcessingState.COMPLETE && (
              <button 
                onClick={async () => {
                  setIsGeneratingSlides(true);
                  try { const s = await generateSlideDeck(analysis!, language); setSlides(s); }
                  catch(e) {} finally { setIsGeneratingSlides(false); }
                }}
                disabled={isGeneratingSlides}
                className="flex items-center gap-2 px-4 lg:px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 font-bold text-xs lg:text-sm disabled:opacity-50"
              >
                {isGeneratingSlides ? <Loader2 className="animate-spin" size={16} /> : <Presentation size={16} />}
                {language === 'ar' ? 'افتح السبورة' : 'Open Slides'}
              </button>
            )}
          </header>

          <div className="flex-1 overflow-hidden flex flex-col relative">
            {status !== ProcessingState.COMPLETE ? (
              <div className="flex-1 overflow-y-auto relative flex flex-col items-center justify-center p-6 lg:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                <div 
                  className="absolute inset-0 opacity-10 dark:opacity-20 grayscale pointer-events-none"
                  style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})`, backgroundSize: 'cover' }}
                />
                <div className="relative z-10 max-w-2xl w-full">
                  <div className="w-24 h-24 lg:w-32 lg:h-32 bg-red-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 lg:mb-10 shadow-2xl shadow-red-600/40 rotate-6 hover:rotate-0 transition-transform cursor-pointer">
                    <Sparkles size={48} className="lg:hidden" />
                    <Sparkles size={64} className="hidden lg:block" />
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-black mb-4 lg:mb-6 tracking-tight text-slate-900 dark:text-white">
                    {language === 'ar' ? 'يا أهلاً بـ حبيب الحاج!' : 'Welcome back!'}
                  </h2>
                  <p className="text-base lg:text-xl text-slate-500 dark:text-zinc-400 mb-8 lg:mb-10 font-medium leading-relaxed px-4">
                    {language === 'ar' ? 'ارفع أسئلتك أو صورها، والحاج هيحولها لنوتس جامعية تخليك تقفل المادة.' : 'Upload your questions or snap a photo, and I\'ll transform them into professional university-style notes.'}
                  </p>
                  
                  {/* New Content Input Field */}
                  <div className="mb-8 w-full group relative text-start">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-indigo-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-1">
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={language === 'ar' ? "اكتب سؤالك أو المحتوى هنا مباشرة بدلاً من رفع ملف..." : "Paste your question or content here directly..."}
                        className="w-full h-40 p-6 bg-transparent border-none focus:ring-0 text-base lg:text-lg resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        {files.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                            <FileIcon size={12} /> {files.length} {language === 'ar' ? 'ملف' : 'file(s)'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-bold animate-bounce">{errorMsg}</div>}

                  <button
                    onClick={handleAnalyze}
                    disabled={status === ProcessingState.ANALYZING}
                    className="w-full sm:w-auto group relative px-8 lg:px-12 py-4 lg:py-5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-[1.5rem] lg:rounded-[2rem] font-black text-lg lg:text-2xl shadow-2xl shadow-slate-900/20 dark:shadow-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-4">
                      {status === ProcessingState.ANALYZING ? <><Loader2 className="animate-spin" /> {language === 'ar' ? 'بيفكر...' : 'Thinking...'}</> : <><Sparkles /> {language === 'ar' ? 'حلل يا حاج' : 'Go, El7ag!'}</>}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden relative">
                
                {/* Mobile Tabs Switcher */}
                <div className="lg:hidden flex border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-20 shrink-0">
                  <button 
                    onClick={() => setActiveMobileTab('content')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeMobileTab === 'content' ? 'text-red-600' : 'text-slate-500'}`}
                  >
                    <StickyNote size={18} />
                    {language === 'ar' ? 'المذاكرة' : 'Notes'}
                    {activeMobileTab === 'content' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                  </button>
                  <button 
                    onClick={() => setActiveMobileTab('chat')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeMobileTab === 'chat' ? 'text-red-600' : 'text-slate-500'}`}
                  >
                    <MessageSquare size={18} />
                    {language === 'ar' ? 'الشات' : 'Chat'}
                    {activeMobileTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                  </button>
                </div>

                {/* Analysis Results View */}
                <div className={`
                  flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-12 bg-slate-50/50 dark:bg-zinc-950/50 custom-scrollbar
                  ${activeMobileTab === 'content' ? 'block' : 'hidden'} lg:block
                `}>
                  
                  {/* Textbook Style Summary */}
                  <div className="bg-white dark:bg-zinc-900 p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                    <div className="flex items-center gap-3 mb-6 lg:mb-8">
                       <BookOpen className="text-red-600" size={24} />
                       <h2 className="text-2xl lg:text-3xl font-black">{language === 'ar' ? 'خلاصة المحاضرة' : 'Lecture Summary'}</h2>
                    </div>
                    <MathText text={language === 'ar' ? analysis!.overallSummaryAr : analysis!.overallSummaryEn} className="text-base lg:text-xl leading-loose text-slate-700 dark:text-zinc-300" />
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:gap-12 pb-24 lg:pb-32">
                    {analysis!.questions.map((q, idx) => {
                      const content = language === 'ar' ? q.ar : q.en;
                      return (
                        <article key={q.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-xl group hover:border-red-500/30 transition-all">
                          <div className="p-6 lg:p-8 border-b border-slate-50 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                              <span className="shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-sm lg:text-base">{idx + 1}</span>
                              <h3 className="text-lg lg:text-2xl font-black truncate">{content.questionSummary}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`shrink-0 px-3 lg:px-4 py-1.5 rounded-full text-[10px] lg:text-xs font-black uppercase ${
                                  q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                                  q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>{q.difficulty}</span>
                                <button 
                                  onClick={() => handleExplainMore(q, idx)}
                                  className="p-2 rounded-full bg-white dark:bg-zinc-800 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm border border-slate-100 dark:border-zinc-700"
                                  title={language === 'ar' ? "اشرح لي أكتر" : "Explain more"}
                                >
                                  <HelpCircle size={18} />
                                </button>
                            </div>
                          </div>
                          
                          <div className="p-6 lg:p-10">
                            <div className="mb-8 lg:mb-10 p-6 lg:p-8 bg-slate-900 text-white rounded-2xl lg:rounded-3xl shadow-inner font-mono relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 text-[10px] opacity-20 font-black uppercase tracking-tighter">Original Source</div>
                              <MathText text={q.questionText} className="text-sm lg:text-lg overflow-x-auto" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                              <section>
                                <h4 className="text-sm font-black text-red-600 uppercase mb-4 lg:mb-6 flex items-center gap-2">
                                  <Sparkles size={16} /> {language === 'ar' ? 'مفتاح الحل' : 'Key Logic'}
                                </h4>
                                <MathText text={content.keyIndicator} className="text-lg lg:text-xl font-bold p-5 lg:p-6 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20" />
                              </section>
                              
                              <section>
                                <h4 className="text-sm font-black text-slate-400 uppercase mb-4 lg:mb-6 flex items-center gap-2">
                                  <LayoutDashboard size={16} /> {language === 'ar' ? 'خطوات الحل' : 'Analysis Steps'}
                                </h4>
                                <div className="space-y-4">
                                  {content.solutionSteps.map((step, i) => (
                                    <div key={i} className="flex gap-4 group/step">
                                      <span className="font-black text-slate-300 group-hover/step:text-red-500 transition-colors">{i+1}.</span>
                                      <MathText text={step} className="text-base lg:text-lg text-slate-600 dark:text-zinc-400" />
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>

                            <div className="mt-8 lg:mt-12 p-5 lg:p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-4 items-start">
                              <Lightbulb className="text-amber-500 shrink-0 mt-1" size={20} />
                              <p className="text-amber-800 dark:text-amber-200 italic font-medium text-sm lg:text-base">"{content.tips}"</p>
                            </div>

                            <PracticeSection practice={content.practiceQuestion} lang={language} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* Intelligent Chat Panel */}
                <div className={`
                  border-s border-slate-100 dark:border-zinc-900 bg-white dark:bg-zinc-900 flex-col shadow-2xl z-30
                  ${activeMobileTab === 'chat' ? 'flex w-full h-full' : 'hidden'} lg:flex lg:w-[450px] lg:h-full lg:static
                `}>
                  <div className="p-4 lg:p-6 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <Sparkles className="text-red-600" size={20} />
                      {language === 'ar' ? 'دردشة مع الحاج' : 'Chat with El7ag'}
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 bg-slate-50/30 dark:bg-zinc-950/20 custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] p-3 lg:p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                          ? 'bg-slate-900 text-white rounded-br-none' 
                          : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-700 rounded-bl-none'
                        }`}>
                          {msg.role === 'model' ? <MathText text={msg.content} /> : msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-3xl flex gap-1">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce delay-150"></div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={language === 'ar' ? "اسأل الحاج في أي حاجة..." : "Ask me anything..."}
                        className="w-full py-3 lg:py-4 px-4 lg:px-6 pr-12 lg:pr-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 border-none focus:ring-2 ring-red-500 transition-all font-medium text-sm"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className={`absolute top-1.5 lg:top-2 ${language === 'ar' ? 'left-1.5 lg:left-2' : 'right-1.5 lg:right-2'} w-9 h-9 lg:w-10 lg:h-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-600/30`}
                      >
                        <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Overlays */}
        {slides && <SlideDeckViewer slides={slides} onClose={() => setSlides(null)} lang={language} />}
      </div>
    </div>
  );
};

export default App;
