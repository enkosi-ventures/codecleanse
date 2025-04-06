import { createTheme } from '@mui/material/styles';
import { blue, pink } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    primary: {
      main: blue[700],
    },
    secondary: {
      main: pink[500],
    },
    background: {
      default: '#f4f6f8', // Light grey background
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    // Add more custom typography if needed
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // No uppercase buttons
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Slightly rounded cards
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Subtle shadow
        },
      },
    },
    // Customize other components as needed
  },
});

export default theme;