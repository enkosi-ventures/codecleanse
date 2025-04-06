import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CheckboxIcon from '@mui/icons-material/CheckBox';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import Tooltip from '@mui/material/Tooltip';
import { ProcessableFile } from '../types';

interface FileOverridePanelProps {
  files: ProcessableFile[];
  onOverridesChange: (overrides: Record<string, boolean>) => void;
}

const FileOverridePanel = ({ files, onOverridesChange }: FileOverridePanelProps) => {
  // Internal state to manage checkbox states reflecting user overrides
  // Key: relativePath, Value: true (force include), false (force exclude), undefined (use automatic)
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | undefined>>({});

  // Calculate the effective inclusion status based on automatic rules and user overrides
  const getEffectiveInclusion = (file: ProcessableFile): boolean => {
    const override = localOverrides[file.relativePath];
    if (override !== undefined) {
      return override; // User override takes precedence
    }
    return file.include; // Otherwise, use the automatic decision
  };

  const handleToggle = (path: string) => {
    setLocalOverrides(prev => {
      const currentOverride = prev[path];
      const file = files.find(f => f.relativePath === path);
      const originalInclude = file?.include ?? false;
      let nextOverride: boolean | undefined;

      if (currentOverride === undefined) {
        // No override yet -> Override to the opposite of original
        nextOverride = !originalInclude;
      } else if (currentOverride === !originalInclude) {
        // Override exists and is opposite of original -> Remove override
        nextOverride = undefined;
      } else {
        // Override exists and is same as original (shouldn't happen often with simple toggle)
        // -> toggle to opposite
        nextOverride = !currentOverride;
      }


      const newOverrides = { ...prev, [path]: nextOverride };

      // Convert to the format expected by the hook (only paths with explicit overrides)
      const effectiveOverrides: Record<string, boolean> = {};
      for (const [p, ov] of Object.entries(newOverrides)) {
        if (ov !== undefined) {
          effectiveOverrides[p] = ov;
        }
      }
      onOverridesChange(effectiveOverrides); // Notify parent hook

      return newOverrides;
    });
  };

  const getFileTooltip = (file: ProcessableFile): string => {
    const override = localOverrides[file.relativePath];
    let status = '';
    if (override === true) status = 'Manually Included';
    else if (override === false) status = 'Manually Excluded';
    else if (file.include) status = 'Included (Auto)';
    else status = `Excluded (${file.excludeReason || 'Auto'})`;

    if (file.sensitiveDetected) {
      status += ' | Contains potential secrets (will be redacted)';
    }
    return status;
  }

  return (
    <Box sx={{ maxHeight: 400, overflowY: 'auto', mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <List dense component="nav" aria-label="file override list">
        {files.length === 0 ? (
          <ListItem><ListItemText primary="No files to display." /></ListItem>
        ) : (
          files.map((file) => {
            const effectiveInclude = getEffectiveInclusion(file);
            const userOverride = localOverrides[file.relativePath];
            const depth = file.relativePath.split('/').length - 1;

            return (
              <ListItem
                key={file.relativePath}
                secondaryAction={
                  <Tooltip title={getFileTooltip(file)} placement="left">
                    <IconButton edge="end" aria-label="toggle inclusion" onClick={() => handleToggle(file.relativePath)}>
                      {userOverride !== undefined ? (
                        effectiveInclude ? <CheckboxIcon color="primary" /> : <CheckBoxOutlineBlank color="action" />
                      ) : (
                        effectiveInclude ? <CheckboxIcon color="success" /> : <CheckBoxOutlineBlank color="disabled" />
                      )}
                    </IconButton>
                  </Tooltip>
                }
                sx={{ pl: 2 + depth * 2 }}
              >
                <ListItemIcon sx={{ minWidth: 35 }}>
                  <DescriptionIcon fontSize="small" color={effectiveInclude ? "inherit" : "disabled"} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap sx={{ opacity: effectiveInclude ? 1 : 0.6 }}>
                      {file.relativePath.split('/').pop()}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" noWrap color="textSecondary">
                      {file.relativePath}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })
        )}
      </List>
    </Box>
  );
};


export default FileOverridePanel;