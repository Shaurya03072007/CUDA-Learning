import { CurriculumLevel } from '../../types';

export const LEVEL_1: CurriculumLevel = {
  id: 'level_1',
  levelNumber: 1,
  title: 'GPU Architecture & First CUDA Kernels',
  subtitle: 'From CPU serial mental models to massive SIMT parallelism, thread indexing, and device kernels',
  badge: 'CUDA Fundamentals',
  iconName: 'Zap',
  description: '12 progressive examples mastering host vs device memory, thread hierarchies (Grids, Blocks, Warps), 1D/2D/3D indexing, atomic operations, and foundational math kernels.',
  topics: [
    {
      id: 'ex_13_host_vs_device',
      exampleNumber: 13,
      difficulty: 'Beginner',
      title: 'Ex 13: Host (CPU) vs Device (GPU) Memory & cudaMalloc',
      subtitle: 'Understanding isolated memory address spaces and PCIe bus transfers',
      readTime: '12 min',
      prerequisites: ['Ex 3: Heap Allocation & Dynamic Buffers'],
      concepts: [
        'Host memory (System RAM) vs Device memory (GPU HBM/GDDR)',
        'cudaMalloc for allocating GPU global memory',
        'cudaMemcpyHostToDevice and cudaMemcpyDeviceToHost',
        'cudaFree for releasing GPU resources'
      ],
      cPlusPlusTheory: `The CPU and GPU are separate physical processors connected by a PCIe bus.
The CPU cannot directly dereference a pointer pointing into GPU VRAM (without Unified Virtual Memory).
A typical CUDA pipeline involves:
1. Allocate CPU buffer (Host) and initialize data.
2. Allocate GPU buffer with cudaMalloc (Device).
3. Copy data across PCIe bus using cudaMemcpyHostToDevice.
4. Launch GPU kernel.
5. Copy results back with cudaMemcpyDeviceToHost.`,
      hardwareMechanics: `GPU High Bandwidth Memory (HBM3 on H100) provides up to 3.35 TB/s of bandwidth, whereas the PCIe 5.0 x16 bus only provides 64 GB/s.
Data transfers across PCIe are ~50x slower than GPU memory accesses, making PCIe transfers the most common performance bottleneck in amateur CUDA programs.`,
      kernelCode: `// Example 13: Allocating and Copying Memory Across PCIe Bus
#include <iostream>
#include <cuda_runtime.h>

int main() {
    const size_t N = 1024;
    const size_t bytes = N * sizeof(float);

    // 1. Allocate and initialize host memory
    float* h_data = new float[N];
    for (size_t i = 0; i < N; ++i) h_data[i] = 1.0f;

    // 2. Allocate device memory on GPU
    float* d_data = nullptr;
    cudaError_t err = cudaMalloc(&d_data, bytes);
    if (err != cudaSuccess) {
        std::cerr << "cudaMalloc failed: " << cudaGetErrorString(err) << "\\n";
        return 1;
    }

    // 3. Copy data from Host to Device
    cudaMemcpy(d_data, h_data, bytes, cudaMemcpyHostToDevice);

    // 4. Free allocated memory
    cudaFree(d_data);
    delete[] h_data;
    std::cout << "Successfully allocated and copied 1024 floats to GPU!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 13: d_data is an 8-byte pointer on the CPU stack holding the physical GPU memory address.',
        'Line 14: cudaMalloc reserves 4096 bytes in GPU VRAM.',
        'Line 21: cudaMemcpy initiates a synchronous DMA transfer across the PCIe bus.',
        'Line 24: cudaFree releases the GPU VRAM page allocation.'
      ],
      commonPitfalls: [
        'Attempting to dereference d_data on the CPU (e.g. h_val = *d_data) crashes the CPU with an invalid page fault.',
        'Forgetting cudaFree causes progressive VRAM exhaustion (GPU Out-of-Memory / CUDA OOM).'
      ],
      benchmarkingNotes: 'PCIe transfer latency is ~5 microseconds. Never transfer tiny arrays individually; batch transfers into large contiguous blocks.'
    },
    {
      id: 'ex_14_kernel_launch_syntax',
      exampleNumber: 14,
      difficulty: 'Beginner',
      title: 'Ex 14: The <<<Grid, Block>>> Kernel Execution Configuration',
      subtitle: 'How execution configurations launch millions of lightweight GPU threads',
      readTime: '12 min',
      prerequisites: ['Ex 13: Host vs Device Memory'],
      concepts: [
        'The __global__ function qualifier defining a CUDA kernel',
        'Triple chevron <<<blocks, threads_per_block>>> syntax',
        'Asynchronous kernel launches: CPU returns immediately while GPU executes',
        'cudaDeviceSynchronize() for CPU/GPU synchronization'
      ],
      cPlusPlusTheory: `A function marked with '__global__' executes on the GPU and is callable from the CPU.
The expression 'my_kernel<<<grid_dim, block_dim>>>(args...)' instructs the CUDA driver to spawn:
Total Threads = grid_dim * block_dim.
Unlike heavyweight OS threads (which take ~10 µs to spawn), GPU threads are hardware-instantiated with zero software context-switch overhead.`,
      hardwareMechanics: `When a kernel is launched, the GigaThread hardware engine distributes thread blocks across available Streaming Multiprocessors (SMs).
Each SM schedules execution in lockstep groups of 32 threads called Warps.
Kernel launches are asynchronous; the CPU continues execution immediately without waiting unless cudaDeviceSynchronize() is called.`,
      kernelCode: `// Example 14: Launching Your First Asynchronous GPU Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void hello_gpu_kernel() {
    // Executes concurrently on every spawned GPU thread
}

int main() {
    int blocks = 4;
    int threads_per_block = 256;
    // Launches 4 * 256 = 1024 hardware threads
    hello_gpu_kernel<<<blocks, threads_per_block>>>();

    // Wait for the GPU to finish executing before exiting
    cudaError_t err = cudaDeviceSynchronize();
    if (err != cudaSuccess) {
        std::cerr << "Kernel launch failed: " << cudaGetErrorString(err) << "\\n";
        return 1;
    }

    std::cout << "Kernel executed successfully across 1024 GPU threads!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 4: __global__ tells nvcc to compile this function into GPU machine instructions (SASS).',
        'Line 12: <<<4, 256>>> assigns 4 thread blocks with 256 threads each to the hardware scheduler.',
        'Line 15: cudaDeviceSynchronize() blocks the CPU thread until all 1024 threads complete on the GPU.'
      ],
      commonPitfalls: [
        'Exiting main() without cudaDeviceSynchronize() may terminate the process before GPU kernels even start executing.',
        'Setting threads_per_block > 1024 will cause a launch failure (hardware limit per block is 1024 threads).'
      ],
      benchmarkingNotes: 'Kernel launch overhead from the CPU driver is ~2 to 5 microseconds.'
    },
    {
      id: 'ex_15_1d_thread_indexing',
      exampleNumber: 15,
      difficulty: 'Beginner',
      title: 'Ex 15: 1D Thread Indexing (blockIdx, threadIdx, blockDim)',
      subtitle: 'Computing a unique global thread index: idx = blockIdx.x * blockDim.x + threadIdx.x',
      readTime: '12 min',
      prerequisites: ['Ex 14: Kernel Launch Syntax'],
      concepts: [
        'Built-in CUDA variables: threadIdx, blockIdx, blockDim, gridDim',
        'Global 1D index mapping formula',
        'Bounds checking: if (idx < N) to prevent buffer overflows',
        'Grid calculation: blocks = (N + threads - 1) / threads'
      ],
      cPlusPlusTheory: `Because every GPU thread executes the exact same kernel code (Single Program, Multiple Data - SPMD), threads must know which data element to process.
CUDA provides built-in read-only vector structs:
- 'threadIdx.x': Thread offset within its thread block (0 to blockDim.x - 1)
- 'blockIdx.x': Block index in the grid (0 to gridDim.x - 1)
- 'blockDim.x': Number of threads per block
The global index is: 'int idx = blockIdx.x * blockDim.x + threadIdx.x;'.`,
      hardwareMechanics: `Hardware registers inside each SM automatically hold the thread and block coordinates.
Evaluating 'blockIdx.x * blockDim.x + threadIdx.x' compiles to a single Special Register read and an Integer Multiply-Add (IMAD/S2R) instruction.`,
      kernelCode: `// Example 15: 1D Thread Indexing & Vector Scaling
#include <iostream>
#include <cuda_runtime.h>

__global__ void scale_array_kernel(float* data, float alpha, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        data[idx] *= alpha;
    }
}

int main() {
    const int N = 1000; // Not a multiple of 256!
    const int threads = 256;
    // Ceiling division idiom: (N + threads - 1) / threads
    const int blocks = (N + threads - 1) / threads; // 4 blocks (1024 threads total)

    float* d_data;
    cudaMalloc(&d_data, N * sizeof(float));

    scale_array_kernel<<<blocks, threads>>>(d_data, 2.5f, N);
    cudaDeviceSynchronize();

    cudaFree(d_data);
    std::cout << "Scaled " << N << " elements across " << blocks << " blocks safely!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Computes the unique global element index for the calling thread.',
        'Line 6: Bounds check ' + 'if (idx < N)' + ' ensures threads 1000-1023 do not write out of bounds.',
        'Line 14: Ceiling integer division ensures enough blocks are launched to cover all N elements.'
      ],
      commonPitfalls: [
        'Forgetting the bounds check (if idx < N) causes out-of-bounds writes corrupting other GPU allocations.',
        'Using integer division N / threads rounds down, leaving the last elements unprocessed.'
      ],
      benchmarkingNotes: 'Using powers-of-two thread block sizes (e.g. 128, 256) maximizes warp occupancy on the SM.'
    },
    {
      id: 'ex_16_vector_add',
      exampleNumber: 16,
      difficulty: 'Beginner',
      title: 'Ex 16: Complete Vector Addition (A + B = C)',
      subtitle: 'The canonical deep learning elementwise binary operation end-to-end',
      readTime: '15 min',
      prerequisites: ['Ex 15: 1D Thread Indexing'],
      concepts: [
        'Elementwise operations in neural networks (residual connections, bias addition)',
        'Passing multiple input and output pointers to kernels',
        'Memory bandwidth bound workloads',
        'Verifying GPU results on the CPU host'
      ],
      cPlusPlusTheory: `Vector addition 'C[i] = A[i] + B[i]' is the foundational elementwise kernel in deep learning (e.g. ResNet residual addition, Adam momentum updates).
Because vector addition performs only 1 FLOP per 12 bytes transferred (reading 8 bytes, writing 4 bytes), its arithmetic intensity is 0.083 FLOPs/Byte—strictly Memory-Bandwidth Bound.`,
      hardwareMechanics: `During execution, 32 threads in each warp issue simultaneous 32-bit load instructions.
The hardware coalescing unit detects that threads 0-31 are requesting contiguous 4-byte words and fuses the 32 individual reads into a single 128-byte DRAM transaction.`,
      kernelCode: `// Example 16: Complete Vector Addition Kernel & CPU Verification
#include <iostream>
#include <cmath>
#include <cuda_runtime.h>

__global__ void vector_add_kernel(const float* A, const float* B, float* C, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        C[idx] = A[idx] + B[idx];
    }
}

int main() {
    const int N = 100000;
    const size_t bytes = N * sizeof(float);

    float *h_A = new float[N], *h_B = new float[N], *h_C = new float[N];
    for (int i = 0; i < N; ++i) {
        h_A[i] = 1.0f;
        h_B[i] = 2.0f;
    }

    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, bytes);
    cudaMalloc(&d_B, bytes);
    cudaMalloc(&d_C, bytes);

    cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_B, h_B, bytes, cudaMemcpyHostToDevice);

    int threads = 256;
    int blocks = (N + threads - 1) / threads;
    vector_add_kernel<<<blocks, threads>>>(d_A, d_B, d_C, N);

    cudaMemcpy(h_C, d_C, bytes, cudaMemcpyDeviceToHost);

    // Verify result: 1.0 + 2.0 == 3.0
    bool correct = true;
    for (int i = 0; i < N; ++i) {
        if (std::fabs(h_C[i] - 3.0f) > 1e-5f) { correct = false; break; }
    }
    std::cout << "Vector Addition Output Verified: " << (correct ? "SUCCESS" : "FAILED") << "\\n";

    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    delete[] h_A; delete[] h_B; delete[] h_C;
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Marks input pointers as const float* to signal read-only semantics to compiler optimization passes.',
        'Line 28: Launches vector_add_kernel with full hardware saturation.',
        'Line 35: CPU verifies numerical precision against reference output.'
      ],
      commonPitfalls: [
        'Passing device pointers to CPU code or host pointers to GPU kernels causes segmentation or illegal address faults.',
        'Forgetting to allocate memory for output buffer d_C.'
      ],
      benchmarkingNotes: 'On an NVIDIA A100 (2.0 TB/s HBM), 100,000 elements (400 KB) executes in ~2 microseconds.'
    },
    {
      id: 'ex_17_relu_elementwise',
      exampleNumber: 17,
      difficulty: 'Beginner',
      title: 'Ex 17: Fused Elementwise Activation Kernel (ReLU)',
      subtitle: 'Writing branch-free activation functions using fmaxf and ternary operators',
      readTime: '12 min',
      prerequisites: ['Ex 16: Vector Addition'],
      concepts: [
        'Activation functions in deep learning: ReLU(x) = max(0, x)',
        'Branching vs branch-free hardware instructions',
        'Single-cycle hardware intrinsics: fmaxf(0.0f, val)',
        'In-place tensor mutation'
      ],
      cPlusPlusTheory: `The Rectified Linear Unit (ReLU) is defined as f(x) = max(0, x).
While you could write 'if (x < 0) x = 0;', branching inside GPU kernels can cause warp divergence.
Instead, we use hardware intrinsics like 'fmaxf(0.0f, x)' or compiler predicated instructions to keep all 32 threads in the warp executing in lockstep without branching.`,
      hardwareMechanics: `NVIDIA GPUs have a dedicated single-cycle floating-point MAX instruction (FMNMX or FMAX).
Using fmaxf compiles directly to this hardware instruction, eliminating branch condition evaluation and pipeline flushes.`,
      kernelCode: `// Example 17: Branch-Free In-Place ReLU Activation
#include <iostream>
#include <cuda_runtime.h>

__global__ void relu_kernel(float* data, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        // Branch-free single-cycle hardware max instruction
        data[idx] = fmaxf(0.0f, data[idx]);
    }
}

int main() {
    const int N = 8;
    float h_data[N] = {-3.0f, 2.5f, -0.1f, 0.0f, 4.2f, -100.0f, 12.0f, -0.0f};

    float* d_data;
    cudaMalloc(&d_data, N * sizeof(float));
    cudaMemcpy(d_data, h_data, N * sizeof(float), cudaMemcpyHostToDevice);

    relu_kernel<<<1, 256>>>(d_data, N);

    cudaMemcpy(h_data, d_data, N * sizeof(float), cudaMemcpyDeviceToHost);
    std::cout << "ReLU Outputs: ";
    for (int i = 0; i < N; ++i) std::cout << h_data[i] << " ";
    std::cout << "\\n";

    cudaFree(d_data);
    return 0;
}`,
      kernelExplanation: [
        'Line 7: fmaxf is a CUDA math intrinsic mapping directly to the GPU hardware floating-point max unit.',
        'Line 19: Kernel operates directly in-place on d_data, requiring zero extra memory allocations.',
        'Line 22: Negative numbers become 0.0f, while positive values remain unchanged.'
      ],
      commonPitfalls: [
        'Using std::max instead of fmaxf inside device code; std::max is not always a device intrinsic without proper headers.',
        'Using if (data[idx] < 0.0f) data[idx] = 0.0f; can introduce branch prediction overhead in mixed warps.'
      ],
      benchmarkingNotes: 'fmaxf executes with a throughput of 1 instruction per cycle per CUDA core.'
    },
    {
      id: 'ex_18_grid_stride_loops',
      exampleNumber: 18,
      difficulty: 'Intermediate',
      title: 'Ex 18: Production Grid-Stride Loops Pattern',
      subtitle: 'Writing scalable CUDA kernels that process arbitrary data sizes regardless of grid size',
      readTime: '15 min',
      prerequisites: ['Ex 17: ReLU Activation'],
      concepts: [
        'Grid-stride loop idiom: for (int i = idx; i < N; i += stride)',
        'Decoupling kernel grid size from dataset size N',
        'Hardware scalability across different GPUs (e.g. RTX 4090 vs A100)',
        'Enhanced L2 cache locality through thread reuse'
      ],
      cPlusPlusTheory: `In basic tutorials, developers launch exactly enough blocks so each thread processes one element.
In production libraries (like PyTorch and cuBLAS), kernels use Grid-Stride Loops:
'int stride = blockDim.x * gridDim.x;'
'for (int i = idx; i < N; i += stride) { ... }'
Benefits:
1. Reusability: A fixed grid can process 10,000 or 100,000,000 elements.
2. Portability: You never exceed hardware maximum grid dimensions.
3. Cache optimization: Threads reuse L1 cache lines sequentially.`,
      hardwareMechanics: `When data size N exceeds the number of concurrently active threads on the GPU, grid-stride loops allow threads to stride forward in lockstep.
Because threads in a warp stride by 'gridDim.x * blockDim.x' (a multiple of 32), memory accesses remain 100% coalesced on every iteration.`,
      kernelCode: `// Example 18: Production Grid-Stride Loop Elementwise Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void grid_stride_scale(float* data, float scale, int64_t N) {
    int64_t idx = blockIdx.x * blockDim.x + threadIdx.x;
    int64_t stride = blockDim.x * gridDim.x;

    // Grid-stride loop: each thread strides through the array
    for (int64_t i = idx; i < N; i += stride) {
        data[i] *= scale;
    }
}

int main() {
    int64_t N = 10000000; // 10 Million elements
    float* d_data;
    cudaMalloc(&d_data, N * sizeof(float));

    // Launch a fixed grid size regardless of N
    int threads = 256;
    int blocks = 128; // Only 32,768 threads processing 10,000,000 elements!

    grid_stride_scale<<<blocks, threads>>>(d_data, 1.5f, N);
    cudaDeviceSynchronize();

    cudaFree(d_data);
    std::cout << "Grid-stride kernel processed 10M elements with only 128 blocks!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Computes the total span (stride) of the entire grid.',
        'Line 9: Each thread processes index i, then jumps ahead by stride until i >= N.',
        'Line 20: Enables processing datasets far larger than total hardware thread capacity without launching millions of blocks.'
      ],
      commonPitfalls: [
        'Using 32-bit signed int for index i when N > 2^31 (2 billion elements); always use int64_t for large tensors.',
        'Forgetting that stride must be blockDim.x * gridDim.x.'
      ],
      benchmarkingNotes: 'Grid-stride loops consistently match or exceed monolithic one-thread-per-element launches while reducing launch overhead.'
    },
    {
      id: 'ex_19_2d_thread_indexing',
      exampleNumber: 19,
      difficulty: 'Intermediate',
      title: 'Ex 19: 2D Matrix Indexing (dim3 grid & block)',
      subtitle: 'Mapping threads to 2D matrices using row and col coordinates',
      readTime: '15 min',
      prerequisites: ['Ex 18: Grid-Stride Loops'],
      concepts: [
        'dim3 structure for multi-dimensional grid and block configurations',
        'Row and Column coordinate extraction: row = blockIdx.y * blockDim.y + threadIdx.y',
        'Row-major flat 1D memory offset: offset = row * width + col',
        '2D bounds checking'
      ],
      cPlusPlusTheory: `Linear algebra kernels operate on 2D matrices (height H, width W).
CUDA provides 'dim3' allowing 2D and 3D thread blocks:
'dim3 block(16, 16);' // 256 threads arranged in a 16x16 square
'dim3 grid((W + 15) / 16, (H + 15) / 16);'
Inside the kernel, threads calculate:
'int col = blockIdx.x * blockDim.x + threadIdx.x;'
'int row = blockIdx.y * blockDim.y + threadIdx.y;'
'int offset = row * W + col;'`,
      hardwareMechanics: `In hardware, threads in a block are ordered with 'threadIdx.x' varying fastest, then 'threadIdx.y', then 'threadIdx.z'.
Thread ID within warp = threadIdx.x + threadIdx.y * blockDim.x.
To ensure memory coalescing, always map the fastest-varying coordinate 'threadIdx.x' to the contiguous matrix columns ('col').`,
      kernelCode: `// Example 19: 2D Matrix Transpose Preparation Kernel
#include <iostream>
#include <cuda_runtime.h>

__global__ void matrix_add_2d(const float* A, const float* B, float* C, int H, int W) {
    int col = blockIdx.x * blockDim.x + threadIdx.x; // Fastest varying dimension
    int row = blockIdx.y * blockDim.y + threadIdx.y;

    if (row < H && col < W) {
        int idx = row * W + col; // Row-major flat offset
        C[idx] = A[idx] + B[idx];
    }
}

int main() {
    int H = 1024, W = 2048;
    dim3 block(32, 16); // 512 threads per block (32 along cols, 16 along rows)
    dim3 grid((W + block.x - 1) / block.x, (H + block.y - 1) / block.y);

    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, H * W * sizeof(float));
    cudaMalloc(&d_B, H * W * sizeof(float));
    cudaMalloc(&d_C, H * W * sizeof(float));

    matrix_add_2d<<<grid, block>>>(d_A, d_B, d_C, H, W);
    cudaDeviceSynchronize();

    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    std::cout << "2D Matrix Grid (" << grid.x << "x" << grid.y << ") executed!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: col maps to threadIdx.x (contiguous in memory).',
        'Line 6: row maps to threadIdx.y.',
        'Line 9: Translates 2D coordinates to 1D linear memory address.',
        'Line 16: dim3 block(32, 16) ensures threadIdx.x spans an entire 32-thread warp.'
      ],
      commonPitfalls: [
        'Swapping row and col (mapping col to y and row to x) destroys memory coalescing, dropping bandwidth by 85%.',
        'Forgetting 2D boundary checks when dimensions are not multiples of block sizes.'
      ],
      benchmarkingNotes: 'Block dimensions of 32x8 or 32x16 maximize warp coalescing along matrix rows.'
    },
    {
      id: 'ex_20_warp_divergence_basics',
      exampleNumber: 20,
      difficulty: 'Intermediate',
      title: 'Ex 20: Warp Divergence & SIMT Execution Penalties',
      subtitle: 'Understanding serialized execution branches within a 32-thread warp',
      readTime: '15 min',
      prerequisites: ['Ex 19: 2D Matrix Indexing'],
      concepts: [
        'SIMT (Single Instruction, Multiple Threads) architecture',
        'The 32-thread Warp execution unit',
        'Warp divergence: When threads within the same warp take different execution paths',
        'Execution serialization and inactive thread masking'
      ],
      cPlusPlusTheory: `The 32 threads in a warp share a single instruction fetch and dispatch unit.
If you write:
'if (threadIdx.x % 2 == 0) { do_A(); } else { do_B(); }'
Threads 0, 2, 4... take path A while threads 1, 3, 5... are disabled via hardware execution masks.
Then, path B is executed while threads 0, 2, 4... are disabled.
Both paths are executed sequentially, doubling execution time!`,
      hardwareMechanics: `Each warp has an Active Mask register.
During divergent branches, the warp executes the IF clause with some lanes masked OFF, then executes the ELSE clause with the other lanes masked OFF.
Only when branch divergence is avoided can all 32 ALUs in the SM issue instructions simultaneously.`,
      kernelCode: `// Example 20: Divergent vs Non-Divergent Branching Demonstration
#include <iostream>
#include <cuda_runtime.h>

// BAD: Diverges within every single warp (even/odd threads)
__global__ void divergent_kernel(float* out) {
    int tid = threadIdx.x;
    if (tid % 2 == 0) {
        out[tid] = 1.0f; // 16 threads execute, 16 stall
    } else {
        out[tid] = 2.0f; // 16 threads execute, 16 stall
    }
}

// GOOD: Branch is warp-aligned (entire warp takes the same branch)
__global__ void non_divergent_kernel(float* out) {
    int warp_id = threadIdx.x / 32;
    if (warp_id == 0) {
        out[threadIdx.x] = 1.0f; // All 32 threads in Warp 0 take this path
    } else {
        out[threadIdx.x] = 2.0f; // All 32 threads in Warp 1 take this path
    }
}

int main() {
    float* d_out;
    cudaMalloc(&d_out, 64 * sizeof(float));

    divergent_kernel<<<1, 64>>>(d_out);
    non_divergent_kernel<<<1, 64>>>(d_out);
    cudaDeviceSynchronize();

    cudaFree(d_out);
    std::cout << "Demonstrated Warp Divergence vs Warp-Aligned Branching\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 7: tid % 2 splits every 32-thread warp in half, forcing serialized execution.',
        'Line 18: warp_id = threadIdx.x / 32 aligns branch decisions to warp boundaries (32 threads).',
        'Line 20: Entire warp takes branch A or branch B together—zero divergence penalty.'
      ],
      commonPitfalls: [
        'Assuming divergence between different warps causes penalties. Divergence ONLY occurs when threads WITHIN the same warp diverge.',
        'Using heavy switch-case statements inside inner thread loops.'
      ],
      benchmarkingNotes: 'Warp divergence can reduce compute throughput by up to 50% for 2-way branches and up to 96% for 32-way branches.'
    },
    {
      id: 'ex_21_atomic_add',
      exampleNumber: 21,
      difficulty: 'Intermediate',
      title: 'Ex 21: Hardware Atomic Operations (atomicAdd)',
      subtitle: 'Thread-safe concurrent updates without data races in global memory',
      readTime: '15 min',
      prerequisites: ['Ex 20: Warp Divergence'],
      concepts: [
        'Data races: Multiple threads simultaneously writing to the same memory address',
        'Read-Modify-Write (RMW) race conditions',
        'atomicAdd hardware instructions in L2 cache',
        'Atomic contention and performance trade-offs'
      ],
      cPlusPlusTheory: `If 100,000 threads write '*out += 1.0f' at the exact same time:
1. Thread A reads 0.0.
2. Thread B reads 0.0 before A writes.
3. Both write 1.0. Final value is 1.0 instead of 2.0!
'atomicAdd(address, val)' executes the read, addition, and write as an indivisible hardware transaction, guaranteeing mathematical correctness.`,
      hardwareMechanics: `Since NVIDIA Kepler/Maxwell, atomicAdd on global memory is executed directly inside the GPU L2 Cache memory controllers without round-tripping to DRAM.
However, when thousands of threads hammer the same 4-byte address, the memory controller serializes the requests, creating an atomic bottleneck.`,
      kernelCode: `// Example 21: Parallel Histogram with Hardware atomicAdd
#include <iostream>
#include <cuda_runtime.h>

__global__ void histogram_atomic(const int* data, int* bins, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) {
        int bin_idx = data[idx];
        // Indivisible atomic increment in L2 cache
        atomicAdd(&bins[bin_idx], 1);
    }
}

