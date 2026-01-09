'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Fab, 
  IconButton, 
  Typography, 
  Backdrop, 
  Zoom, 
  Tooltip,
  alpha 
} from '@mui/material';
import { 
  Add as PlusIcon, 
  NoteAdd as DocumentPlusIcon, 
  Brush as PencilIcon 
} from '@mui/icons-material';
import { useOverlay } from '@/components/ui/OverlayContext';
import CreateNoteForm from '@/app/(app)/notes/CreateNoteForm';
import { sidebarIgnoreProps } from '@/constants/sidebar';

interface MobileFABProps {
  className?: string;
}

export const MobileFAB: React.FC<MobileFABProps> = ({ className = '' }) => {
  const { openOverlay, closeOverlay } = useOverlay();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreateNoteClick = () => {

    setIsExpanded(false);
    openOverlay(
      <CreateNoteForm 
        initialFormat="text"
        onNoteCreated={(newNote) => {
          console.log('Note created:', newNote);
        }} 
      />
    );
  };

  const handleCreateDoodleClick = () => {
    setIsExpanded(false);
    openOverlay(
      <CreateNoteForm 
        initialFormat="doodle"
        onNoteCreated={(newNote) => {
          console.log('Doodle created:', newNote);
        }} 
      />
    );
  };

  return (
    <Box

      sx={{
        position: 'fixed',
        bottom: 100, // Above MobileBottomNav
        right: 24,
        zIndex: 1400,
        display: { xs: 'flex', md: 'none' },
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2
      }}
      {...sidebarIgnoreProps}
    >
      <Backdrop
        open={isExpanded}
        onClick={() => setIsExpanded(false)}
        sx={{ 
          zIndex: -1, 
          bgcolor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Expanded Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
        <Zoom in={isExpanded} style={{ transitionDelay: isExpanded ? '50ms' : '0ms' }}>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.5, borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
              Doodle
            </Typography>
            <Fab
              size="medium"
              onClick={handleCreateDoodleClick}
              sx={{
                bgcolor: '#EC4899',
                color: 'white',
                '&:hover': { bgcolor: '#DB2777' },
                boxShadow: '0 8px 20px rgba(236, 72, 153, 0.4)'
              }}
            >
              <PencilIcon />
            </Fab>
          </Box>
        </Zoom>

        <Zoom in={isExpanded} style={{ transitionDelay: isExpanded ? '0ms' : '0ms' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.5, borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
              Note
            </Typography>
            <Fab
              size="medium"
              onClick={handleCreateNoteClick}
              sx={{
                bgcolor: '#3B82F6',
                color: 'white',
                '&:hover': { bgcolor: '#2563EB' },
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              <DocumentPlusIcon />
            </Fab>
          </Box>
        </Zoom>
      </Box>

      {/* Main FAB Button */}
      <Fab
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          width: 64,
          height: 64,
          bgcolor: '#00F5FF',
          color: '#000',
          borderRadius: '20px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: '#00D1DA',
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0, 245, 255, 0.4)'
          },
          ...(isExpanded && {
            transform: 'rotate(45deg)',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'none'
          })
        }}
      >
        <PlusIcon sx={{ fontSize: 32 }} />
      </Fab>
    </Box>
  );
};

export default MobileFAB;