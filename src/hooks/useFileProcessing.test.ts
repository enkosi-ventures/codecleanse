import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileProcessing } from './useFileProcessing';
import { AppConfig, AnalysisResult, ProcessedData, ProcessableFile } from '../types';

// --- Mocking useWorkerManager ---
// Store mock functions globally in the test file scope
let mockPostTask: ReturnType<typeof vi.fn>;
let mockOnMessage: ReturnType<typeof vi.fn>;
let mockOnError: ReturnType<typeof vi.fn>;
let mockIsWorkerReady: boolean;
let workerMessageHandlers: Map<string, (payload: any) => void>;
let workerErrorHandlers: Set<(error: string) => void>;

vi.mock('./useWorkerManager', () => {
  // Initialize mocks within the factory function
  mockPostTask = vi.fn();
  mockOnMessage = vi.fn((type, handler) => {
    workerMessageHandlers.set(type, handler);
    // Return cleanup function
    return () => workerMessageHandlers.delete(type);
  });
  mockOnError = vi.fn((handler) => {
    workerErrorHandlers.add(handler);
    // Return cleanup function
    return () => workerErrorHandlers.delete(handler);
  });

  return {
    useWorkerManager: () => ({
      postTask: mockPostTask,
      onMessage: mockOnMessage,
      onError: mockOnError,
      isWorkerReady: mockIsWorkerReady, // Use the global variable
      workerError: null, // Keep it simple for now, can be made dynamic if needed
    }),
  };
});

// Helper to simulate receiving a message from the worker
const simulateWorkerMessage = (type: string, payload: any) => {
  const handler = workerMessageHandlers.get(type);
  if (handler) {
    act(() => {
      handler(payload);
    });
  } else {
    console.warn(`Test Warning: No handler registered for simulated message type: ${type}`);
  }
};

// Helper to simulate worker error
const simulateWorkerError = (errorMessage: string) => {
  act(() => {
    workerErrorHandlers.forEach(handler => handler(errorMessage));
  });
};


// Helper function to create mock File objects
const createMockDomFile = (name: string, content = 'content', type = 'text/plain'): File => {
  const file = new File([content], name, { type });
  // Add the non-standard webkitRelativePath for testing
  Object.defineProperty(file, 'webkitRelativePath', {
    value: name,
    writable: false,
  });
  return file;
};

const createMockProcessableFile = (
  relativePath: string,
  include: boolean,
  sensitiveDetected = false,
  excludeReason?: string
): ProcessableFile => ({
  id: relativePath,
  file: createMockDomFile(relativePath),
  relativePath,
  include,
  sensitiveDetected,
  excludeReason,
});


