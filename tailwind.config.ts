import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-outfit)", "Outfit", "sans-serif"],
      },
      colors: {
        // Base color palette (very dark brown & brownish white per UI spec)
        'brown-darkest': '#1a120e', // very dark brown for dark mode foregrounds
        'brown-dark': '#2d221e',    // dark brown
        'brown-medium': '#6b5b4f',  // medium brown
        'brown-light': '#a69080',   // light brown
        'brown-lightest': '#f5f2f0', // brownish white for light mode foregrounds

        // Ash colors (dark ash & ash-white per UI spec) 
        'ash-darkest': '#0f0f0f',   // very dark ash for dark mode backgrounds
        'ash-dark': '#1a1a1a',      // dark ash
        'ash-medium': '#3c3c3c',    // medium ash
        'ash-light': '#d1d1d1',     // light ash
        'ash-lightest': '#f8f8f8',  // ash-white for light mode backgrounds

        // Sun yellow accent (as specified for avoiding monotony)
        'sun-yellow': '#ffc700',
        'sun-yellow-dark': '#d9a900',
        'sun-yellow-light': '#ffe066',

        // Light mode theme (brownish white fg, ash-white bg)
        'light-bg': '#f8f8f8',      // ash-white background
        'light-fg': '#0f0a08',      // much darker brown foreground for stronger contrast
        'light-card': '#ffffff',    // pure white for cards
        'light-border': '#e8e8e8',  // very light ash border
        'light-muted': '#3d2f26',   // darker brown for muted text

        // Dark mode theme (very dark brown fg, dark ash bg)
        'dark-bg': '#0f0f0f',       // very dark ash background
        'dark-fg': '#faf8f6',       // much lighter brownish white foreground for stronger contrast
        'dark-card': '#1a1a1a',     // dark ash for cards
        'dark-border': '#2a2a2a',   // medium dark ash border  
        'dark-muted': '#c4b5a8',    // lighter brown for muted text

        // Accent colors
        'accent': '#ffc700',        // sun-yellow
        'accent-hover': '#ffe066',  // lighter sun-yellow
        'accent-dark': '#d9a900',   // darker sun-yellow

        // Success, warning, error states
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',

        // CSS variable-based colors for dynamic theming
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'card': 'var(--card)',
        'border': 'var(--border)',
        'muted': 'var(--muted)',

        // Additional design system tokens
        'card-foreground': 'var(--foreground)',
        'muted-foreground': 'var(--muted)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        // 3D effect shadows as per UI spec
        '3d-light': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '3d-dark': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        '3d-elevated': '0 20px 40px -12px rgba(0, 0, 0, 0.25)',

        // Inner shadows for sunken effect
        'inner-light': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'inner-dark': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
        'inner-deep': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.4)',

        // Soft glows
        'glow-accent': '0 0 20px rgba(255, 199, 0, 0.3)',
        'glow-soft': '0 0 15px rgba(255, 255, 255, 0.1)',

        // Card shadows with brown/ash tints
        'card-light': '0 4px 16px rgba(45, 34, 30, 0.1), 0 2px 4px rgba(45, 34, 30, 0.06)',
        'card-dark': '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-delayed': 'fadeIn 0.5s ease-out',
        'progress': 'progress 2s ease-in-out infinite',
        'float-1': 'float1 3s ease-in-out infinite',
        'float-2': 'float2 3.5s ease-in-out infinite 0.5s',
        'float-3': 'float3 4s ease-in-out infinite 1s',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-slow-reverse': 'floatSlowReverse 7s ease-in-out infinite 2s',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          'from': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        progress: {
          '0%': { width: '0%' },
          '50%': { width: '100%' },
          '100%': { width: '0%' },
        },
        float1: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(5deg)' },
        },
        float2: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-3deg)' },
        },
        float3: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(8deg)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-5px) translateX(5px) rotate(2deg)' },
          '50%': { transform: 'translateY(-10px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(-5px) translateX(-5px) rotate(-2deg)' },
        },
        floatSlowReverse: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) translateX(-8px) rotate(-3deg)' },
          '50%': { transform: 'translateY(-15px) translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(-8px) translateX(8px) rotate(3deg)' },
        },
        slideInRight: {
          'from': {
            opacity: '0',
            transform: 'translateX(100%)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      }
    },
  },
  plugins: [],
};

export default config;
