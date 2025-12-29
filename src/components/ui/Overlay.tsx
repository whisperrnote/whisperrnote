"use client";

import React from 'react';
import { 
  Modal, 
  Box, 
  Fade, 
  Backdrop,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useOverlay } from './OverlayContext';

const Overlay: React.FC = () => {
  const { isOpen, content, closeOverlay } = useOverlay();

  return (
    <Modal
      open={isOpen}
      onClose={closeOverlay}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
          sx: { 
            bgcolor: 'rgba(0, 0, 0, 0.8)', 
            backdropFilter: 'blur(10px)' 
          }
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1, sm: 2, md: 4 },
      }}
    >
      <Fade in={isOpen}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 'lg',
            maxHeight: '90vh',
            bgcolor: 'rgba(10, 10, 10, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            onClick={closeOverlay}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1,
              color: 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.2s ease',
              '&:hover': { 
                color: '#00F5FF',
                bgcolor: 'rgba(0, 245, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
            {content}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default Overlay;

