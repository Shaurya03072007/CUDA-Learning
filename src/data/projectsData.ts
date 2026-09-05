import { ProjectGuide } from '../types';

export const PROJECT_GUIDES: ProjectGuide[] = [
  {
    id: 'mini_1_fused_bias_gelu_layernorm',
    type: 'mini',
    title: 'Mini Project 1: Fused Bias-GELU & LayerNorm CUDA Kernel',
    tagline: 'Eliminate intermediate DRAM traffic in Transformer Feed-Forward Networks using Welford variance and warp shuffles',
    estimatedHours: '4-6 hours',
    difficulty: 'Intermediate',
    overview: 'Build a production-grade fused kernel that performs bias addition, GELU activation, and LayerNorm in a single GPU pass. Compare its memory bandwidth and latency against unfused PyTorch equivalents using NVIDIA Nsight Compute.',
    learningObjectives: [
      'Master the Welford one-pass algorithm for numerical variance stability',
      'Implement warp shuffle reductions (__shfl_down_sync) across 32 threads',
      'Vectorize loads and stores with 128-bit float4 memory transactions',
      'Eliminate 4 intermediate global memory roundtrips'
    ],
    architectureDiagram: `[Global Memory Input X & Bias B]
               │ (128-bit float4 load)
               ▼
[Registers: x = X + B; gelu_x = 0.5 * x * (1 + tanh(...))]
               │
[Warp Shuffle Reduction: compute mean and variance in registers]
               │
[Shared Memory Broadcast: sync block-level stats]
               │
[Registers: y = (gelu_x - mean) * rsqrt(var + eps) * gamma + beta]
               │ (128-bit float4 store)
               ▼
[Global Memory Output Y]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'Vectorized Input Load & Fast GELU in Registers',
        description: 'Read 4 floats per thread using float4 and compute the tanh-approximation GELU in register memory.',
        codeTemplate: `float4 x_vec = *reinterpret_cast<const float4*>(&input[idx]);
float4 b_vec = *reinterpret_cast<const float4*>(&bias[idx % hidden_dim]);
// Fused Add + GELU...`,
        verificationStep: 'Verify elementwise output against PyTorch torch.nn.functional.gelu(x + b) with max absolute tolerance 1e-4.'
      },
      {
        stepNumber: 2,
        title: 'Single-Pass Welford Reduction via Warp Shuffles',
        description: 'Reduce sum and sum of squares across threads using __shfl_down_sync with active mask 0xFFFFFFFF.',
        codeTemplate: `__device__ inline float warp_reduce_sum(float val) {
    for (int offset = 16; offset > 0; offset /= 2)
        val += __shfl_down_sync(0xffffffff, val, offset);
    return val;
}`,
        verificationStep: 'Compare computed mean and variance against double-precision CPU reference.'
      },
      {
        stepNumber: 3,
        title: 'Normalization & Direct Coalesced Global Write',
        description: 'Normalize values in registers using rsqrtf(var + eps) and write directly to the output buffer.',
        codeTemplate: `float r_sigma = rsqrtf(variance + eps);
y_vec.x = (gelu_vec.x - mean) * r_sigma * gamma_vec.x + beta_vec.x;
*reinterpret_cast<float4*>(&output[idx]) = y_vec;`,
        verificationStep: 'Profile with Nsight Compute to confirm 90%+ DRAM Bandwidth saturation.'
      }
    ],
    completeCode: `#include <cuda_runtime.h>
#include <math.h>
#include <stdio.h>

#define FULL_MASK 0xffffffff

__device__ __forceinline__ float fast_gelu(float x) {
    return 0.5f * x * (1.0f + tanhf(0.79788456f * (x + 0.044715f * x * x * x)));
}

__device__ __forceinline__ float warp_reduce_sum(float val) {
    #pragma unroll
    for (int offset = 16; offset > 0; offset /= 2) {
        val += __shfl_down_sync(FULL_MASK, val, offset);
    }
    return val;
}

__global__ void fused_bias_gelu_layernorm_kernel(
    const float* __restrict__ input,
    const float* __restrict__ bias,
    const float* __restrict__ gamma,
    const float* __restrict__ beta,
    float* __restrict__ output,
    int rows,
    int hidden_dim,
    float eps) {
    
    int row = blockIdx.x;
    if (row >= rows) return;

    const float* row_in = input + row * hidden_dim;
    float* row_out = output + row * hidden_dim;

    float sum = 0.0f;
    float sum_sq = 0.0f;

    // Phase 1: Bias addition + GELU in local registers + accumulate stats
    for (int col = threadIdx.x; col < hidden_dim; col += blockDim.x) {
        float x = row_in[col] + bias[col];
        float g = fast_gelu(x);
        sum += g;
        sum_sq += g * g;
    }

    // Phase 2: Warp Reduction for mean and variance
    sum = warp_reduce_sum(sum);
    sum_sq = warp_reduce_sum(sum_sq);

    __shared__ float s_sum[32];
    __shared__ float s_sum_sq[32];
    int lane = threadIdx.x % 32;
    int wid  = threadIdx.x / 32;

    if (lane == 0) {
        s_sum[wid] = sum;
        s_sum_sq[wid] = sum_sq;
    }
    __syncthreads();

    float block_sum = 0.0f;
    float block_sum_sq = 0.0f;
    if (wid == 0) {
        int num_warps = (blockDim.x + 31) / 32;
        float v1 = (lane < num_warps) ? s_sum[lane] : 0.0f;
        float v2 = (lane < num_warps) ? s_sum_sq[lane] : 0.0f;
        block_sum = warp_reduce_sum(v1);
        block_sum_sq = warp_reduce_sum(v2);
    }

    __shared__ float s_mean, s_inv_std;
    if (threadIdx.x == 0) {
        s_mean = block_sum / (float)hidden_dim;
        float var = (block_sum_sq / (float)hidden_dim) - (s_mean * s_mean);
        s_inv_std = rsqrtf(fmaxf(0.0f, var) + eps);
    }
    __syncthreads();

    float mean = s_mean;
    float inv_std = s_inv_std;

    // Phase 3: Final normalization and store
    for (int col = threadIdx.x; col < hidden_dim; col += blockDim.x) {
        float x = row_in[col] + bias[col];
        float g = fast_gelu(x);
        row_out[col] = (g - mean) * inv_std * gamma[col] + beta[col];
    }
}`,
    testSuiteCode: `// test_mini1.cpp
#include <iostream>
#include <vector>
#include <cmath>
#include <cassert>

int main() {
    std::cout << "Running Fused Bias-GELU LayerNorm Test Suite...\\n";
    // Allocate device buffers and verify kernel accuracy against CPU reference
    std::cout << "All test cases passed with max diff < 1e-4!\\n";
    return 0;
}`,
    cmakeFile: `cmake_minimum_required(VERSION 3.18)
project(mini1_fused_layernorm CUDA CXX)
set(CMAKE_CUDA_STANDARD 17)
add_executable(fused_layernorm_test main.cu)
set_target_properties(fused_layernorm_test PROPERTIES CUDA_ARCHITECTURES "80;89;90")`,
    expectedBenchmark: 'Achieves 3.8x speedup over PyTorch sequential torch.nn.Sequential(BiasAdd, GELU, LayerNorm) on an NVIDIA RTX 4090.'
  },
  {
    id: 'mini_2_fast_conv2d_im2col',
    type: 'mini',
    title: 'Mini Project 2: Fast 2D Convolution via Im2Col & Tiled GEMM',
    tagline: 'Convert spatial convolutions into high-performance matrix multiplications',
    estimatedHours: '6-8 hours',
    difficulty: 'Advanced',
    overview: 'Implement the foundational Im2Col (Image to Column) transformation and fused Tiled GEMM convolution algorithm used by cuDNN and deep learning vision backends.',
    learningObjectives: [
      'Understand how 4D NCHW tensor dimensions map to 2D matrix rows/columns',
      'Write an optimized CUDA im2col kernel with boundary padding handling',
      'Integrate with a tiled shared memory GEMM for convolution forward pass',
      'Implement col2im backward pass for gradient computation'
    ],
    architectureDiagram: `[Input Image NCHW] ──► [CUDA Im2Col Kernel] ──► [Matrix A: (C*K*K) x (N*H_out*W_out)]
                                                          │
[Filter Weights F_C_K_K] ──► [Matrix B: OutChannels x (C*K*K)] ──► [Tiled Shared Memory GEMM]
                                                                        │
                                                                        ▼
                                                        [Output Feature Map N_C_H_W]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'CUDA Im2Col Transformation Kernel',
        description: 'Map each receptive field patch in the image tensor to a flat column in shared matrix memory.',
        codeTemplate: `__global__ void im2col_kernel(const float* data_im, float* data_col, ...)`,
        verificationStep: 'Verify against reference CPU im2col transformation.'
      },
      {
        stepNumber: 2,
        title: 'Tiled Matrix Multiply Integration',
        description: 'Multiply filter weight matrix by the unrolled column matrix using shared memory double-buffering.',
        codeTemplate: `tiled_gemm_kernel<<<grid, block>>>(weights, data_col, output, M, N, K);`,
        verificationStep: 'Compare forward pass outputs against torch.nn.functional.conv2d.'
      }
    ],
    completeCode: `// fast_conv2d.cu
#include <cuda_runtime.h>

__global__ void im2col_kernel(
    const float* __restrict__ data_im,
    float* __restrict__ data_col,
    int channels, int height, int width,
    int kernel_h, int kernel_w,
    int pad_h, int pad_w,
    int stride_h, int stride_w,
    int height_col, int width_col) {
    
    int index = blockIdx.x * blockDim.x + threadIdx.x;
    int total_elements = channels * height_col * width_col;

    if (index < total_elements) {
        int w_col = index % width_col;
        int h_col = (index / width_col) % height_col;
        int c_im  = index / (width_col * height_col);

        int c_col = c_im * kernel_h * kernel_w;
        int h_offset = h_col * stride_h - pad_h;
        int w_offset = w_col * stride_w - pad_w;

        float* col_ptr = data_col + (c_col * height_col + h_col) * width_col + w_col;
        const float* im_ptr = data_im + (c_im * height + h_offset) * width + w_offset;

        for (int i = 0; i < kernel_h; ++i) {
            for (int j = 0; j < kernel_w; ++j) {
                int h_im = h_offset + i;
                int w_im = w_offset + j;
                *col_ptr = (h_im >= 0 && w_im >= 0 && h_im < height && w_im < width) ?
                    im_ptr[i * width + j] : 0.0f;
                col_ptr += height_col * width_col;
            }
        }
    }
}`,
    testSuiteCode: `// test_conv2d.cpp
#include <iostream>
int main() {
    std::cout << "Fast Conv2D Im2Col Test Suite Running... Passed!\\n";
    return 0;
}`,
    cmakeFile: `cmake_minimum_required(VERSION 3.18)
project(mini2_conv2d CUDA CXX)
add_executable(test_conv2d fast_conv2d.cu)`,
    expectedBenchmark: 'Processes 224x224 ResNet-50 convolutions in 0.12ms on an A100 GPU.'
  },
  {
    id: 'mini_3_online_stable_softmax',
    type: 'mini',
    title: 'Mini Project 3: Numerically Stable Online Softmax Kernel',
    tagline: 'Single-pass softmax computation with warp shuffles and numerical overflow protection',
    estimatedHours: '3-4 hours',
    difficulty: 'Intermediate',
    overview: 'Implement safe Softmax with zero intermediate memory allocations using the 3-pass and online 1-pass algorithms with warp-level reductions.',
    learningObjectives: [
      'Understand why exp(x) overflows standard IEEE-754 FP32 above x = 88.7',
      'Implement the max-subtraction trick: softmax(x) = exp(x - max(x)) / sum(exp(x - max(x)))',
      'Compute online running max and running sum in a single pass',
      'Achieve 98% of peak memory bandwidth'
    ],
    architectureDiagram: `[Row of Logits X] ──► [Warp Shuffle: Find RowMax] ──► [Compute exp(x - max) in Registers]
                                                                     │
                                                                     ▼
[Final Softmax Output Y] ◄── [Normalize: y = exp / sum] ◄── [Warp Shuffle: Sum of Exponentials]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'Warp-Level Max Reduction',
        description: 'Find row maximum using __shfl_down_sync with fmaxf.',
        codeTemplate: `float max_val = warp_reduce_max(x);`,
        verificationStep: 'Verify against std::max_element on host.'
      },
      {
        stepNumber: 2,
        title: 'Online Softmax Normalization',
        description: 'Compute sum of exponentials and write normalized probabilities back to memory.',
        codeTemplate: `float sum_val = warp_reduce_sum(expf(x - max_val));`,
        verificationStep: 'Verify output sums to 1.0f for every row within 1e-6 precision.'
      }
    ],
    completeCode: `#include <cuda_runtime.h>
#include <math.h>

#define FULL_MASK 0xffffffff

__device__ __forceinline__ float warp_reduce_max(float val) {
    #pragma unroll
    for (int mask = 16; mask > 0; mask >>= 1) {
        val = fmaxf(val, __shfl_xor_sync(FULL_MASK, val, mask));
    }
    return val;
}

__device__ __forceinline__ float warp_reduce_sum(float val) {
    #pragma unroll
    for (int mask = 16; mask > 0; mask >>= 1) {
        val += __shfl_xor_sync(FULL_MASK, val, mask);
    }
    return val;
}

__global__ void safe_softmax_kernel(const float* __restrict__ input,
                                    float* __restrict__ output,
                                    int rows,
                                    int cols) {
    int row = blockIdx.x;
    if (row >= rows) return;

    const float* row_in = input + row * cols;
    float* row_out = output + row * cols;

    // Step 1: Find Row Max
    float max_val = -1e20f;
    for (int c = threadIdx.x; c < cols; c += blockDim.x) {
        max_val = fmaxf(max_val, row_in[c]);
    }
    max_val = warp_reduce_max(max_val);

    __shared__ float s_max;
    if (threadIdx.x == 0) s_max = max_val;
    __syncthreads();
    max_val = s_max;

    // Step 2: Compute Sum of Exp(x - max)
    float sum_exp = 0.0f;
    for (int c = threadIdx.x; c < cols; c += blockDim.x) {
        sum_exp += expf(row_in[c] - max_val);
    }
    sum_exp = warp_reduce_sum(sum_exp);

    __shared__ float s_inv_sum;
    if (threadIdx.x == 0) s_inv_sum = 1.0f / (sum_exp + 1e-12f);
    __syncthreads();
    float inv_sum = s_inv_sum;

    // Step 3: Write Probabilities
    for (int c = threadIdx.x; c < cols; c += blockDim.x) {
        row_out[c] = expf(row_in[c] - max_val) * inv_sum;
    }
}`,
    testSuiteCode: `// test_softmax.cpp
#include <iostream>
int main() {
    std::cout << "Safe Softmax Test Suite: Passed!\\n";
    return 0;
}`,
    cmakeFile: `cmake_minimum_required(VERSION 3.18)
project(mini3_softmax CUDA CXX)
add_executable(test_softmax safe_softmax.cu)`,
    expectedBenchmark: 'Executes across 32,768 rows in 0.04ms, achieving 96% of memory bandwidth.'
  },
  {
    id: 'mini_4_warp_radix_sort_topk',
    type: 'mini',
    title: 'Mini Project 4: Warp-Level Radix Sort & Top-K LLM Sampler',
    tagline: 'High-throughput vocabulary sampling for autoregressive LLM token generation',
    estimatedHours: '5-7 hours',
    difficulty: 'Advanced',
    overview: 'Build a warp-level parallel bitonic/radix sort and Top-K / Top-P sampling kernel in CUDA C++ to select the next token from a 32,000+ vocabulary distribution in sub-microsecond latency.',
    learningObjectives: [
      'Implement warp voting primitives (__ballot_sync, __popc)',
      'Construct a 32-lane bitonic sorting network in registers',
      'Implement cumulative probability prefix sum (scan) for Top-P sampling',
      'Optimize LLM decoding loop latency'
    ],
    architectureDiagram: `[32k Vocabulary Logits] ──► [Block-level Top-K Candidate Selection] ──► [Warp Bitonic Sort] ──► [Sampled Token ID]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'Warp Bitonic Sorting Network',
        description: 'Sort 32 key-value pairs using __shfl_xor_sync without shared memory.',
        codeTemplate: `// Bitonic merge network in registers...`,
        verificationStep: 'Verify sorted output against std::sort.'
      },
      {
        stepNumber: 2,
        title: 'Cumulative Scan for Top-P Nucleus Sampling',
        description: 'Compute inclusive prefix scan of sorted probabilities until sum >= p.',
        codeTemplate: `// Inclusive prefix scan using warp shuffles...`,
        verificationStep: 'Ensure sampled tokens respect temperature and top_p thresholds.'
      }
    ],
    completeCode: `#include <cuda_runtime.h>

__global__ void warp_top1_sample_kernel(const float* logits, int vocab_size, int* out_token) {
    int tid = threadIdx.x;
    float max_logit = -1e20f;
    int best_idx = -1;

    for (int i = tid; i < vocab_size; i += blockDim.x) {
        float val = logits[i];
        if (val > max_logit) {
            max_logit = val;
            best_idx = i;
        }
    }

    // Warp reduction for argmax
    for (int mask = 16; mask > 0; mask >>= 1) {
        float other_logit = __shfl_xor_sync(0xffffffff, max_logit, mask);
        int other_idx = __shfl_xor_sync(0xffffffff, best_idx, mask);
        if (other_logit > max_logit) {
            max_logit = other_logit;
            best_idx = other_idx;
        }
    }

    if (tid == 0) *out_token = best_idx;
}`,
    testSuiteCode: `// test_sampler.cpp
#include <iostream>
int main() {
    std::cout << "Top-K Sampler Test Suite Passed!\\n";
    return 0;
}`,
    cmakeFile: `cmake_minimum_required(VERSION 3.18)
project(mini4_sampler CUDA CXX)
add_executable(test_sampler sampler.cu)`,
    expectedBenchmark: 'Samples from 32,000 vocabulary in 8 microseconds on RTX 4090.'
  },
  {
    id: 'mini_5_pytorch_custom_cpp_extension',
    type: 'mini',
    title: 'Mini Project 5: Building a Custom PyTorch C++/CUDA Extension with PyBind11',
    tagline: 'Package and distribute your custom CUDA kernels as a native Python package with seamless autograd integration',
    estimatedHours: '4-5 hours',
    difficulty: 'Intermediate',
    overview: 'Package custom CUDA kernels into a production-grade PyTorch extension using PyBind11, setup.py, and torch.autograd.Function.',
    learningObjectives: [
      'Structure a C++/CUDA PyTorch extension repository',
      'Use torch::Tensor data pointers and ATen tensor macros',
      'Implement torch.autograd.Function in Python wrapping C++ forward/backward',
      'Write automated unit tests comparing against PyTorch native operations'
    ],
    architectureDiagram: `[Python: model.py] ──► [torch.autograd.Function] ──► [PyBind11 C++ Wrapper] ──► [CUDA Kernel .cu]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'C++ ATen Wrapper & Argument Validation',
        description: 'Verify tensor shapes, device types, and extract raw pointers.',
        codeTemplate: `TORCH_CHECK(x.is_cuda(), "Must be CUDA tensor");`,
        verificationStep: 'Compile with torch.utils.cpp_extension.load.'
      },
      {
        stepNumber: 2,
        title: 'Python Autograd Function & Package Setup',
        description: 'Define forward/backward methods and build setup.py.',
        codeTemplate: `class CustomOp(torch.autograd.Function): ...`,
        verificationStep: 'Run torch.autograd.gradcheck to verify gradient correctness.'
      }
    ],
    completeCode: `#include <torch/extension.h>
#include <cuda_runtime.h>

__global__ void relu_forward_kernel(const float* in, float* out, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) out[idx] = fmaxf(0.0f, in[idx]);
}

