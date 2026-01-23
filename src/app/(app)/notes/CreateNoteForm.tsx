"use client";

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  TextField,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DescriptionIcon,
  LocalOffer as TagIcon,
  Add as PlusIcon,
  Brush as PencilIcon,
} from '@mui/icons-material';
import { Button } from '@/components/ui/Button';
import { AUTO_TITLE_CONFIG } from '@/constants/noteTitle';
import { useOverlay } from '@/components/ui/OverlayContext';
import { useToast } from '@/components/ui/Toast';
import { createNote as appwriteCreateNote } from '@/lib/appwrite';
import type { Notes } from '@/types/appwrite';
import * as AppwriteTypes from '@/types/appwrite';
import DoodleCanvas from '@/components/DoodleCanvas';

interface CreateNoteFormProps {
  onNoteCreated: (note: Notes) => void;
  initialContent?: {
    title?: string;
    content?: string;
    tags?: string[];
  };
  initialFormat?: 'text' | 'doodle';
}

export default function CreateNoteForm({ onNoteCreated, initialContent, initialFormat = 'text' }: CreateNoteFormProps) {
  const [title, setTitle] = useState(initialContent?.title || '');
  const [content, setContent] = useState(initialContent?.content || '');
  const [format, setFormat] = useState<'text' | 'doodle'>(initialFormat);
  const [tags, setTags] = useState<string[]>(initialContent?.tags || []);
  const [isPublic, setIsPublic] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDoodleEditor, setShowDoodleEditor] = useState(false);
  const { closeOverlay } = useOverlay();
  const { showSuccess, showError } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(Boolean(initialContent?.title));

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleTitleChange = (value: string) => {
    setIsTitleManuallyEdited(true);
    setTitle(value);
  };

  const handleDoodleSave = (doodleData: string) => {
    setContent(doodleData);
    setFormat('doodle');
    setShowDoodleEditor(false);
  };

  useEffect(() => {
    if (format !== 'text') return;
    if (isTitleManuallyEdited) return;

    const timer = setTimeout(() => {
      const generatedTitle = buildAutoTitleFromContent(content);
      if (generatedTitle !== title) {
        setTitle(generatedTitle);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [content, format, isTitleManuallyEdited, title]);

  const handleCreateNote = async () => {
    let finalTitle = title.trim();

    // Auto-generate title if missing
    if (!finalTitle) {
      if (format === 'doodle') {
        finalTitle = `Sketch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (content.trim()) {
        finalTitle = buildAutoTitleFromContent(content) || 'Untitled Thought';
      }
    }

    if (!finalTitle || isLoading) return;

    setIsLoading(true);
    const newNoteData = {
      title: finalTitle,
      content: content.trim(),
      format,
      tags,
      isPublic,
    };

    try {
      const newNote = await appwriteCreateNote(newNoteData);
      if (newNote) {
        showSuccess('Spark of Genius Capture', 'Your new note has been crystallized in the cloud.');
        onNoteCreated(newNote);
      }
      closeOverlay();
    } catch (error: any) {
      console.error('Failed to create note:', error);
      showError('Creation Anomaly', error.message || 'The cloud rejected your thought. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showDoodleEditor && (
        <DoodleCanvas
          initialData={format === 'doodle' ? content : ''}
          onSave={handleDoodleSave}
          onClose={() => setShowDoodleEditor(false)}
        />
      )}

      <Box
        sx={{
          width: '100%',
          maxWidth: '672px',
          mx: 'auto',
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(16px) saturate(140%)',
          borderRadius: { xs: '24px', sm: '32px' },
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          maxHeight: { xs: 'calc(100dvh - 1rem)', sm: 'calc(100vh - 4rem)' },
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: { xs: 2.5, sm: 3 },
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(90deg, rgba(0, 245, 255, 0.02) 0%, rgba(0, 245, 255, 0.05) 100%)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                background: 'linear-gradient(135deg, #00F5FF 0%, #00D1FF 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0, 245, 255, 0.2)'
              }}
            >
              {format === 'doodle' ? (
                <PencilIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: 'black' }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: 'black' }} />
              )}
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.15rem', sm: '1.5rem' },
                  fontFamily: 'var(--font-space-grotesk)',
                  color: 'white',
                  lineHeight: 1.2
                }}
              >
                {format === 'doodle' ? 'Create Doodle' : 'New Thought'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 500,
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {format === 'doodle' ? 'Sketch your ideas' : 'Capture your brilliance'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(_, newFormat) => newFormat && setFormat(newFormat)}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                p: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px',
                  paddingLeft: theme.spacing(1.5),
                  paddingRight: theme.spacing(1.5),
                  [theme.breakpoints.up('sm')]: {
                    paddingLeft: theme.spacing(2),
                    paddingRight: theme.spacing(2),
                  },
                  py: 0.5,
                  color: 'rgba(255, 255, 255, 0.5)',
                  '&.Mui-selected': {
                    bgcolor: '#00F5FF',
                    color: 'black',
                    '&:hover': { bgcolor: '#00E5EE' }
                  }
                }
              }}
            >
              <ToggleButton value="text">
                <DescriptionIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="doodle">
                <PencilIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              onClick={closeOverlay}
              sx={{
                color: 'rgba(255, 255, 255, 0.4)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  color: 'white'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        {/* Form Content - Scrollable */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          p: { xs: 2.5, sm: 3 },
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
        }}>
          <Stack sx={{ gap: { xs: 3, sm: 4 } }}>
            {/* Title Input */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: 'rgba(255, 255, 255, 0.5)',
                  mb: 1,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                Designation
              </Typography>
              <TextField
                fullWidth
                placeholder="Title your odyssey..."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                variant="outlined"
                inputProps={{ maxLength: 255 }}
                autoComplete="off"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '14px',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      borderWidth: '1.5px'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.15)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00F5FF',
                      borderWidth: '2px'
                    }
                  }
                }}
              />
            </Box>

            {/* Visibility Toggle */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              p: 2,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white', fontSize: '0.875rem' }}>
                  Privacy Mode
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {isPublic ? 'Publicly discoverable' : 'Vaulted session'}
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={isPublic}
                exclusive
                onChange={(_, val) => val !== null && setIsPublic(val)}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  p: 0.4,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '7px',
                    px: 2,
                    py: 0.5,
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      bgcolor: isPublic ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                      color: isPublic ? '#00F5FF' : 'white',
                    }
                  }
                }}
              >
                <ToggleButton value={false}>Private</ToggleButton>
                <ToggleButton value={true}>Public</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Content - Text or Doodle */}
            {format === 'text' ? (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: 'rgba(255, 255, 255, 0.5)',
                    mb: 1,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}
                >
                  Manifestation
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={isMobile ? 5 : 8}
                  placeholder="Transcribe your consciousness..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  variant="outlined"
                  inputProps={{ maxLength: 65000 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '18px',
                      color: 'white',
                      fontFamily: 'inherit',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: '1.5px'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.15)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00F5FF',
                        borderWidth: '2px'
                      }
                    }
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'right',
                    mt: 0.5,
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontWeight: 600
                  }}
                >
                  {content.length.toLocaleString()} / 65,000
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.9)',
                    mb: 1,
                    fontFamily: 'var(--font-space-grotesk)'
                  }}
                >
                  Doodle
                </Typography>
                {content ? (
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 200,
                      borderRadius: '20px',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      overflow: 'hidden'
                    }}
                  >
                    <canvas
                      style={{ width: '100%', height: '100%' }}
                      ref={(canvas) => {
                        if (!canvas || !content) return;
                        try {
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          const strokes = JSON.parse(content);
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          strokes.forEach((stroke: any) => {
                            if (stroke.points.length < 2) return;
                            ctx.strokeStyle = stroke.color;
                            ctx.lineWidth = stroke.size;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.beginPath();
                            ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
                            for (let i = 1; i < stroke.points.length; i++) {
                              ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
                            }
                            ctx.stroke();
                          });
                        } catch {
                          // Invalid doodle data
                        }
                      }}
                      width={800}
                      height={600}
                    />
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setShowDoodleEditor(true)}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0, 0, 0, 0)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.2)' },
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: '#00F5FF',
                          color: 'black',
                          px: 2,
                          py: 1,
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.875rem'
                        }}
                      >
                        Edit
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowDoodleEditor(true)}
                    sx={{
                      width: '100%',
                      height: 200,
                      border: '2px dashed rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: '#00F5FF'
                      },
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      cursor: 'pointer'
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: 'rgba(0, 245, 255, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <PencilIcon sx={{ fontSize: 24, color: '#00F5FF' }} />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }}>
                        Start Drawing
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Click to open doodle editor
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Tags Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 1.5,
                  fontFamily: 'var(--font-space-grotesk)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <TagIcon sx={{ fontSize: 18 }} />
                Tags
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a tag..."
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: '2px'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00F5FF'
                      }
                    }
                  }}
                />
                <IconButton
                  onClick={handleAddTag}
                  disabled={!currentTag.trim()}
                  sx={{
                    bgcolor: '#00F5FF',
                    color: 'black',
                    borderRadius: '12px',
                    width: 40,
                    height: 40,
                    '&:hover': { bgcolor: '#00E5EE' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(0, 245, 255, 0.3)',
                      color: 'rgba(0, 0, 0, 0.3)'
                    }
                  }}
                >
                  <PlusIcon />
                </IconButton>
              </Stack>

              {tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      deleteIcon={<CloseIcon sx={{ fontSize: '12px !important' }} />}
                      sx={{
                        bgcolor: 'rgba(0, 245, 255, 0.1)',
                        color: '#00F5FF',
                        border: '1px solid rgba(0, 245, 255, 0.2)',
                        borderRadius: '10px',
                        fontWeight: 600,
                        '& .MuiChip-deleteIcon': {
                          color: '#00F5FF',
                          '&:hover': { color: 'white' }
                        }
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'end',
            gap: 2,
            p: { xs: 2.5, sm: 3 },
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            mt: 'auto'
          }}
        >
          <Button
            variant="outlined"
            onClick={closeOverlay}
            disabled={isLoading}
            sx={{
              px: { xs: 2.5, sm: 4 },
              borderRadius: '12px',
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.3)',
                bgcolor: 'rgba(255,255,255,0.05)',
                color: 'white'
              }
            }}
          >
            Discard
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleCreateNote();
            }}
            disabled={!content.trim() || isLoading}
            sx={{
              px: { xs: 4, sm: 6 },
              py: { xs: 1.5, sm: 2 },
              borderRadius: '16px',
              bgcolor: '#00F5FF',
              color: 'black',
              fontWeight: 900,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              boxShadow: '0 8px 32px rgba(0, 245, 255, 0.25)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: '#00D1DA',
                boxShadow: '0 12px 40px rgba(0, 245, 255, 0.4)',
                transform: 'translateY(-2px)'
              },
              '&:active': {
                transform: 'translateY(0)',
                filter: 'brightness(0.9)'
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(0, 245, 255, 0.1)',
                color: 'rgba(0, 0, 0, 0.3)',
                boxShadow: 'none'
              }
            }}
          >
            {isLoading ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    borderTopColor: 'black',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                />
                <Typography variant="button" sx={{ fontWeight: 900 }}>
                  Synthesizing
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                {format === 'doodle' ? (
                  <PencilIcon sx={{ fontSize: 20 }} />
                ) : (
                  <DescriptionIcon sx={{ fontSize: 20 }} />
                )}
                <Typography variant="button" sx={{ fontWeight: 900 }}>
                  {`Publish ${format === 'doodle' ? 'Doodle' : 'Note'}`}
                </Typography>
              </Stack>
            )}
          </Button>
        </Box>
      </Box>
    </>
  );
}

function buildAutoTitleFromContent(rawContent: string): string {
  const normalized = rawContent.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';

  const words = normalized.split(' ').filter(Boolean);
  if (!words.length) return '';

  const selectedWords: string[] = [];
  for (let i = 0; i < words.length && selectedWords.length < AUTO_TITLE_CONFIG.maxWords; i++) {
    const candidateWords = [...selectedWords, words[i]];
    const candidateText = candidateWords.join(' ');
    const limit = computeTitleCharacterLimit(candidateWords);

    if (selectedWords.length === 0 || candidateText.length <= limit) {
      selectedWords.push(words[i]);
      continue;
    }
    break;
  }

  let titleCandidate = selectedWords.join(' ');
  if (
    titleCandidate.length < AUTO_TITLE_CONFIG.minCharLength &&
    selectedWords.length < Math.min(words.length, AUTO_TITLE_CONFIG.maxWords)
  ) {
    let cursor = selectedWords.length;
    while (
      titleCandidate.length < AUTO_TITLE_CONFIG.minCharLength &&
      cursor < words.length &&
      selectedWords.length < AUTO_TITLE_CONFIG.maxWords
    ) {
      selectedWords.push(words[cursor]);
      cursor += 1;
      titleCandidate = selectedWords.join(' ');
    }
  }

  return titleCandidate;
}

function computeTitleCharacterLimit(words: string[]): number {
  if (!words.length) {
    return AUTO_TITLE_CONFIG.baseCharLimit;
  }

  const averageLen = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const extra = Math.max(0, Math.round(averageLen - AUTO_TITLE_CONFIG.avgWordThreshold)) * AUTO_TITLE_CONFIG.extraPerLongWord;
  return AUTO_TITLE_CONFIG.baseCharLimit + Math.min(AUTO_TITLE_CONFIG.maxExtraCharLimit, extra);
}
