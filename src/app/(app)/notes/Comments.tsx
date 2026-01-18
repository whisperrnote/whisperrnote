"use client";

import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Divider, IconButton, Collapse, Avatar, Link } from '@mui/material';
import { Reply as ReplyIcon, ExpandMore, ExpandLess, Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreIcon, Block as BlockIcon } from '@mui/icons-material';
import { listComments, createComment, getUsersByIds, updateComment, deleteComment } from '@/lib/appwrite';
import type { Comments, Users } from '@/types/appwrite';
import { getEffectiveDisplayName, getEffectiveUsername } from '@/lib/utils';
import { useAuth } from '@/components/ui/AuthContext';
import { Menu, MenuItem, ListItemIcon } from '@mui/material';
import NoteReactions from './NoteReactions';
import { TargetType } from '@/types/appwrite';

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
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  depth?: number;
  userMap: Record<string, Users>;
}

function CommentItem({ comment, onReply, onUpdate, onDelete, depth = 0, userMap }: CommentItemProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [showChildren, setShowChildren] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const commentUser = userMap[comment.userId];
  const isOwner = user?.$id === comment.userId;
  const isDeleted = comment.content === '[Deleted]';
  
  // Efficient identity fallback using canonized helpers
  const displayName = isDeleted ? 'Deleted' : getEffectiveDisplayName(commentUser);
  const username = isDeleted ? null : getEffectiveUsername(commentUser);
  const profileLink = username ? `https://connect.whisperrnote.space/u/${username}` : '#';

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    await onReply(comment.$id, replyContent);
    setReplyContent('');
    setIsReplying(false);
    setShowChildren(true);
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim()) return;
    await onUpdate(comment.$id, editContent);
    setIsEditing(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ 
      ml: depth * 3, 
      mt: 1, 
      borderLeft: depth > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none', 
      pl: depth > 0 ? 2 : 0,
    }}>
      <ListItem
        alignItems="flex-start"
        sx={{
          borderRadius: 2,
          ...(isDeleted && {
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            transition: 'all 0.2s ease',
            py: 0.5,
            my: 1
          })
        }}
        secondaryAction={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isDeleted && (
              <IconButton size="small" onClick={() => setIsReplying(!isReplying)}>
                <ReplyIcon fontSize="small" />
              </IconButton>
            )}
            
            {isOwner && !isDeleted && (
              <>
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => { setIsEditing(true); handleMenuClose(); }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    Edit
                  </MenuItem>
                  <MenuItem onClick={() => { onDelete(comment.$id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    Delete
                  </MenuItem>
                </Menu>
              </>
            )}

            {comment.children.length > 0 && (
              <IconButton size="small" onClick={() => setShowChildren(!showChildren)}>
                {showChildren ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            )}
          </Box>
        }
      >
        <Avatar 
          src={!isDeleted ? commentUser?.avatarUrl || undefined : undefined}
          sx={{ 
            width: 32, 
            height: 32, 
            mr: 2, 
            mt: 0.5, 
            bgcolor: isDeleted ? 'grey.500' : 'primary.main', 
            fontSize: 14,
            opacity: isDeleted ? 0.6 : 1
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <ListItemText
          primary={
            isEditing ? (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  size="small"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={handleEditSubmit}>Save</Button>
                  <Button size="small" onClick={() => setIsEditing(false)}>Cancel</Button>
                </Box>
              </Box>
            ) : isDeleted ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <BlockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ 
                  color: 'text.disabled', 
                  fontStyle: 'italic',
                  fontSize: '0.85rem',
                  letterSpacing: '0.01em'
                }}>
                  This comment was deleted by the author but replies remain.
                </Typography>
              </Box>
            ) : comment.content
          }
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
              {!isDeleted && (
                <NoteReactions targetId={comment.$id} targetType={TargetType.COMMENT} size="small" />
              )}
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
            <CommentItem 
              key={child.$id} 
              comment={child} 
              onReply={onReply} 
              onUpdate={onUpdate}
              onDelete={onDelete}
              depth={depth + 1} 
              userMap={userMap} 
            />
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

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, { content });
      setComments(prev => 
        prev.map(c => c.$id === commentId ? { ...c, content } as Comments : c)
      );
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const hasChildren = comments.some(c => c.parentCommentId === commentId);
      
      if (hasChildren) {
        // Soft delete: preservation of tree structure for Reddit-like behavior
        // We redact the content to [Deleted] instead of hard-deleting the document
        await updateComment(commentId, { content: '[Deleted]' });
        setComments(prev => 
          prev.map(c => c.$id === commentId ? { ...c, content: '[Deleted]' } as Comments : c)
        );
      } else {
        // Hard delete: No children, safe to remove completely
        await deleteComment(commentId);
        setComments(prev => prev.filter(c => c.$id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
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
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              userMap={userMap}
            />
            <Divider variant="fullWidth" sx={{ my: 1 }} />
          </div>
        ))}
      </List>
    </Box>
  );
}
