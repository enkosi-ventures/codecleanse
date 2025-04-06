import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ProcessingState,
  AnalysisResult,
  ProcessedData,
  AppConfig
} from '../types';
import { useWorkerManager } from './useWorkerManager';


const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function useFileProcessing(config: AppConfig) {
  const [state, setState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);
  // Store user overrides separate from analysisResult to apply them during the 'PROCESS' step
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { postTask, onMessage, onError, isWorkerReady, workerError } = useWorkerManager();

  // --- Worker Message Handlers ---

  useEffect(() => {
    const removeAnalysisHandler = onMessage('ANALYSIS_COMPLETE', (payload: AnalysisResult) => {
      console.log("Analysis complete handler called");
      setAnalysisResult(payload);
      setState(payload.files.length > 0 ? 'ready_for_review' : 'idle'); // Go to review or back to idle if no files
      setProgress(0); // Reset progress for next stage
      setError(null); // Clear previous errors
      setUserOverrides({}); // Reset overrides on new analysis
    });

    // Handle processing progress
    const removeProgressHandler = onMessage('PROCESSING_PROGRESS', (payload: { progress: number; currentFile: string }) => {
      setProgress(payload.progress);
      // Optionally display payload.currentFile somewhere in the UI
    });

    // Handle processing completion
    const removeProcessCompleteHandler = onMessage('PROCESSING_COMPLETE', (payload: ProcessedData) => {
      setProcessedData(payload);
      setState('complete');
      setProgress(100); // Ensure progress shows 100%
      setError(null);
    });

    // Handle export completion
    const removeExportCompleteHandler = onMessage('EXPORT_COMPLETE', (payload: { blob: Blob; filename: string }) => {
      downloadBlob(payload.blob, payload.filename);
      setState('complete'); // Return to complete state after export
      setError(null);
    });

    // Handle generic worker errors
    const removeErrorHandler = onError((errorMessage: string) => {
      setError(`Worker Error: ${errorMessage}`);
      setState('error');
    });

    // Handle specific errors reported by worker logic
    const removeSpecificErrorHandler = onMessage('ERROR', (payload: { message: string }) => {
      setError(payload.message || 'An error occurred during processing.');
      setState('error');
    });

    // Cleanup listeners on unmount or when handlers change
    return () => {
      removeAnalysisHandler();
      removeProgressHandler();
      removeProcessCompleteHandler();
      removeExportCompleteHandler();
      removeErrorHandler();
      removeSpecificErrorHandler();
    };
  }, [onMessage, onError]); // Rerun if hook methods change


  // Handle errors coming directly from the worker manager hook
  useEffect(() => {
    if (workerError) {
      setError(`Worker Initialization Error: ${workerError}`);
      setState('error');
    }
  }, [workerError]);

  // --- Actions ---

  const resetState = useCallback(() => {
    setState('idle');
    setError(null);
    setProgress(0);
    setAnalysisResult(null);
    setProcessedData(null);
    setCurrentFiles([]);
    setUserOverrides({});
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    console.log('State Reset');
  }, []); // No dependencies, safe to memoize

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous errors
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      console.log(`Files selected: ${fileList.length}`);
      setCurrentFiles(fileList); // Store files temporarily
      if (isWorkerReady) {
        console.log("Worker ready, posting ANALYZE task");
        setState('analyzing');
        postTask({ type: 'ANALYZE', payload: { files: fileList, config } });
      } else {
        setError("Worker is not ready. Please wait or refresh.");
        setState('error');
      }
    } else {
      console.log("No files selected or input cleared");
      // If called by clearing the input, potentially reset
      if (currentFiles.length > 0) { // Only reset if files were previously loaded
        resetState();
      }
    }
  }, [isWorkerReady, postTask, config, resetState, currentFiles.length]);


  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    const items = event.dataTransfer.items;
    const files: File[] = [];
    const promises: Promise<void>[] = [];

    if (items && items.length > 0) {
      const traverseFileTree = (item: FileSystemEntry, path = ''): Promise<void> => {
        return new Promise((resolve, reject) => {
          const currentPath = path ? `${path}/${item.name}` : item.name;
          if (item.isFile) {
            (item as FileSystemFileEntry).file(file => {
              // IMPORTANT: Manually add webkitRelativePath for consistency with input[type=file]
              Object.defineProperty(file, 'webkitRelativePath', {
                value: currentPath,
                writable: false,
              });
              files.push(file);
              resolve();
            }, reject);
          } else if (item.isDirectory) {
            const dirReader = (item as FileSystemDirectoryEntry).createReader();
            let allEntries: FileSystemEntry[] = [];
            const readEntries = () => {
              dirReader.readEntries(entries => {
                if (entries.length === 0) {
                  // Resolve all promises for this directory's children
                  Promise.all(allEntries.map(entry => traverseFileTree(entry, currentPath)))
                    .then(() => resolve())
                    .catch(reject);
                } else {
                  allEntries = allEntries.concat(entries);
                  // Read next batch
                  readEntries();
                }
              }, reject);
            };
            readEntries(); // Start reading
          } else {
            resolve(); // Skip other types
          }
        });
      };

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          promises.push(traverseFileTree(entry));
        }
      }

      Promise.all(promises).then(() => {
        console.log(`Files from drop: ${files.length}`);
        if (files.length > 0) {
          setCurrentFiles(files);
          if (isWorkerReady) {
            setState('analyzing');
            postTask({ type: 'ANALYZE', payload: { files, config } });
          } else {
            setError("Worker is not ready. Please wait or refresh.");
            setState('error');
          }
        } else {
          // Handle case where drop didn't yield files (e.g., empty folder)
          setError("Could not read files from the dropped item(s). Please try the 'Browse' button.");
          setState('error');
        }
      }).catch(err => {
        console.error("Error processing dropped files:", err);
        setError("Error reading dropped folder/files. Ensure you dropped a valid directory.");
        setState('error');
      });

    } else {
      setError("Could not detect files in the dropped items.");
      setState('error');
    }

  }, [isWorkerReady, postTask, config]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    event.stopPropagation();
  }, []);

  const startProcessing = useCallback(() => {
    if (state === 'ready_for_review' && analysisResult && isWorkerReady) {
      setState('processing');
      setProgress(0); // Reset progress for processing phase
      postTask({
        type: 'PROCESS',
        payload: {
          files: analysisResult.files,
          config,
          overrides: userOverrides,
        }
      });
    } else {
      console.warn('Cannot start processing in current state:', state, analysisResult, isWorkerReady);
      setError("Cannot start processing. Ensure files are analyzed and the system is ready.");
    }
  }, [state, analysisResult, isWorkerReady, postTask, config, userOverrides]);

  const updateFileOverrides = useCallback((newOverrides: Record<string, boolean>) => {
    setUserOverrides(newOverrides);
    // No state change here, just update the overrides to be used in `startProcessing`
    console.log("Overrides updated:", newOverrides);
  }, []);


  const generateZipExport = useCallback(() => {
    if (state === 'complete' && processedData && isWorkerReady) {
      setState('exporting');
      postTask({ type: 'EXPORT_ZIP', payload: { processedData } });
    } else {
      console.warn("Cannot export zip: State or data not ready.");
    }
  }, [state, processedData, isWorkerReady, postTask]);

  const generateTextExport = useCallback(() => {
    if (state === 'complete' && processedData && isWorkerReady) {
      setState('exporting');
      postTask({ type: 'EXPORT_TEXT', payload: { processedData } });
    } else {
      console.warn("Cannot export text: State or data not ready.");
    }
  }, [state, processedData, isWorkerReady, postTask]);

  return {
    state,
    error,
    progress,
    analysisResult,
    processedData,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    startProcessing,
    generateZipExport,
    generateTextExport,
    resetState,
    updateFileOverrides,
    isWorkerReady,
  };
}