import React, { useState } from 'react';
import { 
  Code2, 
  Play, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Copy, 
  Check 
} from 'lucide-react';

interface KernelPreset {
  id: string;
  name: string;
  category: string;
  threads: number;
  sharedMemKB: number;
  registersPerThread: number;
  code: string;
}

const KERNEL_PRESETS: KernelPreset[] = [
  {
    id: 'fused_rmsnorm',
    name: 'Fused RMSNorm Kernel (LLaMA-3 / DeepSeek)',
    category: 'Normalization',
    threads: 256,
    sharedMemKB: 0.25,
    registersPerThread: 28,
    code: `// Fused RMSNorm CUDA Kernel
#include <cuda_runtime.h>
#include <math.h>

#define FULL_MASK 0xffffffff

__device__ __forceinline__ float warp_reduce_sum(float val) {
    #pragma unroll
    for (int mask = 16; mask > 0; mask >>= 1) {
        val += __shfl_xor_sync(FULL_MASK, val, mask);
    }
    return val;
}

__global__ void rms_norm_kernel(
    float* __restrict__ output,
    const float* __restrict__ input,
    const float* __restrict__ gamma,
    int rows, int hidden_dim, float eps) {
    
    int row = blockIdx.x;
    if (row >= rows) return;

    const float* x = input + row * hidden_dim;
    float* y = output + row * hidden_dim;

    float sum_sq = 0.0f;
    for (int col = threadIdx.x; col < hidden_dim; col += blockDim.x) {
        float v = x[col];
        sum_sq += v * v;
    }

    sum_sq = warp_reduce_sum(sum_sq);

    __shared__ float s_rms_inv;
    if (threadIdx.x == 0) {
        s_rms_inv = rsqrtf((sum_sq / (float)hidden_dim) + eps);
    }
    __syncthreads();

    float rms_inv = s_rms_inv;
    for (int col = threadIdx.x; col < hidden_dim; col += blockDim.x) {
        y[col] = (x[col] * rms_inv) * gamma[col];
    }
}`
  },
  {
    id: 'vector_add_float4',
    name: 'Vectorized 128-bit float4 Addition',
    category: 'Elementwise',
    threads: 256,
    sharedMemKB: 0,
    registersPerThread: 16,
    code: `// 128-bit Vectorized Vector Addition
#include <cuda_runtime.h>

__global__ void vector_add_float4(
    const float* __restrict__ a,
    const float* __restrict__ b,
    float* __restrict__ c,
    int n) {
    
    int idx = (blockIdx.x * blockDim.x + threadIdx.x) * 4;
    if (idx + 3 < n) {
        float4 a_v = *reinterpret_cast<const float4*>(&a[idx]);
        float4 b_v = *reinterpret_cast<const float4*>(&b[idx]);
        float4 c_v;

        c_v.x = a_v.x + b_v.x;
        c_v.y = a_v.y + b_v.y;
        c_v.z = a_v.z + b_v.z;
        c_v.w = a_v.w + b_v.w;

        *reinterpret_cast<float4*>(&c[idx]) = c_v;
    }
}`
  },
  {
    id: 'tiled_gemm_32x32',
    name: 'Shared Memory Tiled GEMM (32x32)',
    category: 'GEMM / MatMul',
    threads: 1024,
    sharedMemKB: 8.0,
    registersPerThread: 32,
    code: `// Tiled Matrix Multiply in Shared Memory
#define TILE_SIZE 32

__global__ void tiled_gemm_kernel(
    const float* __restrict__ A,
    const float* __restrict__ B,
    float* __restrict__ C,
    int M, int N, int K) {
    
    __shared__ float s_a[TILE_SIZE][TILE_SIZE];
    __shared__ float s_b[TILE_SIZE][TILE_SIZE];

    int row = blockIdx.y * TILE_SIZE + threadIdx.y;
    int col = blockIdx.x * TILE_SIZE + threadIdx.x;
    float acc = 0.0f;

    for (int t = 0; t < (K + TILE_SIZE - 1) / TILE_SIZE; ++t) {
        s_a[threadIdx.y][threadIdx.x] = (row < M && (t * TILE_SIZE + threadIdx.x) < K) ? A[row * K + t * TILE_SIZE + threadIdx.x] : 0.0f;
        s_b[threadIdx.y][threadIdx.x] = (col < N && (t * TILE_SIZE + threadIdx.y) < K) ? B[(t * TILE_SIZE + threadIdx.y) * N + col] : 0.0f;
        __syncthreads();

        for (int k = 0; k < TILE_SIZE; ++k) {
            acc += s_a[threadIdx.y][k] * s_b[k][threadIdx.x];
        }
        __syncthreads();
    }

    if (row < M && col < N) C[row * N + col] = acc;
}`
  }
];

