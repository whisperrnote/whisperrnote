"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { deleteNote } from '@/lib/appwrite';
import { useNotes } from '@/contexts/NotesContext';

import { useOverlay } from '@/components/ui/OverlayContext';

import { useSearchParams, useRouter } from 'next/navigation';
import type { Notes } from '@/types/appwrite.d';
import NoteCard from '@/components/ui/NoteCard';
import { NoteGridSkeleton } from '@/components/ui/NoteCardSkeleton';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useSearch } from '@/hooks/useSearch';
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import CreateNoteForm from './CreateNoteForm';
import { MobileBottomNav } from '@/components/Navigation';

import { MobileFAB } from '@/components/MobileFAB';
import { useSidebar } from '@/components/ui/SidebarContext';
import { useDynamicSidebar } from '@/components/ui/DynamicSidebar';
import { NoteDetailSidebar } from '@/components/ui/NoteDetailSidebar';

import { NotesErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function NotesPage() {
  const { notes: allNotes, totalNotes, isLoading: isInitialLoading, hasMore, loadMore, upsertNote, removeNote } = useNotes();
  const { openOverlay, closeOverlay } = useOverlay();

  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { isOpen: isDynamicSidebarOpen, openSidebar } = useDynamicSidebar();
  const searchParams = useSearchParams();
  const router = useRouter();
  const openNoteIdParam = searchParams.get('openNoteId');

  // Fetch notes action for the search hook
  const fetchNotesAction = async () => {
    // Data is now coming from context, so we just return it
    return {
      documents: allNotes,
      total: allNotes.length
    };
  };

  // Search and pagination configuration
  const searchConfig = {
    searchFields: ['title', 'content', 'tags'],
    localSearch: true,
    threshold: 500,
    debounceMs: 300
  };

  // Derive UI page size from viewport (simple heuristic) or env
  const derivedPageSize = (() => {
    if (typeof window === 'undefined') return 12;
    const width = window.innerWidth;
    if (width < 640) return 8;
    if (width < 1024) return 12;
    if (width < 1440) return 16;
    return 20;
  })();

  const paginationConfig = {
    pageSize: derivedPageSize
  };

  // Use the search hook
  const {
    items: paginatedNotes,
    totalCount,
    error,
    searchQuery,
    setSearchQuery,
    hasSearchResults,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    clearSearch
  } = useSearch({
    data: allNotes,
    fetchDataAction: fetchNotesAction,
    searchConfig,
    paginationConfig
  });

  const handleNoteCreated = useCallback((newNote: Notes) => {
    upsertNote(newNote);
  }, [upsertNote]);

  // Removed AI generation logic from core page to fully decouple.
  // URL ai-prompt parameter no longer auto-triggers AI generation.
  useEffect(() => {
    const openCreateNote = typeof window !== 'undefined' ? sessionStorage.getItem('open-create-note') : null;
    if (openCreateNote) {
      try { sessionStorage.removeItem('open-create-note'); } catch {}
      openOverlay(<CreateNoteForm onNoteCreated={handleNoteCreated} />);
    }
  }, [openOverlay, handleNoteCreated]);

  // Handle format query parameter for doodle creation
  useEffect(() => {
    const format = searchParams.get('format');
    if (format === 'doodle') {
      // Remove the format param from URL
      window.history.replaceState({}, '', '/notes');
      openOverlay(<CreateNoteForm initialFormat="doodle" onNoteCreated={handleNoteCreated} />);
    }
  }, [searchParams, openOverlay, handleNoteCreated]);

  const handleNoteUpdated = useCallback((updatedNote: Notes) => {
    if (!updatedNote.$id) {
      console.error('Cannot update note: missing ID');
      return;
    }
    upsertNote(updatedNote);
  }, [upsertNote]);

  const handleToggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, [setIsCollapsed]);

  const handleNoteDeleted = useCallback(async (noteId: string) => {
    if (!noteId) {
      console.error('Cannot delete note: missing ID');
      return;
    }
    await deleteNote(noteId);
    removeNote(noteId);
  }, [removeNote]);

  useEffect(() => {
    if (!openNoteIdParam) return;

    const targetNote = allNotes.find((candidate) => candidate.$id === openNoteIdParam);
    const cleanParams = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      params.delete('openNoteId');
      const path = `/notes${params.toString() ? `?${params.toString()}` : ''}`;
      router.replace(path, { forceOptimisticNavigation: true });
    };

    if (!targetNote) {
      cleanParams();
      return;
    }

    openSidebar(
      <NoteDetailSidebar
        note={targetNote}
        onUpdate={handleNoteUpdated}
        onDelete={handleNoteDeleted}
      />
    );

    cleanParams();
  }, [openNoteIdParam, allNotes, openSidebar, handleNoteUpdated, handleNoteDeleted, router]);

  const handleCreateNoteClick = () => {
    openOverlay(<CreateNoteForm onNoteCreated={handleNoteCreated} />);
  };

  // Calculate available space and determine optimal card size
  const getGridClasses = () => {
    if (!isCollapsed && isDynamicSidebarOpen) {
      return 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]';
    } else if (!isCollapsed || isDynamicSidebarOpen) {
      return 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]';
    } else {
      return 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]';
    }
  };

  // Get tags from existing notes for filtering
  const existingTags = Array.from(new Set(allNotes.flatMap(note => note.tags || [])));
  const tags = existingTags.length > 0 ? existingTags.slice(0, 8) : ['Personal', 'Work', 'Ideas', 'To-Do'];

  return (
    <NotesErrorBoundary>
      <div className="flex-1 min-h-screen">
        {/* Mobile Header - Hidden on Desktop */}
        <header className="mb-8 flex items-center justify-between md:hidden">
          <h1 className="text-3xl font-bold text-foreground">
            Notes
          </h1>
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={handleCreateNoteClick}>
              <PlusCircleIcon className="h-6 w-6" />
            </Button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-2">
            My Notes
          </h1>
          <p className="text-lg text-muted">
            {allNotes.length < totalNotes && !hasSearchResults ? (
              <>Loaded {allNotes.length} of {totalNotes} notes</>
            ) : (
              <>{hasSearchResults ? `${totalCount} ${totalCount === 1 ? 'note' : 'notes'} (filtered from ${totalNotes})` : `${totalNotes} ${totalNotes === 1 ? 'note' : 'notes'} in your collection`}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            ) : (
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            )}
          </Button>
          <Button onClick={handleCreateNoteClick} size="icon">
            <PlusCircleIcon className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 items-center">
          {tags.map((tag, index) => (
            <Button 
              key={index} 
              variant={searchQuery === tag ? 'default' : 'secondary'} 
              size="sm" 
              className="whitespace-nowrap"
              aria-pressed={searchQuery === tag}
              onClick={() => searchQuery === tag ? clearSearch() : setSearchQuery(tag)}
            >
              {tag}
            </Button>
          ))}

          {hasSearchResults && (
            <Button variant="ghost" size="sm" onClick={clearSearch} className="ml-2">
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Top Pagination */}
      {totalPages > 1 && (
        <div className="mb-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
            totalCount={hasSearchResults ? totalCount : allNotes.length}
            pageSize={paginationConfig.pageSize}
            compact={false}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Notes Grid */}
      {isInitialLoading ? (
        <NoteGridSkeleton count={12} />
      ) : paginatedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            {hasSearchResults ? (
              <MagnifyingGlassIcon className="h-12 w-12 text-muted" />
            ) : (
              <PlusCircleIcon className="h-12 w-12 text-muted" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            {hasSearchResults ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-muted mb-6 max-w-md">
            {hasSearchResults 
              ? `No notes match "${searchQuery}". Try different keywords or create a new note.`
              : 'Start your knowledge journey by creating your first note. Capture ideas, thoughts, and insights.'
            }
          </p>
          {hasSearchResults ? (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={clearSearch}>
                Clear Search
              </Button>
              <Button onClick={handleCreateNoteClick} className="gap-2">
                <PlusCircleIcon className="h-5 w-5" />
                Create Note
              </Button>
            </div>
          ) : (
            <Button onClick={handleCreateNoteClick} className="gap-2">
              <PlusCircleIcon className="h-5 w-5" />
              Create Your First Note
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className={getGridClasses()}>
            {paginatedNotes.map((note) => (
              <NoteCard 
                key={note.$id} 
                note={note} 
                onUpdate={handleNoteUpdated}
                onDelete={handleNoteDeleted}
              />
            ))}
          </div>
          {hasMore && !isInitialLoading && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={loadMore}>Load More</Button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Pagination */}
        {totalPages > 1 && paginatedNotes.length > 0 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
            totalCount={hasSearchResults ? totalCount : allNotes.length}
            pageSize={paginationConfig.pageSize}
            compact={false}
          />
        </div>
      )}

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Mobile FAB */}
        <MobileFAB />
      </div>
    </NotesErrorBoundary>
  );
}
