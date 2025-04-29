import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FileListItemRenderer from './FileListItemRenderer';
import { ProcessableFile } from '../../types';
import { ThemeProvider } from '@mui/material';
import theme from '../../styles/theme';
import { getFilename, createMockFile } from '../../utils/testing';


describe('<FileListItemRenderer />', () => {
    let mockOnToggle: ReturnType<typeof vi.fn>;
    let mockOnPreview: ReturnType<typeof vi.fn>;
    let sampleIncludedFile: ProcessableFile;
    let sampleExcludedFile: ProcessableFile;
    const user = userEvent.setup();

    beforeEach(() => {
        mockOnToggle = vi.fn();
        mockOnPreview = vi.fn();
        sampleIncludedFile = createMockFile('src/app.js', true);
        sampleExcludedFile = createMockFile('logs/debug.log', false);
    });

    // Helper to render with Theme context if needed for styling checks
    const renderItem = (props: Partial<React.ComponentProps<typeof FileListItemRenderer>>) => {
        const defaultProps: React.ComponentProps<typeof FileListItemRenderer> = {
            file: sampleIncludedFile,
            depth: 1,
            isIncluded: true,
            isOverridden: false,
            tooltipText: 'Mock Tooltip Included',
            onToggle: mockOnToggle,
            onPreview: mockOnPreview,
            ...props,
        };
        // Wrap in List for context if ListItem requires it, and ThemeProvider
        return render(
             <ThemeProvider theme={theme}>
                 <ul> {/* Simulate List context */}
                    <FileListItemRenderer {...defaultProps} />
                 </ul>
             </ThemeProvider>
        );
    };

    it('renders filename and description icon', () => {
        renderItem({});
        expect(screen.getByText('app.js')).toBeInTheDocument();
        expect(screen.getByTestId('DescriptionIcon')).toBeInTheDocument();
    });

    it('applies indentation based on depth', () => {
        const { container } = renderItem({ depth: 3 });
        // Check style directly or via snapshot if preferred
        const listItem = container.querySelector('li');
        expect(listItem).toHaveStyle(`padding-left: ${24 + 3 * 12}px`); // Based on default MUI spacing and our calculation pl: 3 + depth * 1.5 => 3*8px + 3*1.5*8px
    });

    it('shows included state correctly (auto)', () => {
        renderItem({ file: sampleIncludedFile, isIncluded: true, isOverridden: false });
        const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
        // Check for the CheckBoxIcon with success color (MUI class might be specific)
        expect(within(toggleButton).getByTestId('CheckBoxIcon')).toHaveClass('MuiSvgIcon-colorSuccess');
    });

    it('shows included state correctly (overridden)', () => {
        renderItem({ file: sampleExcludedFile, isIncluded: true, isOverridden: true }); // Originally excluded, now included
        const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
        expect(within(toggleButton).getByTestId('CheckBoxIcon')).toHaveClass('MuiSvgIcon-colorPrimary'); // Primary color for override
    });

    it('shows excluded state correctly (auto)', () => {
        renderItem({ file: sampleExcludedFile, isIncluded: false, isOverridden: false });
        const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
        expect(within(toggleButton).getByTestId('CheckBoxOutlineBlankIcon')).toHaveClass('MuiSvgIcon-colorDisabled'); // Disabled color
    });

     it('shows excluded state correctly (overridden)', () => {
        renderItem({ file: sampleIncludedFile, isIncluded: false, isOverridden: true }); // Originally included, now excluded
        const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
        expect(within(toggleButton).getByTestId('CheckBoxOutlineBlankIcon')).toHaveClass('MuiSvgIcon-colorAction'); // Action color for override
    });


    it('calls onToggle with file path when toggle button is clicked', async () => {
        renderItem({ file: sampleIncludedFile });
        const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
        await user.click(toggleButton);
        expect(mockOnToggle).toHaveBeenCalledTimes(1);
        expect(mockOnToggle).toHaveBeenCalledWith(sampleIncludedFile.relativePath);
    });

    it('calls onPreview with file object when preview button is clicked', async () => {
        renderItem({ file: sampleIncludedFile });
        const previewButton = screen.getByRole('button', { name: /Preview app.js/i });
        await user.click(previewButton);
        expect(mockOnPreview).toHaveBeenCalledTimes(1);
        expect(mockOnPreview).toHaveBeenCalledWith(sampleIncludedFile);
    });

     it('displays the correct tooltip text on hover over toggle button', async () => {
         const tooltipText = "Test Tooltip Content";
         renderItem({ tooltipText: tooltipText });
         const toggleButton = screen.getByRole('button', { name: /toggle inclusion/i });
         await user.hover(toggleButton);
         expect(await screen.findByRole('tooltip', { name: tooltipText })).toBeInTheDocument();
         await user.unhover(toggleButton); // Important cleanup for subsequent finds
     });

     it('displays the full path tooltip on hover over list item text', async () => {
          renderItem({ file: sampleIncludedFile });
          const textElement = screen.getByText(getFilename(sampleIncludedFile.relativePath));
          await user.hover(textElement);
           expect(await screen.findByRole('tooltip', { name: sampleIncludedFile.relativePath })).toBeInTheDocument();
          await user.unhover(textElement);
     });

});
