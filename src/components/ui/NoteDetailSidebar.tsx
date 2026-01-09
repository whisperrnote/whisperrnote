'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Notes } from '@/types/appwrite';
import dynamic from 'next/dynamic';

const DoodleCanvas = dynamic(() => import('@/components/DoodleCanvas'), { ssr: false });
const NoteContentDisplay = dynamic(() => import('@/components/NoteContentDisplay'), { ssr: false });
const NoteContentRenderer = dynamic(() => import('@/components/NoteContentRenderer'), { ssr: false });

import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  Delete as TrashIcon,
  Person as UserIcon,
  ContentCopy as ClipboardDocumentIcon,
  AttachFile as PaperClipIcon,
  OpenInNew as ArrowTopRightOnSquareIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useDynamicSidebar } from '@/components/ui/DynamicSidebar';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import { updateNote } from '@/lib/appwrite';
import { formatFileSize } from '@/lib/utils';
import { useAutosave } from '@/hooks/useAutosave';

interface NoteDetailSidebarProps {
  note: Notes;
  onUpdate: (updatedNote: Notes) => void;
  onDelete: (noteId: string) => void;
  showExpandButton?: boolean;
  showHeaderDeleteButton?: boolean;
}

const shallowArrayEqual = (a?: string[] | null, b?: string[] | null) => {

  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export function NoteDetailSidebar({
  note,
  onUpdate,
  onDelete,
  showExpandButton = true,
  showHeaderDeleteButton = true,
}: NoteDetailSidebarProps) {

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const isEditing = isEditingTitle || isEditingContent;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDoodleEditor, setShowDoodleEditor] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [format, setFormat] = useState<'text' | 'doodle'>(note.format as 'text' | 'doodle' || 'text');
  const [tags, setTags] = useState(note.tags?.join(', ') || '');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const titleIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasEditingRef = useRef(isEditing);
  const prevNoteIdRef = useRef(note.$id);
  const theme = useTheme();

  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const { closeSidebar } = useDynamicSidebar();

  const handleOpenFullPage = () => {
    if (!note.$id) return;
    closeSidebar();
    router.push(`/notes/${note.$id}`);
  };

  useEffect(() => {
    if (note.attachments && Array.isArray(note.attachments)) {
      try {
        const parsed = note.attachments.map((a: any) => (typeof a === 'string' ? JSON.parse(a) : a));
        setCurrentAttachments(parsed);
      } catch (err) {
        console.error('Error parsing attachments:', err);
        setCurrentAttachments([]);
      }
    } else {
      setCurrentAttachments([]);
    }
  }, [note.$id]);


  useEffect(() => {
    const noteIdChanged = note.$id !== prevNoteIdRef.current;
    if (!noteIdChanged) return;
    prevNoteIdRef.current = note.$id;
    setTitle(note.title || '');
    setContent(note.content || '');
    setFormat((note.format as 'text' | 'doodle') || 'text');
    setTags((note.tags || []).join(', '));
    setIsEditingTitle(false);
    setIsEditingContent(false);
  }, [note.$id, note.title, note.content, note.format, note.tags]);

  const normalizedTags = useMemo(() => {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [tags]);

  const displayTitle = title || note.title || 'Untitled note';
  const displayContent = content || note.content || '';
  const displayFormat = format;
  const displayTags = normalizedTags.length > 0 ? normalizedTags : (note.tags || []);

  const resetTitleIdleTimer = () => {
    if (titleIdleTimer.current) {
      clearTimeout(titleIdleTimer.current);
    }
    titleIdleTimer.current = setTimeout(() => setIsEditingTitle(false), 15000);
  };

  const resetContentIdleTimer = () => {
    if (contentIdleTimer.current) {
      clearTimeout(contentIdleTimer.current);
    }
    contentIdleTimer.current = setTimeout(() => setIsEditingContent(false), 15000);
  };

  useEffect(() => {
    if (!isEditingTitle && titleIdleTimer.current) {
      clearTimeout(titleIdleTimer.current);
      titleIdleTimer.current = null;
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!isEditingContent && contentIdleTimer.current) {
      clearTimeout(contentIdleTimer.current);
      contentIdleTimer.current = null;
    }
  }, [isEditingContent]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      resetTitleIdleTimer();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingContent && contentTextareaRef.current) {
      contentTextareaRef.current.focus();
      resetContentIdleTimer();
    }
  }, [isEditingContent]);

  useEffect(() => {
    const handleGlobalFocusOrClick = (event: FocusEvent | MouseEvent) => {
      const target = (event.target || document.activeElement) as Node | null;
      if (isEditingTitle && titleContainerRef.current && target && !titleContainerRef.current.contains(target)) {
        setIsEditingTitle(false);
      }
      if (isEditingContent && contentContainerRef.current && target && !contentContainerRef.current.contains(target)) {
        setIsEditingContent(false);
      }
    };

    document.addEventListener('focusin', handleGlobalFocusOrClick);
    document.addEventListener('mousedown', handleGlobalFocusOrClick);
    return () => {
      document.removeEventListener('focusin', handleGlobalFocusOrClick);
      document.removeEventListener('mousedown', handleGlobalFocusOrClick);
    };
  }, [isEditingTitle, isEditingContent]);

  const autosaveCandidate = useMemo<Notes>(() => ({
    ...note,
    title: (title ?? '').trim(),
    content: (content ?? '').trim(),
    format,
    tags: normalizedTags,
  }), [note, title, content, format, normalizedTags]);

  const saveNote = useCallback(async (candidate: Notes) => {
    if (!candidate.$id) return candidate;
    const payload: Partial<Notes> = {
      title: candidate.title,
      content: candidate.content,
      format: candidate.format,
      tags: candidate.tags,
      isPublic: candidate.isPublic,
      status: candidate.status,
      parentNoteId: candidate.parentNoteId,
      comments: candidate.comments,
      extensions: candidate.extensions,
      collaborators: candidate.collaborators,
      metadata: candidate.metadata,
    };
    const saved = await updateNote(candidate.$id, payload);
    onUpdate(saved);
    return saved;
  }, [onUpdate]);

  const { isSaving: isAutosaving, forceSave } = useAutosave(autosaveCandidate, {
    enabled: !!note.$id,
    debounceMs: 600,
    trigger: 'manual',
    save: saveNote,
    onSave: () => {
      // local state already updated via onUpdate
    },
    onError: (error) => {
      showError('Autosave failed', error?.message || 'Could not sync your note');
    },
  });

  useEffect(() => {
    if (wasEditingRef.current && !isEditing && autosaveCandidate.$id) {
      forceSave(autosaveCandidate);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, autosaveCandidate, forceSave]);

  useEffect(() => {
    return () => {
      if (autosaveCandidate.$id) {
        forceSave(autosaveCandidate);
      }
    };
  }, [autosaveCandidate, forceSave]);

  useEffect(() => {
    if (!isEditing || !note.$id) return;
    const trimmedTitle = (title ?? '').trim();
    const trimmedContent = (content ?? '').trim();
    const tagsMatch = shallowArrayEqual(note.tags || [], normalizedTags);
    const matchesExisting =
      (note.title || '') === trimmedTitle &&
      (note.content || '') === trimmedContent &&
      (note.format || 'text') === format &&
      tagsMatch;
    if (matchesExisting) return;

    onUpdate({
      ...note,
      title: trimmedTitle,
      content: trimmedContent,
      format,
      tags: normalizedTags,
      updatedAt: new Date().toISOString(),
    });
  }, [isEditing, title, content, format, normalizedTags, note, onUpdate]);

  const handleDoodleSave = (doodleData: string) => {
    setContent(doodleData);
    setShowDoodleEditor(false);
  };

  const activateTitleEditing = () => {
    setIsEditingTitle(true);
  };

  const activateContentEditing = () => {
    setIsEditingContent(true);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    setAttachmentErrors([]);
    const newErrors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch(`/api/notes/${note.$id}/attachments`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!res.ok) {
            let errorPayload: any = null;
            try {
              errorPayload = await res.json();
            } catch {
              try {
                errorPayload = { raw: await res.text() };
              } catch {
                errorPayload = { error: `HTTP ${res.status}: ${res.statusText}` };
              }
            }
            const msg = errorPayload?.error || errorPayload?.raw || `Upload failed (${res.status})`;
            newErrors.push(`${file.name}: ${msg}`);
          } else {
            const data = await res.json();
            if (data.attachment) {
              setCurrentAttachments((prev) => [...prev, data.attachment]);
              showSuccess('Attachment added', `${file.name} uploaded successfully`);
            }
          }
        } catch (err: any) {
          newErrors.push(`${file.name}: ${err?.message || 'Upload failed'}`);
        }
      }

      if (newErrors.length > 0) {
        setAttachmentErrors(newErrors);
      }
    } finally {
      setIsUploadingAttachment(false);
      if (e.currentTarget) {
        e.currentTarget.value = '';
      }
    }
  };

  const handleCancel = () => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setFormat((note.format as 'text' | 'doodle') || 'text');
    setTags((note.tags || []).join(', '));
    setIsEditingTitle(false);
    setIsEditingContent(false);
  };

  const handleDelete = () => {
    onDelete(note.$id || '');
    setShowDeleteConfirm(false);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
        {showExpandButton && (
          <Tooltip title="Open full page">
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleOpenFullPage();
              }}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                color: 'rgba(255, 255, 255, 0.5)',
                '&:hover': { color: '#00F5FF', bgcolor: 'rgba(0, 245, 255, 0.1)' }
              }}
            >
              <ArrowTopRightOnSquareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {showHeaderDeleteButton && (
          <Tooltip title="Delete note">
            <IconButton
              onClick={() => setShowDeleteConfirm(true)}
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                '&:hover': { color: '#FF453A', bgcolor: 'rgba(255, 69, 58, 0.1)' }
              }}
            >
              <TrashIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box
        ref={titleContainerRef}
        sx={{
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          p: 3,
          transition: 'all 0.3s ease',
          '&:focus-within': {
            borderColor: '#00F5FF',
            bgcolor: 'rgba(0, 245, 255, 0.05)',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.1)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#00F5FF',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: '"Space Grotesk", sans-serif'
            }}
          >
            Title
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: '"Inter", sans-serif' }}>
            Tap to edit
          </Typography>
        </Box>
        {isEditingTitle ? (
          <TextField
            fullWidth
            variant="standard"
            value={title || ''}
            onChange={(e) => {
              setTitle(e.target.value);
              resetTitleIdleTimer();
            }}
            inputRef={titleInputRef}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: '"Space Grotesk", sans-serif'
              }
            }}
          />
        ) : (
          <Typography
            variant="h4"
            onClick={activateTitleEditing}
            sx={{
              fontWeight: 900,
              cursor: 'text',
              color: '#FFFFFF',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '1.75rem',
              lineHeight: 1.2
            }}
          >
            {displayTitle}
          </Typography>
        )}
      </Box>

      <Box
        ref={contentContainerRef}
        sx={{
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          p: 3,
          transition: 'all 0.3s ease',
          '&:focus-within': {
            borderColor: '#00F5FF',
            bgcolor: 'rgba(0, 245, 255, 0.05)',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.1)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#00F5FF',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: '"Space Grotesk", sans-serif'
            }}
          >
            Content
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: '"Inter", sans-serif' }}>
            Click inside to edit
          </Typography>
        </Box>

        {isEditingContent ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(_, newFormat) => newFormat && setFormat(newFormat)}
              fullWidth
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                p: 0.5,
                borderRadius: '12px',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&.Mui-selected': {
                    bgcolor: '#00F5FF',
                    color: '#000000',
                    '&:hover': { bgcolor: '#00D1DA' }
                  }
                }
              }}
            >
              <ToggleButton value="text">Text</ToggleButton>
              <ToggleButton value="doodle">Doodle</ToggleButton>
            </ToggleButtonGroup>

            {format === 'text' ? (
              <TextField
                fullWidth
                multiline
                rows={12}
                variant="standard"
                value={content || ''}
                onChange={(e) => {
                  setContent(e.target.value);
                  resetContentIdleTimer();
                }}
                inputRef={contentTextareaRef}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.95rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.7,
                    fontFamily: '"Inter", sans-serif'
                  }
                }}
              />
            ) : (
              <Box>
                {content ? (
                  <Box sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
                    <NoteContentDisplay
                      content={content}
                      format="doodle"
                      onEditDoodle={() => setShowDoodleEditor(true)}
                    />
                  </Box>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowDoodleEditor(true)}
                    sx={{
                      height: 160,
                      borderStyle: 'dashed',
                      borderRadius: '16px',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255, 255, 255, 0.3)',
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      '&:hover': {
                        borderColor: '#00F5FF',
                        bgcolor: 'rgba(0, 245, 255, 0.05)',
                        color: '#00F5FF'
                      }
                    }}
                  >
                    Click to draw
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box onClick={activateContentEditing} sx={{ cursor: 'text' }}>
            <NoteContentRenderer
              content={displayContent}
              format={displayFormat}
              emptyFallback={<Typography variant="body2" sx={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.3)' }}>No content</Typography>}
              onEditDoodle={displayFormat === 'doodle' ? activateContentEditing : undefined}
            />

            {displayFormat !== 'doodle' && displayContent && (
              <Box sx={{ pt: 3 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClipboardDocumentIcon />}
                  onClick={async (event) => {
                    event.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(displayContent);
                      showSuccess('Copied', 'Content copied to clipboard');
                    } catch (err) {
                      showError('Copy failed', 'Could not copy content to clipboard');
                    }
                  }}
                  sx={{
                    borderRadius: '10px',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    '&:hover': {
                      borderColor: '#00F5FF',
                      color: '#00F5FF',
                      bgcolor: 'rgba(0, 245, 255, 0.05)'
                    }
                  }}
                >
                  Copy Content
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Tags */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 2,
            color: '#00F5FF',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: '"Space Grotesk", sans-serif'
          }}
        >
          Tags
        </Typography>
        {isEditing ? (
          <TextField
            fullWidth
            size="small"
            placeholder="Separate tags with commas"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.03)',
                fontFamily: '"Inter", sans-serif',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused fieldset': { borderColor: '#00F5FF' },
              }
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {displayTags.map((tag: string, index: number) => (
              <Chip
                key={`${tag}-${index}`}
                label={tag}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 245, 255, 0.1)',
                  color: '#00F5FF',
                  border: '1px solid rgba(0, 245, 255, 0.2)',
                  fontWeight: 700,
                  fontFamily: '"Space Grotesk", sans-serif',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                  borderRadius: '6px'
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Attachments */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 2,
            color: '#00F5FF',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: '"Space Grotesk", sans-serif'
          }}
        >
          Attachments
        </Typography>
        {isEditing && (
          <Box sx={{ mb: 2.5 }}>
            <input
              type="file"
              id="attachment-input"
              multiple
              onChange={handleAttachmentUpload}
              disabled={isUploadingAttachment}
              style={{ display: 'none' }}
            />
            <Button
              fullWidth
              variant="outlined"
              startIcon={isUploadingAttachment ? <CircularProgress size={16} sx={{ color: '#00F5FF' }} /> : <PaperClipIcon />}
              onClick={() => document.getElementById('attachment-input')?.click()}
              disabled={isUploadingAttachment}
              sx={{
                borderRadius: '12px',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                '&:hover': {
                  borderColor: '#00F5FF',
                  bgcolor: 'rgba(0, 245, 255, 0.05)'
                }
              }}
            >
              {isUploadingAttachment ? 'Uploading...' : 'Add Attachments'}
            </Button>
            {attachmentErrors.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                {attachmentErrors.map((err, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', color: '#FF453A', bgcolor: 'rgba(255, 69, 58, 0.1)', p: 1.5, borderRadius: '8px', mt: 1, fontFamily: '"Inter", sans-serif' }}>
                    {err}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
        {currentAttachments.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 240, overflow: 'auto' }}>
            {currentAttachments.map((a: any) => (
              <Box key={a.id} sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#00F5FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"Space Grotesk", sans-serif' }}>
                    {a.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: '"Inter", sans-serif' }}>
                    {formatFileSize(a.size)}{a.mime ? ` • ${a.mime}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  href={`/notes/${note.$id}/${a.id}`}
                  sx={{
                    color: '#00F5FF',
                    fontWeight: 800,
                    fontFamily: '"Space Grotesk", sans-serif',
                    '&:hover': { bgcolor: 'rgba(0, 245, 255, 0.1)' }
                  }}
                >
                  OPEN
                </Button>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.3)', fontFamily: '"Inter", sans-serif' }}>No attachments</Typography>
        )}
      </Box>

      {/* Metadata */}
      <Box sx={{ pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: '"Inter", sans-serif' }}>
          Created: {formatNoteCreatedDate(note)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontFamily: '"Inter", sans-serif' }}>
          Updated: {formatNoteUpdatedDate(note)}
        </Typography>
      </Box>


      {/* Edit Actions */}
      {isEditing && (
        <Box sx={{ pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: '"Inter", sans-serif', fontWeight: 600 }}>
              {isAutosaving ? 'Syncing changes…' : 'All changes synced'}
            </Typography>
            {isAutosaving && <CircularProgress size={14} sx={{ color: '#00F5FF' }} />}
          </Box>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleCancel}
            sx={{
              borderRadius: '12px',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
                bgcolor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Cancel Edits
          </Button>
        </Box>
      )}

      {/* Doodle Editor Modal */}
      {showDoodleEditor && (
        <DoodleCanvas
          initialData={format === 'doodle' ? content : ''}
          onSave={handleDoodleSave}
          onClose={() => setShowDoodleEditor(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: '32px',
            bgcolor: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundImage: 'none',
            p: 2,
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
          }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 900,
          fontSize: '1.75rem',
          fontFamily: '"Space Grotesk", sans-serif',
          color: '#FF453A',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Delete Note
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: '"Inter", sans-serif', lineHeight: 1.6 }}>
            Are you sure you want to delete &quot;{note.title || 'this note'}&quot;? This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2, flexDirection: 'column' }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleDelete}
            sx={{
              borderRadius: '12px',
              bgcolor: '#FF453A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontFamily: '"Space Grotesk", sans-serif',
              textTransform: 'uppercase',
              '&:hover': { bgcolor: '#D32F2F' }
            }}
          >
            Delete Permanently
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setShowDeleteConfirm(false)}
            sx={{
              borderRadius: '12px',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontFamily: '"Space Grotesk", sans-serif',
              textTransform: 'uppercase',
              '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)', bgcolor: 'rgba(255, 255, 255, 0.05)' }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

