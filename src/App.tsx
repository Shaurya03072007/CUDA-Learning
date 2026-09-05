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
import { HowToRunModal } from './components/HowToRunModal';
import { generateMasterZip } from './utils/zipGenerator';
import { TabType } from './types';
import { ONE_THOUSAND_QUESTIONS } from './data/questionsData';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHowToRunOpen, setIsHowToRunOpen] = useState(false);

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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'curriculum' && <CurriculumView />}
        {activeTab === 'flagship_projects' && <FlagshipProjectsView />}
        {activeTab === 'project_guides' && <ProjectGuidesView />}
        {activeTab === 'codebase' && <CodeExplorerView />}
        {activeTab === 'questions_bank' && <QuestionsBankView />}
        {activeTab === 'gpu_simulator' && <GpuSimulatorView />}
        {activeTab === 'kernel_playground' && <KernelPlaygroundView />}
      </main>

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
