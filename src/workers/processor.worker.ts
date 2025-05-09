/// <reference lib="webworker" />

if (typeof process === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (globalThis as any).process = {
    env: { NODE_ENV: 'development' }, // Provide NODE_ENV
    version: '', // Provide empty version
    platform: 'browser', // Provide dummy platform
    nextTick: (callback: () => void) => setTimeout(callback, 0), // Basic nextTick
    // Add other properties if needed by dependencies
  };
  console.log('Polyfilled process object for worker development mode.');
}

import { analyzeFiles, processFiles, createZipArchive, createConcatenatedDocument } from '../modules/fileProcessing';
import { WorkerTask, WorkerMessage } from '../types';

console.log('Processor Worker Started');

// Define the global scope for the worker
declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const { type, payload } = event.data;
  console.log('Worker received task:', type);

  try {
    switch (type) {
      case 'ANALYZE':
        if ('files' in payload && 'config' in payload) {
          const analysisResult = await analyzeFiles(payload.files, payload.config);
          self.postMessage({ type: 'ANALYSIS_COMPLETE', payload: analysisResult } as WorkerMessage);
        } else {
          throw new Error("Invalid payload for ANALYZE task.");
        }
        break;

      case 'PROCESS':
        if ('files' in payload && 'config' in payload && 'overrides' in payload) {
          const processedData = await processFiles(payload.files, payload.config, payload.overrides);
          self.postMessage({ type: 'PROCESSING_COMPLETE', payload: processedData } as WorkerMessage);
        } else {
          throw new Error("Invalid payload for PROCESS task.");
        }
        break;

      case 'EXPORT_ZIP':
        if ('processedData' in payload) {
          const { blob, filename } = await createZipArchive(payload.processedData);
          self.postMessage({ type: 'EXPORT_COMPLETE', payload: { blob, filename } } as WorkerMessage);
        } else {
          throw new Error("Invalid payload for EXPORT_ZIP task.");
        }
        break;

      case 'EXPORT_TEXT':
        if ('processedData' in payload) {
          const { blob, filename } = createConcatenatedDocument(payload.processedData);
          self.postMessage({ type: 'EXPORT_COMPLETE', payload: { blob, filename } } as WorkerMessage);
        } else {
          throw new Error("Invalid payload for EXPORT_TEXT task.");
        }
        break;

      default: {
        // console.warn('Worker received unknown task type:', type);
        // throw new Error(`Unknown task type: ${type}`);
        const exhaustiveCheck: never = type;
        console.warn(`Worker received unhandled task type: ${JSON.stringify(exhaustiveCheck)}`);
        throw new Error(`Unhandled task type encountered in worker.`);
      }
    }
  } catch (error: unknown) {
    console.error('Worker Error:', error);
    let errorMessage = 'An unknown error occurred in the worker';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    // Send error back to the main thread
    self.postMessage({
      type: 'ERROR',
      payload: { message: errorMessage }
    } as WorkerMessage);
  }
};

// Optional: Handle worker termination signal if needed
// self.onclose = () => {
//     console.log('Processor Worker Closing');
// };

// Initial message to confirm worker is loaded (optional)
// self.postMessage({ type: 'WORKER_READY' });