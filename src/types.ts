export type TabType = 
  | 'curriculum' 
  | 'codebase' 
  | 'flagship_projects' 
  | 'project_guides' 
  | 'questions_bank' 
  | 'gpu_simulator' 
  | 'kernel_playground'
  | 'ai_chat';

export type CurriculumLevelId = string;

export interface CurriculumTopic {
  id: string;
  stageNumber?: number;
  exampleNumber?: number;
  phase?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  title: string;
  subtitle: string;
  readTime: string;
  prerequisites: string[];
  concepts: string[];
  cPlusPlusTheory: string;
  hardwareMechanics: string;
  kernelCode: string;
  kernelExplanation: string[];
  commonPitfalls: string[];
  benchmarkingNotes: string;
  mentalModelDiagram?: string;
}

export type CurriculumStage = CurriculumTopic;

export interface CurriculumLevel {
  id: CurriculumLevelId;
  levelNumber: number;
  category?: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  iconName: string;
  topics: CurriculumTopic[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: string;
  category?: 'kernel' | 'header' | 'source' | 'cmake' | 'test' | 'config' | 'doc';
  description?: string;
  content?: string;
  children?: FileTreeNode[];
}

export interface QuestionItem {
  id: number;
  category: 
    | 'C++ Systems & Memory'
    | 'CUDA Execution & Warps'
    | 'GPU Memory Hierarchy & Coalescing'
    | 'Shared Memory & Bank Conflicts'
    | 'Warp Primitives & Tensor Cores'
    | 'Deep Learning Math Kernels (GEMM, Conv, Norm)'
    | 'FlashAttention & Attention Infra'
    | 'PyTorch Autograd & Computational Graph'
    | 'Tensor Engine & Caching Memory Allocator'
    | 'Distributed Training (NCCL, 3D Parallelism)'
    | 'LLM Inference & Quantization (vLLM, RoPE, FP8)'
    | 'Profiling, Nsight Compute & Roofline Model';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Staff/Principal';
  question: string;
  shortAnswer: string;
  detailedExplanation: string;
  codeSnippet?: string;
  hardwareInsight?: string;
  tags: string[];
}

export interface ProjectGuide {
  id: string;
  type: 'mini' | 'major';
  title: string;
  tagline: string;
  estimatedHours: string;
  difficulty: 'Intermediate' | 'Advanced' | 'Mastery';
  overview: string;
  learningObjectives: string[];
  architectureDiagram: string;
  milestones: {
    stepNumber: number;
    title: string;
    description: string;
    codeTemplate: string;
    verificationStep: string;
  }[];
  completeCode: string;
  testSuiteCode: string;
  cmakeFile: string;
  expectedBenchmark: string;
}

export interface FlagshipProject {
  id: 'minitorch_cuda' | 'flash_llm_engine';
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  architectureHighlights: string[];
  directoryStructure: string;
  coreModules: {
    name: string;
    filename: string;
    purpose: string;
    code: string;
    highlights: string[];
  }[];
  quickstartCommands: string[];
}

export interface GpuArchitectureProfile {
  name: string;
  architecture: string;
  fp32Tflops: number;
  fp16TensorTflops: number;
  fp8TensorTflops: number;
  memoryBandwidthGBs: number;
  smCount: number;
  warpCountPerSm: number;
  sharedMemPerSmKB: number;
  l2CacheMB: number;
}
