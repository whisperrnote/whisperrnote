"use client";

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Stack, 
  Button, 
  alpha,
  Grid2 as Grid,
  Paper,
  TextField,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon, 
  AutoAwesome as SparklesIcon, 
  Lightbulb as LightBulbIcon, 
  Search as MagnifyingGlassIcon, 
  Edit as PencilIcon 
} from '@mui/icons-material';

interface AIGeneratePromptModalProps {
  onClose: () => void;
  onGenerate: (prompt: string, type: 'topic' | 'brainstorm' | 'research' | 'custom') => void;
  isGenerating?: boolean;
  initialPrompt?: string;
}

export function AIGeneratePromptModal({ onClose, onGenerate, isGenerating = false, initialPrompt = '' }: AIGeneratePromptModalProps) {
  const [selectedType, setSelectedType] = useState<'topic' | 'brainstorm' | 'research' | 'custom'>('topic');
  const [customPrompt, setCustomPrompt] = useState(initialPrompt);

  const promptTypes = [
    {
      id: 'topic' as const,
      title: 'Write About Topic',
      description: 'Generate a comprehensive note about a specific subject',
      icon: PencilIcon,
      placeholder: 'e.g., "Machine Learning fundamentals", "Climate change impact"',
      examples: ['Quantum computing basics', 'Mediterranean diet benefits', 'Remote work best practices']
    },
    {
      id: 'brainstorm' as const,
      title: 'Brainstorm Ideas',
      description: 'Generate creative ideas and suggestions for a project or problem',
      icon: LightBulbIcon,
      placeholder: 'e.g., "App features for productivity", "Birthday party themes"',
      examples: ['Startup business ideas', 'Weekend activity suggestions', 'Content creation topics']
    },
    {
      id: 'research' as const,
      title: 'Research & Analysis',
      description: 'Compile research findings and analysis on a topic',
      icon: MagnifyingGlassIcon,
      placeholder: 'e.g., "Electric vehicles market trends", "Ancient Roman architecture"',
      examples: ['Cryptocurrency market analysis', 'Renewable energy solutions', 'Space exploration timeline']
    },
    {
      id: 'custom' as const,
      title: 'Custom Request',
      description: 'Provide your own specific instructions for AI generation',
      icon: SparklesIcon,
      placeholder: 'Describe exactly what you want the AI to create...',
      examples: ['Create a meeting agenda', 'Write a product comparison', 'Draft a project proposal']
    }
  ];

  const selectedTypeData = promptTypes.find(type => type.id === selectedType)!;

  const handleGenerate = () => {
    if (customPrompt.trim()) {
      onGenerate(customPrompt.trim(), selectedType);
    }
  };

  const handleExampleClick = (example: string) => {
    setCustomPrompt(example);
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '28px',
          backgroundImage: 'none',
          color: 'white',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        p: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ 
            w: 40, 
            h: 40, 
            bgcolor: '#00F5FF', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)'
          }}>
            <SparklesIcon sx={{ color: '#000' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
              AI Note Generation
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
              Let AI create a note for you
            </Typography>
          </Box>
        </Stack>
        <IconButton 
          onClick={onClose}
          disabled={isGenerating}
          sx={{ color: 'rgba(255, 255, 255, 0.4)', '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.05)' } }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: 'white' }}>
              What would you like to generate?
            </Typography>
            <Grid container spacing={2}>
              {promptTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={type.id}>
                    <Paper
                      component="button"
                      onClick={() => setSelectedType(type.id)}
                      disabled={isGenerating}
                      sx={{
                        p: 2.5,
                        width: '100%',
                        textAlign: 'left',
                        bgcolor: isSelected ? alpha('#00F5FF', 0.05) : 'rgba(255, 255, 255, 0.02)',
                        border: '2px solid',
                        borderColor: isSelected ? '#00F5FF' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 20px rgba(0, 245, 255, 0.1)' : 'none',
                        '&:hover': {
                          bgcolor: isSelected ? alpha('#00F5FF', 0.08) : 'rgba(255, 255, 255, 0.04)',
                          borderColor: isSelected ? '#00F5FF' : 'rgba(255, 255, 255, 0.2)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: '12px', 
                          bgcolor: isSelected ? '#00F5FF' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#000' : 'rgba(255, 255, 255, 0.4)',
                          display: 'flex'
                        }}>
                          <Icon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isSelected ? '#00F5FF' : 'white' }}>
                            {type.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                            {type.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: 'white' }}>
              Describe your request
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={selectedTypeData.placeholder}
              disabled={isGenerating}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '20px',
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#00F5FF' }
                }
              }}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', mb: 1, display: 'block', textTransform: 'uppercase' }}>
                Example prompts
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedTypeData.examples.map((example, index) => (
                  <Chip
                    key={index}
                    label={example}
                    onClick={() => handleExampleClick(example)}
                    disabled={isGenerating}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                        borderColor: '#00F5FF',
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        bgcolor: 'rgba(255, 255, 255, 0.02)', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        justifyContent: 'space-between'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, ml: 1 }}>
          {isGenerating ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} sx={{ color: '#00F5FF' }} />
              <span>Generating your note...</span>
            </Stack>
          ) : (
            'Content will appear in the editor'
          )}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button 
            onClick={onClose}
            disabled={isGenerating}
            sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!customPrompt.trim() || isGenerating}
            startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <SparklesIcon />}
            sx={{
              bgcolor: '#00F5FF',
              color: '#000',
              fontWeight: 800,
              borderRadius: '14px',
              px: 3,
              '&:hover': { bgcolor: '#00D1DA' },
              '&.Mui-disabled': { bgcolor: 'rgba(0, 245, 255, 0.2)', color: 'rgba(0, 0, 0, 0.3)' }
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Note'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
