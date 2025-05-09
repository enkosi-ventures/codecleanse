import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import { ProcessableFile } from '../../types';
import FilePreviewModal from './FilePreviewModal';
import FileOverrideToolbar from './FileOverrideToolbar'; // Import Toolbar
import FileListDisplay from './FileListDisplay'; // Import List Display

// Helper Functions (keep or move to utils)
const getDirectory = (path: string): string => path.substring(0, path.lastIndexOf('/')) || '/';
const getFilename = (path: string): string => path.substring(path.lastIndexOf('/') + 1);

// Max preview size (consider moving to constants.ts)
const MAX_PREVIEW_SIZE = 1 * 1024 * 1024;

interface GroupedFiles {
    [directory: string]: ProcessableFile[];
}

interface FileOverridePanelProps {
    files: ProcessableFile[];
    onOverridesChange: (overrides: Record<string, boolean>) => void;
    disabled?: boolean; // Add disabled prop from parent if needed
}

const FileOverridePanel: React.FC<FileOverridePanelProps> = ({ files, onOverridesChange, disabled = false }) => {
    // --- State ---
    const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | undefined>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [hideExcluded, setHideExcluded] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ path: string | null; content: string | null; isLoading: boolean; error: string | null }>({ path: null, content: null, isLoading: false, error: null });
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // --- Effects ---
    useEffect(() => {
        setLocalOverrides({});
        setSearchTerm('');
        setHideExcluded(false);
    }, [files]);

    // --- Memoized Calculations ---
    // getEffectiveInclusion needs access to localOverrides
    const getEffectiveInclusion = useCallback((file: ProcessableFile): boolean => {
        const override = localOverrides[file.relativePath];
        return override !== undefined ? override : file.include;
    }, [localOverrides]);

    const filteredAndGroupedFiles = useMemo(() => {
        const grouped: GroupedFiles = {};
        const term = searchTerm.toLowerCase();

        files.forEach(file => {
            const isEffectivelyIncluded = getEffectiveInclusion(file); // Use the memoized function

            if (hideExcluded && !isEffectivelyIncluded) return;
            if (term && !file.relativePath.toLowerCase().includes(term)) return;

            const dir = getDirectory(file.relativePath);
            if (!grouped[dir]) grouped[dir] = [];
            grouped[dir].push(file);
        });

        const sortedDirs = Object.keys(grouped).sort((a, b) => {
            if (a === '/') return -1; if (b === '/') return 1; return a.localeCompare(b);
        });

        sortedDirs.forEach(dir => {
            grouped[dir].sort((a, b) => getFilename(a.relativePath).localeCompare(getFilename(b.relativePath)));
        });

        return { grouped, sortedDirs };
    }, [files, searchTerm, hideExcluded, getEffectiveInclusion]); // Add getEffectiveInclusion dependency

    const hasVisibleFiles = useMemo(() => {
        return filteredAndGroupedFiles.sortedDirs.some(dir => filteredAndGroupedFiles.grouped[dir]?.length > 0);
    }, [filteredAndGroupedFiles]);


    // --- Event Handlers (Memoized) ---
    const updateAndNotify = useCallback((newOverrides: Record<string, boolean | undefined>) => {
        setLocalOverrides(newOverrides);
        const effectiveOverrides: Record<string, boolean> = {};
        for (const [path, override] of Object.entries(newOverrides)) {
            if (override !== undefined) {
                const originalFile = files.find(f => f.relativePath === path);
                if (originalFile && originalFile.include !== override) {
                    effectiveOverrides[path] = override;
                }
            }
        }
        onOverridesChange(effectiveOverrides);
    }, [files, onOverridesChange]);

    const handleToggle = useCallback((path: string) => {
        const file = files.find(f => f.relativePath === path);
        if (!file) return;
        const currentOverride = localOverrides[path];
        // Determine next state: If overridden, remove override. If not overridden, toggle opposite of current effective state.
        // Simplified: If overridden, next is undefined. If not overridden, next is !originalInclude.
        const nextOverride = currentOverride === undefined ? !file.include : undefined;
        updateAndNotify({ ...localOverrides, [path]: nextOverride });
    }, [files, localOverrides, updateAndNotify]);

    const handleSelectAll = useCallback(() => {
        const newOverrides: Record<string, boolean | undefined> = {};
        filteredAndGroupedFiles.sortedDirs.forEach(dir => {
             filteredAndGroupedFiles.grouped[dir].forEach(file => {
                if (!file.include) newOverrides[file.relativePath] = true;
                else newOverrides[file.relativePath] = undefined;
             });
        });
         const finalOverrides = { ...localOverrides }; // Start with existing overrides
         Object.assign(finalOverrides, newOverrides); // Apply changes for visible files
        updateAndNotify(finalOverrides);
    }, [filteredAndGroupedFiles, localOverrides, updateAndNotify]);

     const handleDeselectAll = useCallback(() => {
        const newOverrides: Record<string, boolean | undefined> = {};
         filteredAndGroupedFiles.sortedDirs.forEach(dir => {
             filteredAndGroupedFiles.grouped[dir].forEach(file => {
                if (file.include) newOverrides[file.relativePath] = false;
                else newOverrides[file.relativePath] = undefined;
             });
         });
         const finalOverrides = { ...localOverrides };
         Object.assign(finalOverrides, newOverrides);
        updateAndNotify(finalOverrides);
    }, [filteredAndGroupedFiles, localOverrides, updateAndNotify]);

    // Memoize preview handler
    const handlePreviewClick = useCallback((file: ProcessableFile) => {
        if (!file?.file) return;
        setPreviewFile({ path: file.relativePath, content: null, isLoading: true, error: null });
        setIsPreviewOpen(true);
        // Simplified preview logic (assuming text focus)
        if (!file.file.type.startsWith('text/') && !/\.(txt|md|js|ts|jsx|tsx|json|yaml|yml|xml|html|css|scss|py|java|go|rs|php|rb|cs|sh|gitignore)$/i.test(file.relativePath) || file.file.size > MAX_PREVIEW_SIZE) {
             setPreviewFile(prev => ({ ...prev, isLoading: false, content: null, error: `Preview not available (binary, too large, or unknown text type).` }));
             return;
         }
         // Read file content
          const reader = new FileReader();
          reader.onload = (e) => setPreviewFile(prev => ({ ...prev, isLoading: false, content: e.target?.result as string, error: null }));
          reader.onerror = (_) => setPreviewFile(prev => ({ ...prev, isLoading: false, content: null, error: `Error reading file: ${reader.error?.message || 'Unknown'}` }));
          reader.readAsText(file.file);
    }, []); // Empty dependency array - relies on file passed in

    const handleClosePreview = useCallback(() => setIsPreviewOpen(false), []);

    // Memoize tooltip text generation
     const getFileTooltipText = useCallback((file: ProcessableFile): string => {
        const override = localOverrides[file.relativePath];
        let status = '';
        const isEffectiveIncluded = getEffectiveInclusion(file);

        if (override === true) status = 'Manually Included';
        else if (override === false) status = 'Manually Excluded';
        else if (isEffectiveIncluded) status = `Included (${file.excludeReason ? 'Overridden' : 'Auto'})`;
        else status = `Excluded (${file.excludeReason || 'Auto'})`;

        if (file.sensitiveDetected) {
             status += ' | Contains potential secrets (will be redacted if included)';
        } else if (isEffectiveIncluded) {
            // Only mention scanning if it's included
            status += ' | (Will be scanned for secrets)';
        }
        return status;
    }, [localOverrides, getEffectiveInclusion]); // Include dependencies

    // --- Render ---
    const { grouped, sortedDirs } = filteredAndGroupedFiles;

    return (
        <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FileOverrideToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                hideExcluded={hideExcluded}
                onHideExcludedChange={setHideExcluded}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                hasVisibleFiles={hasVisibleFiles}
                disabled={disabled} // Pass down disabled state
            />

            <FileListDisplay
                groupedFiles={grouped}
                sortedDirs={sortedDirs}
                localOverrides={localOverrides}
                getEffectiveInclusion={getEffectiveInclusion}
                getFileTooltip={getFileTooltipText} // Pass memoized function
                onToggle={handleToggle} // Pass memoized function
                onPreview={handlePreviewClick} // Pass memoized function
            />

            <FilePreviewModal
                open={isPreviewOpen}
                onClose={handleClosePreview}
                filePath={previewFile.path}
                content={previewFile.content}
                isLoading={previewFile.isLoading}
                error={previewFile.error}
            />
        </Box>
    );
};

export default FileOverridePanel;