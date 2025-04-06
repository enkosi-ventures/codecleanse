import Box from '@mui/material/Box';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { ProcessingState } from '../types';

interface ProgressIndicatorProps extends LinearProgressProps {
  value: number;
  state: ProcessingState;
}

const ProgressIndicator = ({ value, state, ...props }: ProgressIndicatorProps) => {
  let statusText = 'Waiting...';
  if (state === 'analyzing') statusText = 'Analyzing files...';
  else if (state === 'processing') statusText = 'Processing files...';
  else if (state === 'exporting') statusText = 'Generating export...';
  else if (state === 'complete') statusText = 'Complete!';


  const displayValue = state === 'exporting' ? undefined : value; // Indeterminate for export

  return (
    <Box sx={{ width: '100%', my: 2, display: 'flex', alignItems: 'center' }}>
      {state === 'exporting' ? (
          <CircularProgress size={20} sx={{ mr: 1.5 }}/>
      ) : (
           <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                    variant={state === 'analyzing' ? 'indeterminate' : 'determinate'} // Indeterminate during analysis
                    value={displayValue}
                    {...props}
                />
           </Box>
      )}
      <Box sx={{ minWidth: 120, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary">
            {statusText}{state === 'processing' ? ` ${Math.round(value)}%` : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProgressIndicator;