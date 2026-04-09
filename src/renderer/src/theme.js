import { createTheme } from '@mui/material/styles'

const commonTypography = {
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
}

const commonShape = { borderRadius: 6 }

const commonComponents = {
  MuiButton: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 500, fontSize: 13 },
    },
  },
  MuiTextField: {
    defaultProps: { size: 'small', variant: 'outlined' },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontSize: 13, minHeight: 40 },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { fontSize: 13 },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontSize: 11, height: 20 },
    },
  },
}

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
    secondary: { main: '#f44336' },
    success:   { main: '#6ccb5f' },
    warning:   { main: '#f0a030' },
    error:     { main: '#fc3d39' },
    text: {
      primary:   '#e8eaed',
      secondary: '#9aa0a6',
      disabled:  '#5f6368',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: commonTypography,
  shape: commonShape,
  components: {
    ...commonComponents,
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
          fontSize: 13,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundImage: 'none', background: '#1e2328', border: '1px solid rgba(255,255,255,0.1)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: 12, background: '#2d3339', border: '1px solid rgba(255,255,255,0.1)' },
      },
    },
  },
})

export const muiLightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f0f2f5',
      paper:   '#ffffff',
    },
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark:  '#1565c0',
    },
    secondary: { main: '#e53935' },
    success:   { main: '#43a047' },
    warning:   { main: '#f0a030' },
    error:     { main: '#d32f2f' },
    text: {
      primary:   '#1a1f25',
      secondary: '#4a5568',
      disabled:  '#9aa0a6',
    },
    divider: 'rgba(0,0,0,0.1)',
  },
  typography: commonTypography,
  shape: commonShape,
  components: {
    ...commonComponents,
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.2)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.4)' },
          fontSize: 13,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundImage: 'none', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: 12, background: '#3d4550', border: '1px solid rgba(0,0,0,0.1)' },
      },
    },
  },
})

export function getTheme(isDark) {
  return isDark ? muiDarkTheme : muiLightTheme
}
