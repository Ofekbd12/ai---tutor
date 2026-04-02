import React, { useState } from 'react';
import { Loader2, ArrowRight, RefreshCcw, Trophy, Target, AlertCircle, Home, AlertTriangle } from "lucide-react";

const App = () => {
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionId, setSessionId] = useState(`sess_${Math.random().toString(36).substr(2, 9)}`);
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const backToMain = () => {
    setQuestion(null);
    setSummary(null);
    setGrade('');
    setTopic('');
    setCurrentStep(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setExplanation('');
    setErrorMessage('');
    setSessionId(`sess_${Math.random().toString(36).substr(2, 9)}`);
  };

  const cleanText = (t) => t ? String(t).replace(/[א-ת]/gi, "").trim() : "";

  const fetchQuestion = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`http://127.0.0.1:8000/question?grade=${grade}&topic=${topic}&session_id=${sessionId}`);
      
      // בדיקה אם השרת החזיר שגיאה (כמו נושא לא מתמטי)
      if (!res.ok) {
        const errorData = await res.json();
        setErrorMessage(errorData.detail || "אירעה שגיאה בבקשה");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (data.end) {
        const sRes = await fetch(`http://127.0.0.1:8000/summary?session_id=${sessionId}`);
        setSummary(await sRes.json());
      } else {
        setQuestion(data);
        setCurrentStep(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setExplanation('');
      }
    } catch (e) {
      setErrorMessage("לא ניתן להתחבר לשרת. וודא ש-main.py רץ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerClick = async (option) => {
    if (isLoading || isCorrect || explanation) return;
    setSelectedAnswer(option);
    const isRight = String(option).trim() === String(question.correct_answer).trim();
    
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/answer?user_answer=${option}&session_id=${sessionId}`);
      const data = await res.json();
      if (isRight) {
        setIsCorrect(true);
      } else {
        setIsCorrect(false);
        setExplanation(data.explanation);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  // מסך סיכום
  if (summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6" dir="rtl">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg w-full text-center border-4 border-blue-50">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-blue-600 mb-2">איזה אלוף!</h1>
          <p className="text-xl text-slate-500 mb-8 font-bold">סיימת 10 שאלות בגבורה</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 p-6 rounded-3xl border-2 border-green-100">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-green-600">{summary.correct_count}</div>
              <div className="text-sm font-bold text-green-700">הצלחות</div>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-red-600">{summary.wrong_questions.length}</div>
              <div className="text-sm font-bold text-red-700">טעויות</div>
            </div>
          </div>
          <button onClick={backToMain} className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-black flex items-center justify-center gap-3">
            תרגול חדש <RefreshCcw />
          </button>
        </div>
      </div>
    );
  }

  // מסך כניסה
  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans" dir="rtl">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center max-w-md w-full border-b-[12px] border-blue-100">
          <h1 className="text-4xl font-black text-blue-600 mb-2">תרגול, תרגול, תרגול</h1>
          <div className="text-5xl font-black text-blue-400 mb-2">=</div>
          <h1 className="text-4xl font-black text-blue-600 mb-10">הצלחה 🚀</h1>
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
              {errorMessage}
            </div>
          )}

          <input placeholder="איזו כיתה?" value={grade} className="w-full p-5 mb-4 border-2 rounded-2xl text-center text-xl font-bold focus:border-blue-400 outline-none" onChange={e => setGrade(e.target.value)} />
          <input placeholder="מה הנושא?" value={topic} className="w-full p-5 mb-10 border-2 rounded-2xl text-center text-xl font-bold focus:border-blue-400 outline-none" onChange={e => setTopic(e.target.value)} />
          <button onClick={fetchQuestion} disabled={!grade || !topic || isLoading} className="w-full bg-blue-600 disabled:bg-slate-300 text-white py-6 rounded-2xl text-2xl font-black hover:scale-105 transition-transform shadow-lg">
            {isLoading ? "בודק..." : "יוצאים לדרך!"}
          </button>
        </div>
      </div>
    );
  }

  // מסך שאלה
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="w-full max-w-2xl flex justify-start mb-4">
        <button onClick={backToMain} className="flex items-center gap-2 px-6 py-2 bg-white text-blue-600 font-bold rounded-full shadow-md border-2 border-blue-50 text-sm">
          <Home className="w-4 h-4" /> חזרה למסך הראשי
        </button>
      </div>

      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-end mb-2 px-2">
          <span className="text-blue-600 font-black text-lg">שאלה {currentStep} מתוך 10</span>
          <span className="text-slate-400 font-bold">{currentStep * 10}%</span>
        </div>
        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${currentStep * 10}%` }}></div>
        </div>
      </div>

      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white">
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 py-16 text-center text-white font-black text-6xl shadow-inner" dir="ltr">
          {cleanText(question.question)}
        </div>
        <div className="p-10">
          <div className="grid grid-cols-2 gap-4" dir="ltr">
            {question.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswerClick(opt)} disabled={isCorrect !== null || explanation !== ''}
                className={`p-8 text-3xl font-black rounded-[2rem] border-4 transition-all
                  ${selectedAnswer === opt && !isCorrect ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-slate-100'}
                  ${(isCorrect || explanation) && String(opt) === String(question.correct_answer) ? 'bg-green-50 border-green-500 text-green-700' : ''}`}>
                {cleanText(opt)}
              </button>
            ))}
          </div>
          {explanation && (
            <div className="mt-8 p-8 bg-amber-50 border-4 border-amber-100 rounded-[2.5rem]" dir="rtl">
              <h3 className="text-2xl font-black text-amber-900 mb-4 underline">👨‍🏫 מתכון לפתרון:</h3>
              <div className="text-xl leading-relaxed whitespace-pre-line text-slate-700 font-bold">{explanation}</div>
            </div>
          )}
          {(isCorrect || explanation) && (
            <button onClick={fetchQuestion} className="w-full mt-8 bg-blue-600 text-white py-6 rounded-[2rem] text-2xl font-black flex items-center justify-center gap-3">
              {currentStep === 10 ? "לסיכום התרגול" : "לשאלה הבאה"} <ArrowRight className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
          <Loader2 className="animate-spin w-16 h-16 text-blue-600" />
        </div>
      )}
    </div>
  );
};

export default App;