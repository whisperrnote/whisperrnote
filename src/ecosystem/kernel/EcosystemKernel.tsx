"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Box, Paper, IconButton, Typography, Stack, alpha, Tooltip } from '@mui/material';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
  GripHorizontal,
  Lock,
  Layers,
  ChevronUp
} from 'lucide-react';
import { getEcosystemUrl } from '@/constants/ecosystem';

/**
 * Kernel Types & Interfaces
 */
export type WindowMode = 'native' | 'remote';
export type WindowStatus = 'normal' | 'minimized' | 'maximized' | 'locked';

export interface WindowInstance {
  id: string;
  title: string;
  url?: string;
  component?: ReactNode;
  mode: WindowMode;
  status: WindowStatus;
  zIndex: number;
  icon?: ReactNode;
  appId: string;
  dimensions: { width: number | string; height: number | string };
  position: { x: number; y: number };
}

interface KernelContextType {
  windows: WindowInstance[];
  activeWindowId: string | null;
  launchWindow: (params: Omit<WindowInstance, 'id' | 'zIndex' | 'status' | 'position'>) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  lockWindow: (id: string) => void;
  unlockWindow: (id: string) => void;
  popOutWindow: (id: string) => void;
}

const KernelContext = createContext<KernelContextType | undefined>(undefined);

export const useKernel = () => {
  const context = useContext(KernelContext);
  if (!context) throw new Error('useKernel must be used within KernelProvider');
  return context;
};

/**
 * The Kernel Provider: Orchestrates the entire Ecosystem OS
 */
export const KernelProvider = ({ children }: { children: ReactNode }) => {
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(1000);

  const focusWindow = useCallback((id: string) => {
    setActiveWindowId(id);
    setMaxZIndex(prev => prev + 1);
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, zIndex: maxZIndex + 1, status: w.status === 'minimized' ? 'normal' : w.status } : w
    ));
  }, [maxZIndex]);

  const launchWindow = useCallback((params: Omit<WindowInstance, 'id' | 'zIndex' | 'status' | 'position'>) => {
    const id = `win_${Math.random().toString(36).substring(7)}`;
    const newWindow: WindowInstance = {
      ...params,
      id,
      status: 'normal',
      zIndex: maxZIndex + 1,
      position: { x: 100 + (windows.length * 30), y: 100 + (windows.length * 30) }
    };
    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(id);
    setMaxZIndex(prev => prev + 1);
  }, [maxZIndex, windows.length]);

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) setActiveWindowId(null);
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: 'minimized' } : w));
  };

  const maximizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: w.status === 'maximized' ? 'normal' : 'maximized' } : w));
  };

  const lockWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: 'locked' } : w));
  };

  const unlockWindow = (id: string) => {
    setWindows(prev => prev.map(w => (w.id === id && w.status === 'locked') ? { ...w, status: 'normal' } : w));
  };

  const popOutWindow = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    
    // Serialization for Pop-out
    const state = btoa(JSON.stringify({
      title: win.title,
      url: win.url,
      appId: win.appId
    }));
    
    window.open(`/popout?state=${state}`, '_blank', 'width=800,height=600');
    closeWindow(id);
  };

  /**
   * Cross-Origin Communication Handler
   * Listens for messages from embedded windows
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if possible, though subdomains might vary
      const { type, payload } = event.data;
      if (!type) return;

      switch (type) {
        case 'WHISPERR_LAUNCH_WINDOW':
          launchWindow(payload);
          break;
        case 'WHISPERR_LOCK_SYSTEM':
          // Identify which window sent this or lock all?
          // For now, let's lock the active window
          if (activeWindowId) lockWindow(activeWindowId);
          break;
        case 'WHISPERR_UNLOCK_SYSTEM':
          if (activeWindowId) unlockWindow(activeWindowId);
          break;
        case 'WHISPERR_CLOSE_SELF':
          const target = windows.find(w => w.url?.includes(event.origin));
          if (target) closeWindow(target.id);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [launchWindow, activeWindowId, windows]);

  return (
    <KernelContext.Provider value={{ 
      windows, 
      activeWindowId, 
      launchWindow, 
      closeWindow, 
      minimizeWindow,
      maximizeWindow,
      focusWindow,
      lockWindow,
      unlockWindow,
      popOutWindow
    }}>
      {children}
      
      {/* OS Rendering Layer */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        pointerEvents: 'none', 
        zIndex: 9999,
        overflow: 'hidden'
      }}>
        <AnimatePresence>
          {windows.filter(w => w.status !== 'minimized').map((win) => (
            <EcosystemWindow 
              key={win.id} 
              window={win} 
              isActive={activeWindowId === win.id}
            />
          ))}
        </AnimatePresence>

        {/* The Pocket (Taskbar) */}
        <Pocket windows={windows} />
      </Box>
    </KernelContext.Provider>
  );
};

/**
 * Ecosystem Window Chrome
 */
