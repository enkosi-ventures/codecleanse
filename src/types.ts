export type ProcessingState =
  | 'idle'
  | 'analyzing'
  | 'ready_for_review'
  | 'processing'
  | 'complete'
  | 'exporting'
  | 'error';

// Represents a file being processed
export interface ProcessableFile {
  id: string; // Unique ID (e.g., path or hash)
  file: File; // The original File object
  relativePath: string;
  include: boolean; // Initial decision based on rules
  excludeReason?: string; // Why it was excluded (gitignore, binary, etc.)
  sensitiveDetected: boolean;
  content?: string | ArrayBuffer; // Loaded content for processing/exporting
}

// Result of the initial analysis phase
export interface AnalysisResult {
  files: ProcessableFile[];
  totalFiles: number;
  totalSize: number;
  filesToIncludeCount: number;
  filesToExcludeCount: number;
  sensitiveDataFoundCount: number;
  gitignoreRules: string[];
  foundGitignore: boolean;
}

// Data ready for export after processing
export interface ProcessedData {
  filesToExport: Array<{ path: string; content: string | ArrayBuffer }>;
  originalFileCount: number;
  exportedFileCount: number;
  redactedFileCount: number;
}

// User configuration
export interface AppConfig {
  useGitignore: boolean;
  // removeBinariesMedia: boolean; // Consider adding if needed as separate toggle
  redactionPlaceholder: string;
  userPreFilterFolders: string[];
}

// --- Web Worker Communication Types ---

export type WorkerTask =
  | { type: 'ANALYZE'; payload: { files: File[]; config: AppConfig } }
  | { type: 'PROCESS'; payload: { files: ProcessableFile[]; config: AppConfig; overrides: Record<string, boolean> } }
  | { type: 'EXPORT_ZIP'; payload: { processedData: ProcessedData } }
  | { type: 'EXPORT_TEXT'; payload: { processedData: ProcessedData } };

export type WorkerMessage =
  | { type: 'ANALYSIS_COMPLETE'; payload: AnalysisResult }
  | { type: 'PROCESSING_PROGRESS'; payload: { progress: number; currentFile: string } }
  | { type: 'PROCESSING_COMPLETE'; payload: ProcessedData }
  | { type: 'EXPORT_COMPLETE'; payload: { blob: Blob, filename: string } }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'STATUS_UPDATE'; payload: { message: string } }; // General status updates