import { describe, it, expect } from 'vitest';
import { filterMediaBinaries } from './mediaBinaryFilter';

describe('filterMediaBinaries', () => {

  // --- Binary Extensions ---
  it('should exclude common binary file extensions', () => {
    const binaryExtensions = ['.zip', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp3', '.wav', '.mp4', '.mov', '.avi', '.exe', '.dll', '.so', '.dylib', '.db', '.sqlite', '.ttf', '.otf', '.woff', '.woff2', '.pyc', '.class', '.wasm', '.jar', '.gz', '.tar', '.rar', '.7z', '.iso', '.webp', '.ico', '.lock', '.bin', '.dat', '.bak', '.swp', '.swo', '.DS_Store'];
    binaryExtensions.forEach(ext => {
      const result = filterMediaBinaries(`path/to/file${ext}`);
      expect(result.excluded, `Extension ${ext} should be excluded`).toBe(true);
      expect(result.reason, `Reason for ${ext}`).toContain('Binary/Media Extension');
      expect(result.isText, `isText for ${ext}`).toBe(false);
    });
  });

  // --- Text Extensions ---
  it('should include common text file extensions', () => {
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash', '.html', '.htm', '.css', '.scss', '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env', '.txt', '.md', '.log', '.csv', '.tsv', '.gitignore', '.gitattributes', '.editorconfig', 'Dockerfile', '.sql', '.vue', '.svelte'];
    textExtensions.forEach(ext => {
      const result = filterMediaBinaries(`path/to/file${ext}`);
      expect(result.excluded, `Extension ${ext} should be included`).toBe(false);
      expect(result.isText, `isText for ${ext}`).toBe(true);
    });
    // Test files with no extension but common names
    expect(filterMediaBinaries('Makefile').excluded).toBe(false);
    expect(filterMediaBinaries('README').excluded).toBe(false);
    expect(filterMediaBinaries('LICENSE').excluded).toBe(false);
    expect(filterMediaBinaries('Dockerfile').excluded).toBe(false);
  });

  // --- Cache/Build Directories ---
  it('should exclude files within common cache/build directories', () => {
    const dirs = ['node_modules/dep/file.js', '.cache/temp.dat', 'build/output.bin', 'dist/bundle.js', 'target/myapp.jar', 'bin/run.exe', 'obj/lib.o', '__pycache__/module.cpython-39.pyc', 'vendor/lib/file.php', '.idea/workspace.xml', '.vscode/settings.json', '.yarn/releases/yarn-3.2.0.cjs'];
    dirs.forEach(path => {
      const result = filterMediaBinaries(path);
      expect(result.excluded, `Path ${path} should be excluded`).toBe(true);
      expect(result.reason, `Reason for ${path}`).toContain('Cache/Build Directory');
      expect(result.isText, `isText for ${path}`).toBe(false);
    });
  });

  it('should not exclude files in directories with similar names', () => {
    expect(filterMediaBinaries('src/node_module_simulator/file.js').excluded).toBe(false);
    expect(filterMediaBinaries('my_distribution/package.zip').excluded).toBe(true); // Excluded by ext, not dir name
    expect(filterMediaBinaries('my_target_directory/config.txt').excluded).toBe(false);
  });


  // --- MIME Types ---
  it('should use MIME type as a hint when available', () => {
    // Binary MIME types
    expect(filterMediaBinaries('image_no_ext', 'image/png').excluded).toBe(true);
    expect(filterMediaBinaries('audio_no_ext', 'audio/mpeg').excluded).toBe(true);
    expect(filterMediaBinaries('video_no_ext', 'video/mp4').excluded).toBe(true);
    expect(filterMediaBinaries('archive_no_ext', 'application/zip').excluded).toBe(true);
    expect(filterMediaBinaries('unknown_binary', 'application/octet-stream').excluded).toBe(true);
    expect(filterMediaBinaries('document', 'application/pdf').excluded).toBe(true);

    // Text MIME types
    expect(filterMediaBinaries('script_no_ext', 'text/javascript').excluded).toBe(false);
    expect(filterMediaBinaries('data_no_ext', 'application/json').excluded).toBe(false);
    expect(filterMediaBinaries('markup_no_ext', 'application/xml').excluded).toBe(false);
    expect(filterMediaBinaries('plain_text', 'text/plain').excluded).toBe(false);

    // Special case: SVG (XML based, should be treated as text)
    const svgResult = filterMediaBinaries('icon.svg', 'image/svg+xml');
    expect(svgResult.excluded).toBe(false);
    expect(svgResult.isText).toBe(true);

    // Mime takes precedence over unknown extension? Depends on logic order.
    // Current logic: Dirs -> Known Ext -> Mime -> Default
    const unknownExtBinaryMime = filterMediaBinaries('unknown.binarymime', 'application/octet-stream');
    expect(unknownExtBinaryMime.excluded).toBe(true); // Mime should catch it
    expect(unknownExtBinaryMime.reason).toBe('Binary MIME Type');

    const unknownExtTextMime = filterMediaBinaries('unknown.textmime', 'text/plain');
    expect(unknownExtTextMime.excluded).toBe(false); // Mime should identify as text
    expect(unknownExtTextMime.isText).toBe(true);
  });

  // --- Edge Cases / Unknown ---
  it('should handle files with no extension or unknown extensions', () => {
    // Common text files with no extension handled above
    // Unknown extension
    const unknownResult = filterMediaBinaries('file.unknown');
    expect(unknownResult.excluded).toBe(false); // Default assumption is text
    expect(unknownResult.isText).toBe(true);

    // Hidden files (like .config) - no extension based on logic
    const hiddenResult = filterMediaBinaries('.config');
    expect(hiddenResult.excluded).toBe(false); // Default assumption is text
    expect(hiddenResult.isText).toBe(true);
    // However, .DS_Store, .lock are caught by binaryExtensions
    expect(filterMediaBinaries('.DS_Store').excluded).toBe(true);

    // File path with dots in directory names
    const dotsInPath = filterMediaBinaries('path/to.a.directory/file.txt');
    expect(dotsInPath.excluded).toBe(false);
    expect(dotsInPath.isText).toBe(true);

    const doubleExt = filterMediaBinaries('archive.tar.gz');
    expect(doubleExt.excluded).toBe(true); // .gz is binary
    expect(doubleExt.reason).toBe('Binary/Media Extension');

    const noPathFile = filterMediaBinaries('onlyfilename.txt');
    expect(noPathFile.excluded).toBe(false);
    expect(noPathFile.isText).toBe(true);
  });
});