const EcosystemWindow = ({ window: win, isActive }: { window: WindowInstance, isActive: boolean }) => {
  const { closeWindow, focusWindow, minimizeWindow, maximizeWindow, popOutWindow } = useKernel();
  const isMax = win.status === 'maximized';
  const isLocked = win.status === 'locked';

  return (
    <motion.div
      layoutId={win.id}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        zIndex: win.zIndex,
        width: isMax ? '100vw' : win.dimensions.width,
        height: isMax ? '100vh' : win.dimensions.height,
        left: isMax ? 0 : win.position.x,
        top: isMax ? 0 : win.position.y,
        transition: { type: 'spring', damping: 25, stiffness: 300 }
      }}
      exit={{ opacity: 0, scale: 0.8, y: 40 }}
      drag={!isMax && !isLocked}
      dragMomentum={false}
      onMouseDown={() => focusWindow(win.id)}
      style={{
        position: 'absolute',
        pointerEvents: 'auto',
      }}
    >
      <Paper
        elevation={isActive ? 24 : 8}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMax ? 0 : 4,
          background: alpha('#0A0A0A', 0.85),
          backdropFilter: 'blur(30px) saturate(180%)',
          border: isActive ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isActive ? '0 0 40px rgba(0, 240, 255, 0.1)' : '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'border 0.2s, box-shadow 0.2s'
        }}
      >
        {/* Titlebar */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)',
            cursor: isMax ? 'default' : 'grab',
            '&:active': { cursor: isMax ? 'default' : 'grabbing' }
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ color: isActive ? '#00F0FF' : 'rgba(255,255,255,0.4)', display: 'flex' }}>
              {win.icon || <Layers size={14} />}
            </Box>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: isActive ? 800 : 600, 
              fontSize: '0.75rem', 
              color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              {win.title}
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={0.5}>
            <WindowControl icon={<Minimize2 size={13} />} onClick={() => minimizeWindow(win.id)} />
            <WindowControl icon={isMax ? <Minimize2 size={13} /> : <Maximize2 size={13} />} onClick={() => maximizeWindow(win.id)} />
            <WindowControl icon={<ExternalLink size={13} />} onClick={() => popOutWindow(win.id)} />
            <WindowControl icon={<X size={13} />} onClick={() => closeWindow(win.id)} hoverColor="#ff4444" />
          </Stack>
        </Box>

        {/* Content Layer */}
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          background: '#000',
          filter: isLocked ? 'blur(20px)' : 'none',
          transition: 'filter 0.4s ease'
        }}>
          {win.mode === 'remote' ? (
            <iframe 
              src={win.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={win.title}
            />
          ) : (
            win.component
          )}

          {/* Locked Overlay */}
          <AnimatePresence>
            {isLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(5px)'
                }}
              >
                <Stack spacing={2} alignItems="center">
                  <Lock size={48} color="#00F0FF" />
                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'white' }}>SYSTEM LOCK</Typography>
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Paper>
    </motion.div>
  );
};

const WindowControl = ({ icon, onClick, hoverColor }: { icon: any, onClick: () => void, hoverColor?: string }) => (
  <IconButton 
    size="small" 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    sx={{ 
      color: 'rgba(255,255,255,0.4)',
      borderRadius: '8px',
      p: 0.8,
      '&:hover': { 
        color: hoverColor || '#00F0FF',
        background: 'rgba(255,255,255,0.05)'
      }
    }}
  >
    {icon}
  </IconButton>
);

/**
 * The Pocket: Taskbar for minimized windows
 */
const Pocket = ({ windows }: { windows: WindowInstance[] }) => {
  const { focusWindow } = useKernel();
  const minimized = windows.filter(w => w.status === 'minimized');

  return (
    <Box sx={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 1.5,
      p: 1.5,
      borderRadius: '24px',
      background: 'rgba(10, 10, 10, 0.4)',
      backdropFilter: 'blur(30px)',
      border: '1px solid rgba(255,255,255,0.08)',
      pointerEvents: 'auto',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    }}>
      <AnimatePresence>
        {minimized.map((win) => (
          <motion.div
            key={win.id}
            initial={{ scale: 0, width: 0, opacity: 0 }}
            animate={{ scale: 1, width: 'auto', opacity: 1 }}
            exit={{ scale: 0, width: 0, opacity: 0 }}
            whileHover={{ y: -5 }}
          >
            <Tooltip title={win.title} arrow placement="top">
              <Box
                onClick={() => focusWindow(win.id)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: '#00F0FF'
                  }
                }}
              >
                {win.icon || <Layers size={20} color="rgba(255,255,255,0.6)" />}
              </Box>
            </Tooltip>
          </motion.div>
        ))}
      </AnimatePresence>

      <Box sx={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', alignSelf: 'center', mx: 0.5 }} />
      <IconButton sx={{ color: 'rgba(255,255,255,0.3)' }} size="small">
        <ChevronUp size={18} />
      </IconButton>
    </Box>
  );
};
