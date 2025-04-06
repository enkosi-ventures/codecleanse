import React from 'react';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Stack from '@mui/material/Stack';
import { ProcessingState } from '../types';

interface ExportOptionsProps {
  onProcess: () => void;
  onExportZip: () => void;
  onExportText: () => void;
  onReset: () => void;
  currentState: ProcessingState;
  isLoading: boolean;
  hasFiles: boolean; // Were files initially uploaded/dropped?
  canProcessOverride?: boolean; // Are there files *remaining* and ready for processing? (Explicit flag)
  hasProcessedData: boolean; // Is processed data ready for export?
}

const ExportOptions: React.FC<ExportOptionsProps> = ({
  onProcess,
  onExportZip,
  onExportText,
  onReset,
  currentState,
  isLoading,
  hasFiles,
  canProcessOverride, // Use the override prop
  hasProcessedData,
}) => {
  // Use the explicit flag if provided, otherwise fallback to previous logic
  const canProcess = (canProcessOverride !== undefined ? canProcessOverride : (hasFiles && currentState === 'ready_for_review')) && !isLoading;
  const canExport = hasProcessedData && currentState === 'complete' && !isLoading;
  // Allow reset if not idle and not currently busy
  const canReset = currentState !== 'idle' && !isLoading;


  return (
    <Stack spacing={2} direction="column" alignItems="stretch">
      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={onProcess}
        disabled={!canProcess}
        title={!canProcess && hasFiles && currentState === 'ready_for_review' ? "No files remaining to process after filtering." : undefined}
      >
        Process Files
      </Button>

      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={onExportZip}
        disabled={!canExport}
      >
        Export as ZIP
      </Button>

      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={onExportText}
        disabled={!canExport}
      >
        Export as Text
      </Button>

      <Button
        variant="text"
        color="secondary"
        startIcon={<RestartAltIcon />}
        onClick={onReset}
        disabled={!canReset}
        sx={{ mt: 2 }}
      >
        Reset / New Upload
      </Button>
    </Stack>
  );
};

export default ExportOptions;