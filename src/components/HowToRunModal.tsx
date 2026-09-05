import React from 'react';
import { 
  X, 
  Play, 
  Cpu, 
  HelpCircle, 
  FolderTree, 
  Download, 
  Flame, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  Code2
} from 'lucide-react';
import { TabType } from '../types';

interface HowToRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: TabType) => void;
  onDownloadZip: () => void;
}

export const HowToRunModal: React.FC<HowToRunModalProps> = ({
  isOpen,
  onClose,
  setActiveTab,
  onDownloadZip
}) => {
  if (!isOpen) return null;

  const handleJumpToTab = (tab: TabType) => {
    setActiveTab(tab);
    onClose();
  };

  const interactiveFeatures = [
    {
      id: 'kernel_playground' as TabType,
      title: 'Run CUDA Kernels in the Sandbox',
      tag: 'Interactive Runner',
      icon: Code2,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      description: 'Test kernel presets (Fused RMSNorm, Vector Add float4, Tiled GEMM) or write custom CUDA C++ code.',
      howToRun: 'Click "Kernel Workbench" tab → Click the green "Compile & Profile" button → Inspect register allocation, shared memory, occupancy, and benchmark output logs.'
    },
    {
      id: 'gpu_simulator' as TabType,
      title: 'Run GPU Hardware & Silicon Simulators',
      tag: 'Real-time Simulation',
      icon: Cpu,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      description: 'Simulate Roofline bounds (H100/A100/RTX 4090), 32-lane SIMT Warp divergence masks, and 32-bank SRAM conflicts.',
      howToRun: 'Click "GPU Hardware Simulator" tab → Move the FLOPs/Bytes sliders for Roofline diagnosis, or switch to Warp/Banks sub-views to toggle divergence patterns and stride padding.'
    },
    {
      id: 'questions_bank' as TabType,
      title: 'Run the 1,000 Questions Bank & Flashcards',
      tag: 'Knowledge Runner',
      icon: HelpCircle,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      description: 'Practice interview and systems questions across 12 deep learning infra domains.',
      howToRun: 'Click "1,000 Questions Bank" tab → Click "Flashcard Mode" → Click "Reveal Answer" and "Next Card", or click "Random Pick" to test your recall.'
    },
    {
      id: 'codebase' as TabType,
      title: 'Explore & Inspect the 1,000+ Files Repository',
      tag: 'Virtual Codebase',
      icon: FolderTree,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      description: 'Virtual repository of production C++20 headers, CUDA kernels, autograd nodes, and tests.',
      howToRun: 'Click "Codebase Explorer" tab → Click any folder or search for keywords like "flash_attention" or "allocator" to view the complete C++/CUDA source.'
    },
    {
      id: 'flagship_projects' as TabType,
      title: 'Inspect MiniTorch-CUDA & FlashLLM Engines',
      tag: 'Flagship Frameworks',
      icon: Flame,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      description: 'Two end-to-end production systems: a full PyTorch clone and a high-throughput LLM inference server.',
      howToRun: 'Click "2 Flagship Projects" tab → Switch between MiniTorch and FlashLLM → Inspect core modules and copy ready-to-run CMake commands.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How to Run & Use This Web App</h2>
              <p className="text-xs text-slate-400">Everything you can run, simulate, and inspect directly on this site</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="text-emerald-400 font-bold">Welcome! </span>
            This application is fully interactive in your browser. You don&apos;t need to install anything to start testing kernels, running hardware simulations, and practicing interview questions. Here is how to run each tool:
          </div>

          <div className="space-y-3">
            {interactiveFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border ${feat.bgColor} ${feat.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{feat.tag}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJumpToTab(feat.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                    >
                      <span>Launch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">{feat.description}</p>

                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300">
                    <strong className="text-emerald-300 font-semibold">How to run: </strong>
                    {feat.howToRun}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Codebase Note */}
          <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Need the Raw C++/CUDA Files Locally?
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                You can download the entire 1,000+ files repository including test suites, CMake files, and guides as a single ZIP.
              </p>
            </div>
            <button
              onClick={() => {
                onDownloadZip();
                onClose();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs whitespace-nowrap transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export ZIP</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
