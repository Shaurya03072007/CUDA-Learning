import { CurriculumLevel } from '../../types';

export const LEVEL_3: CurriculumLevel = {
  id: 'level_3',
  levelNumber: 3,
  title: 'Shared Memory & Bank Conflict Elimination',
  subtitle: 'Mastering on-chip SRAM, 32-bank mapping, warp shuffle intrinsics, and parallel reduction',
  badge: 'SRAM Optimization',
  iconName: 'Binary',
  description: '11 progressive examples mastering on-chip __shared__ memory, bank conflict diagnosis and elimination via padding, warp shuffle down primitives, block-level reductions, and 2D matrix transpose.',
  topics: [
    {
      id: 'ex_35_shared_memory_intro',
      exampleNumber: 35,
      difficulty: 'Beginner',
      title: 'Ex 35: On-Chip Shared Memory (__shared__) & __syncthreads()',
      subtitle: 'Allocating user-managed SRAM and synchronizing threads within a block',
      readTime: '12 min',
      prerequisites: ['Ex 25: The 5-Tier Memory Hierarchy'],
      concepts: [
        'User-managed on-chip SRAM: Up to 228 KB per SM on NVIDIA Hopper',
        'The __shared__ memory space shared among all threads in a block',
        'Block synchronization barrier: __syncthreads()',
        'Avoiding data races between shared memory writes and reads'
      ],
      cPlusPlusTheory: `Shared memory is high-speed, on-chip SRAM physically located inside each Streaming Multiprocessor (SM).
Unlike hardware L1 cache (which is controlled automatically by hardware heuristics), shared memory is completely user-managed.
Threads in a block write data into '__shared__' memory, call '__syncthreads()' to guarantee all writes are visible, and then collaboratively read and compute on that data at SRAM speeds (~15 TB/s aggregate).`,
      hardwareMechanics: `Shared memory has a latency of only ~20 clock cycles (vs 400+ cycles for global memory).
__syncthreads() is a hardware barrier instruction (BAR.SYNC). The SM pauses any warp that hits the barrier until all warps in the thread block arrive at the barrier.`,
      kernelCode: `// Example 35: Reverse Array using On-Chip Shared Memory
#include <iostream>
#include <cuda_runtime.h>

__global__ void reverse_array_shared(const float* in, float* out, int N) {
    // Statically allocated on-chip shared memory buffer (256 floats = 1 KB)
    __shared__ float s_data[256];

    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    // 1. Collaborative load from global DRAM into fast shared memory
    if (idx < N) {
        s_data[tid] = in[idx];
    }

    // 2. Hardware barrier: Wait until all 256 threads finish loading!
    __syncthreads();

    // 3. Read in reverse order from shared memory and write to global DRAM
    if (idx < N) {
        out[idx] = s_data[blockDim.x - 1 - tid];
    }
}

int main() {
    std::cout << "Demonstrated on-chip shared memory loading and __syncthreads() barrier.\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: __shared__ float s_data[256] resides in on-chip SRAM, accessible by all threads in the block.',
        'Line 13: Threads collaboratively load data from DRAM into SRAM.',
        'Line 17: __syncthreads() prevents RAW (Read-After-Write) hazard where a thread reads uninitialized SRAM.',
        'Line 21: Reads from SRAM in reverse with ~20 cycles latency.'
      ],
      commonPitfalls: [
        'Placing __syncthreads() inside divergent branches (e.g. if (tid < 16) __syncthreads();); this causes undefined behavior and hardware GPU hang.',
        'Forgetting __syncthreads(), leading to non-deterministic race conditions.'
      ],
      benchmarkingNotes: 'SRAM delivers ~15 TB/s aggregate bandwidth across all SMs—roughly 5x to 10x faster than HBM3.'
    },
    {
      id: 'ex_36_bank_conflict_theory',
      exampleNumber: 36,
      difficulty: 'Intermediate',
      title: 'Ex 36: The 32-Bank Architecture & Bank Conflict Diagnosis',
      subtitle: 'Understanding how 32 independent 4-byte memory banks cause serialized access stalls',
      readTime: '15 min',
      prerequisites: ['Ex 35: Shared Memory Intro'],
      concepts: [
        'Shared memory organization: 32 independent 4-byte memory banks',
        'Bank address mapping: Bank ID = (Word Address) % 32',
        'Conflict-free access: All 32 threads accessing distinct banks',
        'N-way bank conflict: N threads in a warp requesting different addresses in the same bank'
      ],
      cPlusPlusTheory: `Shared memory is divided into 32 equally-sized memory banks of 4-byte (32-bit) words.
- Successive 32-bit words are assigned to successive banks:
  - Bank 0: Words 0, 32, 64, 96...
  - Bank 1: Words 1, 33, 65, 97...
  - Bank 31: Words 31, 63, 95...
When all 32 threads in a warp access different banks, the accesses are served simultaneously in 1 cycle.
If 2 threads access different addresses in Bank 0 -> 2-way bank conflict (2 cycles).
If all 32 threads access different addresses in Bank 0 -> 32-way bank conflict (32 cycles)!`,
      hardwareMechanics: `Exception: Broadcast mechanism.
If multiple threads in a warp read the EXACT SAME address in a bank, the hardware broadcasts the word to all requesting threads in a single cycle without conflict.`,
      kernelCode: `// Example 36: Conflict-Free vs 2-Way vs 32-Way Bank Conflict Kernels
#include <iostream>
#include <cuda_runtime.h>

__global__ void bank_conflict_demo(float* out) {
    __shared__ float s_mem[1024];

    int tid = threadIdx.x;

    // CASE 1: 100% Conflict-Free (Stride 1)
    // Thread 0 -> Bank 0, Thread 1 -> Bank 1 ... Thread 31 -> Bank 31
    float val1 = s_mem[tid]; 

    // CASE 2: 2-Way Bank Conflict (Stride 2)
    // Thread 0 and Thread 16 both target Bank 0!
    float val2 = s_mem[tid * 2];

    // CASE 3: Catastrophic 32-Way Bank Conflict (Stride 32)
    // All 32 threads in Warp 0 target Bank 0! (Serialized to 32 cycles)
    float val3 = s_mem[tid * 32];

    out[tid] = val1 + val2 + val3;
}

int main() {
    std::cout << "Stride 1: 1 cycle | Stride 2: 2 cycles | Stride 32: 32 serialized cycles!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 11: Stride 1 assigns each thread to a unique bank (tid % 32), executing in 1 cycle.',
        'Line 15: Stride 2 causes threads 0 and 16 to both hit Bank 0, serializing into 2 cycles.',
        'Line 19: Stride 32 forces all 32 threads to hit Bank 0, serializing into 32 consecutive clock cycles.'
      ],
      commonPitfalls: [
        'Accessing shared memory 2D arrays with column indexing ' + 's_tile[row][tid]' + ' without padding.',
        'Confusing bank conflicts (Shared Memory) with uncoalesced memory (Global Memory).'
      ],
      benchmarkingNotes: 'A 32-way bank conflict slows down shared memory throughput by up to 96%.'
    },
    {
      id: 'ex_37_bank_conflict_padding',
      exampleNumber: 37,
      difficulty: 'Intermediate',
      title: 'Ex 37: Eliminating 2D Bank Conflicts with Padding (+1 Float)',
      subtitle: 'The classic padding trick: float tile[32][33] for conflict-free row and column access',
      readTime: '15 min',
      prerequisites: ['Ex 36: Bank Conflict Theory'],
      concepts: [
        '2D Shared Memory Matrix Tiling: float tile[32][32]',
        'Why column access tile[i][tid] causes catastrophic 32-way bank conflicts',
        'Adding 1 dummy element of padding: float tile[32][33]',
        'Diagonal skewing of bank assignments'
      ],
      cPlusPlusTheory: `In matrix transpose or convolution algorithms, threads write to shared memory along rows and read along columns:
If 'tile[32][32]' is used:
- Word (row, col) is at address: row * 32 + col.
- When threads read along a column (col = tid, for a fixed row):
  Address of thread tid = tid * 32 + col -> all 32 threads hit Bank (col % 32)! (32-way conflict).
If we add 1 element of padding: 'tile[32][33]':
- Address of thread tid = tid * 33 + col = tid * 32 + tid + col.
- The bank is: (tid * 33 + col) % 32 = (tid + col) % 32.
Every thread now maps to a completely unique bank—100% conflict-free!`,
      hardwareMechanics: `Adding a single 4-byte padding float shifts the memory alignment of each row by exactly one 4-byte bank.
This skews the bank distribution diagonally across the SRAM array with virtually zero memory overhead (only 32 extra floats = 128 bytes).`,
      kernelCode: `// Example 37: Matrix Transpose with +1 Padding Trick
#include <iostream>
#include <cuda_runtime.h>

const int TILE_DIM = 32;

// BAD: tile[32][32] has 32-way bank conflicts during column reads
__global__ void transpose_naive(const float* in, float* out, int width, int height) {
    __shared__ float tile[TILE_DIM][TILE_DIM]; // Bank conflicts!
    // ...
}

// OPTIMIZED: tile[32][33] (+1 float padding completely eliminates bank conflicts!)
__global__ void transpose_padded(const float* in, float* out, int width, int height) {
    __shared__ float tile[TILE_DIM][TILE_DIM + 1]; // +1 float padding!

    int x = blockIdx.x * TILE_DIM + threadIdx.x;
    int y = blockIdx.y * TILE_DIM + threadIdx.y;

    // Coalesced read from global memory into shared memory
    if (x < width && y < height) {
        tile[threadIdx.y][threadIdx.x] = in[y * width + x];
    }
    __syncthreads();

    // Transposed coordinates
    x = blockIdx.y * TILE_DIM + threadIdx.x;
    y = blockIdx.x * TILE_DIM + threadIdx.y;

    // Conflict-free read from shared memory and coalesced write to global memory
    if (x < height && y < width) {
        out[y * height + x] = tile[threadIdx.x][threadIdx.y];
    }
}

int main() {
    std::cout << "tile[32][33] eliminates all 32-way bank conflicts with only 128 bytes of padding!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 13: __shared__ float tile[32][33] introduces 1 dummy float per row.',
        'Line 19: Writes along rows (threadIdx.x) with 100% coalescing and zero bank conflicts.',
        'Line 28: Reads along columns (tile[threadIdx.x][threadIdx.y]) with ZERO bank conflicts due to diagonal skewing.'
      ],
      commonPitfalls: [
        'Forgetting the padding dimension when calculating flat 1D offsets inside shared memory.',
        'Applying padding to global memory instead of shared memory.'
      ],
      benchmarkingNotes: 'Padding tile[32][33] increases matrix transpose throughput from 38% to >94% of theoretical memory bandwidth.'
    },
    {
      id: 'ex_38_parallel_reduction_naive',
      exampleNumber: 38,
      difficulty: 'Intermediate',
      title: 'Ex 38: Parallel Reduction in Shared Memory (Tree-Based)',
      subtitle: 'Reducing 256 elements to a single scalar sum in O(log N) parallel steps',
      readTime: '15 min',
      prerequisites: ['Ex 37: Bank Conflict Padding'],
      concepts: [
        'Reduction operations in deep learning: Sum, Mean, Max, Norm',
        'O(N) sequential CPU reduction vs O(log N) parallel GPU tree reduction',
        'Interleaved reduction addressing vs contiguous reduction addressing',
        'Strided divergence in reduction loops'
      ],
      cPlusPlusTheory: `In a neural network, calculating loss or mean requires summing millions of numbers.
Sequential CPU sum takes N steps.
A parallel tree reduction uses N/2 threads in step 1, N/4 in step 2, down to 1 thread in step log2(N).
For a 1024-thread block, a sum takes only 10 parallel steps (log2(1024) = 10) instead of 1024 sequential steps!`,
      hardwareMechanics: `Each step in the tree reduction halves the number of active threads.
At each step, __syncthreads() ensures all partial sums from the previous step are retired to shared memory before the next step begins.`,
      kernelCode: `// Example 38: Parallel Tree Reduction in Shared Memory
#include <iostream>
#include <cuda_runtime.h>

__global__ void block_reduce_sum(const float* in, float* out, int N) {
    __shared__ float s_data[256];

    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    s_data[tid] = (idx < N) ? in[idx] : 0.0f;
    __syncthreads();

    // Parallel Reduction Tree: Stride doubles each iteration (s = 1, 2, 4, 8, 16, 32, 64, 128)
    for (int s = 1; s < blockDim.x; s *= 2) {
        int index = 2 * s * tid;
        if (index < blockDim.x) {
            s_data[index] += s_data[index + s];
        }
        __syncthreads();
    }

    // Thread 0 holds the final sum of the entire thread block
    if (tid == 0) {
        out[blockIdx.x] = s_data[0];
    }
}

int main() {
    std::cout << "Parallel tree reduction computes block sum in log2(256) = 8 parallel steps!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: s_data holds the elements for 256 threads in fast SRAM.',
        'Line 14: Loop runs log2(blockDim.x) times.',
        'Line 17: Accumulates pairs of elements in parallel.',
        'Line 23: Thread 0 writes the block aggregate result to global memory.'
      ],
      commonPitfalls: [
        'Using index = 2 * s * tid creates bank conflicts and branch divergence; reversed loop strides are faster.',
        'Forgetting __syncthreads() inside the reduction loop causes threads to read stale sums.'
      ],
      benchmarkingNotes: 'Tree reduction in SRAM executes in ~200 nanoseconds per block on Ampere/Hopper.'
    },
    {
      id: 'ex_39_reduction_sequential_addressing',
      exampleNumber: 39,
      difficulty: 'Intermediate',
      title: 'Ex 39: Highly Optimized Reduction with Sequential Addressing',
      subtitle: 'Eliminating bank conflicts and warp divergence by reversing reduction strides',
      readTime: '15 min',
      prerequisites: ['Ex 38: Parallel Reduction Naive'],
      concepts: [
        'Reversed stride reduction: for (int s = blockDim.x / 2; s > 0; s >>= 1)',
        'Sequential addressing guarantees contiguous active threads',
        'Eliminating warp divergence: Full warps remain active while other warps sleep',
        'Conflict-free shared memory access during reduction'
      ],
      cPlusPlusTheory: `In Ex 38, writing 'if (index < blockDim.x)' with stride '2 * s * tid' caused threads 0, 2, 4... to work while threads 1, 3, 5... slept (warp divergence within every warp).
By reversing the stride to:
'for (int s = blockDim.x / 2; s > 0; s >>= 1)'
'if (tid < s) s_data[tid] += s_data[tid + s];'
Threads 0 to s-1 perform work contiguously.
In step 1, Warps 0-3 work while Warps 4-7 sleep—ZERO warp divergence!`,
      hardwareMechanics: `When an entire warp is inactive ('tid >= s'), the warp scheduler simply never dispatches instructions for that warp.
This allows the SM to execute other resident warps with 100% issue slot utilization.`,
      kernelCode: `// Example 39: Sequential Addressing Reduction (Divergence-Free)
#include <iostream>
#include <cuda_runtime.h>

__global__ void block_reduce_sequential(const float* in, float* out, int N) {
    __shared__ float s_data[256];

    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    s_data[tid] = (idx < N) ? in[idx] : 0.0f;
    __syncthreads();

    // Reversed stride: s = 128, 64, 32, 16, 8, 4, 2, 1
    // Contiguous threads (0..s-1) stay active, eliminating intra-warp divergence!
    for (int s = blockDim.x / 2; s > 0; s >>= 1) {
        if (tid < s) {
            s_data[tid] += s_data[tid + s];
        }
        __syncthreads();
    }

    if (tid == 0) out[blockIdx.x] = s_data[0];
}

int main() {
    std::cout << "Sequential addressing reduction eliminates branch divergence and bank conflicts completely!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 15: s starts at blockDim.x / 2 (128) and bitshifts right (s >>= 1) until s reaches 0.',
        'Line 16: if (tid < s) keeps contiguous warps active without interleaving.',
        'Line 17: s_data[tid] and s_data[tid + s] map to distinct banks, eliminating bank conflicts.'
      ],
      commonPitfalls: [
        'Off-by-one errors when blockDim.x is not a power of two.',
        'Omitting __syncthreads() when s > 32.'
      ],
      benchmarkingNotes: 'Sequential addressing runs 2.3x faster than interleaved reduction.'
    },
    {
      id: 'ex_40_warp_shuffle_down',
      exampleNumber: 40,
      difficulty: 'Advanced',
      title: 'Ex 40: Warp Shuffle Down Intrinsics (__shfl_down_sync)',
      subtitle: 'Exchanging data directly between registers in a warp with zero shared memory latency',
      readTime: '15 min',
      prerequisites: ['Ex 39: Reduction Sequential Addressing'],
      concepts: [
        'Register-to-register communication within a 32-thread warp',
        'The __shfl_down_sync intrinsic: Exchanging values across lanes without memory',
        '0-cycle memory latency and zero SRAM footprint',
        'Warp-level reduction without __syncthreads()'
      ],
      cPlusPlusTheory: `Prior to Kepler, exchanging data between threads required writing to Shared Memory, calling __syncthreads(), and reading back.
Warp Shuffle Intrinsics allow threads within the same 32-thread warp to read each other's registers directly over the internal crossbar network:
'__shfl_down_sync(mask, val, offset)'
Thread 'lane_id' reads 'val' from thread 'lane_id + offset' in 1 instruction cycle, with ZERO shared memory allocations and ZERO __syncthreads() barriers!`,
      hardwareMechanics: `The SM contains an internal 32-lane register crossbar.
Shuffle instructions execute as a single ALU/Crossbar instruction (SHFL) with 1 clock cycle latency.`,
      kernelCode: `// Example 40: Single-Warp 32-Thread Reduction using Register Shuffles
#include <iostream>
#include <cuda_runtime.h>

__device__ inline float warp_reduce_sum(float val) {
    // Active mask for all 32 threads in the warp: 0xffffffff
    unsigned int mask = 0xffffffff;

    // Parallel tree reduction entirely inside registers:
    // Lane i adds value from lane i + 16, then i + 8, i + 4, i + 2, i + 1
    val += __shfl_down_sync(mask, val, 16);
    val += __shfl_down_sync(mask, val, 8);
    val += __shfl_down_sync(mask, val, 4);
    val += __shfl_down_sync(mask, val, 2);
    val += __shfl_down_sync(mask, val, 1);

    return val; // Lane 0 holds the total sum of all 32 threads!
}

__global__ void test_warp_reduce(const float* in, float* out) {
    float my_val = in[threadIdx.x];
    float sum = warp_reduce_sum(my_val);
    if (threadIdx.x == 0) out[0] = sum;
}

int main() {
    std::cout << "__shfl_down_sync reduces 32 threads in 5 register instructions without memory!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: mask = 0xffffffff ensures all 32 lanes participate in the synchronization.',
        'Line 10: Lane i receives value from Lane i+16 in a single hardware cycle.',
        'Line 16: Lane 0 now holds the sum of all 32 threads—zero shared memory used.'
      ],
      commonPitfalls: [
        'Passing an incorrect active mask (e.g. if some threads branched away) causes undefined behavior.',
        'Assuming warp shuffle works across different warps; it strictly works within a single 32-thread warp.'
      ],
      benchmarkingNotes: 'Warp shuffles are 4x faster than shared memory reductions and consume 0 bytes of SRAM.'
    },
    {
      id: 'ex_41_two_tier_block_reduction',
      exampleNumber: 41,
      difficulty: 'Advanced',
      title: 'Ex 41: Production Two-Tier Block Reduction (Shuffle + Shared)',
      subtitle: 'Combining register shuffles inside warps with minimal shared memory for inter-warp reduction',
      readTime: '15 min',
      prerequisites: ['Ex 40: Warp Shuffle Down'],
      concepts: [
        'Two-tier reduction pattern used in PyTorch, cuBLAS, and FlashAttention',
        'Tier 1: Each warp reduces 32 threads down to 1 scalar using __shfl_down_sync',
        'Tier 2: Warp leaders write their scalar into a tiny 8-element shared memory buffer',
        'Tier 3: The first warp reduces the 8 warp sums to the final block result'
      ],
      cPlusPlusTheory: `How do production libraries reduce a 256-thread block (8 warps)?
- Don't use 256 floats of shared memory with 8 __syncthreads() calls.
- Instead:
  1. Each of the 8 warps computes its own sum using warp shuffles (zero SRAM, zero barriers).
  2. The 8 warp leaders write to '__shared__ float s_warp_sums[8]'.
  3. Single __syncthreads() barrier.
  4. Warp 0 reduces the 8 numbers with 3 shuffle instructions.
Total shared memory needed: only 32 bytes (8 floats)! Total barriers: only ONE!`,
      hardwareMechanics: `This pattern reduces shared memory consumption by 97% and cuts barrier synchronization stalls from 8 down to 1.
This drastically increases SM occupancy, allowing more concurrent blocks to run.`,
      kernelCode: `// Example 41: Production Two-Tier Block Reduction
#include <iostream>
#include <cuda_runtime.h>

__device__ inline float warp_sum(float val) {
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        val += __shfl_down_sync(0xffffffff, val, offset);
    }
    return val;
}

__device__ float block_sum(float val) {
    // Only 32 floats of shared memory needed for up to 1024 threads (32 warps)!
    static __shared__ float shared_warp_sums[32];

    int lane_id = threadIdx.x % 32;
    int warp_id = threadIdx.x / 32;

    // 1. Warp-level reduction entirely in registers
    val = warp_sum(val);

    // 2. Warp leaders write their sum to shared memory
    if (lane_id == 0) {
        shared_warp_sums[warp_id] = val;
    }
    __syncthreads(); // Single barrier for the entire kernel!

    // 3. First warp reads the warp sums and performs final reduction
    val = (threadIdx.x < (blockDim.x / 32)) ? shared_warp_sums[lane_id] : 0.0f;
    if (warp_id == 0) {
        val = warp_sum(val);
    }

    return val; // Lane 0 holds final block sum!
}

int main() {
    std::cout << "Two-tier reduction: 1 barrier, 32 bytes SRAM, maximum possible GPU occupancy!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 14: Only 32 floats (128 bytes) of shared memory needed, regardless of block size.',
        'Line 20: Each warp computes its sum using pure register shuffles.',
        'Line 26: Only a single __syncthreads() is executed in the entire reduction.',
        'Line 31: Warp 0 computes the final reduction over the warp sums.'
      ],
      commonPitfalls: [
        'Forgetting that only lane_id == 0 holds the valid warp sum before writing to shared memory.',
        'Not masking out lanes when blockDim.x / 32 < 32 in the final warp reduction.'
      ],
      benchmarkingNotes: 'This is the exact reduction algorithm implemented in PyTorch at::native::cuda_reduce.'
    },
    {
      id: 'ex_42_dynamic_shared_memory',
      exampleNumber: 42,
      difficulty: 'Advanced',
      title: 'Ex 42: Dynamic Shared Memory (extern __shared__)',
      subtitle: 'Configuring shared memory allocation size at runtime via the 3rd launch parameter',
      readTime: '15 min',
      prerequisites: ['Ex 41: Two-Tier Block Reduction'],
      concepts: [
        'Static shared memory vs Dynamic shared memory',
        'The extern __shared__ syntax',
        'Passing shared memory byte size as the 3rd <<<grid, block, shmem_bytes>>> parameter',
        'Carving out multiple typed arrays from a single dynamic byte buffer'
      ],
      cPlusPlusTheory: `Static shared memory ('__shared__ float s[256]') requires array sizes to be known at compile time.
When block size or feature dimensions vary at runtime (e.g., hidden dimensions 768, 1024, or 4096 in Transformers), we use Dynamic Shared Memory:
'extern __shared__ char s_buffer[];'
The size is passed dynamically at kernel launch:
'kernel<<<grid, block, dynamic_bytes>>>(...);'`,
      hardwareMechanics: `The CUDA driver allocates the requested shared memory bytes from the SM's physical SRAM pool.
If the requested bytes exceed the default 48 KB limit, you must call 'cudaFuncSetAttribute' with 'cudaFuncAttributeMaxDynamicSharedMemorySize' (up to 228 KB on Hopper).`,
      kernelCode: `// Example 42: Carving Multiple Dynamic Shared Memory Buffers
#include <iostream>
#include <cuda_runtime.h>

__global__ void dynamic_shmem_kernel(const float* in, float* out, int D) {
    // Single dynamically allocated raw byte array
    extern __shared__ char raw_shmem[];

    // Carve buffer into two separate typed arrays:
    // Buffer 1: float array of size D
    float* s_features = reinterpret_cast<float*>(raw_shmem);
    // Buffer 2: int array of size 32 (aligned to 4 bytes)
    int* s_indices = reinterpret_cast<int*>(raw_shmem + D * sizeof(float));

    int tid = threadIdx.x;
    if (tid < D) {
        s_features[tid] = in[tid];
    }
    if (tid < 32) {
        s_indices[tid] = tid;
    }
    __syncthreads();

    if (tid < D) {
        out[tid] = s_features[tid] * 2.0f;
    }
}

int main() {
    int D = 512;
    size_t shmem_bytes = (D * sizeof(float)) + (32 * sizeof(int));

    float *d_in, *d_out;
    cudaMalloc(&d_in, D * sizeof(float));
    cudaMalloc(&d_out, D * sizeof(float));

    // 3rd launch parameter specifies dynamic shared memory in bytes!
    dynamic_shmem_kernel<<<1, 512, shmem_bytes>>>(d_in, d_out, D);
    cudaDeviceSynchronize();

    cudaFree(d_in); cudaFree(d_out);
    std::cout << "Successfully carved dynamic shared memory (" << shmem_bytes << " bytes) at runtime!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: extern __shared__ char raw_shmem[] declares an unsized dynamic buffer.',
        'Line 10: Carves out s_features starting at byte 0.',
        'Line 12: Carves out s_indices starting at offset D * sizeof(float).',
        'Line 35: Passes shmem_bytes as the 3rd parameter in <<<grid, block, shmem_bytes>>>.'
      ],
      commonPitfalls: [
        'Declaring multiple extern __shared__ arrays with different names; in CUDA, all extern __shared__ declarations point to the exact same starting byte address!',
        'Violating memory alignment when carving out types with larger alignment requirements (e.g. double after char).'
      ],
      benchmarkingNotes: 'Dynamic shared memory has zero performance penalty compared to statically declared shared memory.'
    },
    {
      id: 'ex_43_warp_ballot_intrinsics',
      exampleNumber: 43,
      difficulty: 'Advanced',
      title: 'Ex 43: Warp Vote & Ballot Intrinsics (__ballot_sync)',
      subtitle: 'Aggregating boolean predicates across 32 threads into a single 32-bit integer bitmask',
      readTime: '15 min',
      prerequisites: ['Ex 42: Dynamic Shared Memory'],
      concepts: [
        'Warp voting primitives: __all_sync, __any_sync, __ballot_sync',
        'Extracting a 32-bit bitmask where bit i represents the predicate of thread i',
        '__popc (population count) for counting active threads in 1 cycle',
        'Compact filtering and stream compaction without locks'
      ],
      cPlusPlusTheory: `In filtering and sparse tensor operations (e.g., pruning zeros in sparse neural networks), each thread checks a predicate (e.g. 'val > threshold').
'__ballot_sync(mask, predicate)' collects the boolean results from all 32 threads in the warp and packs them into a single 32-bit integer:
- Bit 0 = Thread 0 predicate (1 if true, 0 if false)
- Bit 1 = Thread 1 predicate
- Bit 31 = Thread 31 predicate
Combined with the single-cycle hardware instruction '__popc' (count number of 1 bits), a warp can determine exactly how many elements matched instantly!`,
      hardwareMechanics: `Vote instructions execute inside the warp scheduler in 1 clock cycle via hardware reduction wires connecting all 32 lanes.`,
      kernelCode: `// Example 43: Stream Compaction using __ballot_sync & __popc
#include <iostream>
#include <cuda_runtime.h>

__global__ void count_positives_kernel(const float* in, int* total_positives, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    bool is_positive = (idx < N) && (in[idx] > 0.0f);

    // Pack predicates into a 32-bit integer bitmask
    unsigned int mask = __ballot_sync(0xffffffff, is_positive);

    // Count how many bits are 1 using single-cycle hardware popcount
    int warp_positives = __popc(mask);

    // Lane 0 atomically adds the warp total to global counter
    if ((threadIdx.x % 32) == 0 && warp_positives > 0) {
        atomicAdd(total_positives, warp_positives);
    }
}

int main() {
    std::cout << "__ballot_sync packs 32 thread decisions into a single 32-bit register bitmask!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 7: is_positive evaluates the thread condition.',
        'Line 10: __ballot_sync creates the 32-bit bitmask across all 32 warp lanes.',
        'Line 13: __popc executes the single-cycle POPC assembly instruction.',
        'Line 16: Only lane 0 calls atomicAdd, reducing atomic contention by 32x!'
      ],
      commonPitfalls: [
        'Calling __ballot_sync with an active mask that does not match the actual executing threads, causing hangs.',
        'Assuming ballot works across block boundaries; it is strictly warp-level.'
      ],
      benchmarkingNotes: 'Using ballot to coalesce atomic updates reduces atomic contention by 3200%.'
    },
    {
      id: 'ex_44_cooperative_groups_grid_sync',
      exampleNumber: 44,
      difficulty: 'Expert',
      title: 'Ex 44: Cooperative Groups & Grid-Wide Synchronization',
      subtitle: 'Synchronizing all threads across the entire GPU without relaunching kernels',
      readTime: '15 min',
      prerequisites: ['Ex 43: Warp Ballot Intrinsics'],
      concepts: [
        'The limitation of __syncthreads(): Only synchronizes threads within the SAME block',
        'Why CUDA historically required terminating and relaunching kernels for global synchronization',
        'Cooperative Groups library (cooperative_groups namespace)',
        'cudaLaunchCooperativeKernel and grid_group.sync()'
      ],
      cPlusPlusTheory: `In iterative algorithms (like graph neural networks or multi-layer transformer passes), all blocks across the entire GPU must reach a global consensus.
Historically, the only way to synchronize the entire GPU grid was to return from the kernel to the CPU and launch a second kernel (launch overhead ~4 µs).
Cooperative Groups allows launching a cooperative grid where all blocks can execute:
'cg::grid_group grid = cg::this_grid();'
'grid.sync();'
Synchronizing all resident SMs on the entire chip without returning to the CPU!`,
      hardwareMechanics: `Grid-wide synchronization requires that all launched blocks fit simultaneously on the GPU's SMs.
If you launch more blocks than the GPU can physically hold at one time, grid.sync() would deadlock waiting for non-resident blocks to start.
cudaOccupancyMaxActiveBlocksPerMultiprocessor calculates the exact safe block count.`,
      kernelCode: `// Example 44: Cooperative Groups Grid Synchronization
#include <iostream>
#include <cuda_runtime.h>
#include <cooperative_groups.h>

namespace cg = cooperative_groups;

__global__ void cooperative_global_sync_kernel(int* data, int passes) {
    cg::grid_group grid = cg::this_grid();

    for (int p = 0; p < passes; ++p) {
        int idx = blockIdx.x * blockDim.x + threadIdx.x;
        data[idx] += 1;

        // Synchronize EVERY BLOCK across the ENTIRE GPU simultaneously!
        grid.sync();
    }
}

int main() {
    std::cout << "Cooperative Groups allows multi-pass kernels without CPU relaunch overhead!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 4: #include <cooperative_groups.h> brings modern CUDA C++ synchronization primitives.',
        'Line 9: cg::this_grid() initializes the grid-wide synchronization group.',
        'Line 16: grid.sync() hardware-synchronizes all SMs across the GPU in lockstep.'
      ],
      commonPitfalls: [
        'Launching with standard <<<>>> syntax; cooperative kernels must be launched via cudaLaunchCooperativeKernel.',
        'Launching more blocks than can reside concurrently on the GPU causes an instant deadlock.'
      ],
      benchmarkingNotes: 'grid.sync() takes ~1.5 µs—roughly 3x faster than returning to CPU and relaunching.'
    },
    {
      id: 'ex_45_shared_memory_2d_stencil',
      exampleNumber: 45,
      difficulty: 'Expert',
      title: 'Ex 45: 2D Convolution Stencil & Halo Exchange in SRAM',
      subtitle: 'Caching 2D spatial halos (ghost cells) in shared memory for fast image and tensor convolutions',
      readTime: '15 min',
      prerequisites: ['Ex 44: Cooperative Groups'],
      concepts: [
        'Spatial stencils in Computer Vision and CNNs: 3x3 and 5x5 filters',
        'Boundary elements / Halo cells (ghost cells)',
        'Loading interior vs halo cells into a padded shared memory tile',
        'Eliminating redundant 9x memory loads from global DRAM'
      ],
      cPlusPlusTheory: `In a 3x3 2D convolution, each output pixel needs its own value plus 8 neighboring pixels.
If computed naively in global memory, every pixel is loaded from DRAM 9 separate times!
By caching a 16x16 block of outputs plus a 1-pixel border (halo) in shared memory (18x18 tile):
- DRAM loads drop from 9 loads per pixel to ~1.2 loads per pixel.
- The 9 filter multiply-adds execute at SRAM speeds.`,
      hardwareMechanics: `The boundary threads load the halo cells.
Once loaded, the tile in shared memory serves all 256 output pixels with single-cycle SRAM reads.`,
      kernelCode: `// Example 45: 2D 3x3 Stencil Convolution with Halo Cells in Shared Memory
#include <iostream>
#include <cuda_runtime.h>

const int TILE_W = 16;
const int TILE_H = 16;
const int RADIUS = 1;

__global__ void conv2d_stencil_shmem(const float* in, float* out, int width, int height) {
    // 18x18 tile (16x16 interior + 1-pixel halo border around all sides)
    __shared__ float s_tile[TILE_H + 2 * RADIUS][TILE_W + 2 * RADIUS];

    int tx = threadIdx.x;
    int ty = threadIdx.y;
    int col = blockIdx.x * TILE_W + tx;
    int row = blockIdx.y * TILE_H + ty;

    // Load center cell into shared memory
    int sh_x = tx + RADIUS;
    int sh_y = ty + RADIUS;
    s_tile[sh_y][sh_x] = (row < height && col < width) ? in[row * width + col] : 0.0f;

    // Load halo cells (Left, Right, Top, Bottom)
    if (tx < RADIUS) {
        // Left halo
        int halo_col = col - RADIUS;
        s_tile[sh_y][tx] = (row < height && halo_col >= 0) ? in[row * width + halo_col] : 0.0f;
        // Right halo
        halo_col = col + TILE_W;
        s_tile[sh_y][sh_x + TILE_W] = (row < height && halo_col < width) ? in[row * width + halo_col] : 0.0f;
    }
    if (ty < RADIUS) {
        // Top halo
        int halo_row = row - RADIUS;
        s_tile[ty][sh_x] = (halo_row >= 0 && col < width) ? in[halo_row * width + col] : 0.0f;
        // Bottom halo
        halo_row = row + TILE_H;
        s_tile[sh_y + TILE_H][sh_x] = (halo_row < height && col < width) ? in[halo_row * width + col] : 0.0f;
    }
    __syncthreads();

    // Compute 3x3 stencil convolution directly from fast SRAM
    if (row < height && col < width) {
        float sum = 0.0f;
        for (int dy = -RADIUS; dy <= RADIUS; ++dy) {
            for (int dx = -RADIUS; dx <= RADIUS; ++dx) {
                sum += s_tile[sh_y + dy][sh_x + dx] * 0.111f; // Averaging filter
            }
        }
        out[row * width + col] = sum;
    }
}

int main() {
    std::cout << "2D stencil convolution caches 18x18 halo tiles in SRAM, cutting DRAM traffic by 85%!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 9: __shared__ float s_tile[18][18] holds interior plus boundary ghost cells.',
        'Line 22: Boundary threads collaboratively load the halos without redundant global memory fetches.',
        'Line 37: __syncthreads() ensures the entire 18x18 halo tile is valid.',
        'Line 41: Convolution loop runs entirely from on-chip SRAM with zero global reads.'
      ],
      commonPitfalls: [
        'Forgetting boundary checks when reading halo pixels near image borders (x < 0 or x >= width).',
        'Not synchronizing before reading neighbor pixels from s_tile.'
      ],
      benchmarkingNotes: 'Shared-memory halo tiling delivers a 6.5x speedup over naive direct global memory convolution.'
    }
  ]
};
