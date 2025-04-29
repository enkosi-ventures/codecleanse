import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileOverrideToolbar from './FileOverrideToolbar';

describe('<FileOverrideToolbar />', () => {
  let mockOnSearchChange: ReturnType<typeof vi.fn>;
  let mockOnHideExcludedChange: ReturnType<typeof vi.fn>;
  let mockOnSelectAll: ReturnType<typeof vi.fn>;
  let mockOnDeselectAll: ReturnType<typeof vi.fn>;
  const user = userEvent.setup();

  beforeEach(() => {
    mockOnSearchChange = vi.fn();
    mockOnHideExcludedChange = vi.fn();
    mockOnSelectAll = vi.fn();
    mockOnDeselectAll = vi.fn();
  });

  const renderToolbar = (props = {}) => {
    const defaultProps = {
      searchTerm: '',
      onSearchChange: mockOnSearchChange,
      hideExcluded: false,
      onHideExcludedChange: mockOnHideExcludedChange,
      onSelectAll: mockOnSelectAll,
      onDeselectAll: mockOnDeselectAll,
      hasVisibleFiles: true,
      disabled: false,
      ...props,
    };
    return render(<FileOverrideToolbar {...defaultProps} />);
  };

  it('renders search input, hide toggle, and action buttons', () => {
    renderToolbar();
    expect(screen.getByLabelText(/Search Filename\/Path/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Hide Auto-Excluded/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Include All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exclude All/i })).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    renderToolbar();
    const searchInput = screen.getByLabelText(/Search Filename\/Path/i);
    await user.type(searchInput, 'test');
    expect(mockOnSearchChange).toHaveBeenCalledWith('t');
    expect(mockOnSearchChange).toHaveBeenCalledWith('e');
    expect(mockOnSearchChange).toHaveBeenCalledWith('s');
    expect(mockOnSearchChange).toHaveBeenCalledWith('t');
  });

  it('calls onHideExcludedChange when toggle is clicked', async () => {
    renderToolbar({ hideExcluded: false });
    const hideToggle = screen.getByRole('checkbox', { name: /Hide Auto-Excluded/i });
    await user.click(hideToggle);
    expect(mockOnHideExcludedChange).toHaveBeenCalledTimes(1);
    expect(mockOnHideExcludedChange).toHaveBeenCalledWith(true); // Toggled to true
  });

  it('calls onSelectAll when "Include All" button is clicked', async () => {
    renderToolbar();
    const button = screen.getByRole('button', { name: /Include All/i });
    await user.click(button);
    expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onDeselectAll when "Exclude All" button is clicked', async () => {
    renderToolbar();
    const button = screen.getByRole('button', { name: /Exclude All/i });
    await user.click(button);
    expect(mockOnDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when hasVisibleFiles is false', () => {
    renderToolbar({ hasVisibleFiles: false });
    expect(screen.getByRole('button', { name: /Include All/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Exclude All/i })).toBeDisabled();
  });

  it('disables all controls when disabled prop is true', () => {
    renderToolbar({ disabled: true });
    expect(screen.getByLabelText(/Search Filename\/Path/i)).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Hide Auto-Excluded/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Include All/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Exclude All/i })).toBeDisabled();
  });
});