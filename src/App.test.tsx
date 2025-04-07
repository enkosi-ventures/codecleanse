import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';
import { AnalysisResult, ProcessedData, ProcessableFile } from './types';
import { ThemeProvider } from '@mui/material/styles';
import theme from './styles/theme'; // Import your theme
import { ErrorBoundary } from 'react-error-boundary'; // Import ErrorBoundary

// --- Mocking useWorkerManager ---
const workerMessageHandlers = new Map<string, (payload: any) => void>();
const workerErrorHandlers = new Set<(error: string) => void>();

const mockPostTask = vi.fn();
const mockOnMessage = vi.fn((type: string, handler: (payload: any) => void) => {
  workerMessageHandlers.set(type, handler);
  return () => workerMessageHandlers.delete(type);
});
const mockOnError = vi.fn((handler: (error: string) => void) => {
  workerErrorHandlers.add(handler);
  return () => workerErrorHandlers.delete(handler);
});
const mockIsWorkerReady = true;

vi.mock('./hooks/useWorkerManager', () => {
  return {
    useWorkerManager: () => ({
      postTask: mockPostTask,
      onMessage: mockOnMessage,
      onError: mockOnError,
      isWorkerReady: mockIsWorkerReady,
      workerError: null,
    }),
  };
});

// --- Mock Storage ---
vi.mock('./utils/storage', () => ({
  getLocalStorage: vi.fn(() => null), // Start with no stored config
  setLocalStorage: vi.fn(),
  removeLocalStorage: vi.fn(),
}));


// Helper to simulate receiving a message from the worker
const simulateWorkerMessage = async (type: string, payload: any) => {
  const handler = workerMessageHandlers.get(type);
  if (handler) {
    // Wrap state updates in act
    await act(async () => {
      handler(payload);
    });
  } else {
    console.warn(`Test Warning: No handler registered for simulated message type: ${type}`);
  }
};

// Helper function to create mock File objects
const createMockDomFile = (relativePath: string, content = 'content'): File => {
  const file = new File([content], relativePath.split('/').pop() || 'file', { type: 'text/plain' });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath, writable: false });
  return file;
};
// Helper to create mock ProcessableFile
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

// Helper ErrorBoundary Fallback for testing
const TestErrorFallback = ({ error }: { error: Error }) => (
  <div role="alert">
    <p>Test Error Boundary:</p>
    <pre>{error.message}</pre>
  </div>
);


