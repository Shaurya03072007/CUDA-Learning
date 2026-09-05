import { CurriculumLevel } from '../../types';

export const LEVEL_2: CurriculumLevel = {
  id: 'level_2',
  levelNumber: 2,
  title: 'GPU Memory Hierarchy, Vectorization & Coalescing',
  subtitle: 'Mastering 128-byte DRAM cache sectors, 128-bit float4 loads, constant memory, and register spilling',
  badge: 'Memory Subsystems',
  iconName: 'Layers',
  description: '10 progressive examples mastering global memory transactions, coalesced access patterns, 128-bit vectorized instructions, constant memory broadcasts, and Structure of Arrays.',
  topics: [
    {
      id: 'ex_25_memory_hierarchy_overview',
      exampleNumber: 25,
      difficulty: 'Beginner',
      title: 'Ex 25: The 5-Tier GPU Memory Hierarchy',
      subtitle: 'Registers vs Shared Memory vs L1/L2 Caches vs Global HBM',
      readTime: '12 min',
      prerequisites: ['Ex 13: Host vs Device Memory'],
      concepts: [
        'Registers (0-1 cycle latency, ~30 TB/s aggregate bandwidth)',
        'Shared Memory / L1 Data Cache (1-20 cycles latency, ~15 TB/s)',
        'L2 Cache (100-200 cycles latency, ~5-7 TB/s)',
        'Global Memory / HBM3 (200-800 cycles latency, ~1-3 TB/s)'
      ],
      cPlusPlusTheory: `Understanding where your variables live is the single most critical factor in CUDA performance.
A GPU SM cannot compute directly on HBM DRAM; data must flow through the hierarchy:
HBM -> L2 Cache -> L1 / Shared Memory -> Registers -> ALUs.
If a kernel does not reuse data in registers or shared memory, it spends 95% of its execution time stalled waiting for DRAM memory loads.`,
      hardwareMechanics: `An NVIDIA H100 SM has 64K 32-bit registers (256 KB) per SM, 228 KB of unified Shared Memory/L1, and an aggregate 50 MB L2 cache across the chip.
Registers provide instantaneous access without address calculations.`,
      kernelCode: `// Example 25: Inspecting Memory Hierarchy Placement
#include <iostream>
#include <cuda_runtime.h>

__constant__ float c_weights[256]; // Constant Memory (64 KB cached)

__global__ void memory_tiers_demo(const float* __restrict__ g_in, float* g_out) {
    // 1. Stored in high-speed hardware REGISTER
    float reg_val = g_in[threadIdx.x]; 

    // 2. Stored in on-chip SHARED MEMORY (SRAM)
    __shared__ float s_tile[256];
    s_tile[threadIdx.x] = reg_val;
    __syncthreads();

    // 3. Computed using fast register and constant cache
    float result = s_tile[threadIdx.x] * c_weights[threadIdx.x];

    // 4. Written back to GLOBAL HBM
    g_out[threadIdx.x] = result;
}

int main() {
    std::cout << "Demonstrated placement across Registers, Shared, Constant, and Global Memory\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 4: __constant__ places weights in a dedicated 64 KB cache with single-cycle broadcast.',
        'Line 8: reg_val lives in a 32-bit register with zero latency.',
        'Line 11: __shared__ allocates on-chip SRAM shared across the thread block.',
        'Line 19: Writes final result back to off-chip global DRAM.'
      ],
      commonPitfalls: [
        'Declaring arrays inside kernels without __shared__; dynamic arrays spill to slow local memory (DRAM).',
        'Exceeding 255 registers per thread, which drops SM occupancy.'
      ],
      benchmarkingNotes: 'Register reads take ~1 clock cycle; global HBM accesses take 400+ clock cycles.'
    },
    {
      id: 'ex_26_coalescing_vs_strided',
      exampleNumber: 26,
      difficulty: 'Intermediate',
      title: 'Ex 26: Memory Coalescing vs Strided Access Patterns',
      subtitle: 'Why stride-1 memory access is 10x faster than strided column reads',
      readTime: '15 min',
      prerequisites: ['Ex 25: Memory Hierarchy'],
      concepts: [
        '32-byte cache line sectors in NVIDIA Ampere and Hopper GPUs',
        'Coalesced access: 32 threads accessing contiguous addresses',
        'Uncoalesced / Strided access: Each thread accessing a different cache line sector',
        'Hardware memory transaction amplification'
      ],
      cPlusPlusTheory: `When a warp of 32 threads executes a load instruction:
- Coalesced (stride = 1): 32 threads read 32 floats (128 bytes total). The memory controller serves this in exactly four 32-byte sector transactions (100% bus utilization).
- Strided (stride = 32): Thread 0 reads byte 0, Thread 1 reads byte 128, etc. The memory controller must issue 32 separate 32-byte transactions (1024 bytes transferred to read only 128 bytes—only 12.5% bus efficiency!).`,
      hardwareMechanics: `The GPU L2 cache line size is 128 bytes, divided into four 32-byte sectors.
If memory requests are scattered, the memory controller requests unneeded bytes, saturating memory channels and causing memory bus stalls.`,
      kernelCode: `// Example 26: Coalesced vs Strided Memory Access Benchmark
#include <iostream>
#include <cuda_runtime.h>

// 100% Coalesced: Adjacent threads read adjacent memory addresses
__global__ void coalesced_read(const float* in, float* out, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        out[idx] = in[idx] * 2.0f; // Stride = 1
    }
}

// Terribly Uncoalesced: Adjacent threads read with large stride
__global__ void strided_read(const float* in, float* out, int N, int stride) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    int strided_idx = idx * stride;
    if (strided_idx < N) {
        out[idx] = in[strided_idx] * 2.0f; // Stride = 32
    }
}

int main() {
    std::cout << "Coalesced reads execute with 100% bus efficiency, whereas strided reads throttle DRAM channels.\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 8: in[idx] accesses memory contiguously (thread 0 reads address 0, thread 1 reads address 4, etc.).',
        'Line 16: in[strided_idx] scatters memory requests across distinct 128-byte cache lines.',
        'Line 23: In real benchmarks, coalesced reads achieve >90% theoretical peak bandwidth.'
      ],
      commonPitfalls: [
        'Accessing 2D matrices column-wise without transposing or using shared memory tiles.',
        'Using Array-of-Structures (AoS) which naturally introduces strided accesses.'
      ],
      benchmarkingNotes: 'Uncoalesced strided access drops effective bandwidth on an A100 from 1800 GB/s to under 150 GB/s.'
    },
    {
      id: 'ex_27_vectorized_float4',
      exampleNumber: 27,
      difficulty: 'Intermediate',
      title: 'Ex 27: 128-Bit Vectorized Loads & Stores (float4)',
      subtitle: 'Saturating peak memory bandwidth using LDG.E.128 instructions',
      readTime: '15 min',
      prerequisites: ['Ex 26: Memory Coalescing'],
      concepts: [
        '128-bit memory bus transactions: Loading 16 bytes in a single instruction',
        'Built-in CUDA vector types: float4, int4, half2',
        'Generating native LDG.128 and STG.128 assembly instructions',
        'Reducing total instruction count by 4x'
      ],
      cPlusPlusTheory: `Instead of each thread issuing four separate 32-bit load instructions ('LDG.E.32'):
Using 'float4' enables each thread to load 4 floats (16 bytes = 128 bits) in a single hardware instruction ('LDG.E.128').
This:
1. Reduces instruction count by 75%, eliminating instruction issue bottlenecks.
2. Fully saturates the 128-bit width of GPU memory pipelines.`,
      hardwareMechanics: `The load/store units (LSUs) on NVIDIA SMs are 128 bits wide.
When loading a float4, the warp reads 32 * 16 bytes = 512 bytes per instruction, achieving maximum DRAM throughput with fewer active warps.`,
      kernelCode: `// Example 27: 128-Bit Vectorized Vector Addition with float4
#include <iostream>
#include <cuda_runtime.h>

__global__ void vector_add_float4(const float4* A, const float4* B, float4* C, int num_float4) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < num_float4) {
        // Single 128-bit vectorized load instruction
        float4 a_val = A[idx];
        float4 b_val = B[idx];

        float4 c_val;
        c_val.x = a_val.x + b_val.x;
        c_val.y = a_val.y + b_val.y;
        c_val.z = a_val.z + b_val.z;
        c_val.w = a_val.w + b_val.w;

        // Single 128-bit vectorized store instruction
        C[idx] = c_val;
    }
}

int main() {
    int total_elements = 1048576; // 1M floats
    int num_float4 = total_elements / 4;

    float4 *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, num_float4 * sizeof(float4));
    cudaMalloc(&d_B, num_float4 * sizeof(float4));
    cudaMalloc(&d_C, num_float4 * sizeof(float4));

    int threads = 256;
    int blocks = (num_float4 + threads - 1) / threads;
    vector_add_float4<<<blocks, threads>>>(d_A, d_B, d_C, num_float4);
    cudaDeviceSynchronize();

    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    std::cout << "Vectorized float4 kernel achieved maximum memory bus saturation!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 4: Kernel takes float4* pointers, instructing nvcc to emit LDG.E.128 and STG.E.128.',
        'Line 8: Single instruction loads x, y, z, w simultaneously into 4 adjacent registers.',
        'Line 28: Total thread count needed is cut by 4x, drastically lowering thread scheduling pressure.'
      ],
      commonPitfalls: [
        'Pointers must be aligned to 16-byte boundaries (cudaMalloc automatically guarantees 256-byte alignment).',
        'Handling remaining tail elements if N is not an exact multiple of 4.'
      ],
      benchmarkingNotes: 'Using float4 typically boosts bandwidth utilization from ~65% to >92% of theoretical hardware maximum.'
    },
    {
      id: 'ex_28_tail_handling_vectorization',
      exampleNumber: 28,
      difficulty: 'Intermediate',
      title: 'Ex 28: Handling Non-Multiple-of-4 Tensors in Vectorized Kernels',
      subtitle: 'Combining vectorized float4 fast paths with scalar remainder cleanup',
      readTime: '15 min',
      prerequisites: ['Ex 27: Vectorized float4'],
      concepts: [
        'Real-world tensor sizes are often not divisible by 4 (e.g. sequence length 127)',
        'Vectorized bulk loop + scalar remainder epilogue',
        'Reinterpreting float* as float4* using reinterpret_cast',
        'Zero-padding strategies in deep learning'
      ],
      cPlusPlusTheory: `In production AI frameworks, input tensor sizes vary dynamically.
If a sequence length is 129 floats:
- 128 elements can be processed using 32 fast float4 vectorized operations.
- The 1 remaining element must be processed by a scalar fallback handler.
Without handling the tail, the kernel will either corrupt memory by over-reading, or miss computing the final elements.`,
      hardwareMechanics: `Vectorized load instructions require the target address to be 16-byte aligned.
A misaligned 128-bit load will either trigger a hardware trap or split into four serialized 32-bit loads.`,
      kernelCode: `// Example 28: Vectorized Kernel with Robust Scalar Epilogue
#include <iostream>
#include <cuda_runtime.h>

__global__ void vectorized_with_tail(const float* in, float* out, int N) {
    int num_vec = N / 4;
    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    // Fast path: Process 128-bit chunks
    if (idx < num_vec) {
        const float4* in_vec = reinterpret_cast<const float4*>(in);
        float4* out_vec = reinterpret_cast<float4*>(out);

        float4 val = in_vec[idx];
        val.x *= 2.0f; val.y *= 2.0f; val.z *= 2.0f; val.w *= 2.0f;
        out_vec[idx] = val;
    }

    // Epilogue: Only one block handles the scalar remainder (0-3 elements)
    if (blockIdx.x == 0 && threadIdx.x == 0) {
        int tail_start = num_vec * 4;
        for (int i = tail_start; i < N; ++i) {
            out[i] = in[i] * 2.0f;
        }
    }
}

int main() {
    const int N = 1003; // Not divisible by 4!
    float *d_in, *d_out;
    cudaMalloc(&d_in, N * sizeof(float));
    cudaMalloc(&d_out, N * sizeof(float));

    int threads = 256;
    int blocks = ((N / 4) + threads - 1) / threads;
    if (blocks == 0) blocks = 1;

    vectorized_with_tail<<<blocks, threads>>>(d_in, d_out, N);
    cudaDeviceSynchronize();

    cudaFree(d_in); cudaFree(d_out);
    std::cout << "Successfully processed " << N << " elements with vectorized fast path + tail handler!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: num_vec = N / 4 calculates how many full 128-bit float4 chunks exist.',
        'Line 9: Casts float* to float4* for 16-byte load/store instructions.',
        'Line 19: Thread 0 handles the remaining 1 to 3 elements safely in the epilogue.'
      ],
      commonPitfalls: [
        'All threads attempting to process the tail simultaneously, causing race conditions; restrict epilogue to a single thread.',
        'Casting an unaligned float* to float4* causes hardware alignment faults.'
      ],
      benchmarkingNotes: 'For N > 10,000, the scalar epilogue takes <0.01% of total runtime, maintaining maximum vectorized speed.'
    },
    {
      id: 'ex_29_constant_memory_broadcast',
      exampleNumber: 29,
      difficulty: 'Intermediate',
      title: 'Ex 29: Constant Memory (__constant__) & Single-Cycle Broadcasts',
      subtitle: 'Storing immutable layer weights, biases, and hyper-parameters in the 64 KB constant cache',
      readTime: '15 min',
      prerequisites: ['Ex 28: Tail Handling'],
      concepts: [
        'The 64 KB __constant__ memory space',
        'cudaMemcpyToSymbol for host-to-device constant updates',
        'Single-cycle warp broadcast: All 32 threads reading the same address',
        'Serialization penalty when threads in a warp access different constant addresses'
      ],
      cPlusPlusTheory: `Neural network layers have parameters that remain constant during a forward pass (e.g., convolution filter coefficients, norm epsilon, dropout rates).
If all 32 threads in a warp read the exact same value from global memory, it wastes memory bandwidth.
Constant Memory is backed by a specialized on-chip Constant Cache.
When all 32 threads read the same constant address, the hardware broadcasts the value to all 32 threads in a single clock cycle!`,
      hardwareMechanics: `The Constant Cache has a single read port.
If all 32 threads request the same address -> 1 transaction (broadcast).
If all 32 threads request 32 different addresses -> 32 serialized transactions (severe penalty).`,
      kernelCode: `// Example 29: Convolution Filter in Constant Memory with Broadcast
#include <iostream>
#include <cuda_runtime.h>

// Allocate 64 KB constant memory buffer on GPU
__constant__ float d_kernel_weights[9]; // 3x3 Conv Filter

__global__ void conv1d_constant_kernel(const float* in, float* out, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= 1 && idx < N - 1) {
        // All 32 threads read d_kernel_weights[0], [1], [2] simultaneously
        // Hardware performs an instantaneous 1-cycle broadcast!
        float sum = 0.0f;
        sum += in[idx - 1] * d_kernel_weights[0];
        sum += in[idx]     * d_kernel_weights[1];
        sum += in[idx + 1] * d_kernel_weights[2];
        out[idx] = sum;
    }
}

int main() {
    float h_weights[9] = {0.25f, 0.5f, 0.25f, 0, 0, 0, 0, 0, 0};
    // Copy weights directly from CPU host to GPU Constant Memory symbol
    cudaMemcpyToSymbol(d_kernel_weights, h_weights, 9 * sizeof(float));

    std::cout << "Constant memory initialized with 1-cycle warp broadcast capability!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: __constant__ reserves memory in the dedicated constant cache space.',
        'Line 13: Reading d_kernel_weights broadcasts to all 32 threads simultaneously.',
        'Line 24: cudaMemcpyToSymbol copies host weights directly into the constant symbol address.'
      ],
      commonPitfalls: [
        'Indexing constant memory with threadIdx.x: ' + 'd_weights[threadIdx.x]' + ' forces 32 serialized reads!',
        'Exceeding the hardware 64 KB constant memory limit.'
      ],
      benchmarkingNotes: 'Uniform constant cache reads execute at register speeds (1 cycle), saving global memory bandwidth.'
    },
    {
      id: 'ex_30_soa_vs_aos',
      exampleNumber: 30,
      difficulty: 'Intermediate',
      title: 'Ex 30: Structure of Arrays (SoA) vs Array of Structures (AoS)',
      subtitle: 'Refactoring tensor metadata and particle data to achieve 100% memory coalescing',
      readTime: '15 min',
      prerequisites: ['Ex 29: Constant Memory'],
      concepts: [
        'Array of Structures (AoS): struct Particle { float x, y, z, w; } particles[N]',
        'Structure of Arrays (SoA): struct Particles { float x[N], y[N], z[N], w[N]; }',
        'Why AoS breaks memory coalescing on GPUs',
        'Converting OOP object-oriented designs to data-oriented GPU designs'
      ],
      cPlusPlusTheory: `In traditional object-oriented C++:
Developers write 'struct Node { float grad; float val; int id; } nodes[N];' (AoS).
When 32 threads read 'nodes[i].val', each read is separated by sizeof(Node) bytes (stride > 1).
In GPU Systems Engineering, we always use Structure of Arrays (SoA):
'struct Nodes { float* grads; float* vals; int* ids; };'
Now, reading 'vals[i]' accesses 32 contiguous floats, enabling perfect 128-byte coalescing!`,
      hardwareMechanics: `With AoS, reading 4 bytes from each 32-byte struct causes the GPU to fetch 32 separate 32-byte cache sectors (1024 bytes transferred to obtain 128 useful bytes).
With SoA, the exact same read requires only one 128-byte transaction—an 8x reduction in memory traffic.`,
      kernelCode: `// Example 30: Demonstrating SoA Layout for 100% Coalesced GPU Reads
#include <iostream>
#include <cuda_runtime.h>

// BAD: Array of Structures (AoS) - Strided uncoalesced memory access
struct ParticleAoS {
    float x, y, z, mass;
};

// GOOD: Structure of Arrays (SoA) - Contiguous coalesced memory access
struct ParticlesSoA {
    float* x;
    float* y;
    float* z;
    float* mass;
};

__global__ void update_soa_kernel(ParticlesSoA p, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        // Perfect coalescing: 32 threads read 32 adjacent floats
        p.x[idx] += 1.0f;
    }
}

