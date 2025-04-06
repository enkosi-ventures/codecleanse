import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';

import FileUploader from './components/FileUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import ConfigurationPanel from './components/ConfigurationPanel';
import FileOverridePanel from './components/FileOverridePanel';
import ProgressIndicator from './components/ProgressIndicator';
import ExportOptions from './components/ExportOptions';
import AdBanner from './components/AdBanner';
import { useFileProcessing } from './hooks/useFileProcessing';
import { useConfiguration } from './hooks/useConfiguration';
import { Alert, Link } from '@mui/material';

function App() {
  const { config, updateConfig } = useConfiguration();
  const {
    state,
    error,
    progress,
    analysisResult,
    processedData,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    startProcessing,
    generateZipExport,
    generateTextExport,
    resetState,
    updateFileOverrides,
  } = useFileProcessing(config);

  const isLoading = state === 'analyzing' || state === 'processing' || state === 'exporting';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        CodeCleanse <Typography variant="caption" sx={{ verticalAlign: 'super'}}>MVP</Typography>
      </Typography>
       <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
        Clean your code repositories for LLM submission securely in your browser.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
              disabled={state !== 'idle' && state !== 'error'}
            />
            {state !== 'idle' && (
                 <Box sx={{ mt: 3 }}>
                    <ConfigurationPanel
                        config={config}
                        onConfigChange={updateConfig}
                        disabled={isLoading || state === 'complete'}
                    />
                 </Box>
            )}
           </Paper>
        </Grid>

        {/* Middle Column: Analysis & Review */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
             <Typography variant="h6" gutterBottom>2. Review Files</Typography>
             {state === 'idle' && <Typography color="textSecondary">Upload a directory to begin analysis.</Typography>}
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
          </Paper>
        </Grid>

        {/* Right Column: Process & Export */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
             <Typography variant="h6" gutterBottom>3. Process & Export</Typography>
             <ExportOptions
                 onProcess={startProcessing}
                 onExportZip={generateZipExport}
                 onExportText={generateTextExport}
                 onReset={resetState}
                 currentState={state}
                 isLoading={isLoading}
                 hasFiles={!!analysisResult && analysisResult.files.length > 0}
                 hasProcessedData={!!processedData}
             />
          </Paper>
        </Grid>

        {/* Footer / Ads */}
        <Grid size={{ xs: 12 }} sx={{ mt: 4 }}>
           <AdBanner adSlotId="codecleanse-footer-ad" />
           <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
             CodeCleanse © {new Date().getFullYear()}. All processing is done client-side. No data is uploaded.
             {' | '}
             <Link href="https://github.com/enkosi-ventures/codecleanse" target="_blank" rel="noopener noreferrer">GitHub</Link>
           </Typography>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;