import React from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { ProcessableFile } from '../../types';
import FileListItemRenderer from './FileListItemRenderer';

interface GroupedFiles {
  [directory: string]: ProcessableFile[];
}

interface FileListDisplayProps {
  groupedFiles: GroupedFiles;
  sortedDirs: string[];
  localOverrides: Record<string, boolean | undefined>;
  getEffectiveInclusion: (file: ProcessableFile) => boolean; // Pass function as prop
  getFileTooltip: (file: ProcessableFile) => string; // Pass function as prop
  onToggle: (path: string) => void;
  onPreview: (file: ProcessableFile) => void;
}

const FileListDisplay: React.FC<FileListDisplayProps> = ({
  groupedFiles,
  sortedDirs,
  localOverrides,
  getEffectiveInclusion,
  getFileTooltip,
  onToggle,
  onPreview,
}) => {
  const hasVisibleFiles = sortedDirs.some(dir => groupedFiles[dir]?.length > 0);

  return (
    <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
      <List dense component="nav" aria-label="file override list" sx={{ py: 0 }}>
        {!hasVisibleFiles ? (
          <ListItem><ListItemText primary="No files match filters or found." sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }} /></ListItem>
        ) : (
          sortedDirs.map(dir => (
            // Check if the directory actually has files after filtering
            groupedFiles[dir]?.length > 0 && (
              <React.Fragment key={dir}>
                {/* Directory Header */}
                <ListItem sx={{ bgcolor: 'grey.100', py: 0.3, px: 1, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 1 }} dense>
                  <ListItemIcon sx={{ minWidth: 30, mr: 0.5 }}>
                    <FolderIcon sx={{ fontSize: '1rem' }} color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                        {dir === '/' ? '(Root Directory)' : dir}
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </ListItem>
                {/* Files within Directory */}
                {groupedFiles[dir].map((file) => {
                  const effectiveInclude = getEffectiveInclusion(file);
                  const userOverride = localOverrides[file.relativePath];
                  const isOverridden = userOverride !== undefined && userOverride !== file.include;
                  const depth = file.relativePath.split('/').length - (dir === '/' ? 1 : dir.split('/').length + 1); // Calculate depth relative to current dir header

                  return (
                    <FileListItemRenderer
                      key={file.relativePath} // Key is essential here
                      file={file}
                      depth={depth >= 0 ? depth : 0} // Ensure non-negative depth
                      isIncluded={effectiveInclude}
                      isOverridden={isOverridden}
                      tooltipText={getFileTooltip(file)}
                      onToggle={onToggle}
                      onPreview={onPreview}
                    />
                  );
                })}
              </React.Fragment>
            )
          ))
        )}
      </List>
    </Box>
  );
};

export default FileListDisplay;