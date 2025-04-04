// theme.js - Material UI theme for colorful MyPharma web app

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00695c', // teal
    },
    secondary: {
      main: '#ff4081', // pink
    },
    background: {
      default: '#f0f4f8',
    },
  },
  typography: {
    fontFamily: 'Poppins, sans-serif',
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '1rem',
          borderRadius: '16px',
        },
      },
    },
  },
});

export default theme;