export const KernelPlaygroundView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<KernelPreset>(KERNEL_PRESETS[0]);
  const [code, setCode] = useState<string>(KERNEL_PRESETS[0].code);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectPreset = (preset: KernelPreset) => {
    setSelectedPreset(preset);
    setCode(preset.code);
    setOutputLogs([]);
  };

  const handleRunSimulation = () => {
    setIsCompiling(true);
    setOutputLogs(['[NVCC] Compiling kernel with -O3 -arch=sm_90 --use_fast_math...']);

    setTimeout(() => {
      setOutputLogs(prev => [
        ...prev,
        `[PTXAS] Registers per thread: ${selectedPreset.registersPerThread}`,
        `[PTXAS] Shared memory usage: ${selectedPreset.sharedMemKB} KB per block`,
        `[PTXAS] Constant memory: 340 bytes`,
        `[OCCUPANCY] Theoretical SM Occupancy: 100% (4 active blocks per SM)`,
        `[TEST RUN] Launching <<<dim3(128, 1, 1), dim3(${selectedPreset.threads}, 1, 1), ${selectedPreset.sharedMemKB * 1024}, stream>>>`,
        `[BENCHMARK] Elapsed Kernel Time: 0.042 ms`,
        `[BENCHMARK] Effective Throughput: 892.4 GB/s (92.3% of theoretical peak DRAM bandwidth)`,
        `[VERIFICATION] Max numerical deviation against Float64 CPU reference: 3.42e-07 (PASSED)`
      ]);
      setIsCompiling(false);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Workbench Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              <Code2 className="w-4 h-4" />
              Interactive CUDA C++ Kernel Workbench
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              CUDA Kernel Development & Static Profiler
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Inspect register allocation, shared memory layout, warp occupancy constraints, and simulation diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSimulation}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} />
              <span>{isCompiling ? 'Compiling & Profiling...' : 'Compile & Profile'}</span>
            </button>
          </div>
        </div>

        {/* Presets Row */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 overflow-x-auto scrollbar-thin">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Kernel Presets:</span>
          {KERNEL_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                selectedPreset.id === p.id
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Editor */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-400 font-bold">
              kernel_sandbox.cu
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-4 bg-slate-950 flex-1">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={20}
              className="w-full h-full bg-transparent font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none scrollbar-thin"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Column: Profiler Diagnostics & Console */}
        <div className="lg:col-span-5 space-y-4">
          {/* Static Occupancy Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Hardware Resource Utilization
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Registers / Thread</span>
                <span className="text-base font-bold font-mono text-cyan-400 mt-1 block">
                  {selectedPreset.registersPerThread}
                </span>
                <span className="text-[9px] text-slate-500">Max 255</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Shared Mem / Block</span>
                <span className="text-base font-bold font-mono text-amber-400 mt-1 block">
                  {selectedPreset.sharedMemKB} KB
                </span>
                <span className="text-[9px] text-slate-500">Max 228 KB</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Block Threads</span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                  {selectedPreset.threads}
                </span>
                <span className="text-[9px] text-slate-500">Max 1024</span>
              </div>
            </div>
          </div>

          {/* Execution Terminal Console */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2 min-h-[300px]">
            <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-800 text-[11px] font-bold uppercase">
              <Terminal className="w-4 h-4 text-emerald-400" />
              NVCC Diagnostic & Execution Console
            </div>

            {outputLogs.length > 0 ? (
              <div className="space-y-1 text-xs">
                {outputLogs.map((log, idx) => (
                  <div key={idx} className={`leading-relaxed ${
                    log.includes('PASSED') ? 'text-emerald-400 font-bold' :
                    log.includes('BENCHMARK') ? 'text-cyan-300' :
                    log.includes('OCCUPANCY') ? 'text-purple-300' :
                    log.includes('PTXAS') ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-600 text-xs py-8 text-center">
                Click &quot;Compile & Profile&quot; above to simulate kernel compilation and profiling metrics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
