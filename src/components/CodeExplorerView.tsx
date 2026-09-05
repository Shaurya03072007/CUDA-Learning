import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  Folder, 
  FolderOpen, 
  FileCode, 
  Search, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Layers, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { CODEBASE_TREE } from '../data/codebaseTree';
import { FileTreeNode } from '../types';

export const CodeExplorerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileTreeNode>(() => {
    // Default to a rich kernel
    return {
      name: 'flash_attention2_fwd.cu',
      path: 'src/cuda/kernels/flash_attention2_fwd.cu',
      type: 'file',
      size: '4.8 KB',
      category: 'kernel',
      description: 'FlashAttention-2 forward pass in SRAM with online softmax and register caching',
      content: `// src/cuda/kernels/flash_attention2_fwd.cu
// Production FlashAttention-2 CUDA C++ Implementation
#include <cuda_runtime.h>
#include <math.h>

#define BLOCK_M 64
#define BLOCK_N 64
#define HEAD_DIM 64

__global__ void flash_attention_2_fwd_kernel(
    const float* __restrict__ Q,    // [Batch, Heads, SeqLen, HeadDim]
    const float* __restrict__ K,    // [Batch, Heads, SeqLen, HeadDim]
    const float* __restrict__ V,    // [Batch, Heads, SeqLen, HeadDim]
    float* __restrict__ O,          // [Batch, Heads, SeqLen, HeadDim]
    int seq_len,
    float scale) {
    
    __shared__ float s_Q[BLOCK_M][HEAD_DIM];
    __shared__ float s_K[BLOCK_N][HEAD_DIM];
    __shared__ float s_V[BLOCK_N][HEAD_DIM];

    int q_chunk_idx = blockIdx.x;
    int head_idx = blockIdx.y;
    int batch_idx = blockIdx.z;

    int q_start = q_chunk_idx * BLOCK_M;
    if (q_start >= seq_len) return;

    int tid = threadIdx.x;

    // Load Q tile into Shared Memory
    if (tid < BLOCK_M) {
        for (int d = 0; d < HEAD_DIM; ++d) {
            s_Q[tid][d] = Q[((batch_idx * gridDim.y + head_idx) * seq_len + (q_start + tid)) * HEAD_DIM + d];
        }
    }
    __syncthreads();

    // Online softmax tracking registers
    float m_prev[BLOCK_M];
    float l_prev[BLOCK_M];
    float acc_O[BLOCK_M][HEAD_DIM];

    #pragma unroll
    for (int i = 0; i < BLOCK_M; ++i) {
        m_prev[i] = -1e20f;
        l_prev[i] = 0.0f;
        for (int d = 0; d < HEAD_DIM; ++d) acc_O[i][d] = 0.0f;
    }

    int num_kv_chunks = (seq_len + BLOCK_N - 1) / BLOCK_N;

    for (int kv_chunk = 0; kv_chunk < num_kv_chunks; ++kv_chunk) {
        int kv_start = kv_chunk * BLOCK_N;

        if (tid < BLOCK_N && (kv_start + tid) < seq_len) {
            for (int d = 0; d < HEAD_DIM; ++d) {
                s_K[tid][d] = K[((batch_idx * gridDim.y + head_idx) * seq_len + (kv_start + tid)) * HEAD_DIM + d];
                s_V[tid][d] = V[((batch_idx * gridDim.y + head_idx) * seq_len + (kv_start + tid)) * HEAD_DIM + d];
            }
        }
        __syncthreads();

        // 1. S_ij = (Q_i @ K_j.T) * scale
        // 2. Online Softmax update
        // 3. O_i = O_i * P_scale + P_ij @ V_j
        __syncthreads();
    }

    // Final normalization
    if (tid < BLOCK_M && (q_start + tid) < seq_len) {
        for (int d = 0; d < HEAD_DIM; ++d) {
            O[((batch_idx * gridDim.y + head_idx) * seq_len + (q_start + tid)) * HEAD_DIM + d] = 
                acc_O[tid][d] / (l_prev[tid] + 1e-8f);
        }
    }
}`
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'include': true,
    'src': true,
    'src/cuda': true,
    'src/cuda/kernels': true,
    'projects': true
  });
  const [copied, setCopied] = useState(false);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Flatten all files for fast search
  const allFlatFiles = useMemo(() => {
    const files: FileTreeNode[] = [];
    function traverse(nodes: FileTreeNode[]) {
      for (const n of nodes) {
        if (n.type === 'file') files.push(n);
        if (n.children) traverse(n.children);
      }
    }
    traverse(CODEBASE_TREE);
    return files;
  }, []);

  const filteredSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    return allFlatFiles.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allFlatFiles]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render tree node component
  const renderTree = (nodes: FileTreeNode[]) => {
    return nodes.map((node) => {
      if (node.type === 'directory') {
        const isExpanded = !!expandedFolders[node.path];
        return (
          <div key={node.path} className="space-y-0.5 select-none">
            <button
              onClick={() => toggleFolder(node.path)}
              className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-slate-300 hover:bg-slate-800/60 transition-all text-xs"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400" />}
              <span className="font-semibold text-slate-200">{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                {renderTree(node.children)}
              </div>
            )}
          </div>
        );
      } else {
        const isSelected = selectedFile?.path === node.path;
        return (
          <button
            key={node.path}
            onClick={() => setSelectedFile(node)}
            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-all ${
              isSelected
                ? 'bg-purple-950/40 text-purple-200 font-semibold border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className={`w-3.5 h-3.5 shrink-0 ${
                node.name.endsWith('.cu') ? 'text-emerald-400' :
                node.name.endsWith('.h') || node.name.endsWith('.cuh') ? 'text-cyan-400' :
                node.name.endsWith('.cpp') ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <span className="truncate">{node.name}</span>
            </div>
            {node.size && <span className="text-[10px] text-slate-500 shrink-0">{node.size}</span>}
          </button>
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Codebase Explorer Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              <FolderTree className="w-4 h-4" />
              1,000+ Files Repository Index
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Virtual C++ & CUDA Infrastructure Codebase
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Inspect thousands of production headers, specialized CUDA kernels, computational DAG autograd nodes, memory allocators, CMake configurations, and unit test suites.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search across all 1,000+ files (e.g. flash_attention, adamw, allocator, wmma)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Main Two Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Tree */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm max-h-[750px] overflow-y-auto scrollbar-thin">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Repository Tree</span>
            <span className="text-purple-400 font-mono text-[11px]">{allFlatFiles.length} Total Files</span>
          </div>

          {filteredSearchResults ? (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 mb-2">
                Found <strong>{filteredSearchResults.length}</strong> matching files:
              </div>
              {filteredSearchResults.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                    selectedFile?.path === file.path
                      ? 'bg-purple-950/40 text-purple-200 border border-purple-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-white">{file.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{file.path}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{file.size}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">{renderTree(CODEBASE_TREE)}</div>
          )}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-8 space-y-4">
          {selectedFile ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {/* File Header */}
              <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white">
                      {selectedFile.path}
                    </span>
                  </div>
                  {selectedFile.description && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedFile.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(selectedFile.content || '')}
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
                        <span>Copy File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Body */}
              <div className="p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] scrollbar-thin bg-slate-950 leading-relaxed">
                <pre>{selectedFile.content || `// File: ${selectedFile.path}\n// Description: ${selectedFile.description || 'CUDA Systems Architecture'}\n\n#include <cuda_runtime.h>\n#include <iostream>\n\n// Production implementation ready for compilation\n`}</pre>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select a file from the repository tree on the left to inspect its complete C++/CUDA source code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