int main() {
    const int N = 1000;
    int h_data[N];
    for (int i = 0; i < N; ++i) h_data[i] = i % 10; // Values 0-9

    int *d_data, *d_bins;
    cudaMalloc(&d_data, N * sizeof(int));
    cudaMalloc(&d_bins, 10 * sizeof(int));
    cudaMemset(d_bins, 0, 10 * sizeof(int));

    cudaMemcpy(d_data, h_data, N * sizeof(int), cudaMemcpyHostToDevice);
    histogram_atomic<<<(N + 255) / 256, 256>>>(d_data, d_bins, N);

    int h_bins[10];
    cudaMemcpy(h_bins, d_bins, 10 * sizeof(int), cudaMemcpyDeviceToHost);

    std::cout << "Bin[0] count: " << h_bins[0] << " (Expected: 100)\\n";

    cudaFree(d_data); cudaFree(d_bins);
    return 0;
}`,
      kernelExplanation: [
        'Line 9: atomicAdd locks the address in L2 cache, increments it, and releases the lock atomically.',
        'Line 21: cudaMemset initializes all 10 accumulator bins to 0.',
        'Line 28: Output confirms all 100 concurrent increments per bin succeeded with zero dropped updates.'
      ],
      commonPitfalls: [
        'Using atomicAdd for global sum reduction across all threads—this creates extreme memory contention. Use tree/warp reduction instead.',
        'Assuming atomicAdd supports all types on older GPUs (double atomicAdd requires compute capability >= 6.0).'
      ],
      benchmarkingNotes: 'Uncontended atomicAdd has almost zero overhead; heavy contention on a single address can slow down throughput by 50x.'
    },
    {
      id: 'ex_22_error_handling_macro',
      exampleNumber: 22,
      difficulty: 'Intermediate',
      title: 'Ex 22: Robust CUDA Error Checking (CUDA_CHECK Macro)',
      subtitle: 'Capturing synchronous launch errors and asynchronous kernel execution faults',
      readTime: '12 min',
      prerequisites: ['Ex 21: Atomic Operations'],
      concepts: [
        'cudaError_t return codes for API functions',
        'cudaGetLastError() vs cudaPeekAtLastError()',
        'Distinguishing launch-time errors from runtime execution faults',
        'Production CUDA_CHECK macro definition with __FILE__ and __LINE__'
      ],
      cPlusPlusTheory: `In production frameworks, every CUDA API call and kernel launch must be checked for errors.
