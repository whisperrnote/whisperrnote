"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { 
  listNotesPaginated, 
  getPinnedNoteIds, 
  pinNote as appwritePinNote, 
  unpinNote as appwriteUnpinNote,
  realtime,
  APPWRITE_DATABASE_ID,
  APPWRITE_TABLE_ID_NOTES
} from '@/lib/appwrite';
import type { Notes } from '@/types/appwrite';
import { useAuth } from '@/components/ui/AuthContext';

interface NotesContextType {
  notes: Notes[];
  totalNotes: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetchNotes: () => void;
  upsertNote: (note: Notes) => void;
  removeNote: (noteId: string) => void;
  pinnedIds: string[];
  pinNote: (noteId: string) => Promise<void>;
  unpinNote: (noteId: string) => Promise<void>;
  isPinned: (noteId: string) => boolean;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Notes[]>([]);
  const [totalNotes, setTotalNotes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null); // last fetched document id
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Refs to avoid unnecessary re-creations / dependency loops
  const isFetchingRef = useRef(false);
  const notesRef = useRef<Notes[]>([]);
  const cursorRef = useRef<string | null>(null);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);

  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  // Plan-based pinning limits for UI
  const effectivePinnedIds = useMemo(() => {
    if (!user) return [];
    const plan = user.prefs?.subscriptionTier || 'FREE';
    const limit = (plan === 'PRO' || plan === 'ORG' || plan === 'LIFETIME') ? 10 : 3;
    return pinnedIds.slice(0, limit);
  }, [pinnedIds, user]);

  const PAGE_SIZE = Number(process.env.NEXT_PUBLIC_NOTES_PAGE_SIZE || 50);

  const fetchBatch = useCallback(async (reset: boolean = false) => {
    if (isFetchingRef.current) return;

    if (!isAuthenticated) {
      if (!isAuthLoading) {
        setNotes([]);
        setTotalNotes(0);
        setIsLoading(false);
        setHasMore(false);
        setError(null);
        setPinnedIds([]);
      }
      return;
    }

    isFetchingRef.current = true;
    if (reset) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Fetch pinned IDs along with first batch
      if (reset) {
        const pIds = await getPinnedNoteIds();
        setPinnedIds(pIds);
      }

      const res = await listNotesPaginated({
        limit: PAGE_SIZE,
        cursor: reset ? null : (cursorRef.current || null),
        userId: user?.$id, // Use explicit user ID
      });

      const batch = res.documents as Notes[];

      setNotes(prev => {
        if (reset) return batch;
        const existingIds = new Set(prev.map(n => n.$id));
        const newOnes = batch.filter(n => !existingIds.has(n.$id));
        return [...prev, ...newOnes];
      });

      setTotalNotes(res.total || 0);
      setHasMore(!!res.hasMore);
      if (res.nextCursor) {
        setCursor(res.nextCursor);
      } else if (reset) {
        setCursor(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes');
      if (reset) {
        setNotes([]);
        setTotalNotes(0);
      }
      setHasMore(false);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, user?.$id, PAGE_SIZE]); // include user?.$id

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingRef.current) return;
    await fetchBatch(false);
  }, [hasMore, fetchBatch]);

  const refetchNotes = useCallback(() => {
    setCursor(null);
    cursorRef.current = null;
    setHasMore(true);
    fetchBatch(true);
  }, [fetchBatch]);

  // Initial fetch or auth state change
  useEffect(() => {
    if (isAuthenticated && user?.$id) {
      fetchBatch(true);
    } else if (!isAuthLoading && !isAuthenticated) {
      setNotes([]);
      setTotalNotes(0);
      setHasMore(false);
      setIsLoading(false);
      setError(null);
      setPinnedIds([]);
    }
  }, [isAuthenticated, isAuthLoading, user?.$id, fetchBatch]);

  const upsertNote = useCallback((note: Notes) => {
    const existed = notesRef.current.some((n) => n.$id === note.$id);
    setNotes((prev) => {
      if (existed) {
        return prev.map((item) => (item.$id === note.$id ? note : item));
      }
      return [note, ...prev];
    });
    if (!existed) {
      setTotalNotes((prev) => prev + 1);
    }
  }, []);

  const removeNote = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.$id !== noteId));
    setTotalNotes((prev) => Math.max(0, prev - 1));
    // Also remove from pinned if it was pinned
    setPinnedIds((prev) => prev.filter(id => id !== noteId));
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.$id) return;

    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_TABLE_ID_NOTES}.documents`;
    
    let unsub: () => void;
    try {
      const sub = realtime.subscribe(channel, (response) => {
        const payload = response.payload as Notes;
        
        // Only handle notes belonging to the current user (or public notes)
        if (payload.userId !== user.$id && !payload.isPublic) return;

        const isCreate = response.events.some(e => e.includes('.create'));
        const isUpdate = response.events.some(e => e.includes('.update'));
        const isDelete = response.events.some(e => e.includes('.delete'));

        if (isCreate) {
          setNotes(prev => {
            if (prev.some(n => n.$id === payload.$id)) return prev;
            return [payload, ...prev];
          });
          setTotalNotes(prev => prev + 1);
        } else if (isUpdate) {
          setNotes(prev => prev.map(n => n.$id === payload.$id ? payload : n));
        } else if (isDelete) {
          removeNote(payload.$id);
        }
      });
      
      if (typeof sub === 'function') {
        unsub = sub;
      } else {
        // Handle cases where it might return an object with unsubscribe
        unsub = () => (sub as any).unsubscribe?.();
      }
    } catch (e) {
      console.error('Realtime subscription failed', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [isAuthenticated, user?.$id, upsertNote, removeNote]);

  const pinNote = useCallback(async (noteId: string) => {
    try {
      const newPins = await appwritePinNote(noteId);
      setPinnedIds(newPins);
    } catch (err: any) {
      throw err;
    }
  }, []);

  const unpinNote = useCallback(async (noteId: string) => {
    try {
      const newPins = await appwriteUnpinNote(noteId);
      setPinnedIds(newPins);
    } catch (err: any) {
      throw err;
    }
  }, []);

  const isPinned = useCallback((noteId: string) => {
    return effectivePinnedIds.includes(noteId);
  }, [effectivePinnedIds]);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aPinned = effectivePinnedIds.includes(a.$id);
      const bPinned = effectivePinnedIds.includes(b.$id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [notes, effectivePinnedIds]);

  return (
    <NotesContext.Provider
      value={{
        notes: sortedNotes,
        totalNotes: totalNotes || 0,
        isLoading,
        error,
        hasMore,
        loadMore,
        refetchNotes,
        upsertNote,
        removeNote,
        pinnedIds: effectivePinnedIds,
        pinNote,
        unpinNote,
        isPinned,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
