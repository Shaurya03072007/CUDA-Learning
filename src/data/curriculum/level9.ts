import { CurriculumLevel } from '../../types';

export const LEVEL_9: CurriculumLevel = {
  id: 'level_9',
  levelNumber: 9,
  title: 'PyTorch C++ Extensions & Deep Learning Infra Engine',
  subtitle: 'Building production custom CUDA C++ extensions, autograd bindings, memory allocators, and AdamW',
  badge: 'Production Infra',
  iconName: 'Terminal',
  description: '8 capstone progressive examples bringing everything together: PyTorch C++ extension bindings (pybind11 / TORCH_LIBRARY), custom autograd backward engines, caching memory allocators, and fused AdamW.',
  topics: [
    {
      id: 'ex_93_pytorch_extension_architecture',
      exampleNumber: 93,
      difficulty: 'Intermediate',
      title: 'Ex 93: PyTorch C++ & CUDA Extension Architecture (pybind11)',
      subtitle: 'Bridging high-speed C++/CUDA kernels directly into Python with zero copy overhead',
      readTime: '15 min',
      prerequisites: ['Ex 77: Default vs Non-Default Streams'],
      concepts: [
        'How PyTorch dispatches from Python (torch.Tensor) to C++ (at::Tensor)',
        'torch/extension.h and pybind11 module bindings',
        'Passing contiguous tensor data pointers via .data_ptr<float>()',
        'Extracting device ID, shapes, strides, and CUDA streams from at::Tensor'
      ],
      cPlusPlusTheory: `Python is too slow for low-level systems logic, but essential for deep learning user interfaces.
PyTorch provides a high-speed C++ extension mechanism via pybind11:
1. Write a C++ entry point taking 'torch::Tensor' arguments.
2. Validate inputs: 'TORCH_CHECK(x.is_cuda(), "x must be a CUDA tensor");'.
3. Extract raw device pointer: 'float* ptr = x.data_ptr<float>();'.
4. Get current PyTorch CUDA stream: 'c10::cuda::getCurrentCUDAStream()'.
5. Launch your custom CUDA kernel directly into PyTorch's stream.
6. Bind the function to Python with 'PYBIND11_MODULE(TORCH_EXTENSION_NAME, m)'.
Python can now call your custom CUDA kernel with zero serialization or copy overhead!`,
      hardwareMechanics: `The C++ wrapper extracts the existing 64-bit GPU virtual memory pointer directly from the torch::Tensor struct.
No allocations, no memory copying between Python and C++.`,
      kernelCode: `// Example 93: PyTorch C++ Extension Entry Point (custom_add.cpp)
#include <torch/extension.h>
#include <c10/cuda/CUDAStream.h>

// Forward declaration of raw CUDA kernel
void launch_custom_add(const float* a, const float* b, float* c, int n, cudaStream_t stream);

torch::Tensor custom_add_forward(torch::Tensor a, torch::Tensor b) {
    // 1. Validate tensors
    TORCH_CHECK(a.is_cuda(), "Input a must be on CUDA device");
    TORCH_CHECK(b.is_cuda(), "Input b must be on CUDA device");
    TORCH_CHECK(a.is_contiguous(), "Input a must be contiguous");
    TORCH_CHECK(b.is_contiguous(), "Input b must be contiguous");

    // 2. Allocate output tensor with identical shape and device
    auto c = torch::empty_like(a);

    int n = a.numel();
    cudaStream_t stream = c10::cuda::getCurrentCUDAStream();

    // 3. Launch CUDA kernel passing raw device pointers
    launch_custom_add(
        a.data_ptr<float>(),
        b.data_ptr<float>(),
        c.data_ptr<float>(),
        n,
        stream
    );

    return c;
}

// 4. PyBind11 Python Module Binding
PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("forward", &custom_add_forward, "Custom Fast CUDA Addition Forward (CUDA)");
}`,
      kernelExplanation: [
        'Line 2: #include <torch/extension.h> provides ATen tensor library and pybind11.',
        'Line 10: TORCH_CHECK validates tensor device, data type, and memory contiguity.',
        'Line 16: torch::empty_like allocates the result tensor using PyTorch caching allocator.',
        'Line 19: c10::cuda::getCurrentCUDAStream integrates kernel seamlessly into PyTorch stream queue.',
        'Line 33: PYBIND11_MODULE exposes the function directly to Python import.'
      ],
      commonPitfalls: [
        'Forgetting .is_contiguous(); calling data_ptr() on non-contiguous tensors leads to silent memory corruption.',
        'Launching in stream 0 instead of getCurrentCUDAStream, breaking PyTorch stream ordering.'
      ],
      benchmarkingNotes: 'PyTorch C++ extensions execute custom kernels in microseconds without Python interpreter overhead.'
    },
    {
      id: 'ex_94_torch_library_modern_dispatch',
      exampleNumber: 94,
      difficulty: 'Intermediate',
      title: 'Ex 94: Modern PyTorch Operator Registration (TORCH_LIBRARY)',
      subtitle: 'Native integration with torch.compile, TorchScript, and Autograd via TORCH_LIBRARY',
      readTime: '15 min',
      prerequisites: ['Ex 93: PyTorch Extension Architecture'],
      concepts: [
        'Legacy pybind11 limitations: Incompatible with torch.compile and symbolic tracing',
        'Modern TORCH_LIBRARY macro: Registering custom operators directly into PyTorch Dispatcher',
        'TORCH_LIBRARY_IMPL for backend-specific dispatch (CPU, CUDA, Meta)',
        'Registering abstract / meta shapes for torch.compile FX graph tracing'
      ],
      cPlusPlusTheory: `In modern PyTorch (PyTorch 2.0+), pybind11 modules act as opaque black boxes that break 'torch.compile':
The PyTorch Dispatcher allows registering custom operators as first-class citizens:
- 'TORCH_LIBRARY(my_ops, m) { m.def("fused_norm(Tensor x) -> Tensor"); }'
- 'TORCH_LIBRARY_IMPL(my_ops, CUDA, m) { m.impl("fused_norm", &fused_norm_cuda); }'
- 'TORCH_LIBRARY_IMPL(my_ops, Meta, m) { m.impl("fused_norm", &fused_norm_meta); }'
This allows 'torch.compile' to symbolically trace through your custom CUDA kernel without breaking the graph!`,
      hardwareMechanics: `The PyTorch Dispatch table resolves function calls with a single pointer lookup in ~10 nanoseconds.`,
      kernelCode: `// Example 94: Registering Operators with TORCH_LIBRARY
#include <torch/extension.h>

torch::Tensor custom_norm_cuda(const torch::Tensor& x);
torch::Tensor custom_norm_meta(const torch::Tensor& x) {
    // Meta implementation tells torch.compile the output shape/type without running CUDA!
    return torch::empty_like(x);
}

// 1. Declare schema in PyTorch Dispatcher
TORCH_LIBRARY(my_custom_ops, m) {
    m.def("fast_norm(Tensor x) -> Tensor");
}

// 2. Register CUDA hardware implementation
TORCH_LIBRARY_IMPL(my_custom_ops, CUDA, m) {
    m.impl("fast_norm", &custom_norm_cuda);
}

// 3. Register Meta implementation for torch.compile graph capture
TORCH_LIBRARY_IMPL(my_custom_ops, Meta, m) {
    m.impl("fast_norm", &custom_norm_meta);
}`,
      kernelExplanation: [
        'Line 11: Declares custom operator schema in the my_custom_ops namespace.',
        'Line 16: Binds the compiled CUDA kernel to the CUDA dispatcher key.',
        'Line 21: Meta registration allows torch.compile / Inductor to trace shapes without GPU hardware.'
      ],
      commonPitfalls: [
        'Missing the Meta registration, causing torch.compile to fall back to eager Python graph breaks.',
        'Incorrect type signatures in schema string.'
      ],
      benchmarkingNotes: 'Eliminates graph breaks in torch.compile, allowing end-to-end kernel fusion.'
    },
    {
      id: 'ex_95_custom_autograd_function',
      exampleNumber: 95,
      difficulty: 'Advanced',
      title: 'Ex 95: Custom Autograd Engine Function (Forward & Backward)',
      subtitle: 'Writing custom backward gradient propagation using torch::autograd::Function',
      readTime: '15 min',
      prerequisites: ['Ex 94: TORCH_LIBRARY Modern Dispatch'],
      concepts: [
        'torch::autograd::Function C++ base class',
        'AutogradContext: ctx->save_for_backward for saving tensors',
        'Writing the forward pass and analytical backward pass',
        'Automatic gradient backpropagation in PyTorch computation graphs'
      ],
      cPlusPlusTheory: `To train neural networks with custom CUDA kernels, you must implement both Forward and Backward passes.
In C++, inherit from 'torch::autograd::Function<CustomOp>':
1. 'forward(AutogradContext* ctx, Tensor x)':
   - Computes forward kernel.
   - Saves intermediate variables needed for differentiation: 'ctx->save_for_backward({x});'.
2. 'backward(AutogradContext* ctx, variable_list grad_outputs)':
   - Retrieves saved forward tensors: 'auto saved = ctx->get_saved_variables();'.
   - Launches custom CUDA backward kernel computing dL/dx = grad_output * df/dx.
PyTorch's autograd engine automatically inserts your backward function into the backward execution graph!`,
      hardwareMechanics: `During backward pass, gradients are computed in reverse topological order.
Fused backward kernels compute parameter and input gradients in a single pass.`,
      kernelCode: `// Example 95: Custom C++ Autograd Function
#include <torch/extension.h>

class CustomActivation : public torch::autograd::Function<CustomActivation> {
public:
    static torch::Tensor forward(torch::autograd::AutogradContext *ctx, torch::Tensor input) {
        // Compute forward: y = input * 2.0f
        auto output = input * 2.0f;

        // Save input for backward differentiation
        ctx->save_for_backward({input});
        return output;
    }

    static torch::autograd::variable_list backward(
        torch::autograd::AutogradContext *ctx, 
        torch::autograd::variable_list grad_outputs
    ) {
        auto saved = ctx->get_saved_variables();
        auto input = saved[0];
        auto grad_output = grad_outputs[0];

        // Derivative of 2*x is 2: dL/dx = grad_output * 2.0f
        auto grad_input = grad_output * 2.0f;

        return {grad_input};
    }
};

torch::Tensor run_custom_activation(torch::Tensor x) {
    return CustomActivation::apply(x);
}`,
      kernelExplanation: [
        'Line 3: Inherits from torch::autograd::Function<CustomActivation>.',
        'Line 10: ctx->save_for_backward caches tensors needed for calculus in the backward pass.',
        'Line 20: Extracts upstream gradient grad_output.',
        'Line 24: Returns downstream gradient grad_input to propagate through the graph.',
        'Line 30: CustomActivation::apply(x) attaches the node to PyTorch autograd graph.'
      ],
      commonPitfalls: [
        'Saving output instead of input when derivative requires input values.',
        'Returning gradients in an order that does not match the forward input argument list.'
      ],
      benchmarkingNotes: 'Custom fused backward kernels save up to 70% memory compared to auto-differentiated graphs.'
    },
    {
      id: 'ex_96_cuda_caching_allocator',
      exampleNumber: 96,
      difficulty: 'Expert',
      title: 'Ex 96: Designing a High-Speed CUDA Caching Allocator',
      subtitle: 'Why cudaMalloc causes 50 µs stalls and how memory pooling achieves sub-microsecond allocations',
      readTime: '15 min',
      prerequisites: ['Ex 95: Custom Autograd Function'],
      concepts: [
        'The cudaMalloc latency problem: cudaMalloc is an expensive system call (~30-50 µs)',
        'cudaMalloc implicitly synchronizes ALL active CUDA streams on the GPU!',
        'Memory pooling / Caching Allocator: Allocating large memory pools (e.g. 1 GB blocks)',
        'Segregated free lists / Buddy allocation for sub-microsecond malloc and free'
      ],
      cPlusPlusTheory: `In deep learning, neural networks allocate and free thousands of intermediate activation tensors every second.
If you call 'cudaMalloc' and 'cudaFree' inside a training loop:
1. Each call takes 30 to 50 microseconds (the GPU sits completely idle!).
2. 'cudaMalloc' synchronizes the entire GPU device, breaking all concurrent stream overlap!
PyTorch solves this with its internal 'Caching Allocator':
- Pre-allocates huge chunks of memory (e.g. 512 MB blocks).
- Maintains segregated free lists of available memory blocks.
- Allocations and deallocations are pure CPU pointer arithmetic taking <100 nanoseconds with ZERO GPU driver synchronization!`,
      hardwareMechanics: `Bypasses the OS kernel driver and GPU MMU page allocation routines entirely during steady-state execution.`,
      kernelCode: `// Example 96: Minimalist C++ GPU Caching Allocator
#include <iostream>
#include <unordered_map>
#include <vector>
#include <cuda_runtime.h>

class SimpleCudaCachingAllocator {
private:
    // Free blocks sorted by size
    std::unordered_multimap<size_t, void*> free_blocks;

public:
    void* allocate(size_t bytes) {
        // Check if an existing block of suitable size is available
        auto it = free_blocks.find(bytes);
        if (it != free_blocks.end()) {
            void* ptr = it->second;
            free_blocks.erase(it);
            return ptr; // Reused cached block in 50 nanoseconds!
        }

        // Cache miss: Allocate new block from device
        void* ptr = nullptr;
        cudaMalloc(&ptr, bytes);
        return ptr;
    }

    void deallocate(void* ptr, size_t bytes) {
        // Do NOT call cudaFree! Retain pointer in free list for reuse
        free_blocks.insert({bytes, ptr});
    }

    ~SimpleCudaCachingAllocator() {
        for (auto& pair : free_blocks) {
            cudaFree(pair.second);
        }
    }
};

int main() {
    SimpleCudaCachingAllocator allocator;
    void* p1 = allocator.allocate(1024 * 1024); // Fresh allocation
    allocator.deallocate(p1, 1024 * 1024);      // Cached

    void* p2 = allocator.allocate(1024 * 1024); // Instant cache hit (<50 ns)!
    allocator.deallocate(p2, 1024 * 1024);

    std::cout << "Caching allocator reused memory block instantly without cudaMalloc driver stalls!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 9: free_blocks stores allocated GPU memory addresses indexed by byte size.',
        'Line 14: Checks cache; if found, returns immediately in nanoseconds without calling CUDA driver.',
        'Line 26: Deallocate returns block to cache pool rather than calling expensive cudaFree.',
        'Line 40: Demonstrates instantaneous cache hit on second allocation.'
      ],
      commonPitfalls: [
        'Memory fragmentation over long training runs; production allocators (like c10::cuda) use split/merge buddy trees.',
        'Calling cudaFree during training loops, causing catastrophic latency spikes.'
      ],
      benchmarkingNotes: 'Reduces memory allocation latency from 45,000 ns down to 80 ns.'
    },
    {
      id: 'ex_97_fused_adamw_kernel',
      exampleNumber: 97,
      difficulty: 'Expert',
      title: 'Ex 97: Fused AdamW Optimizer Kernel with FP32 Master Weights',
      subtitle: 'Updating weights, momentum, variance, and weight decay in a single memory pass',
      readTime: '15 min',
      prerequisites: ['Ex 96: CUDA Caching Allocator'],
      concepts: [
        'AdamW mathematical update equations (m, v, weight decay, learning rate)',
        'Unfused PyTorch AdamW: Reads and writes 5 tensors to DRAM separately (10 DRAM passes!)',
        'Fused AdamW: Reads weight, grad, m, v ONCE, computes update in registers, writes back ONCE',
        'Vectorized float4 implementation achieving peak HBM bandwidth'
      ],
      cPlusPlusTheory: `In standard PyTorch, 'optimizer.step()' runs 5 separate operations:
1. Weight decay: param = param * (1 - lr * wd)
2. Momentum update: m = beta1 * m + (1 - beta1) * grad
3. Variance update: v = beta2 * v + (1 - beta2) * grad^2
4. Bias correction: m_hat = m / (1 - beta1^t), v_hat = v / (1 - beta2^t)
5. Parameter update: param = param - lr * m_hat / (sqrt(v_hat) + eps)
Each operation reads and writes to DRAM—10 memory roundtrips per parameter!
In Fused AdamW:
All 5 updates are fused into a single kernel.
A thread loads param, grad, m, and v into registers ONCE, executes all equations in registers, and writes them back ONCE!
Memory traffic is reduced by 80%!`,
      hardwareMechanics: `The optimizer is 100% memory bandwidth bound.
Fusing all updates into a single vectorized pass achieves >85% of theoretical HBM bandwidth.`,
      kernelCode: `// Example 97: Production Fused AdamW Optimizer Kernel
#include <iostream>
#include <cuda_runtime.h>
#include <cmath>

__global__ void fused_adamw_kernel(
    float* __restrict__ p,       // Weights
    const float* __restrict__ g, // Gradients
    float* __restrict__ m,       // 1st Momentum
    float* __restrict__ v,       // 2nd Momentum
    float lr, float beta1, float beta2,
    float eps, float weight_decay,
    float step, int N
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        // Single load of all 4 tensors into hardware REGISTERS
        float param = p[idx];
        float grad = g[idx];
        float m_val = m[idx];
        float v_val = v[idx];

        // 1. Decoupled Weight Decay
        param -= lr * weight_decay * param;

        // 2. Update biased 1st and 2nd moments
        m_val = beta1 * m_val + (1.0f - beta1) * grad;
        v_val = beta2 * v_val + (1.0f - beta2) * grad * grad;

        // 3. Compute bias corrections
        float bias_corr1 = 1.0f - powf(beta1, step);
        float bias_corr2 = 1.0f - powf(beta2, step);

        float m_hat = m_val / bias_corr1;
        float v_hat = v_val / bias_corr2;

        // 4. Update parameter
        param -= lr * m_hat / (sqrtf(v_hat) + eps);

        // Single write-back to DRAM
        p[idx] = param;
        m[idx] = m_val;
        v[idx] = v_val;
    }
}

int main() {
    std::cout << "Fused AdamW executes all 5 optimizer equations in a single DRAM pass!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 19: Loads p, g, m, v simultaneously into registers.',
        'Line 25: Computes decoupled weight decay directly.',
        'Line 28: Updates running momentum and second moments.',
        'Line 38: Stores updated p, m, v back to memory in a single coordinated store.'
      ],
      commonPitfalls: [
        'Computing powf(beta1, step) inside the thread loop; compute bias correction factors once on the CPU host and pass as scalars.',
        'Forgetting epsilon inside the square root vs outside.'
      ],
      benchmarkingNotes: 'Fused AdamW executes 4.5x faster than unfused PyTorch torch.optim.AdamW.'
    },
    {
      id: 'ex_98_int8_quantization_dequantization',
      exampleNumber: 98,
      difficulty: 'Expert',
      title: 'Ex 98: INT8 / INT4 Quantization & Dequantization Kernels',
      subtitle: 'Compressing model weights by 4x to 8x for high-throughput LLM serving',
      readTime: '15 min',
      prerequisites: ['Ex 97: Fused AdamW Kernel'],
      concepts: [
        'Quantization formula: q = clamp(round(x / scale) + zero_point, -128, 127)',
        'Dequantization formula: x = (q - zero_point) * scale',
        'Symmetric quantization: zero_point = 0, scale = max(abs(x)) / 127',
        'Packing two 4-bit integers into a single 8-bit unsigned char'
      ],
      cPlusPlusTheory: `Large language models are bottlenecked by memory capacity and memory bandwidth.
In INT8 quantization (LLM.int8(), SmoothQuant):
- 16-bit floats (2 bytes) are quantized to 8-bit signed integers (1 byte), cutting model size in half.
In INT4 quantization (AWQ, GPTQ):
- Weights are quantized to 4-bit integers, packing two weights per byte, shrinking a 70B model from 140 GB down to 35 GB!
Inside the GEMM kernel, threads load packed 4-bit/8-bit integers from DRAM, dequantize them to FP16 in registers, and compute on Tensor Cores at maximum speed!`,
      hardwareMechanics: `Cuts DRAM memory bandwidth requirements by 75% for INT4.
Hopper and Ada Lovelace GPUs can execute INT4 and INT8 Tensor Core math natively.`,
      kernelCode: `// Example 98: INT8 Symmetric Dequantization Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void dequantize_int8_to_fp32(
    const int8_t* __restrict__ q_weights, // 1 byte per weight
    const float* __restrict__ scales,     // Per-channel or per-tensor scale
    float* __restrict__ out_fp32,
    int N
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        float scale = scales[0]; // Broadcast scale factor
        int8_t q_val = q_weights[idx];

        // Dequantize in register: x = q * scale
        out_fp32[idx] = static_cast<float>(q_val) * scale;
    }
}

int main() {
    std::cout << "INT8 / INT4 quantization compresses LLM weights by up to 8x with minimal perplexity loss!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Takes int8_t* weights, consuming only 1 byte per parameter.',
        'Line 16: Dequantizes directly in register without intermediate memory allocations.'
      ],
      commonPitfalls: [
        'Outliers in activations: In transformer activations, 0.1% of channels contain large outlier values; SmoothQuant migrates activation outliers into weights.',
        'Improper rounding causing bias accumulation.'
      ],
      benchmarkingNotes: 'INT4 quantized models fit on single consumer GPUs (e.g. RTX 4090) with 3x higher token generation speed.'
    },
    {
      id: 'ex_99_production_gradcheck_testing',
      exampleNumber: 99,
      difficulty: 'Expert',
      title: 'Ex 99: Production Verification: Numerical Gradient Checking (gradcheck)',
      subtitle: 'Validating custom analytical CUDA gradients against finite-difference calculus',
      readTime: '15 min',
      prerequisites: ['Ex 98: INT8 Quantization'],
      concepts: [
        'Why custom CUDA backward passes MUST be rigorously validated',
        'Finite difference formula: f\'(x) approx (f(x + eps) - f(x - eps)) / (2 * eps)',
        'torch.autograd.gradcheck: Automated Jacobian matrix comparison',
        'Setting tolerances (rtol, atol) for FP32 and FP64 precision'
      ],
      cPlusPlusTheory: `Writing custom CUDA backward kernels is notoriously error-prone. A small off-by-one error or incorrect derivative formula can cause model training to diverge after weeks of compute.
Numerical Gradient Checking compares your analytical CUDA gradient against the true numerical gradient computed via finite differences:
- Numerical gradient: g_num = (f(x + eps) - f(x - eps)) / (2 * eps)
- Analytical gradient: g_cuda from your custom CUDA backward kernel.
If |g_num - g_cuda| / (|g_num| + |g_cuda|) < 1e-4, your CUDA kernel is mathematically proven correct!`,
      hardwareMechanics: `Runs in double-precision (FP64) to ensure finite difference approximations are accurate to machine epsilon.`,
      kernelCode: `// Example 99: Finite Difference Gradient Check in C++
#include <iostream>
#include <cmath>
#include <cassert>

// Target function: f(x) = x^3
float forward_func(float x) { return x * x * x; }
// Custom analytical CUDA gradient: f'(x) = 3 * x^2
float custom_backward_gradient(float x) { return 3.0f * x * x; }

void run_gradcheck(float x) {
    const float eps = 1e-3f;

    // Numerical finite difference
    float f_plus  = forward_func(x + eps);
    float f_minus = forward_func(x - eps);
    float num_grad = (f_plus - f_minus) / (2.0f * eps);

    // Analytical gradient from CUDA kernel
    float cuda_grad = custom_backward_gradient(x);

    float rel_error = std::abs(num_grad - cuda_grad) / (std::abs(num_grad) + std::abs(cuda_grad) + 1e-8f);

    std::cout << "x = " << x << "\\n";
    std::cout << "Numerical Grad:  " << num_grad << "\\n";
    std::cout << "Analytical Grad: " << cuda_grad << "\\n";
    std::cout << "Relative Error:  " << rel_error << "\\n";

    assert(rel_error < 1e-4f && "Gradient check FAILED! Mathematical error in backward kernel!");
    std::cout << "Gradient check PASSED with flying colors!\\n";
}

int main() {
    run_gradcheck(2.5f);
    return 0;
}`,
      kernelExplanation: [
        'Line 6: forward_func computes activation.',
        'Line 8: custom_backward_gradient represents the analytical gradient from your CUDA backward kernel.',
        'Line 16: Central difference formula calculates ground-truth numerical gradient.',
        'Line 21: Computes relative error, ensuring mathematical correctness.'
      ],
      commonPitfalls: [
        'Using eps too small (e.g. 1e-8 in FP32), causing catastrophic subtraction cancellation.',
        'Testing with non-smooth functions (e.g. ReLU at x = 0), where derivatives are non-differentiable.'
      ],
      benchmarkingNotes: 'Never ship a custom CUDA kernel to production without passing torch.autograd.gradcheck in FP64.'
    },
    {
      id: 'ex_100_capstone_infra_architecture',
      exampleNumber: 100,
      difficulty: 'Expert',
      title: 'Ex 100: Capstone: The Full-Stack GPU Systems Architecture',
      subtitle: 'From Silicon Transistors to Trillion-Parameter LLM Infrastructure: You are now a CUDA Systems Architect',
      readTime: '20 min',
      prerequisites: ['All Examples 1 through 99'],
      concepts: [
        'Synthesis of all 10 Levels (Ex 1 to Ex 100)',
        'The Complete Deep Learning Stack: Hardware -> PTX -> CUDA C++ -> Kernels -> PyTorch -> Distributed Cluster',
        'The 4 Golden Principles of GPU Performance: Coalescing, Occupancy, Tiling/Fusion, Asynchrony',
        'Next Steps: Deep dive into the 2 Major Projects and 1000 Question Bank'
      ],
      cPlusPlusTheory: `Congratulations on completing all 100 progressive CUDA C++ Systems Engineering examples!
You have journeyed from the foundational basics of C++20 pointers and memory alignment:
- Level 0: Memory models, Arena Allocators, SIMD, and Cache Lines.
- Level 1: The GPU execution model, Warps, Divergence, and Thread Indexing.
- Level 2: Memory coalescing, 128-bit float4 loads, and Constant Caches.
- Level 3: Shared memory, Bank conflict padding, and Warp shuffles.
- Level 4: Tiled GEMM, Fused Norms, and Online Softmax.
- Level 5: Hardware Tensor Cores, WMMA, and Async copy pipelines.
- Level 6: FlashAttention-1, FlashAttention-2, and FlashDecoding.
- Level 7: CUDA Streams, Overlapped DMA, and CUDA Graphs.
- Level 8: Multi-GPU scaling, NVLink, NCCL AllReduce, and Tensor Parallelism.
- Level 9: PyTorch C++ extensions, autograd engines, and fused AdamW.
You now possess the foundational knowledge required to architect, optimize, and scale production-grade AI infrastructure.`,
      hardwareMechanics: `You understand how every single instruction translates to physical silicon: SM warp schedulers, register crossbars, SRAM bank switches, Tensor Core arrays, and NVLink crossbars.`,
      kernelCode: `// Example 100: Capstone Verification of Full System Competence
#include <iostream>
#include <cuda_runtime.h>

int main() {
    int device = 0;
    cudaDeviceProp prop;
    cudaGetDeviceProperties(&prop, device);

    std::cout << "=======================================================\\n";
    std::cout << "  CONGRATULATIONS: 100 CUDA C++ EXAMPLES COMPLETED!   \\n";
    std::cout << "=======================================================\\n";
    std::cout << "Target Device: " << prop.name << "\\n";
    std::cout << "Compute Capability: " << prop.major << "." << prop.minor << "\\n";
    std::cout << "SM Count: " << prop.multiProcessorCount << "\\n";
    std::cout << "Shared Memory per Block: " << prop.sharedMemPerBlock / 1024 << " KB\\n";
    std::cout << "Global Memory Bus Width: " << prop.memoryBusWidth << " bits\\n";
    std::cout << "\\nYou are now equipped to build next-generation AI infrastructure!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 9: Queries complete hardware properties.',
        'Line 19: Marks the graduation milestone across all 100 progressive examples.'
      ],
      commonPitfalls: [
        'Believing optimization stops here; new hardware architectures (Blackwell, Rubin) bring continuous innovation (FP4, NVLink 5, Decompression engines).',
        'Optimizing before profiling; always profile with Nsight Compute and Nsight Systems first!'
      ],
      benchmarkingNotes: 'You have mastered the curriculum covering 100 distinct examples across 10 levels.'
    }
  ]
};
