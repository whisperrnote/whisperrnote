"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNote, updateNote, deleteNote } from '@/lib/appwrite';
import type { Notes } from '@/types/appwrite.d';
import { NoteDetailSidebar } from '@/components/ui/NoteDetailSidebar';
import { Button } from '@/components/ui/Button';
import { MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/modal';
import { useTheme, useMediaQuery } from '@mui/material';

export default function NoteEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Notes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    let mounted = true;

    if (!id) {
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        const fetched = await getNote(id);
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
      const saved = await updateNote(updated.$id || id || '', updated);
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
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down('md'));

  const handleMinimize = () => {
    if (!note?.$id) return;
    const target = isMobileViewport ? '/notes' : `/notes?openNoteId=${note.$id}`;
    router.push(target);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <p className="text-muted">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMinimize}
              disabled={isDeleting}
              aria-label="Minimize to notes sidebar"
            >
              <MinusIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </header>
        <main className="mt-6">
          <NoteDetailSidebar
            note={note}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            showExpandButton={false}
            showHeaderDeleteButton={false}
          />
        </main>
      </div>
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm delete"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            Deleting this note is permanent. Are you sure?
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (note?.$id) {
                  handleDelete(note.$id);
                }
                setShowDeleteConfirm(false);
              }}
              className="flex-1"
              disabled={isDeleting}
            >
              Delete note
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
