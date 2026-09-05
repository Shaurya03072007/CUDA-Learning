import React from 'react';
import { Download, Terminal, Flame, BookOpen, Layers, CheckCircle2, PlayCircle } from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
  totalFilesCount: number;
  onOpenHowToRun: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  isDownloading,
  totalFilesCount,
  onOpenHowToRun
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
              <Terminal className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-300 bg-clip-text text-transparent">
                  CUDA C++ Infra Mastery
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PyTorch & LLM Systems
                </span>
              </div>
              <p className="text-xs text-slate-400">
                From Zero to Custom Deep Learning Engines in C++20 & CUDA
              </p>
            </div>
          </div>

          {/* Metrics Pill & Action */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-4 text-xs bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span><strong className="text-white">36</strong> Levels • <strong className="text-emerald-400">100 Stages Each</strong></span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span><strong className="text-white">2</strong> Flagship Engines</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span><strong className="text-white">1,000</strong> Questions Bank</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span><strong className="text-white">{totalFilesCount}+</strong> Files</span>
              </div>
            </div>

            {/* How to Run in this site Guide Button */}
            <button
              onClick={onOpenHowToRun}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-emerald-200 font-medium text-xs border border-emerald-500/30 transition-all hover:border-emerald-400/50 shadow-sm active:scale-95"
              title="Learn how to run simulations, test kernels, and use features on this site"
            >
              <PlayCircle className="w-4 h-4 text-emerald-400" />
              <span>How to Run (Site Guide)</span>
            </button>

            {/* ZIP Download Button */}
            <button
              onClick={onDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-md shadow-emerald-950/50 transition-all border border-emerald-400/20 active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Packaging Codebase ZIP...' : 'Export Full Codebase (ZIP)'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
