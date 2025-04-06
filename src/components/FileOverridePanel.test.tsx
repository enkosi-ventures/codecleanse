import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileOverridePanel from './FileOverridePanel';
import { ProcessableFile } from '../types';

const createMockFile = (
  relativePath: string,
  include: boolean,
  sensitiveDetected = false,
  excludeReason?: string
): ProcessableFile => ({
  id: relativePath,
  file: new File(['content'], relativePath.split('/').pop() || 'file', { type: 'text/plain' }), // Mock file object
  relativePath,
  include,
  sensitiveDetected,
  excludeReason,
});

describe('<FileOverridePanel />', () => {
  let mockOnOverridesChange: ReturnType<typeof vi.fn>;
  let sampleFiles: ProcessableFile[];

  beforeEach(() => {
    mockOnOverridesChange = vi.fn();
    sampleFiles = [
      createMockFile('src/include.js', true),
      createMockFile('src/exclude.log', false, false, 'Gitignore Rule'),
      createMockFile('config/secrets.yaml', true, true),
      createMockFile('assets/image.png', false, false, 'Binary/Media Extension'),
      createMockFile('deep/path/to/file.txt', true),
    ];
  });

  const renderComponent = (files = sampleFiles) => {
    return render(<FileOverridePanel files={files} onOverridesChange={mockOnOverridesChange} />);
  };

  it('renders a list item for each file', () => {
    renderComponent();
    expect(screen.getAllByRole('listitem')).toHaveLength(sampleFiles.length);
    sampleFiles.forEach(file => {
      expect(screen.getByText(file.relativePath.split('/').pop()!)).toBeInTheDocument(); // Check filename
      expect(screen.getByText(file.relativePath)).toBeInTheDocument(); // Check full path (secondary text)
    });
  });

  it('shows included files with VisibilityIcon (success color initially)', () => {
    renderComponent();
    const includedFileItem = screen.getByText('include.js').closest('li');
    const visibilityIcon = includedFileItem?.querySelector('[data-testid="VisibilityIcon"]');
    expect(visibilityIcon).toBeInTheDocument();
    expect(visibilityIcon).toHaveClass('MuiSvgIcon-colorSuccess'); // Initial included state
  });

  it('shows excluded files with VisibilityOffIcon (disabled color initially)', () => {
    renderComponent();
    const excludedFileItem = screen.getByText('exclude.log').closest('li');
    const visibilityOffIcon = excludedFileItem?.querySelector('[data-testid="VisibilityOffIcon"]');
    expect(visibilityOffIcon).toBeInTheDocument();
    expect(visibilityOffIcon).toHaveClass('MuiSvgIcon-colorDisabled'); // Initial excluded state
  });

  it('calls onOverridesChange with correct override when toggling an included file', async () => {
    const user = userEvent.setup();
    renderComponent();
    const includedFile = sampleFiles[0]; // src/include.js (initially true)
    const toggleButton = screen.getByText(includedFile.relativePath).closest('li')?.querySelector('button');

    expect(toggleButton).toBeInTheDocument();
    await user.click(toggleButton!);

    // Toggling included (true) -> manually excluded (false override)
    expect(mockOnOverridesChange).toHaveBeenCalledTimes(1);
    expect(mockOnOverridesChange).toHaveBeenCalledWith({ [includedFile.relativePath]: false });
  });

  it('calls onOverridesChange with correct override when toggling an excluded file', async () => {
    const user = userEvent.setup();
    renderComponent();
    const excludedFile = sampleFiles[1]; // src/exclude.log (initially false)
    const toggleButton = screen.getByText(excludedFile.relativePath).closest('li')?.querySelector('button');

    expect(toggleButton).toBeInTheDocument();
    await user.click(toggleButton!);

    // Toggling excluded (false) -> manually included (true override)
    expect(mockOnOverridesChange).toHaveBeenCalledTimes(1);
    expect(mockOnOverridesChange).toHaveBeenCalledWith({ [excludedFile.relativePath]: true });
  });

  it('calls onOverridesChange with empty object when toggling back to automatic state', async () => {
    const user = userEvent.setup();
    renderComponent();
    const fileToToggle = sampleFiles[0]; // src/include.js (initially true)
    const toggleButton = screen.getByText(fileToToggle.relativePath).closest('li')?.querySelector('button');

    // First click: true -> override false
    await user.click(toggleButton!);
    expect(mockOnOverridesChange).toHaveBeenLastCalledWith({ [fileToToggle.relativePath]: false });

    // Second click: override false -> back to automatic (remove override)
    await user.click(toggleButton!);
    expect(mockOnOverridesChange).toHaveBeenCalledTimes(2);
    expect(mockOnOverridesChange).toHaveBeenLastCalledWith({}); // Override removed
  });

  it('calls onOverridesChange correctly when multiple files are toggled', async () => {
    const user = userEvent.setup();
    renderComponent();
    const file1 = sampleFiles[0]; // src/include.js (initially true)
    const file2 = sampleFiles[1]; // src/exclude.log (initially false)

    const button1 = screen.getByText(file1.relativePath).closest('li')?.querySelector('button');
    const button2 = screen.getByText(file2.relativePath).closest('li')?.querySelector('button');

    // Toggle file 1 (true -> override false)
    await user.click(button1!);
    expect(mockOnOverridesChange).toHaveBeenLastCalledWith({ [file1.relativePath]: false });

    // Toggle file 2 (false -> override true)
    await user.click(button2!);
    expect(mockOnOverridesChange).toHaveBeenLastCalledWith({
      [file1.relativePath]: false, // Previous override remains
      [file2.relativePath]: true   // New override added
    });

    // Toggle file 1 again (override false -> automatic)
    await user.click(button1!);
    expect(mockOnOverridesChange).toHaveBeenLastCalledWith({
      // [file1.relativePath] is removed
      [file2.relativePath]: true // file2 override remains
    });
  });


  it('displays correct icon based on override state', async () => {
    const user = userEvent.setup();
    renderComponent();
    const includedFileItem = screen.getByText('include.js').closest('li');
    const toggleButton = includedFileItem?.querySelector('button');

    // Initial: Included (Auto) -> VisibilityIcon, colorSuccess
    expect(includedFileItem?.querySelector('[data-testid="VisibilityIcon"]')).toHaveClass('MuiSvgIcon-colorSuccess');

    // Click 1: Manually Excluded -> VisibilityOffIcon, colorAction
    await user.click(toggleButton!);
    // We need to re-query as the component re-renders with new state potentially changing the icon component type
    const updatedItem1 = screen.getByText('include.js').closest('li');
    expect(updatedItem1?.querySelector('[data-testid="VisibilityOffIcon"]')).toBeInTheDocument();
    expect(updatedItem1?.querySelector('[data-testid="VisibilityOffIcon"]')).toHaveClass('MuiSvgIcon-colorAction');


    // Click 2: Back to Auto (Included) -> VisibilityIcon, colorSuccess
    await user.click(toggleButton!);
    const updatedItem2 = screen.getByText('include.js').closest('li');
    expect(updatedItem2?.querySelector('[data-testid="VisibilityIcon"]')).toBeInTheDocument();
    expect(updatedItem2?.querySelector('[data-testid="VisibilityIcon"]')).toHaveClass('MuiSvgIcon-colorSuccess');
  });

  it('displays tooltip showing file status', async () => {
    const user = userEvent.setup();
    renderComponent();
    const includedFileItem = screen.getByText('include.js').closest('li');
    const toggleButton = includedFileItem?.querySelector('button');

    // Hover over initial state (Included Auto)
    await user.hover(toggleButton!);
    expect(await screen.findByRole('tooltip', { name: /Included \(Auto\)/i })).toBeInTheDocument();
    await user.unhover(toggleButton!); // Important for subsequent finds

    // Click to override (Manually Excluded)
    await user.click(toggleButton!);
    const updatedButton1 = screen.getByText('include.js').closest('li')?.querySelector('button');
    await user.hover(updatedButton1!);
    expect(await screen.findByRole('tooltip', { name: /Manually Excluded/i })).toBeInTheDocument();
    await user.unhover(updatedButton1!);

    // Check sensitive file tooltip
    const sensitiveFileItem = screen.getByText('secrets.yaml').closest('li');
    const sensitiveButton = sensitiveFileItem?.querySelector('button');
    await user.hover(sensitiveButton!);
    expect(await screen.findByRole('tooltip', { name: /Included \(Auto\).*Contains potential secrets/i })).toBeInTheDocument();
    await user.unhover(sensitiveButton!);

  });


  it('renders empty state message when no files are provided', () => {
    renderComponent([]);
    expect(screen.getByText('No files to display.')).toBeInTheDocument();
  });
});