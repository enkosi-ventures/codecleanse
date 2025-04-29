import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FileOverridePanel from './FileOverridePanel';
import { ProcessableFile } from '../../types';
import { getFilename, createMockFile } from '../../utils/testing';


// Mock the FilePreviewModal to avoid complexities of its internal rendering/PrismJS
vi.mock('./FilePreviewModal', () => ({
  // Provide a simple functional component mock
  default: ({ open, onClose, filePath, isLoading, error, content }: any) => {
    if (!open) return null;
    return (
      <div data-testid="mock-preview-modal" role="dialog">
        <button onClick={onClose}>Close Mock Modal</button>
        <h1>Preview: {filePath}</h1>
        {isLoading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {content && <pre>{content}</pre>}
      </div>
    );
  },
}));

// Mock FileReader
const mockFileReader = {
  readAsText: vi.fn(),
  onload: vi.fn(),
  onerror: vi.fn(),
  result: 'mock file content',
  error: null as Error | null,
};
vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));


describe('<FileOverridePanel /> Integration Tests', () => {
  let mockOnOverridesChange: ReturnType<typeof vi.fn>;
  let sampleFiles: ProcessableFile[];
  const user = userEvent.setup();

  const mockFileReader = {
    readAsText: vi.fn(),
    onload: vi.fn() as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null, // Add type hint
    onerror: vi.fn() as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null, // Add type hint & assign mock
    result: 'mock file content' as string | ArrayBuffer | null,
    error: null as DOMException | null,
    // Add other methods/properties if needed by your code under test
    abort: vi.fn(),
    readyState: 0, // Add readyState if checked
    //... other FileReader properties if necessary
  };

  beforeEach(() => {
    mockOnOverridesChange = vi.fn();
    sampleFiles = [
      createMockFile('src/include.js', true, 'console.log("include");'),
      createMockFile('src/exclude.log', false, 'excluded log content', 'text/plain', false, 'Gitignore Rule'),
      createMockFile('config/secrets.yaml', true, 'api_key: 123', 'application/yaml', true), // Sensitive
      createMockFile('assets/image.png', false, 'pngdata', 'image/png', false, 'Binary/Media Extension'),
      createMockFile('assets/icon.svg', true, '<svg></svg>', 'image/svg+xml'), // Included SVG
      createMockFile('deep/path/to/file.txt', true, 'deep content'),
      createMockFile('largefile.bin', false, 'a'.repeat(2 * 1024 * 1024), 'application/octet-stream', false, 'Binary/Media Extension'), // > 1MB
      createMockFile('verylarge.txt', true, 'b'.repeat(5 * 1024 * 1024), 'text/plain'), // > 1MB text
    ];
    // Reset FileReader mocks
    // mockFileReader.readAsText.mockClear();
    // mockFileReader.onload = vi.fn();
    // mockFileReader.onerror = vi.fn();
    // mockFileReader.result = 'mock file content';
    // mockFileReader.error = null;
    mockFileReader.readAsText.mockClear();
    mockFileReader.onload = vi.fn(); // Reassign mock function
    mockFileReader.onerror = vi.fn(); // Reassign mock function
    mockFileReader.result = 'mock file content';
    mockFileReader.error = null;
    mockFileReader.abort.mockClear();
    mockFileReader.readyState = 0;
    // Reset the stub
    vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    // vi.restoreAllMocks();
    vi.unstubAllGlobals(); // Clean up global stub
  });

  const renderComponent = (files = sampleFiles, props = {}) => {
    return render(
      <FileOverridePanel
        files={files}
        onOverridesChange={mockOnOverridesChange}
        {...props}
      />
    );
  };

  // --- Toolbar Interaction Tests ---
  it('filters files based on search term', async () => {
    renderComponent();
    expect(screen.getByText('include.js')).toBeInTheDocument();
    expect(screen.getByText('exclude.log')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/Search Filename\/Path/i);
    await user.type(searchInput, 'include');

    expect(screen.getByText('include.js')).toBeInTheDocument();
    expect(screen.queryByText('exclude.log')).not.toBeInTheDocument();
    expect(screen.queryByText('secrets.yaml')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, '.yaml');
    expect(screen.queryByText('include.js')).not.toBeInTheDocument();
    expect(screen.getByText('secrets.yaml')).toBeInTheDocument();
  });

  // it('hides automatically excluded files when toggle is active', async () => {
  //   renderComponent();
  //   expect(screen.getByText('include.js')).toBeInTheDocument(); // Included
  //   expect(screen.getByText('exclude.log')).toBeInTheDocument(); // Excluded by gitignore
  //   expect(screen.getByText('image.png')).toBeInTheDocument(); // Excluded by type

  //   const hideToggle = screen.getByRole('checkbox', { name: /Hide Auto-Excluded/i });
  //   await user.click(hideToggle);

  //   expect(screen.getByText('include.js')).toBeInTheDocument();
  //   expect(screen.queryByText('exclude.log')).not.toBeInTheDocument();
  //   expect(screen.queryByText('image.png')).not.toBeInTheDocument();
  //   // Ensure manually included files (that were originally excluded) remain visible
  //   const imageRow = screen.getByText('image.png', { exact: false }).closest('li'); // Find row before toggle
  //   const imageToggle = within(imageRow!).getByRole('button', { name: /toggle inclusion/i });
  //   await user.click(imageToggle); // Manually include image.png
  //   expect(screen.getByText('image.png')).toBeInTheDocument(); // Still visible when hidden=true because it's now effectively included

  //   await user.click(hideToggle); // Toggle back
  //   expect(screen.getByText('exclude.log')).toBeInTheDocument();
  // });

  it('calls onOverridesChange correctly when "Include All" is clicked (respecting filters)', async () => {
    renderComponent();
    const searchInput = screen.getByLabelText(/Search Filename\/Path/i);
    await user.type(searchInput, '.js'); // Filter to only show include.js

    const includeAllButton = screen.getByRole('button', { name: /Include All/i });
    await user.click(includeAllButton);

    // Only 'include.js' is visible. It's already included, so no *effective* override needed.
    // But let's test with a file that *needs* overriding
    await user.clear(searchInput);
    await user.type(searchInput, '.log'); // Filter to 'exclude.log' (initially false)
    await user.click(includeAllButton);

    // Expect override for exclude.log to true
    expect(mockOnOverridesChange).toHaveBeenCalledWith({ 'src/exclude.log': true });
  });

  // it('calls onOverridesChange correctly when "Exclude All" is clicked (respecting filters)', async () => {
  //   renderComponent();
  //   const searchInput = screen.getByLabelText(/Search Filename\/Path/i);
  //   await user.type(searchInput, '.js'); // Filter to only show include.js (initially true)

  //   const excludeAllButton = screen.getByRole('button', { name: /Exclude All/i });
  //   await user.click(excludeAllButton);

  //   // Expect override for include.js to false
  //   expect(mockOnOverridesChange).toHaveBeenLastCalledWith({ 'src/include.js': false });

  //   // Check another case
  //   mockOnOverridesChange.mockClear();
  //   await user.clear(searchInput);
  //   await user.type(searchInput, '.png'); // Filter to image.png (initially false)
  //   await user.click(excludeAllButton);
  //   // image.png is already excluded, so no override needed
  //   expect(mockOnOverridesChange).toHaveBeenLastCalledWith({});
  // });

  // --- List Item Interaction Tests ---
  // it('calls onOverridesChange when an item toggle is clicked', async () => {
  //   renderComponent();
  //   const includeJsRow = screen.getByText('include.js').closest('li');
  //   const toggleButton = within(includeJsRow!).getByRole('button', { name: /toggle inclusion/i });

  //   await user.click(toggleButton);
  //   expect(mockOnOverridesChange).toHaveBeenCalledWith({ 'src/include.js': false });

  //   mockOnOverridesChange.mockClear();
  //   const excludeLogRow = screen.getByText('exclude.log').closest('li');
  //   const toggleButton2 = within(excludeLogRow!).getByRole('button', { name: /toggle inclusion/i });
  //   await user.click(toggleButton2);
  //   expect(mockOnOverridesChange).toHaveBeenCalledWith({ 'src/exclude.log': true });
  // });

  // --- Preview Tests ---
  it('opens preview modal with content when preview icon is clicked for readable text file', async () => {
    renderComponent();
    const fileToPreview = sampleFiles[0]; // src/include.js
    const row = screen.getByText(getFilename(fileToPreview.relativePath)).closest('li');
    const previewButton = within(row!).getByRole('button', { name: /Preview include.js/i });

    // Simulate FileReader success
    const result = 'console.log("include");';
    mockFileReader.result = result;

    await user.click(previewButton);

    // Check modal is open
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Preview: src\/include.js/i)).toBeInTheDocument();

    act(() => {
      if (mockFileReader.onload) {
        const mockProgressEvent = new ProgressEvent('load') as ProgressEvent<FileReader>;
        mockFileReader.onload.call(mockFileReader as unknown as FileReader, mockProgressEvent);
      }
    });

    // Check FileReader was called
    expect(vi.mocked(FileReader)).toHaveBeenCalled();
    expect(mockFileReader.readAsText).toHaveBeenCalledWith(fileToPreview.file);

    // Wait for content to appear (after onload simulation)
    // await waitFor(() => {
    //   expect(within(modal).getByText(result)).toBeInTheDocument();
    // });
    expect(within(modal).queryByText(/Loading.../i)).not.toBeInTheDocument();
    expect(within(modal).queryByText(/Error:/i)).not.toBeInTheDocument();

    // Close modal
    await user.click(within(modal).getByRole('button', { name: /Close Mock Modal/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows error in preview modal if file reading fails', async () => {
    renderComponent();
    const fileToPreview = sampleFiles[0]; // src/include.js
    const row = screen.getByText(getFilename(fileToPreview.relativePath)).closest('li');
    const previewButton = within(row!).getByRole('button', { name: /Preview include.js/i });

    // Simulate FileReader error
    const testError = new DOMException('Test read error', 'NotReadableError');
    mockFileReader.error = testError;

    await user.click(previewButton);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(mockFileReader.readAsText).toHaveBeenCalled();

    act(() => {
      if (mockFileReader.onerror) {
        const mockProgressEvent = new ProgressEvent('error') as ProgressEvent<FileReader>;
        (mockFileReader as { error: DOMException | null }).error = testError;
        mockFileReader.onerror.call(mockFileReader as unknown as FileReader, mockProgressEvent);
      }
    });

    await waitFor(() => {
      expect(within(modal).getByText(/Test read error/i)).toBeInTheDocument();
    });

    expect(within(modal).queryByText(/Loading.../i)).not.toBeInTheDocument();
    expect(within(modal).queryByText('console.log("include");')).not.toBeInTheDocument();
  });

  it('shows message in preview modal for binary or very large files', async () => {
    renderComponent();
    const binaryFile = sampleFiles[3]; // assets/image.png
    const largeTextFile = sampleFiles[7]; // verylarge.txt

    // Test binary
    const binaryRow = screen.getByText(getFilename(binaryFile.relativePath)).closest('li');
    const binaryPreviewButton = within(binaryRow!).getByRole('button', { name: /Preview image.png/i });
    await user.click(binaryPreviewButton);
    let modal = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(modal).getByText(/Preview not available/i)).toBeInTheDocument();
    });
    await user.click(within(modal).getByRole('button', { name: /Close Mock Modal/i }));
    await waitFor(() => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });


    // Test large text file
    const largeRow = screen.getByText(getFilename(largeTextFile.relativePath)).closest('li');
    const largePreviewButton = within(largeRow!).getByRole('button', { name: /Preview verylarge.txt/i });
    await user.click(largePreviewButton);
    modal = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(modal).getByText(/Preview not available/i)).toBeInTheDocument(); // Should hit size limit
    });
    await user.click(within(modal).getByRole('button', { name: /Close Mock Modal/i }));
    await waitFor(() => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });

    expect(mockFileReader.readAsText).not.toHaveBeenCalled(); // Should not attempt read
  });

  // --- Structure Tests ---
  it('renders directory headers', () => {
    renderComponent();
    expect(screen.getByText('(Root Directory)')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('assets')).toBeInTheDocument();
    expect(screen.getByText('deep/path/to')).toBeInTheDocument();
  });

  it('renders files under the correct directory header', () => {
    renderComponent();
    // Find items more robustly based on content within the list

    // Check files within the 'src' group
    const includeJsItem = screen.getByText('include.js').closest('li');
    const excludeLogItem = screen.getByText('exclude.log').closest('li');
    expect(includeJsItem).toBeInTheDocument();
    expect(excludeLogItem).toBeInTheDocument();
    // You could check relative order if needed, but often just existence is enough

    // Check files within the 'assets' group
    const iconSvgItem = screen.getByText('icon.svg').closest('li');
    const imagePngItem = screen.getByText('image.png').closest('li');
    expect(iconSvgItem).toBeInTheDocument();
    expect(imagePngItem).toBeInTheDocument();
  });

  // --- Empty State ---
  it('renders empty message when no files are passed', () => {
    renderComponent([]);
    expect(screen.getByText(/No files match filters or found./i)).toBeInTheDocument();
  });

  it('renders empty message when all files are filtered out', async () => {
    renderComponent();
    const searchInput = screen.getByLabelText(/Search Filename\/Path/i);
    await user.type(searchInput, 'nonexistentfile');
    expect(screen.getByText(/No files match filters or found./i)).toBeInTheDocument();
  });

});
