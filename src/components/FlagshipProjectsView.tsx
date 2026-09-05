import React, { useState } from 'react';
import { 
  Flame, 
  Terminal, 
  Copy, 
  Check, 
  FileCode, 
  CheckCircle2, 
  FolderTree, 
  Zap, 
  Cpu, 
  ArrowRight,
  Download
} from 'lucide-react';
import { FLAGSHIP_PROJECTS } from '../data/flagshipProjects';

export const FlagshipProjectsView: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<'minitorch_cuda' | 'flash_llm_engine'>('minitorch_cuda');
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const currentProject = FLAGSHIP_PROJECTS.find(p => p.id === selectedProjectId) || FLAGSHIP_PROJECTS[0];
  const currentModule = currentProject.coreModules[selectedModuleIndex] || currentProject.coreModules[0];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Flagship Selector Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLAGSHIP_PROJECTS.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          return (
            <button
              key={proj.id}
              onClick={() => {
                setSelectedProjectId(proj.id);
                setSelectedModuleIndex(0);
              }}
              className={`text-left p-5 rounded-2xl transition-all border relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/50 shadow-xl ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isSelected 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {proj.badge}
                </span>
                <span className="text-xs text-slate-400">
                  {proj.coreModules.length} Production Modules
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {proj.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {proj.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Project Overview & Modules */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-amber-400" />
            Complete Full-Stack GPU Systems Project
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {currentProject.title}
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            {currentProject.description}
          </p>
        </div>

        {/* Architecture Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentProject.architectureHighlights.map((highlight, idx) => (
            <div 
              key={idx} 
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-300 font-medium leading-snug">
                {highlight}
              </span>
            </div>
          ))}
        </div>

        {/* Directory Layout & Quickstart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* File Structure Tree */}
          <div className="lg:col-span-4 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2 text-slate-400 mb-3 pb-2 border-b border-slate-800 text-[11px] font-bold uppercase">
              <FolderTree className="w-4 h-4 text-purple-400" />
              Directory Layout
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-400">
              {currentProject.directoryStructure}
            </pre>
          </div>

          {/* Quickstart Build Commands */}
          <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px] font-bold uppercase">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Build & Execution Quickstart
              </div>
              <button
                onClick={() => handleCopyCode(currentProject.quickstartCommands.join('\n'))}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </button>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {currentProject.quickstartCommands.map((cmd, idx) => (
                <div key={idx} className="bg-slate-900/80 px-3 py-2 rounded-lg text-emerald-300 flex items-center gap-2 border border-slate-800/80">
                  <span className="text-slate-500 select-none">$</span>
                  <span className="truncate">{cmd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code Modules Viewer */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Inspect Core Production Source Code
            </h3>
            <span className="text-xs text-slate-400">
              {currentProject.coreModules.length} Key Sub-Systems
            </span>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {currentProject.coreModules.map((mod, idx) => {
              const isModSelected = idx === selectedModuleIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedModuleIndex(idx)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    isModSelected
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {mod.name}
                </button>
              );
            })}
          </div>

          {/* Module Detail Card */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {currentModule.filename}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentModule.purpose}
                </div>
              </div>
              <button
                onClick={() => handleCopyCode(currentModule.code)}
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

            {/* Code Body */}
            <div className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-[600px] scrollbar-thin">
              <pre>{currentModule.code}</pre>
            </div>

            {/* Highlights Footer */}
            <div className="bg-slate-900/60 p-4 border-t border-slate-800/80 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Key Architectural Mechanisms in this File
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {currentModule.highlights.map((hl, idx) => (
                  <div key={idx} className="bg-slate-950/80 p-2.5 rounded-lg text-xs text-slate-300 flex items-start gap-2 border border-slate-800/60">
                    <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
