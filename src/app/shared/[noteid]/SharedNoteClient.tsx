'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite';
import { 
  AccessTime as ClockIcon, 
  Visibility as EyeIcon, 
  LocalOffer as TagIcon, 
  ArrowForward as ArrowRightIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAuth } from '@/components/ui/AuthContext';
import { NoteContentRenderer } from '@/components/NoteContentRenderer';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import CommentsSection from '@/app/(app)/notes/Comments';
import NoteReactions from '@/app/(app)/notes/NoteReactions';

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
        bgcolor: 'rgba(10, 10, 10, 0.8)', 
        backdropFilter: 'blur(25px) saturate(180%)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'none'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
        <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
          <Box 
            component="img"
            src="/logo/whisperrnote.png" 
            alt="Whisperrnote Logo" 
            sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: '0 4px 12px rgba(0, 245, 255, 0.2)' }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontWeight: 900,
              fontFamily: 'var(--font-space-grotesk)',
              background: 'linear-gradient(90deg, #00F5FF 0%, #00A3FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Whisperrnote
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          

          <Button
            onClick={handleOpenMenu}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              textTransform: 'none',
              px: 1.5,
              py: 0.75,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', borderColor: '#00F5FF' }
            }}
            startIcon={
              <Avatar 
                sx={{ 
                  width: 24, 
                  height: 24, 
                  bgcolor: '#00F5FF', 
                  color: '#000',
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
                bgcolor: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                color: 'white'
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem component={Link} href="/settings" onClick={handleCloseMenu} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Settings</Typography>
            </MenuItem>
            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ff4d4d', '&:hover': { bgcolor: 'rgba(255, 77, 77, 0.05)' } }}>
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
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box sx={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
            Loading shared note
          </Typography>
          {error ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 3 }}>{error}</Typography>
              <Button
                variant="contained"
                onClick={fetchSharedNote}
                sx={{ 
                  borderRadius: '12px',
                  bgcolor: '#00F5FF',
                  color: '#000',
                  fontWeight: 700,
                  '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
                }}
              >
                Retry loading note
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 3 }}>Fetching the shared note. Please wait.</Typography>
          )}
          {isLoadingNote && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress size={32} sx={{ color: '#00F5FF' }} />
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
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00F5FF' }} />
      </Box>
    );
  }

  const NoteContent = () => (
    <Paper 
      elevation={0}
      sx={{ 
        borderRadius: '32px', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        bgcolor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(25px) saturate(180%)',
        overflow: 'hidden',
        color: 'white'
      }}
    >
      <Box sx={{ p: { xs: 4, md: 6 }, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Stack spacing={3}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 900, 
              fontFamily: 'var(--font-space-grotesk)', 
              lineHeight: 1.2,
              background: 'linear-gradient(90deg, #fff, #00F5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {verifiedNote.title || 'Untitled Note'}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255, 255, 255, 0.5)' }}>
              <ClockIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Created {formatNoteCreatedDate(verifiedNote, { month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255, 255, 255, 0.5)' }}>
              <EyeIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Public Note</Typography>
            </Box>
          </Box>

          {verifiedNote.tags && verifiedNote.tags.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TagIcon sx={{ fontSize: 16, color: 'rgba(0, 245, 255, 0.4)' }} />
              {verifiedNote.tags.map((tag: string, i: number) => (
                <Chip 
                  key={i} 
                  label={tag} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(0, 245, 255, 0.05)', 
                    color: '#00F5FF',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: '1px solid rgba(0, 245, 255, 0.1)'
                  }} 
                />
              ))}
            </Box>
          )}
        </Stack>
      </Box>

      <Box sx={{ position: 'relative', p: { xs: 4, md: 6 }, bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
        <IconButton
          onClick={handleCopyContent}
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            bgcolor: isCopied ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid',
            borderColor: isCopied ? '#00F5FF' : 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: isCopied ? '#00F5FF' : 'white',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
          }}
          title={isCopied ? 'Copied!' : 'Copy content'}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </IconButton>
        <NoteContentRenderer
          content={verifiedNote.content || ''}
          format={(verifiedNote.format as 'text' | 'doodle') || 'text'}
          emptyFallback={<Typography sx={{ color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic' }}>This note is empty.</Typography>}
        />
      </Box>

      <Box sx={{ p: 3, bgcolor: 'rgba(0, 0, 0, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            Last updated {formatNoteUpdatedDate(verifiedNote, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <Typography variant="caption" sx={{ color: '#00F5FF', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Shared via Whisperrnote
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  if (isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', color: 'white' }}>
        <SharedNoteHeader />
        <Container maxWidth="md" sx={{ py: 8, pt: 12 }}>
          <NoteContent />
          
          <Box sx={{ mt: 4 }}>
            <NoteReactions targetId={noteId} />
          </Box>

          <Box sx={{ mt: 4 }}>
            <CommentsSection noteId={noteId} />
          </Box>

          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Paper
              sx={{
                p: 6,
                borderRadius: '32px',
                bgcolor: 'rgba(0, 245, 255, 0.03)',
                border: '1px solid rgba(0, 245, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
                View Your Notes
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4, maxWidth: 500, mx: 'auto' }}>
                Check out all your notes and continue organizing your thoughts.
              </Typography>
              <Button
                component={Link}
                href="/notes"
                variant="contained"
                size="large"
                endIcon={<ArrowRightIcon />}
                sx={{ 
                  borderRadius: '16px', 
                  px: 4, 
                  py: 1.5,
                  bgcolor: '#00F5FF',
                  color: '#000',
                  fontWeight: 800,
                  boxShadow: '0 8px 24px rgba(0, 245, 255, 0.2)',
                  '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', color: 'white' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: 'rgba(10, 10, 10, 0.8)', 
          backdropFilter: 'blur(25px)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 'lg', mx: 'auto', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Image src="/logo/whisperrnote.png" alt="Whisperrnote" width={32} height={32} style={{ borderRadius: '8px' }} />
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
              Whisperrnote
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
            <Button component={Link} href="/" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700, textTransform: 'none' }}>Home</Button>
            <Button 
              component={Link} 
              href="/" 
              variant="contained" 
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 800, 
                bgcolor: '#00F5FF', 
                color: '#000',
                textTransform: 'none',
                '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
              }}
            >
              Join Now
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: 12, pb: 4, bgcolor: 'rgba(0, 245, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
              Organize unlimited notes, AI insights & secure sharing.
            </Typography>
            <Button 
              component={Link} 
              href="/" 
              endIcon={<ArrowRightIcon />}
              sx={{ fontWeight: 800, color: '#00F5FF', textTransform: 'none' }}
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <NoteContent />

        <Box sx={{ mt: 4 }}>
          <NoteReactions targetId={noteId} />
        </Box>

        <Box sx={{ mt: 4 }}>
          <CommentsSection noteId={noteId} />
        </Box>

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Paper
            sx={{
              p: 6,
              borderRadius: '32px',
              bgcolor: 'rgba(0, 245, 255, 0.03)',
              border: '1px solid rgba(0, 245, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
              Create Your Own Notes
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4, maxWidth: 500, mx: 'auto' }}>
              Join thousands of users who trust Whisperrnote to capture, organize, and share their thoughts.
            </Typography>
            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              endIcon={<ArrowRightIcon />}
              sx={{ 
                borderRadius: '16px', 
                px: 4, 
                py: 1.5,
                bgcolor: '#00F5FF',
                color: '#000',
                fontWeight: 800,
                boxShadow: '0 8px 24px rgba(0, 245, 255, 0.2)',
                '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
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
