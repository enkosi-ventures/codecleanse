import { applyGitignoreRules } from './gitignoreFilter';
import { filterMediaBinaries } from './mediaBinaryFilter';
import { scanAndRedact } from './sensitiveScanner';
import { generateZip, generateConcatenatedText } from './exportEngine';
import { ProcessableFile, AnalysisResult, ProcessedData, AppConfig, WorkerMessage } from '../types';

// --- Constants ---
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit for reading content initially (adjust as needed)
const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024; // 100MB overall limit (adjust as needed)


// --- Helper Functions ---

async function readFileContent(file: File, isText: boolean): Promise<string | ArrayBuffer | null> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    console.warn(`File skipped for content reading due to size > ${MAX_FILE_SIZE_BYTES} bytes: ${file.webkitRelativePath}`);
    return null; // Treat large files as potentially binary unless explicitly included
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => {
      console.error(`Error reading file ${file.webkitRelativePath}:`, e);
      reject(reader.error || new Error(`Failed to read file ${file.webkitRelativePath}`));
    };
    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

// --- Core Processing Logic ---

// 1. Initial Analysis (called by worker on 'ANALYZE' task)
export async function analyzeFiles(files: File[], config: AppConfig): Promise<AnalysisResult> {
  console.log("Worker: Starting analysis...");
  let totalSize = 0;
  let gitignoreContent = '';
  let foundGitignore = false;

  // Size check
  const totalUploadSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalUploadSize > MAX_TOTAL_SIZE_BYTES) {
    throw new Error(`Total size of uploaded files (${(totalUploadSize / (1024 * 1024)).toFixed(1)}MB) exceeds the limit of ${MAX_TOTAL_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  // Find and read .gitignore if requested
  if (config.useGitignore) {
    const gitignoreFile = files.find(f => f.webkitRelativePath.endsWith('/.gitignore') || f.webkitRelativePath === '.gitignore');
    if (gitignoreFile) {
      try {
        gitignoreContent = (await readFileContent(gitignoreFile, true) as string) || '';
        foundGitignore = true;
        console.log("Worker: Found and read .gitignore");
      } catch (e) {
        console.warn("Worker: Could not read .gitignore file:", e);
        // Post a status update back?
        postMessage({ type: 'STATUS_UPDATE', payload: { message: `Warning: Could not read .gitignore file: ${e instanceof Error ? e.message : String(e)}` } } as WorkerMessage);
      }
    }
  }
  const gitignoreRules = gitignoreContent.split('\n').map(line => line.trim()).filter(Boolean);

  const processableFiles: ProcessableFile[] = [];
  let filesToIncludeCount = 0;
  let filesToExcludeCount = 0;
  let sensitiveDataFoundCount = 0;

  for (const file of files) {
    if (!file.webkitRelativePath) {
      console.warn(`Worker: File skipped, missing relative path: ${file.name}`);
      continue; // Skip files without a path (shouldn't happen with webkitdirectory/drop)
    }

    totalSize += file.size;
    const relativePath = file.webkitRelativePath;

    // Apply filters
    const { excluded: excludedByGitignore, reason: gitignoreReason } = applyGitignoreRules(relativePath, gitignoreRules, config.useGitignore);
    const { excluded: excludedByType, reason: typeReason } = filterMediaBinaries(relativePath, file.type);

    let include = true;
    let excludeReason = '';

    if (excludedByGitignore) {
      include = false;
      excludeReason = gitignoreReason;
    } else if (excludedByType) {
      include = false;
      excludeReason = typeReason;
    }

    // Basic sensitive data check (only on text files for now, content read later if included)
    let sensitiveDetected = false;
    // Full scanning deferred until the processing step to avoid reading all files upfront.

    processableFiles.push({
      id: relativePath,
      file,
      relativePath,
      include,
      excludeReason: include ? undefined : excludeReason,
      sensitiveDetected,
    });

    if (include) filesToIncludeCount++; else filesToExcludeCount++;
  }

  console.log("Worker: Analysis finished.");
  return {
    files: processableFiles,
    totalFiles: files.length,
    totalSize,
    filesToIncludeCount,
    filesToExcludeCount,
    sensitiveDataFoundCount, // This will be 0 after analysis, updated in processing
    gitignoreRules,
    foundGitignore,
  };
}

// 2. Full Processing (called by worker on 'PROCESS' task)
export async function processFiles(
  initialFiles: ProcessableFile[],
  config: AppConfig,
  overrides: Record<string, boolean>
): Promise<ProcessedData> {
  console.log("Worker: Starting processing with overrides:", overrides);
  const filesToExport: ProcessedData['filesToExport'] = [];
  let processedCount = 0;
  let redactedFileCount = 0;
  const totalFilesToProcess = initialFiles.length;

  for (const pFile of initialFiles) {
    processedCount++;
    const progress = Math.round((processedCount / totalFilesToProcess) * 100);
    // Send progress update
    postMessage({ type: 'PROCESSING_PROGRESS', payload: { progress, currentFile: pFile.relativePath } } as WorkerMessage);

    // Determine final inclusion based on overrides
    const userOverride = overrides[pFile.relativePath];
    let finalInclude = pFile.include;
    if (userOverride !== undefined) {
      finalInclude = userOverride; // Override automatic decision
      console.log(`Worker: Override applied for ${pFile.relativePath}: ${finalInclude ? 'INCLUDE' : 'EXCLUDE'}`);
    }

    // Skip if not finally included
    if (!finalInclude) {
      continue;
    }

    // Re-check type for content reading (text vs binary)
    // Use original file object: pFile.file
    const { isText } = filterMediaBinaries(pFile.relativePath, pFile.file.type);

    // Read content (handle potential errors)
    let content: string | ArrayBuffer | null = null;
    try {
      content = await readFileContent(pFile.file, isText);
    } catch (e) {
      console.error(`Worker: Failed to read content for ${pFile.relativePath}`, e);
      postMessage({ type: 'STATUS_UPDATE', payload: { message: `Warning: Could not read file ${pFile.relativePath}. Skipping.` } } as WorkerMessage);
      continue;
    }


    if (content === null) {
      // File might be too large or unreadable, but user forced include.
      // Decide how to handle: skip, include as empty, include marker?
      // For now, let's skip it if content couldn't be read, even if forced include.
      console.warn(`Worker: Skipping ${pFile.relativePath} in final export because content could not be read (e.g., too large).`);
      postMessage({ type: 'STATUS_UPDATE', payload: { message: `Warning: File ${pFile.relativePath} was skipped (too large or unreadable).` } } as WorkerMessage);
      continue;
    }


    // Scan and redact sensitive data if it's text
    let finalContent: string | ArrayBuffer = content;
    if (isText && typeof content === 'string') {
      const { redactedContent, sensitiveFound } = scanAndRedact(content, config.redactionPlaceholder);
      finalContent = redactedContent;
      if (sensitiveFound) {
        redactedFileCount++;
        // Update the original ProcessableFile object (if we still had access or passed it around)
        // pFile.sensitiveDetected = true; // This state is lost unless analysisResult is updated and passed back
        console.log(`Worker: Sensitive data redacted in ${pFile.relativePath}`);
      }
    } else if (!isText && userOverride === true) {
      // If it's binary/media but was forced include, keep original content
      finalContent = content;
      console.log(`Worker: Including binary/media file ${pFile.relativePath} due to override.`);
    }
    // else: it's binary/media and wasn't forced include - already skipped above

    filesToExport.push({
      path: pFile.relativePath,
      content: finalContent,
    });
  }

  console.log("Worker: Processing finished.");
  return {
    filesToExport,
    originalFileCount: initialFiles.length,
    exportedFileCount: filesToExport.length,
    redactedFileCount,
  };
}

// 3. Export Generation (called by worker on 'EXPORT_...' tasks)

export async function createZipArchive(processedData: ProcessedData): Promise<{ blob: Blob, filename: string }> {
  console.log("Worker: Generating Zip archive...");
  const blob = await generateZip(processedData.filesToExport);
  console.log("Worker: Zip archive generated.");
  return { blob, filename: 'codecleanse_export.zip' };
}

export async function createConcatenatedDocument(processedData: ProcessedData): Promise<{ blob: Blob, filename: string }> {
  console.log("Worker: Generating concatenated text document...");
  const blob = generateConcatenatedText(processedData.filesToExport);
  console.log("Worker: Concatenated text document generated.");
  return { blob, filename: 'codecleanse_export.txt' };
}