import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import TempFileUploader from './components/TempFileUploader';
import JSZip from 'jszip';
import micromatch from 'micromatch';

function App() {
  console.log('JSZip imported:', typeof JSZip);
  console.log('micromatch imported:', typeof micromatch);
  return (
    <Container maxWidth="lg"> {/* Example MUI component */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          CodeCleanse - Stage 1 Start
        </Typography>
        {/* Placeholder for File Uploader Component */}
        {/* Placeholder for Analysis Dashboard */}
        {/* Placeholder for Configuration Panel */}
        {/* Placeholder for Progress Indicator */}
        {/* Placeholder for Export Options */}
        <TempFileUploader />

        {/* Placeholder for Ad Banner */}
        <Box sx={{ mt: 4, p: 2, border: '1px dashed grey', textAlign: 'center' }}>
          <Typography variant="caption">Ad Placeholder</Typography>
          {/* Static ad scripts would be managed here or via useEffect/helmet */}
        </Box>
      </Box>
    </Container>
  );
}

export default App;