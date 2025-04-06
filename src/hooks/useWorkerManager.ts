import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkerTask, WorkerMessage } from '../types';

// `?worker&inline` tells Vite to bundle the worker code.
// `&inline` embeds the worker code as a string, avoiding separate file issues on some hosts.
import ProcessorWorker from '../workers/processor.worker.ts?worker&inline';

export function useWorkerManager() {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Store message handlers keyed by message type
  const messageHandlersRef = useRef<Map<string, (payload: any) => void>>(new Map());
  // Store error handlers
  const errorHandlersRef = useRef<Set<(error: string) => void>>(new Set());

  // Initialize worker
  useEffect(() => {
    // Ensure worker is only created once
    if (!workerRef.current) {
      console.log('Initializing Web Worker...');
      try {
        // Create worker instance using the imported constructor
        const workerInstance = new ProcessorWorker();

        workerInstance.onmessage = (event: MessageEvent<WorkerMessage>) => {
          console.log('Message from Worker:', event.data);
          const { type, payload } = event.data;
          const handler = messageHandlersRef.current.get(type);
          if (handler) {
            handler(payload);
          } else {
            console.warn(`No handler registered for worker message type: ${type}`);
          }
        };

        workerInstance.onerror = (event: ErrorEvent) => {
          console.error('Error from Worker:', event);
          const errorMessage = event.message || 'An unknown worker error occurred';
          setWorkerError(errorMessage);
          errorHandlersRef.current.forEach(handler => handler(errorMessage));
          workerInstance.terminate();
          workerRef.current = null;
          setIsWorkerReady(false);
        };

        workerRef.current = workerInstance;
        setIsWorkerReady(true);
        setWorkerError(null); // Reset error state on successful initialization

      } catch (err) {
        console.error('Failed to initialize Web Worker:', err);
        const message = err instanceof Error ? err.message : 'Failed to create worker.';
        setWorkerError(message);
        errorHandlersRef.current.forEach(handler => handler(message));
        setIsWorkerReady(false);
      }
    }

    // Cleanup function to terminate the worker when the hook unmounts
    return () => {
      if (workerRef.current) {
        console.log('Terminating Web Worker...');
        workerRef.current.terminate();
        workerRef.current = null;
        setIsWorkerReady(false);
      }
    };
  }, []);

  const postTask = useCallback((task: WorkerTask) => {
    if (workerRef.current && isWorkerReady) {
      console.log('Posting Task to Worker:', task.type, task.payload);
      // Important: Pass transferable objects if possible (e.g., ArrayBuffers)
      // For File objects, they are inherently structured-clonable.
      workerRef.current.postMessage(task);
    } else {
      const errorMsg = 'Worker is not ready or available.';
      console.error(errorMsg);
      setWorkerError(errorMsg);
      errorHandlersRef.current.forEach(handler => handler(errorMsg));
    }
  }, [isWorkerReady]);

  // Function to register message handlers
  const onMessage = useCallback((type: string, handler: (payload: any) => void) => {
    messageHandlersRef.current.set(type, handler);
    // Return a cleanup function
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  // Function to register error handlers
  const onError = useCallback((handler: (error: string) => void) => {
    errorHandlersRef.current.add(handler);
    // Return a cleanup function
    return () => {
      errorHandlersRef.current.delete(handler);
    };
  }, []);


  return { postTask, onMessage, onError, isWorkerReady, workerError };
}