'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite.d';
import { ClockIcon, EyeIcon, TagIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/components/ui/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NoteContentRenderer } from '@/components/NoteContentRenderer';
import Image from 'next/image';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  Avatar, 
  IconButton, 
  Menu, 
  MenuItem, 
  Divider, 
  Chip, 
  CircularProgress,
  AppBar,
  Toolbar,
  Link as MuiLink,
  alpha
} from '@mui/material';
import Link from 'next/link';

interface SharedNoteClientProps {
   noteId: string;
}

function SharedNoteHeader() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseMenu();
    logout();
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        bgcolor: 'rgba(0, 0, 0, 0.7)', 
        backdropFilter: 'blur(20px)', 
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
        <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
          <Box 
            component="img"
            src="/logo/whisperrnote.png" 
            alt="Whisperrnote Logo" 
            sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: '0 4px 12px rgba(0, 240, 255, 0.2)' }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontWeight: 900,
              fontFamily: 'var(--font-space-grotesk)',
              background: 'linear-gradient(90deg, #00F0FF 0%, #00A3FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Whisperrnote
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ThemeToggle size="sm" />

          <Button
            onClick={handleOpenMenu}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
              textTransform: 'none',
              px: 1.5,
              py: 0.75,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'primary.main' }
            }}
            startIcon={
              <Avatar 
                sx={{ 
                  width: 24, 
                  height: 24, 
                  bgcolor: 'primary.main', 
                  color: 'background.default',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
              </Avatar>
            }
          >
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 600 }}>
              {user?.name || user?.email || 'Account'}
            </Typography>
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 180,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem component={Link} href="/settings" onClick={handleCloseMenu} sx={{ py: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Settings</Typography>
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default function SharedNoteClient({ noteId }: SharedNoteClientProps) {
  const [verifiedNote, setVerifiedNote] = useState<Notes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();
  const [isCopied, setIsCopied] = React.useState(false);

  const fetchSharedNote = useCallback(async () => {
    setIsLoadingNote(true);
    setError(null);
    try {
      const res = await fetch(`/api/shared/${noteId}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load shared note');
      }
      const note = await res.json();
      setVerifiedNote(note);
    } catch (err: any) {
      const message = err?.message || 'An error occurred';
      setError(message);
    } finally {
      setIsLoadingNote(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchSharedNote();
  }, [fetchSharedNote]);

  if (!verifiedNote) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyCenter: 'center', p: 4 }}>
        <Box sx={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Loading shared note</Typography>
          {error ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>{error}</Typography>
              <Button
                variant="contained"
                onClick={fetchSharedNote}
                sx={{ borderRadius: '12px' }}
              >
                Retry loading note
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Fetching the shared note. Please wait.</Typography>
          )}
          {isLoadingNote && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress size={32} sx={{ color: 'primary.main' }} />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  const handleCopyContent = () => {
    navigator.clipboard.writeText(verifiedNote?.content || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <SharedNoteHeader />
        <Container maxWidth="md" sx={{ py: 8, pt: 12 }}>
          <Paper 
            elevation={0}
            sx={{ 
              borderRadius: '32px', 
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(10, 10, 10, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: { xs: 4, md: 6 }, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)', lineHeight: 1.2 }}>
                  {verifiedNote.title || 'Untitled Note'}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <ClockIcon style={{ width: 16, height: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      Created {formatNoteCreatedDate(verifiedNote, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <EyeIcon style={{ width: 16, height: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Public Note</Typography>
                  </Box>
                </Box>

                {verifiedNote.tags && verifiedNote.tags.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <TagIcon style={{ width: 16, height: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                    {verifiedNote.tags.map((tag: string, i: number) => (
                      <Chip 
                        key={i} 
                        label={tag} 
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(255, 255, 255, 0.05)', 
                          color: 'text.secondary',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }} 
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ position: 'relative', p: { xs: 4, md: 6 }, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <IconButton
                onClick={handleCopyContent}
                sx={{
                  position: 'absolute',
                  top: 24,
                  right: 24,
                  bgcolor: isCopied ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid',
                  borderColor: isCopied ? 'primary.main' : 'divider',
                  borderRadius: '12px',
                  color: isCopied ? 'primary.main' : 'text.primary',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                }}
                title={isCopied ? 'Copied!' : 'Copy content'}
              >
                {isCopied ? (
                  <CheckIcon style={{ width: 20, height: 20 }} />
                ) : (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </IconButton>
              <NoteContentRenderer
                content={verifiedNote.content || ''}
                format={(verifiedNote.format as 'text' | 'doodle') || 'text'}
                textClassName="text-foreground"
                emptyFallback={<Typography sx={{ color: 'text.disabled', fontStyle: 'italic' }}>This note is empty.</Typography>}
              />
            </Box>

            <Box sx={{ p: 3, bgcolor: 'rgba(0, 0, 0, 0.3)', borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Last updated {formatNoteUpdatedDate(verifiedNote, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Shared via Whisperrnote
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Paper
              sx={{
                p: 6,
                borderRadius: '24px',
                bgcolor: 'rgba(0, 240, 255, 0.03)',
                border: '1px solid',
                borderColor: 'rgba(0, 240, 255, 0.1)',
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-space-grotesk)' }}>
                View Your Notes
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto' }}>
                Check out all your notes and continue organizing your thoughts.
              </Typography>
              <Button
                component={Link}
                href="/notes"
                variant="contained"
                size="large"
                endIcon={<ArrowRightIcon style={{ width: 20, height: 20 }} />}
                sx={{ 
                  borderRadius: '16px', 
                  px: 4, 
                  py: 1.5,
                  boxShadow: '0 8px 24px rgba(0, 240, 255, 0.2)'
                }}
              >
                Go to Your Notes
              </Button>
            </Paper>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 'lg', mx: 'auto', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Image src="/logo/whisperrnote.png" alt="Whisperrnote" width={32} height={32} style={{ borderRadius: '8px' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>
              Whisperrnote
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
            <Button component={Link} href="/" sx={{ color: 'text.secondary', fontWeight: 600 }}>Home</Button>
            <Button component={Link} href="/" variant="contained" sx={{ borderRadius: '12px', fontWeight: 700 }}>Join</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: 12, pb: 4, bgcolor: 'rgba(0, 240, 255, 0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Organize unlimited notes, AI insights & secure sharing.
            </Typography>
            <Button 
              component={Link} 
              href="/" 
              endIcon={<ArrowRightIcon style={{ width: 16, height: 16 }} />}
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: '32px', 
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(10, 10, 10, 0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: { xs: 4, md: 6 }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-space-grotesk)', lineHeight: 1.2, margin: 0 }}>
                {verifiedNote.title || 'Untitled Note'}
              </h1>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <ClockIcon style={{ width: 16, height: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    Created {formatNoteCreatedDate(verifiedNote, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <EyeIcon style={{ width: 16, height: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>Public Note</Typography>
                </Box>
              </Box>

              {verifiedNote.tags && verifiedNote.tags.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <TagIcon style={{ width: 16, height: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                  {verifiedNote.tags.map((tag: string, i: number) => (
                    <Chip 
                      key={i} 
                      label={tag} 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.05)', 
                        color: 'text.secondary',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }} 
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ p: { xs: 4, md: 6 } }}>
            <NoteContentRenderer
              content={verifiedNote.content || ''}
              format={(verifiedNote.format as 'text' | 'doodle') || 'text'}
              textClassName="text-foreground"
              emptyFallback={<Typography sx={{ color: 'text.disabled', fontStyle: 'italic' }}>This note is empty.</Typography>}
            />
          </Box>

          <Box sx={{ p: 3, bgcolor: 'rgba(0, 0, 0, 0.3)', borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Last updated {formatNoteUpdatedDate(verifiedNote, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Shared via Whisperrnote
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Paper
            sx={{
              p: 6,
              borderRadius: '24px',
              bgcolor: 'rgba(0, 240, 255, 0.03)',
              border: '1px solid',
              borderColor: 'rgba(0, 240, 255, 0.1)',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-space-grotesk)' }}>
              Create Your Own Notes
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto' }}>
              Join thousands of users who trust Whisperrnote to capture, organize, and share their thoughts.
            </Typography>
            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              endIcon={<ArrowRightIcon style={{ width: 20, height: 20 }} />}
              sx={{ 
                borderRadius: '16px', 
                px: 4, 
                py: 1.5,
                boxShadow: '0 8px 24px rgba(0, 240, 255, 0.2)'
              }}
            >
              Start Writing for Free
            </Button>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
