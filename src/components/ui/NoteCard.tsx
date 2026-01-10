import React, { useRef, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Box, 
  IconButton, 
  Chip, 
} from '@mui/material';
import { useContextMenu } from './ContextMenuContext';
import { useDynamicSidebar } from './DynamicSidebar';
import { NoteDetailSidebar } from './NoteDetailSidebar';
import { useNotes } from '@/contexts/NotesContext';
import type { Notes } from '@/types/appwrite';
import { DoodleStroke } from '@/types/notes';
import {
  Delete as TrashIcon,
  AttachFile as AttachFileIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  ContentCopy as DuplicateIcon,
  Share as ShareIcon,
  Lock as PrivateIcon,
  LockOpen as PublicIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { sidebarIgnoreProps } from '@/constants/sidebar';
import { ShareNoteModal } from '../ShareNoteModal';
import { updateNote, createNote } from '@/lib/appwrite';
import { useToast } from './Toast';

interface NoteCardProps {
  note: Notes;
  onUpdate?: (updatedNote: Notes) => void;
  onDelete?: (noteId: string) => void;
  onNoteSelect?: (note: Notes) => void;
}

const NoteCard: React.FC<NoteCardProps> = React.memo(({ note, onUpdate, onDelete, onNoteSelect }) => {
  const { openMenu } = useContextMenu();
  const { openSidebar } = useDynamicSidebar();
  const { isPinned, pinNote, unpinNote, upsertNote } = useNotes();
  const { showSuccess, showError } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number, y: number } | null>(null);
  const isLongPressActive = useRef(false);

  const pinned = isPinned(note.$id);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handlePinToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (pinned) {
        await unpinNote(note.$id);
        showSuccess('Note unpinned');
      } else {
        await pinNote(note.$id);
        showSuccess('Note pinned');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update pin status');
    }
  };

  const handleDuplicate = async () => {
    try {
      const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = note as any;
      const duplicatedNote = await createNote({
        ...rest,
        title: `${note.title} (Copy)`,
      });
      upsertNote(duplicatedNote as Notes);
      showSuccess('Note duplicated');
    } catch (err: any) {
      showError(err.message || 'Failed to duplicate note');
    }
  };

  const handleTogglePublic = async () => {
    try {
      const updated = await updateNote(note.$id, { isPublic: !note.isPublic });
      upsertNote(updated as Notes);
      showSuccess(note.isPublic ? 'Note made private' : 'Note made public');
    } catch (err: any) {
      showError(err.message || 'Failed to update visibility');
    }
  };

  const handleCopyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/shared/${note.$id}`;
    navigator.clipboard.writeText(shareUrl);
    showSuccess('Share link copied to clipboard');
  };

  // Render doodle preview on canvas
  useEffect(() => {
    if (note.format !== 'doodle' || !note.content || !canvasRef.current) return;

    try {
      const strokes: DoodleStroke[] = JSON.parse(note.content);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.opacity ?? 1;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    } catch {
      console.error('Failed to render doodle preview');
    }
  }, [note.format, note.content]);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPressActive.current) return;
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: contextMenuItems
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressActive.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      openMenu({
        x: touch.clientX,
        y: touch.clientY,
        items: contextMenuItems
      });
    }, 600); // 600ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // If moved more than 10px, cancel long press (prevents trigger during scroll)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = () => {
    // If it was a long press, don't trigger the click
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    if (onNoteSelect) {
      onNoteSelect(note);
      return;
    }
    openSidebar(
      <NoteDetailSidebar
        note={note}
        onUpdate={onUpdate || (() => { })}
        onDelete={onDelete || (() => { })}
      />,
      note.$id || null
    );
  };

  const handleDelete = () => {
    if (onDelete && note.$id) {
      onDelete(note.$id);
    }
  };

  const contextMenuItems = [
    {
      label: pinned ? 'Unpin' : 'Pin',
      icon: pinned ? <PinIcon sx={{ fontSize: 18 }} /> : <PinOutlinedIcon sx={{ fontSize: 18 }} />,
      onClick: handlePinToggle
    },
    {
      label: note.isPublic ? 'Make Private' : 'Make Public',
      icon: note.isPublic ? <PrivateIcon sx={{ fontSize: 18 }} /> : <PublicIcon sx={{ fontSize: 18 }} />,
      onClick: handleTogglePublic
    },
    {
      label: 'Duplicate',
      icon: <DuplicateIcon sx={{ fontSize: 18 }} />,
      onClick: handleDuplicate
    },
    {
      label: 'Share with...',
      icon: <ShareIcon sx={{ fontSize: 18 }} />,
      onClick: () => setIsShareModalOpen(true)
    },
    {
      label: 'Delete',
      icon: <TrashIcon sx={{ fontSize: 18 }} />,
      onClick: handleDelete,
      variant: 'destructive' as const
    }
  ];

  return (
    <>
      <ShareNoteModal 
        isOpen={isShareModalOpen} 
        onOpenChange={setIsShareModalOpen} 
        noteId={note.$id} 
        noteTitle={note.title || 'Untitled note'} 
      />
      <Card
        {...sidebarIgnoreProps}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          height: { xs: 160, sm: 180, md: 200, lg: 220 },
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'rgba(10, 10, 10, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            borderColor: 'rgba(0, 245, 255, 0.3)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 245, 255, 0.1)',
          }
        }}
      >
        <CardHeader
          sx={{ pb: 0.5, p: 2 }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  fontWeight: 900,
                  fontFamily: '"Space Grotesk", sans-serif',
                  color: '#00F5FF',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  flex: 1,
                  lineHeight: 1.2
                }}
              >
                {note.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {note.isPublic && (
                  <IconButton
                    size="small"
                    onClick={handleCopyShareLink}
                    sx={{
                      p: 0.5,
                      color: 'rgba(255, 255, 255, 0.4)',
                      '&:hover': {
                        color: '#00F5FF',
                        bgcolor: 'rgba(0, 245, 255, 0.1)'
                      }
                    }}
                  >
                    <LinkIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={handlePinToggle}
                  sx={{ 
                    p: 0.5,
                    color: pinned ? '#00F5FF' : 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      color: '#00F5FF',
                      bgcolor: 'rgba(0, 245, 255, 0.1)'
                    }
                  }}
                >
                  {pinned ? <PinIcon sx={{ fontSize: 16 }} /> : <PinOutlinedIcon sx={{ fontSize: 16 }} />}
                </IconButton>

                {note.attachments && note.attachments.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.3, 
                    px: 0.8, 
                    py: 0.3, 
                    borderRadius: '6px', 
                    bgcolor: 'rgba(0, 245, 255, 0.1)',
                    color: '#00F5FF',
                    fontSize: '9px',
                    fontWeight: 800,
                    border: '1px solid rgba(0, 245, 255, 0.2)',
                    fontFamily: '"Space Grotesk", sans-serif'
                  }}>
                    <AttachFileIcon sx={{ fontSize: 10 }} />
                    {note.attachments.length}
                  </Box>
                )}
              </Box>
            </Box>
          }
        />

        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, position: 'relative', p: 2, pt: 0 }}>
          {note.format === 'doodle' ? (
            <Box sx={{ 
              flex: 1, 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.05)', 
              overflow: 'hidden', 
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              position: 'relative'
            }}>
              <canvas
                ref={canvasRef}
                width={300}
                height={200}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </Box>
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: { xs: 3, sm: 4, md: 5 },
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap'
              }}
            >
              {note.content}
            </Typography>
          )}
          
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, overflow: 'hidden' }}>
            {note.tags && note.tags.slice(0, 2).map((tag: string, index: number) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{ 
                  height: 16, 
                  fontSize: '8px', 
                  fontWeight: 700,
                  fontFamily: '"Space Grotesk", sans-serif',
                  textTransform: 'uppercase',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: 'rgba(255, 255, 255, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  '& .MuiChip-label': { px: 0.8 }
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </>
  );
});


NoteCard.displayName = 'NoteCard';

export default NoteCard;