import React, { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileUploaderProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

const FileUploader = ({
  onFileChange,
  onDragOver,
  onDrop,
  inputRef,
  disabled = false,
} : FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Check if the leave target is outside the dropzone
    if (dropzoneRef.current && !dropzoneRef.current.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleInternalDrop = (event: React.DragEvent<HTMLDivElement>) => {
     event.preventDefault(); // Prevent default drop behavior
     event.stopPropagation();
     setIsDragging(false);
     if (!disabled) {
        onDrop(event);
     }
  };

  const handleInternalDragOver = (event: React.DragEvent<HTMLDivElement>) => {
     event.preventDefault(); // Necessary to allow drop
     event.stopPropagation();
     if (!disabled) {
        onDragOver(event); // Call the passed handler if needed
     }
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef?.current?.click();
    }
  };

  return (
    <Box
      ref={dropzoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleInternalDragOver} // Use internal handler
      onDrop={handleInternalDrop}     // Use internal handler
      onClick={handleClick}
      className={isDragging ? 'drag-over' : ''}
      sx={{
        border: '2px dashed',
        borderColor: disabled ? 'grey.400' : 'grey.500',
        borderRadius: 1,
        p: 4,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled ? 'grey.100' : isDragging ? 'primary.light' : 'background.paper',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          borderColor: disabled ? 'grey.400' : 'primary.main',
        }
      }}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={onFileChange}
        /* @ts-ignore because webkitdirectory is non-standard but widely supported */
        webkitdirectory=""
        directory=""
        multiple
        className="visually-hidden" // Hide the default input
        disabled={disabled}
      />
      <CloudUploadIcon sx={{ fontSize: 48, color: disabled ? 'grey.500' : 'primary.main', mb: 1 }} />
      <Typography variant="body1" color={disabled ? 'text.disabled' : 'text.primary'} sx={{ mb: 1 }}>
        Drag & drop your project folder here
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        or
      </Typography>
      <Button
        variant="outlined"
        component="span" // Makes the button act as a label for the hidden input
        disabled={disabled}
      >
        Browse Folder
      </Button>
       <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 2 }}>
        All processing happens securely in your browser.
      </Typography>
    </Box>
  );
};

export default FileUploader;