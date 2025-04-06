import React, { ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import Input from '@mui/material/Input'; // Use MUI Input or standard input

const TempFileUploader: React.FC = () => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      console.log('Files selected:', event.target.files.length);
      // Basic verification: Log file names or count
      Array.from(event.target.files).forEach(file => {
         // Note: 'webkitRelativePath' gives the path within the directory
         console.log(`- ${file.name} (Path: ${(file as any).webkitRelativePath || file.name})`);
      });
    }
  };

  return (
    <div>
      <label htmlFor="directory-upload-input">
        <Input
          id="directory-upload-input"
          type="file"
          inputProps={{ webkitdirectory: "true", multiple: true }} // Enable directory selection
          onChange={handleFileChange}
          style={{ display: 'none' }} // Hide default input, use Button
        />
        <Button variant="contained" component="span">
          Upload Directory
        </Button>
      </label>
      <p><small>Select a directory to verify upload.</small></p>
    </div>
  );
};

export default TempFileUploader;