import React, { useState, useMemo, useEffect } from 'react';
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
  Network, 
  Server, 
  Binary, 
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Search,
  BookOpen,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Terminal
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
  Network,
  Server,
  Terminal
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Intermediate: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Advanced: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  Expert: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export const CurriculumView: React.FC = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(CURRICULUM_DATA[0].id);
  const [selectedStageNum, setSelectedStageNum] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'phase1' | 'phase2' | 'phase3' | 'phase4'>('all');

  // Track completed stages across all levels
  const [completedStages, setCompletedStages] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('cuda_completed_stages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleStageCompletion = (stageId: string) => {
    setCompletedStages(prev => {
      const next = { ...prev, [stageId]: !prev[stageId] };
      try {
        localStorage.setItem('cuda_completed_stages', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    CURRICULUM_DATA.forEach(lvl => {
      if (lvl.category) set.add(lvl.category);
    });
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered levels based on category and search query
  const filteredLevels = useMemo(() => {
    return CURRICULUM_DATA.filter(lvl => {
      const matchesCategory = selectedCategory === 'All' || lvl.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lvl.title.toLowerCase().includes(q) ||
        lvl.subtitle.toLowerCase().includes(q) ||
        lvl.description.toLowerCase().includes(q) ||
        lvl.topics.some(t => t.title.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Current level and topic
  const currentLevel = useMemo(() => {
    return CURRICULUM_DATA.find(l => l.id === selectedLevelId) || CURRICULUM_DATA[0];
  }, [selectedLevelId]);

  // When changing level, ensure stage exists
  const currentTopic = useMemo(() => {
    const topic = currentLevel.topics.find(t => (t.stageNumber || 1) === selectedStageNum);
    return topic || currentLevel.topics[0];
  }, [currentLevel, selectedStageNum]);

  // Completed count for current level
  const levelCompletedCount = useMemo(() => {
    return currentLevel.topics.filter(t => completedStages[t.id]).length;
  }, [currentLevel, completedStages]);

  // Total completed across all levels
  const totalCompletedCount = useMemo(() => {
    return Object.values(completedStages).filter(Boolean).length;
  }, [completedStages]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJumpToStage = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpInput.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setSelectedStageNum(num);
      setJumpInput('');
    }
  };

  const currentStageIndex = (currentTopic.stageNumber || 1) - 1;
  const canGoPrev = currentStageIndex > 0;
  const canGoNext = currentStageIndex < currentLevel.topics.length - 1;

  const goToPrevStage = () => {
    if (canGoPrev) {
      setSelectedStageNum(currentStageIndex); // stageNumber is 1-indexed
    }
  };

  const goToNextStage = () => {
    if (canGoNext) {
      setSelectedStageNum(currentStageIndex + 2);
    }
  };

  // Filter 100 stages by Phase
  const visibleStages = useMemo(() => {
    return currentLevel.topics.filter(t => {
      const s = t.stageNumber || 1;
      if (phaseFilter === 'phase1') return s >= 1 && s <= 25;
      if (phaseFilter === 'phase2') return s >= 26 && s <= 50;
      if (phaseFilter === 'phase3') return s >= 51 && s <= 75;
      if (phaseFilter === 'phase4') return s >= 76 && s <= 100;
      return true;
    });
  }, [currentLevel, phaseFilter]);

  const IconComponent = LEVEL_ICONS[currentLevel.iconName] || Cpu;

  return (
    <div className="space-y-6">
      {/* Master Curriculum Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              36 Complete Levels • 100 Stages in Each Level
            </span>
            <span className="text-xs text-slate-400 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
              3,600 Total Progressive Stages
            </span>
            <span className="text-xs text-emerald-300 font-mono px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30">
              {totalCompletedCount} / 3,600 Stages Mastered
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CUDA C++ Deep Learning Infrastructure Mastery Curriculum
          </h1>
          <p className="mt-2 text-slate-300 text-sm max-w-4xl leading-relaxed">
            A comprehensive systems progression spanning <strong>36 specialized levels</strong>, each containing <strong>100 progressive micro-stages</strong> (Stages 1–100). Every single stage builds with surgical precision: starting from foundational silicon models, memory alignment, and address calculations, advancing through kernel design, warp-level shuffles, shared-memory bank padding, FlashAttention-1/2, NCCL Ring-AllReduce, and production PyTorch C++ Autograd dispatchers.
          </p>

          {/* Quick Progress Strip */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-400">Current Position:</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30 font-mono">
                Level {currentLevel.levelNumber} • Stage {currentTopic.stageNumber || 1} of 100
              </span>
              <span className="text-slate-400 truncate max-w-xs">({currentLevel.title})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px]">Level {currentLevel.levelNumber} Progress: {levelCompletedCount}/100</span>
              <div className="w-36 sm:w-48 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(levelCompletedCount / 100) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" /> Category:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat} {cat === 'All' ? `(36)` : ''}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 36 Levels Explorer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across 36 levels & topics..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>All 36 Levels</span>
              <span className="text-emerald-400 font-semibold">{filteredLevels.length} Available</span>
            </div>

            {/* Scrollable list of 36 Levels */}
            <div className="space-y-1.5 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredLevels.map((lvl) => {
                const LevelIcon = LEVEL_ICONS[lvl.iconName] || Cpu;
                const isSelected = lvl.id === selectedLevelId;

                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setSelectedLevelId(lvl.id);
                      setSelectedStageNum(1);
                    }}
                    className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all border ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/20'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <LevelIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                          Level {lvl.levelNumber}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          100 Stages
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold truncate text-white mt-0.5">
                        {lvl.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {lvl.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: 100 Stages Navigator & Deep-Dive */}
        <div className="lg:col-span-8 space-y-6">
          {/* Level Header & 100-Stage Matrix Control */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-1">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Level {currentLevel.levelNumber} of 36
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {currentLevel.badge}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                    {currentLevel.title}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    {currentLevel.description}
                  </p>
                </div>
              </div>

              {/* Jump to Stage Form */}
              <form onSubmit={handleJumpToStage} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder="Jump (1-100)"
                    className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                >
                  Go
                </button>
              </form>
            </div>

            {/* 4 Mastery Phase Tabs */}
            <div className="border-t border-slate-800/80 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100-Stage Interactive Matrix:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setPhaseFilter('all')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      phaseFilter === 'all' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All 100
                  </button>
                  <button
                    onClick={() => setPhaseFilter('phase1')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      phaseFilter === 'phase1' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P1: 1–25
                  </button>
                  <button
                    onClick={() => setPhaseFilter('phase2')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      phaseFilter === 'phase2' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P2: 26–50
                  </button>
                  <button
                    onClick={() => setPhaseFilter('phase3')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      phaseFilter === 'phase3' 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P3: 51–75
                  </button>
                  <button
                    onClick={() => setPhaseFilter('phase4')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      phaseFilter === 'phase4' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P4: 76–100
                  </button>
                </div>
              </div>

              {/* 100-Stage Interactive Button Grid */}
              <div className="grid grid-cols-10 sm:grid-cols-20 gap-1 max-h-36 overflow-y-auto p-2 bg-slate-950/60 rounded-lg border border-slate-800 scrollbar-thin">
                {visibleStages.map((stg) => {
                  const sNum = stg.stageNumber || 1;
                  const isCurrent = sNum === selectedStageNum;
                  const isDone = completedStages[stg.id];

                  let phaseBadgeColor = 'text-slate-400 hover:bg-slate-800';
                  if (sNum <= 25) phaseBadgeColor = 'border-emerald-500/20';
                  else if (sNum <= 50) phaseBadgeColor = 'border-blue-500/20';
                  else if (sNum <= 75) phaseBadgeColor = 'border-purple-500/20';
                  else phaseBadgeColor = 'border-rose-500/20';

                  return (
                    <button
                      key={stg.id}
                      onClick={() => setSelectedStageNum(sNum)}
                      title={`Stage ${sNum}: ${stg.title}`}
                      className={`h-7 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-all border relative ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-300 shadow-md ring-2 ring-emerald-500/40'
                          : isDone
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                          : `bg-slate-900/90 text-slate-300 ${phaseBadgeColor} hover:bg-slate-800`
                      }`}
                    >
                      {sNum}
                      {isDone && !isCurrent && (
                        <span className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-0.5 right-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Stage Deep-Dive Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            {/* Stage Header */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                    Stage {currentTopic.stageNumber || 1} of 100
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-medium">
                    {currentTopic.phase || 'Foundations & Architecture'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStageCompletion(currentTopic.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      completedStages[currentTopic.id]
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {completedStages[currentTopic.id] ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </button>

                  {currentTopic.difficulty && (
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                      DIFFICULTY_COLORS[currentTopic.difficulty]?.bg || 'bg-slate-800'
                    } ${DIFFICULTY_COLORS[currentTopic.difficulty]?.text || 'text-slate-300'} ${
                      DIFFICULTY_COLORS[currentTopic.difficulty]?.border || 'border-slate-700'
                    }`}>
                      {currentTopic.difficulty}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentTopic.title}
              </h3>
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
                Stage {currentTopic.stageNumber} Pedagogical & Engineering Goals
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
                C++ Systems Architecture & Mathematical Foundations
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
                  Compilable C++20 / CUDA Stage Implementation
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
                  <span>level_{currentLevel.levelNumber}_stage_{currentTopic.stageNumber}.cu</span>
                  <span className="text-emerald-400">NVCC CUDA 12.x / C++20 Standard</span>
                </div>
                <div className="p-4 overflow-x-auto text-slate-200 leading-relaxed max-h-96">
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
                Critical Hardware Pitfalls to Avoid in Stage {currentTopic.stageNumber}
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
                Nsight Profiling & Performance Metrics:
              </strong>
              {currentTopic.benchmarkingNotes}
            </div>

            {/* Navigation Buttons: Previous & Next Stage */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={goToPrevStage}
                disabled={!canGoPrev}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  canGoPrev
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-emerald-500/40'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400">Previous Stage</div>
                  <div className="font-bold text-slate-200">
                    {canGoPrev ? `Stage ${currentStageIndex}` : 'At Stage 1'}
                  </div>
                </div>
              </button>

              <div className="text-center">
                <span className="text-xs font-mono text-slate-400">
                  Stage <strong className="text-emerald-400">{currentTopic.stageNumber}</strong> of 100
                </span>
              </div>

              <button
                onClick={goToNextStage}
                disabled={!canGoNext}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-md transition-all border ${
                  canGoNext
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/20 shadow-emerald-950/50'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                <div className="text-right">
                  <div className="text-[10px] text-emerald-200">Next Stage</div>
                  <div className="font-bold text-white">
                    {canGoNext ? `Stage ${currentStageIndex + 2}` : 'All 100 Completed!'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
