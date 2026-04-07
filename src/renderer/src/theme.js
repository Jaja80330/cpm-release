import { createTheme } from '@mui/material/styles'

export const muiDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0b0e11',
      paper:   '#15191d',
    },
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark:  '#1565c0',
    },
    secondary: {
      main: '#f44336',
    },
    success: {
      main: '#6ccb5f',
    },
    warning: {
      main: '#f0a030',
    },
    error: {
      main: '#fc3d39',
    },
    text: {
      primary:   '#e8eaed',
      secondary: '#9aa0a6',
      disabled:  '#5f6368',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontSize: 13,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: 13,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.15)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)',
          },
          fontSize: 13,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: 13,
          minHeight: 40,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 13,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: 11,
          height: 20,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          background: '#1e2328',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          background: '#2d3339',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
  },
})
