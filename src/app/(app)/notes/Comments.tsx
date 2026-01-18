"use client";

import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Divider, IconButton, Collapse, Avatar, Link } from '@mui/material';
import { Reply as ReplyIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { listComments, createComment, getUsersByIds } from '@/lib/appwrite';
import type { Comments, Users } from '@/types/appwrite';
import { getEffectiveDisplayName, getEffectiveUsername } from '@/lib/utils';

interface CommentsProps {
  noteId: string;
}

interface CommentWithChildren extends Comments {
  children: CommentWithChildren[];
}

function buildCommentTree(flatComments: Comments[]): CommentWithChildren[] {
  const commentMap: { [key: string]: CommentWithChildren } = {};
  const rootComments: CommentWithChildren[] = [];

  flatComments.forEach(comment => {
    commentMap[comment.$id] = { ...comment, children: [] };
  });

  flatComments.forEach(comment => {
    if (comment.parentCommentId && commentMap[comment.parentCommentId]) {
      commentMap[comment.parentCommentId].children.push(commentMap[comment.$id]);
    } else {
      rootComments.push(commentMap[comment.$id]);
    }
  });

  return rootComments;
}

interface CommentItemProps {
  comment: CommentWithChildren;
  onReply: (parentId: string, content: string) => Promise<void>;
  depth?: number;
  userMap: Record<string, Users>;
}

function CommentItem({ comment, onReply, depth = 0, userMap }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showChildren, setShowChildren] = useState(true);

  const commentUser = userMap[comment.userId];
  
  // Efficient identity fallback using canonized helpers
  const displayName = getEffectiveDisplayName(commentUser);
  const username = getEffectiveUsername(commentUser);
  const profileLink = username ? `https://connect.whisperrnote.space/u/${username}` : '#';

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    await onReply(comment.$id, replyContent);
    setReplyContent('');
    setIsReplying(false);
    setShowChildren(true);
  };

  return (
    <Box sx={{ ml: depth * 3, mt: 1, borderLeft: depth > 0 ? '1px solid #ddd' : 'none', pl: depth > 0 ? 2 : 0 }}>
      <ListItem
        alignItems="flex-start"
        secondaryAction={
          <Box>
            <IconButton size="small" onClick={() => setIsReplying(!isReplying)}>
              <ReplyIcon fontSize="small" />
            </IconButton>
            {comment.children.length > 0 && (
              <IconButton size="small" onClick={() => setShowChildren(!showChildren)}>
                {showChildren ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            )}
          </Box>
        }
      >
        <Avatar 
          src={commentUser?.avatarUrl || undefined}
          sx={{ width: 32, height: 32, mr: 2, mt: 0.5, bgcolor: 'primary.main', fontSize: 14 }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <ListItemText
          primary={comment.content}
          secondary={
            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                by <Link 
                  href={profileLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    fontWeight: 600, 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {username ? `@${username}` : displayName}
                </Link> • {new Date(comment.$createdAt).toLocaleString()}
              </Typography>
            </Box>
          }
        />
      </ListItem>

      {isReplying && (
        <Box sx={{ ml: 7, mr: 2, mb: 2 }}>
          <TextField
            fullWidth
            multiline
            size="small"
            rows={2}
            placeholder={`Reply to ${displayName}...`}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            autoFocus
          />
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button size="small" variant="contained" onClick={handleReplySubmit} disabled={!replyContent.trim()}>Reply</Button>
            <Button size="small" onClick={() => setIsReplying(false)}>Cancel</Button>
          </Box>
        </Box>
      )}

      <Collapse in={showChildren}>
        <Box>
          {comment.children.map((child) => (
            <CommentItem key={child.$id} comment={child} onReply={onReply} depth={depth + 1} userMap={userMap} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function CommentsSection({ noteId }: CommentsProps) {
  const [comments, setComments] = useState<Comments[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userMap, setUserMap] = useState<Record<string, Users>>({});
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const fetchComments = async () => {
    setCommentsError(null);
    try {
      const res = await listComments(noteId);
      const docs = res.documents as unknown as Comments[];
      
      // Sort by date ascending
      const sorted = docs.sort(
        (a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
      );
      setComments(sorted);

      // Fetch user profiles for all unique userIds
      const uniqueUserIds = Array.from(new Set(docs.map(c => c.userId)));
      if (uniqueUserIds.length > 0) {
        const users = await getUsersByIds(uniqueUserIds);
        const map: Record<string, Users> = {};
        users.forEach(u => {
          if (u.$id) map[u.$id] = u;
        });
        setUserMap(map);
      }
      return;
    } catch (error) {
      console.error('Failed to fetch comments via client SDK:', error);
    }

    // Fallback for shared notes where public permissions may block client SDK
    try {
      const res = await fetch(`/api/shared/${noteId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch shared comments');
      const payload = await res.json();
      const docs = (payload?.documents || []) as Comments[];
      const sorted = docs.sort(
        (a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
      );
      setComments(sorted);

      const uniqueUserIds = Array.from(new Set(docs.map(c => c.userId)));
      if (uniqueUserIds.length > 0) {
        const users = await getUsersByIds(uniqueUserIds);
        const map: Record<string, Users> = {};
        users.forEach(u => {
          if (u.$id) map[u.$id] = u;
        });
        setUserMap(map);
      }
    } catch (fallbackError) {
      console.error('Failed to fetch comments via shared API:', fallbackError);
      setCommentsError('Comments are unavailable right now.');
    }
  };

  useEffect(() => {
    fetchComments();
  }, [noteId]);

  const handleAddComment = async (parentId: string | null = null, content: string = newComment) => {
    const text = parentId ? content : newComment;
    if (!text.trim()) return;
    
    try {
      const comment = await createComment(noteId, text, parentId);
      const newCommentDoc = comment as unknown as Comments;
      setComments(prev => [...prev, newCommentDoc]);
      
      // If the user who commented isn't in userMap, we might want to refresh or add them
      // For now, we refresh to be safe or just wait for the user to be there
      if (!userMap[newCommentDoc.userId]) {
        fetchComments();
      }
      
      if (!parentId) setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Comments ({comments.length})</Typography>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Add a top-level comment"
          placeholder="Share your thoughts..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          onClick={() => handleAddComment(null)}
          disabled={!newComment.trim()}
        >
          Post Comment
        </Button>
      </Box>
      <Divider />
      {commentsError && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {commentsError}
        </Typography>
      )}
      <List>
        {commentTree.map((comment) => (
          <div key={comment.$id}>
            <CommentItem 
              comment={comment} 
              onReply={(parentId, content) => handleAddComment(parentId, content)} 
              userMap={userMap}
            />
            <Divider variant="fullWidth" sx={{ my: 1 }} />
          </div>
        ))}
      </List>
    </Box>
  );
}
