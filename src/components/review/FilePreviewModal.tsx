import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress, Alert
} from '@mui/material';
// @ts-expect-error - PrismJS might not have perfect types for all dynamic language loading scenarios
import { highlight, languages } from 'prismjs/components/prism-core'; // Lightweight core
import 'prismjs/components/prism-clike'; // Base C-like languages
import 'prismjs/components/prism-javascript'; // Add JS
import 'prismjs/components/prism-typescript';
// import 'prismjs/components/prism-jsx';
// import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
// import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
// Import a theme (e.g., prism-okaidia.css) - requires CSS loader setup or direct import
import '../../styles/prism-okaidia.css'; // Or your preferred theme - PLACE IN src/styles

// Simple language detection based on extension
const getLanguage = (filename: string): string => {
  const extension = '.' + filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    '.js': 'javascript', '.ts': 'typescript',// '.jsx': 'jsx', '.tsx': 'tsx', '.md': 'markdown', 
    '.py': 'python', '.java': 'java', '.cs': 'csharp', '.go': 'go',
    '.rb': 'ruby', '.php': 'php', '.rs': 'rust', '.sql': 'sql',
    '.css': 'css', '.scss': 'scss', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.sh': 'bash', '.xml': 'markup', '.html': 'markup',
    '.gitignore': 'ignore', // Add a simple ignore type if needed or handle generically
  };
  return langMap[extension] || 'clike'; // Default to C-like
};


interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open, onClose, filePath, content, isLoading, error
}) => {

  const highlightedCode = React.useMemo((): string => {
    if (!content || !filePath || isLoading || error) return '';
    const language = getLanguage(filePath);
    try {
      // Check if language is loaded before highlighting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismLanguages = languages as Record<string, any>;
      if (prismLanguages[language]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return highlight(content, prismLanguages[language], language) as string;
      } else {
        console.warn(`Prism language '${language}' not loaded, falling back.`);
        // Fallback to plain text or clike if language component missing
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return highlight(content, prismLanguages.clike || prismLanguages.markup, 'clike') as string;
      }
    } catch (e: unknown) {
      console.error("Syntax highlighting error:", e);
      return content; // Fallback to plain text on error
    }
  }, [content, filePath, isLoading, error]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div" noWrap>
          Preview: {filePath || 'Loading...'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#272822' }}> {/* Match Okaidia background */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        )}
        {!isLoading && !error && content !== null && (
          // Use pre/code for semantics and styling hook
          <Box component="pre" sx={{ m: 0, p: 2, overflowX: 'auto', fontSize: '0.85rem', '& code': { fontFamily: 'monospace' } }}>
            {/* Use dangerouslySetInnerHTML for Prism's output */}
            <code
              className={`language-${getLanguage(filePath || '')}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode || content }} // Fallback to raw content
            />
          </Box>
        )}
        {!isLoading && !error && content === null && (
          <Typography sx={{ p: 2, color: 'text.secondary' }}>
            Content not available for preview (e.g., binary file or too large).
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewModal;
