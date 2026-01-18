"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNote, updateNote, deleteNote } from '@/lib/appwrite';
import type { Notes } from '@/types/appwrite';
import { NoteDetailSidebar } from '@/components/ui/NoteDetailSidebar';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  CircularProgress, 
  Container, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  useTheme, 
  useMediaQuery,
  alpha
} from '@mui/material';
import { 
  Remove as MinusIcon, 
  Delete as TrashIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useToast } from '@/components/ui/Toast';
import CommentsSection from '@/app/(app)/notes/Comments';
import NoteReactions from '@/app/(app)/notes/NoteReactions';

export default function NoteEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Notes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showSuccess, showError } = useToast();
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    let mounted = true;

    if (!id) {
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        const fetched = await getNote(id as string);
        if (mounted) {
          setNote(fetched);
        }
      } catch (error) {
        console.error('Failed to load note', error);
        showError('Failed to load note', 'Please try again later.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, showError]);

  const handleUpdate = async (updated: Notes) => {
    setIsSaving(true);
    try {
      const saved = await updateNote(updated.$id || (id as string) || '', updated);
      setNote(saved);
      showSuccess('Saved', 'Note updated successfully');
    } catch (error) {
      console.error('Update failed', error);
      showError('Update failed', 'Could not save your changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      showSuccess('Deleted', 'Note removed');
      router.push('/notes');
    } catch (error) {
      console.error('Delete failed', error);
      showError('Delete failed', 'Could not delete the note.');
    } finally {
      setIsDeleting(false);
    }
  };

  const title = useMemo(() => note?.title || 'Untitled note', [note]);

  const handleMinimize = () => {
    if (!note?.$id) return;
    const target = isMobileViewport ? '/notes' : `/notes?openNoteId=${note.$id}`;
    router.push(target);
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!note) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography color="text.secondary">Note not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 2, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          pb: 3,
          mb: 4
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleMinimize}
              disabled={isDeleting}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<TrashIcon />}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              sx={{ 
                borderRadius: 3,
                px: 3,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.2),
                  borderColor: 'error.main',
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        </Box>
        
        <Box component="main">
          <NoteDetailSidebar
            note={note}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            showExpandButton={false}
            showHeaderDeleteButton={false}
          />
        </Box>

        <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <NoteReactions targetId={id as string} />
          <Box sx={{ mt: 3 }}>
            <CommentsSection noteId={id as string} />
          </Box>
        </Box>
      </Container>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: 6,
            bgcolor: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundImage: 'none',
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem' }}>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }}>
            Deleting this note is permanent. Are you sure?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            variant="contained" 
            color="error"
            fullWidth
            onClick={() => {
              if (note?.$id) {
                handleDelete(note.$id);
              }
              setShowDeleteConfirm(false);
            }}
            disabled={isDeleting}
            sx={{ borderRadius: 3 }}
          >
            Delete note
          </Button>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => setShowDeleteConfirm(false)}
            sx={{ 
              borderRadius: 3,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'text.primary'
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

