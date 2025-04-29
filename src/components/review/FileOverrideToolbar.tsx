import {
  Stack, TextField, InputAdornment, FormControlLabel, Switch, Typography, Tooltip, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

interface FileOverrideToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hideExcluded: boolean;
  onHideExcludedChange: (hide: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  hasVisibleFiles: boolean;
  disabled?: boolean; // Propagate disabled state
}

const FileOverrideToolbar: React.FC<FileOverrideToolbarProps> = ({
  searchTerm,
  onSearchChange,
  hideExcluded,
  onHideExcludedChange,
  onSelectAll,
  onDeselectAll,
  hasVisibleFiles,
  disabled = false,
}) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems="center"
      sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}
    >
      <TextField
        label="Search Filename/Path" // Be more specific
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ flexGrow: 1, minWidth: '180px' }} // Allow search to grow
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={hideExcluded}
            onChange={(e) => onHideExcludedChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={<Typography variant="caption">Hide Auto-Excluded</Typography>}
        sx={{ mr: 'auto', whiteSpace: 'nowrap' }} // Push buttons right
        disabled={disabled}
      />
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Tooltip title="Include All Visible Files">
          <span> {/* Span needed for tooltip when disabled */}
            <Button
              size="small"
              onClick={onSelectAll}
              disabled={disabled || !hasVisibleFiles}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, px: 0.8 }}
              startIcon={<CheckBoxIcon />}
            >
              Include All
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Exclude All Visible Files">
          <span>
            <Button
              size="small"
              onClick={onDeselectAll}
              disabled={disabled || !hasVisibleFiles}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.2, px: 0.8 }}
              startIcon={<CheckBoxOutlineBlankIcon />}
            >
              Exclude All
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default FileOverrideToolbar;
