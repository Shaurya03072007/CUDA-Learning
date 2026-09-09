import React from 'react';
import { 
  GraduationCap, 
  FolderTree, 
  Flame, 
  BookMarked, 
  HelpCircle, 
  Cpu, 
  Code2,
  Bot
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  totalQuestionsCount: number;
  totalFilesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  totalQuestionsCount,
  totalFilesCount
}) => {
  const tabs = [
    {
      id: 'curriculum' as TabType,
      label: '36 Levels',
      fullLabel: '36-Level Curriculum',
      icon: GraduationCap,
      badge: '100 Stages/Lvl',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'flagship_projects' as TabType,
      label: 'Engines',
      fullLabel: '2 Flagship Projects',
      icon: Flame,
      badge: 'MiniTorch & FlashLLM',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'project_guides' as TabType,
      label: 'Guides',
      fullLabel: '7 Guides',
      icon: BookMarked,
      badge: '5 Mini + 2 Major',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'codebase' as TabType,
      label: 'Codebase',
      fullLabel: 'Codebase Explorer',
      icon: FolderTree,
      badge: `${totalFilesCount}+ Files`,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'questions_bank' as TabType,
      label: '1,000 Qs',
      fullLabel: '1,000 Questions Bank',
      icon: HelpCircle,
      badge: '1,000 Total',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'gpu_simulator' as TabType,
      label: 'Simulator',
      fullLabel: 'GPU Simulator',
      icon: Cpu,
      badge: 'Roofline & Banks',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    {
      id: 'kernel_playground' as TabType,
      label: 'Workbench',
      fullLabel: 'Kernel Workbench',
      icon: Code2,
      badge: 'CUDA Sandbox',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    {
      id: 'ai_chat' as TabType,
      label: 'AI Copilot',
      fullLabel: 'Gemini AI Voice & Chat',
      icon: Bot,
      badge: '3.5 & Live Voice',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    }
  ];

  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800 p-1.5 sm:p-2 overflow-x-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 min-w-max px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border select-none active:scale-95 ${
                isActive
                  ? 'bg-slate-800 text-white border-slate-700 shadow-md shadow-black/20 ring-1 ring-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
              <span className={`hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full border font-mono ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
