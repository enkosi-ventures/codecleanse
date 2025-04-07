import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ProcessingState,
  AnalysisResult,
  ProcessedData,
  AppConfig
} from '../types';
import { useWorkerManager } from './useWorkerManager';

// --- Constants for Pre-filtering ---
// Folder names (relative to the uploaded root's children) to completely skip during upload.
const PRE_FILTER_FOLDERS: ReadonlySet<string> = new Set(['node_modules', '.git']);

// Helper to download blobs
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

// --- Helper for Pre-filtering ---
// Checks if a relative path belongs to a pre-filtered directory.
// Example: `project-root/node_modules/file.js` -> should return true
// Example: `project-root/.git/config` -> should return true
// Example: `project-root/src/index.js` -> should return false
function shouldPreFilter(relativePath: string | undefined | null): { preFiltered: boolean; folderName: string | null } {
  if (!relativePath) {
    return { preFiltered: false, folderName: null };
  }
  // Remove the root folder name if present (e.g., "my-project/")
  const pathParts = relativePath.split('/');
  const segments = pathParts.length > 1 ? pathParts.slice(1) : pathParts; // Skip the root dir name itself

  for (const segment of segments) {
    if (PRE_FILTER_FOLDERS.has(segment)) {
      // Return the specific folder name that caused the filter
      return { preFiltered: true, folderName: segment };
    }
  }
  return { preFiltered: false, folderName: null };
}


