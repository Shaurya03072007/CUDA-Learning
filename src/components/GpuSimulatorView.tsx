import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Layers, 
  Activity, 
  Zap, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';
import { GpuArchitectureProfile } from '../types';

const GPU_PROFILES: GpuArchitectureProfile[] = [
  {
    name: 'NVIDIA H100 SXM5 (Hopper)',
    architecture: 'Hopper (GH100)',
    fp32Tflops: 67,
    fp16TensorTflops: 989,
    fp8TensorTflops: 1979,
    memoryBandwidthGBs: 3350,
    smCount: 132,
    warpCountPerSm: 64,
    sharedMemPerSmKB: 228,
    l2CacheMB: 50
  },
  {
    name: 'NVIDIA A100 SXM4 (Ampere)',
    architecture: 'Ampere (GA100)',
    fp32Tflops: 19.5,
    fp16TensorTflops: 312,
    fp8TensorTflops: 624,
    memoryBandwidthGBs: 2039,
    smCount: 108,
    warpCountPerSm: 64,
    sharedMemPerSmKB: 164,
    l2CacheMB: 40
  },
  {
    name: 'NVIDIA RTX 4090 (Ada Lovelace)',
    architecture: 'Ada (AD102)',
    fp32Tflops: 82.6,
    fp16TensorTflops: 165,
    fp8TensorTflops: 330,
    memoryBandwidthGBs: 1008,
    smCount: 128,
    warpCountPerSm: 48,
    sharedMemPerSmKB: 128,
    l2CacheMB: 72
  }
];

