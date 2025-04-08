import { useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import FileUploader from './components/FileUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import PreUploadConfig from './components/PreUploadConfig';
import ConfigurationPanel from './components/ConfigurationPanel';
import FileOverridePanel from './components/FileOverridePanel';
import ProgressIndicator from './components/ProgressIndicator';
import ExportOptions from './components/ExportOptions';
import AdBanner from './components/AdBanner';
import { useFileProcessing } from './hooks/useFileProcessing';
import { useConfiguration } from './hooks/useConfiguration';

import { initGA, trackEvent } from './analytics';


function App() {
  const { config, updateConfig } = useConfiguration();

  const handleProcessStart = () => {
    trackEvent({ category: 'Processing', action: 'Start Processing Clicked' });
    startProcessing();
  }

  const handleExportZip = () => {
    trackEvent({ category: 'Export', action: 'Export Clicked', label: 'ZIP' });
    generateZipExport();
  }

  const handleExportText = () => {
    trackEvent({ category: 'Export', action: 'Export Clicked', label: 'Text' });
    generateTextExport();
  }

  const handleReset = () => {
    trackEvent({ category: 'Interaction', action: 'Reset Clicked' });
    resetState();
  }

  const {
    state,
    error,
    progress,
    analysisResult,
    processedData,
    skippedFolderInfo,
    fileInputRef,
    handleFileChange: originalHandleFileChange,
    handleDragOver,
    handleDrop: originalHandleDrop,
    startProcessing,
    generateZipExport,
    generateTextExport,
    resetState,
    updateFileOverrides,
  } = useFileProcessing(config);


  useEffect(() => {
    initGA();
  }, []);

  // Wrap original file handlers to add event tracking on success
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    originalHandleFileChange(event); // Call the original logic first
    // Track *successful* initiation of analysis (triggered after files are selected)
    if (event.target.files && event.target.files.length > 0) {
      trackEvent({ category: 'Upload', action: 'Files Selected', label: 'Browse Button' });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    originalHandleDrop(event); // Call the original logic first
    // Track *successful* initiation of analysis (triggered after drop processing)
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      // Note: We track the *intent* here, success is harder to guarantee from drop
      trackEvent({ category: 'Upload', action: 'Files Selected', label: 'Drag and Drop' });
    }
  };


  const isLoading = state === 'analyzing' || state === 'processing' || state === 'exporting';
  const isConfigDisabled = isLoading || state === 'complete';
  const skippedMessage = skippedFolderInfo
    ? `Note: Standard dependency (e.g., node_modules), build output (e.g., dist, target), virtual environment, and .git folders are automatically skipped during upload for performance.`
    : null;

  const handleUserPreFilterChange = (folders: string[]) => {
    updateConfig({ userPreFilterFolders: folders });
    trackEvent({ category: 'Configuration', action: 'Pre-Filter Changed' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        CodeCleanse <Typography variant="caption" sx={{ verticalAlign: 'super' }}>{__APP_VERSION__}</Typography>
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
        Clean your code repositories for LLM submission securely in your browser.
      </Typography>

      {/* Display Errors */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info Alerts */}
      {skippedMessage && state !== 'idle' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {skippedMessage}
        </Alert>
      )}


      <Grid container spacing={3}>
        {/* Left Column: Upload & Config */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>1. Upload & Configure</Typography>
            <FileUploader
              onFileChange={handleFileChange}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              inputRef={fileInputRef}
              disabled={state !== 'idle' && state !== 'error' && state !== 'ready_for_review'}
            />

            <Accordion
              variant="outlined"
              sx={{ mt: 3, mb: 1, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
              disabled={isConfigDisabled}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="preupload-config-content"
                id="preupload-config-header"
                sx={{ '& .MuiAccordionSummary-content': { mr: 1 } }}
              >
                <Typography variant="body2">Advanced: Pre-Upload Exclusions</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1, pt: 0 }}>
                <PreUploadConfig
                  userPreFilterFolders={config.userPreFilterFolders}
                  onUserPreFilterFoldersChange={handleUserPreFilterChange}
                  disabled={isConfigDisabled}
                />
              </AccordionDetails>
            </Accordion>

            {/* ... Configuration Panel ... */}
            {(state !== 'idle' || analysisResult) && (
              <Box sx={{ mt: 3 }}>
                <ConfigurationPanel
                  config={config}
                  onConfigChange={updateConfig}
                  disabled={isConfigDisabled}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Middle Column: Analysis & Review */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>2. Review Files</Typography>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              {state === 'idle' && !analysisResult && <Typography color="textSecondary">Upload a directory to begin analysis.</Typography>}
              {(state === 'analyzing' || state === 'processing') && (
                <ProgressIndicator value={progress} state={state} />
              )}
              {analysisResult && (state === 'ready_for_review' || state === 'processing' || state === 'complete' || state === 'exporting') && (
                <Box>
                  <AnalysisDashboard result={analysisResult} />
                  {analysisResult.files.length > 0 && (state === 'ready_for_review') && (
                    <FileOverridePanel
                      files={analysisResult.files}
                      onOverridesChange={updateFileOverrides}
                    />
                  )}
                  {state === 'complete' && <Typography sx={{ mt: 2 }} color="success.main">Processing complete!</Typography>}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Process & Export */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>3. Process & Export</Typography>
            <ExportOptions
              onProcess={handleProcessStart}
              onExportZip={handleExportZip}
              onExportText={handleExportText}
              onReset={handleReset}
              currentState={state}
              isLoading={isLoading}
              hasFiles={!!analysisResult && analysisResult.totalFiles > 0}
              canProcessOverride={state === 'ready_for_review' && !!analysisResult && analysisResult.files.length > 0}
              hasProcessedData={!!processedData}
            />
          </Paper>
        </Grid>

        {/* Footer / Ads */}
        <Grid size={{ xs: 12 }} sx={{ mt: 4 }}>
          <AdBanner />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 1 }}
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Typography variant="body2" color="textSecondary">
              CodeCleanse © {new Date().getFullYear()}
            </Typography>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" color="textSecondary" component="span"> | </Typography>
            </Box>

            <Typography variant="body2" color="textSecondary">
              Data processed locally for total privacy
            </Typography>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" color="textSecondary" component="span"> | </Typography>
            </Box>

            <Typography variant="body2" color="textSecondary">
              Fully Open Source <Link href="https://github.com/enkosi-ventures/codecleanse" target="_blank" rel="noopener noreferrer">@GitHub</Link>
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;