Because kernels launch asynchronously, a kernel launch error (e.g., out-of-bounds memory access) might not manifest until the next API call or synchronization barrier.
A standard macro encapsulates error inspection, printing the file, line number, and error description before throwing or aborting.`,
      hardwareMechanics: `When an invalid memory address is accessed on the GPU, the MMU marks the CUDA context as corrupted ('cudaErrorIllegalAddress').
Subsequent CUDA API calls will fail immediately until the context is destroyed or reset.`,
      kernelCode: `// Example 22: Production CUDA_CHECK Error Handling Macro
#include <iostream>
#include <cstdlib>
#include <cuda_runtime.h>

#define CUDA_CHECK(call) \\
    do { \\
        cudaError_t err = call; \\
        if (err != cudaSuccess) { \\
            std::cerr << "CUDA Error at " << __FILE__ << ":" << __LINE__ \\
                      << " - " << cudaGetErrorString(err) << "\\n"; \\
            std::exit(EXIT_FAILURE); \\
        } \\
    } while (0)

#define CUDA_CHECK_LAST_ERROR() \\
    do { \\
        cudaError_t err = cudaGetLastError(); \\
        if (err != cudaSuccess) { \\
            std::cerr << "Kernel Launch Error at " << __FILE__ << ":" << __LINE__ \\
                      << " - " << cudaGetErrorString(err) << "\\n"; \\
            std::exit(EXIT_FAILURE); \\
        } \\
    } while (0)

