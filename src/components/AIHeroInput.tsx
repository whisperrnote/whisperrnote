"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Typography, 
  Button, 
  Grid, 
  alpha, 
  useTheme,
  InputAdornment
} from '@mui/material';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface AIHeroInputProps {
  onPromptSelectAction: (prompt: string) => void;
  className?: string;
}

const PROMPT_SUGGESTIONS = [
  "Brainstorm creative marketing ideas for a web3 startup",
  "Summarize key insights from my research notes"
];

export function AIHeroInput({ onPromptSelectAction, className = '' }: AIHeroInputProps) {
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isActive, setIsActive] = useState(false);
  const theme = useTheme();

  // Auto-typing animation effect
  useEffect(() => {
    if (isActive) return;

    const typeText = async () => {
      const targetText = PROMPT_SUGGESTIONS[currentSuggestionIndex];
      
      // Typing effect
      for (let i = 0; i <= targetText.length; i++) {
        setDisplayText(targetText.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Pause at full text
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Deleting effect
      for (let i = targetText.length; i >= 0; i--) {
        setDisplayText(targetText.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      setCurrentSuggestionIndex((prev) => (prev + 1) % PROMPT_SUGGESTIONS.length);
    };

    typeText();
  }, [currentSuggestionIndex, isActive]);

  const handleInputFocus = () => {
    setIsActive(true);
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      setIsActive(false);
      setDisplayText('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setIsActive(true);
    onPromptSelectAction(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onPromptSelectAction(inputValue.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '896px', mx: 'auto' }}>
      {/* Main Input */}
      <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative', mb: 4 }}>
        <TextField
          fullWidth
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={isActive || inputValue ? '' : displayText}
          variant="outlined"
          InputProps={{
            sx: {
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              backdropFilter: 'blur(8px)',
              fontSize: '1.125rem',
              py: 1,
              px: 2,
              '& fieldset': {
                borderColor: inputValue ? 'primary.main' : alpha(theme.palette.primary.main, 0.3),
                borderWidth: 2,
                transition: 'all 0.3s',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.3)}`,
              },
            },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  disabled={!inputValue.trim()}
                  sx={{
                    bgcolor: inputValue.trim() ? 'primary.main' : alpha(theme.palette.primary.main, 0.2),
                    color: inputValue.trim() ? 'primary.contrastText' : alpha(theme.palette.primary.main, 0.5),
                    borderRadius: 3,
                    p: 1.5,
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: inputValue.trim() ? alpha(theme.palette.primary.main, 0.8) : alpha(theme.palette.primary.main, 0.2),
                    },
                    '&.Mui-disabled': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: alpha(theme.palette.primary.main, 0.3),
                    }
                  }}
                >
                  <SparklesIcon style={{ height: 20, width: 20 }} />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        {/* Typing Cursor */}
        {!isActive && !inputValue && (
          <Box sx={{ 
            position: 'absolute', 
            right: 80, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: 2, 
            height: 24, 
            bgcolor: 'primary.main',
            animation: 'pulse 1.5s infinite'
          }} />
        )}
      </Box>

      {/* Quick Suggestions */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: 'text.secondary' }}>
          Instant create with AI!
        </Typography>
        <Grid container spacing={2}>
          {PROMPT_SUGGESTIONS.map((suggestion, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Button
                fullWidth
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  p: 2,
                  borderRadius: 3,
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  bgcolor: alpha(theme.palette.background.paper, 0.3),
                  backdropFilter: 'blur(8px)',
                  color: 'text.primary',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <SparklesIcon style={{ height: 16, width: 16, color: theme.palette.primary.main }} />
                  <Typography variant="body2" noWrap sx={{ opacity: 0.8 }}>
                    {suggestion}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
