import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './components/ErrorFallback.tsx';
import App from './App.tsx';
import theme from './styles/theme.ts';
import './styles/index.css';


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