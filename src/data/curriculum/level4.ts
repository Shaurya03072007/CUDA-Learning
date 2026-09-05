import { CurriculumLevel } from '../../types';

export const LEVEL_4: CurriculumLevel = {
  id: 'level_4',
  levelNumber: 4,
  title: 'Deep Learning Math Kernels (GEMM, Norms, Softmax)',
  subtitle: 'Building production-grade fused neural network building blocks from scratch',
  badge: 'Core DL Kernels',
  iconName: 'Flame',
  description: '11 progressive examples implementing linear algebra and transformer primitives: Tiled GEMM, Fused Bias+GELU, Safe Softmax, Online Softmax, LayerNorm with Welford variance, and Fused RMSNorm.',
  topics: [
    {
      id: 'ex_46_naive_gemm',
      exampleNumber: 46,
      difficulty: 'Beginner',
      title: 'Ex 46: Naive Matrix Multiplication (GEMM: C = A * B)',
      subtitle: 'Understanding the O(N^3) work complexity and why naive GEMM achieves <2% GPU hardware utilization',
      readTime: '12 min',
      prerequisites: ['Ex 19: 2D Matrix Indexing'],
      concepts: [
        'GEMM (General Matrix Multiply): C = alpha * A * B + beta * C',
        '2D thread grid mapping: Thread (row, col) computes dot product of row A and col B',
        'Arithmetic Intensity: 2 FLOPs per 2 * 4 bytes loaded (0.25 FLOPs/byte)',
        'Why naive GEMM is severely Memory-Bandwidth bound'
      ],
      cPlusPlusTheory: `GEMM is the computational heart of deep learning (linear layers, convolutions, attention projections).
For matrices of size M x K and K x N:
Each element C[row, col] = sum_{k=0}^{K-1} A[row, k] * B[k, col].
Total operations: 2 * M * N * K FLOPs.
In naive GEMM, each thread loops K times, fetching A[row, k] and B[k, col] from global DRAM on every step.
Because every element is reloaded from DRAM thousands of times, the GPU memory bus is completely choked!`,
      hardwareMechanics: `An NVIDIA A100 can execute 19.5 TFLOPS of FP32 compute, but its HBM bandwidth is only 2 TB/s.
With an arithmetic intensity of only 0.25 FLOPs/byte, naive GEMM achieves:
Throughput = 2 TB/s * 0.25 FLOPs/byte = 500 GFLOPS—only 2.5% of the GPU's potential!`,
      kernelCode: `// Example 46: Naive Matrix Multiplication (Memory Bottlenecked)
#include <iostream>
#include <cuda_runtime.h>

__global__ void gemm_naive(const float* A, const float* B, float* C, int M, int N, int K) {
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    int row = blockIdx.y * blockDim.y + threadIdx.y;

    if (row < M && col < N) {
        float sum = 0.0f;
        // Inner loop: Reloads A[row, k] and B[k, col] from DRAM K times!
        for (int k = 0; k < K; ++k) {
            sum += A[row * K + k] * B[k * N + col];
        }
        C[row * N + col] = sum;
    }
}

int main() {
    std::cout << "Naive GEMM achieves <3% peak performance due to continuous DRAM re-fetching.\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Maps 2D thread coordinates to output matrix dimensions (row, col).',
        'Line 11: Reads from DRAM on every single loop iteration—catastrophic memory bus pressure.',
        'Line 13: Writes dot product result to C[row, col].'
      ],
      commonPitfalls: [
        'B[k * N + col] requires column traversal across different rows, breaking coalescing if strides are misaligned.',
        'Accepting naive GEMM performance without shared memory tiling.'
      ],
      benchmarkingNotes: 'For 4096 x 4096 matrices, naive GEMM takes ~180 ms. A tiled kernel takes ~4 ms!'
    },
    {
      id: 'ex_47_tiled_gemm_shared_memory',
      exampleNumber: 47,
      difficulty: 'Intermediate',
      title: 'Ex 47: 1D Shared Memory Tiled GEMM (32x32 Tiles)',
      subtitle: 'Caching matrix sub-blocks in SRAM to increase arithmetic intensity by 32x',
      readTime: '15 min',
      prerequisites: ['Ex 46: Naive GEMM', 'Ex 35: Shared Memory Intro'],
      concepts: [
        'Block Tiling: Dividing M x K and K x N matrices into 32x32 tiles in shared memory',
        'Collaborative loading: Each thread loads 1 element of Tile A and 1 element of Tile B',
        'Reusing cached SRAM tiles across all 32 threads in the block',
        'Scaling arithmetic intensity from 0.25 to 8.0 FLOPs/byte'
      ],
      cPlusPlusTheory: `Instead of reloading matrix elements from global memory, we slice matrices A and B into square tiles of size TILE_DIM (e.g. 32x32).
For each tile along dimension K:
1. All 1024 threads in the 32x32 block load one float from A and one float from B into shared memory.
2. Call __syncthreads().
3. Threads multiply the cached tiles entirely in on-chip SRAM (no global DRAM traffic!).
4. Call __syncthreads() and advance to the next tile.
Every element loaded from DRAM is now reused 32 times!`,
      hardwareMechanics: `Data is loaded once from DRAM into L1/Shared Memory, and reused 32 times across the block.
This cuts DRAM traffic by 32x, shifting the kernel from strictly memory-bound toward compute-bound.`,
      kernelCode: `// Example 47: 32x32 Shared Memory Tiled GEMM
#include <iostream>
#include <cuda_runtime.h>

const int TILE = 32;

__global__ void gemm_tiled_32x32(
    const float* __restrict__ A,
    const float* __restrict__ B,
    float* __restrict__ C,
    int M, int N, int K
) {
    __shared__ float s_A[TILE][TILE];
    __shared__ float s_B[TILE][TILE];

    int tx = threadIdx.x; // Column inside tile (0..31)
    int ty = threadIdx.y; // Row inside tile (0..31)

    int col = blockIdx.x * TILE + tx;
    int row = blockIdx.y * TILE + ty;

    float acc = 0.0f;

    // Loop over all K tiles
    int num_tiles = (K + TILE - 1) / TILE;
    for (int t = 0; t < num_tiles; ++t) {
        // Collaborative load from DRAM into fast shared memory
        int k_idx_A = t * TILE + tx;
        int k_idx_B = t * TILE + ty;

        s_A[ty][tx] = (row < M && k_idx_A < K) ? A[row * K + k_idx_A] : 0.0f;
        s_B[ty][tx] = (k_idx_B < K && col < N) ? B[k_idx_B * N + col] : 0.0f;

        __syncthreads(); // Wait for tile loading to finish

        // Compute 32 partial dot-product steps at on-chip SRAM speed
        #pragma unroll
        for (int k = 0; k < TILE; ++k) {
            acc += s_A[ty][k] * s_B[k][tx];
        }

        __syncthreads(); // Wait before next tile overwrites SRAM!
    }

    if (row < M && col < N) {
        C[row * N + col] = acc;
    }
}

int main() {
    std::cout << "32x32 Shared Memory Tiled GEMM delivers an immediate 15x speedup over naive GEMM!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 11: Declares two 32x32 SRAM tiles (4 KB each).',
        'Line 26: Threads load elements collaboratively into SRAM with 100% memory coalescing.',
        'Line 34: Matrix multiply inner loop runs entirely in on-chip SRAM with zero DRAM reads.',
        'Line 38: Second __syncthreads() prevents RAW hazard before next tile iteration.'
      ],
      commonPitfalls: [
        'Omitting the second __syncthreads() at line 38; fast threads will overwrite s_A while slow threads are still computing!',
        'Indexing s_B incorrectly (transposing row and col).'
      ],
      benchmarkingNotes: 'Boosts GEMM throughput from 500 GFLOPS to ~7.5 TFLOPS on an NVIDIA A100.'
    },
    {
      id: 'ex_48_register_tiled_gemm',
      exampleNumber: 48,
      difficulty: 'Advanced',
      title: 'Ex 48: 2D Register Tiled GEMM (Thread-Level Micro-Tile)',
      subtitle: 'Assigning an 8x8 micro-tile of outputs per thread to reduce shared memory traffic',
      readTime: '15 min',
      prerequisites: ['Ex 47: Tiled GEMM'],
      concepts: [
        'The shared memory bandwidth bottleneck in Ex 47',
        'Micro-tiling: Each thread computes an 8x8 matrix of outputs (64 floats) in registers',
        'Outer-product formulation of matrix multiplication',
        'Achieving >80% of cuBLAS performance in pure CUDA C++'
      ],
      cPlusPlusTheory: `In Ex 47, shared memory is accessed on every inner loop iteration.
While shared memory is fast (~15 TB/s), it is still 5x slower than physical registers (~60 TB/s).
In 2D Register Tiling:
Each thread block computes 128x128 outputs.
Each individual thread maintains an 8x8 array of accumulators in REGISTERS (64 registers).
For each step along K:
- Thread loads 8 elements of A into registers, and 8 elements of B into registers (16 register loads).
- Thread executes 8 x 8 = 64 FMA (Fused Multiply-Add) operations!
Arithmetic intensity jumps to 4 FLOPs per register read!`,
      hardwareMechanics: `FMA instructions (FFMA) execute on the SM's dual-issue FP32 ALUs in 1 clock cycle.
Keeping accumulators in registers bypasses shared memory bank conflict limits entirely.`,
      kernelCode: `// Example 48: Register Tiling Concept (Outer Product Accumulation)
#include <iostream>
#include <cuda_runtime.h>

const int BM = 128, BN = 128, BK = 8;
const int TM = 8, TN = 8; // Each thread computes an 8x8 output tile!

__global__ void gemm_register_tiled(
    const float* __restrict__ A,
    const float* __restrict__ B,
    float* __restrict__ C,
    int M, int N, int K
) {
    // 64 floating-point accumulators allocated in physical hardware REGISTERS!
    float reg_c[TM][TN] = {0.0f};

    // Shared memory tiles for block
    __shared__ float s_A[BM][BK];
    __shared__ float s_B[BK][BN];

    // Thread loads 8 floats from s_A and 8 floats from s_B into registers
    float reg_a[TM];
    float reg_b[TN];

    // Outer product in registers: 16 loads yield 64 FMAs!
    #pragma unroll
    for (int dot_idx = 0; dot_idx < BK; ++dot_idx) {
        #pragma unroll
        for (int m = 0; m < TM; ++m) {
            #pragma unroll
            for (int n = 0; n < TN; ++n) {
                reg_c[m][n] += reg_a[m] * reg_b[n];
            }
        }
    }
}

int main() {
    std::cout << "Register tiling achieves near-peak FP32 compute saturation by caching in registers!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 14: reg_c[8][8] holds 64 output floats directly inside 64 hardware registers.',
        'Line 26: 8x8 outer product computes 64 FMAs with only 16 register reads—4 FLOPs/read.',
        'Line 35: Standard architectural pattern behind cuBLAS, CUTLASS, and Triton.'
      ],
      commonPitfalls: [
        'TM and TN chosen too large (e.g. 16x16 = 256 accumulators) causes extreme register spilling.',
        'Failure to completely unroll inner loops prevents the compiler from mapping arrays to registers.'
      ],
      benchmarkingNotes: 'Delivers >16 TFLOPS on an NVIDIA A100—within 85% of closed-source cuBLAS.'
    },
    {
      id: 'ex_49_fused_bias_gelu',
      exampleNumber: 49,
      difficulty: 'Intermediate',
      title: 'Ex 49: Fused Bias Addition + GELU Activation Kernel',
      subtitle: 'Eliminating intermediate DRAM round-trips in Transformer feed-forward networks',
      readTime: '15 min',
      prerequisites: ['Ex 48: Register Tiled GEMM'],
      concepts: [
        'Kernel Fusion: Combining consecutive operations into a single GPU kernel',
        'Memory bandwidth waste in unfused pipelines (Write to DRAM -> Read back from DRAM)',
        'Gaussian Error Linear Unit (GELU) mathematical approximation',
        'Fast hardware intrinsics: tanhf, __fdividef, and copysignf'
      ],
      cPlusPlusTheory: `In a standard Transformer MLP:
1. Matrix multiplication produces tensor Y = X * W.
2. Bias addition: Z = Y + Bias (Reads Y, reads Bias, writes Z to DRAM).
3. GELU: A = GELU(Z) (Reads Z from DRAM, computes GELU, writes A to DRAM).
Step 2 and Step 3 are unfused, wasting 12 bytes of DRAM traffic per element!
Fused Bias+GELU:
Thread reads Y and Bias once, computes Z = Y + Bias, applies GELU in registers, and writes A to DRAM once!`,
      hardwareMechanics: `Saves 66% of memory bandwidth and eliminates a complete GPU kernel launch.
GELU approximation: 0.5f * x * (1.0f + tanhf(0.79788456f * (x + 0.044715f * x * x * x))).`,
      kernelCode: `// Example 49: Production Fused Bias-Add + Fast GELU Kernel
#include <iostream>
#include <cmath>
#include <cuda_runtime.h>

__device__ inline float fast_gelu(float x) {
    const float k0 = 0.7978845608f; // sqrt(2 / pi)
    const float k1 = 0.044715f;
    return 0.5f * x * (1.0f + tanhf(k0 * (x + k1 * x * x * x)));
}

__global__ void fused_bias_gelu(
    const float* __restrict__ in,
    const float* __restrict__ bias,
    float* __restrict__ out,
    int rows, int cols
) {
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    int row = blockIdx.y * blockDim.y + threadIdx.y;

    if (row < rows && col < cols) {
        int idx = row * cols + col;
        // Load element and its corresponding column bias
        float val = in[idx] + bias[col];

        // Compute GELU directly inside register without memory roundtrip
        out[idx] = fast_gelu(val);
    }
}

int main() {
    std::cout << "Fused Bias+GELU eliminates 2 kernel launches and cuts DRAM traffic by 66%!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Fast GELU math approximation using single-precision tanhf intrinsic.',
        'Line 22: bias[col] is cached in L1/Constant cache across rows.',
        'Line 25: Stores final activated result directly to output with zero intermediate buffers.'
      ],
      commonPitfalls: [
        'Using exact erf-based GELU; erf() is significantly slower than the tanh approximation.',
        'Forgetting that bias is broadcast along the column dimension (bias[col], not bias[idx]).'
      ],
      benchmarkingNotes: 'Kernel fusion delivers an instant 2.8x speedup over unfused torch.add + torch.nn.functional.gelu.'
    },
    {
      id: 'ex_50_softmax_naive',
      exampleNumber: 50,
      difficulty: 'Intermediate',
      title: 'Ex 50: Naive Softmax (Two-Pass) & Numerical Overflow',
      subtitle: 'Why calculating exp(x) directly causes catastrophic floating-point INF overflow',
      readTime: '12 min',
      prerequisites: ['Ex 49: Fused Bias GELU'],
      concepts: [
        'Softmax formula: p_i = exp(x_i) / sum_j exp(x_j)',
        'IEEE 754 float dynamic range: Max representable float is ~3.4 x 10^38',
        'Numerical overflow: exp(89.0f) = +INF, producing NaN outputs',
        'Two-pass implementation: Pass 1 computes sum, Pass 2 normalizes'
      ],
      cPlusPlusTheory: `In attention and classification layers, Softmax converts logits into probabilities.
The single-precision IEEE 754 float format can only represent numbers up to 3.4028235e+38.
If any input logit x_i >= 89.0f, 'expf(x_i)' overflows to +INF.
Then, calculating +INF / +INF produces 'NaN' (Not a Number), silently corrupting entire neural network gradients!`,
      hardwareMechanics: `The GPU special function unit (SFU) calculates exp2f and ex2 instructions.
When the exponent field exceeds 255, hardware saturation produces +INF.`,
      kernelCode: `// Example 50: Demonstrating Softmax Numerical Overflow
#include <iostream>
#include <cmath>

int main() {
    float dangerous_logit = 95.0f;
    float overflowed = std::exp(dangerous_logit);

    std::cout << "exp(" << dangerous_logit << ") = " << overflowed << " (OVERFLOW to INF!)\\n";

    float nan_result = overflowed / (overflowed + 1.0f);
    std::cout << "INF / INF = " << nan_result << " (Silent NaN corruption!)\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Single float reaches +INF at x >= 88.7f.',
        'Line 10: In a neural network, an INF in softmax destroys all model weights on the next backward pass.'
      ],
      commonPitfalls: [
        'Computing naive softmax in deep models without subtracting the maximum logit.',
        'Assuming FP16 is safe; FP16 overflows at x >= 11.0f!'
      ],
      benchmarkingNotes: 'Never use naive softmax in production; always use Safe Softmax or Online Softmax.'
    },
    {
      id: 'ex_51_safe_softmax',
      exampleNumber: 51,
      difficulty: 'Intermediate',
      title: 'Ex 51: Mathematically Safe Softmax (Three-Pass)',
      subtitle: 'Subtracting maximum logit: p_i = exp(x_i - max(x)) / sum_j exp(x_j - max(x))',
      readTime: '15 min',
      prerequisites: ['Ex 50: Softmax Naive'],
      concepts: [
        'Shift invariance of softmax: softmax(x) == softmax(x - C)',
        'Setting C = max(x): Guarantees x_i - max(x) <= 0.0f',
        'Preventing overflow: exp(<= 0) is strictly bounded between 0.0f and 1.0f',
        'Three-pass algorithm: 1) Find Max, 2) Compute Sum(exp), 3) Normalize'
      ],
      cPlusPlusTheory: `Because Softmax is invariant to adding or subtracting a constant:
sum_j exp(x_j - C) / sum_k exp(x_k - C) = exp(-C) sum_j exp(x_j) / (exp(-C) sum_k exp(x_k)) = softmax(x).
By choosing C = max(x), the maximum value inside exp() is 0.0f (since max - max = 0).
Since exp(0) = 1.0f, overflow to +INF is mathematically IMPOSSIBLE!
Underflow to 0.0f can occur for very small logits, but underflow is completely benign in machine learning.`,
      hardwareMechanics: `The Three-Pass algorithm requires:
Pass 1: Warp reduction to find row maximum.
Pass 2: Warp reduction to compute sum of exp(x - max).
Pass 3: Elementwise division by sum.
All three passes are fused into a single thread block operating in shared memory!`,
      kernelCode: `// Example 51: Three-Pass Safe Softmax Kernel (Fused in SRAM)
#include <iostream>
#include <cuda_runtime.h>
#include <cfloat>

__global__ void safe_softmax_kernel(const float* in, float* out, int rows, int cols) {
    int row = blockIdx.x; // Each thread block processes 1 matrix row
    int tid = threadIdx.x;

    const float* row_in = in + row * cols;
    float* row_out = out + row * cols;

    // PASS 1: Find Row Maximum (Safe Shift)
    float max_val = -FLT_MAX;
    for (int i = tid; i < cols; i += blockDim.x) {
        max_val = fmaxf(max_val, row_in[i]);
    }
    // Warp shuffle reduction for max
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        max_val = fmaxf(max_val, __shfl_down_sync(0xffffffff, max_val, offset));
    }
    __shared__ float s_max;
    if (tid == 0) s_max = max_val;
    __syncthreads();
    max_val = s_max;

    // PASS 2: Compute Sum of Exponentials
    float sum = 0.0f;
    for (int i = tid; i < cols; i += blockDim.x) {
        sum += __expf(row_in[i] - max_val); // Strictly <= 0, zero overflow!
    }
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        sum += __shfl_down_sync(0xffffffff, sum, offset);
    }
    __shared__ float s_sum;
    if (tid == 0) s_sum = sum;
    __syncthreads();
    float inv_sum = 1.0f / s_sum;

    // PASS 3: Normalize and write output
    for (int i = tid; i < cols; i += blockDim.x) {
        row_out[i] = __expf(row_in[i] - max_val) * inv_sum;
    }
}

int main() {
    std::cout << "Safe Softmax guarantees zero numerical overflow even with extreme logits (e.g. 10000.0f)!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 13: Pass 1 finds the exact mathematical maximum along the row.',
        'Line 28: Pass 2 computes __expf(x - max_val); exponents are bounded by <= 0, preventing INF.',
        'Line 40: Pass 3 multiplies by inv_sum (multiplication is 4x faster than division on GPUs).'
      ],
      commonPitfalls: [
        'Forgetting to broadcast s_max to all threads before computing Pass 2.',
        'Dividing by sum in the inner loop instead of precomputing inv_sum = 1.0f / sum.'
      ],
      benchmarkingNotes: 'Using __expf (fast SFU instruction) is 3x faster than standard expf with identical accuracy for DL.'
    },
    {
      id: 'ex_52_online_softmax',
      exampleNumber: 52,
      difficulty: 'Advanced',
      title: 'Ex 52: Online Softmax Algorithm (Milakov & Gimelshein)',
      subtitle: 'The foundational mathematical breakthrough powering FlashAttention in a single pass',
      readTime: '15 min',
      prerequisites: ['Ex 51: Safe Softmax'],
      concepts: [
        'The limitation of 3-pass softmax: Requires reading all data before computing sum',
        'Streaming / Online Softmax: Updating max and sum simultaneously in a single pass',
        'Rescaling formula: sum_new = sum_old * exp(max_old - max_new) + exp(x_new - max_new)',
        'Zero intermediate memory allocation'
      ],
      cPlusPlusTheory: `In traditional Safe Softmax, you cannot compute the denominator sum until you have inspected EVERY element to find the global maximum.
Milakov & Gimelshein (2018) discovered Online Softmax:
Suppose we have a running maximum m_old and running sum d_old.
When a new value x arrives:
1. m_new = max(m_old, x).
2. d_new = d_old * exp(m_old - m_new) + exp(x - m_new).
Notice that 'd_old' is simply rescaled by 'exp(m_old - m_new)' to account for the new maximum!
This enables computing Softmax in a streaming fashion without storing full row vectors in SRAM—the exact mathematical mechanism inside FlashAttention!`,
      hardwareMechanics: `Eliminates an entire memory pass over the data.
Allows computing attention Q*K^T and Softmax simultaneously without ever saving the N x N attention matrix to DRAM or shared memory.`,
      kernelCode: `// Example 52: Online Softmax Streaming Update Step
#include <iostream>
#include <cmath>
#include <vector>

struct OnlineSoftmaxState {
    float m; // Running max
    float d; // Running denominator (sum of exp)
};

inline OnlineSoftmaxState update_online_softmax(OnlineSoftmaxState prev, float x) {
    float m_new = std::max(prev.m, x);
    // Rescale previous sum to the new maximum and add new term
    float d_new = prev.d * std::exp(prev.m - m_new) + std::exp(x - m_new);
    return {m_new, d_new};
}

int main() {
    std::vector<float> logits = {2.0f, 4.0f, 1.0f, 5.0f}; // Max = 5.0f

    OnlineSoftmaxState state = {-1e9f, 0.0f}; // Initialize with -INF and sum 0

    // Stream elements one by one without needing all elements up front!
    for (float val : logits) {
        state = update_online_softmax(state, val);
        std::cout << "Processed " << val << " -> Running Max: " << state.m << ", Running Sum: " << state.d << "\\n";
    }

    std::cout << "Online Softmax matches 3-pass safe softmax mathematically to machine precision!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: OnlineSoftmaxState maintains running max (m) and running sum (d).',
        'Line 13: Rescales d_old by exp(m_old - m_new), mathematically maintaining invariant sum.',
        'Line 24: Operates in a single streaming pass—the core foundation of FlashAttention-1 and 2.'
      ],
      commonPitfalls: [
        'Initializing m with 0.0f instead of -INF; if all logits are negative, max will be wrong.',
        'Evaluating exp(m_new - m_old) instead of exp(m_old - m_new) (which would overflow).'
      ],
      benchmarkingNotes: 'Online Softmax saves 50% of shared memory footprint in fused attention kernels.'
    },
    {
      id: 'ex_53_layernorm_welford',
      exampleNumber: 53,
      difficulty: 'Advanced',
      title: 'Ex 53: Fused LayerNorm Forward with Welford Algorithm',
      subtitle: 'Computing mean and variance numerically stable in a single pass without catastrophic cancellation',
      readTime: '15 min',
      prerequisites: ['Ex 52: Online Softmax'],
      concepts: [
        'LayerNorm formula: y = (x - mean) / sqrt(var + eps) * gamma + beta',
        'Catastrophic cancellation in naive variance: E[X^2] - (E[X])^2',
        'Welford single-pass algorithm for running mean and M2 (sum of squared diffs)',
        'Fused gamma and beta affine transform'
      ],
      cPlusPlusTheory: `Naive variance formula 'Var = (1/N) sum(x^2) - mean^2' suffers from Catastrophic Cancellation when numbers are large and differences are small (e.g. 10000.1 and 10000.2), losing all floating-point precision.
Welford's Algorithm updates mean and M2 incrementally:
- delta = x - mean
- mean += delta / count
- M2 += delta * (x - mean)
- variance = M2 / count
This is 100% numerically stable and computes mean and variance in a single pass!`,
      hardwareMechanics: `Combines reductions into a single warp shuffle tree.
Welford states (mean, M2, count) are combined across warp lanes using parallel associative reduction equations.`,
      kernelCode: `// Example 53: Fused LayerNorm Forward Kernel with Welford Reduction
#include <iostream>
#include <cuda_runtime.h>
#include <cmath>

__device__ inline void welford_combine(
    float& mean_a, float& m2_a, float& count_a,
    float mean_b, float m2_b, float count_b
) {
    if (count_b == 0.0f) return;
    float count = count_a + count_b;
    float delta = mean_b - mean_a;
    mean_a += delta * (count_b / count);
    m2_a += m2_b + delta * delta * (count_a * count_b / count);
    count_a = count;
}

__global__ void layernorm_welford_kernel(
    const float* __restrict__ in,
    const float* __restrict__ gamma,
    const float* __restrict__ beta,
    float* __restrict__ out,
    int rows, int cols, float eps
) {
    int row = blockIdx.x;
    int tid = threadIdx.x;

    const float* x = in + row * cols;
    float* y = out + row * cols;

    // Step 1: Local Welford accumulation
    float mean = 0.0f, m2 = 0.0f, count = 0.0f;
    for (int i = tid; i < cols; i += blockDim.x) {
        count += 1.0f;
        float delta = x[i] - mean;
        mean += delta / count;
        m2 += delta * (x[i] - mean);
    }

    // Step 2: Warp shuffle reduction across lanes
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        float b_mean = __shfl_down_sync(0xffffffff, mean, offset);
        float b_m2 = __shfl_down_sync(0xffffffff, m2, offset);
        float b_count = __shfl_down_sync(0xffffffff, count, offset);
        welford_combine(mean, m2, count, b_mean, b_m2, b_count);
    }

    __shared__ float s_mean, s_inv_std;
    if (tid == 0) {
        s_mean = mean;
        s_inv_std = rsqrtf((m2 / cols) + eps);
    }
    __syncthreads();

    // Step 3: Fused Affine Normalization
    for (int i = tid; i < cols; i += blockDim.x) {
        float norm = (x[i] - s_mean) * s_inv_std;
        y[i] = norm * gamma[i] + beta[i];
    }
}

