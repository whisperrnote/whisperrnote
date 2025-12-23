"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Notes } from '@/types/appwrite';
import { formatNoteCreatedDate } from '@/lib/date-utils';
import { useNotes } from '@/contexts/NotesContext';
import { useSearch } from '@/hooks/useSearch';
import { useDynamicSidebar } from '@/components/ui/DynamicSidebar';
import { NoteDetailSidebar } from '@/components/ui/NoteDetailSidebar';
import { deleteNote } from '@/lib/appwrite';
import { Button } from '@/components/ui/Button';
import { sidebarIgnoreProps } from '@/constants/sidebar';

interface TopBarSearchProps {
  className?: string;
}

export function TopBarSearch({ className = '' }: TopBarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { notes, upsertNote, removeNote } = useNotes();

  const searchConfig = {
    searchFields: ['title', 'content', 'tags'],
    localSearch: true,
    debounceMs: 300,
  };

  const paginationConfig = {
    pageSize: 10,
  };

  const fetchDataAction = useCallback(async () => {
    return { documents: notes, total: notes.length };
  }, [notes]);

  const {
    items: searchResults,
    isSearching,
    searchQuery,
    setSearchQuery,
    clearSearch,
  } = useSearch({
    data: notes,
    fetchDataAction,
    searchConfig,
    paginationConfig,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        clearSearch();
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [clearSearch]);

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleNoteUpdated = useCallback(
    (updatedNote: Notes) => {
      upsertNote(updatedNote);
    },
    [upsertNote]
  );

  const handleNoteDeleted = useCallback(
    async (noteId: string) => {
      if (!noteId) return;
      try {
        await deleteNote(noteId);
        removeNote(noteId);
      } catch (error) {
        console.error('Failed to delete note from search sidebar:', error);
      }
    },
    [removeNote]
  );

  const { openSidebar } = useDynamicSidebar();

  const handleResultSelect = useCallback(
    (note: Notes) => {
      openSidebar(
        <NoteDetailSidebar
          note={note}
          onUpdate={handleNoteUpdated}
          onDelete={handleNoteDeleted}
        />,
        note.$id || null
      );
      setIsOpen(false);
      clearSearch();
      inputRef.current?.blur();
    },
    [clearSearch, handleNoteDeleted, handleNoteUpdated, openSidebar]
  );

  const hasSearchResults = searchResults.length > 0;
  const showDropdown = isOpen && searchQuery.length > 0;

  return (
    <div
      className={`relative ${className}`}
      ref={searchRef}
      {...sidebarIgnoreProps}
    >
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 group-focus-within:text-accent">
          <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
        </div>
        <input
          id="topbar-search-input"
          ref={inputRef}
          type="text"
          placeholder="Search Private Vault..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
          className={`
            w-full pl-12 pr-12 py-2.5 
            bg-matter border-2 border-border rounded-xl
            text-foreground placeholder-muted/50 font-medium
            focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent
            transition-all duration-300
            hover:shadow-tangible-sm
            ${isOpen ? 'shadow-tangible border-accent/50' : ''}
          `}
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-void transition-colors text-muted hover:text-foreground"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-card border-2 border-border rounded-2xl shadow-tangible z-50 max-h-[70vh] overflow-hidden transition-all animate-fade-in">
          {isSearching ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-muted">Searching...</p>
            </div>
          ) : hasSearchResults ? (
            <div className="py-2">
              <div className="px-4 py-2 border-b-2 border-border bg-void">
                <p className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-muted">
                  {searchResults.length} {searchResults.length !== 1 ? 'results' : 'result'} found
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((note: Notes) => (
                  <button
                    key={note.$id}
                    type="button"
                    className="w-full text-left block px-5 py-4 hover:bg-void transition-all duration-200 border-b border-border last:border-b-0 group"
                    onClick={() => handleResultSelect(note)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">
                          {note.title || 'Untitled Note'}
                        </h4>
                        {note.content && (
                          <p className="text-xs text-muted/80 mt-1 line-clamp-2">
                            {note.content.substring(0, 100)}
                          </p>
                        )}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {note.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-0.5 text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 rounded uppercase tracking-wider"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-[10px] font-mono font-bold text-muted/60 bg-void px-2 py-1 rounded border border-border">
                        {formatNoteCreatedDate(note, { year: '2-digit', month: 'short', day: '2-digit' })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center bg-void">
              <div className="w-16 h-16 bg-card border-2 border-border rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-tangible">
                <MagnifyingGlassIcon className="h-8 w-8 text-muted/50" />
              </div>
              <h3 className="text-lg font-black font-mono tracking-tighter text-foreground mb-1">
                NO_RESULTS
              </h3>
              <p className="text-xs text-muted font-medium mb-4">
                No results matched &quot;{searchQuery}&quot;
              </p>
              <Button size="sm" variant="outline" onClick={handleClear}>
                Reset Search
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}