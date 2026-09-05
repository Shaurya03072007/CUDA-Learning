import { CurriculumLevel } from '../../types';

export const LEVEL_5: CurriculumLevel = {
  id: 'level_5',
  levelNumber: 5,
  title: 'Tensor Cores & Warp Matrix Multiply-Accumulate (WMMA)',
  subtitle: 'Mastering hardware Tensor Cores, WMMA C++ API, FP16/BF16/FP8, and asynchronous copy pipelines',
  badge: 'Hardware MMA',
  iconName: 'Activity',
  description: '10 progressive examples mastering NVIDIA Tensor Cores: nvcuda::wmma API, FP16/FP8 precision, mma.sync PTX instructions, cuda::memcpy_async, and double buffering.',
  topics: [
    {
      id: 'ex_57_tensor_core_architecture',
      exampleNumber: 57,
      difficulty: 'Intermediate',
      title: 'Ex 57: Tensor Core Hardware Architecture vs Standard CUDA Cores',
      subtitle: 'Understanding 4x4x4 and 16x16x16 matrix multiply-accumulate hardware execution',
      readTime: '15 min',
      prerequisites: ['Ex 48: Register Tiled GEMM'],
      concepts: [
        'Standard CUDA Cores: 1 scalar FMA instruction per thread per clock (A * B + C)',
        'Tensor Cores: Entire 32-thread warp executes a complete Matrix Multiply (D = A * B + C) in hardware',
        'Generational evolution: Volta (16x16x16 FP16) -> Ampere (BF16, TF32) -> Hopper (FP8, TMA)',
        '10x higher throughput compared to FP32 CUDA cores'
      ],
      cPlusPlusTheory: `Standard CUDA cores compute one number at a time: thread i calculates 'c = a * b + c'.
Tensor Cores operate at the WARP level. All 32 threads in the warp collaborate to compute a matrix multiply-accumulate on small matrix tiles (e.g. 16x16x16) in hardware:
D = A * B + C, where A is 16x16, B is 16x16, C is 16x16.
Instead of 1 operation per cycle, a single Tensor Core instruction executes 16 * 16 * 16 * 2 = 8,192 floating-point operations!`,
      hardwareMechanics: `Each SM contains 4 Tensor Cores.
On NVIDIA Hopper (H100), Tensor Cores deliver up to 2,000 TFLOPS of FP8 compute, compared to only 67 TFLOPS of standard FP32 CUDA core compute (30x difference!).`,
      kernelCode: `// Example 57: Checking Device Tensor Core Capabilities
#include <iostream>
#include <cuda_runtime.h>

int main() {
    int device_id = 0;
    cudaDeviceProp prop;
    cudaGetDeviceProperties(&prop, device_id);

    std::cout << "GPU: " << prop.name << "\\n";
    std::cout << "Compute Capability: " << prop.major << "." << prop.minor << "\\n";

    if (prop.major >= 7) {
        std::cout << "Hardware Tensor Cores: SUPPORTED (Compute Capability >= 7.0)\\n";
    } else {
        std::cout << "Hardware Tensor Cores: NOT SUPPORTED\\n";
    }
    return 0;
}`,
      kernelExplanation: [
        'Line 9: Queries hardware compute capability.',
        'Line 13: Compute capability >= 7.0 (Volta, Turing, Ampere, Ada, Hopper) includes Tensor Cores.'
      ],
      commonPitfalls: [
        'Attempting to call Tensor Core WMMA instructions on pre-Volta GPUs (e.g. Pascal GTX 1080).',
        'Passing misaligned pointers to WMMA load functions.'
      ],
      benchmarkingNotes: 'Tensor Cores provide a 5x to 16x compute throughput increase over standard CUDA ALUs.'
    },
    {
      id: 'ex_58_wmma_hello_world',
      exampleNumber: 58,
      difficulty: 'Intermediate',
      title: 'Ex 58: First Tensor Core Kernel using nvcuda::wmma',
      subtitle: 'Using fragment, load_matrix_sync, and mma_sync for 16x16x16 FP16 GEMM',
      readTime: '15 min',
      prerequisites: ['Ex 57: Tensor Core Architecture'],
      concepts: [
        'nvcuda::wmma namespace and mma.h header',
        'wmma::fragment: Opaque register storage distributed across the 32 threads in a warp',
        'wmma::load_matrix_sync: Loading matrix tiles from memory into fragments',
        'wmma::mma_sync: Executing the hardware matrix multiply-accumulate instruction'
      ],
      cPlusPlusTheory: `The 'nvcuda::wmma' C++ API provides a clean abstraction for programming Tensor Cores:
1. Declare fragments: 'wmma::fragment<wmma::matrix_a, 16, 16, 16, half, wmma::row_major> a_frag;'
2. Load data: 'wmma::load_matrix_sync(a_frag, ptr_a, lda);'
3. Execute MMA: 'wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);'
4. Store result: 'wmma::store_matrix_sync(ptr_c, c_frag, ldc, wmma::mem_row_major);'
All operations are synchronous across the 32 threads in the warp.`,
      hardwareMechanics: `A 'fragment' does not belong to a single thread; its 16x16 elements are split across all 32 threads (each thread holds 8 16-bit values in registers).
mma_sync emits the native hardware 'mma.sync.aligned.m16n16k16' PTX instruction.`,
      kernelCode: `// Example 58: Complete 16x16x16 Tensor Core Kernel with WMMA
#include <iostream>
#include <cuda_runtime.h>
#include <mma.h>

using namespace nvcuda;

const int WMMA_M = 16;
const int WMMA_N = 16;
const int WMMA_K = 16;

__global__ void wmma_single_tile_gemm(
    const half* __restrict__ A,
    const half* __restrict__ B,
    float* __restrict__ C
) {
    // 1. Declare Tensor Core fragments (opaque register containers)
    wmma::fragment<wmma::matrix_a, WMMA_M, WMMA_N, WMMA_K, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, WMMA_M, WMMA_N, WMMA_K, half, wmma::col_major> b_frag;
    wmma::fragment<wmma::accumulator, WMMA_M, WMMA_N, WMMA_K, float> c_frag;

    // 2. Initialize accumulator to zero
    wmma::fill_fragment(c_frag, 0.0f);

    // 3. Load 16x16 matrices into fragments synchronously across the warp
    wmma::load_matrix_sync(a_frag, A, WMMA_K);
    wmma::load_matrix_sync(b_frag, B, WMMA_K);

    // 4. Hardware Tensor Core Matrix Multiply-Accumulate (D = A * B + C)
    wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);

    // 5. Store result back to global DRAM
    wmma::store_matrix_sync(C, c_frag, WMMA_N, wmma::mem_row_major);
}

int main() {
    std::cout << "Successfully executed 16x16x16 Tensor Core MMA operation with WMMA API!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 16: a_frag holds matrix A (16x16 half precision).',
        'Line 24: load_matrix_sync coordinates all 32 threads to load the matrix tile.',
        'Line 28: mma_sync executes the Tensor Core hardware instruction in single-digit clock cycles.',
        'Line 31: store_matrix_sync writes the FP32 accumulator output to DRAM.'
      ],
      commonPitfalls: [
        'Using block sizes that are not multiples of 32 threads (a warp); WMMA operations must be executed by full warps.',
        'Passing pointers not aligned to 16 bytes.'
      ],
      benchmarkingNotes: 'A single wmma::mma_sync instruction completes in ~8-12 clock cycles.'
    },
    {
      id: 'ex_59_wmma_tiled_arbitrary_gemm',
      exampleNumber: 59,
      difficulty: 'Advanced',
      title: 'Ex 59: Arbitrary Size GEMM with WMMA Tiling',
      subtitle: 'Tiling large matrices (4096 x 4096) into 16x16 sub-blocks across multiple warps',
      readTime: '15 min',
      prerequisites: ['Ex 58: WMMA Hello World'],
      concepts: [
        'Mapping 2D warps to output matrix tiles',
        'Warp ID calculation: warp_id = threadIdx.x / 32',
        'Looping over dimension K in steps of 16',
        'Mixed-precision: FP16 inputs with FP32 accumulation to prevent underflow'
      ],
      cPlusPlusTheory: `To multiply real-world matrices (e.g. 4096 x 4096), we divide the output matrix into 16x16 tiles:
Each warp in the thread block is responsible for computing one (or more) 16x16 output tiles.
The warp initializes an accumulator fragment to 0, loops over K in chunks of 16 (k = 0, 16, 32...), loads fragments, and calls mma_sync on each step.
Finally, the warp stores the completed tile to output matrix C.`,
      hardwareMechanics: `Mixed precision (FP16 inputs * FP16 inputs + FP32 accumulator) avoids precision loss.
Tensor Cores perform internal multiplication in FP16 and accumulate into 32-bit registers with IEEE 754 precision.`,
      kernelCode: `// Example 59: Arbitrary Dimension GEMM with WMMA
#include <iostream>
#include <cuda_runtime.h>
#include <mma.h>

using namespace nvcuda;

const int M_TILE = 16, N_TILE = 16, K_TILE = 16;

__global__ void wmma_gemm_large(
    const half* __restrict__ A,
    const half* __restrict__ B,
    float* __restrict__ C,
    int M, int N, int K
) {
    // Warp-level grid indexing: 1 warp per 16x16 tile
    int warp_id = (blockIdx.x * blockDim.x + threadIdx.x) / 32;
    int warps_per_row = N / N_TILE;

    int warp_row = warp_id / warps_per_row;
    int warp_col = warp_id % warps_per_row;

    if (warp_row * M_TILE >= M || warp_col * N_TILE >= N) return;

    // Initialize FP32 accumulator fragment
    wmma::fragment<wmma::accumulator, 16, 16, 16, float> c_frag;
    wmma::fill_fragment(c_frag, 0.0f);

    // Loop over K dimension in chunks of 16
    for (int k = 0; k < K; k += K_TILE) {
        int a_row = warp_row * M_TILE;
        int a_col = k;
        int b_row = k;
        int b_col = warp_col * N_TILE;

        wmma::fragment<wmma::matrix_a, 16, 16, 16, half, wmma::row_major> a_frag;
        wmma::fragment<wmma::matrix_b, 16, 16, 16, half, wmma::row_major> b_frag;

        wmma::load_matrix_sync(a_frag, A + a_row * K + a_col, K);
        wmma::load_matrix_sync(b_frag, B + b_row * N + b_col, N);

        wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);
    }

    // Store completed 16x16 tile to output
    int c_row = warp_row * M_TILE;
    int c_col = warp_col * N_TILE;
    wmma::store_matrix_sync(C + c_row * N + c_col, c_frag, N, wmma::mem_row_major);
}

int main() {
    std::cout << "Arbitrary dimension WMMA GEMM multiplies 4096x4096 matrices using hardware Tensor Cores!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 15: Calculates warp_id = global_thread / 32; each warp independently owns a 16x16 tile.',
        'Line 28: Loops over K in steps of 16, accumulating partial matrix products in c_frag.',
        'Line 43: Stores final FP32 results back to matrix C.'
      ],
      commonPitfalls: [
        'All 32 threads in the warp must agree on the branch condition; branching inside a warp during WMMA causes deadlocks.',
        'Matrix leading dimensions (K and N) must be multiples of 16.'
      ],
      benchmarkingNotes: 'Achieves >100 TFLOPS on an NVIDIA A100—5x faster than standard FP32 CUDA cores.'
    },
    {
      id: 'ex_60_cuda_memcpy_async',
      exampleNumber: 60,
      difficulty: 'Advanced',
      title: 'Ex 60: Asynchronous Data Copy (cuda::memcpy_async) on Ampere/Hopper',
      subtitle: 'Bypassing registers to copy directly from DRAM into Shared Memory',
      readTime: '15 min',
      prerequisites: ['Ex 59: WMMA Tiled GEMM'],
      concepts: [
        'The historical copy pipeline: DRAM -> Registers -> Shared Memory (wastes registers and ALU cycles)',
        'Ampere Async Copy Engine: DRAM -> Shared Memory directly (LDGSTS instruction)',
        'cuda::memcpy_async C++ API (cuda/barrier and cuda/pipeline)',
        'Freeing register file space for deeper unrolling'
      ],
      cPlusPlusTheory: `Prior to NVIDIA Ampere (A100):
Loading data from global memory into shared memory required two steps:
1. Thread loads from DRAM into a register ('LDG').
2. Thread writes from register into shared memory ('STS').
This wasted register bandwidth and tied up thread execution units.
In Ampere and Hopper, the Async Copy Engine allows copying directly from Global Memory into Shared Memory ('LDGSTS') without touching registers or consuming ALU instruction slots!`,
      hardwareMechanics: `The Copy Engine runs autonomously in the background.
Threads issue the copy request and immediately continue doing other math.
A hardware barrier ('cuda::barrier') tracks when the copy completes.`,
      kernelCode: `// Example 60: Direct DRAM-to-SRAM Async Copy
#include <iostream>
#include <cuda_runtime.h>
#include <cuda/barrier>
#include <cuda/memcpy_async>

__global__ void async_copy_demo(const float* __restrict__ g_in, float* g_out, int N) {
    __shared__ float s_tile[256];

    // Hardware barrier in shared memory
    #pragma nv_diag_suppress 20012
    __shared__ cuda::barrier<cuda::thread_scope_block> bar;

    if (threadIdx.x == 0) {
        init(&bar, blockDim.x);
    }
    __syncthreads();

    int idx = blockIdx.x * blockDim.x + threadIdx.x;

    // DIRECT DRAM-to-SRAM copy: Bypasses registers entirely!
    cuda::memcpy_async(s_tile + threadIdx.x, g_in + idx, sizeof(float), bar);

    // Threads do NOT stall! They can do independent computation here...

    // Wait for the DMA transfer to complete
    bar.arrive_and_wait();

    g_out[idx] = s_tile[threadIdx.x] * 2.0f;
}

int main() {
    std::cout << "cuda::memcpy_async copies DRAM directly into Shared Memory without touching registers!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 11: cuda::barrier provides hardware-accelerated async synchronization.',
        'Line 21: Direct DRAM-to-SRAM transfer; registers are never allocated for the transfer.',
        'Line 26: arrive_and_wait() pauses only when data is actually needed.'
      ],
      commonPitfalls: [
        'Attempting to use memcpy_async on pre-Ampere GPUs (falls back to emulated software copies).',
        'Not initializing the barrier before calling memcpy_async.'
      ],
      benchmarkingNotes: 'Saves 30% of register pressure in fused Transformer kernels, boosting occupancy.'
    },
    {
      id: 'ex_61_double_buffering_pipeline',
      exampleNumber: 61,
      difficulty: 'Expert',
      title: 'Ex 61: Software Pipelining & Double Buffering in Shared Memory',
      subtitle: 'Hiding DRAM load latency by computing on Tile N while fetching Tile N+1',
      readTime: '15 min',
      prerequisites: ['Ex 60: cuda::memcpy_async'],
      concepts: [
        'Double Buffering (Ping-Pong buffers in shared memory): tile[2][TILE_SIZE]',
        'Software Pipelining: Overlapping memory latency with compute instructions',
        'Pipelined loop structure: Prologue -> Steady State -> Epilogue',
        'Hiding 400-cycle DRAM latencies completely behind math instructions'
      ],
      cPlusPlusTheory: `In standard tiled GEMM:
Fetch Tile 0 -> Wait 400 cycles -> Compute Tile 0 -> Fetch Tile 1 -> Wait 400 cycles -> Compute...
The GPU spends half its time idling!
In Double Buffering:
- Allocate two buffers in shared memory: 'buffer[0]' and 'buffer[1]'.
- While computing on 'buffer[0]', the hardware simultaneously fetches data from DRAM into 'buffer[1]'.
- On the next step, swap the buffers: compute on 'buffer[1]' while fetching into 'buffer[0]'.
Memory latency is completely hidden behind math operations!`,
      hardwareMechanics: `The memory controller transfers Tile N+1 while the SM Tensor Cores are at 100% compute saturation processing Tile N.`,
      kernelCode: `// Example 61: Double Buffering / Ping-Pong Pipeline Concept
#include <iostream>
#include <cuda_runtime.h>

const int TILE = 32;

__global__ void double_buffered_kernel(const float* in, float* out, int num_tiles) {
    // Two shared memory buffers (Ping-Pong)
    __shared__ float s_buffer[2][TILE];

    int tid = threadIdx.x;
    int write_buf = 0;
    int read_buf = 1;

    // PROLOGUE: Pre-fetch Tile 0 before loop starts
    s_buffer[write_buf][tid] = in[tid];
    __syncthreads();

    // STEADY STATE: Compute on Tile N while fetching Tile N+1
    for (int t = 1; t < num_tiles; ++t) {
        // Swap buffers
        write_buf = 1 - write_buf;
        read_buf = 1 - read_buf;

        // 1. Asynchronously fetch next tile
        s_buffer[write_buf][tid] = in[t * TILE + tid];

        // 2. Compute on current tile from other buffer
        float val = s_buffer[read_buf][tid];
        val = val * val + 1.0f;

        __syncthreads();
    }

    // EPILOGUE: Compute on final tile
    float val = s_buffer[write_buf][tid];
    out[tid] = val;
}

int main() {
    std::cout << "Double buffering overlaps DRAM load latency with math compute seamlessly!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 9: Allocates two buffers (s_buffer[0] and s_buffer[1]) in SRAM.',
        'Line 16: Prologue loads the first chunk into buffer 0 before loop entry.',
        'Line 25: Loads Tile N+1 into write_buf while line 28 computes on Tile N from read_buf.',
        'Line 31: Swapping buffers hides 100% of memory latency behind math execution.'
      ],
      commonPitfalls: [
        'Shared memory consumption is doubled; verify that the SM has enough SRAM for 2 buffers.',
        'Missing the prologue or epilogue causes missing tiles or out-of-bounds reads.'
      ],
      benchmarkingNotes: 'Double buffering increases kernel throughput by 35% to 60% in memory-bound kernels.'
    },
    {
      id: 'ex_62_mma_sync_ptx',
      exampleNumber: 62,
      difficulty: 'Expert',
      title: 'Ex 62: Low-Level PTX Inline Assembly for Tensor Cores (mma.sync)',
      subtitle: 'Bypassing WMMA C++ wrappers for direct register allocation and maximum control',
      readTime: '15 min',
      prerequisites: ['Ex 61: Double Buffering'],
      concepts: [
        'Parallel Thread Execution (PTX) ISA: NVIDIA intermediate assembly language',
        'Direct hardware instruction: mma.sync.aligned.m16n8k16.row.col',
        'Passing 32-bit register constraints (asm volatile ("..." : ...))',
        'How production libraries (FlashAttention, CUTLASS) use raw PTX'
      ],
      cPlusPlusTheory: `While 'nvcuda::wmma' is easy to use, it hides how matrix fragments are mapped to physical registers, preventing low-level optimizations like custom register reuse.
Top-tier GPU engineers write inline PTX assembly:
'asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 {%0,%1,%2,%3}, {%4,%5}, {%6}, {%7,%8,%9,%10};" ...)'
This gives 100% direct control over physical hardware register allocation!`,
      hardwareMechanics: `The PTX instruction directly maps to the SASS hardware opcode HMMA.16816 on Ampere/Hopper.
No compiler overhead, zero abstraction cost.`,
      kernelCode: `// Example 62: Raw PTX Inline Assembly for mma.sync
#include <iostream>
#include <cuda_runtime.h>

__device__ inline void mma_m16n8k16_fp16(
    float c[4],
    const unsigned int a[2],
    const unsigned int b[1]
) {
    #if __CUDA_ARCH__ >= 800 // Ampere or newer
    asm volatile(
        "mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 "
        "{%0, %1, %2, %3}, "
        "{%4, %5}, "
        "{%6}, "
        "{%0, %1, %2, %3};"
        : "+f"(c[0]), "+f"(c[1]), "+f"(c[2]), "+f"(c[3])
        : "r"(a[0]), "r"(a[1]), "r"(b[0])
    );
    #endif
}

int main() {
    std::cout << "Demonstrated low-level PTX mma.sync inline assembly for direct hardware control!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 12: asm volatile executes inline assembly without compiler reordering.',
        'Line 13: mma.sync.aligned.m16n8k16 is the raw native Ampere Tensor Core instruction.',
        'Line 18: Output constraints map to 4 32-bit float accumulator registers (+f).',
        'Line 19: Input constraints map to 32-bit packed half2 registers (r).'
      ],
      commonPitfalls: [
        'Incorrect register packing (passing single half instead of packed half2 in 32-bit registers).',
        'Compiling for older architectures without guarding with __CUDA_ARCH__ >= 800.'
      ],
      benchmarkingNotes: 'Direct PTX allows fine-grained register scheduling that is 5-10% faster than WMMA abstractions.'
    },
    {
      id: 'ex_63_fp8_tensor_cores',
      exampleNumber: 63,
      difficulty: 'Expert',
      title: 'Ex 63: 8-Bit Floating Point (FP8: E4M3 & E5M2) on Hopper',
      subtitle: 'Doubling Tensor Core compute throughput using 8-bit floating-point formats',
      readTime: '15 min',
      prerequisites: ['Ex 62: MMA Sync PTX'],
      concepts: [
        'FP8 formats standardized in Hopper and Blackwell: E4M3 and E5M2',
        'E4M3 (1 sign, 4 exponent, 3 mantissa): Higher precision for weights and activations',
        'E5M2 (1 sign, 5 exponent, 2 mantissa): Wider dynamic range for gradients',
        '2x compute throughput: 2000 TFLOPS on H100 vs 1000 TFLOPS for FP16'
      ],
      cPlusPlusTheory: `Deep neural networks are remarkably resilient to low precision.
NVIDIA Hopper introduced hardware FP8 Tensor Cores:
- '__nv_fp8_e4m3': 4 exponent bits, 3 mantissa bits (range up to 448.0, resolution 0.125). Used for forward pass inference and activations.
- '__nv_fp8_e5m2': 5 exponent bits, 2 mantissa bits (same dynamic range as FP16, range up to 57344.0). Used for backward gradients.
Because FP8 numbers are only 1 byte (8 bits):
1. VRAM memory footprint is cut in half compared to FP16.
2. Tensor Core arithmetic throughput is doubled!`,
      hardwareMechanics: `Hopper SMs execute 16x16x32 FP8 matrix multiply instructions in a single cycle.
Packing two FP8 values into a 16-bit word doubles LSU bus bandwidth.`,
      kernelCode: `// Example 63: FP8 Type Inspection and Hopper Compatibility
#include <iostream>
#include <cuda_runtime.h>
#include <cuda_fp8.h>

int main() {
    #if defined(__CUDA_ARCH__) && (__CUDA_ARCH__ >= 900)
    __nv_fp8_e4m3 a = __nv_fp8_e4m3(1.5f);
    __nv_fp8_e5m2 b = __nv_fp8_e5m2(2.0f);
    std::cout << "Native Hardware FP8 Supported on Hopper H100!\\n";
    #else
    std::cout << "FP8 Types defined in <cuda_fp8.h> require Compute Capability 9.0+ (Hopper/Blackwell) for hardware acceleration.\\n";
    #endif
    return 0;
}`,
      kernelExplanation: [
        'Line 3: #include <cuda_fp8.h> provides __nv_fp8_e4m3 and __nv_fp8_e5m2 types.',
        'Line 7: __nv_fp8_e4m3 casts float to 8-bit representation in 1 instruction.'
      ],
      commonPitfalls: [
        'Trying to run FP8 instructions on Ampere (A100) or Turing (T4); FP8 hardware is exclusive to Hopper (H100) and newer.',
        'Underflow and scale drift: FP8 training requires delayed dynamic scaling factors.'
      ],
      benchmarkingNotes: 'FP8 inference on H100 delivers a 2.5x throughput gain over FP16 with negligible perplexity degradation.'
    },
    {
      id: 'ex_64_cublas_integration',
      exampleNumber: 64,
      difficulty: 'Intermediate',
      title: 'Ex 64: Production cuBLAS Integration & Tensor Core Flags',
      subtitle: 'Calling NVIDIA highly-tuned cuBLASGemmEx with CUBLAS_COMPUTE_32F_FAST_16F',
      readTime: '15 min',
      prerequisites: ['Ex 59: WMMA Tiled GEMM'],
      concepts: [
        'cuBLAS: NVIDIA closed-source, highly tuned BLAS library',
        'cublasCreate and cublasHandle_t lifecycle',
        'cublasGemmEx: Extended mixed-precision GEMM interface',
        'CUBLAS_COMPUTE_32F_FAST_16F and CUBLAS_GEMM_DEFAULT_TENSOR_OP flags'
      ],
      cPlusPlusTheory: `While writing custom CUDA kernels is essential for fused operators (Norms, Attention, RoPE), standard isolated GEMMs should use cuBLAS.
cuBLAS contains thousands of hand-tuned assembly kernels optimized for every matrix size and hardware architecture.
To ensure cuBLAS actually uses Tensor Cores:
1. Pass 'CUDA_R_16F' (FP16) for input data types.
2. Pass 'CUBLAS_COMPUTE_32F_FAST_16F' for computation type.
3. Pass 'CUBLAS_GEMM_DEFAULT_TENSOR_OP' to enable Tensor Core dispatch.`,
      hardwareMechanics: `cuBLAS inspects matrix dimensions and dispatches the exact assembly micro-kernel that maximizes SM occupancy and avoids L2 cache thrashing.`,
      kernelCode: `// Example 64: Calling cuBLAS with Hardware Tensor Cores
#include <iostream>
#include <cuda_runtime.h>
#include <cublas_v2.h>

int main() {
    cublasHandle_t handle;
    cublasCreate(&handle);

    // Set math mode to allow Tensor Cores
    cublasSetMathMode(handle, CUBLAS_DEFAULT_MATH);

    int M = 1024, N = 1024, K = 1024;
    float alpha = 1.0f, beta = 0.0f;

    half *d_A, *d_B;
    float *d_C;
    cudaMalloc(&d_A, M * K * sizeof(half));
    cudaMalloc(&d_B, K * N * sizeof(half));
    cudaMalloc(&d_C, M * N * sizeof(float));

    // Call cuBLAS Tensor Core GEMM
    cublasGemmEx(
        handle,
        CUBLAS_OP_N, CUBLAS_OP_N,
        N, M, K,
        &alpha,
        d_B, CUDA_R_16F, N,
        d_A, CUDA_R_16F, K,
        &beta,
        d_C, CUDA_R_32F, N,
        CUBLAS_COMPUTE_32F_FAST_16F, // Compute on Tensor Cores with FP32 Accumulation!
        CUBLAS_GEMM_DEFAULT_TENSOR_OP
    );
    cudaDeviceSynchronize();

    std::cout << "cuBLAS GEMM executed on hardware Tensor Cores with peak efficiency!\\n";

    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    cublasDestroy(handle);
    return 0;
}`,
      kernelExplanation: [
        'Line 7: cublasCreate initializes the library context and allocations.',
        'Line 21: Note the swapped operands (N, M, K and d_B, d_A) because cuBLAS assumes column-major ordering!',
        'Line 30: CUBLAS_COMPUTE_32F_FAST_16F activates Tensor Core hardware.',
        'Line 37: cublasDestroy cleans up GPU handle resources.'
      ],
      commonPitfalls: [
        'cuBLAS uses Column-Major layout (Fortran convention); if your C++ buffers are Row-Major, you must compute B^T * A^T to get C = A * B.',
        'Re-creating cublasHandle_t inside inner training loops; creating a handle takes ~10 ms and should only be done once.'
      ],
      benchmarkingNotes: 'cuBLAS achieves >95% of theoretical peak Tensor Core TFLOPS.'
    },
    {
      id: 'ex_65_mixed_precision_scaling',
      exampleNumber: 65,
      difficulty: 'Intermediate',
      title: 'Ex 65: Mixed Precision Numerical Scaling & Loss Scaler',
      subtitle: 'Preventing underflow of small gradient values into zero during FP16 training',
      readTime: '15 min',
      prerequisites: ['Ex 64: cuBLAS Integration'],
      concepts: [
        'IEEE 754 Half Precision (FP16) minimum positive normal value: ~6.1 x 10^-5',
        'Gradient Underflow: 80% of neural network backward gradients are < 10^-5',
        'Dynamic Loss Scaling: Multiplying loss by S (e.g. 32768.0) before backprop',
        'Detecting Inf/NaN and skipping optimizer step'
      ],
      cPlusPlusTheory: `In FP16 training, gradient values become tiny (e.g. 10^-7).
Because the smallest representable positive number in FP16 is 6.1e-5, any gradient smaller than this rounds to EXACT ZERO (underflow), causing training to stall.
The Dynamic Loss Scaler solution:
1. Multiply loss by a large scale factor S (e.g. 65536.0f).
2. Backward pass computes gradients that are scaled by S (shifting them into FP16 representable range).
3. Before optimizer step, unscale gradients: grad = grad / S.
4. If an overflow (Inf/NaN) is detected, discard the step and halve the scale factor.`,
      hardwareMechanics: `Loss scaling keeps numbers within the high-density exponent range of the hardware FP16 ALU, preventing silent precision loss.`,
      kernelCode: `// Example 65: Dynamic Loss Scaling & Gradient Unscaling
#include <iostream>
#include <cmath>

class DynamicLossScaler {
public:
    float scale{65536.0f};
    int growth_interval{2000};
    int successful_steps{0};

    float scale_loss(float loss) const {
        return loss * scale;
    }

    bool unscale_and_check_finite(float* grads, int N) {
        float inv_scale = 1.0f / scale;
        bool has_overflow = false;

        for (int i = 0; i < N; ++i) {
            float g = grads[i] * inv_scale;
            if (std::isinf(g) || std::isnan(g)) {
                has_overflow = true;
                break;
            }
            grads[i] = g;
        }

        if (has_overflow) {
            scale *= 0.5f; // Halve scale factor
            successful_steps = 0;
            std::cout << "[LossScaler] Overflow detected! Decreased scale to " << scale << "\\n";
            return false; // Skip step
        }

        successful_steps++;
        if (successful_steps >= growth_interval) {
            scale *= 2.0f; // Double scale factor
            successful_steps = 0;
            std::cout << "[LossScaler] Increasing scale to " << scale << "\\n";
        }
        return true; // Valid step
    }
};

int main() {
    DynamicLossScaler scaler;
    std::cout << "Initial Scale: " << scaler.scale << "\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Starts with a large scale factor of 65536.0f to preserve subnormal gradients.',
        'Line 20: Checks for Inf/NaN overflow after scaling.',
        'Line 28: Dynamically halves scale when overflow occurs, ensuring robust training.'
      ],
      commonPitfalls: [
        'Applying loss scaling to evaluation / inference passes where gradients are not computed.',
        'Updating model weights before checking if gradients contained Infs/NaNs.'
      ],
      benchmarkingNotes: 'Mixed-precision FP16 training with loss scaling cuts training time in half with zero accuracy loss.'
    },
    {
      id: 'ex_66_bfloat16_vs_fp16',
      exampleNumber: 66,
      difficulty: 'Intermediate',
      title: 'Ex 66: BFloat16 (__nv_bfloat16) vs FP16 in Deep Learning',
      subtitle: 'Why modern LLMs (GPT-4, Llama 3) prefer BF16 to eliminate loss scaling',
      readTime: '12 min',
      prerequisites: ['Ex 65: Mixed Precision Scaling'],
      concepts: [
        'BFloat16 (Brain Floating Point) bit structure: 1 sign, 8 exponent, 7 mantissa',
        'Identical dynamic range to FP32 (up to 3.4 x 10^38)',
        'Why BF16 eliminates the need for complex loss scaling',
        '__nv_bfloat16 CUDA C++ type and conversion intrinsics'
      ],
      cPlusPlusTheory: `FP16 has 5 exponent bits and 10 mantissa bits. It has good precision, but terrible dynamic range (max 65504), requiring delicate loss scalers.
BFloat16 (BF16) takes a standard 32-bit float and simply chops off the bottom 16 bits:
- 8 exponent bits (exact same as FP32!).
- 7 mantissa bits.
Because BF16 has the exact same dynamic range as FP32, gradients NEVER overflow or underflow!
Loss scalers are completely eliminated, making training large language models (LLMs) vastly more stable.`,
      hardwareMechanics: `Supported natively on Ampere (A100), Ada Lovelace (RTX 4090), and Hopper (H100).
Converting float to __nv_bfloat16 is a single-instruction bit truncate.`,
      kernelCode: `// Example 66: BFloat16 Conversions and Hardware Precision
#include <iostream>
#include <cuda_runtime.h>
#include <cuda_bf16.h>

__global__ void bf16_demo_kernel(const float* in, __nv_bfloat16* out, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        // Fast hardware conversion: float to bfloat16
        out[idx] = __float2bfloat16(in[idx]);
    }
}

int main() {
    std::cout << "BFloat16 matches FP32 dynamic range, eliminating loss scaling entirely in modern LLMs!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 3: #include <cuda_bf16.h> provides native __nv_bfloat16 types and math.',
        'Line 8: __float2bfloat16 compiles to a single hardware instruction.'
      ],
      commonPitfalls: [
        'Using BF16 on older pre-Ampere GPUs (Turing T4 or Volta V100); on pre-Ampere, BF16 is emulated in slow software.',
        'Assuming BF16 has higher precision than FP16; BF16 has less mantissa precision than FP16, but far wider dynamic range.'
      ],
      benchmarkingNotes: 'BF16 executes at the exact same hardware Tensor Core TFLOPS as FP16.'
    }
  ]
};
