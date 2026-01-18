"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Query } from 'appwrite';
import { useAuth } from '@/components/ui/AuthContext';
import { createReaction, listReactions, deleteReaction } from '@/lib/appwrite';
import type { Reactions } from '@/types/appwrite';
import { TargetType } from '@/types/appwrite';

const DEFAULT_REACTIONS = ['❤️', '🔥', '👏', '😂', '👍', '😮'];

interface ReactionsProps {
  targetId: string;
  targetType?: TargetType;
  size?: 'small' | 'medium';
}

export default function NoteReactions({ targetId, targetType = TargetType.NOTE, size = 'medium' }: ReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reactions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReactions = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await listReactions([
        Query.equal('targetType', targetType),
        Query.equal('targetId', targetId),
        Query.orderAsc('createdAt'),
        Query.limit(500),
      ]);
      setReactions(res.documents as unknown as Reactions[]);
      setIsLoading(false);
      return;
    } catch (err) {
      console.error('Failed to fetch reactions via client SDK:', err);
    }

    // Only notes have shared API currently
    if (targetType === TargetType.NOTE) {
      try {
        const res = await fetch(`/api/shared/${targetId}/reactions`);
        if (!res.ok) throw new Error('Failed to fetch shared reactions');
        const payload = await res.json();
        setReactions((payload?.documents || []) as Reactions[]);
      } catch (fallbackErr) {
        console.error('Failed to fetch reactions via shared API:', fallbackErr);
        setError('Reactions are unavailable right now.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [targetId, targetType]);

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }, [reactions]);

  const userReactions = useMemo(() => {
    return new Set(reactions.filter(r => r.userId === user?.$id).map(r => r.emoji));
  }, [reactions, user?.$id]);

  const handleReact = async (emoji: string) => {
    if (!user?.$id) return;
    try {
      // Check if the user has ANY existing reaction on this target
      const existingReaction = reactions.find(r => r.userId === user.$id);
      
      if (existingReaction) {
        // Remove the existing reaction (either to toggle it off or replace it)
        await deleteReaction(existingReaction.$id);
        
        // If they clicked the SAME emoji, we stop here (standard toggle-off)
        if (existingReaction.emoji === emoji) {
          await fetchReactions();
          return;
        }
      }

      // If they clicked a new emoji (or had no reaction), add it
      await createReaction({
        targetType: targetType,
        targetId: targetId,
        emoji,
        userId: user.$id,
        createdAt: new Date().toISOString(),
      });
      
      await fetchReactions();
    } catch (err) {
      console.error('Failed to update reaction:', err);
      setError('Failed to update reaction.');
    }
  };

  return (
    <Box sx={{ mt: size === 'small' ? 1 : 2 }}>
      {size !== 'small' && (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Reactions
          </Typography>
          {isLoading && <Typography variant="caption" color="text.secondary">Loading…</Typography>}
        </Stack>
      )}

      <Stack direction="row" spacing={size === 'small' ? 0.5 : 1} sx={{ flexWrap: 'wrap' }}>
        {DEFAULT_REACTIONS.map((emoji) => {
          const isSelected = userReactions.has(emoji);
          const count = reactionCounts[emoji] || 0;
          
          if (size === 'small' && count === 0 && !user?.$id) return null;

          return (
            <Chip
              key={emoji}
              label={`${emoji} ${count}`}
              onClick={() => handleReact(emoji)}
              clickable={!!user?.$id}
              size={size}
              sx={{
                borderRadius: 3,
                bgcolor: isSelected ? 'primary.main' : 'rgba(255,255,255,0.06)',
                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                fontWeight: 600,
                color: isSelected ? 'primary.contrastText' : 'inherit',
                height: size === 'small' ? 24 : 32,
                fontSize: size === 'small' ? '0.75rem' : '0.875rem',
                '&:hover': {
                  bgcolor: isSelected ? 'primary.dark' : 'rgba(255,255,255,0.1)',
                }
              }}
            />
          );
        })}
      </Stack>

      {!user?.$id && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Sign in to react.
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}