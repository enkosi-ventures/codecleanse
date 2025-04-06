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
  '.lock', // e.g., package-lock.json, yarn.lock (often included, but can be large/binary-like) - Reconsider if needed
  '.bin', '.dat', '.bak', '.swp', '.swo', '.DS_Store',
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
  '.gitignore', '.gitattributes', '.editorconfig', 'Dockerfile', '.dockerignore',
  '.npmrc', '.yarnrc',
  // SQL
  '.sql'
]);

// Common cache/dependency directory names (match anywhere in path)
const cacheDirPatterns = [
  'node_modules/', // Be careful with trailing slash for directory match
  '.cache/',
  'build/',
  'dist/',
  'target/', // Java/Rust
  'bin/', // .NET/Go/others
  'obj/', // .NET
  '__pycache__/',
  'vendor/', // PHP/Go/Ruby
  '.idea/', // JetBrains IDEs
  '.vscode/', // VS Code settings (can contain cache)
  '.yarn/',
  '.pnp.cjs', '.pnp.loader.mjs', // Yarn PnP files
];

// Check if a path indicates a directory likely containing binaries or cache
function isLikelyBinaryOrCacheDir(filePath: string): boolean {
  return cacheDirPatterns.some(pattern => filePath.includes(pattern));
}

// Check based on file extension
function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  // Ensure dot is not the first character and exists
  if (lastDot < 1 || lastDot === filePath.length - 1) {
    return ''; // No extension or hidden file like .gitignore
  }
  // Handle paths like 'archive.tar.gz' -> return '.gz'
  const lastSlash = filePath.lastIndexOf('/');
  if (lastDot < lastSlash) {
    return ''; // Dot is part of a directory name
  }

  return filePath.substring(lastDot).toLowerCase();
}

export function filterMediaBinaries(filePath: string, mimeType?: string): { excluded: boolean; reason: string; isText: boolean } {
  // 1. Check common cache/build directories first
  if (isLikelyBinaryOrCacheDir(filePath)) {
    return { excluded: true, reason: 'Cache/Build Directory', isText: false };
  }

  // 2. Check file extension
  const extension = getExtension(filePath);

  if (commonBinaryExtensions.has(extension)) {
    return { excluded: true, reason: 'Binary/Media Extension', isText: false };
  }

  if (commonTextExtensions.has(extension)) {
    return { excluded: false, reason: '', isText: true };
  }

  // 3. Basic MIME type check (if available) - less reliable, browser-dependent
  if (mimeType) {
    const typeLower = mimeType.toLowerCase();
    if (typeLower.startsWith('image/') || typeLower.startsWith('audio/') || typeLower.startsWith('video/') || typeLower === 'application/zip' || typeLower === 'application/octet-stream' || typeLower === 'application/pdf') {
      // Check if it's SVG (XML-based, often text)
      if (typeLower !== 'image/svg+xml') {
        return { excluded: true, reason: 'Binary MIME Type', isText: false };
      } else {
        // SVG is XML-based, treat as text unless extension filter caught it
        return { excluded: false, reason: '', isText: true };
      }
    }
    if (typeLower.startsWith('text/') || typeLower.includes('javascript') || typeLower.includes('json') || typeLower.includes('xml')) {
      return { excluded: false, reason: '', isText: true };
    }
  }

  // 4. Default: If unknown extension and no clear MIME type, assume text but warn?
  // Or assume binary to be safe? Let's assume text for now, as most code files should
  // be caught by commonTextExtensions. Files without extensions are often text (Makefile, Dockerfile, etc.)
  // We might want to read the first few bytes later for a better check if needed.
  // Check for files with no extension often used as text
  const filename = filePath.split('/').pop() || '';
  if (filename && !filename.includes('.')) { // No extension
    const commonNamelessTextFiles = ['makefile', 'dockerfile', 'readme', 'license', 'vagrantfile'];
    if (commonNamelessTextFiles.includes(filename.toLowerCase())) {
      return { excluded: false, reason: '', isText: true };
    }
  }


  // Default assumption for unknown types
  console.warn(`File type uncertain for ${filePath} (ext: ${extension}, mime: ${mimeType}). Assuming text.`);
  return { excluded: false, reason: '', isText: true }; // Default to include as text if unsure
}

// Simple test cases
/*
console.log(filterMediaBinaries('src/image.png'));   // true (binary)
console.log(filterMediaBinaries('src/index.js'));    // false (text)
console.log(filterMediaBinaries('docs/document.pdf')); // true (binary)
console.log(filterMediaBinaries('node_modules/lib/index.js')); // true (cache dir)
console.log(filterMediaBinaries('archive.tar.gz')); // true (binary ext)
console.log(filterMediaBinaries('README.md'));      // false (text)
console.log(filterMediaBinaries('Makefile'));       // false (text - common nameless)
console.log(filterMediaBinaries('unknown.xyz'));    // false (text - default assumption)
console.log(filterMediaBinaries('.DS_Store'));      // true (binary ext)
console.log(filterMediaBinaries('image.svg', 'image/svg+xml')); // false (text - exception for svg mime)
console.log(filterMediaBinaries('data', 'application/octet-stream')); // true (binary mime)
*/