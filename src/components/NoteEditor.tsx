'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Alert,
  Skeleton,
  Chip,
  alpha,
  useTheme,
  TextField,
  Button,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, Update as UpdateIcon } from '@mui/icons-material';
import AttachmentsManager from '@/components/AttachmentsManager';
import NoteContent from '@/components/NoteContent';
import { formatFileSize } from '@/lib/utils';
import { createNote, updateNote, getNote } from '@/lib/appwrite';

interface AttachmentMeta { id: string; name: string; size: number; mime: string | null; }

const AttachmentChips: React.FC<{ noteId: string }> = ({ noteId }) => {
  const [attachments, setAttachments] = React.useState<AttachmentMeta[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const theme = useTheme();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!noteId) return;
      try {
        const res = await fetch(`/api/notes/${noteId}/attachments`);
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setAttachments(Array.isArray(j.attachments)? j.attachments: []);
      } catch {}
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [noteId]);

  if (!noteId) return null;
  if (!loaded) {
    return (
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        {Array.from({length:3}).map((_,i)=>(
          <Skeleton key={i} variant="rounded" width={80} height={24} sx={{ borderRadius: 12, bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
        ))}
      </Stack>
    );
  }
  if (attachments.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
      {attachments.map(a => (
        <Chip
          key={a.id}
          label={truncate(a.name, 18)}
          component="a"
          href={`/notes/${noteId}/${a.id}`}
          clickable
          size="small"
          sx={{
            bgcolor: alpha('#00F5FF', 0.1),
            color: '#00F5FF',
            border: `1px solid ${alpha('#00F5FF', 0.2)}`,
            fontSize: '11px',
            fontWeight: 700,
            '&:hover': { bgcolor: alpha('#00F5FF', 0.2) }
          }}
          title={`${a.name} • ${formatFileSize(a.size)}${a.mime? ' • '+a.mime:''}`}
        />
      ))}
    </Box>
  );
};

function truncate(s: string, n: number){ return s.length>n? s.slice(0,n-1)+'…': s; }

interface NoteEditorProps {
  initialContent?: string;
  initialTitle?: string;
  initialFormat?: 'text' | 'doodle';
  noteId?: string; // existing note id if editing
  onSave?: (note: any) => void; // called after create or update
  onNoteCreated?: (note: any) => void; // called only on first creation
}

export default function NoteEditor({ 
  initialContent = '', 
  initialTitle = '',
  initialFormat = 'text',
  noteId: externalNoteId,
  onSave,
  onNoteCreated
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [format, setFormat] = useState<'text' | 'doodle'>(initialFormat);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalNoteId, setInternalNoteId] = useState<string | undefined>(externalNoteId);
  const effectiveNoteId = internalNoteId || externalNoteId;

  useEffect(() => {
    if (externalNoteId && externalNoteId !== internalNoteId) {
      setInternalNoteId(externalNoteId);
      (async () => {
        try {
          const n = await getNote(externalNoteId);
          if (n) {
            setTitle(n.title || '');
            setContent(n.content || '');
            setFormat((n.format as 'text' | 'doodle') || 'text');
            setIsPublic(!!n.isPublic);
          }
        } catch {}
      })();
    }
  }, [externalNoteId]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      let saved: any;
      if (effectiveNoteId) {
        saved = await updateNote(effectiveNoteId, { 
          title: title.trim(), 
          content: content.trim(),
          format,
          isPublic
        });
      } else {
        saved = await createNote({ 
          title: title.trim(), 
          content: content.trim(), 
          format,
          isPublic,
          tags: [] 
        });
        setInternalNoteId(saved?.$id || saved?.id);
        onNoteCreated?.(saved);
      }
      onSave?.(saved);
    } catch (err: any) {
      setError(err?.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(25px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '32px',
        backgroundImage: 'none',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)'
      }}
    >
      <Stack spacing={4}>
        <TextField
          fullWidth
          placeholder="Note Title"
          variant="standard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          InputProps={{
            disableUnderline: true,
            sx: { 
              fontSize: { xs: '1.5rem', md: '2rem' }, 
              fontWeight: 900, 
              color: 'white',
              letterSpacing: '-0.03em',
              '& input::placeholder': {
                color: 'rgba(255, 255, 255, 0.2)',
                opacity: 1
              }
            }
          }}
        />

        <NoteContent
          format={format}
          content={content}
          onChange={setContent}
          onFormatChange={setFormat}
          disabled={isSaving}
        />

        {effectiveNoteId && (
          <Box sx={{ 
            p: 3, 
            bgcolor: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <AttachmentsManager noteId={effectiveNoteId} />
            <AttachmentChips noteId={effectiveNoteId} />
          </Box>
        )}

        {!effectiveNoteId && (
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha('#00F5FF', 0.05), 
            borderRadius: '16px',
            border: '1px solid',
            borderColor: alpha('#00F5FF', 0.1),
            textAlign: 'center'
          }}>
            <Typography variant="caption" sx={{ color: '#00F5FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Save the note to enable attachments.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255, 255, 255, 0.03)', px: 2, py: 1, borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
              Visibility:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                onClick={() => setIsPublic(false)}
                sx={{
                  minWidth: '70px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  py: 0.5,
                  bgcolor: !isPublic ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: !isPublic ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' }
                }}
              >
                Private
              </Button>
              <Button
                size="small"
                onClick={() => setIsPublic(true)}
                sx={{
                  minWidth: '70px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  py: 0.5,
                  bgcolor: isPublic ? alpha('#00F5FF', 0.2) : 'transparent',
                  color: isPublic ? '#00F5FF' : 'rgba(255, 255, 255, 0.3)',
                  '&:hover': { bgcolor: alpha('#00F5FF', 0.3) }
                }}
              >
                Public
              </Button>
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : (effectiveNoteId ? <UpdateIcon /> : <SaveIcon />)}
            sx={{
              bgcolor: '#00F5FF',
              color: '#000',
              fontWeight: 900,
              px: 4,
              py: 1.5,
              borderRadius: '14px',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                bgcolor: alpha('#00F5FF', 0.8),
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha('#00F5FF', 0.4)}`
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.2)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {effectiveNoteId ? 'Update Note' : 'Save & Enable Attachments'}
          </Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: '16px',
              bgcolor: alpha('#FF3B30', 0.1),
              color: '#FF3B30',
              border: '1px solid',
              borderColor: alpha('#FF3B30', 0.2),
              '& .MuiAlert-icon': { color: '#FF3B30' }
            }}
          >
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}


