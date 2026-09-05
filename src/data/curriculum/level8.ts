import { CurriculumLevel } from '../../types';

export const LEVEL_8: CurriculumLevel = {
  id: 'level_8',
  levelNumber: 8,
  title: 'Multi-GPU, NVLink & NCCL Distributed Systems',
  subtitle: 'Peer-to-Peer memory access, NVLink interconnects, NCCL AllReduce, and Megatron Tensor Parallelism',
  badge: 'Distributed Systems',
  iconName: 'Server',
  description: '8 progressive examples mastering multi-GPU scaling: cudaSetDevice, Peer-to-Peer direct DMA, 900 GB/s NVLink interconnects, NCCL Ring-AllReduce, and Tensor Parallelism.',
  topics: [
    {
      id: 'ex_85_multi_gpu_device_selection',
      exampleNumber: 85,
      difficulty: 'Beginner',
      title: 'Ex 85: Multi-GPU Management & cudaSetDevice Contexts',
      subtitle: 'Controlling multiple physical GPUs from a single host process',
      readTime: '12 min',
      prerequisites: ['Ex 77: Default vs Non-Default Streams'],
      concepts: [
        'cudaGetDeviceCount for discovering total physical GPUs',
        'cudaSetDevice: Switching the active GPU context for the calling host thread',
        'Thread-local device contexts in modern C++',
        'Multi-threaded host dispatch using std::jthread'
      ],
      cPlusPlusTheory: `Large AI models cannot fit on a single GPU.
Before coordinating inter-GPU communication, you must manage multiple devices from host code.
In CUDA runtime, each CPU thread has an 'active device ID':
- Calling 'cudaSetDevice(i)' sets device i as active for all subsequent allocations and kernel launches on that thread.
- Memory allocated on Device 0 cannot be read directly by Device 1 without enabling Peer-to-Peer access or explicit copies!`,
      hardwareMechanics: `Each GPU is an independent PCI or NVLink endpoint with its own dedicated VRAM and memory management unit.`,
      kernelCode: `// Example 85: Managing Multiple GPUs with C++ Threads
#include <iostream>
#include <vector>
#include <thread>
#include <cuda_runtime.h>

void worker_gpu_task(int device_id) {
    // Set active GPU for this specific CPU thread
    cudaSetDevice(device_id);

    float* d_buf;
    cudaMalloc(&d_buf, 1024 * sizeof(float));

    std::cout << "Thread managing Device " << device_id << " successfully allocated memory.\\n";
    cudaFree(d_buf);
}

int main() {
    int device_count = 0;
    cudaGetDeviceCount(&device_count);

    std::cout << "Total Available GPUs: " << device_count << "\\n";

    if (device_count < 2) {
        std::cout << "Running in single-GPU simulation mode.\\n";
        return 0;
    }

    // Launch worker thread per physical GPU
    std::vector<std::thread> threads;
    for (int i = 0; i < device_count; ++i) {
        threads.emplace_back(worker_gpu_task, i);
    }

    for (auto& t : threads) t.join();
    return 0;
}`,
      kernelExplanation: [
        'Line 9: cudaSetDevice(device_id) establishes the thread-local device context.',
        'Line 12: Allocates memory physically located inside Device device_id.',
        'Line 29: Spawns one CPU thread per physical GPU for concurrent host dispatch.'
      ],
      commonPitfalls: [
        'Forgetting that cudaSetDevice is per-thread; if you create a new std::thread, it defaults to Device 0!',
        'Dereferencing Device 0 pointer while Device 1 is active, causing invalid device pointer error.'
      ],
      benchmarkingNotes: 'Multi-threaded CPU dispatch eliminates host-side serialization across GPUs.'
    },
    {
      id: 'ex_86_peer_to_peer_access',
      exampleNumber: 86,
      difficulty: 'Intermediate',
      title: 'Ex 86: Peer-to-Peer (P2P) Direct Memory Access (DMA)',
      subtitle: 'Reading and writing another GPU VRAM directly over NVLink without CPU staging',
      readTime: '15 min',
      prerequisites: ['Ex 85: Multi-GPU Device Selection'],
      concepts: [
        'cudaDeviceCanAccessPeer: Checking hardware direct interconnect capability',
        'cudaDeviceEnablePeerAccess: Mapping another GPU VRAM into local virtual address space',
        'cudaMemcpyPeerAsync for direct GPU-to-GPU DMA copies',
        'Kernel direct dereferencing: A kernel on GPU 0 directly reading pointers located in GPU 1 VRAM'
      ],
      cPlusPlusTheory: `Without P2P:
Copying data from GPU 0 to GPU 1 requires:
GPU 0 -> PCIe -> System RAM (CPU) -> PCIe -> GPU 1 (two slow bus crossings!).
With Peer-to-Peer (P2P) Access:
1. Call 'cudaDeviceEnablePeerAccess(peer_device, 0)'.
2. The VRAM of GPU 1 is mapped directly into the address space of GPU 0.
3. GPU 0 can copy directly to GPU 1 via direct DMA over NVLink/PCIe without ever touching CPU RAM!
Even better: A kernel running on GPU 0 can directly dereference a pointer pointing to GPU 1 VRAM!`,
      hardwareMechanics: `NVLink bridges GPU memory controllers directly.
Direct P2P memory transactions bypass system memory channels entirely.`,
      kernelCode: `// Example 86: Enabling Peer-to-Peer Memory Access
#include <iostream>
#include <cuda_runtime.h>

int main() {
    int can_access = 0;
    cudaDeviceCanAccessPeer(&can_access, 0, 1);

    if (can_access) {
        // Activate GPU 0 and enable direct access to GPU 1
        cudaSetDevice(0);
        cudaDeviceEnablePeerAccess(1, 0);

        // Allocate memory on GPU 0 and GPU 1
        float *d_0, *d_1;
        cudaMalloc(&d_0, 1024 * sizeof(float));

        cudaSetDevice(1);
        cudaMalloc(&d_1, 1024 * sizeof(float));

        // Direct P2P Copy: GPU 0 -> NVLink -> GPU 1 (Bypasses CPU entirely!)
        cudaMemcpyPeerAsync(d_1, 1, d_0, 0, 1024 * sizeof(float));
        cudaDeviceSynchronize();

        std::cout << "Direct P2P DMA copy completed over NVLink without CPU memory staging!\\n";

        cudaFree(d_0); cudaFree(d_1);
    } else {
        std::cout << "P2P access between GPU 0 and GPU 1 is not supported on this topology.\\n";
    }
    return 0;
}`,
      kernelExplanation: [
        'Line 6: cudaDeviceCanAccessPeer queries whether physical interconnect supports P2P.',
        'Line 11: cudaDeviceEnablePeerAccess maps peer device memory directly.',
        'Line 21: cudaMemcpyPeerAsync streams data directly between GPUs at hardware bus speed.'
      ],
      commonPitfalls: [
        'P2P must be enabled symmetrically on both devices (0->1 and 1->0) for bidirectional direct kernel reads.',
        'Calling cudaDeviceEnablePeerAccess when devices are connected through conflicting PCIe switches.'
      ],
      benchmarkingNotes: 'NVLink P2P copies achieve 900 GB/s on H100—14x faster than PCIe Gen5.'
    },
    {
      id: 'ex_87_nvlink_vs_pcie_bandwidth',
      exampleNumber: 87,
      difficulty: 'Intermediate',
      title: 'Ex 87: NVLink 4.0 / 5.0 vs PCIe Gen5 Topologies & Bandwidth',
      subtitle: 'Why NVLink is non-negotiable for distributed LLM training (900 GB/s vs 64 GB/s)',
      readTime: '15 min',
      prerequisites: ['Ex 86: Peer-to-Peer Access'],
      concepts: [
        'PCIe Gen5 x16 bandwidth: ~64 GB/s bidirectional',
        'NVLink 4.0 (Hopper): 900 GB/s bidirectional (14x faster than PCIe)',
        'NVLink 5.0 (Blackwell): 1,800 GB/s bidirectional',
        'NVSwitch: Full all-to-all crossbar interconnect for 8-GPU servers (HGX H100)'
      ],
      cPlusPlusTheory: `In 8-GPU servers (such as NVIDIA HGX H100), GPUs are connected not just via PCIe, but through dedicated high-speed NVLink switches (NVSwitch).
- PCIe Gen5 x16 provides ~64 GB/s peak bandwidth.
- NVLink 4 provides 900 GB/s per GPU across 18 links.
Why does this matter?
In Tensor Parallelism (Megatron-LM), GPUs must exchange activations on EVERY SINGLE TRANSFORMER LAYER.
At 64 GB/s (PCIe), communication latency overwhelms computation, capping scaling efficiency at <20%.
At 900 GB/s (NVLink), communication finishes in sub-microseconds, achieving >90% linear scaling!`,
      hardwareMechanics: `NVSwitch provides an all-to-all non-blocking crossbar.
Any GPU can write to any other GPU's HBM at full 900 GB/s wire speed simultaneously.`,
      kernelCode: `// Example 87: Evaluating Distributed Interconnect Bandwidth
#include <iostream>

void analyze_comm_overhead(double transfer_mb, double bandwidth_gbs) {
    double transfer_gb = transfer_mb / 1024.0;
    double time_ms = (transfer_gb / bandwidth_gbs) * 1000.0;
    std::cout << "Transfer " << transfer_mb << " MB @ " << bandwidth_gbs 
              << " GB/s -> Latency: " << time_ms << " ms\\n";
}

int main() {
    double layer_activation_mb = 128.0; // 128 MB activation tensor in 70B LLM

    std::cout << "--- PCIe Gen5 Interconnect (64 GB/s) ---\\n";
    analyze_comm_overhead(layer_activation_mb, 64.0);

    std::cout << "\\n--- NVLink 4.0 Interconnect (900 GB/s) ---\\n";
    analyze_comm_overhead(layer_activation_mb, 900.0);

    std::cout << "\\nNVLink delivers an immediate 14x latency reduction for distributed LLM layers!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Computes wire transfer latency.',
        'Line 15: PCIe Gen5 takes 2.0 ms per layer—unusable for 80-layer models.',
        'Line 18: NVLink 4 takes only 0.14 ms per layer, enabling real-time scaling.'
      ],
      commonPitfalls: [
        'Running Tensor Parallelism across machines over standard Ethernet (requires InfiniBand/NVLink).',
        'Ignoring NUMA node affinity when dispatching multi-GPU workloads.'
      ],
      benchmarkingNotes: 'NVLink reduces inter-GPU communication latency from milliseconds to microseconds.'
    },
    {
      id: 'ex_88_nccl_initialization_allreduce',
      exampleNumber: 88,
      difficulty: 'Advanced',
      title: 'Ex 88: NVIDIA Collective Communications Library (NCCL) Fundamentals',
      subtitle: 'Initializing ncclCommInitRank and executing distributed ncclAllReduce',
      readTime: '15 min',
      prerequisites: ['Ex 87: NVLink vs PCIe'],
      concepts: [
        'NCCL (NVIDIA Collective Communications Library): Standard collective communications for GPUs',
        'Collective operations: AllReduce, AllGather, ReduceScatter, Broadcast',
        'ncclGetUniqueId: Exchanging synchronization ID across distributed ranks',
        'ncclAllReduce: Summing gradient tensors across all GPUs simultaneously'
      ],
      cPlusPlusTheory: `NCCL is the high-performance communication library powering PyTorch DDP, DeepSpeed, and Megatron-LM.
Unlike MPI (which routes data through CPU memory), NCCL uses CUDA-aware direct GPU-to-GPU transfers over NVLink and InfiniBand.
The most important collective operation in deep learning is AllReduce:
- Each of P GPUs starts with a gradient tensor G_i.
- After 'ncclAllReduce(sum)', EVERY GPU receives the exact elementwise sum: sum_{k=0}^{P-1} G_k!`,
      hardwareMechanics: `NCCL uses GPU SM threads to pump data directly through NVLink and GPUDirect RDMA network interfaces without CPU intervention.`,
      kernelCode: `// Example 88: Multi-GPU NCCL AllReduce in C++
#include <iostream>
#include <cuda_runtime.h>
#include <nccl.h>

int main() {
    const int num_gpus = 2;
    int devs[2] = {0, 1};

    // 1. Generate unique NCCL communication ID
    ncclUniqueId comm_id;
    ncclGetUniqueId(&comm_id);

    ncclComm_t comms[2];
    ncclCommInitAll(comms, num_gpus, devs);

    // 2. Perform AllReduce across both devices
    cudaStream_t streams[2];
    float *d_data[2];

    for (int i = 0; i < num_gpus; ++i) {
        cudaSetDevice(devs[i]);
        cudaStreamCreate(&streams[i]);
        cudaMalloc(&d_data[i], 1024 * sizeof(float));
    }

    // Begin NCCL Group: Co-schedules collective on both GPUs
    ncclGroupStart();
    for (int i = 0; i < num_gpus; ++i) {
        ncclAllReduce(
            d_data[i], d_data[i], 1024,
            ncclFloat, ncclSum,
            comms[i], streams[i]
        );
    }
    ncclGroupEnd();

    for (int i = 0; i < num_gpus; ++i) {
        cudaSetDevice(devs[i]);
        cudaStreamSynchronize(streams[i]);
        cudaFree(d_data[i]);
        ncclCommDestroy(comms[i]);
    }

    std::cout << "NCCL AllReduce successfully summed tensors across multiple GPUs!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 11: ncclGetUniqueId creates the unique identifier for the communication group.',
        'Line 14: ncclCommInitAll initializes the communication clique across devices.',
        'Line 27: ncclGroupStart batches collective launches to prevent deadlocks.',
        'Line 30: ncclAllReduce sums elements in-place with ncclSum.'
      ],
      commonPitfalls: [
        'Launching ncclAllReduce without ncclGroupStart/ncclGroupEnd when running from a single host thread, causing a deadlock.',
        'Mismatch in tensor size or data type across ranks.'
      ],
      benchmarkingNotes: 'NCCL AllReduce achieves >90% of theoretical physical interconnect bus bandwidth.'
    },
    {
      id: 'ex_89_ring_allreduce_algorithm',
      exampleNumber: 89,
      difficulty: 'Advanced',
      title: 'Ex 89: The Ring-AllReduce Algorithm Dissected',
      subtitle: 'Bandwidth-optimal distributed reduction in 2 * (P - 1) communication steps',
      readTime: '15 min',
      prerequisites: ['Ex 88: NCCL AllReduce'],
      concepts: [
        'Why naive master-worker reduction fails (bottlenecks the master GPU memory bus)',
        'Ring-AllReduce: Arranging P GPUs in a logical ring (GPU i sends to i+1)',
        'Phase 1: Reduce-Scatter (P - 1 steps to compute partial sums)',
        'Phase 2: All-Gather (P - 1 steps to broadcast completed sums)',
        'Total data transferred per GPU is strictly 2 * (P - 1) / P * N (independent of P!)'
      ],
      cPlusPlusTheory: `If 8 GPUs each send their 1 GB gradient tensor to GPU 0 to sum, GPU 0 must receive 7 GB and send 7 GB—a severe bottleneck!
Ring-AllReduce (Patarasuk & Yuan, 2009; popularized by Baidu & Horovod):
1. Slice the tensor into P equal chunks.
2. Arrange the P GPUs in a ring: GPU 0 -> GPU 1 -> GPU 2 ... -> GPU P-1 -> GPU 0.
3. Phase 1 (Reduce-Scatter): In P-1 steps, each GPU sends chunk k to its neighbor and receives/adds chunk k-1.
   After P-1 steps, each GPU holds the complete global sum of ONE chunk!
4. Phase 2 (All-Gather): In P-1 steps, each GPU passes its completed chunk around the ring.
   After P-1 steps, ALL GPUs hold the complete global sum of ALL chunks!
Remarkable property: The amount of data sent by each GPU is 2 * N * (P - 1) / P. As P increases, data per GPU approaches 2 * N—bandwidth utilization is 100% optimal and completely independent of cluster size!`,
      hardwareMechanics: `Every GPU sends and receives data simultaneously, keeping all NVLink / network wires at 100% saturation.`,
      kernelCode: `// Example 89: Mathematical Steps of Ring-AllReduce
#include <iostream>
#include <vector>

void simulate_ring_allreduce(int num_gpus, int tensor_size) {
    int chunk_size = tensor_size / num_gpus;
    int steps_reduce_scatter = num_gpus - 1;
    int steps_all_gather = num_gpus - 1;
    int total_steps = steps_reduce_scatter + steps_all_gather;

    double data_transferred = 2.0 * (num_gpus - 1) / num_gpus * tensor_size * sizeof(float);
    double mb = data_transferred / (1024.0 * 1024.0);

    std::cout << "Ring-AllReduce: " << num_gpus << " GPUs | Tensor Size: " << tensor_size << " floats\\n";
    std::cout << "Reduce-Scatter Steps: " << steps_reduce_scatter << "\\n";
    std::cout << "All-Gather Steps: " << steps_all_gather << "\\n";
    std::cout << "Total Communication Steps: " << total_steps << "\\n";
    std::cout << "Data Transferred per GPU: " << mb << " MB (Optimal!)\\n";
}

int main() {
    simulate_ring_allreduce(8, 268435456); // 1 GB tensor across 8 GPUs
    std::cout << "Ring-AllReduce is the theoretical bandwidth ceiling for distributed gradient sync!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Divides tensor into P equal chunks.',
        'Line 8: Total steps is strictly 2 * (P - 1).',
        'Line 10: Total data sent per GPU is independent of cluster size as P grows.',
        'Line 21: Used worldwide for training trillion-parameter models.'
      ],
      commonPitfalls: [
        'A single slow GPU (straggler) or dropped packet stalls the entire ring.',
        'For high GPU counts (e.g. 1,024 GPUs), ring latency scales linearly with P; Tree-AllReduce is preferred for small tensors.'
      ],
      benchmarkingNotes: 'Ring-AllReduce achieves >95% bandwidth efficiency for large gradient tensors (>64 MB).'
    },
    {
      id: 'ex_90_tensor_parallelism_megatron',
      exampleNumber: 90,
      difficulty: 'Expert',
      title: 'Ex 90: Megatron-LM Tensor Parallelism (TP) Architecture',
      subtitle: 'ColumnParallelLinear and RowParallelLinear with fused AllReduce',
      readTime: '15 min',
      prerequisites: ['Ex 89: Ring AllReduce'],
      concepts: [
        'When a single model layer cannot fit into GPU memory (e.g. 70B parameter models)',
        'Shoeybi et al. (Megatron-LM) 2-layer MLP decomposition',
        'ColumnParallelLinear: Splitting weight matrix W_1 along columns (no communication needed!)',
        'RowParallelLinear: Splitting weight matrix W_2 along rows (single AllReduce at the end!)',
        'Only 2 AllReduce operations per Transformer layer'
      ],
      cPlusPlusTheory: `How do you split a 2-layer MLP (Y = GeLU(X * W_1) * W_2) across 2 GPUs?
Naive split requires communication after every matmul and activation.
Megatron-LM breakthrough:
1. ColumnParallelLinear for Layer 1: Split W_1 into [W_11 | W_12] along columns.
   - GPU 0 computes: Y_1 = GeLU(X * W_11).
   - GPU 1 computes: Y_2 = GeLU(X * W_12).
   Notice: GeLU is elementwise, so NO INTER-GPU COMMUNICATION is needed!
2. RowParallelLinear for Layer 2: Split W_2 into [W_21; W_22] along rows.
   - GPU 0 computes: Z_1 = Y_1 * W_21.
   - GPU 1 computes: Z_2 = Y_2 * W_22.
   Notice that Z = Z_1 + Z_2.
3. Call a single AllReduce(Z_1 + Z_2)!
Result: An entire 2-layer MLP executes across multiple GPUs with only ONE communication step!`,
      hardwareMechanics: `The AllReduce is executed over 900 GB/s NVLink.
Communication is completely hidden or takes <2% of total layer compute time.`,
      kernelCode: `// Example 90: Megatron-LM Tensor Parallelism Blueprint
#include <iostream>

void megatron_mlp_tp_plan(int hidden_dim, int ffn_dim, int tp_size) {
    int split_ffn = ffn_dim / tp_size;
    std::cout << "=== Megatron-LM Tensor Parallelism Plan (TP=" << tp_size << ") ===\\n";
    std::cout << "Full MLP: Hidden=" << hidden_dim << " -> FFN=" << ffn_dim << "\\n";
    std::cout << "1. ColumnParallelLinear W1: Each GPU holds [" << hidden_dim << " x " << split_ffn << "]\\n";
    std::cout << "   -> Computes Y_local = GeLU(X * W1_local) (0 bytes communicated!)\\n";
    std::cout << "2. RowParallelLinear W2: Each GPU holds [" << split_ffn << " x " << hidden_dim << "]\\n";
    std::cout << "   -> Computes Z_local = Y_local * W2_local\\n";
    std::cout << "3. Final AllReduce: Sums Z_local across " << tp_size << " GPUs over NVLink!\\n";
}

int main() {
    megatron_mlp_tp_plan(8192, 28672, 8); // LLaMA-3 70B FFN split across 8 GPUs
    std::cout << "Megatron-LM achieves maximum parallelism with only 1 AllReduce per MLP block!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 7: Divides intermediate FFN dimension by TP size.',
        'Line 9: Column parallel layer requires ZERO inter-GPU communication because activation is elementwise.',
        'Line 11: Row parallel layer produces partial sums that are fused with a single AllReduce.'
      ],
      commonPitfalls: [
        'Splitting Layer 1 row-wise and Layer 2 column-wise, which forces 2 AllReduces instead of 1.',
        'Running TP size > 8 across PCIe or Ethernet without NVLink.'
      ],
      benchmarkingNotes: 'Allows serving LLaMA-3 70B with sub-10 millisecond token latency on an 8-GPU node.'
    },
    {
      id: 'ex_91_pipeline_parallelism_1f1b',
      exampleNumber: 91,
      difficulty: 'Expert',
      title: 'Ex 91: Pipeline Parallelism (PP) & 1F1B Scheduling',
      subtitle: 'Partitioning transformer layers across nodes with One-Forward-One-Backward schedule',
      readTime: '15 min',
      prerequisites: ['Ex 90: Tensor Parallelism Megatron'],
      concepts: [
        'Pipeline Parallelism: Placing Layer 0-19 on GPU 0, Layer 20-39 on GPU 1, etc.',
        'The Pipeline Bubble: Idle time while downstream GPUs wait for upstream activations',
        'Micro-batching: Splitting a batch of 64 into 16 micro-batches of size 4',
        '1F1B (One Forward, One Backward) schedule for steady-state memory capping'
      ],
      cPlusPlusTheory: `When a model is too large for a single node (e.g. 405B parameters), layers are split across nodes in a Pipeline (Pipeline Parallelism).
If you run a naive batch through the pipeline:
GPU 3 sits completely idle waiting for GPU 0, 1, and 2 to finish (the Pipeline Bubble)!
1F1B (One Forward, One Backward) scheduling:
1. Divide input batch into small micro-batches.
2. Warmup phase: Run forward passes to fill the pipeline.
3. Steady state: For every forward pass of micro-batch N, immediately run a backward pass of micro-batch N - k!
This keeps all GPUs 100% active and caps memory consumption because activations are freed immediately after backward passes!`,
      hardwareMechanics: `Activations and gradients are communicated asynchronously over network sockets (InfiniBand RDMA) using non-blocking send/recv.`,
      kernelCode: `// Example 91: 1F1B Pipeline Schedule Simulation
#include <iostream>

void analyze_pipeline_bubble(int num_stages, int num_microbatches) {
    // Bubble fraction formula: (num_stages - 1) / (num_microbatches + num_stages - 1)
    double bubble = static_cast<double>(num_stages - 1) / (num_microbatches + num_stages - 1);
    std::cout << "Stages (GPUs): " << num_stages 
              << " | Micro-batches: " << num_microbatches 
              << " | Pipeline Bubble Overhead: " << bubble * 100.0 << "%\\n";
}

int main() {
    analyze_pipeline_bubble(4, 4);   // 43% bubble (Too high!)
    analyze_pipeline_bubble(8, 32);  // 17.9% bubble
    analyze_pipeline_bubble(8, 64);  // 9.8% bubble (Highly efficient!)
    std::cout << "1F1B schedule bounds peak activation memory while minimizing idle bubble time!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Computes theoretical pipeline bubble fraction.',
        'Line 14: Shows that increasing micro-batches decreases bubble overhead to under 10%.'
      ],
      commonPitfalls: [
        'Using too few micro-batches, leading to a massive pipeline bubble where GPUs idle.',
        'Accumulating too many activations in memory during warmup, causing Out-Of-Memory errors.'
      ],
      benchmarkingNotes: '1F1B scheduling enables training 400B+ models across hundreds of nodes.'
    },
    {
      id: 'ex_92_zero_redundancy_optimizer',
      exampleNumber: 92,
      difficulty: 'Expert',
      title: 'Ex 92: ZeRO Memory Redundancy Partitioning (ZeRO-1, 2, 3)',
      subtitle: 'Eliminating duplicate optimizer states, gradients, and parameters across data-parallel ranks',
      readTime: '15 min',
      prerequisites: ['Ex 91: Pipeline Parallelism'],
      concepts: [
        'Standard Data Parallelism (DDP) duplicates everything (Model + Gradients + Optimizer States)',
        'For a 16-bit 70B model, Adam optimizer states consume 840 GB of VRAM!',
        'ZeRO-1: Sharding Optimizer States across ranks (4x memory reduction)',
        'ZeRO-2: Sharding Gradients across ranks (2x additional reduction)',
        'ZeRO-3: Sharding Model Parameters (linear memory reduction with zero redundancy)'
      ],
      cPlusPlusTheory: `In standard PyTorch DistributedDataParallel (DDP):
Every single GPU holds a complete copy of:
1. Model weights (FP16: 2 bytes/param)
2. Gradients (FP16: 2 bytes/param)
3. Adam optimizer states: FP32 master weights (4 bytes) + FP32 momentum (4 bytes) + FP32 variance (4 bytes) = 12 bytes/param!
Total: 16 bytes per parameter on EVERY GPU.
Rajbhandari et al. (ZeRO / DeepSpeed) recognized that this duplication is completely redundant:
- ZeRO-Stage 1: Shard optimizer states across P GPUs (saves 75% of memory).
- ZeRO-Stage 2: Shard gradients across P GPUs (saves another 50%).
- ZeRO-Stage 3: Shard weights across P GPUs; weights are fetched just-in-time via AllGather before forward/backward pass, and freed immediately after!
Enables training models of arbitrary size without model parallel refactoring!`,
      hardwareMechanics: `ZeRO-3 exchanges parameter partitions over NVLink/InfiniBand concurrently with compute using double-buffered prefetching.`,
      kernelCode: `// Example 92: ZeRO Memory Breakdown Calculator
#include <iostream>

void calculate_zero_footprint(long long params, int num_gpus) {
    double weights_gb = (params * 2.0) / (1024*1024*1024);
    double grads_gb   = (params * 2.0) / (1024*1024*1024);
    double adam_gb    = (params * 12.0) / (1024*1024*1024);
    double total_ddp_gb = weights_gb + grads_gb + adam_gb;

    double zero1_gb = weights_gb + grads_gb + (adam_gb / num_gpus);
    double zero2_gb = weights_gb + (grads_gb / num_gpus) + (adam_gb / num_gpus);
    double zero3_gb = (weights_gb / num_gpus) + (grads_gb / num_gpus) + (adam_gb / num_gpus);

    std::cout << "=== Memory Footprint for " << (params / 1e9) << "B Parameter Model ===\\n";
    std::cout << "Standard DDP per GPU: " << total_ddp_gb << " GB (Impossible on single GPU!)\\n";
    std::cout << "ZeRO-1 per GPU (" << num_gpus << " GPUs): " << zero1_gb << " GB\\n";
    std::cout << "ZeRO-2 per GPU (" << num_gpus << " GPUs): " << zero2_gb << " GB\\n";
    std::cout << "ZeRO-3 per GPU (" << num_gpus << " GPUs): " << zero3_gb << " GB (Fits easily!)\\n";
}

int main() {
    calculate_zero_footprint(70000000000LL, 8); // 70B parameter model across 8 GPUs
    std::cout << "ZeRO-3 shards weights, grads, and optimizer states with zero memory redundancy!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Standard Adam requires 16 bytes per parameter.',
        'Line 11: ZeRO-3 divides weights, gradients, and optimizer states equally across all GPUs.',
        'Line 20: 70B model requires 1,120 GB in standard DDP, but only 140 GB per GPU with ZeRO-3!'
      ],
      commonPitfalls: [
        'ZeRO-3 increases communication volume by 1.5x (AllGather in forward pass, ReduceScatter in backward pass).',
        'Failure to overlap ZeRO-3 weight prefetching with previous layer compute.'
      ],
      benchmarkingNotes: 'ZeRO-3 trains massive models on commodity clusters without complex model code changes.'
    }
  ]
};
