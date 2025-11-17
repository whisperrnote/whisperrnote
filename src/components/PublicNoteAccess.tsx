'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { TURNSTILE_SITE_KEY, verifyTurnstileToken } from '@/lib/turnstile';
import type { Notes } from '@/types/appwrite';

interface PublicNoteAccessProps {
  noteId: string;
  onVerified: (note: Notes) => void;
  onError?: (message: string) => void;
}

export function PublicNoteAccess({ noteId, onVerified, onError }: PublicNoteAccessProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);
  const autoFetchAttempted = useRef(false);

  useEffect(() => {
    autoFetchAttempted.current = false;
  }, [noteId]);

  const fetchNote = useCallback(async () => {
    const noteRes = await fetch(`/api/shared/${noteId}`);

    if (!noteRes.ok) {
      if (noteRes.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error('Failed to load note');
    }

    const note = await noteRes.json();
    onVerified(note);
  }, [noteId, onVerified]);

  const loadWithoutVerification = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchNote();
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNote, onError]);

  useEffect(() => {
    // Automatically fall back to direct loading when Turnstile is not configured.
    if (!turnstileEnabled && !autoFetchAttempted.current) {
      autoFetchAttempted.current = true;
      loadWithoutVerification();
    }
  }, [turnstileEnabled, loadWithoutVerification]);

  const handleTurnstileSuccess = async (captchaToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify Turnstile token server-side
      const verifyRes = await fetch('/api/turnstile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      await fetchNote();
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnstileError = (errorCode: string) => {
    const errorMsg = `Verification failed: ${errorCode}`;
    setError(errorMsg);
    onError?.(errorMsg);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100/80 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="text-center space-y-3">
        {turnstileEnabled ? (
          <>
            <p className="text-sm text-foreground/70">
              Complete the verification to view this shared note
            </p>
            
            <TurnstileWidget
              onToken={handleTurnstileSuccess}
              onError={handleTurnstileError}
              theme="auto"
              size="normal"
            />
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/70">
              Verification is temporarily unavailable. Loading the note directly.
            </p>
            {!isLoading && (
              <button
                type="button"
                onClick={loadWithoutVerification}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-accent text-white text-sm font-medium"
              >
                Retry loading note
              </button>
            )}
          </>
        )}
        
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}
      </div>
    </div>
  );
}
