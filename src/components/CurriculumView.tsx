import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Cpu, 
  Layers, 
  Zap, 
  Flame, 
  Box, 
  GitFork, 
  Plug, 
  Network, 
  Server, 
  Binary, 
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { CurriculumLevel, CurriculumTopic } from '../types';

const LEVEL_ICONS: Record<string, React.ElementType> = {
  Cpu,
  Zap,
  Layers,
  Binary,
  Activity,
  Flame,
  Box,
  GitFork,
  Plug,
  Network,
  Server
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Intermediate: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Advanced: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  Expert: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export const CurriculumView: React.FC = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(CURRICULUM_DATA[0].id);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(CURRICULUM_DATA[0].topics[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Flatten all topics for easy Next/Prev navigation across the 100 examples
  const allExamples = useMemo(() => {
    const list: { level: CurriculumLevel; topic: CurriculumTopic; index: number }[] = [];
    let idx = 0;
    CURRICULUM_DATA.forEach((lvl) => {
      lvl.topics.forEach((top) => {
        list.push({ level: lvl, topic: top, index: idx++ });
      });
    });
    return list;
  }, []);

  const currentLevel = CURRICULUM_DATA.find(l => l.id === selectedLevelId) || CURRICULUM_DATA[0];
  const currentTopic = currentLevel.topics.find(t => t.id === selectedTopicId) || currentLevel.topics[0];

  const currentExampleIndex = allExamples.findIndex(e => e.topic.id === currentTopic.id);
  const prevExample = currentExampleIndex > 0 ? allExamples[currentExampleIndex - 1] : null;
  const nextExample = currentExampleIndex < allExamples.length - 1 ? allExamples[currentExampleIndex + 1] : null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navigateToExample = (targetLevelId: string, targetTopicId: string) => {
    setSelectedLevelId(targetLevelId);
    setSelectedTopicId(targetTopicId);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const totalExamplesCount = allExamples.length;

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              100 Progressive Examples • 10 Mastery Levels
            </span>
            <span className="text-xs text-slate-400 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
              Small-Step Progression from Ex 1 to Ex 100
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CUDA C++ Deep Learning Infrastructure: 100 Progressive Examples
          </h1>
          <p className="mt-2 text-slate-300 text-sm max-w-4xl leading-relaxed">
            Every example builds gradually upon the previous one: starting from fundamental C++20 pointers, memory alignment, and arena allocators, advancing through thread indexing, warp shuffle primitives, 128-bit float4 loads, bank conflict elimination, tiled GEMM, Online Softmax, FlashAttention-1/2, CUDA Graphs, NVLink NCCL AllReduce, and production PyTorch C++ autograd extensions.
          </p>

          {/* Quick Progress Strip */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-400">Current Position:</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                Example {currentTopic.exampleNumber || (currentExampleIndex + 1)} of {totalExamplesCount}
              </span>
              <span className="text-slate-400">({currentLevel.title})</span>
            </div>
            <div className="w-full sm:w-64 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentExampleIndex + 1) / totalExamplesCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Level & Topic Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 100 examples (e.g. GEMM, FlashAttention)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>Levels & Examples</span>
              <span className="text-emerald-400 font-semibold">{totalExamplesCount} Examples Total</span>
            </div>

            <div className="space-y-1.5 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin">
              {CURRICULUM_DATA.map((lvl) => {
                const IconComponent = LEVEL_ICONS[lvl.iconName] || Cpu;
                const isSelected = lvl.id === selectedLevelId;
                
                // If searching, filter topics
                const filteredTopics = searchQuery.trim() 
                  ? lvl.topics.filter(t => 
                      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.concepts.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                  : lvl.topics;

                if (searchQuery.trim() && filteredTopics.length === 0) {
                  return null;
                }

                const firstEx = lvl.topics[0]?.exampleNumber || 1;
                const lastEx = lvl.topics[lvl.topics.length - 1]?.exampleNumber || lvl.topics.length;

                return (
                  <div key={lvl.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedLevelId(lvl.id);
                        if (filteredTopics.length > 0) {
                          setSelectedTopicId(filteredTopics[0].id);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all border ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-white shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-emerald-400">
                            LEVEL {lvl.levelNumber}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            Ex {firstEx}-{lastEx} ({lvl.topics.length})
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold truncate text-white mt-0.5">
                          {lvl.title}
                        </h4>
                      </div>
                    </button>

                    {/* Show topics if selected or searching */}
                    {(isSelected || searchQuery.trim().length > 0) && (
                      <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-emerald-500/30 ml-4 my-1">
                        {filteredTopics.map((t) => {
                          const isTopicSelected = t.id === selectedTopicId;
                          const diff = DIFFICULTY_COLORS[t.difficulty || 'Beginner'] || DIFFICULTY_COLORS.Beginner;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedLevelId(lvl.id);
                                setSelectedTopicId(t.id);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-all flex items-center justify-between gap-2 border ${
                                isTopicSelected
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-medium shadow-sm'
                                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {t.exampleNumber && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-emerald-400 border border-slate-700 shrink-0 font-bold">
                                    #{t.exampleNumber}
                                  </span>
                                )}
                                <span className="truncate">{t.title.replace(/^Ex\s+\d+:\s*/, '')}</span>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${diff.bg} ${diff.text} ${diff.border}`}>
                                {t.difficulty || 'Core'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Topic Deep-Dive */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            {/* Topic Header with Example Pill */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                    Example #{currentTopic.exampleNumber || (currentExampleIndex + 1)}
                  </span>
                  <span>•</span>
                  <span>LEVEL {currentLevel.levelNumber}: {currentLevel.title}</span>
                </div>
                {currentTopic.difficulty && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    DIFFICULTY_COLORS[currentTopic.difficulty]?.bg || 'bg-slate-800'
                  } ${DIFFICULTY_COLORS[currentTopic.difficulty]?.text || 'text-slate-300'} ${
                    DIFFICULTY_COLORS[currentTopic.difficulty]?.border || 'border-slate-700'
                  }`}>
                    {currentTopic.difficulty} Level
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentTopic.title}
              </h2>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                {currentTopic.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Est. Study: {currentTopic.readTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Prerequisites: {currentTopic.prerequisites.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Core Concepts */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Key Theoretical Concepts
              </h4>
              <ul className="space-y-2">
                {currentTopic.concepts.map((concept, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deep Theory & Software Engineering */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-purple-400" />
                C++ Systems & Framework Architecture Theory
              </h4>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 whitespace-pre-line font-normal">
                {currentTopic.cPlusPlusTheory}
              </div>
            </div>

            {/* Hardware Mechanics */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                Under the Hood: GPU Hardware Execution & Silicon Mechanics
              </h4>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-amber-950/10 p-4 rounded-xl border border-amber-500/20 whitespace-pre-line">
                {currentTopic.hardwareMechanics}
              </div>
            </div>

            {/* Real C++ / CUDA Code Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Production C++20 / CUDA Implementation
                </h4>
                <button
                  onClick={() => handleCopyCode(currentTopic.kernelCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden font-mono text-xs shadow-inner">
                <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                  <span>ex_{(currentTopic.exampleNumber || currentExampleIndex + 1)}_kernel.cu</span>
                  <span className="text-emerald-400">NVCC CUDA 12.x / C++20 Standard</span>
                </div>
                <div className="p-4 overflow-x-auto text-slate-200 leading-relaxed">
                  <pre>{currentTopic.kernelCode}</pre>
                </div>
              </div>
            </div>

            {/* Kernel Line Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Engineering Highlights & Code Walkthrough
              </h4>
              <div className="space-y-1.5">
                {currentTopic.kernelExplanation.map((exp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Pitfalls & Traps */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Critical Hardware Pitfalls to Avoid
              </h4>
              <ul className="space-y-1.5">
                {currentTopic.commonPitfalls.map((pitfall, idx) => (
                  <li key={idx} className="text-xs text-rose-200/90 flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benchmarking & Performance Notes */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 text-xs text-cyan-200">
              <strong className="text-cyan-300 font-bold block mb-1">
                Profiling & Performance Metrics:
              </strong>
              {currentTopic.benchmarkingNotes}
            </div>

            {/* Navigation Buttons: Previous & Next Example */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              {prevExample ? (
                <button
                  onClick={() => navigateToExample(prevExample.level.id, prevExample.topic.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:border-emerald-500/40"
                >
                  <ChevronLeft className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400">Previous (Ex {prevExample.topic.exampleNumber || prevExample.index + 1})</div>
                    <div className="font-bold text-slate-200 truncate max-w-[200px]">
                      {prevExample.topic.title.replace(/^Ex\s+\d+:\s*/, '')}
                    </div>
                  </div>
                </button>
              ) : (
                <div />
              )}

              {nextExample ? (
                <button
                  onClick={() => navigateToExample(nextExample.level.id, nextExample.topic.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition-all border border-emerald-400/20"
                >
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-200">Next (Ex {nextExample.topic.exampleNumber || nextExample.index + 1})</div>
                    <div className="font-bold text-white truncate max-w-[200px]">
                      {nextExample.topic.title.replace(/^Ex\s+\d+:\s*/, '')}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              ) : (
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All 100 Examples Completed!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