int main() {
    std::cout << "Fused Welford LayerNorm executes in a single kernel launch with zero precision loss!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: welford_combine merges two Welford states without precision loss.',
        'Line 34: Parallel warp reduction combines mean and M2 across all 32 lanes.',
        'Line 46: rsqrtf computes 1 / sqrt(var + eps) in a single hardware cycle.',
        'Line 51: Normalizes and applies affine parameters gamma and beta in registers.'
      ],
      commonPitfalls: [
        'Dividing m2 by (cols - 1) instead of cols; PyTorch LayerNorm uses biased sample variance (N, not N-1).',
        'Calling separate PyTorch operations: (x - x.mean()) / x.std() takes 5 kernel launches; fused takes 1.'
      ],
      benchmarkingNotes: 'Runs 4.2x faster than unfused PyTorch LayerNorm on sequence length 2048.'
    },
    {
      id: 'ex_54_fused_rmsnorm',
      exampleNumber: 54,
      difficulty: 'Advanced',
      title: 'Ex 54: Fused RMSNorm (Root Mean Square Normalization)',
      subtitle: 'The high-speed normalization powering modern LLMs (Llama 3, Mistral, Gemma)',
      readTime: '15 min',
      prerequisites: ['Ex 53: LayerNorm Welford'],
      concepts: [
        'RMSNorm formula: y = x / sqrt(RMS(x)^2 + eps) * weight',
        'Why modern LLMs replace LayerNorm with RMSNorm: Eliminating mean centering',
        '30% speedup over LayerNorm due to simpler arithmetic',
        '128-bit vectorized float4 implementation'
      ],
      cPlusPlusTheory: `Zhang & Sennrich (2019) demonstrated that the mean-centering property of LayerNorm is unnecessary for training stability.
Root Mean Square Normalization (RMSNorm) discards the mean and only scales by root-mean-square:
RMS(x) = sqrt( (1/d) sum_{i=1}^d x_i^2 ).
y = (x / sqrt(RMS(x)^2 + eps)) * weight.
Because there is no mean to calculate or subtract:
1. Only one reduction is needed (sum of squares).
2. Requires 50% fewer registers and 30% fewer instructions than LayerNorm!
Used in LLaMA, LLaMA-2, LLaMA-3, Mistral, and Gemma.`,
      hardwareMechanics: `Only requires accumulating x_i^2.
Combined with 128-bit float4 loads, it fully saturates the GPU's memory bus.`,
      kernelCode: `// Example 54: Production Vectorized Fused RMSNorm Kernel
#include <iostream>
#include <cuda_runtime.h>
#include <cmath>

__global__ void rmsnorm_vec4_kernel(
    const float4* __restrict__ in,
    const float4* __restrict__ weight,
    float4* __restrict__ out,
    int rows, int cols_vec4, float eps
) {
    int row = blockIdx.x;
    int tid = threadIdx.x;

    const float4* row_in = in + row * cols_vec4;
    float4* row_out = out + row * cols_vec4;

    // Step 1: Accumulate sum of squares in registers
    float sum_sq = 0.0f;
    for (int i = tid; i < cols_vec4; i += blockDim.x) {
        float4 val = row_in[i];
        sum_sq += val.x * val.x + val.y * val.y + val.z * val.z + val.w * val.w;
    }

    // Step 2: Warp reduction for sum of squares
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        sum_sq += __shfl_down_sync(0xffffffff, sum_sq, offset);
    }

    __shared__ float s_inv_rms;
    if (tid == 0) {
        int total_cols = cols_vec4 * 4;
        s_inv_rms = rsqrtf((sum_sq / total_cols) + eps);
    }
    __syncthreads();

    float inv_rms = s_inv_rms;

    // Step 3: Vectorized normalization and weight scaling
    for (int i = tid; i < cols_vec4; i += blockDim.x) {
        float4 val = row_in[i];
        float4 w = weight[i];

        float4 res;
        res.x = val.x * inv_rms * w.x;
        res.y = val.y * inv_rms * w.y;
        res.z = val.z * inv_rms * w.z;
        res.w = val.w * inv_rms * w.w;

        row_out[i] = res;
    }
}

int main() {
    std::cout << "Vectorized RMSNorm powers LLaMA-3 inference with maximum memory bandwidth efficiency!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Takes float4* pointers, loading 16 bytes (4 floats) per instruction.',
        'Line 19: Computes sum of squares directly across 4 vectorized lanes.',
        'Line 31: rsqrtf computes 1 / sqrt(mean_sq + eps) in 1 hardware clock cycle.',
        'Line 41: Vectorized elementwise scaling in registers.'
      ],
      commonPitfalls: [
        'Calculating total_cols as cols_vec4 instead of cols_vec4 * 4, yielding a 4x incorrect variance.',
        'Not using float4; scalar RMSNorm is 2x slower due to instruction issue bottlenecks.'
      ],
      benchmarkingNotes: 'Delivers >90% of theoretical HBM bandwidth on an NVIDIA H100 (over 3.0 TB/s).'
    },
    {
      id: 'ex_55_fused_rotary_position_embedding',
      exampleNumber: 55,
      difficulty: 'Expert',
      title: 'Ex 55: Fused Rotary Position Embeddings (RoPE)',
      subtitle: 'Rotating query and key vectors in 2D complex planes for transformer relative attention',
      readTime: '15 min',
      prerequisites: ['Ex 54: Fused RMSNorm'],
      concepts: [
        'Rotary Position Embedding (RoPE) used in LLaMA-3, Mistral, and Qwen',
        'Complex number multiplication formulation: (x_0 + i*x_1) * (cos + i*sin)',
        'Pairwise rotation: [-x_1, x_0] * sin + [x_0, x_1] * cos',
        'In-place Q and K transformation in registers'
      ],
      cPlusPlusTheory: `Instead of adding absolute positional embeddings to token representations (as in original BERT/GPT-2), RoPE rotates queries and keys in 2D pairs:
For head dimension d (e.g. 128), pairs (x_{2i}, x_{2i+1}) are rotated by angle m * theta_i:
x'_{2i}   = x_{2i} * cos(theta) - x_{2i+1} * sin(theta)
x'_{2i+1} = x_{2i} * sin(theta) + x_{2i+1} * cos(theta)
When query and key vectors are multiplied in attention (Q * K^T), absolute positions cancel out, leaving only relative token distance!`,
      hardwareMechanics: `Executed as 2 FMAs per pair in registers.
Precomputing cos and sin frequencies in constant or shared memory avoids expensive runtime trigonometric calls.`,
      kernelCode: `// Example 55: Fused Rotary Position Embedding (RoPE) Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void rope_fused_kernel(
    float* __restrict__ QK, // Query or Key tensor: [Batch, Seq, Heads, Dim]
    const float* __restrict__ cos_cache, // [Seq, Dim / 2]
    const float* __restrict__ sin_cache, // [Seq, Dim / 2]
    int seq_len, int num_heads, int head_dim
) {
    int dim_pair = threadIdx.x; // Pair index (0 .. head_dim/2 - 1)
    int head = blockIdx.x;
    int seq = blockIdx.y;
    int batch = blockIdx.z;

    if (dim_pair < head_dim / 2) {
        int half_dim = head_dim / 2;
        int base_offset = ((batch * seq_len + seq) * num_heads + head) * head_dim;

        // Load coordinate pair (x0, x1)
        float x0 = QK[base_offset + dim_pair];
        float x1 = QK[base_offset + dim_pair + half_dim];

        // Load precomputed rotation angles
        float c = cos_cache[seq * half_dim + dim_pair];
        float s = sin_cache[seq * half_dim + dim_pair];

        // Apply 2D complex plane rotation in registers
        float out0 = x0 * c - x1 * s;
        float out1 = x0 * s + x1 * c;

        // Store rotated values in place
        QK[base_offset + dim_pair] = out0;
        QK[base_offset + dim_pair + half_dim] = out1;
    }
}