export const GpuSimulatorView: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<'roofline' | 'warp' | 'banks'>('roofline');

  // Roofline State
  const [selectedGpuIndex, setSelectedGpuIndex] = useState<number>(0);
  const [kernelFlops, setKernelFlops] = useState<number>(2048); // e.g. 2048 FLOPs
  const [kernelBytes, setKernelBytes] = useState<number>(512); // e.g. 512 Bytes
  const [precision, setPrecision] = useState<'fp32' | 'fp16' | 'fp8'>('fp16');

  // Warp Simulation State
  const [divergencePattern, setDivergencePattern] = useState<'none' | 'even_odd' | 'half' | 'sparse'>('none');

  // Bank Conflict State
  const [stride, setStride] = useState<number>(1);
  const [hasPadding, setHasPadding] = useState<boolean>(false);

  const currentGpu = GPU_PROFILES[selectedGpuIndex];

  // Roofline calculations
  const arithmeticIntensity = kernelFlops / Math.max(1, kernelBytes);
  const peakComputeTflops = precision === 'fp32' 
    ? currentGpu.fp32Tflops 
    : precision === 'fp16' 
      ? currentGpu.fp16TensorTflops 
      : currentGpu.fp8TensorTflops;
  
  const bandwidthTBps = currentGpu.memoryBandwidthGBs / 1000;
  const ridgePoint = peakComputeTflops / bandwidthTBps; // FLOPs per Byte
  const isMemoryBound = arithmeticIntensity < ridgePoint;
  const achievableTflops = Math.min(peakComputeTflops, arithmeticIntensity * bandwidthTBps);
  const efficiencyPercent = ((achievableTflops / peakComputeTflops) * 100).toFixed(1);

  // Warp calculations
  const warpLanes = useMemo(() => {
    const lanes = [];
    for (let i = 0; i < 32; ++i) {
      let active = true;
      if (divergencePattern === 'even_odd') active = (i % 2 === 0);
      else if (divergencePattern === 'half') active = (i < 16);
      else if (divergencePattern === 'sparse') active = (i % 4 === 0);
      lanes.push({ id: i, active });
    }
    return lanes;
  }, [divergencePattern]);

  const activeCount = warpLanes.filter(l => l.active).length;
  const warpEfficiency = ((activeCount / 32) * 100).toFixed(0);

  // Bank Conflict calculations
  const bankMappings = useMemo(() => {
    const map: Record<number, number[]> = {};
    for (let b = 0; b < 32; ++b) map[b] = [];

    const effectiveStride = hasPadding ? (stride * 32 + 1) : stride;

    for (let tid = 0; tid < 32; ++tid) {
      const address = tid * effectiveStride;
      const bank = address % 32;
      map[bank].push(tid);
    }
    return map;
  }, [stride, hasPadding]);

  const maxConflict = Math.max(...(Object.values(bankMappings) as number[][]).map(arr => arr.length));
  const bankEfficiency = (100 / maxConflict).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Simulator Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
              <Cpu className="w-4 h-4" />
              Interactive Silicon & Architecture Simulators
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              GPU Microarchitecture & Performance Simulators
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Model real-time Roofline bounds, SIMT Warp divergence penalties, and 32-bank shared memory conflict resolution.
            </p>
          </div>

          {/* Sub-View Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubView('roofline')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                activeSubView === 'roofline'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Roofline Model
            </button>
            <button
              onClick={() => setActiveSubView('warp')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                activeSubView === 'warp'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Warp Divergence
            </button>
            <button
              onClick={() => setActiveSubView('banks')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                activeSubView === 'banks'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Shared Memory Banks
            </button>
          </div>
        </div>
      </div>

      {/* 1. ROOFLINE MODEL CALCULATOR */}
      {activeSubView === 'roofline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-rose-400" />
              Roofline Model Parameters
            </h3>

            {/* GPU Target */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Target GPU Hardware</label>
              <select
                value={selectedGpuIndex}
                onChange={(e) => setSelectedGpuIndex(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {GPU_PROFILES.map((gpu, idx) => (
                  <option key={idx} value={idx}>{gpu.name}</option>
                ))}
              </select>
            </div>

            {/* Precision */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Computation Precision</label>
              <div className="grid grid-cols-3 gap-2">
                {(['fp32', 'fp16', 'fp8'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrecision(p)}
                    className={`py-2 rounded-lg text-xs font-semibold uppercase transition-all border ${
                      precision === p
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Math FLOPs Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Kernel Math Operations (FLOPs):</span>
                <span className="font-mono text-emerald-400 font-bold">{kernelFlops} FLOPs</span>
              </div>
              <input
                type="range"
                min="64"
                max="16384"
                step="64"
                value={kernelFlops}
                onChange={(e) => setKernelFlops(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Memory Bytes Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Global DRAM Memory Transferred:</span>
                <span className="font-mono text-cyan-400 font-bold">{kernelBytes} Bytes</span>
              </div>
              <input
                type="range"
                min="16"
                max="4096"
                step="16"
                value={kernelBytes}
                onChange={(e) => setKernelBytes(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Peak Memory Bandwidth:</span>
                <span className="text-white font-mono">{currentGpu.memoryBandwidthGBs} GB/s</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Compute Throughput:</span>
                <span className="text-white font-mono">{peakComputeTflops} TFLOPs</span>
              </div>
              <div className="flex justify-between">
                <span>Ridge Point:</span>
                <span className="text-amber-400 font-mono">{ridgePoint.toFixed(1)} FLOPs/Byte</span>
              </div>
            </div>
          </div>

          {/* Results Analysis */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Performance Regime & Roofline Diagnosis
              </h3>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                isMemoryBound
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isMemoryBound ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <div className="font-bold text-base">
                    Kernel Regime: {isMemoryBound ? 'MEMORY-BANDWIDTH BOUND' : 'COMPUTE / MATH BOUND'}
                  </div>
                  <p className="text-xs mt-1 text-slate-300 leading-relaxed">
                    {isMemoryBound 
                      ? `Your kernel has an Arithmetic Intensity of ${arithmeticIntensity.toFixed(2)} FLOPs/Byte (below the ridge point of ${ridgePoint.toFixed(1)}). The GPU compute cores spend most time waiting for HBM DRAM transfers. Solution: Kernel fusion, 128-bit float4 loads, and shared memory caching.`
                      : `Your kernel has an Arithmetic Intensity of ${arithmeticIntensity.toFixed(2)} FLOPs/Byte (exceeding the ridge point of ${ridgePoint.toFixed(1)}). The execution is fully saturating Tensor Cores/ALUs. Solution: Maximize warp occupancy and instruction pipelining.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Arithmetic Intensity</span>
                <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                  {arithmeticIntensity.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">FLOPs / Byte</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Achievable Throughput</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {achievableTflops.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">TFLOPs</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Theoretical Saturation</span>
                <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                  {efficiencyPercent}%
                </span>
                <span className="text-[10px] text-slate-500">of Peak Hardware</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. WARP DIVERGENCE SIMULATOR */}
      {activeSubView === 'warp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">
                SIMT Warp Execution & Active Mask Visualizer (32 Threads)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Observe how branch divergence disables hardware lanes and serializes execution paths.
              </p>
            </div>

            {/* Pattern Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDivergencePattern('none')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  divergencePattern === 'none'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                No Divergence (100%)
              </button>
              <button
                onClick={() => setDivergencePattern('even_odd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  divergencePattern === 'even_odd'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Even / Odd Divergence (50%)
              </button>
              <button
                onClick={() => setDivergencePattern('half')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  divergencePattern === 'half'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Half-Warp Divergence (50%)
              </button>
            </div>
          </div>

          {/* 32 Lanes Grid */}
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Warp 32-Lane Hardware State:</span>
              <span className="font-mono text-emerald-400 font-bold">
                Active Threads: {activeCount} / 32 ({warpEfficiency}% Efficiency)
              </span>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-16 gap-2">
              {warpLanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`p-2 rounded-lg text-center border font-mono text-[11px] transition-all ${
                    lane.active
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40'
                  }`}
                >
                  <div className="text-[9px] text-slate-500">T{lane.id}</div>
                  <div className="font-bold mt-0.5">{lane.active ? 'ACT' : 'OFF'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SHARED MEMORY 32-BANK CONFLICT SIMULATOR */}
      {activeSubView === 'banks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Shared Memory 32-Bank Architecture & Conflict Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualizes which threads hit each of the 32 4-byte SRAM memory banks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Stride selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Access Stride:</span>
                <select
                  value={stride}
                  onChange={(e) => setStride(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="1">Stride 1 (Sequential)</option>
                  <option value="2">Stride 2 (2-Way Conflict)</option>
                  <option value="4">Stride 4 (4-Way Conflict)</option>
                  <option value="8">Stride 8 (8-Way Conflict)</option>
                  <option value="32">Stride 32 (32-Way Conflict!)</option>
                </select>
              </div>

              {/* Padding Toggle */}
              <button
                onClick={() => setHasPadding(!hasPadding)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  hasPadding
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {hasPadding ? 'Padding: ON (+1 Row Stride)' : 'Padding: OFF'}
              </button>
            </div>
          </div>

          {/* 32 Banks Visualization */}
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>SRAM 32-Bank Distribution:</span>
              <span className={`font-mono font-bold ${maxConflict > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {maxConflict === 1 ? '0 Bank Conflicts (1 Cycle Latency • 100% SRAM Bandwidth)' : `${maxConflict}-Way Bank Conflict (${maxConflict} Serialized Cycles • ${bankEfficiency}% Effective Bandwidth)`}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
              {Array.from({ length: 32 }).map((_, bankIdx) => {
                const threadsHit = bankMappings[bankIdx] || [];
                const hasConflict = threadsHit.length > 1;
                return (
                  <div
                    key={bankIdx}
                    className={`p-2 rounded-lg border text-center font-mono text-xs transition-all ${
                      hasConflict
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                        : threadsHit.length === 1
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="text-[9px] text-slate-500">Bank {bankIdx}</div>
                    <div className="text-[11px] font-bold mt-1">
                      {threadsHit.length > 0 ? `${threadsHit.length} req` : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
