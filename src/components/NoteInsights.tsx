"use client";

import React from 'react';
import {
  Paper, Box, Typography, List, ListItem, ListItemText, Divider,
  IconButton, Tooltip, Chip, Stack, LinearProgress, Card, CardContent,
  alpha
} from '@mui/material';
import { 
  Psychology as PsychologyIcon, 
  Refresh as RefreshIcon, 
  Lightbulb as LightbulbIcon, 
  TrendingUp as TrendingUpIcon, 
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Note } from '../types/notes';

const MotionPaper = motion(Paper);

interface NoteInsightsProps {
  note?: Note;
  content?: string;
  onApplySuggestion?: (suggestion: string) => void;
  onRefresh?: () => void;
}

export default function NoteInsights({ note, content, onApplySuggestion, onRefresh }: NoteInsightsProps) {
  // Use note's AI metadata if available, otherwise generate mock insights
  const insights = note?.ai_metadata || {
    readingTime: Math.ceil((content?.split(' ').length || 0) / 200),
    topics: ['General'],
    keyPoints: [],
    sentiment: 'neutral',
    summary: content?.substring(0, 150) + (content && content.length > 150 ? '...' : ''),
    suggestions: [
      'Consider breaking down the long paragraph into smaller sections',
      'Add code examples to illustrate the concepts',
      'Include a summary section at the end'
    ]
  };

  const analytics = note?.analytics || {
    view_count: 0,
    edit_count: 0,
    share_count: 0,
    last_accessed: new Date().toISOString()
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#00FF00';
      case 'negative': return '#FF4D4D';
      case 'neutral': return '#A1A1AA'; // Gunmetal for neutral
      default: return '#00F5FF';
    }
  };

  const getClarity = (content: string) => {
    if (!content) return 0;
    const sentences = content.split('.').filter(s => s.trim().length > 0);
    const avgWordsPerSentence = content.split(' ').length / sentences.length;
    return Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));
  };

  const clarity = getClarity(content || note?.content || '');

  return (
    <MotionPaper
      elevation={0}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      sx={{ 
        p: 3, 
        height: '100%', 
        overflow: 'auto',
        bgcolor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(25px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        backgroundImage: 'none'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
          <PsychologyIcon sx={{ color: '#00F5FF' }} />
          AI Insights
        </Typography>
        <Tooltip title="Refresh analysis">
          <IconButton 
            size="small" 
            onClick={onRefresh}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.4)',
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: 'white' }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2, mb: 4 }}>
        <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
              Reading Time
            </Typography>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900, color: 'white' }}>
              <ScheduleIcon sx={{ fontSize: 20, color: '#00F5FF' }} />
              {insights.readingTime}m
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
              Views
            </Typography>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900, color: 'white' }}>
              <TrendingUpIcon sx={{ fontSize: 20, color: '#00F5FF' }} />
              {analytics.view_count}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <List dense disablePadding>
        {/* Topics */}
        <ListItem sx={{ px: 0, mb: 3 }}>
          <ListItemText 
            primary={
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested Topics
              </Typography>
            }
            secondary={
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                {insights.topics?.map((topic, index) => (
                  <Chip 
                    key={index}
                    label={topic}
                    size="small"
                    sx={{ 
                      fontSize: '10px', 
                      fontWeight: 800,
                      bgcolor: alpha('#00F5FF', 0.1),
                      color: '#00F5FF',
                      border: '1px solid',
                      borderColor: alpha('#00F5FF', 0.2),
                      borderRadius: '8px'
                    }}
                  />
                ))}
              </Stack>
            }
          />
        </ListItem>

        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Key Points */}
        {insights.keyPoints && insights.keyPoints.length > 0 && (
          <>
            <ListItem sx={{ px: 0, display: 'block', mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 2 }}>
                Key Concepts
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {insights.keyPoints.map((point, index) => (
                  <Typography 
                    key={index}
                    component="li" 
                    variant="body2" 
                    sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}
                  >
                    {point}
                  </Typography>
                ))}
              </Box>
            </ListItem>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          </>
        )}

        {/* Improvements */}
        {insights.suggestions && insights.suggestions.length > 0 && (
          <>
            <ListItem sx={{ px: 0, display: 'block', mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightbulbIcon sx={{ color: '#00F5FF', fontSize: 16 }} />
                Suggestions
              </Typography>
              <Stack spacing={1.5}>
                {insights.suggestions.map((suggestion, index) => (
                  <Paper 
                    key={index}
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer', 
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: alpha('#00F5FF', 0.3),
                        transform: 'translateX(4px)'
                      } 
                    }}
                    onClick={() => onApplySuggestion?.(suggestion)}
                  >
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                      {suggestion}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </ListItem>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          </>
        )}

        {/* Content Analysis */}
        <ListItem sx={{ px: 0, display: 'block', mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BarChartIcon sx={{ color: '#00F5FF', fontSize: 16 }} />
            Analysis
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>Sentiment</Typography>
              <Chip 
                label={insights.sentiment || 'neutral'}
                size="small"
                sx={{ 
                  bgcolor: alpha(getSentimentColor(insights.sentiment || 'neutral'), 0.1),
                  color: getSentimentColor(insights.sentiment || 'neutral'),
                  border: '1px solid',
                  borderColor: alpha(getSentimentColor(insights.sentiment || 'neutral'), 0.2),
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>Clarity Score</Typography>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 800 }}>
                {Math.round(clarity)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={clarity} 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: clarity > 70 ? '#00FF00' : clarity > 40 ? '#00F5FF' : '#FF4D4D',
                  boxShadow: `0 0 10px ${clarity > 70 ? '#00FF00' : clarity > 40 ? '#00F5FF' : '#FF4D4D'}`
                }
              }}
            />
          </Box>

          {note && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>Edit Count</Typography>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 800 }}>{analytics.edit_count}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>Share Count</Typography>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 800 }}>{analytics.share_count}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>Last Accessed</Typography>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 800 }}>{new Date(analytics.last_accessed).toLocaleDateString()}</Typography>
              </Box>
            </Stack>
          )}
        </ListItem>

        {/* Summary */}
        {insights.summary && (
          <>
            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
            <ListItem sx={{ px: 0, display: 'block' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AutoAwesomeIcon sx={{ color: '#00F5FF', fontSize: 16 }} />
                AI Summary
              </Typography>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  bgcolor: alpha('#00F5FF', 0.03), 
                  border: '1px solid',
                  borderColor: alpha('#00F5FF', 0.1),
                  borderRadius: '16px'
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  &ldquo;{insights.summary}&rdquo;
                </Typography>
              </Paper>
            </ListItem>
          </>
        )}
      </List>
    </MotionPaper>
  );
}
