import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import DescriptionIcon from '@mui/icons-material/Description';
import DangerousIcon from '@mui/icons-material/Dangerous';
import CodeIcon from '@mui/icons-material/Code';
import { AnalysisResult } from '../types';

interface AnalysisDashboardProps {
  result: AnalysisResult;
}

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AnalysisDashboard = ({ result }: AnalysisDashboardProps) => {
  const { totalFiles, totalSize, filesToIncludeCount, filesToExcludeCount, sensitiveDataFoundCount } = result;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Initial Analysis:</Typography>
      <List dense disablePadding>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 35 }}><FolderZipIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Total Files Found: ${totalFiles}`} />
        </ListItem>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 35 }}><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Total Size: ${formatBytes(totalSize)}`} />
        </ListItem>
         <ListItem>
          <ListItemIcon sx={{ minWidth: 35 }}><CodeIcon color="success" fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Files Initially Included: ${filesToIncludeCount}`} />
        </ListItem>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 35 }}><DescriptionIcon color="warning" fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Files Initially Excluded (gitignore/binary/media): ${filesToExcludeCount}`} />
        </ListItem>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 35 }}><DangerousIcon color={sensitiveDataFoundCount > 0 ? "error" : "disabled"} fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Potential Sensitive Files Found: ${sensitiveDataFoundCount}`} />
        </ListItem>
      </List>
       <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
        Review the list below to adjust selections before processing.
      </Typography>
    </Box>
  );
};

export default AnalysisDashboard;