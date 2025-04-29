import React from 'react';
import {
  ListItem, ListItemIcon, ListItemText, IconButton, Typography, Tooltip, Stack
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ProcessableFile } from '../../types';

interface FileListItemRendererProps {
  file: ProcessableFile;
  depth: number;
  isIncluded: boolean;
  isOverridden: boolean;
  tooltipText: string;
  onToggle: (path: string) => void;
  onPreview: (file: ProcessableFile) => void;
}

const FileListItemRenderer: React.FC<FileListItemRendererProps> = React.memo(({
  file,
  depth,
  isIncluded,
  isOverridden,
  tooltipText,
  onToggle,
  onPreview,
}) => {
  const filename = file.relativePath.substring(file.relativePath.lastIndexOf('/') + 1);

  return (
    <ListItem
      // key is applied by the parent mapping function
      secondaryAction={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Preview File Content">
            <IconButton
              edge="end"
              aria-label={`Preview ${filename}`}
              onClick={() => onPreview(file)}
              size="small"
            >
              <VisibilityIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={tooltipText} placement="left">
            <IconButton
              edge="end"
              aria-label={`Toggle inclusion for ${filename}`}
              onClick={() => onToggle(file.relativePath)}
              size="small"
            >
              {isIncluded
                ? <CheckBoxIcon fontSize="small" color={isOverridden ? "primary" : "success"} />
                : <CheckBoxOutlineBlankIcon fontSize="small" color={isOverridden ? "action" : "disabled"} />
              }
            </IconButton>
          </Tooltip>
        </Stack>
      }
      sx={{
        pl: 3 + depth * 1.5, // Indentation
        py: 0.1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        backgroundColor: isOverridden ? 'action.hover' : 'transparent',
      }}
      dense
    >
      <ListItemIcon sx={{ minWidth: 30, mr: 0.5 }}>
        <DescriptionIcon fontSize="inherit" color={isIncluded ? "inherit" : "disabled"} sx={{ fontSize: '1rem' }} />
      </ListItemIcon>
      <Tooltip enterDelay={700} enterNextDelay={700} title={file.relativePath} placement="top-start">
        <ListItemText
          primary={
            <Typography variant="body2" noWrap sx={{ opacity: isIncluded ? 1 : 0.7, fontSize: '0.8rem' }}>
              {filename}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Tooltip>
    </ListItem>
  );
}); // Use React.memo for performance if list items rarely change props

export default FileListItemRenderer;
