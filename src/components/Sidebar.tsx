import React from 'react';
import { 
  GraduationCap, 
  FolderTree, 
  Flame, 
  BookMarked, 
  HelpCircle, 
  Cpu, 
  Code2
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
      label: '36-Level Curriculum',
      icon: GraduationCap,
      badge: '100 Stages/Lvl',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'flagship_projects' as TabType,
      label: '2 Flagship Projects',
      icon: Flame,
      badge: 'MiniTorch & FlashLLM',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'project_guides' as TabType,
      label: '7 Step-by-Step Guides',
      icon: BookMarked,
      badge: '5 Mini + 2 Major',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'codebase' as TabType,
      label: 'Codebase Explorer',
      icon: FolderTree,
      badge: `${totalFilesCount}+ Files`,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'questions_bank' as TabType,
      label: '1,000 Questions Bank',
      icon: HelpCircle,
      badge: '1,000 Total',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'gpu_simulator' as TabType,
      label: 'GPU Hardware Simulator',
      icon: Cpu,
      badge: 'Roofline & Banks',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    {
      id: 'kernel_playground' as TabType,
      label: 'Kernel Workbench',
      icon: Code2,
      badge: 'CUDA Sandbox',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    }
  ];

  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
