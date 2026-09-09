import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CurriculumView } from './components/CurriculumView';
import { FlagshipProjectsView } from './components/FlagshipProjectsView';
import { ProjectGuidesView } from './components/ProjectGuidesView';
import { CodeExplorerView } from './components/CodeExplorerView';
import { QuestionsBankView } from './components/QuestionsBankView';
import { GpuSimulatorView } from './components/GpuSimulatorView';
import { KernelPlaygroundView } from './components/KernelPlaygroundView';
import { ChatbotFullView } from './components/chat/ChatbotFullView';
import { ChatbotDrawer } from './components/chat/ChatbotDrawer';
import { LiveVoiceModal } from './components/chat/LiveVoiceModal';
import { HowToRunModal } from './components/HowToRunModal';
import { generateMasterZip } from './utils/zipGenerator';
import { TabType } from './types';
import { ONE_THOUSAND_QUESTIONS } from './data/questionsData';
import { Bot, Radio } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHowToRunOpen, setIsHowToRunOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const zipBlob = await generateMasterZip();
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cuda_cplusplus_deep_learning_infrastructure_mastery.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage('Successfully generated and downloaded full 1,000+ files C++/CUDA Codebase ZIP!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error creating ZIP:', err);
      setToastMessage('Error generating ZIP package.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
        totalFilesCount={1048}
        onOpenHowToRun={() => setIsHowToRunOpen(true)}
        onOpenAiChat={() => setIsChatDrawerOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
      />

      {/* Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalQuestionsCount={ONE_THOUSAND_QUESTIONS.length}
        totalFilesCount={1048}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 max-w-[90vw]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'curriculum' && <CurriculumView />}
        {activeTab === 'flagship_projects' && <FlagshipProjectsView />}
        {activeTab === 'project_guides' && <ProjectGuidesView />}
        {activeTab === 'codebase' && <CodeExplorerView />}
        {activeTab === 'questions_bank' && <QuestionsBankView />}
        {activeTab === 'gpu_simulator' && <GpuSimulatorView />}
        {activeTab === 'kernel_playground' && <KernelPlaygroundView />}
        {activeTab === 'ai_chat' && (
          <ChatbotFullView onOpenLiveVoice={() => setIsLiveVoiceOpen(true)} />
        )}
      </main>

      {/* Floating Copilot Trigger Button (When Drawer is Closed) */}
      {!isChatDrawerOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
          {/* Quick Live Voice Button */}
          <button
            onClick={() => setIsLiveVoiceOpen(true)}
            className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            title="Launch Gemini 3.5 Flash Live Voice"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span className="hidden xs:inline">Live Voice</span>
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={() => setIsChatDrawerOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-2xl shadow-emerald-900/40 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 group"
            title="Open Gemini AI Kernel Mentor (Gemini 3.5/3.1 Flash Lite)"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span>AI Copilot</span>
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono text-emerald-200">
              3.5 Flash Lite
            </span>
          </button>
        </div>
      )}

      {/* Persistent Floating Chat Drawer */}
      <ChatbotDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onExpandToFullTab={() => {
          setIsChatDrawerOpen(false);
          setActiveTab('ai_chat');
        }}
      />

      {/* Gemini Live Voice Audio Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        onSwitchToTextChat={() => {
          setIsLiveVoiceOpen(false);
          setIsChatDrawerOpen(true);
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>CUDA C++ Deep Learning Infrastructure Mastery • Built for High-Performance Systems</span>
          <span>10 Levels • 2 Flagship Engines • 7 Guides • 1,000 Questions • 1,000+ Files</span>
        </div>
      </footer>
      {/* How to Run Site Guide Modal */}
      <HowToRunModal
        isOpen={isHowToRunOpen}
        onClose={() => setIsHowToRunOpen(false)}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
      />
    </div>
  );
}

export default App;