int main() {
    std::cout << "Structure of Arrays (SoA) guarantees 100% memory coalescing on all GPU architectures.\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: ParticleAoS causes 16-byte strides when updating only position x.',
        'Line 11: ParticlesSoA splits components into separate contiguous 1D buffers.',
        'Line 22: p.x[idx] executes as a single 128-byte coalesced bus transaction.'
      ],
      commonPitfalls: [
        'Porting legacy C++ OOP classes directly to GPU kernels without flattening into SoA layout.',
        'Allocating SoA buffers with separate cudaMalloc calls without aligning each buffer to 256 bytes.'
      ],
      benchmarkingNotes: 'SoA layout routinely delivers 4x to 8x higher memory bandwidth compared to AoS in simulation kernels.'
    },
    {
      id: 'ex_31_l2_cache_persistence',
      exampleNumber: 31,
      difficulty: 'Advanced',
      title: 'Ex 31: L2 Cache Persistence & cudaStreamSetAttribute',
      subtitle: 'Pinning critical model weights in the 50 MB L2 cache on Ampere and Hopper',
      readTime: '15 min',
      prerequisites: ['Ex 30: SoA vs AoS'],
      concepts: [
        'Modern GPU L2 cache sizes (40 MB on A100, 50 MB on H100, 96 MB on RTX 4090)',
        'L2 Cache Eviction Policies: LRU vs Streaming vs Persisting',
        'Setting persistent cache windows using cudaStreamSetAttribute',
        'Preventing streaming activations from evicting hot attention weights'
      ],
      cPlusPlusTheory: `In transformer inference, intermediate activations stream through memory, while attention projection weights (Q, K, V) are reused repeatedly across tokens.
By default, the Least Recently Used (LRU) policy in L2 cache causes massive streaming activations to evict the reusable weights into slow DRAM.
CUDA allows reserving a portion of the L2 cache as 'Persistent', guaranteeing those weights remain in on-chip SRAM across kernel launches!`,
      hardwareMechanics: `The L2 cache controller partitions its tag arrays into Normal and Persisting domains.
Persistent cache hits deliver >5 TB/s of bandwidth at 150 cycles latency, completely bypassing HBM DRAM channels.`,
      kernelCode: `// Example 31: Reserving 20 MB of Persistent L2 Cache
#include <iostream>
#include <cuda_runtime.h>

int main() {
    int device_id = 0;
    cudaDeviceProp prop;
    cudaGetDeviceProperties(&prop, device_id);

    // Check L2 cache size (e.g. 40-50 MB on Ampere/Hopper)
    std::cout << "Device L2 Cache Size: " << prop.l2CacheSize / (1024 * 1024) << " MB\\n";

    // Set maximum persistent cache window (e.g., 20 MB)
    size_t persist_size = 20 * 1024 * 1024;
    cudaDeviceSetLimit(cudaLimitPersistingL2CacheSize, persist_size);

    cudaStream_t stream;
    cudaStreamCreate(&stream);

    cudaStreamAttrValue attr;
    attr.accessPolicyWindow.base_ptr = nullptr; // Set to weight tensor address
    attr.accessPolicyWindow.num_bytes = persist_size;
    attr.accessPolicyWindow.hitRatio = 1.0f; // 100% persistence in L2
    attr.accessPolicyWindow.hitProp = cudaAccessPropertyPersisting;
    attr.accessPolicyWindow.missProp = cudaAccessPropertyStreaming;

    cudaStreamSetAttribute(stream, cudaStreamAttributeAccessPolicyWindow, &attr);
    std::cout << "Successfully configured 20 MB persistent L2 cache window!\\n";

    cudaStreamDestroy(stream);
    return 0;
}`,
      kernelExplanation: [
        'Line 14: cudaDeviceSetLimit reserves hardware L2 cache lines for persistence.',
        'Line 22: hitRatio = 1.0f requests maximum L2 retention priority.',
        'Line 23: hitProp = cudaAccessPropertyPersisting marks hits as sticky in L2 cache.'
      ],
      commonPitfalls: [
        'Requesting a persisting size larger than prop.persistingL2CacheMaxSize results in an error.',
        'Setting hitRatio too high on data accessed only once pollutes L2 cache.'
      ],
      benchmarkingNotes: 'Reusing persistent L2 cache lines yields a 3x speedup over fetching weights from HBM DRAM.'
    },
    {
      id: 'ex_32_register_spilling',
      exampleNumber: 32,
      difficulty: 'Advanced',
      title: 'Ex 32: Diagnosing & Eliminating Register Spilling',
      subtitle: 'Inspecting PTXAS compiler output and preventing spills to slow Local Memory',
      readTime: '15 min',
      prerequisites: ['Ex 31: L2 Cache Persistence'],
      concepts: [
        'Hardware limit: Maximum 255 32-bit registers per thread',
        'Register pressure: What happens when a kernel needs more than 255 registers',
        'Local Memory (spill memory): Logically private, physically backed by slow DRAM',
        'Compiler flags: --ptxas-options=-v and __launch_bounds__'
      ],
      cPlusPlusTheory: `If a complex fused kernel unrolls large matrix multiplication loops, the compiler may need 300 variables simultaneously.
Because each thread can only have at most 255 physical registers, the compiler spills excess variables to 'Local Memory'.
Despite its name, Local Memory is NOT on-chip—it is stored in off-chip DRAM!
A single spilled register can turn a 1-cycle register read into a 400-cycle DRAM access.`,
      hardwareMechanics: `Spilled registers are routed to the thread's local memory segment in DRAM.
While L1/L2 caches attempt to cache these spills, high thread occupancy quickly evicts spill data, generating massive L2-to-DRAM memory traffic.`,
      kernelCode: `// Example 32: Using __launch_bounds__ to Control Register Allocation
#include <iostream>
#include <cuda_runtime.h>

// Instructs compiler: Max 256 threads per block, Min 2 blocks per SM
// The compiler automatically caps registers per thread to prevent spilling!
__global__ void __launch_bounds__(256, 2)
optimized_kernel(const float* in, float* out, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        float acc = 0.0f;
        #pragma unroll 4
        for (int i = 0; i < 16; ++i) {
            acc += in[idx] * 0.1f;
        }
        out[idx] = acc;
    }
}

int main() {
    std::cout << "Compile with: nvcc --ptxas-options=-v to inspect register count and spill sizes!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: __launch_bounds__(maxThreadsPerBlock, minBlocksPerMultiprocessor) sets compiler constraints.',
        'Line 7: Forces nvcc to limit registers per thread so at least 2 full blocks can co-exist on the SM.',
        'Line 12: #pragma unroll 4 controls loop unrolling to avoid register bloating.'
      ],
      commonPitfalls: [
        'Aggressive #pragma unroll without checking register pressure causes catastrophic spills to local memory.',
        'Ignoring ' + 'ptxas info: 16 bytes spill stores, 16 bytes spill loads' + ' in compiler output.'
      ],
      benchmarkingNotes: 'Eliminating register spills routinely yields a 2x to 5x speedup in deep learning math kernels.'
    },
    {
      id: 'ex_33_read_only_cache',
      exampleNumber: 33,
      difficulty: 'Advanced',
      title: 'Ex 33: The __restrict__ Qualifier & Read-Only Texture Cache',
      subtitle: 'Emitting LDG instructions through non-aliasing pointer promises',
      readTime: '12 min',
      prerequisites: ['Ex 32: Register Spilling'],
      concepts: [
        'Pointer aliasing: In C++, compilers must assume two pointers can point to overlapping memory',
        'The __restrict__ keyword promising no pointer overlap',
        'Non-coherent read-only data cache (Texture/LDG cache)',
        'Automatic compiler emission of LDG instructions'
      ],
      cPlusPlusTheory: `If a function receives 'float* A' and 'float* C', the compiler must assume that writing to 'C[0]' might alter 'A[0]' (aliasing).
Consequently, the compiler cannot cache values of 'A' across writes.
Adding '__restrict__' promises the compiler that 'A' and 'C' point to disjoint memory regions.
This allows the compiler to route reads through the Read-Only Data Cache (LDG cache), keeping loaded weights cached across loop iterations!`,
      hardwareMechanics: `The Read-Only Cache (formerly Texture Cache) has dedicated hardware datapaths separate from the unified L1 cache.
Routing loads through LDG relieves L1 cache port congestion and increases overall cache bandwidth.`,
      kernelCode: `// Example 33: Non-Aliased Read-Only Memory Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void non_aliased_kernel(
    const float* __restrict__ A, // Read-only, non-aliased
    const float* __restrict__ B,
    float* __restrict__ C,       // Write-only, non-aliased
    int N
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        // Compiler emits LDG instruction directly into Read-Only Cache
        C[idx] = A[idx] * 2.0f + B[idx];
    }
}

