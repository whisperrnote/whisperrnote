'use client';

import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Stack, 
  LinearProgress, 
  IconButton,
  alpha
} from '@mui/material';
import { CloudUpload as UploadIcon, Close as CloseIcon } from '@mui/icons-material';
import { addAttachmentToNote } from '@/lib/appwrite';

interface AttachmentsManagerProps {
  noteId: string;
  onAttachmentAdded?: (attachment: any) => void;
}

export default function AttachmentsManager({ noteId, onAttachmentAdded }: AttachmentsManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // For now, just handle one file at a time or loop through them
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await addAttachmentToNote(noteId, file);
        onAttachmentAdded?.(result);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon sx={{ fontSize: 18, color: '#00F5FF' }} /> Attachments
        </Typography>
        
        <input
          type="file"
          multiple
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <Button
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          sx={{
            color: '#00F5FF',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: alpha('#00F5FF', 0.1) }
          }}
        >
          {isUploading ? 'Uploading...' : 'Add Files'}
        </Button>
      </Stack>

      {isUploading && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <LinearProgress sx={{ 
            height: 6, 
            borderRadius: 3, 
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            '& .MuiLinearProgress-bar': { bgcolor: '#00F5FF' }
          }} />
        </Box>
      )}

      {error && (
        <Box sx={{ 
          mt: 1, 
          p: 1.5, 
          bgcolor: alpha('#ff4d4d', 0.1), 
          borderRadius: '8px',
          border: '1px solid',
          borderColor: alpha('#ff4d4d', 0.2),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="caption" sx={{ color: '#ff4d4d' }}>{error}</Typography>
          <IconButton size="small" onClick={() => setError(null)} sx={{ color: '#ff4d4d' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
