import React, { useState } from 'react';
import { 
  BookMarked, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileCode, 
  Clock, 
  Gauge, 
  Zap, 
  Code2, 
  Terminal, 
  ArrowRight 
} from 'lucide-react';
import { PROJECT_GUIDES } from '../data/projectsData';
import { ProjectGuide } from '../types';

export const ProjectGuidesView: React.FC = () => {
  const [selectedGuideId, setSelectedGuideId] = useState<string>(PROJECT_GUIDES[0].id);
  const [activeSubTab, setActiveSubTab] = useState<'milestones' | 'complete_code' | 'test_suite' | 'cmake'>('milestones');
  const [copied, setCopied] = useState(false);

  const currentGuide = PROJECT_GUIDES.find(g => g.id === selectedGuideId) || PROJECT_GUIDES[0];

  const miniGuides = PROJECT_GUIDES.filter(g => g.type === 'mini');
  const majorGuides = PROJECT_GUIDES.filter(g => g.type === 'major');

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Guides Master Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
          <BookMarked className="w-4 h-4" />
          Practical Engineering Project Guides
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          5 Mini Projects & 2 Major Production Framework Guides
        </h1>
        <p className="text-slate-300 text-sm mt-2 leading-relaxed max-w-3xl">
          Complete, hands-on step-by-step blueprints to take you from kernel writing to building PyTorch and high-throughput LLM serving systems. Every guide includes full architecture specs, progressive milestone checkpoints, complete source code, test suites, and expected benchmarks.
        </p>
      </div>

      {/* Guides Grid / Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Nav List */}
        <div className="lg:col-span-4 space-y-4">
          {/* Mini Projects */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>5 Mini Project Guides</span>
              <span className="text-blue-400 font-semibold">Specialized Kernels</span>
            </h3>
            <div className="space-y-1.5">
              {miniGuides.map((guide) => {
                const isSelected = guide.id === selectedGuideId;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelectedGuideId(guide.id)}
                    className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/40 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-[10px] text-blue-400">MINI PROJECT</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {guide.difficulty}
                      </span>
                    </div>
                    <div className="font-semibold text-white truncate">{guide.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{guide.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Major Projects */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2 Major Framework Guides</span>
              <span className="text-amber-400 font-semibold">Full Systems</span>
            </h3>
            <div className="space-y-1.5">
              {majorGuides.map((guide) => {
                const isSelected = guide.id === selectedGuideId;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelectedGuideId(guide.id)}
                    className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/40 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-[10px] text-amber-400">MAJOR PROJECT</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {guide.difficulty}
                      </span>
                    </div>
                    <div className="font-semibold text-white truncate">{guide.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{guide.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Guide Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                <span>{currentGuide.type.toUpperCase()} PROJECT GUIDE</span>
                <span>•</span>
                <span>{currentGuide.difficulty}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentGuide.title}
              </h2>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                {currentGuide.tagline}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Estimated Time: {currentGuide.estimatedHours}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Difficulty: {currentGuide.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Overview & Learning Objectives */}
            <div className="space-y-4">
              <div className="text-xs sm:text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 leading-relaxed">
                <strong className="text-white block mb-1">Project Mission:</strong>
                {currentGuide.overview}
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Core Skills & Takeaways
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentGuide.learningObjectives.map((obj, idx) => (
                    <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Architecture Diagram */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Dataflow & Execution Flow Architecture
              </h4>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                <pre>{currentGuide.architectureDiagram}</pre>
              </div>
            </div>

            {/* Sub-Tabs (Milestones vs Full Code vs Test Suite vs CMake) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveSubTab('milestones')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSubTab === 'milestones'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Step-by-Step Milestones ({currentGuide.milestones.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('complete_code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSubTab === 'complete_code'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Complete Runnable Code
                </button>
                <button
                  onClick={() => setActiveSubTab('test_suite')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSubTab === 'test_suite'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verification Test Suite
                </button>
                <button
                  onClick={() => setActiveSubTab('cmake')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSubTab === 'cmake'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CMake / Build Config
                </button>
              </div>

              {/* Sub-Tab 1: Milestones */}
              {activeSubTab === 'milestones' && (
                <div className="space-y-4">
                  {currentGuide.milestones.map((m) => (
                    <div 
                      key={m.stepNumber} 
                      className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center">
                            {m.stepNumber}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {m.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                          Checkpoint {m.stepNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {m.description}
                      </p>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                        <pre>{m.codeTemplate}</pre>
                      </div>
                      <div className="text-[11px] text-cyan-300 bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/20">
                        <strong>Verification Criteria: </strong> {m.verificationStep}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Tab 2: Complete Code */}
              {activeSubTab === 'complete_code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Full compilable implementation</span>
                    <button
                      onClick={() => handleCopyCode(currentGuide.completeCode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Full Code</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] scrollbar-thin">
                    <pre>{currentGuide.completeCode}</pre>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Test Suite */}
              {activeSubTab === 'test_suite' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Automated unit test suite</span>
                    <button
                      onClick={() => handleCopyCode(currentGuide.testSuiteCode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Test Suite</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] scrollbar-thin">
                    <pre>{currentGuide.testSuiteCode}</pre>
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: CMake / Build */}
              {activeSubTab === 'cmake' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">CMakeLists.txt & Build config</span>
                    <button
                      onClick={() => handleCopyCode(currentGuide.cmakeFile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy CMakeLists.txt</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] scrollbar-thin">
                    <pre>{currentGuide.cmakeFile}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Expected Benchmark */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 text-xs text-emerald-200">
              <strong className="text-emerald-300 font-bold block mb-1">
                Target Benchmark Outcome:
              </strong>
              {currentGuide.expectedBenchmark}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
