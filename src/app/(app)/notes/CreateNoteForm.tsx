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

    const generatedTitle = buildAutoTitleFromContent(content);
    if (generatedTitle !== title) {
      setTitle(generatedTitle);
    }
  }, [content, format, isTitleManuallyEdited, title]);

  const handleCreateNote = async () => {
    if (!title.trim() || isLoading) return;

    setIsLoading(true);
    const newNoteData = {
      title: title.trim(),
      content: content.trim(),
      format,
      tags,
      isPublic,
    };

    try {
      const newNote = await appwriteCreateNote(newNoteData);
      if (newNote) {
        onNoteCreated(newNote);
      }
      closeOverlay();
    } catch (error) {
      console.error('Failed to create note:', error);
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
          bgcolor: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(30px) saturate(180%)',
          borderRadius: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 4rem)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(90deg, rgba(0, 245, 255, 0.05) 0%, rgba(0, 245, 255, 0.1) 100%)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #00F5FF 0%, #00D1FF 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0, 245, 255, 0.2)'
              }}
            >
              {format === 'doodle' ? (
                <PencilIcon sx={{ fontSize: 24, color: 'black' }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 24, color: 'black' }} />
              )}
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  fontFamily: 'var(--font-space-grotesk)',
                  color: 'white'
                }}
              >
                {format === 'doodle' ? 'Create Doodle' : 'Create Note'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 500
                }}
              >
                {format === 'doodle' ? 'Draw and sketch your ideas' : 'Capture your thoughts and ideas'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Format Toggle */}
            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(_, newFormat) => newFormat && setFormat(newFormat)}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                p: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px',
                  px: 2,
                  py: 0.75,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  '&.Mui-selected': {
                    bgcolor: '#00F5FF',
                    color: 'black',
                    '&:hover': {
                      bgcolor: '#00E5EE'
                    }
                  },
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }
              }}
            >
              <ToggleButton value="text">
                <Stack direction="row" spacing={1} alignItems="center">
                  <DescriptionIcon sx={{ fontSize: 18 }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Text</Box>
                </Stack>
              </ToggleButton>
              <ToggleButton value="doodle">
                <Stack direction="row" spacing={1} alignItems="center">
                  <PencilIcon sx={{ fontSize: 18 }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Doodle</Box>
                </Stack>
              </ToggleButton>
            </ToggleButtonGroup>
            
            <IconButton
              onClick={closeOverlay}
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

      {/* Form Content - Scrollable */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Stack spacing={4}>
          {/* Title Input */}
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
              Title
            </Typography>
            <TextField
              fullWidth
              placeholder="Give your note a memorable title..."
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              variant="outlined"
              inputProps={{ maxLength: 255 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
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
          </Box>

          {/* Visibility Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(255, 255, 255, 0.03)', p: 2, borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white', fontFamily: 'var(--font-space-grotesk)' }}>
                Visibility
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {isPublic ? 'Anyone with the link can view this note' : 'Only you and collaborators can view this note'}
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={isPublic}
              exclusive
              onChange={(_, val) => val !== null && setIsPublic(val)}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                p: 0.5,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px',
                  px: 2,
                  py: 0.5,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  '&.Mui-selected': {
                    bgcolor: isPublic ? '#00F5FF' : 'rgba(255, 255, 255, 0.2)',
                    color: isPublic ? 'black' : 'white',
                    '&:hover': {
                      bgcolor: isPublic ? '#00E5EE' : 'rgba(255, 255, 255, 0.3)',
                    }
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
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 1,
                  fontFamily: 'var(--font-space-grotesk)'
                }}
              >
                Content
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Start writing your beautiful notes here... You can always edit and enhance them later."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                variant="outlined"
                inputProps={{ maxLength: 65000 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
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
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'right',
                  mt: 1,
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 500
                }}
              >
                {content.length}/65000 characters
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
          p: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(255, 255, 255, 0.02)'
        }}
      >
        <Button 
          variant="outlined" 
          onClick={closeOverlay}
          disabled={isLoading}
          sx={{ px: 4, borderRadius: '14px' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateNote}
          disabled={!title.trim() || !content.trim() || isLoading}
          sx={{ 
            px: 4, 
            borderRadius: '14px',
            bgcolor: '#00F5FF',
            color: 'black',
            fontWeight: 800,
            '&:hover': { bgcolor: '#00E5EE' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(0, 245, 255, 0.3)',
              color: 'rgba(0, 0, 0, 0.3)'
            }
          }}
        >
          {isLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  borderTopColor: 'black',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
              <Typography variant="button" sx={{ fontWeight: 800 }}>
                Creating...
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              {format === 'doodle' ? (
                <PencilIcon sx={{ fontSize: 18 }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 18 }} />
              )}
              <Typography variant="button" sx={{ fontWeight: 800 }}>
                {`Create ${format === 'doodle' ? 'Doodle' : 'Note'}`}
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