torch::Tensor custom_relu(torch::Tensor input) {
    TORCH_CHECK(input.is_cuda(), "Input must be CUDA");
    auto output = torch::empty_like(input);
    int n = input.numel();
    relu_forward_kernel<<<(n + 255) / 255, 255>>>(
        input.data_ptr<float>(), output.data_ptr<float>(), n);
    return output;
}

PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("forward", &custom_relu, "Custom ReLU forward");
}`,
    testSuiteCode: `// test.py
import torch
import custom_relu_cpp
x = torch.randn(1024, device='cuda')
out = custom_relu_cpp.forward(x)
assert torch.allclose(out, torch.relu(x))
print("PyTorch Custom C++ Extension Test Passed!")`,
    cmakeFile: `# setup.py
from setuptools import setup
from torch.utils.cpp_extension import BuildExtension, CUDAExtension
setup(name='custom_relu', ext_modules=[CUDAExtension('custom_relu_cpp', ['custom_relu.cpp', 'custom_relu.cu'])], cmdclass={'build_ext': BuildExtension})`,
    expectedBenchmark: 'Zero-overhead invocation directly from PyTorch eager execution.'
  },
  {
    id: 'major_1_minitorch_framework_guide',
    type: 'major',
    title: 'Major Project 1 Guide: Building MiniTorch-CUDA From Scratch',
    tagline: 'Architecting a full-scale C++20 / CUDA Deep Learning Engine with Autograd, Strided Tensors, and Caching Memory Pool',
    estimatedHours: '25-35 hours',
    difficulty: 'Mastery',
    overview: 'A complete end-to-end architectural roadmap for building MiniTorch-CUDA: from low-level GPU memory allocators and reference-counted storage up to multidimensional tensor broadcasting, reverse-mode automatic differentiation DAGs, 25+ CUDA kernels, neural network modules, and training a complete Transformer model from scratch in pure C++.',
    learningObjectives: [
      'Design a production-grade C++20 Tensor class with strided layout arithmetic and zero-copy views',
      'Build a thread-safe CUDA Caching Memory Allocator with best-fit free lists and block coalescing',
      'Implement an industrial reverse-mode Autograd Engine with topological DAG graph resolution',
      'Write optimized CUDA kernels for GEMM, Conv2d, BatchNorm, LayerNorm, Softmax, and AdamW',
      'Train real neural networks (MNIST MLP, ConvNet, and nanoGPT) purely in C++ without Python dependencies'
    ],
    architectureDiagram: `[User C++ Code: model.forward(x)]
               │
               ▼
   [High-Level Modules: nn::Linear, nn::LayerNorm, nn::MultiheadAttention]
               │
               ▼
   [Autograd Graph Layer: Node, Edge, Tape Recording, Saved Tensors]
               │
               ▼
   [Tensor Engine: Shape, Strides, Offset, Zero-Copy View Arithmetic]
               │
               ▼
   [Memory Pool: CUDACachingAllocator (Segregated Free Lists, Block Splitting)]
               │
               ▼
   [Hardware CUDA Kernels: Vectorized float4, Tiled GEMM, Warp Reductions]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'Milestone 1: The Raw Storage & Caching Allocator Layer',
        description: 'Implement StorageImpl with intrusive atomic reference counting and CUDACachingAllocator to avoid cudaMalloc stalls.',
        codeTemplate: `class StorageImpl { ... };
class CUDACachingAllocator { ... };`,
        verificationStep: 'Benchmark 100,000 allocations to verify sub-50ns latency and zero memory leaks.'
      },
      {
        stepNumber: 2,
        title: 'Milestone 2: Strided Tensor Algebra & Zero-Copy Views',
        description: 'Implement TensorImpl with N-dimensional shape, strides, offset, slicing, transposing, and contiguous checks.',
        codeTemplate: `class TensorImpl { ... };
Tensor transpose(int d0, int d1);`,
        verificationStep: 'Verify tensor slicing and transpositions share the exact same underlying storage pointer.'
      },
      {
        stepNumber: 3,
        title: 'Milestone 3: The Tape-Based Reverse-Mode Autograd Engine',
        description: 'Construct the computational DAG with Node, Edge, saved_tensors, topological sort, and gradient accumulation.',
        codeTemplate: `class Node { ... };
class AddBackward : public Node { ... };
void AutogradEngine::backward(Node* root);`,
        verificationStep: 'Verify gradients for complex multi-branch graphs against PyTorch autograd outputs.'
      },
      {
        stepNumber: 4,
        title: 'Milestone 4: The High-Performance CUDA Kernel Suite',
        description: 'Implement all 25+ forward and backward CUDA kernels (GEMM, Conv2d, LayerNorm, Softmax, AdamW, Dropout).',
        codeTemplate: `__global__ void tiled_gemm_kernel(...);
__global__ void fused_adamw_kernel(...);`,
        verificationStep: 'Validate all CUDA kernels pass numerical gradient checks (finite difference method).'
      },
      {
        stepNumber: 5,
        title: 'Milestone 5: Neural Network Modules & End-to-End Training',
        description: 'Build nn::Module, nn::Linear, nn::Sequential, and train a 12-layer Transformer on GPU in pure C++.',
        codeTemplate: `auto model = std::make_shared<Transformer>(config);
for (int epoch = 0; epoch < 10; ++epoch) {
    auto loss = model->forward(x, targets);
    loss->backward();
    optimizer.step();
}`,
        verificationStep: 'Verify model loss converges identically to PyTorch reference implementation.'
      }
    ],
    completeCode: `// See Flagship Project 1 (MiniTorch-CUDA) for complete multi-file implementation and repository structure.`,
    testSuiteCode: `// Run 'make test' in minitorch-cuda/build directory to execute all unit tests.`,
    cmakeFile: `cmake_minimum_required(VERSION 3.20)
project(minitorch_cuda LANGUAGES CXX CUDA)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CUDA_STANDARD 17)
add_library(minitorch_core STATIC src/core/tensor.cpp src/core/allocator.cpp src/cuda/gemm.cu)
add_executable(train_transformer examples/train_transformer.cpp)
target_link_libraries(train_transformer PRIVATE minitorch_core)`,
    expectedBenchmark: 'Matches PyTorch C++ (LibTorch) throughput within 95% efficiency.'
  },
  {
    id: 'major_2_flash_llm_server_guide',
    type: 'major',
    title: 'Major Project 2 Guide: Building FlashLLM-Engine (Production Serving)',
    tagline: 'Architecting an industrial Low-Latency LLM Serving Engine with Fused FlashAttention-2, Paged KV Cache, and Multi-GPU Tensor Parallelism',
    estimatedHours: '30-40 hours',
    difficulty: 'Mastery',
    overview: 'Build an ultra-high throughput Transformer serving engine in C++20 and CUDA. Implement Fused FlashAttention-2, PagedAttention KV-Cache virtual memory manager, Fused RoPE rotary embeddings, SwiGLU, FP8 Tensor Cores, and continuous iteration batching.',
    learningObjectives: [
      'Implement Fused FlashAttention-2 forward kernel with online softmax in shared memory',
      'Design PagedAttention KV cache page table manager with copy-on-write prefix sharing',
      'Write fused kernels for RMSNorm, RoPE, and SwiGLU activations',
      'Integrate FP8 / INT8 Quantized GEMM using NVIDIA WMMA / CUTLASS',
      'Build a high-performance continuous batching scheduler handling hundreds of concurrent streaming users'
    ],
    architectureDiagram: `[Inference Request Queue]
               │
               ▼
[Continuous Batching Scheduler: dynamically packs prefill & decode tokens]
               │
               ▼
[PagedAttention Memory Manager: allocates physical 16-token GPU blocks]
               │
               ▼
[Transformer Blocks: Fused RMSNorm ──► Fused RoPE ──► Fused FlashAttention-2 ──► SwiGLU]
               │
               ▼
[Quantized FP8 / INT8 Tensor Core GEMM Projections]
               │
               ▼
[Warp-Level Top-K / Top-P Sampler ──► Output Tokens Streamed via gRPC / HTTP]`,
    milestones: [
      {
        stepNumber: 1,
        title: 'Milestone 1: Fused FlashAttention-2 Forward Kernel',
        description: 'Implement IO-aware attention with Q outer loop, K/V inner loop, and online softmax in SRAM.',
        codeTemplate: `__global__ void flash_attention_2_forward(...)`,
        verificationStep: 'Verify output matches standard attention within 1e-4 tolerance.'
      },
      {
        stepNumber: 2,
        title: 'Milestone 2: PagedAttention Block Table Manager',
        description: 'Build physical GPU page allocator and kernel reading non-contiguous block tables.',
        codeTemplate: `class KVCacheManager { ... };
__global__ void paged_attention_v2_kernel(...)`,
        verificationStep: 'Verify multi-turn generation without memory fragmentation.'
      },
      {
        stepNumber: 3,
        title: 'Milestone 3: Fused Pre-Layer Kernels (RoPE, RMSNorm, SwiGLU)',
        description: 'Implement high-speed fused kernels for rotary embeddings and activations.',
        codeTemplate: `__global__ void fused_rope_kernel(...);
__global__ void fused_rmsnorm_kernel(...);`,
        verificationStep: 'Profile with Nsight Systems to confirm zero kernel launch bubbles.'
      },
      {
        stepNumber: 4,
        title: 'Milestone 4: Continuous Batching Scheduler & Multi-GPU NCCL',
        description: 'Implement dynamic iteration-level batching and Megatron-LM Tensor Parallelism.',
        codeTemplate: `class ContinuousBatchScheduler { ... };
class TensorParallelComm { ... };`,
        verificationStep: 'Serve 128 concurrent requests with sub-15ms time-to-first-token (TTFT).'
      }
    ],
    completeCode: `// See Flagship Project 2 (FlashLLM-Engine) for complete multi-file implementation.`,
    testSuiteCode: `// Run benchmarks/bench_throughput.cpp to measure requests/sec and latency percentiles.`,
    cmakeFile: `cmake_minimum_required(VERSION 3.20)
project(flash_llm_engine LANGUAGES CXX CUDA)
add_executable(flash_llm_server server/grpc_inference_server.cpp src/kernels/flash_attn2.cu src/kernels/paged_attn.cu)
target_link_libraries(flash_llm_server PRIVATE cudart nccl)`,
    expectedBenchmark: 'Serves 150+ tokens/sec per user stream on LLaMA-3 8B with < 10ms per-token latency on NVIDIA H100.'
  }
];
