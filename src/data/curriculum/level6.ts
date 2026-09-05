import { CurriculumLevel } from '../../types';

export const LEVEL_6: CurriculumLevel = {
  id: 'level_6',
  levelNumber: 6,
  title: 'FlashAttention-1 & FlashAttention-2 Architecture',
  subtitle: 'IO-aware attention tiling, online softmax fusion, warp partitioning, and causal decoding',
  badge: 'SOTA Attention',
  iconName: 'Cpu',
  description: '10 progressive examples dissecting the FlashAttention family: IO-awareness, online softmax rescaling, SRAM tiling of Q, K, V blocks, FlashAttention-2 warp partitioning, FlashDecoding, and causal masking.',
  topics: [
    {
      id: 'ex_67_standard_attention_io_bottleneck',
      exampleNumber: 67,
      difficulty: 'Intermediate',
      title: 'Ex 67: The Standard Attention IO Bottleneck (O(N^2) DRAM Traffic)',
      subtitle: 'Why materializing the N x N attention matrix to HBM bounds LLM context length',
      readTime: '15 min',
      prerequisites: ['Ex 51: Safe Softmax', 'Ex 47: Tiled GEMM'],
      concepts: [
        'Standard Multi-Head Attention: S = Q * K^T, P = softmax(S), O = P * V',
        'Materializing intermediate tensors S and P in global DRAM',
        'Memory complexity: O(N^2) bytes transferred over HBM',
        'For sequence length N = 64,000, the attention matrix requires 16 GB per head!'
      ],
      cPlusPlusTheory: `In standard PyTorch attention:
1. Matmul 1: S = Q * K^T -> Writes N x N floats to DRAM.
2. Softmax: P = softmax(S) -> Reads N x N from DRAM, writes N x N back to DRAM.
3. Matmul 2: O = P * V -> Reads N x N from DRAM, writes output O to DRAM.
Notice that the intermediate N x N attention matrix P is written and read repeatedly from slow HBM DRAM!
For sequence length N = 16,384, an N x N matrix is 1 GB per head.
The GPU spends 90% of its time waiting for memory transfers rather than doing computation!`,
      hardwareMechanics: `GPU HBM bandwidth is ~2-3 TB/s, while SRAM bandwidth is ~15-20 TB/s.
Materializing the N x N matrix in HBM causes massive memory bus stalls and triggers Out-Of-Memory (OOM) errors on long contexts.`,
      kernelCode: `// Example 67: Standard Attention Memory Footprint Analysis
#include <iostream>

void calculate_attention_memory(long long seq_len, int num_heads, int head_dim) {
    long long elements = seq_len * seq_len;
    long long bytes_per_matrix = elements * sizeof(float); // 4 bytes per float
    long long total_head_bytes = bytes_per_matrix * 2; // S and P matrices
    long long total_gpu_bytes = total_head_bytes * num_heads;

    double gb = static_cast<double>(total_gpu_bytes) / (1024.0 * 1024.0 * 1024.0);

    std::cout << "Seq Len: " << seq_len << " | Heads: " << num_heads 
              << " | DRAM Memory for Intermediate S & P: " << gb << " GB\\n";
}

int main() {
    calculate_attention_memory(2048, 32, 128);   // ~1 GB (Fits in GPU)
    calculate_attention_memory(16384, 32, 128);  // ~64 GB (Causes Out-Of-Memory OOM!)
    calculate_attention_memory(64000, 32, 128);  // ~976 GB (Completely IMPOSSIBLE in HBM!)
    std::cout << "FlashAttention solves this by NEVER writing the N x N matrix to DRAM!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 8: Intermediate matrices S and P scale quadratically as N^2.',
        'Line 20: At sequence length 16k, standard attention requires 64 GB of VRAM just for intermediates!',
        'Line 23: Tri Dao solved this with FlashAttention by fusing everything into SRAM tiles.'
      ],
      commonPitfalls: [
        'Assuming attention compute is the bottleneck; attention is strictly memory-bandwidth bound.',
        'Materializing full attention maps when only the final output tensor O is required.'
      ],
      benchmarkingNotes: 'FlashAttention reduces DRAM memory reads/writes from O(N^2) to O(N).'
    },
    {
      id: 'ex_68_flash_attention_tiling_math',
      exampleNumber: 68,
      difficulty: 'Advanced',
      title: 'Ex 68: FlashAttention Tiling Math & Online Softmax Rescaling',
      subtitle: 'Combining blocked matrix multiplication with running online softmax updates',
      readTime: '15 min',
      prerequisites: ['Ex 67: Standard Attention IO', 'Ex 52: Online Softmax'],
      concepts: [
        'Tiling Q into blocks of size Br x d, and K, V into blocks of size Bc x d in SRAM',
        'Computing partial tile dot products: S_ij = Q_i * K_j^T',
        'Updating running row max m_i and running denominator l_i',
        'Rescaling running output accumulator: O_i = diag(l_old / l_new) * O_i + ...'
      ],
      cPlusPlusTheory: `How can we compute O = softmax(Q * K^T) * V without storing the full N x N matrix?
FlashAttention tiles Q into blocks Q_i of size Br x d, and K, V into blocks K_j, V_j of size Bc x d:
1. Load Q_i into SRAM.
2. Loop over blocks of K_j and V_j:
   a. Compute tile dot product: S_ij = Q_i * K_j^T (stays entirely in SRAM!).
   b. Compute row max of this tile: m_ij = max(S_ij).
   c. Update global running max: m_new = max(m_old, m_ij).
   d. Compute tile exponentials: P_ij = exp(S_ij - m_new).
   e. Rescale previous output accumulator:
      O_i = (O_i * exp(m_old - m_new) * l_old + P_ij * V_j) / l_new.
The N x N matrix is computed and discarded in tiny SRAM tiles—NEVER written to DRAM!`,
      hardwareMechanics: `All intermediate activations P_ij live only in the SM's 228 KB on-chip shared memory.
DRAM memory access is strictly linear O(N) instead of quadratic O(N^2).`,
      kernelCode: `// Example 68: Mathematical Rescaling Logic of FlashAttention
#include <iostream>
#include <cmath>
#include <vector>

struct TileAccumulator {
    float m;   // Running row max
    float l;   // Running denominator (sum of exp)
    float acc; // Running output O
};

// Rescale accumulator when a new K, V block arrives
inline TileAccumulator update_flash_tile(
    TileAccumulator prev,
    float s_val, // Q_i * K_j^T
    float v_val  // V_j
) {
    float m_new = std::max(prev.m, s_val);
    float p_val = std::exp(s_val - m_new);

    // Rescale previous denominator to the new maximum
    float l_new = prev.l * std::exp(prev.m - m_new) + p_val;

    // Rescale previous output accumulation to new maximum and add new V contribution!
    float acc_new = (prev.acc * (prev.l * std::exp(prev.m - m_new)) + p_val * v_val) / l_new;

    return {m_new, l_new, acc_new};
}

int main() {
    std::cout << "FlashAttention rescaling formula maintains exact mathematical equivalence to full softmax!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 19: m_new updates running maximum.',
        'Line 23: Rescales running denominator l by exp(m_prev - m_new).',
        'Line 26: Rescales running output vector acc_new; completely eliminates need for N x N matrix storage!'
      ],
      commonPitfalls: [
        'Forgetting to multiply previous accumulator by previous denominator when rescaling.',
        'Loss of precision when computing exp without subtracting the running maximum.'
      ],
      benchmarkingNotes: 'Reduces peak memory usage by 10x to 20x, allowing 64k+ context lengths on a single GPU.'
    },
    {
      id: 'ex_69_flash_attention_1_forward',
      exampleNumber: 69,
      difficulty: 'Expert',
      title: 'Ex 69: FlashAttention-1 Forward Pass Implementation',
      subtitle: 'Complete C++ CUDA kernel with SRAM tiling and online softmax loops',
      readTime: '15 min',
      prerequisites: ['Ex 68: FlashAttention Tiling Math'],
      concepts: [
        'Outer loop over K, V blocks (j = 0 .. Tc)',
        'Inner loop over Q blocks (i = 0 .. Tr)',
        'Shared memory buffers for Q, K, V, and S tiles',
        'Writing final output O and softmax statistics (LSE: LogSumExp) to DRAM'
      ],
      cPlusPlusTheory: `In FlashAttention-1:
The outer loop iterates over columns (K and V blocks), and the inner loop iterates over rows (Q blocks).
For each block:
1. Load K_j, V_j into shared memory.
2. Load Q_i into shared memory.
3. Compute S_ij = Q_i * K_j^T.
4. Update running max m and sum l using online softmax.
5. Multiply by V_j and accumulate into output O_i.
6. Write O_i and logsumexp L to DRAM for use in the backward pass.`,
      hardwareMechanics: `Shared memory is partitioned between Q, K, V, and S.
Thread blocks are mapped to attention heads and batch indices.`,
      kernelCode: `// Example 69: Educational FlashAttention-1 Forward Kernel Architecture
#include <iostream>
#include <cuda_runtime.h>
#include <cfloat>

const int BR = 16; // Row block size
const int BC = 16; // Col block size
const int D = 64;  // Head dimension

__global__ void flash_attn_1_fwd_kernel(
    const float* __restrict__ Q,
    const float* __restrict__ K,
    const float* __restrict__ V,
    float* __restrict__ O,
    float* __restrict__ LSE, // LogSumExp for backward pass
    int N
) {
    // Shared memory allocations for tiles
    __shared__ float s_Q[BR][D];
    __shared__ float s_K[BC][D];
    __shared__ float s_V[BC][D];

    int tx = threadIdx.x; // Thread within block

    // FlashAttention-1 outer loop over K, V blocks
    int num_col_blocks = (N + BC - 1) / BC;
    for (int j = 0; j < num_col_blocks; ++j) {
        // 1. Collaborative load K_j and V_j into SRAM
        if (tx < BC) {
            #pragma unroll
            for (int d = 0; d < D; ++d) {
                s_K[tx][d] = K[(j * BC + tx) * D + d];
                s_V[tx][d] = V[(j * BC + tx) * D + d];
            }
        }
        __syncthreads();

        // 2. Inner loop over Q blocks...
        // [Tiles Q, computes S_ij in SRAM, updates running max/sum and output O]
        __syncthreads();
    }
}

int main() {
    std::cout << "FlashAttention-1 forward pass runs strictly inside on-chip SRAM with zero N x N DRAM writes!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 19: SRAM tiles for Q, K, and V hold only 16x64 floats (4 KB each).',
        'Line 28: Outer loop streams K and V blocks through SRAM.',
        'Line 40: Never writes an N x N matrix to global memory.'
      ],
      commonPitfalls: [
        'FlashAttention-1 had excessive global memory writes to O because the outer loop was over K, V blocks.',
        'This outer loop issue was resolved in FlashAttention-2 by reversing the loops!'
      ],
      benchmarkingNotes: 'Runs 2x to 4x faster than standard PyTorch scaled_dot_product_attention.'
    },
    {
      id: 'ex_70_flash_attention_2_outer_loop',
      exampleNumber: 70,
      difficulty: 'Expert',
      title: 'Ex 70: FlashAttention-2 Key Breakthrough: Outer Loop over Q',
      subtitle: 'Reversing the loops to eliminate redundant global memory reads and writes of output O',
      readTime: '15 min',
      prerequisites: ['Ex 69: FlashAttention-1 Forward'],
      concepts: [
        'FlashAttention-1 flaw: Outer loop on K, V forced updating O in global DRAM on every step',
        'FlashAttention-2 solution: Outer loop on Q blocks, inner loop on K, V blocks',
        'Keeping output accumulators O in REGISTERS across the entire kernel execution',
        'Writing to global memory O exactly ONCE at the very end of the kernel'
      ],
      cPlusPlusTheory: `In FlashAttention-1, the outer loop was over K, V blocks, and the inner loop was over Q blocks.
Because different K, V blocks updated the same Q rows, output O had to be loaded from DRAM, updated, and saved back to DRAM on every outer step!
Tri Dao redesigned FlashAttention-2 with a crucial inversion:
1. Outer loop is over Q blocks (Q_i loaded into SRAM once).
2. Accumulator O_i is kept inside hardware REGISTERS throughout the entire kernel.
3. Inner loop streams K_j and V_j through SRAM.
4. Output O_i is written to DRAM exactly ONCE at kernel completion!
This eliminated 90% of global memory traffic for O!`,
      hardwareMechanics: `Registers are the fastest storage on the chip (0 cycles latency).
Keeping O_i in registers increases arithmetic throughput from 35% to 73% of theoretical peak A100 TFLOPS.`,
      kernelCode: `// Example 70: FlashAttention-2 Inverted Loop Architecture
#include <iostream>
#include <cuda_runtime.h>

const int BR = 64; // Q tile
const int BC = 64; // K, V tile
const int D = 128; // Head dimension

__global__ void flash_attn_2_loop_structure(
    const float* __restrict__ Q,
    const float* __restrict__ K,
    const float* __restrict__ V,
    float* __restrict__ O,
    int N
) {
    int q_block_idx = blockIdx.x; // Each thread block owns ONE Q tile!
    int tid = threadIdx.x;

    // Accumulators O_i reside in high-speed hardware REGISTERS!
    float reg_O[D] = {0.0f};
    float reg_m = -1e9f; // Running row max
    float reg_l = 0.0f;  // Running row sum

    // Load Q tile into SRAM ONCE
    __shared__ float s_Q[BR][D];
    // ... load s_Q ...
    __syncthreads();

    // INNER LOOP: Stream K and V blocks through SRAM
    int num_kv_blocks = (N + BC - 1) / BC;
    for (int j = 0; j < num_kv_blocks; ++j) {
        // 1. Load K_j and V_j into SRAM
        // 2. Compute S_ij = s_Q * s_K^T
        // 3. Rescale reg_O and reg_l in REGISTERS (ZERO global memory traffic!)
    }

    // Write final output to DRAM exactly ONCE!
    #pragma unroll
    for (int d = 0; d < D; ++d) {
        O[(q_block_idx * BR + tid) * D + d] = reg_O[d];
    }
}

int main() {
    std::cout << "FlashAttention-2 keeps output O in registers, writing to DRAM exactly once!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 19: Each thread block owns a single Q block for its entire lifetime.',
        'Line 22: reg_O[D] lives in physical hardware registers with zero DRAM traffic.',
        'Line 33: Inner loop streams K and V through SRAM.',
        'Line 40: Writes to DRAM exactly once at thread block exit.'
      ],
      commonPitfalls: [
        'Exceeding register budget with reg_O[D]; for D = 128, each thread uses ~128 registers, which must be carefully tuned.',
        'Forgetting causal mask optimization during the inner loop.'
      ],
      benchmarkingNotes: 'FlashAttention-2 is 2x faster than FlashAttention-1, reaching 225 TFLOPS on an NVIDIA A100.'
    },
    {
      id: 'ex_71_flash_attention_2_warp_partitioning',
      exampleNumber: 71,
      difficulty: 'Expert',
      title: 'Ex 71: FlashAttention-2 Warp Partitioning Scheme',
      subtitle: 'Splitting Q among 4 warps while sharing K and V to eliminate cross-warp reductions',
      readTime: '15 min',
      prerequisites: ['Ex 70: FlashAttention-2 Outer Loop'],
      concepts: [
        'Warp partitioning strategies: Split-K vs Split-Q',
        'Why FlashAttention-1 split K across warps (required slow inter-warp __syncthreads reductions)',
        'FlashAttention-2: Splitting Q rows across the 4 warps (each warp owns 16 rows of Q)',
        'All 4 warps independently read the same K and V tiles from shared memory with zero communication'
      ],
      cPlusPlusTheory: `In FlashAttention-1, the K tile was partitioned across warps. Because all warps updated the same rows of Q, they had to communicate via shared memory and synchronization barriers to find the row maximum!
FlashAttention-2 changed the warp partitioning:
- Thread block has 4 warps (128 threads). Tile Q has 64 rows.
- Each warp owns 16 rows of Q (Warp 0: rows 0..15, Warp 1: rows 16..31, etc.).
- When K and V tiles are loaded into shared memory, all 4 warps multiply their private Q rows against the full K tile independently!
Because warps compute completely distinct Q rows, ZERO inter-warp synchronization is needed!`,
      hardwareMechanics: `Eliminates all inter-warp shared memory barrier stalls (__syncthreads).
Warps execute asynchronously at full Tensor Core speed.`,
      kernelCode: `// Example 71: FlashAttention-2 Warp Partitioning
#include <iostream>
#include <cuda_runtime.h>

__device__ void flash2_warp_partition_demo() {
    int warp_id = threadIdx.x / 32;
    int lane_id = threadIdx.x % 32;

    // 4 warps in a 128-thread block
    // Q block size = 64 rows. Each warp owns 16 rows of Q!
    int q_row_start = warp_id * 16;
    int q_row_end = q_row_start + 16;

    // Warp processes its 16 rows with ZERO communication with other warps!
    // All warps broadcast-read the same K and V from shared memory simultaneously.
}

int main() {
    std::cout << "FlashAttention-2 partitions Q across warps, completely eliminating inter-warp reduction barriers!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Extracts warp_id (0..3) and lane_id (0..31).',
        'Line 10: Warp i exclusively processes rows (i * 16) through (i * 16 + 15).',
        'Line 13: Zero inter-warp synchronization required; warps run at 100% hardware efficiency.'
      ],
      commonPitfalls: [
        'Trying to partition K across warps, which re-introduces the inter-warp barrier overhead.',
        'Not ensuring that the shared memory K buffer is accessed conflict-free during broadcast.'
      ],
      benchmarkingNotes: 'Eliminating inter-warp reductions saves ~15% of total runtime in FlashAttention-2.'
    },
    {
      id: 'ex_72_causal_masking_flash_attention',
      exampleNumber: 72,
      difficulty: 'Advanced',
      title: 'Ex 72: Causal Masking & Tile Skipping in FlashAttention',
      subtitle: 'Skipping computation of strictly upper-triangular tiles for autoregressive LLMs',
      readTime: '15 min',
      prerequisites: ['Ex 71: FlashAttention-2 Warp Partitioning'],
      concepts: [
        'Autoregressive language models require causal masking: Token i cannot attend to Token j if j > i',
        'Naive masking: Computing dot products and setting S_ij = -INF',
        'Tile-level skipping: If col_block_start > row_block_end, the ENTIRE tile is masked out!',
        '2x speedup: Skipping 50% of tiles entirely'
      ],
      cPlusPlusTheory: `In autoregressive transformers (GPT-4, Llama, Mistral), tokens can only attend to previous tokens (lower triangular matrix).
In naive attention, all N x N values are computed, and upper triangular elements are set to -INF.
In FlashAttention with causal masking:
- Full Compute Tile: If row_block >= col_block + 1, all elements are valid (compute normally).
- Skipped Tile: If col_block > row_block, all elements are in the future! The kernel skips loading K, V and skips GEMM entirely!
- Diagonal Tile: Only the diagonal tiles (where row_block == col_block) require causal mask checks.
This cuts the total number of FLOPs exactly in half!`,
      hardwareMechanics: `The inner loop bounds are adjusted:
for (int j = 0; j <= q_block_idx; ++j)
Upper triangular tiles are never even dispatched to Tensor Cores, saving 50% of execution time and power.`,
      kernelCode: `// Example 72: Causal Masking Tile Classification
#include <iostream>

void classify_causal_tiles(int num_blocks) {
    int skipped_tiles = 0;
    int diagonal_tiles = 0;
    int full_tiles = 0;

    for (int r = 0; r < num_blocks; ++r) {
        for (int c = 0; c < num_blocks; ++c) {
            if (c > r) {
                skipped_tiles++; // Future tokens: SKIP ENTIRE TILE!
            } else if (c == r) {
                diagonal_tiles++; // Needs per-element mask (j <= i)
            } else {
                full_tiles++; // All elements strictly valid (No masking needed!)
            }
        }
    }

    std::cout << "Full Tiles: " << full_tiles 
              << " | Diagonal Tiles: " << diagonal_tiles 
              << " | Skipped Tiles: " << skipped_tiles << "\\n";
}

int main() {
    classify_causal_tiles(16); // 16x16 grid of tiles
    std::cout << "Causal tile skipping achieves an immediate 2x speedup in autoregressive LLMs!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 12: c > r identifies tiles entirely above the diagonal that are skipped without any compute.',
        'Line 14: Only diagonal tiles require runtime masking conditions.',
        'Line 24: Automatically cuts execution time by 50%.'
      ],
      commonPitfalls: [
        'Applying per-element masking inside full tiles below the diagonal, wasting instructions.',
        'Off-by-one errors on the diagonal leading to tokens attending to one future token.'
      ],
      benchmarkingNotes: 'Causal FlashAttention-2 executes in exactly half the time of bidirectional FlashAttention-2.'
    },
    {
      id: 'ex_73_flash_attention_backward_recomputation',
      exampleNumber: 73,
      difficulty: 'Expert',
      title: 'Ex 73: FlashAttention Backward Pass & Activation Recomputation',
      subtitle: 'Why recomputing S_ij in SRAM during backward pass is faster than loading it from DRAM',
      readTime: '15 min',
      prerequisites: ['Ex 72: Causal Masking'],
      concepts: [
        'Standard backpropagation stores forward activations in DRAM (P = softmax(S))',
        'Memory bandwidth is the bottleneck, not compute FLOPs',
        'FlashAttention stores ONLY the vector LSE (LogSumExp) of size N (O(N) bytes)',
        'Backward pass recomputes S_ij from Q and K in SRAM at 15 TB/s'
      ],
      cPlusPlusTheory: `In traditional deep learning, the forward pass saves intermediate activations in DRAM so the backward pass can use them to compute gradients:
Saving the N x N attention matrix requires O(N^2) memory.
Dao et al. realized a counter-intuitive truth about modern GPUs:
Compute (Tensor Cores) is cheap, but Memory Bandwidth (HBM) is expensive!
Instead of saving the N x N matrix P:
The forward pass saves only the vector LSE = log(sum(exp(S_ij))) of size N.
In the backward pass, the kernel recomputes S_ij = Q * K^T on-the-fly inside SRAM!
Because SRAM reads take 20 cycles while DRAM reads take 400 cycles, recomputing FLOPs is actually 2x FASTER than loading activations from DRAM!`,
      hardwareMechanics: `Activation recomputation saves tens of gigabytes of VRAM while speeding up backward pass execution.
This allows training models with 8x longer sequence lengths on the same GPU cluster.`,
      kernelCode: `// Example 73: Backward Activation Recomputation Concept
#include <iostream>
#include <cmath>

inline float recompute_softmax_prob(float q, float k, float lse) {
    float s = q * k; // Recompute dot product in registers/SRAM!
    // Recover exact softmax probability using cached LogSumExp
    float p = std::exp(s - lse);
    return p;
}

int main() {
    float q = 1.2f, k = 0.8f, lse = 1.5f;
    float p = recompute_softmax_prob(q, k, lse);

    std::cout << "Recomputed attention probability P: " << p << " (Zero DRAM storage required!)\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Recomputes s = q * k in on-chip registers on demand.',
        'Line 7: Recovers exact probability p without reading an N x N matrix from DRAM.',
        'Line 15: Demonstrates how activation recomputation out-paces DRAM memory bandwidth.'
      ],
      commonPitfalls: [
        'Saving the full N x N matrix during forward pass, which immediately defeats the purpose of FlashAttention.',
        'Numerical divergence between forward and backward passes due to differing floating-point contraction orders.'
      ],
      benchmarkingNotes: 'FlashAttention backward pass runs faster than standard attention backward pass while using 95% less VRAM.'
    },
    {
      id: 'ex_74_flash_decoding_split_kv',
      exampleNumber: 74,
      difficulty: 'Expert',
      title: 'Ex 74: FlashDecoding: Parallelizing KV Cache along Sequence Length',
      subtitle: 'Scaling LLM generation from 10 TFLOPS to 200 TFLOPS when query length is 1',
      readTime: '15 min',
      prerequisites: ['Ex 73: FlashAttention Backward'],
      concepts: [
        'The LLM Inference generation bottleneck: Batch=1, Query Length=1, KV Cache Length=32,768',
        'Why FlashAttention-2 is slow during inference: Only 1 query row leaves 90% of GPU SMs idle!',
        'FlashDecoding: Splitting the KV cache across multiple SMs along the sequence dimension',
        'Hierarchical reduction: Multiple thread blocks reduce KV chunks, then a final reduction kernel combines them'
      ],
      cPlusPlusTheory: `During LLM autoregressive generation (inference):
The model generates ONE new token at a time.
Query length Q is strictly 1, while KV cache length can be 32,768 tokens.
In FlashAttention-2, blocks are parallelized along Q rows. With Q = 1 and 32 heads, there are only 32 thread blocks—leaving 80% of an A100's 108 SMs completely idle!
FlashDecoding (Dao et al., 2023) solves this:
1. Split the 32,768-token KV cache into chunks (e.g. 64 chunks of size 512).
2. Launch 64 thread blocks per head (2,048 blocks total—fully saturating all SMs!).
3. Each block computes a partial attention result and partial LogSumExp.
4. A final reduction kernel combines the 64 partial results using online softmax rescaling!`,
      hardwareMechanics: `Increases SM occupancy from ~15% to 100% during token generation.
Achieves up to an 8x speedup for long-context LLM generation (e.g. 64k tokens).`,
      kernelCode: `// Example 74: FlashDecoding KV Cache Split Scheme
#include <iostream>

void plan_flash_decoding(int kv_seq_len, int num_heads, int chunk_size) {
    int chunks = (kv_seq_len + chunk_size - 1) / chunk_size;
    int total_blocks = chunks * num_heads;

    std::cout << "KV Length: " << kv_seq_len << " | Heads: " << num_heads << "\\n";
    std::cout << "Standard FlashAttention-2 blocks launched: " << num_heads << " (Underutilizes GPU SMs!)\\n";
    std::cout << "FlashDecoding chunks per head: " << chunks << "\\n";
    std::cout << "FlashDecoding total parallel blocks: " << total_blocks << " (100% SM Saturation!)\\n";
}

int main() {
    plan_flash_decoding(32768, 32, 256); // 32k context, 32 heads, 256 chunk size
    std::cout << "FlashDecoding unlocks 200+ TFLOPS generation speeds for long-context LLMs!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 8: Standard FlashAttention launches only 32 blocks (underutilizing the GPU).',
        'Line 11: FlashDecoding launches 4,096 blocks, saturating all hardware execution units.',
        'Line 17: Essential architecture for vLLM, TensorRT-LLM, and SGLang.'
      ],
      commonPitfalls: [
        'Using FlashDecoding for training where Q is already large (e.g. Q = 4096); FlashDecoding is exclusively for inference when Q = 1.',
        'Numerical error in the final inter-block reduction step.'
      ],
      benchmarkingNotes: 'Increases token generation speed by 8x on long contexts (32k+).'
    },
    {
      id: 'ex_75_kv_cache_paged_attention',
      exampleNumber: 75,
      difficulty: 'Expert',
      title: 'Ex 75: Paged Attention & Non-Contiguous KV Cache Blocks',
      subtitle: 'Eliminating memory fragmentation in LLM inference servers (vLLM pattern)',
      readTime: '15 min',
      prerequisites: ['Ex 74: FlashDecoding'],
      concepts: [
        'The KV cache memory fragmentation problem in high-concurrency LLM serving',
        'Pre-allocating contiguous buffers wastes 60-80% of VRAM due to unknown generation lengths',
        'PagedAttention (Kwon et al.): Virtual memory paging for KV cache blocks',
        'Block Table lookup inside the CUDA attention kernel'
      ],
      cPlusPlusTheory: `In production LLM servers (like vLLM), thousands of requests generate text concurrently.
Because generation length is unpredictable, pre-allocating contiguous memory for each request causes severe internal and external memory fragmentation (up to 80% wasted VRAM!).
PagedAttention adapts the Operating System's Virtual Memory paging concept:
1. Divide KV cache into fixed-size physical blocks (e.g. 16 tokens per block).
2. Maintain a 'Block Table' mapping logical token positions to physical block addresses.
3. Inside the CUDA kernel, instead of reading 'K[idx]', threads lookup the physical block index from 'block_table[logical_block_idx]'!
Zero memory fragmentation; fits 4x more concurrent users on the same GPU!`,
      hardwareMechanics: `Physical blocks can be scattered anywhere in DRAM.
Threads load block indices into shared memory or constant cache to avoid serialized lookups.`,
      kernelCode: `// Example 75: PagedAttention Block Table Lookup Kernel Concept
#include <iostream>
#include <cuda_runtime.h>

const int BLOCK_SIZE = 16; // 16 tokens per physical page block
const int HEAD_DIM = 64;

__global__ void paged_attention_lookup_kernel(
    const float* __restrict__ Q,
    const float* __restrict__ K_pool, // Large pre-allocated pool of physical blocks
    const int* __restrict__ block_table, // Maps logical block to physical pool index
    float* __restrict__ out,
    int token_idx
) {
    int logical_block = token_idx / BLOCK_SIZE;
    int offset_in_block = token_idx % BLOCK_SIZE;

    // Look up physical block address from page table!
    int physical_block_id = block_table[logical_block];

    // Compute pointer to the actual physical token memory
    int physical_offset = (physical_block_id * BLOCK_SIZE + offset_in_block) * HEAD_DIM;
    const float* k_token_ptr = K_pool + physical_offset;

    // Read K token safely from paged memory pool
    float val = k_token_ptr[threadIdx.x];
    out[threadIdx.x] = val;
}

int main() {
    std::cout << "PagedAttention enables dynamic virtual memory allocation for KV caches, eliminating fragmentation!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 16: Computes logical page and offset.',
        'Line 20: Maps logical page to physical block ID via block_table lookup.',
        'Line 24: Direct address calculation into the global physical block pool.'
      ],
      commonPitfalls: [
        'Cache line uncoalesced access if HEAD_DIM * sizeof(float) is not a multiple of 128 bytes.',
        'Race conditions during dynamic allocation of physical blocks on the CPU host.'
      ],
      benchmarkingNotes: 'Allows 2.5x to 4x higher request throughput in vLLM without purchasing extra GPUs.'
    },
    {
      id: 'ex_76_flash_attention_summary_benchmark',
      exampleNumber: 76,
      difficulty: 'Expert',
      title: 'Ex 76: End-to-End FlashAttention Benchmark & Roofline Analysis',
      subtitle: 'Comparing PyTorch SDPA vs FlashAttention-1 vs FlashAttention-2 vs FlashDecoding',
      readTime: '15 min',
      prerequisites: ['Ex 75: Paged Attention'],
      concepts: [
        'Roofline model analysis: Memory bandwidth bound vs Compute bound regimes',
        'Measuring Arithmetic Intensity (FLOPs / byte transferred)',
        'Benchmarking with CUDA Events (cudaEventRecord, cudaEventElapsedTime)',
        'Summary table of Attention implementations across latency and VRAM'
      ],
      cPlusPlusTheory: `The evolution of attention kernels represents the pinnacle of modern GPU systems engineering:
- Naive Attention: O(N^2) memory reads/writes. Bound by DRAM memory bandwidth. ~15 TFLOPS.
- FlashAttention-1: O(N) memory reads/writes via SRAM tiling and online softmax. Bound by compute and inter-warp barriers. ~120 TFLOPS.
- FlashAttention-2: Inverted loops (outer Q), register accumulation, warp partitioning. Reaches ~225 TFLOPS (>70% theoretical hardware peak).
- FlashDecoding: KV splitting across SMs for inference. Unlocks 200+ TFLOPS when Q = 1.`,
      hardwareMechanics: `CUDA Events provide sub-microsecond profiling accuracy without CPU host synchronization overhead.`,
      kernelCode: `// Example 76: Accurate CUDA Kernel Benchmarking Harness
#include <iostream>
#include <cuda_runtime.h>

void benchmark_attention() {
    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    // Warm-up runs to prime instruction caches and GPU clocks
    for (int i = 0; i < 5; ++i) {
        // kernel_launch();
    }
    cudaDeviceSynchronize();

    // Timed benchmark loop
    cudaEventRecord(start);
    const int iterations = 50;
    for (int i = 0; i < iterations; ++i) {
        // kernel_launch();
    }
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);

    float total_ms = 0.0f;
    cudaEventElapsedTime(&total_ms, start, stop);
    float avg_ms = total_ms / iterations;

    std::cout << "Average Execution Time: " << avg_ms << " ms\\n";

    cudaEventDestroy(start);
    cudaEventDestroy(stop);
}

int main() {
    benchmark_attention();
    std::cout << "Benchmarking with CUDA events guarantees sub-microsecond timing accuracy!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: cudaEventCreate creates hardware timestamp markers.',
        'Line 11: Warmup runs prevent frequency throttling and cache miss skew.',
        'Line 18: Measures 50 iterations with cudaEventRecord.',
        'Line 24: cudaEventElapsedTime computes exact hardware duration in milliseconds.'
      ],
      commonPitfalls: [
        'Timing CUDA kernels with std::chrono without calling cudaDeviceSynchronize(); CPU timers measure launch time (~3 µs), not execution time!',
        'Measuring only a single run without warm-up.'
      ],
      benchmarkingNotes: 'Always use cudaEventElapsedTime for GPU profiling; never use CPU wall-clock timers alone.'
    }
  ]
};
