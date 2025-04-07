// List of common binary and text extensions and cache directories (unchanged)
const commonBinaryExtensions: Set<string> = new Set([
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.ico',
  // Audio
  '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a',
  // Video
  '.mp4', '.webm', '.mkv', '.mov', '.avi', '.wmv', '.flv',
  // Documents (often binary or complex)
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  // Executables & Libraries
  '.exe', '.dll', '.so', '.dylib', '.app', '.jar', '.pyc', '.class', '.wasm',
  // Databases
  '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2',
  // Other common binary/cache types
  '.lock', '.bin', '.dat', '.bak', '.swp', '.swo', '.ds_store',
]);

const commonTextExtensions: Set<string> = new Set([
  // Code
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
  '.sh', '.bash', '.zsh', '.ps1', '.bat',
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env', '.properties',
  // Text/Docs
  '.txt', '.md', '.markdown', '.rst', '.log', '.csv', '.tsv',
  // Config
  '.gitignore', '.gitattributes', '.editorconfig', 'dockerfile', '.dockerignore',
  '.npmrc', '.yarnrc',
  // SQL
  '.sql'
]);

// Common cache/dependency directory names (match anywhere in path)
const cacheDirPatterns = [
  'node_modules/', '.cache/', 'build/', 'dist/', 'target/', 'bin/', 'obj/', '__pycache__/', 'vendor/', '.idea/', '.vscode/', '.yarn/',
  '.pnp.cjs', '.pnp.loader.mjs',
];

// Check if a path indicates a directory likely containing binaries or cache
function isLikelyBinaryOrCacheDir(filePath: string): boolean {
  return cacheDirPatterns.some(pattern => filePath.includes(pattern));
}

// Updated getExtension: returns the extension (including the dot) or, for hidden files with no other dot, the full filename.
function getExtension(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  const filename = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
  // If filename starts with '.' and has no other dot, return the full filename (e.g. ".DS_Store", ".gitignore")
  if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
    return filename.toLowerCase();
  }
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot < 1 || lastDot === filePath.length - 1) {
    return '';
  }
  if (lastDot < lastSlash) {
    return '';
  }
  return filePath.substring(lastDot).toLowerCase();
}

export function filterMediaBinaries(filePath: string, mimeType?: string): { excluded: boolean; reason: string; isText: boolean } {
  // 1. Check cache/build directories
  if (isLikelyBinaryOrCacheDir(filePath)) {
    return { excluded: true, reason: 'Cache/Build Directory', isText: false };
  }

  // 2. Get file extension
  const extension = getExtension(filePath);

  if (extension) {
    // Special case: If .svg and MIME type indicates SVG, treat as text
    if (extension === '.svg' && mimeType && mimeType.toLowerCase() === 'image/svg+xml') {
      return { excluded: false, reason: '', isText: true };
    }
    if (commonBinaryExtensions.has(extension)) {
      return { excluded: true, reason: 'Binary/Media Extension', isText: false };
    }
    if (commonTextExtensions.has(extension)) {
      return { excluded: false, reason: '', isText: true };
    }
    // Extension exists but is unknown.
    // If MIME type is provided, use it:
    if (mimeType) {
      const typeLower = mimeType.toLowerCase();
      if (typeLower.startsWith('image/') || typeLower.startsWith('audio/') || typeLower.startsWith('video/') ||
          typeLower === 'application/zip' || typeLower === 'application/octet-stream' || typeLower === 'application/pdf') {
        if (typeLower === 'image/svg+xml') {
          return { excluded: false, reason: '', isText: true };
        }
        return { excluded: true, reason: 'Binary MIME Type', isText: false };
      }
      if (typeLower.startsWith('text/') || typeLower.includes('javascript') || typeLower.includes('json') || typeLower.includes('xml')) {
        return { excluded: false, reason: '', isText: true };
      }
    }
    // No MIME type provided or inconclusive: for unknown extension, default to excluding it.
    return { excluded: false, reason: 'Unknown Extension', isText: true };
  } else {
    // No extension found. Check for common nameless text files.
    const filename = filePath.split('/').pop() || '';
    const commonNamelessTextFiles = ['makefile', 'dockerfile', 'readme', 'license', 'vagrantfile', '.gitignore', '.gitattributes'];
    if (commonNamelessTextFiles.includes(filename.toLowerCase())) {
      return { excluded: false, reason: '', isText: true };
    }
    // If MIME type is provided, try to use it.
    if (mimeType) {
      const typeLower = mimeType.toLowerCase();
      if (typeLower.startsWith('text/') || typeLower.includes('javascript') || typeLower.includes('json') || typeLower.includes('xml')) {
        return { excluded: false, reason: '', isText: true };
      }
      if (typeLower.startsWith('image/') || typeLower.startsWith('audio/') || typeLower.startsWith('video/') ||
          typeLower === 'application/zip' || typeLower === 'application/octet-stream' || typeLower === 'application/pdf') {
        if (typeLower === 'image/svg+xml') {
          return { excluded: false, reason: '', isText: true };
        }
        return { excluded: true, reason: 'Binary MIME Type', isText: false };
      }
    }
    // Default for files with no extension: assume text.
    return { excluded: false, reason: '', isText: true };
  }
}
