'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface DynamicSidebarContextType {
  isOpen: boolean;
  content: ReactNode | null;
  activeContentKey: string | null;
  openSidebar: (content: ReactNode, key?: string | null) => void;
  closeSidebar: () => void;
}

const DynamicSidebarContext = createContext<DynamicSidebarContextType | undefined>(undefined);

export function DynamicSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [activeContentKey, setActiveContentKey] = useState<string | null>(null);

  const openSidebar = React.useCallback(
    (newContent: ReactNode, key: string | null = null) => {
      if (isOpen && key && activeContentKey === key) {
        return;
      }
      setContent(newContent);
      setActiveContentKey(key);
      setIsOpen(true);
    },
    [activeContentKey, isOpen]
  );

  const closeSidebar = React.useCallback(() => {
    setIsOpen(false);
    // Delay clearing content to allow for exit animation
    setTimeout(() => {
      setContent(null);
      setActiveContentKey(null);
    }, 300);
  }, []);

  const providerValue = React.useMemo(
    () => ({ isOpen, content, activeContentKey, openSidebar, closeSidebar }),
    [isOpen, content, activeContentKey, openSidebar, closeSidebar]
  );

  return (
    <DynamicSidebarContext.Provider value={providerValue}>
      {children}
    </DynamicSidebarContext.Provider>
  );
}

export function useDynamicSidebar() {
  const context = useContext(DynamicSidebarContext);
  if (context === undefined) {
    throw new Error('useDynamicSidebar must be used within a DynamicSidebarProvider');
  }
  return context;
}

export function DynamicSidebar() {
  const { isOpen, content, closeSidebar } = useDynamicSidebar();
  const theme = useTheme();

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={closeSidebar}
      variant="temporary"
      PaperProps={{
        'data-dynamic-sidebar': 'true', // Add this to prevent layout listener from closing it
        sx: {
          width: {
            xs: '100%',
            sm: 400,
            md: 450,
            lg: 500
          },
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
    >
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        p: 3,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 900, 
            fontFamily: '"Space Grotesk", sans-serif',
            color: '#00F5FF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '1rem'
          }}
        >
          Details
        </Typography>
        <IconButton 
          onClick={closeSidebar} 
          size="small"
          sx={{ 
            color: 'rgba(255, 255, 255, 0.5)',
            '&:hover': { color: '#00F5FF', bgcolor: 'rgba(0, 245, 255, 0.1)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {content}
      </Box>
    </Drawer>
  );
}