int main() {
    std::cout << "The __restrict__ qualifier enables compiler LDG read-only caching instructions.\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: const float* __restrict__ promises that buffer A is read-only and never modified through pointer C.',
        'Line 13: Compiler emits LDG.E instructions that utilize dedicated read-only cache pipelines.',
        'Line 18: Critical best practice for all deep learning inference and GEMM kernels.'
      ],
      commonPitfalls: [
        'Using __restrict__ when pointers DO alias results in silent data corruption and undefined behavior.',
        'Forgetting const on input buffers.'
      ],
      benchmarkingNotes: 'Using __restrict__ provides an instant 5-15% throughput improvement in memory-intensive kernels.'
    },
    {
      id: 'ex_34_unified_memory_prefetch',
      exampleNumber: 34,
      difficulty: 'Advanced',
      title: 'Ex 34: Unified Memory (cudaMallocManaged) & Async Prefetching',
      subtitle: 'Single-pointer host/device programming without PCIe migration page fault stalls',
      readTime: '15 min',
      prerequisites: ['Ex 33: Read-Only Cache'],
      concepts: [
        'Unified Virtual Memory (UVM): A single 64-bit pointer accessible by CPU and GPU',
        'Hardware on-demand page migration (4 KB pages migrated via PCIe page faults)',
        'cudaMemPrefetchAsync for explicit asynchronous page prefetching',
        'Eliminating page fault latency in deep learning workflows'
      ],
      cPlusPlusTheory: `cudaMallocManaged allocates memory accessible by both CPU and GPU using the exact same pointer.
However, naive Unified Memory relies on 'On-Demand Page Faults':
When the GPU accesses the pointer, it triggers a hardware page fault, stalls the GPU warp, and requests the page over PCIe.
To get full GPU speed, we must explicitly prefetch pages to the target device using 'cudaMemPrefetchAsync'!`,
      hardwareMechanics: `The GPU Memory Management Unit (MMU) handles page table translation and fault reporting.
Page migration across PCIe takes ~10 µs per 4 KB page. Prefetching pipelines multi-megabyte transfers via DMA, eliminating warp stalls.`,
      kernelCode: `// Example 34: High-Performance Unified Memory with Async Prefetching
#include <iostream>
#include <cuda_runtime.h>

__global__ void uvm_kernel(float* data, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) data[idx] *= 2.0f;
}

int main() {
    const int N = 1000000;
    const size_t bytes = N * sizeof(float);

    // 1. Allocate Unified Memory accessible by CPU and GPU
    float* data;
    cudaMallocManaged(&data, bytes);

    // 2. Initialize data on the CPU host
    for (int i = 0; i < N; ++i) data[i] = 1.0f;

    // 3. CRITICAL: Prefetch to GPU device to avoid on-demand page fault stalls!
    int device_id = 0;
    cudaMemPrefetchAsync(data, bytes, device_id);

    // 4. Launch kernel (runs at 100% native speed without page faults)
    uvm_kernel<<<(N+255)/256, 256>>>(data, N);

    // 5. Prefetch results back to CPU for evaluation
    cudaMemPrefetchAsync(data, bytes, cudaCpuDeviceId);
    cudaDeviceSynchronize();

    std::cout << "UVM Data[0]: " << data[0] << " (Expected: 2.0)\\n";
    cudaFree(data);
    return 0;
}`,
      kernelExplanation: [
        'Line 16: cudaMallocManaged provides a unified virtual pointer accessible anywhere.',
        'Line 24: cudaMemPrefetchAsync migrates all 4 MB to GPU VRAM ahead of time.',
        'Line 31: cudaMemPrefetchAsync with cudaCpuDeviceId streams results back to system RAM.'
      ],
      commonPitfalls: [
        'Accessing managed memory from the CPU while a GPU kernel is running without synchronizing causes page race errors.',
        'Relying on implicit page faults without prefetching, which degrades performance by 10x to 50x.'
      ],
      benchmarkingNotes: 'Prefetched Unified Memory achieves identical throughput to explicit cudaMalloc + cudaMemcpy.'
    }
  ]
};
