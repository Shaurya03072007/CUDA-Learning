import { CurriculumLevel } from '../../types';

export const LEVEL_0: CurriculumLevel = {
  id: 'level_0',
  levelNumber: 0,
  title: 'Modern C++20 Systems & Memory Foundations',
  subtitle: 'From zero to understanding raw byte memory, pointers, cache alignment, and custom allocators',
  badge: 'Foundation',
  iconName: 'Cpu',
  description: '12 progressive examples mastering C++20 pointers, memory addresses, virtual memory, memory alignment, RAII, move semantics, and cache lines.',
  topics: [
    {
      id: 'ex_1_pointer_deref',
      exampleNumber: 1,
      difficulty: 'Beginner',
      title: 'Ex 1: Raw Memory Addresses & Pointer Dereferencing',
      subtitle: 'Understanding 64-bit virtual memory addresses, value-at-address, and stack vs heap',
      readTime: '10 min',
      prerequisites: ['Basic variable declarations'],
      concepts: [
        'Memory as a contiguous array of 8-bit bytes with 64-bit numerical addresses',
        'Address-of operator (&) and dereference operator (*)',
        'Stack allocation (automatic lifetime) vs Heap allocation (manual lifetime)',
        'Null pointers (nullptr) vs dangling pointers'
      ],
      cPlusPlusTheory: `In C++, every variable occupies a contiguous range of bytes in physical/virtual memory.
A pointer is an unsigned 64-bit integer whose value is the starting memory address of another variable.
When dereferencing with '*ptr', the compiler determines how many bytes to read and how to interpret their bit pattern based on the type 'T*'.

In deep learning runtimes:
Tensors are not stored as scattered objects. A tensor is a thin metadata wrapper containing dimensions, strides, and a raw pointer pointing to a contiguous flat byte buffer.`,
      hardwareMechanics: `Modern x86_64 CPUs and NVIDIA GPUs use 64-bit virtual address spaces (typically 48 or 57 physical bits).
Dereferencing an invalid or unmapped address triggers a hardware Page Fault trapped by the OS kernel, resulting in a segmentation fault.
Accessing variables on the stack is extremely fast because stack memory is frequently hot in the L1 CPU data cache (L1d).`,
      kernelCode: `// Example 1: Demonstrating Raw Memory Addressing & Byte Offsets
#include <iostream>
#include <cstdint>

int main() {
    int32_t val = 42;
    int32_t* ptr = &val;

    std::cout << "Variable value: " << val << "\\n";
    std::cout << "Memory address: " << static_cast<void*>(ptr) << "\\n";
    std::cout << "Dereferenced:   " << *ptr << "\\n";

    // Modify memory directly through pointer
    *ptr = 100;
    std::cout << "Updated value:  " << val << "\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: Allocates 4 bytes on the execution stack holding the integer 42.',
        'Line 6: Stores the 64-bit memory address of val inside the pointer variable ptr.',
        'Line 9: Casts to void* so std::cout prints the hexadecimal memory address rather than interpreting it as a string.',
        'Line 10: Dereferences ptr with *, reading 4 bytes starting at that address.',
        'Line 13: Writes 100 directly into the memory location, updating val in place.'
      ],
      commonPitfalls: [
        'Dereferencing a nullptr or uninitialized pointer causes an immediate crash/segfault.',
        'Assuming sizeof(pointer) depends on the pointed-to type. All pointers on a 64-bit architecture are 8 bytes.'
      ],
      benchmarkingNotes: 'Dereferencing a hot L1 cache address takes ~1 ns (4 CPU clock cycles), while a DRAM cache miss takes 50-80 ns.'
    },
    {
      id: 'ex_2_pointer_arithmetic',
      exampleNumber: 2,
      difficulty: 'Beginner',
      title: 'Ex 2: Pointer Arithmetic & Stride Multipliers',
      subtitle: 'How ptr + n computes addresses by multiplying by sizeof(T)',
      readTime: '10 min',
      prerequisites: ['Ex 1: Raw Memory Addresses'],
      concepts: [
        'Pointer arithmetic automatically scales offsets by sizeof(T)',
        'Contiguous array traversal using pointers',
        'Relationship between array subscripts arr[i] and *(arr + i)',
        'Pointer subtraction (ptrdiff_t) to measure element distance'
      ],
      cPlusPlusTheory: `When you write 'ptr + n', the compiler emits an address calculation:
Effective Address = base_address + (n * sizeof(T)).
This fundamental arithmetic is how multidimensional tensor indexing is implemented:
offset = row * stride_row + col * stride_col.`,
      hardwareMechanics: `Modern CPUs and GPUs feature base-plus-scaled-index hardware addressing modes (e.g., [RAX + RCX*4]).
This allows pointer arithmetic with power-of-two data types (float=4, double=8) to execute in a single hardware clock cycle without explicit multiplication instructions.`,
      kernelCode: `// Example 2: Pointer Arithmetic & Contiguous Buffer Traversal
#include <iostream>
#include <cstddef>

int main() {
    float tensor_data[4] = {1.5f, 2.5f, 3.5f, 4.5f};
    float* fptr = tensor_data;

    for (int i = 0; i < 4; ++i) {
        std::cout << "Index " << i 
                  << " | Address: " << static_cast<void*>(fptr + i)
                  << " | Value: " << *(fptr + i) << "\\n";
    }

    // Pointer subtraction gives element count distance
    float* end_ptr = fptr + 4;
    std::ptrdiff_t dist = end_ptr - fptr;
    std::cout << "Element count between pointers: " << dist << "\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Allocates 16 contiguous bytes on the stack for 4 single-precision floats.',
        'Line 7: Decays array to a pointer to its first element.',
        'Line 10: (fptr + i) advances the address by i * 4 bytes.',
        'Line 17: Subtracting two pointers of the same type yields the number of elements (ptrdiff_t).'
      ],
      commonPitfalls: [
        'Performing pointer arithmetic on void* is illegal in ISO C++ because sizeof(void) is undefined.',
        'Off-by-one errors leading to reading memory past the allocated buffer bounds (buffer overflow).'
      ],
      benchmarkingNotes: 'Sequential contiguous pointer traversals trigger CPU/GPU hardware prefetchers, bringing memory into L1 before execution.'
    },
    {
      id: 'ex_3_heap_malloc_free',
      exampleNumber: 3,
      difficulty: 'Beginner',
      title: 'Ex 3: Heap Allocation & Dynamic Buffers',
      subtitle: 'Using malloc/free, new/delete, and managing dynamic tensor memory lifetimes',
      readTime: '12 min',
      prerequisites: ['Ex 2: Pointer Arithmetic'],
      concepts: [
        'Heap memory: Dynamically allocated at runtime with unrestricted scope',
        'malloc(bytes) vs new T[N]',
        'Memory leaks: Failing to return allocated memory to the operating system',
        'Double-free and use-after-free security vulnerabilities'
      ],
      cPlusPlusTheory: `Stack frames are destroyed when functions exit. To create persistent tensor storage whose shape is determined at runtime, we must allocate from the process heap.
In raw C/C++, 'malloc(size)' reserves uninitialized memory, while 'free(ptr)' releases it.
In modern C++, we never call raw malloc/free manually in high-level code; we encapsulate them in RAII structures.`,
      hardwareMechanics: `Heap allocation involves system calls (brk/mmap) or calls into a userspace heap allocator (ptmalloc, jemalloc).
These allocators maintain free-lists and locks, making allocation expensive (~100-500 nanoseconds per call).
This is why frameworks like PyTorch use custom caching allocators to avoid calling the OS allocator repeatedly.`,
      kernelCode: `// Example 3: Dynamic Heap Buffer Allocation & Cleanup
#include <iostream>
#include <cstdlib>

int main() {
    size_t num_elements = 1024;
    size_t bytes = num_elements * sizeof(float);

    // Allocate dynamic buffer on heap
    float* buffer = static_cast<float*>(std::malloc(bytes));
    if (!buffer) {
        std::cerr << "Out of memory!\\n";
        return 1;
    }

    // Initialize buffer
    for (size_t i = 0; i < num_elements; ++i) {
        buffer[i] = static_cast<float>(i) * 0.5f;
    }

    std::cout << "Buffer[0]: " << buffer[0] << ", Buffer[1023]: " << buffer[1023] << "\\n";

    // Release memory back to the OS
    std::free(buffer);
    buffer = nullptr; // Prevent dangling pointer usage

    return 0;
}`,
      kernelExplanation: [
        'Line 9: std::malloc reserves 4096 bytes (1024 * 4) on the heap and returns a void*.',
        'Line 10: Always check if the returned pointer is null to prevent null-dereference on OOM.',
        'Line 23: std::free marks the heap block as available for reuse.',
        'Line 24: Setting the pointer to nullptr ensures subsequent accidental dereferences fail cleanly.'
      ],
      commonPitfalls: [
        'Memory leaks occur when pointers lose reference before calling free(). In long training loops, this exhaust system RAM.',
        'Use-after-free: Accessing buffer[i] after free(buffer) results in undefined behavior.'
      ],
      benchmarkingNotes: 'Direct OS heap allocation is 50x slower than reusing an already allocated memory block from a memory pool.'
    },
    {
      id: 'ex_4_void_and_reinterpret_cast',
      exampleNumber: 4,
      difficulty: 'Beginner',
      title: 'Ex 4: Type Erasure with void* & reinterpret_cast',
      subtitle: 'How deep learning frameworks manage heterogeneous tensor data types (FP32, FP16, INT8)',
      readTime: '12 min',
      prerequisites: ['Ex 3: Heap Allocation'],
      concepts: [
        'void* as a generic raw memory address without type information',
        'reinterpret_cast to re-interpret raw byte streams into typed pointers',
        'Type erasure pattern used in PyTorch c10::DataPtr and StorageImpl',
        'Type safety risks and pointer aliasing rules'
      ],
      cPlusPlusTheory: `In a neural network framework, a Tensor Storage must be able to hold floats, half-precision floats, bfloat16, int8, or int32.
Rather than creating separate Storage classes for each type, the storage holds a raw 'void*' handle.
When an operation executes (e.g. GEMM), the runtime inspects the tensor's 'ScalarType' tag and casts the void* to 'float*' or '__half*'.`,
      hardwareMechanics: `At the silicon level, hardware registers and memory do not understand 'types'—they only store bit patterns (0s and 1s).
Whether 32 bits represent an integer 1065353216 or an IEEE 754 float 1.0f depends solely on which CPU/GPU ALU instruction is dispatched to process those bits.`,
      kernelCode: `// Example 4: Type-Erased Tensor Storage Handle
#include <iostream>
#include <cstdint>

enum class DType { FLOAT32, INT32 };

struct RawTensorBuffer {
    void* raw_data{nullptr};
    DType dtype;
    size_t count{0};
};

int main() {
    RawTensorBuffer buf;
    buf.dtype = DType::FLOAT32;
    buf.count = 4;
    buf.raw_data = new float[4]{10.0f, 20.0f, 30.0f, 40.0f};

    // Access based on runtime dtype tag
    if (buf.dtype == DType::FLOAT32) {
        float* f_ptr = reinterpret_cast<float*>(buf.raw_data);
        for (size_t i = 0; i < buf.count; ++i) {
            std::cout << "f[" << i << "] = " << f_ptr[i] << " ";
        }
        std::cout << "\\n";
    }

    delete[] reinterpret_cast<float*>(buf.raw_data);
    return 0;
}`,
      kernelExplanation: [
        'Line 8: void* holds the address of arbitrary memory without compiling type constraints.',
        'Line 21: reinterpret_cast instructs the compiler to treat the raw byte address as a float array.',
        'Line 28: Proper cleanup requires casting back to the original array type for delete[].'
      ],
      commonPitfalls: [
        'Casting memory allocated for float to int32_t* and modifying it may violate the C++ strict aliasing rule.',
        'Deleting void* is undefined behavior; the compiler cannot invoke destructors or calculate array sizes.'
      ],
      benchmarkingNotes: 'reinterpret_cast produces zero machine instructions—it is purely a compile-time type reinterpretation.'
    },
    {
      id: 'ex_5_raii_smart_pointers',
      exampleNumber: 5,
      difficulty: 'Beginner',
      title: 'Ex 5: RAII & Zero-Leak Smart Pointers (std::unique_ptr)',
      subtitle: 'Resource Acquisition Is Initialization (RAII) for deterministic memory reclamation',
      readTime: '15 min',
      prerequisites: ['Ex 4: Type Erasure'],
      concepts: [
        'RAII (Resource Acquisition Is Initialization) design pattern',
        'std::unique_ptr for exclusive, non-copyable resource ownership',
        'Custom deleters for managing CUDA device memory (cudaFree)',
        'std::shared_ptr for reference-counted graph tensor sharing'
      ],
      cPlusPlusTheory: `Manual memory management (new/delete) is error-prone when exceptions occur or functions return early.
RAII ties the lifetime of a resource to the lifetime of a stack object. When the stack object leaves scope, its destructor automatically frees the underlying resource.
'std::unique_ptr<T, Deleter>' encapsulates this with zero runtime overhead compared to a raw pointer.`,
      hardwareMechanics: `The C++ compiler generates deterministic destructor calls at every scope exit point (stack unwinding).
There is no background garbage collector thread pausing execution, which is why C++ maintains sub-microsecond latency guarantees essential for high-throughput AI serving.`,
      kernelCode: `// Example 5: RAII Buffer with Custom Deleter
#include <iostream>
#include <memory>

struct DummyGpuDeleter {
    void operator()(float* ptr) const {
        std::cout << "[RAII Destructor] Freeing allocated buffer at " << static_cast<void*>(ptr) << "\\n";
        delete[] ptr;
    }
};

void run_computation() {
    std::cout << "Entering function scope...\\n";
    std::unique_ptr<float[], DummyGpuDeleter> tensor_mem(new float[1024]);
    tensor_mem[0] = 3.14159f;
    std::cout << "Tensor value: " << tensor_mem[0] << "\\n";
    std::cout << "Exiting function scope (memory will automatically free)...\\n";
}

int main() {
    run_computation();
    std::cout << "Function finished cleanly with zero leaks!\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 5: DummyGpuDeleter defines a functor called when the smart pointer leaves scope.',
        'Line 14: std::unique_ptr acquires ownership of the allocated heap array.',
        'Line 15: Overloaded operator[] provides clean array indexing syntax identical to raw pointers.',
        'Line 17: When scope closes, tensor_mem destructor triggers DummyGpuDeleter deterministically.'
      ],
      commonPitfalls: [
        'Copying a std::unique_ptr causes a compile-time error; ownership must be moved using std::move().',
        'Using raw new without smart pointers leads to memory leaks whenever early returns or exceptions occur.'
      ],
      benchmarkingNotes: 'std::unique_ptr compiles to the exact same assembly as raw pointers—zero memory footprint overhead.'
    },
    {
      id: 'ex_6_move_semantics',
      exampleNumber: 6,
      difficulty: 'Intermediate',
      title: 'Ex 6: Move Semantics & Rvalue References (std::move)',
      subtitle: 'Eliminating expensive deep copies of gigabyte-scale tensors in memory',
      readTime: '15 min',
      prerequisites: ['Ex 5: RAII & Smart Pointers'],
      concepts: [
        'Lvalues (identifiable objects with names) vs Rvalues (temporary values)',
        'Rvalue references (T&&) and move constructors',
        'Stealing resource pointers instead of copying memory buffers',
        'std::move as a static cast to rvalue reference'
      ],
      cPlusPlusTheory: `If a 70B parameter model tensor takes 140 GB of RAM, copying that tensor byte-by-byte takes several seconds.
Move semantics allow a new tensor object to simply 'steal' the underlying pointer from a temporary tensor:
1. Copy the 8-byte pointer from source to destination.
2. Set the source pointer to nullptr so its destructor does not free the memory.
3. The 140 GB data remains untouched in memory, executing in ~1 nanosecond!`,
      hardwareMechanics: `Deep copying a 1 GB tensor requires reading 1 GB and writing 1 GB across the DDR5 memory bus (~30 ms).
Moving a tensor only modifies three 64-bit CPU registers (data pointer, size, strides), bypassing DRAM entirely.`,
      kernelCode: `// Example 6: Fast Move-Constructible Tensor Class
#include <iostream>
#include <utility>

class FastTensor {
public:
    float* data_{nullptr};
    size_t size_{0};

    explicit FastTensor(size_t size) : size_(size), data_(new float[size]) {
        std::cout << "[Allocated] " << size_ << " floats\\n";
    }

    ~FastTensor() {
        if (data_) {
            std::cout << "[Destroyed] Releasing buffer\\n";
            delete[] data_;
        }
    }

    // Move constructor: steal the pointer!
    FastTensor(FastTensor&& other) noexcept : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr; // Null out source so it doesn't double-free
        other.size_ = 0;
        std::cout << "[Moved] Pointer stolen in O(1) time\\n";
    }

    // Disable expensive copy constructor
    FastTensor(const FastTensor&) = delete;
    FastTensor& operator=(const FastTensor&) = delete;
};

int main() {
    FastTensor t1(1000000); // 1 Million floats
    FastTensor t2 = std::move(t1); // Instant move without copy

    std::cout << "t1 data pointer: " << static_cast<void*>(t1.data_) << " (null)\\n";
    std::cout << "t2 data pointer: " << static_cast<void*>(t2.data_) << " (valid)\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 20: FastTensor&& defines a move constructor accepting an rvalue reference.',
        'Line 21: Copies the 8-byte pointer and size without allocating new heap memory.',
        'Line 22: Sets other.data_ = nullptr to prevent double-free when other is destroyed.',
        'Line 27: Explicitly deletes copy constructors to protect against accidental gigabyte tensor copies.'
      ],
      commonPitfalls: [
        'Accessing an object after moving from it is valid C++, but its internal state is empty (data_ is null).',
        'Forgetting noexcept on move constructors prevents std::vector from using them during reallocations.'
      ],
      benchmarkingNotes: 'Moving a 10 GB tensor takes 1.2 nanoseconds. Deep-copying it takes ~150 milliseconds on PCIe Gen4.'
    },
    {
      id: 'ex_7_struct_padding_cachelines',
      exampleNumber: 7,
      difficulty: 'Intermediate',
      title: 'Ex 7: Struct Layout, Padding & 64-Byte Cache Lines',
      subtitle: 'Understanding CPU memory alignment, structure padding, and cache alignment',
      readTime: '15 min',
      prerequisites: ['Ex 6: Move Semantics'],
      concepts: [
        'Hardware memory alignment rules: N-byte data types must align to N-byte addresses',
        'Compiler padding bytes introduced inside structs',
        '64-byte CPU cache lines (L1, L2, L3 cache units)',
        'Re-ordering struct members to minimize memory footprint'
      ],
      cPlusPlusTheory: `CPUs do not read single bytes from main memory; they fetch memory in fixed 64-byte blocks called cache lines.
If a 64-bit pointer is placed at an odd address, reading it requires two memory bus transactions instead of one.
To prevent this, C++ compilers automatically insert invisible 'padding bytes' between struct members to align each member to its natural boundary.`,
      hardwareMechanics: `When reading from DRAM, the hardware memory controller fetches an entire 64-byte cache line into the L3/L2/L1 data caches.
If your data structure is bloated with padding, cache lines store useless zeroes instead of tensor data, effectively reducing your CPU cache capacity by 30-50%.`,
      kernelCode: `// Example 7: Structure Padding & Alignment Optimization
#include <iostream>
#include <cstdint>

// Bad layout: 24 bytes due to padding
struct BadTensorHeader {
    uint8_t  device_id;  // 1 byte (+ 7 bytes padding)
    double*  data_ptr;   // 8 bytes (must align to 8-byte boundary)
    uint8_t  dtype;      // 1 byte (+ 7 bytes padding)
};

// Optimized layout: 16 bytes (ordered by descending size)
struct GoodTensorHeader {
    double*  data_ptr;   // 8 bytes
    uint8_t  device_id;  // 1 byte
    uint8_t  dtype;      // 1 byte (+ 6 bytes tail padding)
};

int main() {
    std::cout << "sizeof(BadTensorHeader):  " << sizeof(BadTensorHeader) << " bytes\\n";
    std::cout << "sizeof(GoodTensorHeader): " << sizeof(GoodTensorHeader) << " bytes\\n";
    std::cout << "Memory saved per header:  " << sizeof(BadTensorHeader) - sizeof(GoodTensorHeader) << " bytes\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: uint8_t is followed by 7 invisible padding bytes so double* data_ptr starts on an 8-byte boundary.',
        'Line 13: GoodTensorHeader orders fields by descending alignment, reducing total footprint by 33%.',
        'Line 20: In a graph with millions of tensor nodes, this optimization saves tens of megabytes of L3 cache.'
      ],
      commonPitfalls: [
        'Using #pragma pack(1) disables padding but causes CPU alignment faults and massive performance slowdowns.',
        'Assuming struct size equals the mathematical sum of its member sizes.'
      ],
      benchmarkingNotes: 'Cache-compact data structures exhibit up to 2.4x higher throughput in graph traversal benchmarks.'
    },
    {
      id: 'ex_8_false_sharing',
      exampleNumber: 8,
      difficulty: 'Intermediate',
      title: 'Ex 8: False Sharing & Multi-Core Cache Invalidation',
      subtitle: 'Eliminating multi-threaded pipeline stalls using alignas(64) cache-line isolation',
      readTime: '15 min',
      prerequisites: ['Ex 7: Struct Layout'],
      concepts: [
        'MESI cache coherence protocol (Modified, Exclusive, Shared, Invalid)',
        'False Sharing: Independent threads modifying adjacent variables in the same cache line',
        'Cache bouncing: Rapid invalidation of L1/L2 caches across CPU cores',
        'alignas(64) or std::hardware_destructive_interference_size'
      ],
      cPlusPlusTheory: `When two threads running on different CPU cores modify two different variables that happen to sit inside the same 64-byte cache line:
1. Core 0 modifies variable A -> Core 0 marks the entire cache line as Modified (M).
2. Core 1 tries to read/write variable B -> its local copy is Invalidated (I).
3. Core 1 must stall while the line is transferred over the inter-core interconnect.
This creates catastrophic performance degradation even though the threads share no actual data!`,
      hardwareMechanics: `The MESI/MOESI hardware coherence protocol operates at cache-line granularity (64 bytes), not individual variable granularity.
To prevent false sharing, parallel worker counters and thread-local state must be padded to 64-byte boundaries.`,
      kernelCode: `// Example 8: Eliminating False Sharing with alignas(64)
#include <iostream>
#include <new>

// BAD: Counters share the same 64-byte cache line
struct FalseSharingCounters {
    uint64_t thread_0_ops; // 8 bytes
    uint64_t thread_1_ops; // 8 bytes (shares line with thread 0!)
};

// GOOD: Each counter isolated to its own distinct 64-byte cache line
struct AlignedCounters {
    alignas(64) uint64_t thread_0_ops; // 8 bytes + 56 bytes padding
    alignas(64) uint64_t thread_1_ops; // Isolated in next cache line
};

int main() {
    std::cout << "FalseSharingCounters size: " << sizeof(FalseSharingCounters) << " bytes\\n";
    std::cout << "AlignedCounters size:      " << sizeof(AlignedCounters) << " bytes\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 6: Both 64-bit integers reside in the same 64-byte cache line, causing constant MESI invalidation during parallel increments.',
        'Line 12: alignas(64) forces the compiler to pad each variable so it begins on a 64-byte boundary.',
        'Line 19: AlignedCounters is 128 bytes, ensuring two threads on separate cores never invalidate each other.'
      ],
      commonPitfalls: [
        'Creating an array of thread-local accumulators ' + 'uint64_t sums[NUM_THREADS]' + ' without padding creates severe false sharing.',
        'Excessive padding on single-threaded data bloats cache usage unnecessarily.'
      ],
      benchmarkingNotes: 'Fixing false sharing in parallel thread pools often yields an immediate 8x to 15x speedup on 16-core CPUs.'
    },
    {
      id: 'ex_9_aligned_allocations',
      exampleNumber: 9,
      difficulty: 'Intermediate',
      title: 'Ex 9: 64-Byte & 128-Byte Aligned Allocations',
      subtitle: 'Using posix_memalign and std::aligned_alloc for vectorized SIMD and DMA transfers',
      readTime: '15 min',
      prerequisites: ['Ex 8: False Sharing'],
      concepts: [
        'Standard malloc only guarantees 8 or 16-byte alignment',
        'posix_memalign and std::aligned_alloc for 64-byte (AVX-512) and 128-byte (GPU DMA) alignment',
        'Proper deallocation of aligned memory (free vs _aligned_free on Windows)',
        'Ensuring vectorized load instructions (vmovaps) do not fault'
      ],
      cPlusPlusTheory: `SIMD instructions (like AVX-512 on CPUs and vectorized loads on GPUs) require memory pointers to be aligned to powers of two (64 bytes or 128 bytes).
If an unaligned pointer is passed to an aligned load instruction (e.g. '_mm512_load_ps'), the CPU hardware generates a General Protection Fault (#GP) and crashes the process.`,
      hardwareMechanics: `Modern PCIe DMA engines transfer data between CPU host RAM and GPU VRAM in aligned chunks.
When host buffers are aligned to 64 or 4096-byte page boundaries, the PCIe controller transfers data directly via bus master DMA without intermediate bounce buffers.`,
      kernelCode: `// Example 9: Custom Aligned Memory Allocator
#include <iostream>
#include <cstdlib>
#include <cstdint>

template <typename T, size_t Alignment = 64>
class AlignedMemory {
public:
    T* ptr_{nullptr};
    size_t count_{0};

    explicit AlignedMemory(size_t count) : count_(count) {
        size_t bytes = count * sizeof(T);
        void* raw_ptr = nullptr;
        // Allocate memory aligned to 'Alignment' bytes
        if (posix_memalign(&raw_ptr, Alignment, bytes) != 0) {
            throw std::bad_alloc();
        }
        ptr_ = static_cast<T*>(raw_ptr);
    }

    ~AlignedMemory() {
        if (ptr_) {
            std::free(ptr_);
        }
    }

    // Check if pointer is aligned to N bytes
    bool is_aligned() const {
        return (reinterpret_cast<uintptr_t>(ptr_) % Alignment) == 0;
    }
};

int main() {
    AlignedMemory<float, 64> tensor(1024);
    std::cout << "Pointer: " << static_cast<void*>(tensor.ptr_) << "\\n";
    std::cout << "Aligned to 64 bytes? " << (tensor.is_aligned() ? "YES" : "NO") << "\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 15: posix_memalign guarantees the returned address is an exact multiple of Alignment bytes.',
        'Line 30: uintptr_t converts the pointer to an integer for modulo bitwise alignment checking.',
        'Line 35: Confirms that the pointer ends in 0x00, 0x40, 0x80, or 0xC0 (multiples of 64).'
      ],
      commonPitfalls: [
        'std::aligned_alloc requires the byte size to be an exact integer multiple of the alignment parameter.',
        'Forgetting that aligned memory on Windows requires _aligned_malloc and _aligned_free.'
      ],
      benchmarkingNotes: 'Aligned AVX-512 loads run with zero penalty; unaligned loads crossing page boundaries stall for ~20 cycles.'
    },
    {
      id: 'ex_10_std_span_memory_views',
      exampleNumber: 10,
      difficulty: 'Intermediate',
      title: 'Ex 10: Zero-Copy Memory Views with std::span (C++20)',
      subtitle: 'Passing contiguous tensor slices without copying or taking ownership',
      readTime: '12 min',
      prerequisites: ['Ex 9: Aligned Allocations'],
      concepts: [
        'Non-owning views: Pointer + length pairs',
        'std::span<T> introduced in C++20 for bounds-safe buffer viewing',
        'Implementing tensor slicing (tensor[10:20]) with zero memory allocation',
        'Dynamic extent vs static extent'
      ],
      cPlusPlusTheory: `When you slice a tensor in PyTorch (e.g. 'y = x[0:100]'), PyTorch does not allocate a new 100-element array.
It returns a view sharing the underlying storage pointer with an updated offset and size.
In modern C++20, 'std::span<T>' standardizes non-owning memory views, replacing raw pointer + size function argument pairs.`,
      hardwareMechanics: `std::span consists of exactly two 64-bit words: a data pointer and an element count (16 bytes total).
When passed to functions, both 64-bit words fit directly inside two CPU registers (RDI and RSI on x86_64), passing arguments with zero stack writes.`,
      kernelCode: `// Example 10: Zero-Copy Tensor Slicing with C++20 std::span
#include <iostream>
#include <span>
#include <vector>

void print_tensor_slice(std::span<const float> slice) {
    std::cout << "Slice elements (" << slice.size() << "): ";
    for (float val : slice) {
        std::cout << val << " ";
    }
    std::cout << "\\n";
}

int main() {
    std::vector<float> tensor = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f, 8.0f};

    // Create a zero-copy slice of elements 2 to 5
    std::span<const float> sub_view(tensor.data() + 2, 4);
    print_tensor_slice(sub_view);

    return 0;
}`,
      kernelExplanation: [
        'Line 6: std::span<const float> accepts any contiguous float buffer (std::vector, C-array, raw pointer).',
        'Line 16: sub_view points directly into tensor memory without copying a single byte.',
        'Line 17: print_tensor_slice iterates safely over the sub-range using slice.size().'
      ],
      commonPitfalls: [
        'Dangling view: If the underlying std::vector is resized or destroyed, the std::span pointer becomes invalid.',
        'Assuming std::span can represent non-contiguous strides; span only represents contiguous memory.'
      ],
      benchmarkingNotes: 'Calling functions with std::span is identical in speed to passing raw pointers, but gives bounds safety in debug builds.'
    },
    {
      id: 'ex_11_contiguous_strides',
      exampleNumber: 11,
      difficulty: 'Intermediate',
      title: 'Ex 11: Multidimensional Tensor Strides & Row-Major Math',
      subtitle: 'Mapping N-dimensional indices (B, S, H, D) to a 1D flat memory address',
      readTime: '15 min',
      prerequisites: ['Ex 10: std::span Memory Views'],
      concepts: [
        'Row-major (C-style) vs Column-major (Fortran) memory ordering',
        'Stride computation: stride[i] = product(shape[i+1:])',
        'Offset formula: offset = sum(index[d] * stride[d])',
        'Contiguous vs non-contiguous tensor layout after transpose()'
      ],
      cPlusPlusTheory: `Physical RAM and GPU HBM are strictly 1-dimensional arrays of bytes.
To store a 4D Transformer tensor with shape [Batch=2, Seq=128, Heads=12, Dim=64], we compute strides:
- stride[3] = 1
- stride[2] = Dim = 64
- stride[1] = Heads * Dim = 12 * 64 = 768
- stride[0] = Seq * Heads * Dim = 128 * 768 = 98304
When transposing dimensions, we do not move data—we simply swap the stride values!`,
      hardwareMechanics: `Contiguous memory reads along the fastest-changing dimension (stride = 1) allow GPU warps to coalesce memory accesses into a single 32-byte bus transaction.
Transposed tensors with stride > 1 cause scattered, uncoalesced memory reads that throttle throughput by 10x unless a contiguous copy is performed.`,
      kernelCode: `// Example 11: N-Dimensional Stride-to-Offset Translation Engine
#include <iostream>
#include <vector>
#include <numeric>

class TensorViewND {
public:
    std::vector<int64_t> shape;
    std::vector<int64_t> strides;

    explicit TensorViewND(std::vector<int64_t> s) : shape(std::move(s)), strides(shape.size()) {
        compute_contiguous_strides();
    }

    void compute_contiguous_strides() {
        int64_t acc = 1;
        for (int i = static_cast<int>(shape.size()) - 1; i >= 0; --i) {
            strides[i] = acc;
            acc *= shape[i];
        }
    }

    int64_t get_offset(const std::vector<int64_t>& indices) const {
        int64_t offset = 0;
        for (size_t d = 0; d < indices.size(); ++d) {
            offset += indices[d] * strides[d];
        }
        return offset;
    }
};

int main() {
    // 3D Tensor: [Batch=2, Rows=3, Cols=4]
    TensorViewND t({2, 3, 4});
    std::cout << "Strides: [" << t.strides[0] << ", " << t.strides[1] << ", " << t.strides[2] << "]\\n";

    // Compute memory offset for element [1, 2, 3]
    int64_t offset = t.get_offset({1, 2, 3});
    std::cout << "Flat 1D memory offset for [1, 2, 3]: " << offset << " (Expected: 23)\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 16: Computes row-major strides from right to left using cumulative multiplication.',
        'Line 24: Inner loop multiplies each coordinate index by its corresponding dimension stride.',
        'Line 38: Index [1, 2, 3] -> 1*12 + 2*4 + 3*1 = 23. This is the exact memory index passed to GPU kernels.'
      ],
      commonPitfalls: [
        'Assuming a transposed tensor is contiguous. Calling data_ptr() on non-contiguous tensors yields incorrect results.',
        'Failing to handle negative strides when slicing with negative steps (e.g. reverse ordering).'
      ],
      benchmarkingNotes: 'Strided index computation inside innermost GPU loops can be expensive; unrolling or flattening to 1D loops is preferred.'
    },
    {
      id: 'ex_12_arena_allocator',
      exampleNumber: 12,
      difficulty: 'Advanced',
      title: 'Ex 12: High-Speed Linear Arena Allocator',
      subtitle: 'Allocating gigabytes of temporary buffers in O(1) time without OS syscalls',
      readTime: '15 min',
      prerequisites: ['Ex 11: Tensor Strides'],
      concepts: [
        'Arena / Bump allocator pattern: Pointer bump in O(1) time',
        'Zero per-allocation overhead and zero fragmentation',
        'Batch reset: Freeing thousands of temporary allocations in a single instruction',
        'Memory alignment enforcement within an arena buffer'
      ],
      cPlusPlusTheory: `During a forward neural network pass, thousands of intermediate activation tensors are created and destroyed.
Calling malloc/free for each intermediate tensor produces severe heap fragmentation and CPU lock contention.
An Arena Allocator pre-allocates a massive contiguous block of memory (e.g., 2 GB) once. Every allocation simply advances an internal offset pointer ('bump allocation').
At the end of the forward pass, resetting the offset to 0 frees everything instantly!`,
      hardwareMechanics: `An arena bump allocation is just a pointer increment: 'current_ptr += size'.
This translates to a single CPU ADD instruction (~0.3 nanoseconds), completely bypassing OS page tables, kernel locks, and free-list traversals.`,
      kernelCode: `// Example 12: High-Performance Bump Arena Allocator
#include <iostream>
#include <cstdint>
#include <cstddef>

class LinearArena {
private:
    char* buffer_{nullptr};
    size_t capacity_{0};
    size_t offset_{0};

public:
    explicit LinearArena(size_t capacity) 
        : capacity_(capacity), buffer_(new char[capacity]) {}

    ~LinearArena() { delete[] buffer_; }

    void* allocate(size_t bytes, size_t alignment = 64) {
        // Align the current offset to 'alignment'
        size_t current_addr = reinterpret_cast<size_t>(buffer_ + offset_);
        size_t padding = (alignment - (current_addr % alignment)) % alignment;

        if (offset_ + padding + bytes > capacity_) {
            throw std::bad_alloc(); // Arena out of capacity
        }

        offset_ += padding;
        void* allocated_ptr = buffer_ + offset_;
        offset_ += bytes;
        return allocated_ptr;
    }

    void reset() {
        offset_ = 0; // O(1) instant reclamation of all allocations!
    }

    size_t used_bytes() const { return offset_; }
};

int main() {
    LinearArena arena(1024 * 1024); // 1 MB Arena

    float* t1 = static_cast<float*>(arena.allocate(100 * sizeof(float)));
    float* t2 = static_cast<float*>(arena.allocate(200 * sizeof(float)));
    std::cout << "Arena allocated 300 floats. Current offset: " << arena.used_bytes() << " bytes\\n";

    // Instant O(1) teardown of all allocated tensors
    arena.reset();
    std::cout << "After reset(), used bytes: " << arena.used_bytes() << "\\n";
    return 0;
}`,
      kernelExplanation: [
        'Line 20: Computes alignment padding so every allocated buffer starts on a 64-byte boundary.',
        'Line 28: Simply advances offset_ by the requested bytes—no searching through free lists.',
        'Line 33: reset() sets offset_ = 0, instantly reclaiming all memory for the next training iteration.'
      ],
      commonPitfalls: [
        'Individual buffers cannot be freed independently in a bump arena; everything must be cleared together with reset().',
        'Objects requiring C++ destructors cannot be allocated via pure bump allocator without tracking destruction lists.'
      ],
      benchmarkingNotes: 'Arena allocations take ~0.4 ns vs 120 ns for malloc—a 300x speedup for transient tensor activations.'
    }
  ]
};
