import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // For more realistic interactions
import React from 'react';

import FileUploader from './FileUploader';

describe('<FileUploader />', () => {
  let mockOnFilechange: ReturnType<typeof vi.fn>;
  let mockOnDragOver: ReturnType<typeof vi.fn>;
  let mockOnDrop: ReturnType<typeof vi.fn>;
  let inputRef: React.RefObject<HTMLInputElement | null>;

  beforeEach(() => {
    mockOnFilechange = vi.fn();
    mockOnDragOver = vi.fn();
    mockOnDrop = vi.fn();
    inputRef = React.createRef();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      onFileChange: mockOnFilechange,
      onDragOver: mockOnDragOver,
      onDrop: mockOnDrop,
      inputRef: inputRef,
      disabled: false,
      ...props,
    };
    return render((<FileUploader {...defaultProps} />));
  };

  it('renders the upload prompt and button', () => {
    renderComponent();
    expect(screen.getByText(/drag & drop your project folder here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse folder/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/drag & drop/i)).toBeInTheDocument(); // Checks the Box accessibility via text
  });

  it('triggers input click when the dropzone area is clicked', async () => {
    const user = userEvent.setup();
    // Create a mock input element and assign it to the ref
    const mockInput = document.createElement('input');
    mockInput.type = 'file';
    mockInput.click = vi.fn(); // Mock the click method
    (inputRef as React.RefObject<HTMLInputElement | null>).current = mockInput; // Assign to ref

    renderComponent();
    const dropzone = screen.getByText(/drag & drop/i).closest('div'); // Find the Box container
    expect(dropzone).toBeInTheDocument();

    await user.click(dropzone!);

    expect(mockInput.click).toHaveBeenCalledTimes(1);
  });

  it('triggers input click when the "Browse Folder" button is clicked', async () => {
    const user = userEvent.setup();
    const mockInput = document.createElement('input');
    mockInput.type = 'file';
    mockInput.click = vi.fn();
    (inputRef as React.RefObject<HTMLInputElement | null>).current = mockInput;

    renderComponent();
    const button = screen.getByRole('button', { name: /browse folder/i });
    await user.click(button);
    expect(mockInput.click).toHaveBeenCalledTimes(1);
  });


  it('calls onFileChange when files are selected via input', async () => {
    const user = userEvent.setup();
    renderComponent();

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');

    await user.upload(input, file);

    expect(mockOnFilechange).toHaveBeenCalledTimes(1);
  });

  it('calls onDrop and changes style on file drop', () => {
    renderComponent();
    const dropzone = screen.getByText(/drag & drop/i).closest('div')!;

    // Simulate drag over to potentially set state needed for drop
    fireEvent.dragEnter(dropzone, {
      dataTransfer: { files: [new File([''], 'test.txt')] }, // Mock dataTransfer
    });
    expect(dropzone).toHaveClass('drag-over'); // Check style change

    // Simulate drop
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File([''], 'test.txt')] },
    });

    expect(mockOnDrop).toHaveBeenCalledTimes(1);
    expect(dropzone).not.toHaveClass('drag-over'); // Style should reset
  });

  it('calls onDragOver when dragging over', () => {
    renderComponent();
    const dropzone = screen.getByText(/drag & drop/i).closest('div')!;
    fireEvent.dragOver(dropzone, {
      dataTransfer: { files: [new File([''], 'test.txt')] },
    });
    expect(mockOnDragOver).toHaveBeenCalled(); // Called by internal handler
  });


  it('disables interactions when disabled prop is true', async () => {
    const user = userEvent.setup();
    const mockInput = document.createElement('input');
    mockInput.type = 'file';
    mockInput.click = vi.fn();
    (inputRef as React.RefObject<HTMLInputElement | null>).current = mockInput;

    renderComponent({ disabled: true });

    const dropzone = screen.getByText(/drag & drop/i).closest('div')!;
    const button = screen.getByRole('button', { name: /browse folder/i });
    const input = screen.getByLabelText(/drag & drop/i).querySelector('input[type="file"]')!;

    // Check attributes
    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
    expect(dropzone).toHaveStyle('cursor: not-allowed');
    expect(dropzone).toHaveStyle('opacity: 0.6');

    // Attempt interactions
    await user.click(dropzone);
    expect(mockInput.click).not.toHaveBeenCalled();

    await user.click(button);
    expect(mockInput.click).not.toHaveBeenCalled();

    // Try dropping (the event handlers prevent callback if disabled)
    fireEvent.drop(dropzone, { dataTransfer: { files: [new File([''], 'd.txt')] } });
    expect(mockOnDrop).not.toHaveBeenCalled();
  });
});