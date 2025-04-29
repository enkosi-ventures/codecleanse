import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileListDisplay from './FileListDisplay';
import { ProcessableFile } from '../../types';
import { createMockFile } from '../../utils/testing';

vi.mock('./FileListItemRenderer', () => ({
  default: ({ file, isIncluded, isOverridden }: any) => (
    <li data-testid={`file-item-${file.relativePath}`}>
      <span>{file.relativePath.split('/').pop()}</span>
      <span>{isIncluded ? 'Included' : 'Excluded'}</span>
      <span>{isOverridden ? 'Overridden' : 'Auto'}</span>
    </li>
  )
}));


describe('<FileListDisplay />', () => {
  let sampleFiles: ProcessableFile[];
  let mockGetEffectiveInclusion: ReturnType<typeof vi.fn>;
  let mockGetFileTooltip: ReturnType<typeof vi.fn>;
  let mockOnToggle: ReturnType<typeof vi.fn>;
  let mockOnPreview: ReturnType<typeof vi.fn>;
  let groupedFiles: any; // Simplified type for test
  let sortedDirs: string[];

  beforeEach(() => {
    sampleFiles = [
      createMockFile('/', true), // Simulating root file if needed
      createMockFile('src/include.js', true),
      createMockFile('src/exclude.log', false),
      createMockFile('config/secrets.yaml', true),
    ];
    // Basic grouping for testing structure
    groupedFiles = {
      '/': [sampleFiles[0]],
      'src': [sampleFiles[1], sampleFiles[2]],
      'config': [sampleFiles[3]],
    };
    sortedDirs = ['/', 'config', 'src']; // Example sorted order

    mockGetEffectiveInclusion = vi.fn((file) => file.include); // Simple mock
    mockGetFileTooltip = vi.fn(() => 'Mock Tooltip');
    mockOnToggle = vi.fn();
    mockOnPreview = vi.fn();
  });

  const renderDisplay = (gFiles = groupedFiles, dirs = sortedDirs, overrides = {}) => {
    return render(
      <FileListDisplay
        groupedFiles={gFiles}
        sortedDirs={dirs}
        localOverrides={overrides}
        getEffectiveInclusion={mockGetEffectiveInclusion}
        getFileTooltip={mockGetFileTooltip}
        onToggle={mockOnToggle}
        onPreview={mockOnPreview}
      />
    );
  };

  it('renders the empty state message when no files are present', () => {
    renderDisplay({}, []);
    expect(screen.getByText(/No files match filters or found./i)).toBeInTheDocument();
  });

  it('renders directory headers based on sortedDirs', () => {
    renderDisplay();
    expect(screen.getByText('(Root Directory)')).toBeInTheDocument();
    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('renders the correct number of file items under each header', () => {
    renderDisplay();
    // Use test IDs from the mock renderer
    expect(screen.getAllByTestId(/^file-item-/)).toHaveLength(sampleFiles.length);
    expect(screen.getByTestId('file-item-src/include.js')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-config/secrets.yaml')).toBeInTheDocument();
  });

  it('does not render headers for directories with no files', () => {
    const filteredGroupedFiles = {
      'src': [sampleFiles[1]], // Only include.js
      // 'config' directory is empty or filtered out
    };
    const filteredSortedDirs = ['src'];
    renderDisplay(filteredGroupedFiles, filteredSortedDirs);

    expect(screen.queryByText('(Root Directory)')).not.toBeInTheDocument();
    expect(screen.queryByText('config')).not.toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument(); // Only src header should be present
    expect(screen.getByTestId('file-item-src/include.js')).toBeInTheDocument();
    expect(screen.queryByTestId('file-item-src/exclude.log')).not.toBeInTheDocument();
  });
});