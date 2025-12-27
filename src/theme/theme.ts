'use client';

import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';

const getDesignTokens = (): ThemeOptions => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00F5FF', // Electric Teal
      contrastText: '#000000',
    },
    secondary: {
      main: '#F2F2F2', // Titanium
    },
    background: {
      default: '#000000', // The Void
      paper: '#0A0A0A',   // The Surface
    },
    text: {
      primary: '#F2F2F2',   // Titanium
      secondary: '#A1A1AA', // Gunmetal
      disabled: '#404040',  // Carbon
    },
    divider: 'rgba(255, 255, 255, 0.1)', // Subtle Border
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '3.5rem',
      fontWeight: 900,
      letterSpacing: '-0.04em',
      color: '#F2F2F2',
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 900,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '2rem',
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 900,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem',
      color: '#A1A1AA',
    },
    button: {
      fontFamily: '"Space Grotesk", sans-serif',
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: Array(25).fill('none') as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#F2F2F2',
          scrollbarColor: '#222222 transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 12,
            backgroundColor: '#222222',
            '&:hover': {
              backgroundColor: '#404040',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            borderColor: 'rgba(0, 245, 255, 0.5)',
            backgroundColor: 'rgba(0, 245, 255, 0.05)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          backgroundColor: '#00F5FF',
          color: '#000000',
          border: 'none',
          '&:hover': {
            backgroundColor: alpha('#00F5FF', 0.8),
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(0, 245, 255, 0.3)',
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(25px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        },
      },
    },
  },
});

export const darkTheme = createTheme(getDesignTokens());
export const lightTheme = darkTheme;

export default darkTheme;