describe('<App /> Integration Test', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockPostTask.mockClear();
    mockOnMessage.mockClear();
    mockOnError.mockClear();
    workerMessageHandlers.clear();
    workerErrorHandlers.clear();
    // mockIsWorkerReady = true;

    // Mock globals used by hooks/components if necessary (like downloadBlob)
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mockurl');
    globalThis.URL.revokeObjectURL = vi.fn();
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    // Ensure anchor mock exists
    globalThis.HTMLAnchorElement.prototype.click = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();

    afterEach(() => {
      vi.restoreAllMocks();
      // Remove the container from the DOM if it exists.
      const container = document.querySelector('div');
      if (container && container.parentElement) {
        container.parentElement.removeChild(container);
      }
    });
  });


  const renderApp = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary FallbackComponent={TestErrorFallback}>
          <App />
        </ErrorBoundary>
      </ThemeProvider>,
      { container }
    );
    return container;
  };

  it('should perform a full workflow: Upload -> Analyze -> Override -> Process -> Export Zip', async () => {
    renderApp();

    // --- 1. Upload ---
    const fileInput = screen.getByTestId('file-input');
    const file1 = createMockDomFile('src/main.js', 'console.log("hello");');
    const file2 = createMockDomFile('assets/logo.png', 'binarydata'); // Will be excluded by filter

    await act(async () => {
      await user.upload(fileInput, [file1, file2]);
    });

    // Check if ANALYZE task was posted
    expect(mockPostTask).toHaveBeenCalledWith(expect.objectContaining({ type: 'ANALYZE' }));

    // --- 2. Simulate Analysis Result ---
    const analysisResult: AnalysisResult = {
      files: [
        createMockProcessableFile('src/main.js', true),
        createMockProcessableFile('assets/logo.png', false, false, 'Binary/Media Extension')
      ],
      totalFiles: 2, totalSize: 1000, filesToIncludeCount: 1, filesToExcludeCount: 1,
      sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false,
    };

    await simulateWorkerMessage('ANALYSIS_COMPLETE', analysisResult);

    // Check UI updates after analysis
    await waitFor(() => {
      expect(screen.getByText('src/main.js')).toBeInTheDocument();
    });
    expect(screen.getByText('assets/logo.png')).toBeInTheDocument();
    expect(screen.getByText(/Total Files Found: 2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /process files/i })).toBeEnabled();

    // --- 3. Override ---
    // Find the toggle button for the initially excluded file (logo.png)
    const logoListItem = screen.getByText('assets/logo.png').closest('li');
    const logoToggleButton = logoListItem?.querySelector('button');
    expect(logoToggleButton).toBeInTheDocument();

    // Click to manually include logo.png
    await act(async () => {
      await user.click(logoToggleButton!);
    });

    // --- 4. Process ---
    const processButton = screen.getByRole('button', { name: /process files/i });
    await act(async () => {
      await user.click(processButton);
    });


    // Check if PROCESS task was posted with override
    expect(mockPostTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'PROCESS',
      payload: expect.objectContaining({
        files: analysisResult.files, // Pass original analyzed files
        overrides: { 'assets/logo.png': true } // Expect the override
      })
    }));

    // Check UI shows processing state
    expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Or check text "Processing files..."

    // --- 5. Simulate Processing Result ---
    const processedData: ProcessedData = {
      filesToExport: [
        { path: 'src/main.js', content: 'console.log("hello");' },
        { path: 'assets/logo.png', content: expect.any(ArrayBuffer) } // Mock content if needed
      ],
      originalFileCount: 2, exportedFileCount: 2, redactedFileCount: 0,
    };
    // Simulate progress first (optional but good practice)
    await simulateWorkerMessage('PROCESSING_PROGRESS', { progress: 50, currentFile: 'src/main.js' });
    await simulateWorkerMessage('PROCESSING_PROGRESS', { progress: 100, currentFile: 'assets/logo.png' });
    await simulateWorkerMessage('PROCESSING_COMPLETE', processedData);

    // Check UI updates after processing
    await waitFor(() => {
      expect(screen.getByText(/Processing complete!/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /process files/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export as zip/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /export as text/i })).toBeEnabled();


    // --- 6. Export Zip ---
    const exportZipButton = screen.getByRole('button', { name: /export as zip/i });
    await act(async () => {
      await user.click(exportZipButton);
    });


    // Check if EXPORT_ZIP task was posted
    expect(mockPostTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EXPORT_ZIP',
      payload: { processedData }
    }));

    // --- 7. Simulate Export Result ---
    const mockBlob = new Blob(['mock zip content']);
    await simulateWorkerMessage('EXPORT_COMPLETE', { blob: mockBlob, filename: 'codecleanse_export.zip' });

    // Check if download was triggered (mocked)
    await waitFor(() => {
      expect(globalThis.HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
    // Check state returns to complete
    expect(screen.getByText(/Processing complete!/i)).toBeInTheDocument(); // Should still be complete
    expect(screen.getByRole('button', { name: /export as zip/i })).toBeEnabled(); // Export buttons re-enabled

  });

  it('should handle workflow with text export', async () => {
    renderApp();
    // Simplified: Assume steps 1-5 from previous test happened successfully
    // and we are in the 'complete' state with processedData

    // Directly simulate complete state for this specific test
    const processedData: ProcessedData = {
      filesToExport: [
        { path: 'src/main.js', content: 'console.log("hello");' },
        { path: 'bin/data.bin', content: new ArrayBuffer(10) } // Binary file
      ],
      originalFileCount: 2, exportedFileCount: 2, redactedFileCount: 0,
    };
    // Manually set state via mocking if useFileProcessing hook allows or re-simulate analysis/process
    // For simplicity here, just ensure export button is enabled after simulating process completion
    const analysisResult: AnalysisResult = { files: [createMockProcessableFile('src/main.js', true)], totalFiles: 1, totalSize: 100, filesToIncludeCount: 1, filesToExcludeCount: 0, sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false };
    await simulateWorkerMessage('ANALYSIS_COMPLETE', analysisResult); // Need analysis result to enable process button
    await act(async () => { await user.click(screen.getByRole('button', { name: /process files/i })); });
    await simulateWorkerMessage('PROCESSING_COMPLETE', processedData);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export as text/i })).toBeEnabled();
    });


    // --- Export Text ---
    const exportTextButton = screen.getByRole('button', { name: /export as text/i });
    await act(async () => {
      await user.click(exportTextButton);
    });


    // Check if EXPORT_TEXT task was posted
    expect(mockPostTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EXPORT_TEXT',
      payload: { processedData }
    }));

    // Simulate Export Result
    const mockBlob = new Blob(['mock text content']);
    await simulateWorkerMessage('EXPORT_COMPLETE', { blob: mockBlob, filename: 'codecleanse_export.txt' });

    // Check download
    await waitFor(() => {
      expect(globalThis.HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
  });

  it('should handle reset button click', async () => {
    renderApp();
    // Simulate some state (e.g., after analysis)
    const analysisResult: AnalysisResult = { files: [createMockProcessableFile('file.js', true)], totalFiles: 1, totalSize: 100, filesToIncludeCount: 1, filesToExcludeCount: 0, sensitiveDataFoundCount: 0, gitignoreRules: [], foundGitignore: false };
    await simulateWorkerMessage('ANALYSIS_COMPLETE', analysisResult);
    await waitFor(() => {
      expect(screen.getByText('file.js')).toBeInTheDocument(); // Ensure analysis state is visible
    });
    expect(screen.getByRole('button', { name: /reset \/ new upload/i })).toBeEnabled();

    // Click Reset
    const resetButton = screen.getByRole('button', { name: /reset \/ new upload/i });
    await act(async () => {
      await user.click(resetButton);
    });


    // Check UI returns to initial state
    await waitFor(() => {
      expect(screen.getByText(/upload a directory to begin analysis/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('file.js')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Files Found/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /process files/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export as zip/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reset \/ new upload/i })).toBeDisabled(); // Reset disabled in idle state

  });

  it('should display error message if worker analysis fails', async () => {
    renderApp();
    const fileInput = screen.getByTestId('file-input');
    const file1 = createMockDomFile('src/main.js');
    await act(async () => { await user.upload(fileInput, [file1]); });

    // Simulate worker sending back an error during analysis
    const errorMessage = "Analysis failed!";
    await simulateWorkerMessage('ERROR', { message: errorMessage });

    await waitFor(() => {
      // Check for MUI Alert component showing the error
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
    });
    // Check buttons are potentially disabled or reset button is enabled
    expect(screen.getByRole('button', { name: /process files/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reset \/ new upload/i })).toBeEnabled(); // Allow reset from error state
  });
});