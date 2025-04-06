/// <reference lib="webworker" />

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
          const { blob, filename } = await createConcatenatedDocument(payload.processedData);
          self.postMessage({ type: 'EXPORT_COMPLETE', payload: { blob, filename } } as WorkerMessage);
        } else {
          throw new Error("Invalid payload for EXPORT_TEXT task.");
        }
        break;

      default:
        console.warn('Worker received unknown task type:', type);
        throw new Error(`Unknown task type: ${type}`);
    }
  } catch (error: any) {
    console.error('Worker Error:', error);
    // Send error back to the main thread
    self.postMessage({
      type: 'ERROR',
      payload: { message: error.message || 'An unknown error occurred in the worker' }
    } as WorkerMessage);
  }
};

// Optional: Handle worker termination signal if needed
// self.onclose = () => {
//     console.log('Processor Worker Closing');
// };

// Initial message to confirm worker is loaded (optional)
// self.postMessage({ type: 'WORKER_READY' });