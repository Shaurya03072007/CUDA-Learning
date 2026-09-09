import { CurriculumLevel, CurriculumTopic } from '../types';
import { synthesizeStage } from './stageCodeSynthesizer';

export interface LevelDefinition {
  id: string;
  levelNumber: number;
  category: string;
  title: string;
  subtitle: string;
  badge: string;
  iconName: string;
  description: string;
  coreTopic: string;
  keyHeader: string;
  sampleKernel: (stageNum: number, stageName: string) => string;
  stageTopics: {
    phase1Theme: string;
    phase2Theme: string;
    phase3Theme: string;
    phase4Theme: string;
    keyPrerequisites: string[];
    hardwareFocus: string;
    pitfallFocus: string;
  };
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    id: 'level_1',
    levelNumber: 1,
    category: 'C++ Systems Foundations',
    title: 'C++20 Memory Layout, Pointers & CPU Cache Alignment',
    subtitle: 'From raw byte addressing and 64-byte cache line alignment to contiguous tensor layouts',
    badge: 'C++ Systems',
    iconName: 'Cpu',
    description: '100 stages mastering memory addressing, pointer arithmetic, alignas(64), cache line false sharing, and contiguous tensor striding.',
    coreTopic: 'Memory Layout & Cache Lines',
    keyHeader: '#include <iostream>\n#include <memory>\n#include <new>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <iostream>
#include <cstdint>
#include <new>

// Cache-line aligned struct avoiding false sharing (64 bytes)
struct alignas(64) AlignedTensorBuffer {
    float data[16]; // Exactly 64 bytes
    uint64_t stride_bytes;
};

void run_stage_${stage}() {
    std::cout << "Stage ${stage}: ${name} executed successfully.\\n";
}`,
    stageTopics: {
      phase1Theme: 'Raw Byte Addressing & Memory Pointer Arithmetic',
      phase2Theme: 'Cache Line Structs & False Sharing Avoidance',
      phase3Theme: 'Virtual Memory, Page Tables & Contiguous Tensor Striding',
      phase4Theme: 'Assembly Optimization, Alignment Verification & Profiling',
      keyPrerequisites: ['Modern C++ Basics', 'Pointer Arithmetic'],
      hardwareFocus: 'CPU L1/L2 64-byte cache lines, spatial locality, and memory alignment boundaries.',
      pitfallFocus: 'Misaligned data structures triggering split-cache line penalty cycles.'
    }
  },
  {
    id: 'level_2',
    levelNumber: 2,
    category: 'C++ Systems Foundations',
    title: 'CPU SIMD Vectorization, AVX-512 & Cache Prefetching',
    subtitle: 'Extracting peak CPU throughput via 256-bit AVX2, 512-bit AVX-512, and software prefetch engines',
    badge: 'SIMD Vectorization',
    iconName: 'Zap',
    description: '100 stages mastering SIMD register lanes, intrinsics (_mm256/_mm512), horizontal reductions, and cache prefetch instructions.',
    coreTopic: 'SIMD Intrinsics & AVX-512',
    keyHeader: '#include <immintrin.h>\n#include <vector>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <immintrin.h>
#include <iostream>

void simd_vector_add_stage_${stage}(const float* a, const float* b, float* c, int n) {
    for (int i = 0; i < n; i += 8) {
        __m256 va = _mm256_loadu_ps(a + i);
        __m256 vb = _mm256_loadu_ps(b + i);
        __m256 vc = _mm256_add_ps(va, vb);
        _mm256_storeu_ps(c + i, vc);
    }
}`,
    stageTopics: {
      phase1Theme: 'SIMD Register Architecture & 128/256/512-bit Vector Lanes',
      phase2Theme: 'Vectorized Arithmetic & Fused Multiply-Add (_mm256_fmadd_ps)',
      phase3Theme: 'Masked Stores, Horizontal Reductions & Transposition',
      phase4Theme: 'Software Prefetching (_mm_prefetch) & Memory Bus Saturation',
      keyPrerequisites: ['Level 1: Memory Alignment', 'Bitwise Manipulation'],
      hardwareFocus: 'AVX execution units, vector register renaming, and memory load-store queues.',
      pitfallFocus: 'Unaligned memory loads on older architectures causing CPU exceptions or pipeline stalls.'
    }
  },
  {
    id: 'level_3',
    levelNumber: 3,
    category: 'C++ Systems Foundations',
    title: 'Custom Arena Allocators, Virtual Memory & RAII Lifecycles',
    subtitle: 'Zero-overhead deterministic memory pooling, bump allocators, and mmap virtual memory mapping',
    badge: 'Memory Allocators',
    iconName: 'Box',
    description: '100 stages building industrial-grade bump allocators, segmented memory pools, mmap backing, and RAII lifetime safety.',
    coreTopic: 'Arena Allocators & Memory Pools',
    keyHeader: '#include <cstddef>\n#include <cstdlib>\n#include <sys/mman.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cstddef>
#include <cstdint>

class ArenaAllocator_Stage${stage} {
    uint8_t* buffer;
    size_t capacity;
    size_t offset;
public:
    ArenaAllocator_Stage${stage}(size_t size) : capacity(size), offset(0) {
        buffer = new uint8_t[size];
    }
    void* allocate(size_t bytes, size_t alignment = 64) {
        size_t current_ptr = reinterpret_cast<size_t>(buffer + offset);
        size_t aligned_ptr = (current_ptr + alignment - 1) & ~(alignment - 1);
        offset = (aligned_ptr - reinterpret_cast<size_t>(buffer)) + bytes;
        return reinterpret_cast<void*>(aligned_ptr);
    }
    void reset() { offset = 0; }
};`,
    stageTopics: {
      phase1Theme: 'Bump Allocation & Pointer Offsetting Mechanics',
      phase2Theme: 'Alignment Masking & Segregated Free List Design',
      phase3Theme: 'Virtual Memory (mmap/munmap), Hugepages & TLB Misses',
      phase4Theme: 'Thread-Local Storage Pools & Microsecond Allocation Benchmarks',
      keyPrerequisites: ['Level 1: Pointers', 'RAII Principles'],
      hardwareFocus: 'TLB (Translation Lookaside Buffer) hit rates, OS virtual page tables, and cache locality.',
      pitfallFocus: 'Memory fragmentation and memory leaks in nested allocation lifecycles.'
    }
  },
  {
    id: 'level_4',
    levelNumber: 4,
    category: 'Core CUDA Architecture',
    title: 'GPU Hardware Architecture: SMs, Warp Schedulers & Register Files',
    subtitle: 'Dissecting Streaming Multiprocessors (SM), warp execution, instruction dispatch, and hardware limits',
    badge: 'Silicon Architecture',
    iconName: 'Layers',
    description: '100 stages exploring SM sub-cores, warp schedulers, dual-issue dispatch, register file allocation, and theoretical occupancy limits.',
    coreTopic: 'GPU Silicon Architecture',
    keyHeader: '#include <cuda_runtime.h>\n#include <iostream>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <iostream>

__global__ void sm_inspect_kernel_stage_${stage}(int* sm_ids) {
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    unsigned int sm_id;
    // PTX instruction reading physical SM identifier
    asm("mov.u32 %0, %smid;" : "=r"(sm_id));
    if (tid < 1024) sm_ids[tid] = sm_id;
}`,
    stageTopics: {
      phase1Theme: 'Streaming Multiprocessor (SM) Topology & Sub-Partition Layout',
      phase2Theme: 'Warp Scheduler Issue Slots & Instruction Dispatch Latencies',
      phase3Theme: 'Register File Partitioning (65,536 registers per SM) & Spillover',
      phase4Theme: 'Theoretical vs Achieved Occupancy Calculation & Profiling',
      keyPrerequisites: ['Level 1: Memory Alignment', 'Basic Concurrency'],
      hardwareFocus: 'GigaThread engine, SM dispatch units, warp schedulers, and register crossbars.',
      pitfallFocus: 'Exceeding 255 registers per thread causing catastrophic local memory spills to DRAM.'
    }
  },
  {
    id: 'level_5',
    levelNumber: 5,
    category: 'Core CUDA Architecture',
    title: 'Thread Hierarchy: 1D, 2D, 3D Grids, Blocks & Warp Coordinate Mapping',
    subtitle: 'Mathematical thread coordinate decomposition, boundary guards, and multidimensional matrix indexing',
    badge: 'Thread Hierarchy',
    iconName: 'Binary',
    description: '100 stages mastering blockIdx, threadIdx, blockDim, gridDim across 1D, 2D, and 3D spaces with zero indexing errors.',
    coreTopic: 'Thread & Block Decomposition',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__global__ void coords_2d_kernel_stage_${stage}(float* matrix, int width, int height) {
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    if (col < width && row < height) {
        int idx = row * width + col;
        matrix[idx] = static_cast<float>(idx);
    }
}`,
    stageTopics: {
      phase1Theme: '1D Global Linear Thread ID Calculation & Stride Guarding',
      phase2Theme: '2D & 3D Spatial Grid Mapping for Image and Matrix Tensors',
      phase3Theme: 'Grid-Stride Loops for Arbitrary Problem Sizes',
      phase4Theme: 'Coordinate Transformations & Warp Serialization Diagnostics',
      keyPrerequisites: ['Level 4: GPU Hardware', 'Multidimensional Arrays'],
      hardwareFocus: 'Hardware warp formation: threadIdx.x + threadIdx.y*blockDim.x in groups of 32.',
      pitfallFocus: 'Flipping row-major order (row vs column index), causing uncoalesced memory access.'
    }
  },
  {
    id: 'level_6',
    levelNumber: 6,
    category: 'Core CUDA Architecture',
    title: 'Host-Device Runtime, Unified Memory & Page-Locked DMA Transfers',
    subtitle: 'Mastering cudaMalloc, cudaMallocHost (pinned), cudaMemcpy, and unified memory page-faulting',
    badge: 'Runtime & Memory',
    iconName: 'Server',
    description: '100 stages mastering host/device memory allocation, pinned memory bandwidth, DMA transfer engines, and Unified Memory page migration.',
    coreTopic: 'Host-Device Memory & DMA',
    keyHeader: '#include <cuda_runtime.h>\n#include <iostream>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <iostream>

void test_pinned_dma_stage_${stage}() {
    const int N = 1000000;
    float* h_pinned;
    // Page-locked host memory enables direct DMA over PCIe bus
    cudaMallocHost(&h_pinned, N * sizeof(float));
    float* d_buf;
    cudaMalloc(&d_buf, N * sizeof(float));

    cudaMemcpy(d_buf, h_pinned, N * sizeof(float), cudaMemcpyHostToDevice);
    cudaFree(d_buf);
    cudaFreeHost(h_pinned);
}`,
    stageTopics: {
      phase1Theme: 'cudaMalloc vs malloc: Host/Device Address Space Separation',
      phase2Theme: 'Page-Locked (Pinned) Memory: cudaMallocHost & DMA Saturation',
      phase3Theme: 'Unified Memory (cudaMallocManaged) & Hardware Page Fault Handlers',
      phase4Theme: 'cudaMemAdvise, cudaMemPrefetchAsync & PCIe Gen5 Latency Tuning',
      keyPrerequisites: ['Level 5: Thread Hierarchy', 'Virtual Memory'],
      hardwareFocus: 'Host PCIe DMA copy engines, GPU MMU page tables, and ATS/CAPI interconnects.',
      pitfallFocus: 'Using standard pageable memory with asynchronous copies, forcing synchronous driver stalls.'
    }
  },
  {
    id: 'level_7',
    levelNumber: 7,
    category: 'Core CUDA Architecture',
    title: 'Hardware Branch Divergence, Activemask & Execution Convergence',
    subtitle: 'How if/else branches serialize 32-thread warps and how to eliminate divergence via predication',
    badge: 'Warp Divergence',
    iconName: 'GitFork',
    description: '100 stages mastering SIMT execution masks, warp reconvergence points, branch predication, and branchless arithmetic.',
    coreTopic: 'Branch Divergence & Predication',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// Branchless clamp kernel eliminating warp divergence
__global__ void branchless_stage_${stage}(float* d_out, const float* d_in, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        float x = d_in[idx];
        // Branchless min/max using hardware FMIN/FMAX instructions
        d_out[idx] = fmaxf(0.0f, fminf(x, 1.0f));
    }
}`,
    stageTopics: {
      phase1Theme: 'Warp Execution Masks & Reconvergence Stack Mechanics',
      phase2Theme: 'Measuring Branch Divergence Penalty (2x to 32x Slowdown)',
      phase3Theme: 'Predicated Execution (PTX @p0) & Hardware Condition Codes',
      phase4Theme: 'Branchless Algorithms: Bitwise Math, Lookup Tables & FMIN/FMAX',
      keyPrerequisites: ['Level 4: Silicon Architecture', 'Control Flow'],
      hardwareFocus: 'SM SIMT stack, warp execution mask registers, and instruction replay units.',
      pitfallFocus: 'Branching on (threadIdx.x % 2 == 0), forcing 100% warp serialization on both paths.'
    }
  },
  {
    id: 'level_8',
    levelNumber: 8,
    category: 'GPU Memory Hierarchy',
    title: 'Global Memory Coalescing & 128-bit Vectorized Transactions (float4)',
    subtitle: 'Aligning warp memory accesses to 32-byte cache sectors and saturating HBM bus bandwidth',
    badge: 'Memory Coalescing',
    iconName: 'Activity',
    description: '100 stages dissecting 32-byte DRAM burst transactions, stride misalignments, and 128-bit float4 loads reaching 95%+ peak bandwidth.',
    coreTopic: 'Memory Coalescing & float4',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// 128-bit vectorized float4 memory transaction
__global__ void vectorized_copy_stage_${stage}(float4* __restrict__ dst, const float4* __restrict__ src, int n4) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n4) {
        // Generates single LDG.128 / STG.128 assembly instruction
        dst[idx] = src[idx];
    }
}`,
    stageTopics: {
      phase1Theme: '32-Byte Cache Sectors & Coalesced Warp Transactions',
      phase2Theme: 'Strided & Misaligned Access Penalties (12.5% Bus Utilization)',
      phase3Theme: '128-bit Vectorized Loads/Stores (float4 / int4) & LDG.128',
      phase4Theme: 'DRAM Channel Partitioning, Bank Interleaving & Nsight Profiling',
      keyPrerequisites: ['Level 6: Runtime Memory', 'Hardware Topology'],
      hardwareFocus: 'DRAM memory controllers, crossbar switches, and 32-byte cache line requests.',
      pitfallFocus: 'Reading columnar matrices directly without shared memory transposition, killing bandwidth.'
    }
  },
  {
    id: 'level_9',
    levelNumber: 9,
    category: 'GPU Memory Hierarchy',
    title: 'Shared Memory Architecture, 32 Banks & Conflict Elimination',
    subtitle: 'On-chip 19-terabyte/s SRAM scratchpad, bank addressing, and stride padding strategies',
    badge: 'Shared Memory',
    iconName: 'Layers',
    description: '100 stages mastering __shared__ memory allocation, 32-bank interleaved addressing, bank conflict resolution, and padding math.',
    coreTopic: 'Shared Memory & Bank Conflicts',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// Padded 32x32 tile avoiding all 32-way bank conflicts
__global__ void shared_padded_stage_${stage}(float* out, const float* in) {
    __shared__ float tile[32][33]; // +1 padding eliminates column bank conflicts!
    int tx = threadIdx.x; int ty = threadIdx.y;
    tile[ty][tx] = in[ty * 32 + tx];
    __syncthreads();
    out[tx * 32 + ty] = tile[ty][tx];
}`,
    stageTopics: {
      phase1Theme: 'On-Chip SRAM Physical Architecture & 19 TB/s Aggregate Bandwidth',
      phase2Theme: '32-Bank Interleaving: Bank = (ByteAddress / 4) % 32',
      phase3Theme: 'N-Way Bank Conflict Serialization & Stride-32 Bottlenecks',
      phase4Theme: 'Padding Techniques (+1 Offset), Swizzling & Assembly STS/LDS',
      keyPrerequisites: ['Level 8: Coalescing', 'Array Indexing'],
      hardwareFocus: 'SM SRAM arrays, 32 crossbar bank ports, and bank serialization arbitration logic.',
      pitfallFocus: 'Multiple threads in a warp accessing different addresses within the same bank simultaneously.'
    }
  },
  {
    id: 'level_10',
    levelNumber: 10,
    category: 'GPU Memory Hierarchy',
    title: 'Constant Memory, Texture Units & Read-Only LDG Caches',
    subtitle: 'Broadcasting hyper-parameters via 64 KB constant cache and read-only cache decorators',
    badge: 'Constant & LDG',
    iconName: 'Box',
    description: '100 stages mastering __constant__ memory broadcasting, __ldg() intrinsic, texture cache spatial filtering, and uniform reads.',
    coreTopic: 'Constant Memory & LDG',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__constant__ float c_filter_weights[64];

__global__ void constant_conv_stage_${stage}(const float* __restrict__ in, float* out, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        // Uniform broadcast: All 32 threads in warp read same constant weight in 1 cycle
        float sum = 0.0f;
        #pragma unroll
        for (int k = 0; k < 64; ++k) sum += in[idx + k] * c_filter_weights[k];
        out[idx] = sum;
    }
}`,
    stageTopics: {
      phase1Theme: '64 KB Hardware Constant Memory & Single-Cycle Warp Broadcast',
      phase2Theme: 'Read-Only Data Cache: __ldg() & __restrict__ Pointer Aliasing',
      phase3Theme: 'Texture Memory Hardware, Surface Objects & 2D Spatial Locality',
      phase4Theme: 'L1 Constant Cache Hit Rates & Instruction Decode Efficiency',
      keyPrerequisites: ['Level 9: Shared Memory', 'Pointer Modifiers'],
      hardwareFocus: 'Constant cache broadcast network, L1 instruction cache, and Texture Processing Clusters.',
      pitfallFocus: 'Threads in a warp reading different constant addresses, serializing access 32-fold.'
    }
  },
  {
    id: 'level_11',
    levelNumber: 11,
    category: 'GPU Memory Hierarchy',
    title: 'L1 / L2 Cache Residency, Sector Mechanics & Cache Control',
    subtitle: 'Fine-grained cache management, persistent L2 cache residency, and bypass instructions',
    badge: 'L1/L2 Caches',
    iconName: 'Cpu',
    description: '100 stages mastering L1/L2 cache policies, cache-line sector allocation, cudaStreamSetAttribute persistent residency, and PTX ld.global.ca/cg.',
    coreTopic: 'L1/L2 Cache Mechanics',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// PTX load bypassing L1 cache directly to L2 (.cg)
__global__ void l2_bypass_stage_${stage}(float* dst, const float* src, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        float val;
        asm volatile("ld.global.cg.f32 %0, [%1];" : "=f"(val) : "l"(src + idx));
        dst[idx] = val;
    }
}`,
    stageTopics: {
      phase1Theme: 'Unified L1 Data Cache & Shared Memory Partitioning (cudaFuncSetAttribute)',
      phase2Theme: 'L2 Cache Hierarchy, 50 MB+ Cross-SM Caches & Eviction Policies',
      phase3Theme: 'Persistent L2 Cache Windowing for High-Reuse Deep Learning Weights',
      phase4Theme: 'PTX Cache Operators: ld.global.ca, ld.global.cg, ld.global.cs (Streaming)',
      keyPrerequisites: ['Level 8: Coalescing', 'Level 10: Constant Memory'],
      hardwareFocus: 'L2 crossbar slices, cache tag directories, and LRU/streaming eviction algorithms.',
      pitfallFocus: 'Polluting L1 cache with high-volume streaming data that will never be reused.'
    }
  },
  {
    id: 'level_12',
    levelNumber: 12,
    category: 'Warp Primitives & Intrinsics',
    title: 'Warp Shuffle Intrinsics (__shfl_down_sync, __shfl_xor_sync)',
    subtitle: 'Zero-latency register-to-register data exchange without touching shared memory or DRAM',
    badge: 'Warp Shuffles',
    iconName: 'Zap',
    description: '100 stages mastering __shfl_sync, __shfl_down_sync, __shfl_up_sync, and __shfl_xor_sync for 1-cycle warp-wide communication.',
    coreTopic: 'Warp Shuffle Intrinsics',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// Warp reduction summing 32 floats in 5 instructions via shuffle
__device__ inline float warp_reduce_sum_stage_${stage}(float val) {
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        val += __shfl_down_sync(0xffffffff, val, offset);
    }
    return val; // Lane 0 holds total sum
}`,
    stageTopics: {
      phase1Theme: 'Hardware Register Crossbars & Warp-Wide Intra-Register Transfers',
      phase2Theme: '__shfl_down_sync & Tree-Based Sum/Max/Min Reductions',
      phase3Theme: '__shfl_xor_sync & Butterfly Reduction Topologies',
      phase4Theme: 'Full-Warp Activemask (0xffffffff) Discipline & Deadlock Avoidance',
      keyPrerequisites: ['Level 7: Divergence', 'Bitwise Math'],
      hardwareFocus: 'SM register file crossbar switches allowing direct lane-to-lane data transfer in 1 clock cycle.',
      pitfallFocus: 'Calling shuffle with activemask excluding divergent lanes, causing undefined behavior or hang.'
    }
  },
  {
    id: 'level_13',
    levelNumber: 13,
    category: 'Warp Primitives & Intrinsics',
    title: 'Warp-Wide Vote Intrinsics, Ballot & Match Instructions',
    subtitle: 'Evaluations across 32 threads simultaneously: __all_sync, __any_sync, and __ballot_sync',
    badge: 'Vote & Ballot',
    iconName: 'CheckCircle2',
    description: '100 stages mastering __all_sync, __any_sync, __ballot_sync, and __match_any_sync for warp-wide consensus and dynamic dispatch.',
    coreTopic: 'Vote & Ballot Intrinsics',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__global__ void vote_ballot_stage_${stage}(const float* data, int* flags, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    bool predicate = (idx < n) && (data[idx] > 0.0f);
    // 32-bit bitmask where bit i represents predicate of lane i
    unsigned int mask = __ballot_sync(0xffffffff, predicate);
    if (threadIdx.x == 0) flags[blockIdx.x] = mask;
}`,
    stageTopics: {
      phase1Theme: 'SIMT Execution Predicate Evaluation & __all_sync / __any_sync',
      phase2Theme: '__ballot_sync: Compacting Warp Predicates into 32-bit Bitmasks',
      phase3Theme: '__popc (Population Count) & __ffs (Find First Set) Bit Manipulations',
      phase4Theme: 'Volta/Hopper __match_any_sync & Multi-Class Warp Grouping',
      keyPrerequisites: ['Level 12: Warp Shuffles', 'Bitwise Logic'],
      hardwareFocus: 'SM condition code buses and hardware population count instruction units.',
      pitfallFocus: 'Using stale thread masks in Volta+ independent thread scheduling architectures.'
    }
  },
  {
    id: 'level_14',
    levelNumber: 14,
    category: 'Warp Primitives & Intrinsics',
    title: 'Parallel Reduction Primitives & Inclusive/Exclusive Scan (Prefix Sum)',
    subtitle: 'Multi-tiered hierarchical reductions across threads, warps, thread blocks, and whole grids',
    badge: 'Reduction & Scan',
    iconName: 'Activity',
    description: '100 stages building industrial-grade Kogge-Stone and Brent-Kung prefix scans, cooperative grid reductions, and atomic locks.',
    coreTopic: 'Parallel Reductions & Scans',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__global__ void block_reduction_stage_${stage}(const float* in, float* out, int n) {
    extern __shared__ float sdata[];
    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    sdata[tid] = (idx < n) ? in[idx] : 0.0f;
    __syncthreads();

    // Tree reduction in shared memory
    for (int s = blockDim.x / 2; s > 0; s >>= 1) {
        if (tid < s) sdata[tid] += sdata[tid + s];
        __syncthreads();
    }
    if (tid == 0) atomicAdd(out, sdata[0]);
}`,
    stageTopics: {
      phase1Theme: 'Tree Reduction Algorithms: Sequential Addressing vs Interleaved Strides',
      phase2Theme: 'Warp-Synchronous Unrolling Eliminating __syncthreads in Final 32 Threads',
      phase3Theme: 'Kogge-Stone & Brent-Kung Work-Efficient Parallel Prefix Sums (Scan)',
      phase4Theme: 'Grid-Wide Cooperative Reductions via cudaLaunchCooperativeKernel',
      keyPrerequisites: ['Level 9: Shared Memory', 'Level 12: Warp Shuffles'],
      hardwareFocus: 'Hardware barrier synchronizers, atomic addition integer/FP32 units in L2 cache.',
      pitfallFocus: 'Shared memory bank conflicts during strided reduction stages (s = 2, 4, 8...).'
    }
  },
  {
    id: 'level_15',
    levelNumber: 15,
    category: 'Deep Learning Matrix Math (GEMM)',
    title: 'Naive to Shared-Memory Tiled GEMM (Matrix Multiplication)',
    subtitle: 'From O(N³) DRAM reads to tiled shared memory blocks reusing submatrices in fast SRAM',
    badge: 'Tiled GEMM',
    iconName: 'Box',
    description: '100 stages mastering square/rectangular matrix indexing, tile dimensions (16x16, 32x32), shared memory staging, and arithmetic intensity.',
    coreTopic: 'Shared Memory Tiled GEMM',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

#define TILE_DIM 32
__global__ void tiled_gemm_stage_${stage}(const float* A, const float* B, float* C, int N) {
    __shared__ float sA[TILE_DIM][TILE_DIM];
    __shared__ float sB[TILE_DIM][TILE_DIM];
    int row = blockIdx.y * TILE_DIM + threadIdx.y;
    int col = blockIdx.x * TILE_DIM + threadIdx.x;
    float sum = 0.0f;

    for (int t = 0; t < (N + TILE_DIM - 1) / TILE_DIM; ++t) {
        sA[threadIdx.y][threadIdx.x] = (row < N && t * TILE_DIM + threadIdx.x < N) ? A[row * N + t * TILE_DIM + threadIdx.x] : 0.0f;
        sB[threadIdx.y][threadIdx.x] = (col < N && t * TILE_DIM + threadIdx.y < N) ? B[(t * TILE_DIM + threadIdx.y) * N + col] : 0.0f;
        __syncthreads();
        #pragma unroll
        for (int k = 0; k < TILE_DIM; ++k) sum += sA[threadIdx.y][k] * sB[k][threadIdx.x];
        __syncthreads();
    }
    if (row < N && col < N) C[row * N + col] = sum;
}`,
    stageTopics: {
      phase1Theme: 'Naive GEMM Analysis: Memory Bandwidth Bottlenecks (1 FLOP / 12 Bytes)',
      phase2Theme: 'Shared Memory Tiling Mechanics & Arithmetic Intensity Boosting',
      phase3Theme: 'Rectangular GEMM (M, N, K) Dimensions & Boundary Handling Guards',
      phase4Theme: 'Occupancy vs Tile Size Tradeoffs: 16x16 vs 32x32 Block Profiles',
      keyPrerequisites: ['Level 8: Coalescing', 'Level 9: Shared Memory'],
      hardwareFocus: 'SRAM tile caching boosting arithmetic intensity by 32x, converting memory-bound to compute-bound.',
      pitfallFocus: 'Forgetting second __syncthreads() before loading next tile, causing race conditions.'
    }
  },
  {
    id: 'level_16',
    levelNumber: 16,
    category: 'Deep Learning Matrix Math (GEMM)',
    title: '2D Register Tiling & Outer Product Matrix Multiplication',
    subtitle: 'Thread-level register tiling (8x8 elements per thread) achieving >75% of FP32 peak FLOPs',
    badge: 'Register Tiling',
    iconName: 'Cpu',
    description: '100 stages engineering thread-level outer-product microkernels, register accumulation, and instruction-level parallelism (ILP).',
    coreTopic: '2D Register Tiled GEMM',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// Each thread calculates an 8x8 micro-tile in hardware REGISTERS
__device__ void microkernel_8x8_stage_${stage}(float accum[8][8], const float a_reg[8], const float b_reg[8]) {
    #pragma unroll
    for (int i = 0; i < 8; ++i) {
        #pragma unroll
        for (int j = 0; j < 8; ++j) {
            accum[i][j] += a_reg[i] * b_reg[j]; // 64 FMA operations in 1 cycle
        }
    }
}`,
    stageTopics: {
      phase1Theme: 'Register File as L0 Cache: 200 TB/s Aggregate Register Bandwidth',
      phase2Theme: 'Outer-Product Microkernels: Loading 8+8 Elements to Compute 64 FMAs',
      phase3Theme: 'Instruction-Level Parallelism (ILP) & Independent FMA Pipelining',
      phase4Theme: 'Register Allocation Constraints: Keeping Register Count Below 64 per Thread',
      keyPrerequisites: ['Level 15: Tiled GEMM', 'Assembly Analysis'],
      hardwareFocus: 'FMA (Fused Multiply-Add) execution pipelines and register read/write ports.',
      pitfallFocus: 'Register spilling to local memory if micro-tile is too large (e.g. 16x16 = 256 registers).'
    }
  },
  {
    id: 'level_17',
    levelNumber: 17,
    category: 'Deep Learning Matrix Math (GEMM)',
    title: 'Double Buffering & Asynchronous Shared Memory Pipelines',
    subtitle: 'Hiding DRAM load latencies by computing on Buffer A while prefetching into Buffer B',
    badge: 'Double Buffering',
    iconName: 'Zap',
    description: '100 stages designing double-buffered ping-pong shared memory buffers and asynchronous prefetch pipelines.',
    coreTopic: 'Double Buffering & Pipelining',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// Ping-pong double buffer concept in shared memory
__global__ void double_buffer_gemm_stage_${stage}(float* C) {
    __shared__ float sA[2][32][32]; // Buffer 0 and Buffer 1
    int compute_buf = 0;
    int fetch_buf = 1;
    // Overlap compute on sA[compute_buf] while loading sA[fetch_buf]
}`,
    stageTopics: {
      phase1Theme: 'Memory Latency Hiding: The 200-Clock Cycle DRAM Delay Problem',
      phase2Theme: 'Ping-Pong Buffering: Swapping Buffer 0 and Buffer 1 Indices',
      phase3Theme: 'Register Staging of Global Memory Loads Before SRAM Commit',
      phase4Theme: 'Software Pipelining: Loop Prologue, Steady-State & Epilogue Architecture',
      keyPrerequisites: ['Level 16: Register Tiling', 'Instruction Scheduling'],
      hardwareFocus: 'Memory Load/Store Units (LSU) operating concurrently with Math Execution Units.',
      pitfallFocus: 'Overallocating shared memory with dual buffers, exceeding 48 KB default block limit.'
    }
  },
  {
    id: 'level_18',
    levelNumber: 18,
    category: 'Deep Learning Matrix Math (GEMM)',
    title: 'NVIDIA Tensor Cores: WMMA API & FP16/BF16 MMA Instructions',
    subtitle: 'Direct hardware 16x16x16 matrix multiply-accumulate on specialized Tensor Core silicon',
    badge: 'Tensor Cores & WMMA',
    iconName: 'Flame',
    description: '100 stages mastering nvcuda::wmma, fragment types, m16n16k16 matrices, FP16/BF16 mixed-precision, and 10x throughput gains.',
    coreTopic: 'Tensor Cores & WMMA',
    keyHeader: '#include <mma.h>\nusing namespace nvcuda;',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <mma.h>
using namespace nvcuda;

__global__ void wmma_kernel_stage_${stage}(const half* A, const half* B, float* C) {
    // 16x16x16 Tensor Core warp fragment
    wmma::fragment<wmma::matrix_a, 16, 16, 16, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, 16, 16, 16, half, wmma::col_major> b_frag;
    wmma::fragment<wmma::accumulator, 16, 16, 16, float> c_frag;

    wmma::fill_fragment(c_frag, 0.0f);
    wmma::load_matrix_sync(a_frag, A, 16);
    wmma::load_matrix_sync(b_frag, B, 16);
    // Single hardware instruction: C = A * B + C
    wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);
    wmma::store_matrix_sync(C, c_frag, 16, wmma::mem_row_major);
}`,
    stageTopics: {
      phase1Theme: 'Tensor Core Physical Silicon: 4x4 Systolic Arrays Inside Each SM',
      phase2Theme: 'nvcuda::wmma Fragment Data Types & Warp Coordination',
      phase3Theme: 'Mixed Precision Math: FP16 Input Multiplication with FP32 Accumulation',
      phase4Theme: 'Warp-Level Matrix Stride Mapping & Shared Memory Staging for Tensor Cores',
      keyPrerequisites: ['Level 15: Tiled GEMM', 'Half Precision FP16'],
      hardwareFocus: 'Hardware Tensor Core execution pipelines completing 16x16x16 MMA in 16 warp cycles.',
      pitfallFocus: 'Calling wmma functions inside divergent warp branches, resulting in illegal instruction faults.'
    }
  },
  {
    id: 'level_19',
    levelNumber: 19,
    category: 'Deep Learning Matrix Math (GEMM)',
    title: 'Ampere cp.async & Hopper TMA (Tensor Memory Accelerator)',
    subtitle: 'Bypassing registers entirely: Direct Global Memory to Shared Memory hardware DMA',
    badge: 'cp.async & TMA',
    iconName: 'Server',
    description: '100 stages mastering cuda::memcpy_async, PTX cp.async instructions, Hopper TMA descriptors, and asynchronous barriers.',
    coreTopic: 'Asynchronous Copy & TMA',
    keyHeader: '#include <cuda/barrier>\n#include <cuda/memcpy_async>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <cuda/barrier>
#include <cuda/memcpy_async>

__device__ void async_copy_stage_${stage}(float* smem, const float* gmem) {
    // cp.async: Direct DRAM -> SRAM copy bypassing CPU/GPU register file!
    asm volatile("cp.async.ca.shared.global [%0], [%1], 16;" :: "r"(smem), "l"(gmem));
    asm volatile("cp.async.commit_group;");
}`,
    stageTopics: {
      phase1Theme: 'The Register Bottleneck in Memory Transfers: Why Loading into Registers Wastes Cycles',
      phase2Theme: 'Ampere cp.async.ca / cp.async.cg Hardware Instructions',
      phase3Theme: 'cuda::barrier (Asynchronous Arrival and Wait Primitives)',
      phase4Theme: 'Hopper TMA (Tensor Memory Accelerator) Multidimensional Tensor Hardware DMA',
      keyPrerequisites: ['Level 17: Double Buffering', 'PTX Basics'],
      hardwareFocus: 'Dedicated hardware Async Copy engines copying directly from DRAM to SM SRAM.',
      pitfallFocus: 'Reading shared memory before cp.async.wait_group finishes, reading garbage data.'
    }
  },
  {
    id: 'level_20',
    levelNumber: 20,
    category: 'Fused Deep Learning Kernels',
    title: 'Fused Elementwise Activations (GELU, SiLU, SwiGLU & QuickGELU)',
    subtitle: 'Eliminating memory round-trips by fusing non-linear activation functions with math operations',
    badge: 'Fused Activations',
    iconName: 'Flame',
    description: '100 stages writing ultra-fast vector-fused GELU (tanh approximation), SiLU (Swish), and SwiGLU (LLaMA architecture) kernels.',
    coreTopic: 'Fused Elementwise Activations',
    keyHeader: '#include <cuda_runtime.h>\n#include <cuda_fp16.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <cmath>

// Fast GELU using hardware tanh approximation
__device__ inline float fast_gelu_stage_${stage}(float x) {
    const float k0 = 0.79788456f; // sqrt(2/pi)
    const float k1 = 0.044715f;
    return 0.5f * x * (1.0f + tanhf(k0 * (x + k1 * x * x * x)));
}`,
    stageTopics: {
      phase1Theme: 'Memory Round-Trip Penalty: Why PyTorch Separate Ops Starve the GPU',
      phase2Theme: 'GELU Math Formulations: Error Function (erf) vs Tanh Approximation',
      phase3Theme: 'SiLU and SwiGLU Gated Multi-Layer Perceptron Math (LLaMA & Mistral)',
      phase4Theme: 'Vectorized float4 / half2 Fused Activation Benchmarks (98% Memory Saturation)',
      keyPrerequisites: ['Level 8: float4 Coalescing', 'Calculus/Activations'],
      hardwareFocus: 'Special Function Units (SFU) executing transcendentals (tanh, exp) in silicon.',
      pitfallFocus: 'Computing expensive standard erf() instead of polynomial or fast tanh approximations.'
    }
  },
  {
    id: 'level_21',
    levelNumber: 21,
    category: 'Fused Deep Learning Kernels',
    title: 'High-Performance Reduction: LayerNorm & Welford\'s Algorithm',
    subtitle: 'Numerically stable single-pass mean and variance calculation without catastrophic cancellation',
    badge: 'LayerNorm & Welford',
    iconName: 'Activity',
    description: '100 stages mastering Welford\'s one-pass algorithm, warp reduction of tuples (count, mean, M2), and fused LayerNorm kernels.',
    coreTopic: 'LayerNorm & Welford Algorithm',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

struct WelfordData_Stage${stage} { float count; float mean; float M2; };

__device__ inline WelfordData_Stage${stage} welford_combine(WelfordData_Stage${stage} a, WelfordData_Stage${stage} b) {
    if (a.count == 0.0f) return b;
    if (b.count == 0.0f) return a;
    float count = a.count + b.count;
    float delta = b.mean - a.mean;
    float mean = a.mean + delta * b.count / count;
    float M2 = a.M2 + b.M2 + delta * delta * a.count * b.count / count;
    return {count, mean, M2};
}`,
    stageTopics: {
      phase1Theme: 'Two-Pass vs One-Pass Algorithms: Catastrophic Floating-Point Cancellation',
      phase2Theme: 'Welford\'s Parallel Merge Equations for Mean and Variance',
      phase3Theme: 'Warp-Shuffle Tuple Reduction of (count, mean, M2) in 5 Steps',
      phase4Theme: 'Fused Affine Transformation (gamma * x_hat + beta) in Same Register Pass',
      keyPrerequisites: ['Level 12: Warp Shuffles', 'Numerical Analysis'],
      hardwareFocus: 'ALU arithmetic pipelining combining stats without intermediate global memory writes.',
      pitfallFocus: 'Using naive sum(x^2) - (sum(x))^2/N which overflows or suffers loss of significance in FP16.'
    }
  },
  {
    id: 'level_22',
    levelNumber: 22,
    category: 'Fused Deep Learning Kernels',
    title: 'RMSNorm & Fused Residual Connections in Modern LLMs',
    subtitle: 'Zero-mean Root Mean Square Normalization powering LLaMA-2, LLaMA-3, and Gemma architectures',
    badge: 'RMSNorm & Residuals',
    iconName: 'CheckCircle2',
    description: '100 stages optimizing RMSNorm (7% faster than LayerNorm), residual tensor add fusion, and 16-bit BF16 implementations.',
    coreTopic: 'RMSNorm & Residual Fusion',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__global__ void rmsnorm_fused_stage_${stage}(float* out, const float* in, const float* residual, const float* weight, int dim, float eps) {
    // Fuses: x = in + residual; out = (x / rms(x)) * weight in a single pass
}`,
    stageTopics: {
      phase1Theme: 'Why Modern LLMs Dropped LayerNorm Mean Tracking in Favor of RMSNorm',
      phase2Theme: 'Root Mean Square Formulation: rms(x) = sqrt(1/N * sum(x^2) + eps)',
      phase3Theme: 'Fusing the Residual Connection Add Directly into the RMSNorm Register Pipeline',
      phase4Theme: 'Achieving 2.4 TB/s Effective Memory Bandwidth on H100 HBM3',
      keyPrerequisites: ['Level 21: LayerNorm', 'Transformer Architecture'],
      hardwareFocus: 'Fused Multiply-Add units computing squares and square roots (RSQRT instruction).',
      pitfallFocus: 'Separate PyTorch residual add kernel writing intermediate tensor to DRAM.'
    }
  },
  {
    id: 'level_23',
    levelNumber: 23,
    category: 'Fused Deep Learning Kernels',
    title: 'Online Softmax: 3-Pass vs 2-Pass vs 1-Pass Numerical Stability',
    subtitle: 'Milakov & Gimelshein online algorithm computing softmax in streaming chunks without saving activations',
    badge: 'Online Softmax',
    iconName: 'Zap',
    description: '100 stages dissecting naive 3-pass softmax, safe softmax with running max rescalers, and online single-pass softmax math.',
    coreTopic: 'Online Softmax Algorithm',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>
#include <cmath>

// Online Softmax running tracker updating max and normalized sum
struct OnlineSoftmaxTracker_Stage${stage} {
    float m; // Running max
    float d; // Running denominator (sum of exp(x - m))

    void update(float val) {
        if (val > m) {
            d = d * expf(m - val) + 1.0f;
            m = val;
        } else {
            d += expf(val - m);
        }
    }
};`,
    stageTopics: {
      phase1Theme: 'The Softmax Problem: Exponential Overflow (exp(100) -> Inf) in FP32/FP16',
      phase2Theme: 'Naive 3-Pass Softmax: 1. Max pass -> 2. Sum(exp) pass -> 3. Divide pass',
      phase3Theme: 'Milakov & Gimelshein Online Softmax Math: Dynamic Rescaling Factor exp(m_old - m_new)',
      phase4Theme: 'Foundation for FlashAttention: Why Online Softmax Enables Tiled SRAM Attention',
      keyPrerequisites: ['Level 14: Parallel Reduction', 'Numerical Precision'],
      hardwareFocus: 'Special Function Unit (SFU) executing __expf() and register renormalization.',
      pitfallFocus: 'Recomputing exponentials from scratch instead of applying the dynamic rescaler.'
    }
  },
  {
    id: 'level_24',
    levelNumber: 24,
    category: 'Attention Algorithms & LLMs',
    title: 'Quadratic Attention Bottlenecks & FlashAttention-1 Forward Tiling',
    subtitle: 'Tri Dao\'s breakthrough: Overcoming O(N²) HBM memory footprint via tiled SRAM online softmax',
    badge: 'FlashAttention-1',
    iconName: 'Flame',
    description: '100 stages implementing FlashAttention-1: Q, K, V tiling into shared memory, incremental online softmax, and zero-HBM attention matrices.',
    coreTopic: 'FlashAttention-1 Architecture',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// FlashAttention-1 Tiled SRAM Attention Kernel Conceptual Flow
__global__ void flash_attention_1_stage_${stage}(
    const float* Q, const float* K, const float* V, float* O,
    int seq_len, int d_head
) {
    // 1. Divide Q into blocks of Br, K/V into blocks of Bc
    // 2. Load blocks into SRAM
    // 3. Compute local S = Q * K^T
    // 4. Update running max m and sum d via Online Softmax
    // 5. Accumulate O = O * rescaler + P * V
}`,
    stageTopics: {
      phase1Theme: 'Standard Attention Memory Wall: O(N²) Attention Matrix Siting in DRAM (16 GB for 8K Tokens)',
      phase2Theme: 'FlashAttention-1 Core Insight: Fuse Matmul, Softmax, and Output Matmul in SRAM',
      phase3Theme: 'Iterating Outer Loop Over Keys/Values and Inner Loop Over Queries',
      phase4Theme: 'Backward Pass Recomputation Trick: Storing Only (m, d) Instead of Full Attention Map',
      keyPrerequisites: ['Level 15: Tiled GEMM', 'Level 23: Online Softmax'],
      hardwareFocus: 'Keeping all intermediate attention activations inside 19 TB/s SM SRAM, reducing DRAM traffic by 10x.',
      pitfallFocus: 'Storing intermediate N x N attention matrix to global memory, recreating the memory bottleneck.'
    }
  },
  {
    id: 'level_25',
    levelNumber: 25,
    category: 'Attention Algorithms & LLMs',
    title: 'FlashAttention-2: Outer-Loop Reordering & Register Optimization',
    subtitle: '2x speedup over FlashAttention-1 by swapping loop orders and parallelizing over sequence length',
    badge: 'FlashAttention-2',
    iconName: 'Zap',
    description: '100 stages mastering FlashAttention-2: Q in outer loop, K/V in inner loop, reducing shared memory non-matrix ops, and Warp-GEMM tiling.',
    coreTopic: 'FlashAttention-2 Improvements',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// FlashAttention-2 loop inversion: Outer loop over Q rows, inner loop over K/V blocks
__global__ void flash_attention_2_stage_${stage}() {
    // Swapping loop order eliminates expensive shared memory reads/writes for Output O
    // Output accumulator resides continuously in REGISTERS until completion!
}`,
    stageTopics: {
      phase1Theme: 'FlashAttention-1 Inefficiencies: Shared Memory Overhead on Non-Matmul Operations',
      phase2Theme: 'Outer Loop Inversion: Outer Q Blocks, Inner K/V Blocks (Output Stays in Registers)',
      phase3Theme: 'Parallelization Over Sequence Length (Grid Dimension = Batch * Heads * (Seq / Br))',
      phase4Theme: 'Warp Partitioning Schemes Inside Thread Block (Warp-Specialized Tiling)',
      keyPrerequisites: ['Level 24: FlashAttention-1', 'Level 16: Register Tiling'],
      hardwareFocus: 'Saturating Tensor Core MMA pipelines at 72% theoretical maximum TFLOPs.',
      pitfallFocus: 'Syncing thread block unnecessarily when Output O is already held private in thread registers.'
    }
  },
  {
    id: 'level_26',
    levelNumber: 26,
    category: 'Attention Algorithms & LLMs',
    title: 'FlashDecoding & Split-K Reduction for Long-Context Generation',
    subtitle: 'Solving batch=1 small-batch inference under-utilization by parallelizing across KV sequence keys',
    badge: 'FlashDecoding',
    iconName: 'Layers',
    description: '100 stages mastering FlashDecoding: Split-K decomposition of KV cache, parallel partial attention blocks, and log-sum-exp reduction.',
    coreTopic: 'FlashDecoding & Split-K',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// FlashDecoding Split-K: Splitting KV sequence across multiple SMs for Query Length = 1
__global__ void flash_decode_split_k_stage_${stage}(
    const float* Q, const float* K_cache, const float* V_cache,
    float* partial_out, float* partial_lse, int num_splits
) {
    // Each thread block processes a fraction of the KV cache (e.g. 256 tokens)
    // A secondary reduction kernel merges partial outputs using log-sum-exp
}`,
    stageTopics: {
      phase1Theme: 'The LLM Generation Bottleneck: Query Length = 1 Leaves 90% of GPU SMs Idle',
      phase2Theme: 'Split-K Parallelism: Partitioning Long KV-Cache (32k, 128k) Across Multiple Thread Blocks',
      phase3Theme: 'Computing Partial Output Tensors and Log-Sum-Exp (LSE) Values per Split',
      phase4Theme: 'Final Reduction Kernel: Merging Partial Attentions via Rescaled Softmax Fusion',
      keyPrerequisites: ['Level 25: FlashAttention-2', 'Level 14: Reductions'],
      hardwareFocus: 'Full SM occupancy saturation on H100 (132 SMs) even with batch size = 1.',
      pitfallFocus: 'Combining partial attention vectors without numerically aligning their different max values.'
    }
  },
  {
    id: 'level_27',
    levelNumber: 27,
    category: 'Attention Algorithms & LLMs',
    title: 'PagedAttention & Dynamic KV-Cache Management (vLLM Engine)',
    subtitle: 'Eliminating 80% KV-cache memory waste via OS-style virtual memory paging and block tables',
    badge: 'PagedAttention',
    iconName: 'Box',
    description: '100 stages implementing PagedAttention: Virtual memory page tables for KV blocks, non-contiguous physical allocation, and zero memory fragmentation.',
    coreTopic: 'PagedAttention & Block Tables',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// PagedAttention Kernel: Looking up non-contiguous physical KV blocks via block_tables
__global__ void paged_attention_stage_${stage}(
    const float* Q, const float* k_cache_pool, const float* v_cache_pool,
    const int* block_tables, int block_size, int max_num_blocks_per_seq
) {
    // Maps logical token position to physical block index:
    // physical_block_id = block_tables[seq_id * max_blocks + (token_idx / block_size)]
}`,
    stageTopics: {
      phase1Theme: 'The KV-Cache Memory Problem: Static Max-Length Pre-allocation Wasting 60-80% VRAM',
      phase2Theme: 'Operating System Virtual Memory Analogy: Logical Token Index vs Physical Page Frames',
      phase3Theme: 'Block Table Representation: Dynamic Block Allocation & Copy-On-Write Forking',
      phase4Theme: 'Gathering Non-Contiguous KV Blocks in PagedAttention Kernel with Peak Bandwidth',
      keyPrerequisites: ['Level 26: FlashDecoding', 'Virtual Memory Concepts'],
      hardwareFocus: 'GPU virtual memory translation and non-contiguous coalesced HBM read requests.',
      pitfallFocus: 'Divergent block table index lookups causing non-coalesced cache lines.'
    }
  },
  {
    id: 'level_28',
    levelNumber: 28,
    category: 'Attention Algorithms & LLMs',
    title: 'Low-Bit Quantization Kernels: INT8, INT4 (AWQ/GPTQ) & FP8 (E4M3)',
    subtitle: 'Compressing model weights by 4x to 8x for extreme throughput inference without quality loss',
    badge: 'Quantization & FP8',
    iconName: 'Binary',
    description: '100 stages building symmetric/asymmetric dequantization kernels, 4-bit bit-packing (int4), group-wise scaling, and native Hopper FP8 MMA.',
    coreTopic: 'Quantization & FP8 GEMM',
    keyHeader: '#include <cuda_runtime.h>\n#include <cuda_fp8.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

// INT4 Unpacking & Dequantization (Packs 2 weights per byte)
__device__ inline void unpack_int4_stage_${stage}(uint8_t packed, float scale, float zero, float& w0, float& w1) {
    int val0 = (packed & 0x0F) - 8;
    int val1 = ((packed >> 4) & 0x0F) - 8;
    w0 = (static_cast<float>(val0) - zero) * scale;
    w1 = (static_cast<float>(val1) - zero) * scale;
}`,
    stageTopics: {
      phase1Theme: 'LLM Memory Bottlenecks: Why 70B Models Require Quantization to Fit on Single GPUs',
      phase2Theme: 'Symmetric vs Asymmetric Quantization: Zero Points, Scales & Quantization Error',
      phase3Theme: 'Bit-Packing Mechanics: Packing Two 4-Bit Integers into a Single uint8 Byte',
      phase4Theme: 'Hopper FP8 Formats: E4M3 (Activations & Weights) vs E5M2 (Gradients) & Native MMA',
      keyPrerequisites: ['Level 8: float4 Coalescing', 'Bitwise Arithmetic'],
      hardwareFocus: 'Hopper & Ada Tensor Cores executing INT8, INT4, and FP8 matrix multiplies natively.',
      pitfallFocus: 'Activation outliers causing precision degradation unless protected by per-channel scales.'
    }
  },
  {
    id: 'level_29',
    levelNumber: 29,
    category: 'Asynchronous Concurrency & Streams',
    title: 'CUDA Streams, Dual DMA Engines & Compute/Transfer Overlap',
    subtitle: 'Achieving 100% hardware duty cycle by overlapping bidirectional PCIe transfers with kernel execution',
    badge: 'Streams & DMA',
    iconName: 'Zap',
    description: '100 stages mastering cudaStream_t, non-blocking streams, cudaMemcpyAsync with pinned memory, and multi-stream pipelining.',
    coreTopic: 'CUDA Streams & Overlap',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

void multi_stream_pipeline_stage_${stage}() {
    cudaStream_t s1, s2;
    cudaStreamCreateWithFlags(&s1, cudaStreamNonBlocking);
    cudaStreamCreateWithFlags(&s2, cudaStreamNonBlocking);
    // Pipeline: Stream 1 transfers while Stream 2 computes simultaneously!
    cudaStreamDestroy(s1);
    cudaStreamDestroy(s2);
}`,
    stageTopics: {
      phase1Theme: 'The Default Stream (Stream 0) Trap: Implicit Serialization of Entire GPU',
      phase2Theme: 'cudaStreamCreateWithFlags(&stream, cudaStreamNonBlocking) for True Concurrency',
      phase3Theme: 'Dual DMA Copy Engines: Concurrently Copying Host-to-Device and Device-to-Host',
      phase4Theme: 'Pipelining Large Datasets in N Chunks to Completely Hide PCIe Latency',
      keyPrerequisites: ['Level 6: Runtime Memory', 'Concurrency Models'],
      hardwareFocus: 'Hardware Work Queues (HWQ) and independent asynchronous Copy Engines (CE).',
      pitfallFocus: 'Passing pageable host memory to cudaMemcpyAsync, silently degrading to synchronous execution.'
    }
  },
  {
    id: 'level_30',
    levelNumber: 30,
    category: 'Asynchronous Concurrency & Streams',
    title: 'CUDA Graphs: Stream Capture, Node Updates & Zero-Overhead Launch',
    subtitle: 'Eliminating CPU driver launch overhead by capturing entire execution DAGs into single launch packets',
    badge: 'CUDA Graphs',
    iconName: 'GitFork',
    description: '100 stages mastering cudaStreamBeginCapture, cudaGraphInstantiate, cudaGraphLaunch, and in-place cudaGraphExecKernelNodeSetParams.',
    coreTopic: 'CUDA Graphs & DAGs',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

void capture_graph_stage_${stage}() {
    cudaStream_t stream;
    cudaStreamCreate(&stream);
    cudaStreamBeginCapture(stream, cudaStreamCaptureModeGlobal);
    // Kernel operations are recorded into a static graph DAG
    cudaGraph_t graph;
    cudaStreamEndCapture(stream, &graph);
    cudaGraphExec_t instance;
    cudaGraphInstantiate(&instance, graph, nullptr, nullptr, 0);
    // Replay 1000 times with ZERO CPU submission overhead:
    cudaGraphLaunch(instance, stream);
}`,
    stageTopics: {
      phase1Theme: 'The CPU Launch Overhead Problem: 3-5 µs Driver Overhead Starving Fast Kernels',
      phase2Theme: 'Stream Capture API: cudaStreamBeginCapture and cudaStreamEndCapture',
      phase3Theme: 'Executable Graph Instantiation (cudaGraphInstantiate) & Hardware Command Packets',
      phase4Theme: 'In-Place Parameter Updates via cudaGraphExecKernelNodeSetParams (2 µs Rebinding)',
      keyPrerequisites: ['Level 29: CUDA Streams', 'Graph/DAG Theory'],
      hardwareFocus: 'GPU Hardware Command Streamers accepting pre-compiled execution DAGs in single DMA bursts.',
      pitfallFocus: 'Calling synchronous APIs (cudaMalloc, cudaDeviceSynchronize) during stream capture, causing capture failure.'
    }
  },
  {
    id: 'level_31',
    levelNumber: 31,
    category: 'Asynchronous Concurrency & Streams',
    title: 'Dynamic Parallelism & Device-Side Child Grid Launches',
    subtitle: 'Spawning child GPU kernels directly from inside a parent GPU thread without CPU intervention',
    badge: 'Dynamic Parallelism',
    iconName: 'Server',
    description: '100 stages mastering device-side <<<>>> launch syntax, cudaDeviceSynchronize() in kernels, recursive quadtrees, and -rdc=true.',
    coreTopic: 'Dynamic Parallelism',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

__global__ void child_kernel_stage_${stage}(int task_id) {
    // Device-side child thread computation
}

__global__ void parent_kernel_stage_${stage}() {
    if (threadIdx.x == 0) {
        // Parent thread spawns child grid directly from GPU hardware!
        child_kernel_stage_${stage}<<<4, 32>>>(1);
        cudaDeviceSynchronize(); // Device-side synchronization
    }
}`,
    stageTopics: {
      phase1Theme: 'When CPU Cannot Predict Workload: Adaptive Meshes, Quadtrees & Dynamic Graphs',
      phase2Theme: 'Device Runtime Library (cudadevrt.lib) & Relocatable Device Code (-rdc=true)',
      phase3Theme: 'Designated Thread Launch Discipline: Preventing 1000s of Threads from Spawning Simultaneously',
      phase4Theme: 'Device-Side Synchronizations & Hardware Queue Limits (cudaLimitDevRuntimePendingLaunchCount)',
      keyPrerequisites: ['Level 4: Silicon Architecture', 'Recursion'],
      hardwareFocus: 'SM command processors submitting child task descriptors directly into the hardware queue.',
      pitfallFocus: 'Forgetting -rdc=true compile flag, resulting in unresolved external symbol errors.'
    }
  },
  {
    id: 'level_32',
    levelNumber: 32,
    category: 'Multi-GPU & Distributed Systems',
    title: 'Multi-GPU Systems: cudaSetDevice & Peer-to-Peer (P2P) Direct DMA',
    subtitle: 'Direct GPU-to-GPU memory dereferencing over 900 GB/s NVLink interconnects without CPU staging',
    badge: 'Multi-GPU & P2P',
    iconName: 'Server',
    description: '100 stages mastering cudaSetDevice, thread-local contexts, cudaDeviceEnablePeerAccess, and direct cross-device memory pointers.',
    coreTopic: 'Multi-GPU & NVLink P2P',
    keyHeader: '#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <cuda_runtime.h>

void setup_p2p_stage_${stage}() {
    cudaSetDevice(0);
    // Enables GPU 0 to read/write GPU 1 memory directly over NVLink
    cudaDeviceEnablePeerAccess(1, 0);
}`,
    stageTopics: {
      phase1Theme: 'Multi-GPU Host Management & Thread-Local Active Device ID Discipline',
      phase2Theme: 'The CPU Memory Bottleneck: Why Staging Inter-GPU Copies Through Host RAM Fails',
      phase3Theme: 'Peer-to-Peer (P2P) DMA: cudaDeviceCanAccessPeer & cudaDeviceEnablePeerAccess',
      phase4Theme: 'Direct Pointer Dereferencing: GPU 0 SM Directly Reading VRAM Addresses in GPU 1',
      keyPrerequisites: ['Level 6: Runtime Memory', 'Multi-Threading'],
      hardwareFocus: 'NVLink crossbar routing transactions directly between GPU memory controllers.',
      pitfallFocus: 'Forgetting that cudaSetDevice is thread-local; spawning a new std::thread resets device context to 0.'
    }
  },
  {
    id: 'level_33',
    levelNumber: 33,
    category: 'Multi-GPU & Distributed Systems',
    title: 'NCCL Collective Operations: Ring-AllReduce & AllGather',
    subtitle: 'Bandwidth-optimal distributed gradient synchronization across multi-GPU and multi-node clusters',
    badge: 'NCCL Collectives',
    iconName: 'Network',
    description: '100 stages mastering ncclCommInitRank, ncclAllReduce, Ring-AllReduce algorithm phases (ReduceScatter + AllGather), and InfiniBand RDMA.',
    coreTopic: 'NCCL & Ring-AllReduce',
    keyHeader: '#include <nccl.h>\n#include <cuda_runtime.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <nccl.h>
#include <cuda_runtime.h>

void nccl_allreduce_stage_${stage}(float* d_buf, int size, ncclComm_t comm, cudaStream_t stream) {
    // Distributed elementwise sum across all GPUs
    ncclAllReduce(d_buf, d_buf, size, ncclFloat, ncclSum, comm, stream);
}`,
    stageTopics: {
      phase1Theme: 'Collective Communication Primitives: AllReduce, AllGather, ReduceScatter, Broadcast',
      phase2Theme: 'Why Master-Worker Fails: Bottlenecking Master Memory Bus on Large Models',
      phase3Theme: 'Ring-AllReduce Mathematical Proof: Total Data Transferred is 2 * (P-1)/P * N (Independent of P!)',
      phase4Theme: 'NCCL Group Calls (ncclGroupStart / ncclGroupEnd) to Prevent Distributed Deadlocks',
      keyPrerequisites: ['Level 32: Multi-GPU P2P', 'Networking Fundamentals'],
      hardwareFocus: 'GPU SMs driving data directly into NVLink and GPUDirect RDMA network adapters.',
      pitfallFocus: 'Launching collectives without ncclGroupStart when managing multiple GPUs from a single host thread.'
    }
  },
  {
    id: 'level_34',
    levelNumber: 34,
    category: 'Multi-GPU & Distributed Systems',
    title: 'Megatron-LM Tensor Parallelism (TP) & 1F1B Pipeline Parallelism (PP)',
    subtitle: 'Partitioning trillion-parameter models across hundreds of GPUs with minimal communication bubbles',
    badge: 'Tensor & Pipeline Parallelism',
    iconName: 'Layers',
    description: '100 stages mastering ColumnParallelLinear, RowParallelLinear, AllReduce fusion, 1F1B scheduling, and activation checkpointing.',
    coreTopic: 'Megatron Tensor & Pipeline Parallelism',
    keyHeader: '#include <iostream>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <iostream>

void megatron_tp_plan_stage_${stage}(int hidden_dim, int ffn_dim, int tp_size) {
    // 1. ColumnParallelLinear W1: Splits along columns (0 bytes communicated!)
    // 2. RowParallelLinear W2: Splits along rows (Single fused AllReduce at the end!)
}`,
    stageTopics: {
      phase1Theme: 'When Models Exceed Single-GPU Capacity: 70B & 405B Parameter Memory Footprints',
      phase2Theme: 'Shoeybi et al. Megatron-LM 2-Layer Decomposition: ColumnParallel + RowParallel',
      phase3Theme: 'Only 2 AllReduce Operations per Transformer Layer Over NVLink (Sub-Millisecond)',
      phase4Theme: '1F1B (One Forward, One Backward) Pipeline Scheduling Bounding Peak Activation Memory',
      keyPrerequisites: ['Level 33: NCCL Collectives', 'Transformer Architecture'],
      hardwareFocus: 'NVLink 4/5 900-1800 GB/s interconnects preventing communication from stalling compute.',
      pitfallFocus: 'Attempting Tensor Parallelism across slow PCIe or standard Ethernet without NVLink.'
    }
  },
  {
    id: 'level_35',
    levelNumber: 35,
    category: 'Multi-GPU & Distributed Systems',
    title: 'DeepSpeed ZeRO-1, ZeRO-2, ZeRO-3 Memory Partitioning',
    subtitle: 'Eliminating duplicate optimizer states, gradients, and parameters with zero memory redundancy',
    badge: 'ZeRO Memory Partitioning',
    iconName: 'Box',
    description: '100 stages mastering ZeRO-1 (optimizer sharding), ZeRO-2 (gradient sharding), ZeRO-3 (parameter sharding), and double-buffered prefetching.',
    coreTopic: 'ZeRO Memory Partitioning',
    keyHeader: '#include <iostream>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <iostream>

void calculate_zero_footprint_stage_${stage}(long long params, int num_gpus) {
    // Shards 16 bytes/param (weights, grads, Adam states) across all P GPUs with zero redundancy
}`,
    stageTopics: {
      phase1Theme: 'DDP Memory Breakdown: Why Adam Optimizer States Consume 75% of GPU VRAM (12 Bytes/Param)',
      phase2Theme: 'ZeRO-Stage 1: Sharding Optimizer States (4x Memory Reduction with Zero Extra Comm)',
      phase3Theme: 'ZeRO-Stage 2: Sharding Gradients (2x Additional Memory Reduction)',
      phase4Theme: 'ZeRO-Stage 3: Just-In-Time Parameter AllGather & Immediate Release',
      keyPrerequisites: ['Level 33: NCCL Collectives', 'Adam Optimizer Math'],
      hardwareFocus: 'Prefetching partitioned parameters asynchronously over the network while computing current layer.',
      pitfallFocus: 'ZeRO-3 communication overhead if overlapping prefetch streams are improperly synchronized.'
    }
  },
  {
    id: 'level_36',
    levelNumber: 36,
    category: 'Production PyTorch & Infra',
    title: 'Production PyTorch C++ Extensions (pybind11, TORCH_LIBRARY & Fused AdamW)',
    subtitle: 'Bridging custom high-speed CUDA kernels directly into PyTorch with Autograd and torch.compile support',
    badge: 'PyTorch C++ Infra',
    iconName: 'Terminal',
    description: '100 stages building pybind11 modules, TORCH_LIBRARY dispatcher registrations, custom autograd backward engines, caching memory allocators, and fused AdamW.',
    coreTopic: 'PyTorch C++ Extensions & Autograd',
    keyHeader: '#include <torch/extension.h>\n#include <c10/cuda/CUDAStream.h>',
    sampleKernel: (stage, name) => `// Stage ${stage}: ${name}
#include <torch/extension.h>
#include <c10/cuda/CUDAStream.h>

// Modern TORCH_LIBRARY operator registration compatible with torch.compile
torch::Tensor custom_op_stage_${stage}(torch::Tensor x) {
    TORCH_CHECK(x.is_cuda(), "Must be a CUDA tensor");
    TORCH_CHECK(x.is_contiguous(), "Must be contiguous");
    return torch::empty_like(x);
}

TORCH_LIBRARY(custom_infra_ops, m) {
    m.def("stage_${stage}_op(Tensor x) -> Tensor");
}`,
    stageTopics: {
      phase1Theme: 'pybind11 C++ Extensions: Passing torch::Tensor and Extracting Raw Device Pointers',
      phase2Theme: 'Modern TORCH_LIBRARY & TORCH_LIBRARY_IMPL Dispatcher Integration (torch.compile Native)',
      phase3Theme: 'Custom Autograd Engine: torch::autograd::Function with Analytic Backward Passes',
      phase4Theme: 'Production Systems: CUDA Caching Allocators, Fused AdamW, and Numerical Gradcheck',
      keyPrerequisites: ['Level 3: Allocators', 'Level 20: Fused Activations'],
      hardwareFocus: 'Zero-copy pointer handoff between Python interpreter and raw GPU virtual memory addresses.',
      pitfallFocus: 'Calling .data_ptr() on non-contiguous tensors or allocating in default stream instead of c10 stream.'
    }
  }
];

// Generate exactly 100 stages for any given level definition
export function generate100StagesForLevel(levelDef: LevelDefinition): CurriculumTopic[] {
  const stages: CurriculumTopic[] = [];

  for (let stageNum = 1; stageNum <= 100; stageNum++) {
    const artifact = synthesizeStage(levelDef, stageNum);

    let phaseName = '';
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Beginner';

    if (stageNum <= 25) {
      phaseName = `Phase 1: Foundations & Architecture (Stages 1–25)`;
      difficulty = stageNum <= 12 ? 'Beginner' : 'Intermediate';
    } else if (stageNum <= 50) {
      phaseName = `Phase 2: Algorithmic Implementation & Kernels (Stages 26–50)`;
      difficulty = 'Intermediate';
    } else if (stageNum <= 75) {
      phaseName = `Phase 3: Hardware Specialization & Warp Mechanics (Stages 51–75)`;
      difficulty = 'Advanced';
    } else {
      phaseName = `Phase 4: Peak Saturation, Profiling & Production Deployment (Stages 76–100)`;
      difficulty = 'Expert';
    }

    stages.push({
      id: `${levelDef.id}_stage_${stageNum}`,
      stageNumber: stageNum,
      exampleNumber: stageNum,
      phase: phaseName,
      difficulty,
      title: artifact.title,
      subtitle: `${levelDef.coreTopic} • ${artifact.subtitle}`,
      readTime: stageNum <= 25 ? '12 min' : stageNum <= 50 ? '15 min' : stageNum <= 75 ? '18 min' : '22 min',
      prerequisites: stageNum === 1
        ? levelDef.stageTopics.keyPrerequisites
        : [`Stage ${stageNum - 1}: Previous progression step`],
      concepts: artifact.concepts,
      cPlusPlusTheory: artifact.cPlusPlusTheory,
      hardwareMechanics: artifact.hardwareMechanics,
      kernelCode: artifact.kernelCode,
      kernelExplanation: artifact.kernelExplanation,
      commonPitfalls: artifact.commonPitfalls,
      benchmarkingNotes: artifact.benchmarkingNotes
    });
  }

  return stages;
}

// Generates the complete 36-level, 100-stage curriculum (3,600 stages total!)
export function buildCompleteCurriculum(): CurriculumLevel[] {
  return LEVEL_DEFINITIONS.map((def) => {
    return {
      id: def.id,
      levelNumber: def.levelNumber,
      category: def.category,
      title: def.title,
      subtitle: def.subtitle,
      badge: def.badge,
      iconName: def.iconName,
      description: def.description,
      topics: generate100StagesForLevel(def)
    };
  });
}
