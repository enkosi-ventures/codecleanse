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
  hasFiles: boolean; // Are there files loaded/analyzed?
  hasProcessedData: boolean; // Is processed data ready for export?
}

const ExportOptions = ({
  onProcess,
  onExportZip,
  onExportText,
  onReset,
  currentState,
  isLoading,
  hasFiles,
  hasProcessedData,
}: ExportOptionsProps) => {
  const canProcess = hasFiles && currentState === 'ready_for_review' && !isLoading;
  const canExport = hasProcessedData && currentState === 'complete' && !isLoading;
  const canReset = currentState !== 'idle' && !isLoading;

  return (
    <Stack spacing={2} direction="column" alignItems="stretch">
       <Button
         variant="contained"
         startIcon={<PlayArrowIcon />}
         onClick={onProcess}
         disabled={!canProcess}
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