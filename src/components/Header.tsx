import React, { useState } from 'react';
import { 
  Download, 
  Terminal, 
  Flame, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  PlayCircle, 
  Bot, 
  Radio, 
  Menu, 
  X,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
  totalFilesCount: number;
  onOpenHowToRun: () => void;
  onOpenAiChat?: () => void;
  onOpenLiveVoice?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  isDownloading,
  totalFilesCount,
  onOpenHowToRun,
  onOpenAiChat,
  onOpenLiveVoice,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30 shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-300 bg-clip-text text-transparent truncate">
                  CUDA C++ Mastery
                </span>
                <span className="hidden sm:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  PyTorch & LLM
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
                Custom DL Engines in C++20 & CUDA
              </p>
            </div>
          </div>

          {/* Desktop Metrics Pill */}
          <div className="hidden xl:flex items-center gap-3 text-xs bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong className="text-white">36</strong> Levels</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span><strong className="text-white">2</strong> Engines</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span><strong className="text-white">1,000</strong> Qs</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span><strong className="text-white">{totalFilesCount}+</strong> Files</span>
            </div>
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Gemini Live Voice Trigger */}
            {onOpenLiveVoice && (
              <button
                onClick={onOpenLiveVoice}
                className="flex items-center gap-1.5 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium text-xs border border-emerald-500/30 transition-all hover:border-emerald-400/50 shadow-sm active:scale-95"
                title="Launch Gemini 3.5 Flash Live Voice"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Live Voice</span>
              </button>
            )}

            {/* Gemini AI Copilot Trigger */}
            {onOpenAiChat && (
              <button
                onClick={onOpenAiChat}
                className="flex items-center gap-1.5 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition-all hover:border-slate-600 shadow-sm active:scale-95"
                title="Open Gemini AI Copilot"
              >
                <Bot className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>
            )}

            {/* How to Run Site Guide (Desktop) */}
            <button
              onClick={onOpenHowToRun}
              className="hidden md:flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-emerald-200 font-medium text-xs border border-emerald-500/30 transition-all hover:border-emerald-400/50 shadow-sm active:scale-95"
              title="Learn how to run simulations and test kernels"
            >
              <PlayCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>How to Run</span>
            </button>

            {/* Export Full Codebase ZIP (Desktop) */}
            <button
              onClick={onDownloadZip}
              disabled={isDownloading}
              className="hidden sm:flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-md shadow-emerald-950/50 transition-all border border-emerald-400/20 active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 shrink-0 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Packaging...' : 'Export ZIP'}</span>
            </button>

            {/* Mobile Actions Menu Button (Mobile only) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-3 px-2 border-t border-slate-800 space-y-2 bg-slate-900 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onOpenHowToRun();
                setMobileMenuOpen(false);
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/80 text-emerald-300 text-xs font-semibold border border-emerald-500/20"
            >
              <PlayCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>How to Run (Interactive Site Guide)</span>
            </button>

            <button
              onClick={() => {
                onDownloadZip();
                setMobileMenuOpen(false);
              }}
              disabled={isDownloading}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-md shadow-emerald-900/30"
            >
              <Download className={`w-4 h-4 shrink-0 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Generating ZIP...' : 'Export Full Codebase (ZIP)'}</span>
            </button>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>36 Levels • 1,000 Questions</span>
              <span className="text-emerald-400 font-mono">{totalFilesCount}+ Files</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
