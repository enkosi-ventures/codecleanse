import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import { AppConfig } from '../types';

interface ConfigurationPanelProps {
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  disabled?: boolean;
}

const ConfigurationPanel = ({ config, onConfigChange, disabled }: ConfigurationPanelProps) => {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ [event.target.name]: event.target.checked });
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     onConfigChange({ [event.target.name]: event.target.value });
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Filtering Options:</Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={config.useGitignore}
            onChange={handleCheckboxChange}
            name="useGitignore"
            disabled={disabled}
          />
        }
        label="Apply .gitignore rules"
        sx={{ display: 'block' }}
      />
      {/* <FormControlLabel
        control={
          <Checkbox
            checked={config.removeBinariesMedia} // Add this to AppConfig if needed
            onChange={handleCheckboxChange}
            name="removeBinariesMedia"
            disabled={disabled}
          />
        }
        label="Filter Binaries/Media"
        sx={{ display: 'block' }}
      /> */}
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Sensitive Data:</Typography>
        <TextField
            label="Redaction Placeholder"
            name="redactionPlaceholder"
            value={config.redactionPlaceholder}
            onChange={handleTextChange}
            variant="outlined"
            size="small"
            fullWidth
            disabled={disabled}
            margin="dense"
            helperText="Text used to replace detected sensitive data."
        />
       {/* Add more options here later (e.g., custom regex patterns) */}
    </Box>
  );
};

export default ConfigurationPanel;