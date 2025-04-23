import React, { useState, useEffect } from 'react';
import {
  Box, List, ListItem, ListItemIcon, ListItemText, IconButton,
  Typography, Tooltip, Stack, Button
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

import { ProcessableFile } from '../types';

interface FileOverridePanelProps {
  files: ProcessableFile[];
  onOverridesChange: (overrides: Record<string, boolean>) => void;
}

const FileOverridePanel: React.FC<FileOverridePanelProps> = ({ files, onOverridesChange }) => {
  // Internal state to manage overrides
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | undefined>>({});

  // Sync localOverrides if the input `files` list changes (e.g., new upload)
  useEffect(() => {
    setLocalOverrides({}); // Reset local overrides when the file list changes
  }, [files]);


  const getEffectiveInclusion = (file: ProcessableFile): boolean => {
    const override = localOverrides[file.relativePath];
    return override !== undefined ? override : file.include;
  };

  // Update internal state and notify parent
  const updateAndNotify = (newOverrides: Record<string, boolean | undefined>) => {
    setLocalOverrides(newOverrides);

    // Convert to the format expected by the hook (only explicit overrides)
    const effectiveOverrides: Record<string, boolean> = {};
    for (const [path, override] of Object.entries(newOverrides)) {
      if (override !== undefined) {
        // Only notify if the override differs from the original automatic state
        const originalFile = files.find(f => f.relativePath === path);
        if (originalFile && originalFile.include !== override) {
          effectiveOverrides[path] = override;
        }
      }
    }
    onOverridesChange(effectiveOverrides);
  }

  const handleToggle = (path: string) => {
    const file = files.find(f => f.relativePath === path);
    if (!file) return;

    const currentOverride = localOverrides[path];
    const originalInclude = file.include;
    let nextOverride: boolean | undefined;

    if (currentOverride === undefined) {
      nextOverride = !originalInclude; // Toggle from auto state
    } else {
      nextOverride = undefined; // Toggle back to auto state
    }

    updateAndNotify({ ...localOverrides, [path]: nextOverride });
  };

  const handleSelectAll = () => {
    const newOverrides: Record<string, boolean | undefined> = {};
    files.forEach(file => {
      // Set override to true ONLY if the file wasn't originally included
      if (!file.include) {
        newOverrides[file.relativePath] = true;
      } else {
        // Otherwise, ensure no override exists (use auto state)
        newOverrides[file.relativePath] = undefined;
      }
    });
    updateAndNotify(newOverrides);
  };

  const handleDeselectAll = () => {
    const newOverrides: Record<string, boolean | undefined> = {};
    files.forEach(file => {
      // Set override to false ONLY if the file was originally included
      if (file.include) {
        newOverrides[file.relativePath] = false;
      } else {
        // Otherwise, ensure no override exists (use auto state)
        newOverrides[file.relativePath] = undefined;
      }
    });
    updateAndNotify(newOverrides);
  };


  const getFileTooltip = (file: ProcessableFile): string => {
    // ... (tooltip logic remains the same)
    const override = localOverrides[file.relativePath];
    let status = '';
    const isEffectiveIncluded = getEffectiveInclusion(file);

    if (override === true) status = 'Manually Included';
    else if (override === false) status = 'Manually Excluded';
    else if (isEffectiveIncluded) status = `Included (${file.excludeReason ? 'Overridden' : 'Auto'})`; // Clarify override
    else status = `Excluded (${file.excludeReason || 'Auto'})`;

    if (file.sensitiveDetected) {
      status += ' | Contains potential secrets (will be redacted)';
    }
    return status;
  }

  return (
    <Box sx={{ mt: 2 }}> {/* Remove fixed height/border from here */}
      {/* Header with Select/Deselect All Buttons */}
      <Stack
        direction="row"
        justifyContent="space-between" // Pushes items to ends
        alignItems="center"
        sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }} // Style header
      >
        <Typography variant="caption" color="text.secondary">
          Toggle individual files or:
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Include All Files">
            {/* Wrap button in span for tooltip when disabled */}
            <span>
              <Button
                size="small"
                onClick={handleSelectAll}
                disabled={files.length === 0}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, px: 0.8 }}
              >
                Include All
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exclude All Files">
            <span>
              <Button
                size="small"
                onClick={handleDeselectAll}
                disabled={files.length === 0}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, px: 0.8 }}
              >
                Exclude All
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* File List Area */}
      <Box sx={{ maxHeight: 350, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 4px 4px' }}> {/* Add border/scroll */}
        <List dense component="nav" aria-label="file override list" sx={{ py: 0 }}>
          {files.length === 0 ? (
            <ListItem><ListItemText primary="No files found or remaining after filtering." sx={{ textAlign: 'center', color: 'text.secondary' }} /></ListItem>
          ) : (
            files.map((file) => {
              const effectiveInclude = getEffectiveInclusion(file);
              const userOverride = localOverrides[file.relativePath];
              const depth = file.relativePath.split('/').length - 1;
              const isManuallyOverridden = userOverride !== undefined && userOverride !== file.include;

              return (
                <ListItem
                  key={file.relativePath}
                  secondaryAction={
                    <Tooltip title={getFileTooltip(file)} placement="left">
                      <IconButton
                        edge="end"
                        aria-label={`Toggle inclusion for ${file.relativePath.split('/').pop()}`}
                        onClick={() => handleToggle(file.relativePath)}
                        size="small"
                      >
                        {/* Conditional styling/icon based on effective state and override status */}
                        {effectiveInclude
                          ? <CheckBoxIcon fontSize="small" color={isManuallyOverridden ? "primary" : "success"} />
                          : <CheckBoxOutlineBlankIcon fontSize="small" color={isManuallyOverridden ? "action" : "disabled"} />
                        }
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    pl: 2 + depth * 1.5, // Adjust indentation slightly
                    py: 0.2, // Reduce vertical padding
                    borderBottom: '1px solid', // Separator lines
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' }, // Remove border on last item
                    backgroundColor: isManuallyOverridden ? 'action.hover' : 'transparent', // Highlight overridden rows
                  }}
                  dense // Ensure dense is effective
                >
                  <ListItemIcon sx={{ minWidth: 30, mr: 0.5 }}>
                    <DescriptionIcon fontSize="inherit" color={effectiveInclude ? "inherit" : "disabled"} sx={{ fontSize: '1rem' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap sx={{ opacity: effectiveInclude ? 1 : 0.7, fontSize: '0.8rem' }}>
                        {file.relativePath.split('/').pop()}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" noWrap color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                        {file.relativePath}
                      </Typography>
                    }
                    sx={{ m: 0 }} // Remove default margins
                  />
                </ListItem>
              );
            })
          )}
        </List>
      </Box>
    </Box>
  );
};

export default FileOverridePanel;