export function useFileProcessing(config: AppConfig) {
  const [state, setState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [filteredFilesForAnalysis, setFilteredFilesForAnalysis] = useState<File[]>([]);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [skippedFolderInfo, setSkippedFolderInfo] = useState<{ count: number; names: Set<string> } | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const { postTask, onMessage, onError, isWorkerReady, workerError } = useWorkerManager();

  // --- Worker Message Handlers ---

  useEffect(() => {
    // Handle analysis completion
    const removeAnalysisHandler = onMessage('ANALYSIS_COMPLETE', (payload: unknown) => {
      const analysisPayload = payload as AnalysisResult;
      console.log("Analysis complete handler called");
      setAnalysisResult(analysisPayload);
      setState(analysisPayload.files.length > 0 ? 'ready_for_review' : 'idle'); // Go to review or back to idle if no files
      setProgress(0); // Reset progress for next stage
    });

    // Handle processing progress
    const removeProgressHandler = onMessage('PROCESSING_PROGRESS', (payload: unknown) => {
      const progressPayload = payload as { progress: number; currentFile: string };
      setProgress(progressPayload.progress);
      // Optionally display payload.currentFile somewhere in the UI
    });

    // Handle processing completion
    const removeProcessCompleteHandler = onMessage('PROCESSING_COMPLETE', (payload: unknown) => {
      const processCompletePayload = payload as ProcessedData;
      console.log("Processing complete handler called with payload:", processCompletePayload);
      setProcessedData(processCompletePayload);
      setState('complete');
      setProgress(100);
    });

    // Handle export completion
    const removeExportCompleteHandler = onMessage('EXPORT_COMPLETE', (payload: unknown) => {
      const exportCompletePayload = payload as { blob: Blob; filename: string };
      downloadBlob(exportCompletePayload.blob, exportCompletePayload.filename);
      setState('complete');
    });

    // Handle generic worker errors
    const removeErrorHandler = onError((errorMessage: string) => {
      setError(`Worker Error: ${errorMessage}`);
      setState('error');
    });

    // Handle specific errors reported by worker logic
    const removeSpecificErrorHandler = onMessage('ERROR', (payload: unknown) => {
      const errorPayload = payload as { message: string };
      setError(errorPayload.message || 'An error occurred during processing.');
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
    setFilteredFilesForAnalysis([]); // Clear filtered files
    setUserOverrides({});
    setSkippedFolderInfo(null); // Clear skipped folder info
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    console.log('State Reset');
  }, []); // No dependencies, safe to memoize

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous functional errors
    setSkippedFolderInfo(null); // Clear previous skip info
    const files = event.target.files;

    if (files && files.length > 0) {
      const allFilesList = Array.from(files);
      console.log(`Files selected via browse: ${allFilesList.length}`);

      // --- Pre-filter Files ---
      let skippedCount = 0;
      const skippedNames = new Set<string>();
      const filesToAnalyze = allFilesList.filter(file => {
        const { preFiltered, folderName } = shouldPreFilter(file.webkitRelativePath);
        if (preFiltered && folderName) {
          skippedCount++;
          skippedNames.add(folderName);
          return false; // Exclude this file
        }
        return true; // Include this file
      });
      // --- End Pre-filter ---

      if (skippedCount > 0) {
        setSkippedFolderInfo({ count: skippedCount, names: skippedNames });
        console.log(`Pre-filtered ${skippedCount} files from folders: ${Array.from(skippedNames).join(', ')}`);
      }

      console.log(`Files remaining after pre-filter: ${filesToAnalyze.length}`);
      setFilteredFilesForAnalysis(filesToAnalyze); // Store the filtered list

      if (filesToAnalyze.length === 0 && allFilesList.length > 0) {
        setError("All selected files belong to automatically excluded folders (e.g., node_modules, .git). Please select a different folder.");
        setState('error');
        return; // Stop processing
      }


      if (isWorkerReady) {
        console.log("Worker ready, posting ANALYZE task with filtered files");
        setState('analyzing');
        // Send ONLY the filtered list to the worker
        postTask({ type: 'ANALYZE', payload: { files: filesToAnalyze, config } });
      } else {
        setError("Worker is not ready. Please wait or refresh.");
        setState('error');
      }
    } else {
      console.log("No files selected or input cleared");
      // If called by clearing the input, reset if files were previously loaded
      if (filteredFilesForAnalysis.length > 0 || skippedFolderInfo) {
        resetState();
      }
    }
  }, [isWorkerReady, postTask, config, resetState, filteredFilesForAnalysis.length, skippedFolderInfo]);


  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    setSkippedFolderInfo(null);

    const items = event.dataTransfer.items;
    const collectedFiles: File[] = []; // Changed name for clarity
    const promises: Promise<void>[] = [];
    const skippedNames = new Set<string>();

    if (items && items.length > 0) {
      const traverseFileTree = (item: FileSystemEntry, path = ''): Promise<void> => {
        return new Promise((resolve, reject) => {
          const currentPath = path ? `${path}/${item.name}` : item.name;

          // --- Pre-filter Check during Traversal ---
          const { preFiltered, folderName } = shouldPreFilter(currentPath);
          if (preFiltered && folderName) {
            console.log(`Skipping traversal into pre-filtered path: ${currentPath}`);
            skippedNames.add(folderName); // Track skipped root folder
            // We don't easily know the *count* skipped within a directory during drop,
            // so we'll just track the folder names. The count will be less accurate here.
            resolve(); // Stop traversing this branch
            return;
          }
          // --- End Pre-filter Check ---

          if (item.isFile) {
            (item as FileSystemFileEntry).file(file => {
              // Add webkitRelativePath
              Object.defineProperty(file, 'webkitRelativePath', {
                value: currentPath,
                writable: false,
              });
              collectedFiles.push(file); // Add to list if not pre-filtered
              resolve();
            }, reject);
          } else if (item.isDirectory) {
            const dirReader = (item as FileSystemDirectoryEntry).createReader();
            let allEntries: FileSystemEntry[] = [];
            const readEntries = () => {
              dirReader.readEntries(entries => {
                if (entries.length === 0) {
                  Promise.all(allEntries.map(entry => traverseFileTree(entry, currentPath)))
                    .then(() => resolve())
                    .catch(reject);
                } else {
                  allEntries = allEntries.concat(entries);
                  readEntries();
                }
              }, reject);
            };
            readEntries();
          } else {
            resolve();
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
        console.log(`Files collected from drop: ${collectedFiles.length}`);
        if (skippedNames.size > 0) {
          // Set skipped info (count is approximate here)
          setSkippedFolderInfo({ count: -1, names: skippedNames }); // Use -1 to indicate count unknown
          console.log(`Pre-filtered folders during drop: ${Array.from(skippedNames).join(', ')}`);
        }

        if (collectedFiles.length > 0) {
          setFilteredFilesForAnalysis(collectedFiles); // Store filtered list
          if (isWorkerReady) {
            setState('analyzing');
            // Send ONLY the collected (implicitly filtered) files
            postTask({ type: 'ANALYZE', payload: { files: collectedFiles, config } });
          } else {
            setError("Worker is not ready. Please wait or refresh.");
            setState('error');
          }
        } else if (skippedNames.size > 0) {
          setError("All dropped files belong to automatically excluded folders (e.g., node_modules, .git). Please select different content.");
          setState('error');
        }
        else {
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
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Triggered by user action after reviewing files
  const startProcessing = useCallback(() => {
    if (state === 'ready_for_review' && analysisResult && isWorkerReady) {
      setState('processing');
      setProgress(0);
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
    skippedFolderInfo,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    startProcessing,
    generateZipExport,
    generateTextExport,
    resetState,
    updateFileOverrides,
    isWorkerReady
  };
}