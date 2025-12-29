"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, IconButton, Chip, Alert, Skeleton } from '@mui/material';
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
  Search as MagnifyingGlassIcon,
  AddCircleOutline as PlusCircleIcon,
  Logout as ArrowLeftOnRectangleIcon,
  Login as ArrowRightOnRectangleIcon,
} from '@mui/icons-material';
import CreateNoteForm from './CreateNoteForm';
import { MobileBottomNav } from '@/components/Navigation';

import { MobileFAB } from '@/components/MobileFAB';
import { useSidebar } from '@/components/ui/SidebarContext';
import { useDynamicSidebar } from '@/components/ui/DynamicSidebar';
import { NoteDetailSidebar } from '@/components/ui/NoteDetailSidebar';
import { sidebarIgnoreProps } from '@/constants/sidebar';

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
      try { sessionStorage.removeItem('open-create-note'); } catch { }
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
    setIsCollapsed((prev: boolean) => !prev);
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
      router.replace(path);
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
      ,
      targetNote.$id || null
    );

    cleanParams();
  }, [openNoteIdParam, allNotes, openSidebar, handleNoteUpdated, handleNoteDeleted, router]);

  const handleCreateNoteClick = () => {
    openOverlay(<CreateNoteForm onNoteCreated={handleNoteCreated} />);
  };

  // Calculate available space and determine optimal card size
  const gridSx = useMemo(() => {
    if (!isCollapsed && isDynamicSidebarOpen) {
      return {
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
      };
    } else if (!isCollapsed || isDynamicSidebarOpen) {
      return {
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
      };
    } else {
      return {
        display: 'grid',
        gap: { xs: 1.5, sm: 2 },
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(auto-fill, minmax(260px, 1fr))',
          md: 'repeat(auto-fill, minmax(280px, 1fr))',
          lg: 'repeat(auto-fill, minmax(300px, 1fr))',
          xl: 'repeat(auto-fill, minmax(320px, 1fr))'
        }
      };
    }
  }, [isCollapsed, isDynamicSidebarOpen]);

  // Get tags from existing notes for filtering
  const tags = useMemo(() => {
    const existingTags = Array.from(new Set(allNotes.flatMap(note => note.tags || [])));
    return existingTags.length > 0 ? existingTags.slice(0, 8) : ['Personal', 'Work', 'Ideas', 'To-Do'];
  }, [allNotes]);

  return (
    <NotesErrorBoundary>
      <Box sx={{ flex: 1, minHeight: '100vh' }}>
        {/* Mobile Header - Hidden on Desktop */}
        <Box
          component="header"
          sx={{
            mb: 4,
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              fontFamily: 'var(--font-space-grotesk)',
              color: 'text.primary'
            }}
          >
            Notes
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton onClick={handleCreateNoteClick} {...sidebarIgnoreProps} sx={{ color: 'primary.main' }}>
              <PlusCircleIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Desktop Header */}
        <Box
          component="header"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontFamily: 'var(--font-space-grotesk)',
                color: 'text.primary',
                mb: 0.5
              }}
            >
              Private Vault
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontWeight: 500
              }}
            >
              {allNotes.length < totalNotes && !hasSearchResults ? (
                <>Syncing <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#00F5FF' }}>{allNotes.length}</Box> of <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{totalNotes}</Box> notes</>
              ) : (
                hasSearchResults ? (
                  <><Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#00F5FF' }}>{totalCount}</Box> {totalCount === 1 ? 'result' : 'results'} found</>
                ) : (
                  <><Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#00F5FF' }}>{totalNotes}</Box> {totalNotes === 1 ? 'private note' : 'private notes'} secured</>
                )
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={handleToggleSidebar}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              {...sidebarIgnoreProps}
              sx={{ color: 'text.secondary' }}
            >
              {isCollapsed ? (
                <ArrowRightOnRectangleIcon />
              ) : (
                <ArrowLeftOnRectangleIcon />
              )}
            </IconButton>
            <IconButton onClick={handleCreateNoteClick} {...sidebarIgnoreProps} sx={{ color: 'primary.main' }}>
              <PlusCircleIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              mb: 3,
              overflowX: 'auto',
              pb: 1,
              alignItems: 'center',
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            {tags.map((tag, index) => (
              <Button
                key={index}
                variant={searchQuery === tag ? 'default' : 'secondary'}
                size="sm"
                sx={{ whiteSpace: 'nowrap' }}
                aria-pressed={searchQuery === tag}
                onClick={() => searchQuery === tag ? clearSearch() : setSearchQuery(tag)}
                {...sidebarIgnoreProps}
              >
                {tag}
              </Button>
            ))}

            {hasSearchResults && (
              <Button variant="ghost" size="sm" onClick={clearSearch} sx={{ ml: 1 }} {...sidebarIgnoreProps}>
                Clear
              </Button>
            )}
          </Stack>
        )}

        {/* Top Pagination */}
        {totalPages > 1 && (
          <Box sx={{ mb: 3 }}>
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
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: '16px',
              bgcolor: 'rgba(211, 47, 47, 0.1)',
              color: '#ff5252',
              border: '1px solid rgba(211, 47, 47, 0.2)',
              '& .MuiAlert-icon': { color: '#ff5252' }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Notes Grid */}
        {isInitialLoading ? (
          <NoteGridSkeleton count={12} />
        ) : paginatedNotes.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 10,
              textAlign: 'center'
            }}
          >
            <Box
              sx={{
                width: 96,
                height: 96,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {hasSearchResults ? (
                <MagnifyingGlassIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
              ) : (
                <PlusCircleIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
              )}
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                fontFamily: 'var(--font-space-grotesk)',
                color: 'text.primary',
                mb: 1.5
              }}
            >
              {hasSearchResults ? 'NO_RESULTS' : 'VAULT_EMPTY'}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 4,
                maxWidth: 400,
                fontWeight: 500
              }}
            >
              {hasSearchResults
                ? `No matches found for "${searchQuery}". Try a different search term.`
                : 'Capture your thoughts and ideas here. Your notes are private and secure.'
              }
            </Typography>
            {hasSearchResults ? (
              <Stack direction="row" spacing={2}>
                <Button variant="secondary" onClick={clearSearch}>
                  Clear Search
                </Button>
                <Button onClick={handleCreateNoteClick} startIcon={<PlusCircleIcon />}>
                  Create Note
                </Button>
              </Stack>
            ) : (
              <Button onClick={handleCreateNoteClick} startIcon={<PlusCircleIcon />}>
                Create Your First Note
              </Button>
            )}
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box sx={gridSx}>
              {paginatedNotes.map((note) => (
                <NoteCard
                  key={note.$id}
                  note={note}
                  onUpdate={handleNoteUpdated}
                  onDelete={handleNoteDeleted}
                />
              ))}
            </Box>
            {hasMore && !isInitialLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button variant="secondary" onClick={loadMore} {...sidebarIgnoreProps}>
                  Load More
                </Button>
              </Box>
            )}
          </Stack>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && paginatedNotes.length > 0 && (
          <Box sx={{ mt: 4 }}>
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
          </Box>
        )}

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Mobile FAB */}
        <MobileFAB />
      </Box>
    </NotesErrorBoundary>
  );
}
