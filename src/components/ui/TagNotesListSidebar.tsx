'use client';

import React, { useState, useEffect } from 'react';
import { Notes, Tags } from '@/types/appwrite';
import { getNotesByTag } from '@/lib/appwrite';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import NoteCard from '@/components/ui/NoteCard';
import { NoteCardSkeleton } from './NoteCardSkeleton';

interface TagNotesListSidebarProps {
  tag: Tags;
  onBack: () => void;
  onNoteUpdate: (updatedNote: Notes) => void;
  onNoteDelete: (noteId: string) => void;
}

export function TagNotesListSidebar({
  tag,
  onBack,
  onNoteUpdate,
  onNoteDelete,
}: TagNotesListSidebarProps) {
  const [notes, setNotes] = useState<Notes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedNotes = await getNotesByTag(tag.$id);
        setNotes(fetchedNotes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch notes');
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [tag.$id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <NoteCardSkeleton key={index} />
            ))
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-foreground/60 text-sm">No notes with this tag</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {notes.map((note) => (
                <NoteCard
                  key={note.$id}
                  note={note}
                  onUpdate={onNoteUpdate}
                  onDelete={onNoteDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
