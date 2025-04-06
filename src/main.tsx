import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App.tsx';
import theme from './styles/theme.ts';
import './styles/index.css';
import { Box, Typography } from '@mui/material';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Box role="alert" sx={{ p: 3, m: 3, border: '1px solid red', borderRadius: 1, bgcolor: 'error.light' }}>
      <Typography variant="h6" color="error.dark">Oops! Something went wrong:</Typography>
      <Typography color="error.dark" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
        {error.message}
      </Typography>
      <Typography sx={{ mt: 2 }}>
        Please try refreshing the page. If the problem persists, check the console for more details.
      </Typography>
    </Box>
  );
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
       <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error, info) => console.error("ErrorBoundary caught an error:", error, info)}>
         <App />
       </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
);