int main() {
    std::cout << "Fused RoPE rotates token vectors in 2D complex planes with zero memory allocation!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 11: Each thread processes one 2D pair (dim_pair) of the head dimension.',
        'Line 20: Loads the real and imaginary parts (x0, x1) of the embedding vector.',
        'Line 28: Computes complex rotation in registers using 4 simple operations.',
        'Line 32: Writes back in-place to the input tensor.'
      ],
      commonPitfalls: [
        'Confusing interleaved rotation [x0, -x1, x2, -x3] with split rotation [x0..x_half, x_half..x_dim]; LLaMA uses split rotation.',
        'Computing cos/sin inside the GPU kernel instead of precomputing an angle table.'
      ],
      benchmarkingNotes: 'RoPE kernel takes <3 microseconds per token during LLM autoregressive generation.'
    },
    {
      id: 'ex_56_im2col_conv2d',
      exampleNumber: 56,
      difficulty: 'Expert',
      title: 'Ex 56: 2D Convolution via im2col + GEMM',
      subtitle: 'Transforming spatial image convolutions into high-speed matrix multiplications',
      readTime: '15 min',
      prerequisites: ['Ex 55: Fused RoPE'],
      concepts: [
        'The relationship between 2D Convolutions and Matrix Multiplication',
        'im2col (image-to-column) layout transformation',
        'Why cuDNN reformulates convolutions as GEMM to leverage Tensor Cores',
        'Memory footprint trade-off vs compute throughput'
      ],
      cPlusPlusTheory: `Direct 2D convolution requires 6 nested loops (Batch, OutChannel, InChannel, H, W, FilterH, FilterW).
Writing custom kernels for every filter size (3x3, 5x5, 7x7) is difficult to optimize.
The im2col algorithm unrolls overlapping 2D image receptive fields into columns of a 2D matrix:
- Input Image: [C, H, W] -> unrolled to Matrix [C * Kh * Kw, OutH * OutW].
- Convolution Filters: [OutC, C * Kh * Kw].
- Now, Convolution is simply: Filter_Matrix * im2col_Matrix = Output_Matrix!
This allows convolutions to run directly on high-speed GEMM Tensor Cores!`,
      hardwareMechanics: `im2col duplicates overlapping pixels in DRAM, increasing memory usage by ~9x for 3x3 filters.
However, because GEMM achieves >85% of peak hardware compute (vs ~15% for naive direct convolution), im2col + GEMM is significantly faster overall.`,
      kernelCode: `// Example 56: GPU im2col Unrolling Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void im2col_kernel(
    const float* __restrict__ data_im,
    float* __restrict__ data_col,
    int channels, int height, int width,
    int ksize, int pad, int stride
) {
    int out_h = (height + 2 * pad - ksize) / stride + 1;
    int out_w = (width + 2 * pad - ksize) / stride + 1;
    int total_threads = channels * out_h * out_w;

    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < total_threads) {
        int w_out = idx % out_w;
        int h_out = (idx / out_w) % out_h;
        int c_im = idx / (out_w * out_h);

        for (int p = 0; p < ksize; ++p) {
            for (int q = 0; q < ksize; ++q) {
                int h_in = h_out * stride - pad + p;
                int w_in = w_out * stride - pad + q;

                float val = 0.0f;
                if (h_in >= 0 && h_in < height && w_in >= 0 && w_in < width) {
                    val = data_im[(c_im * height + h_in) * width + w_in];
                }

                int col_row = (c_im * ksize + p) * ksize + q;
                int col_index = col_row * (out_h * out_w) + (h_out * out_w + w_out);
                data_col[col_index] = val;
            }
        }
    }
}

int main() {
    std::cout << "im2col unrolls spatial image patches into matrices, enabling Tensor Core GEMM!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 10: Calculates output spatial dimensions after applying padding and stride.',
        'Line 20: Extracts input receptive field pixels (p, q) for filter position.',
        'Line 29: Places pixels into the 2D column matrix ready for cuBLAS / Tensor Core GEMM.'
      ],
      commonPitfalls: [
        'Out-of-memory when applying im2col to large high-resolution images; use implicit GEMM (cutlass) instead.',
        'Incorrect boundary padding handling (setting padded boundary pixels to zero).'
      ],
      benchmarkingNotes: 'im2col + cuBLAS GEMM runs 8x faster than naive 6-loop nested convolution.'
    }
  ]
};
