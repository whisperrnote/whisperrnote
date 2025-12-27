'use client';

import React, { useState } from 'react';
import DoodleCanvas from '@/components/DoodleCanvas';
import DoodleViewer from '@/components/DoodleViewer';
import { Box, Typography, Button, TextField, Paper } from '@mui/material';
import { Edit as EditIcon, Brush as BrushIcon } from '@mui/icons-material';

interface NoteContentProps {
  format?: 'text' | 'doodle';
  content: string;
  onChange: (content: string) => void;
  onFormatChange: (format: 'text' | 'doodle') => void;
  disabled?: boolean;
}

export default function NoteContent({
  format = 'text',
  content,
  onChange,
  onFormatChange,
  disabled = false,
}: NoteContentProps) {
  const [showDoodleEditor, setShowDoodleEditor] = useState(false);

  const handleDoodleSave = (doodleData: string) => {
    onChange(doodleData);
    onFormatChange('doodle');
    setShowDoodleEditor(false);
  };

  const handleEditDoodle = () => {
    setShowDoodleEditor(true);
  };

  const handleSwitchToText = () => {
    onFormatChange('text');
    onChange('');
  };

  const handleSwitchToDoodle = () => {
    setShowDoodleEditor(true);
  };

  if (format === 'doodle') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {content && (
          <DoodleViewer data={content} onEdit={handleEditDoodle} />
        )}

        {!content && (
          <Paper 
            variant="outlined" 
            sx={{ 
              textAlign: 'center', 
              py: 6, 
              borderRadius: 3, 
              borderStyle: 'dashed',
              bgcolor: 'transparent'
            }}
          >
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No doodle yet
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleSwitchToDoodle} 
              disabled={disabled}
              startIcon={<BrushIcon />}
            >
              Create Doodle
            </Button>
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {content && (
            <Button
              variant="outlined"
              onClick={handleEditDoodle}
              disabled={disabled}
              startIcon={<EditIcon />}
            >
              Edit Doodle
            </Button>
          )}
          <Button
            variant="text"
            onClick={handleSwitchToText}
            disabled={disabled}
            size="small"
          >
            Switch to Text
          </Button>
        </Box>

        {showDoodleEditor && (
          <DoodleCanvas
            initialData={content}
            onSave={handleDoodleSave}
            onClose={() => setShowDoodleEditor(false)}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        placeholder="Write your note content here..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        multiline
        minRows={8}
        fullWidth
        inputProps={{ maxLength: 65000 }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
        }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
        {content.length}/65000 characters
      </Typography>

      <Button
        variant="outlined"
        onClick={handleSwitchToDoodle}
        disabled={disabled}
        startIcon={<BrushIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Create Doodle
      </Button>

      {showDoodleEditor && (
        <DoodleCanvas
          initialData=""
          onSave={handleDoodleSave}
          onClose={() => setShowDoodleEditor(false)}
        />
      )}
    </Box>
  );
}