describe('useFileProcessing Hook', () => {
  let initialConfig: AppConfig;

  beforeEach(() => {
    // Reset mocks and state for each test
    mockPostTask.mockClear();
    mockOnMessage.mockClear();
    mockOnError.mockClear();
    workerMessageHandlers = new Map();
    workerErrorHandlers = new Set();
    mockIsWorkerReady = true; // Assume worker is ready by default

    initialConfig = {
      useGitignore: true,
      redactionPlaceholder: '[REDACTED]',
    };

    // Mock downloadBlob helper
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mockurl');
    globalThis.URL.revokeObjectURL = vi.fn();
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn(); // Mock anchor click
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up mocks, including global ones
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    expect(result.current.state).toBe('idle');
    expect(result.current.analysisResult).toBeNull();
    expect(result.current.processedData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  // --- File Handling ---
  it('should transition to analyzing and post ANALYZE task on file change/drop', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockFiles = [createMockDomFile('test.js'), createMockDomFile('image.png')];

    // Simulate file input change
    act(() => {
      // Simulate the event object structure
      const event = { target: { files: mockFiles } } as unknown as React.ChangeEvent<HTMLInputElement>;
      result.current.handleFileChange(event);
    });

    expect(result.current.state).toBe('analyzing');
    expect(mockPostTask).toHaveBeenCalledTimes(1);
    expect(mockPostTask).toHaveBeenCalledWith({
      type: 'ANALYZE',
      payload: { files: mockFiles, config: initialConfig },
    });
  });

  it('should handle file drop and post ANALYZE task', async () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockFile = createMockDomFile('dropped.txt');

    // Mock FileSystemEntry and related methods needed for handleDrop traversal
    const mockFileEntry = {
      isFile: true,
      isDirectory: false,
      name: 'dropped.txt',
      file: (successCallback: (file: File) => void) => {
        successCallback(mockFile);
      },
    } as unknown as FileSystemFileEntry;

    const mockDataTransfer = {
      items: [{ webkitGetAsEntry: () => mockFileEntry }],
      files: [mockFile] // Also add to files array for simpler cases if needed
    } as unknown as DataTransfer;


    await act(async () => {
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: mockDataTransfer
      } as unknown as React.DragEvent<HTMLDivElement>;
      result.current.handleDrop(event);
    });

    // Wait for promises within handleDrop to resolve
    await waitFor(() => {
      expect(result.current.state).toBe('analyzing');
    });

    expect(mockPostTask).toHaveBeenCalledTimes(1);
    expect(mockPostTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ANALYZE',
      payload: expect.objectContaining({ files: [mockFile] }) // Ensure the file array is passed
    }));
  });


  it('should transition to ready_for_review on ANALYSIS_COMPLETE', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockAnalysisResult: AnalysisResult = {
      files: [createMockProcessableFile('test.js', true)],
      totalFiles: 1, totalSize: 100, filesToIncludeCount: 1, filesToExcludeCount: 0,
      sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false,
    };

    act(() => {
      // Need to trigger analysis first to register handlers
      const event = { target: { files: [createMockDomFile('test.js')] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      result.current.handleFileChange(event);
    });

    // Simulate worker sending back the result
    simulateWorkerMessage('ANALYSIS_COMPLETE', mockAnalysisResult);

    expect(result.current.state).toBe('ready_for_review');
    expect(result.current.analysisResult).toEqual(mockAnalysisResult);
    expect(result.current.progress).toBe(0); // Progress resets
    expect(result.current.error).toBeNull();
  });

  // --- Processing ---
  it('should transition to processing and post PROCESS task on startProcessing', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const initialAnalysis: AnalysisResult = {
      files: [createMockProcessableFile('test.js', true)],
      totalFiles: 1, totalSize: 100, filesToIncludeCount: 1, filesToExcludeCount: 0,
      sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false,
    };

    // Simulate getting to ready state
    act(() => {
      const event = { target: { files: [createMockDomFile('test.js')] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      result.current.handleFileChange(event);
    });
    simulateWorkerMessage('ANALYSIS_COMPLETE', initialAnalysis);

    // Apply an override before processing
    const overrides = { 'test.js': false };
    act(() => {
      result.current.updateFileOverrides(overrides);
    });


    // Start processing
    act(() => {
      result.current.startProcessing();
    });

    expect(result.current.state).toBe('processing');
    expect(result.current.progress).toBe(0);
    expect(mockPostTask).toHaveBeenCalledTimes(2); // Analyze + Process
    expect(mockPostTask).toHaveBeenLastCalledWith({
      type: 'PROCESS',
      payload: {
        files: initialAnalysis.files,
        config: initialConfig,
        overrides: overrides, // Ensure overrides are passed
      },
    });
  });


  it('should update progress on PROCESSING_PROGRESS', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    // Simulate getting to processing state (simplified)
    act(() => { result.current.startProcessing(); }); // Need analysis result for this to work fully, simplified test
    result.current.state = 'processing'; // Force state for test

    simulateWorkerMessage('PROCESSING_PROGRESS', { progress: 50, currentFile: 'processing.txt' });
    expect(result.current.progress).toBe(50);

    simulateWorkerMessage('PROCESSING_PROGRESS', { progress: 100, currentFile: 'last.txt' });
    expect(result.current.progress).toBe(100);
  });

  it('should transition to complete on PROCESSING_COMPLETE', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    // Simulate getting to processing state
    result.current.state = 'processing'; // Force state for test

    const mockProcessedData: ProcessedData = {
      filesToExport: [{ path: 'out.txt', content: 'cleaned' }],
      originalFileCount: 1, exportedFileCount: 1, redactedFileCount: 0,
    };

    simulateWorkerMessage('PROCESSING_COMPLETE', mockProcessedData);

    expect(result.current.state).toBe('complete');
    expect(result.current.processedData).toEqual(mockProcessedData);
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBeNull();
  });

  // --- Exporting ---
  it('should transition to exporting and post EXPORT_ZIP task', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockProcessedData: ProcessedData = { filesToExport: [], originalFileCount: 1, exportedFileCount: 0, redactedFileCount: 0 };
    // Simulate getting to complete state
    result.current.state = 'complete';
    result.current.processedData = mockProcessedData;

    act(() => {
      result.current.generateZipExport();
    });

    expect(result.current.state).toBe('exporting');
    expect(mockPostTask).toHaveBeenCalledWith({
      type: 'EXPORT_ZIP',
      payload: { processedData: mockProcessedData },
    });
  });

  it('should transition to exporting and post EXPORT_TEXT task', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockProcessedData: ProcessedData = { filesToExport: [], originalFileCount: 1, exportedFileCount: 0, redactedFileCount: 0 };
    result.current.state = 'complete';
    result.current.processedData = mockProcessedData;

    act(() => {
      result.current.generateTextExport();
    });

    expect(result.current.state).toBe('exporting');
    expect(mockPostTask).toHaveBeenCalledWith({
      type: 'EXPORT_TEXT',
      payload: { processedData: mockProcessedData },
    });
  });


  it('should call download helper and return to complete on EXPORT_COMPLETE', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    result.current.state = 'exporting'; // Force state

    const mockBlob = new Blob(['zip content']);
    const mockFilename = 'export.zip';

    simulateWorkerMessage('EXPORT_COMPLETE', { blob: mockBlob, filename: mockFilename });

    expect(result.current.state).toBe('complete'); // Should return to complete after download
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mockurl');
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  // --- Error Handling ---
  it('should set error state on worker ERROR message', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const errorMessage = 'Worker processing failed';

    simulateWorkerMessage('ERROR', { message: errorMessage });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe(errorMessage);
  });

  it('should set error state on direct worker error callback', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const errorMessage = 'Worker crashed';

    simulateWorkerError(errorMessage); // Simulate error via onError handler

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe(`Worker Error: ${errorMessage}`);
  });


  it('should set error state if worker is not ready on file change', () => {
    mockIsWorkerReady = false; // Set worker to not ready
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const mockFiles = [createMockDomFile('test.js')];

    act(() => {
      const event = { target: { files: mockFiles } } as unknown as React.ChangeEvent<HTMLInputElement>;
      result.current.handleFileChange(event);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/worker is not ready/i);
    expect(mockPostTask).not.toHaveBeenCalled();
  });

  // --- Reset ---
  it('should reset state correctly on resetState', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    // Set some state
    result.current.state = 'complete';
    result.current.error = 'Some error';
    result.current.progress = 50;
    result.current.analysisResult = { files: [], totalFiles: 1, totalSize: 1, filesToIncludeCount: 0, filesToExcludeCount: 1, sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false };
    result.current.processedData = { filesToExport: [], originalFileCount: 1, exportedFileCount: 0, redactedFileCount: 0 };

    // Mock file input ref
    const mockInput = document.createElement('input');
    mockInput.type = 'file';
    mockInput.value = 'dummy'; // Simulate having a value
    (result.current.fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = mockInput;


    act(() => {
      result.current.resetState();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(result.current.analysisResult).toBeNull();
    expect(result.current.processedData).toBeNull();
    // Check if file input value was cleared
    expect(result.current.fileInputRef.current?.value).toBe('');
  });

  // --- Overrides ---
  it('should update userOverrides state when updateFileOverrides is called', () => {
    const { result } = renderHook(() => useFileProcessing(initialConfig));
    const overrides1 = { 'path/to/file1.js': true };
    const overrides2 = { 'path/to/file2.log': false, 'path/to/file1.js': false };

    act(() => {
      result.current.updateFileOverrides(overrides1);
    });
    // No direct assertion on internal state, but it should be used in startProcessing

    act(() => {
      result.current.updateFileOverrides(overrides2);
    });
    // Again, no direct assertion, verify it's passed correctly in the startProcessing test.

    // Let's re-run the startProcessing test slightly modified to check overrides
    const initialAnalysis: AnalysisResult = {
      files: [createMockProcessableFile('file1.js', true)],
      totalFiles: 1, totalSize: 100, filesToIncludeCount: 1, filesToExcludeCount: 0,
      sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false,
    };
    act(() => { // Setup analysis result
      simulateWorkerMessage('ANALYSIS_COMPLETE', initialAnalysis);
    });
    result.current.state = 'ready_for_review'; // ensure state

    const testOverrides = { 'file1.js': false };
    act(() => { // Set overrides
      result.current.updateFileOverrides(testOverrides);
    });

    act(() => { // Trigger processing
      result.current.startProcessing();
    });

    expect(mockPostTask).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'PROCESS',
      payload: expect.objectContaining({
        overrides: testOverrides // Verify the correct overrides were passed
      }),
    }));


  });

});