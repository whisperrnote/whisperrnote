'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile';
import type { Notes } from '@/types/appwrite';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {turnstileEnabled ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Complete the verification to view this shared note
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <TurnstileWidget
                onToken={handleTurnstileSuccess}
                onError={handleTurnstileError}
                theme="auto"
                size="normal"
              />
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Verification is temporarily unavailable. Loading the note directly.
            </Typography>
            {!isLoading && (
              <Button
                variant="contained"
                onClick={loadWithoutVerification}
                sx={{ 
                  alignSelf: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                Retry loading note
              </Button>
            )}
          </>
        )}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={32} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

