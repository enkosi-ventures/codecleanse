import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void; // Optional reset function
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Box
      role="alert"
      sx={{
        p: 3,
        m: 3,
        border: '1px solid',
        borderColor: 'error.main',
        borderRadius: 1,
        bgcolor: 'error.light',
        color: 'error.dark'
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Oops! Something went wrong.
      </Typography>
      <Typography component="pre" sx={{ mt: 1, mb: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {error.message}
      </Typography>
      {resetErrorBoundary && (
        <Button variant="contained" color="error" onClick={resetErrorBoundary}>
          Try Again
        </Button>
      )}
      <Typography variant="body2" sx={{ mt: 2 }}>
        Please try refreshing the page or clicking &quot;Try Again&quot;. If the problem persists, check the console for more details.
      </Typography>
    </Box>
  );
}