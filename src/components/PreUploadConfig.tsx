import { Autocomplete, TextField, Chip, Typography, Box, Stack, Tooltip } from '@mui/material';
import { DEFAULT_PRE_FILTER_FOLDERS } from '../constants';

interface PreUploadConfigProps {
  userPreFilterFolders: string[];
  onUserPreFilterFoldersChange: (folders: string[]) => void;
  disabled?: boolean;
}

const PreUploadConfig: React.FC<PreUploadConfigProps> = ({
  userPreFilterFolders,
  onUserPreFilterFoldersChange,
  disabled = false
}) => {

  const handleFilterChange = (_: React.SyntheticEvent, newValue: (string | { inputValue: string; title: string })[]) => {
    const folders = newValue
      .map(option => (typeof option === 'string' ? option : option.inputValue))
      .map(folder => folder.trim())
      .filter(folder => folder.length > 0)
      .map(folder => folder.replace(/[\\/]/g, ''))
      .filter(folder => folder.length > 0);
    onUserPreFilterFoldersChange([...new Set(folders)]);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Prevent browser strain by skipping large, non-source folders during upload.
      </Typography>

      {/* Display Default Exclusions */}
      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
        Default Exclusions (Always Applied):
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        {Array.from(DEFAULT_PRE_FILTER_FOLDERS).sort().map((folder) => (
          <Tooltip key={folder} title="Default exclusion, cannot be removed">
            <Chip
              label={folder}
              size="small"
              variant="filled"
              color="default"
              disabled // Always appear disabled/read-only
              sx={{ opacity: 0.7, '& .MuiChip-deleteIcon': { display: 'none' }, cursor: 'default', m: '2px' }} // Add slight margin
            />
          </Tooltip>
        ))}
      </Stack>

      {/* Custom Exclusions Input using Autocomplete */}
      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
        Your Custom Exclusions:
      </Typography>
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={userPreFilterFolders || []}
        onChange={handleFilterChange}
        disabled={disabled}
        size="small"
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherTagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                variant="outlined"
                label={option}
                size="small"
                color="primary"
                {...otherTagProps}
                disabled={disabled}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={disabled ? "" : "Type folder name & press Enter"}
            helperText={!disabled ? "Folder names matching these anywhere in the path will be skipped." : ""}
            disabled={disabled}
          />
        )}
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

export default PreUploadConfig;