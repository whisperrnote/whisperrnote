"use client";

import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  Tooltip,
  alpha 
} from '@mui/material';
import { 
  Send as SendIcon, 
  Add as AddIcon,
  Description as NoteIcon
} from '@mui/icons-material';

/**
 * QuickNote Contribution
 * A miniaturized note-creation widget for the ecosystem.
 */
export const QuickNote = () => {
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!note.trim()) return;
        setIsSaving(true);
        // Simulate saving to WhisperrNote API
        console.log('Saving note to ecosystem:', note);
        setTimeout(() => {
            setNote('');
            setIsSaving(false);
            alert('Note saved to WhisperrNote!');
        }, 800);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(0, 245, 255, 0.2)',
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                    p: 1, 
                    borderRadius: '10px', 
                    bgcolor: alpha('#00F5FF', 0.1),
                    color: '#00F5FF'
                }}>
                    <NoteIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>
                    Quick Note
                </Typography>
            </Box>

            <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Jot something down..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                variant="standard"
                InputProps={{
                    disableUnderline: true,
                    sx: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                    }
                }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Tooltip title="Save to Note">
                    <IconButton 
                        onClick={handleSave}
                        disabled={!note.trim() || isSaving}
                        sx={{ 
                            color: '#00F5FF',
                            bgcolor: alpha('#00F5FF', 0.1),
                            '&:hover': { bgcolor: alpha('#00F5FF', 0.2) },
                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.1)' }
                        }}
                    >
                        <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};