int main() {
    float* d_ptr = nullptr;
    // Safely wrapped allocation
    CUDA_CHECK(cudaMalloc(&d_ptr, 1024 * sizeof(float)));
    CUDA_CHECK(cudaFree(d_ptr));

    std::cout << "All CUDA operations validated with zero errors!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: do { ... } while(0) ensures the macro expands safely inside if-else blocks without semicolon bugs.',
        'Line 9: __FILE__ and __LINE__ pinpoint the exact line in source code that failed.',
        'Line 16: CUDA_CHECK_LAST_ERROR catches errors from kernel launches with <<<>>> syntax.'
      ],
      commonPitfalls: [
        'Forgetting that cudaGetLastError() resets the error state; calling it twice in a row will return cudaSuccess on the second call.',
        'Relying solely on return codes without checking kernel execution errors.'
      ],
      benchmarkingNotes: 'cudaGetLastError() has negligible overhead (~10 ns) and should be called after critical kernel launches in debug builds.'
    },
    {
      id: 'ex_23_cuda_streams',
      exampleNumber: 23,
      difficulty: 'Advanced',
      title: 'Ex 23: Asynchronous CUDA Streams & Concurrency',
      subtitle: 'Overlapping host-device data transfers with kernel computation',
      readTime: '15 min',
      prerequisites: ['Ex 22: Error Checking Macro'],
      concepts: [
        'CUDA Streams as execution queues: Operations in different streams run concurrently',
        'Default stream (stream 0) vs non-blocking streams',
        'Pinned host memory (cudaMallocHost) required for asynchronous transfers',
        'cudaMemcpyAsync for zero-stall PCIe transfers'
      ],
      cPlusPlusTheory: `Modern GPUs feature independent hardware engines:
- 1 Compute Engine (SMs executing kernels)
- 2 Copy Engines (Copy Engine 0 for Host-to-Device, Copy Engine 1 for Device-to-Host)
By using multiple 'cudaStream_t' queues and pinned host memory, you can transfer batch N+1 over PCIe while the GPU is simultaneously computing batch N on its SMs!`,
      hardwareMechanics: `Standard pageable host memory (malloc) cannot be transferred via asynchronous DMA because the OS might page it out to disk.
cudaMallocHost allocates 'pinned' (page-locked) memory in physical RAM, allowing the PCIe DMA controller to transfer data without CPU intervention.`,
      kernelCode: `// Example 23: Overlapping PCIe Transfer & Compute with 2 Streams
#include <iostream>
#include <cuda_runtime.h>

__global__ void dummy_compute(float* data, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) data[idx] = sqrtf(data[idx]) * 2.0f;
}

int main() {
    const int N = 50000;
    const size_t bytes = N * sizeof(float);

    // Pinned host memory (page-locked)
    float *h_data;
    cudaMallocHost(&h_data, bytes * 2);

    float *d_data0, *d_data1;
    cudaMalloc(&d_data0, bytes);
    cudaMalloc(&d_data1, bytes);

    cudaStream_t stream0, stream1;
    cudaStreamCreate(&stream0);
    cudaStreamCreate(&stream1);

    // Pipeline: Stream 0 transfers & computes chunk 0, Stream 1 overlaps chunk 1
    cudaMemcpyAsync(d_data0, h_data, bytes, cudaMemcpyHostToDevice, stream0);
    dummy_compute<<<(N+255)/256, 256, 0, stream0>>>(d_data0, N);

    cudaMemcpyAsync(d_data1, h_data + N, bytes, cudaMemcpyHostToDevice, stream1);
    dummy_compute<<<(N+255)/256, 256, 0, stream1>>>(d_data1, N);

    cudaStreamSynchronize(stream0);
    cudaStreamSynchronize(stream1);

    std::cout << "Successfully overlapped compute and PCIe transfer across 2 streams!\\n";

    cudaStreamDestroy(stream0); cudaStreamDestroy(stream1);
    cudaFree(d_data0); cudaFree(d_data1);
    cudaFreeHost(h_data);
    return 0;
}`,
      kernelExplanation: [
        'Line 16: cudaMallocHost pins RAM pages so DMA hardware can stream data concurrently.',
        'Line 24: cudaStreamCreate creates two independent FIFO hardware queues.',
        'Line 28: Launches transfer and kernel on stream0, then immediately launches on stream1 without waiting.'
      ],
      commonPitfalls: [
        'Using pageable host memory (malloc) with cudaMemcpyAsync; this degrades to synchronous execution under the hood.',
        'Assuming operations in the same stream run concurrently; within a single stream, execution is strictly sequential.'
      ],
      benchmarkingNotes: 'Pipelining compute with PCIe transfers cuts end-to-end inference latency by up to 40% in production serving.'
    },
    {
      id: 'ex_24_cuda_events_benchmarking',
      exampleNumber: 24,
      difficulty: 'Advanced',
      title: 'Ex 24: Nanosecond GPU Profiling with CUDA Events',
      subtitle: 'Accurately measuring sub-microsecond kernel runtimes without CPU host timing bias',
      readTime: '12 min',
      prerequisites: ['Ex 23: CUDA Streams'],
      concepts: [
        'Why CPU timers (std::chrono) give inaccurate GPU timings due to async queues',
        'cudaEvent_t recorded directly inside the GPU hardware pipeline',
        'cudaEventRecord and cudaEventElapsedTime',
        'Computing effective memory bandwidth (GB/s)'
      ],
      cPlusPlusTheory: `Because kernel launches are asynchronous, wrapping 'kernel<<<>>>' with std::chrono::high_resolution_clock on the CPU measures the launch overhead, not the GPU execution time!
CUDA Events are hardware markers inserted directly into the GPU command stream. When the GPU reaches that point in execution, it records a high-precision hardware timestamp.`,
      hardwareMechanics: `GPU hardware timers run at fixed crystal oscillator frequencies (sub-nanosecond resolution).
cudaEventElapsedTime reads these hardware timestamps directly from the GPU timekeeper registers, providing microsecond accuracy unaffected by OS thread context switches.`,
      kernelCode: `// Example 24: Nanosecond GPU Kernel Benchmarking
#include <iostream>
#include <cuda_runtime.h>

__global__ void bench_kernel(float* data, int N) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) data[idx] = data[idx] * 1.001f + 0.002f;
}

int main() {
    const int N = 10000000;
    float* d_data;
    cudaMalloc(&d_data, N * sizeof(float));

    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    // Warm-up run
    bench_kernel<<<(N+255)/256, 256>>>(d_data, N);
    cudaDeviceSynchronize();

    // Benchmarked run
    cudaEventRecord(start);
    bench_kernel<<<(N+255)/256, 256>>>(d_data, N);
    cudaEventRecord(stop);

    cudaEventSynchronize(stop); // Wait until stop event is recorded

    float milliseconds = 0.0f;
    cudaEventElapsedTime(&milliseconds, start, stop);

    double bytes_accessed = static_cast<double>(N) * sizeof(float) * 2.0; // 1 read + 1 write
    double gb_per_sec = (bytes_accessed / (milliseconds * 1e-3)) / 1e9;

    std::cout << "Kernel Execution Time: " << milliseconds << " ms\\n";
    std::cout << "Effective Bandwidth:   " << gb_per_sec << " GB/s\\n";

    cudaEventDestroy(start); cudaEventDestroy(stop);
    cudaFree(d_data);
    return 0;
}`,
      kernelExplanation: [
        'Line 19: Warm-up run ensures GPU clocks are boosted from idle P-states before timing.',
        'Line 23: cudaEventRecord inserts a timestamp marker into the GPU hardware stream.',
        'Line 28: cudaEventElapsedTime computes elapsed time in milliseconds with 0.5 µs precision.',
        'Line 31: Calculates effective bandwidth based on total DRAM bytes transferred.'
      ],
      commonPitfalls: [
        'Measuring cold runs without a warm-up pass—the first launch incurs ~50 µs driver initialization overhead.',
        'Forgetting cudaEventSynchronize(stop) before calling cudaEventElapsedTime.'
      ],
      benchmarkingNotes: 'CUDA Events add zero CPU synchronization stalls during the timed region.'
    }
  ]
};
