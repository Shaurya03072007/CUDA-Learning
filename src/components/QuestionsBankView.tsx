import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Copy, 
  Check, 
  Cpu, 
  BookOpen,
  Shuffle
} from 'lucide-react';
import { ONE_THOUSAND_QUESTIONS } from '../data/questionsData';
import { QuestionItem } from '../types';

export const QuestionsBankView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(1);
  const [isFlashcardMode, setIsFlashcardMode] = useState<boolean>(false);
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set = new Set(ONE_THOUSAND_QUESTIONS.map(q => q.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredQuestions = useMemo(() => {
    return ONE_THOUSAND_QUESTIONS.filter(q => {
      const matchCat = selectedCategory === 'All' || q.category === selectedCategory;
      const matchDiff = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;
      const matchSearch = searchTerm === '' || 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.shortAnswer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchDiff && matchSearch;
    });
  }, [selectedCategory, selectedDifficulty, searchTerm]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRandomQuestion = () => {
    if (filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
      if (isFlashcardMode) {
        setFlashcardIndex(randomIndex);
        setShowFlashcardAnswer(false);
      } else {
        setExpandedQuestionId(filteredQuestions[randomIndex].id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Bank Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
              <HelpCircle className="w-4 h-4" />
              1,000 Questions Knowledge Repository
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              1,000 Deep Learning CUDA C++ & Systems Questions
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Comprehensive interview prep, systems engineering puzzles, GPU hardware microbenchmarks, and autograd mechanics.
            </p>
          </div>

          {/* Mode Switchers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFlashcardMode(!isFlashcardMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                isFlashcardMode
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{isFlashcardMode ? 'Flashcard Mode: Active' : 'Flashcard Mode'}</span>
            </button>
            <button
              onClick={handleRandomQuestion}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
            >
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <span>Random Pick</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-6 pt-4 border-t border-slate-800">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 1,000 questions by keyword, kernel, or hardware concept..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories (12 Systems)' : c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
              <option value="Staff/Principal">Staff/Principal</option>
            </select>
          </div>
        </div>
      </div>

      {/* FLASHCARD MODE */}
      {isFlashcardMode ? (
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
          {filteredQuestions.length > 0 ? (
            (() => {
              const q = filteredQuestions[flashcardIndex % filteredQuestions.length];
              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                    <span className="font-bold text-cyan-400">
                      Card {flashcardIndex + 1} of {filteredQuestions.length}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {q.difficulty} • {q.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                    {q.question}
                  </h3>

                  {showFlashcardAnswer ? (
                    <div className="text-left bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 animate-in fade-in">
                      <div>
                        <strong className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          Core Answer:
                        </strong>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {q.shortAnswer}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80">
                        <strong className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Detailed Engineering Explanation:
                        </strong>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {q.detailedExplanation}
                        </p>
                      </div>

                      {q.hardwareInsight && (
                        <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                          <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>Hardware Insight: </strong>{q.hardwareInsight}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFlashcardAnswer(true)}
                      className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
                    >
                      Reveal Answer
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setFlashcardIndex(prev => Math.max(0, prev - 1));
                        setShowFlashcardAnswer(false);
                      }}
                      disabled={flashcardIndex === 0}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40"
                    >
                      Previous Card
                    </button>
                    <button
                      onClick={() => {
                        setFlashcardIndex(prev => (prev + 1) % filteredQuestions.length);
                        setShowFlashcardAnswer(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Next Card
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-slate-400 text-xs py-8">No matching questions found for current filter.</div>
          )}
        </div>
      ) : (
        /* LIST MODE */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing <strong>{filteredQuestions.length}</strong> of <strong>{ONE_THOUSAND_QUESTIONS.length}</strong> Questions</span>
          </div>

          <div className="space-y-2.5">
            {filteredQuestions.slice(0, 100).map((q) => {
              const isExpanded = expandedQuestionId === q.id;
              return (
                <div
                  key={q.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all"
                >
                  {/* Header Row */}
                  <button
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-slate-800/40 transition-all"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          #{q.id}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {q.category}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          q.difficulty === 'Expert' || q.difficulty === 'Staff/Principal'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white leading-snug">
                        {q.question}
                      </h4>
                    </div>

                    <div className="p-1 rounded bg-slate-800 text-slate-400 mt-1 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-4 animate-in fade-in">
                      {/* Short Answer */}
                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-200">
                        <strong className="text-emerald-300 font-bold block mb-1">
                          Direct Summary:
                        </strong>
                        {q.shortAnswer}
                      </div>

                      {/* Detailed Explanation */}
                      <div className="space-y-1.5">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          In-Depth Systems Explanation
                        </h5>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                          {q.detailedExplanation}
                        </p>
                      </div>

                      {/* Code Snippet if present */}
                      {q.codeSnippet && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                              CUDA Implementation Snippet
                            </span>
                            <button
                              onClick={() => handleCopy(q.id, q.codeSnippet!)}
                              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                            >
                              {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === q.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                            <pre>{q.codeSnippet}</pre>
                          </div>
                        </div>
                      )}

                      {/* Hardware Insight */}
                      {q.hardwareInsight && (
                        <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                          <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>Hardware Silicon Insight: </strong>{q.hardwareInsight}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
