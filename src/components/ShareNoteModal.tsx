'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  alpha,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { account, shareNoteWithUser, shareNoteWithUserId, getSharedUsers, removeNoteSharing, searchUsers, updateCollaborator } from '@/lib/appwrite';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profilePreview';

interface ShareNoteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

interface SharedUser {
  id: string;
  name?: string;
  email: string;
  permission: 'read' | 'write' | 'admin';
  collaborationId?: string;
  profilePicId?: string | null;
}

interface FoundUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  profilePicId?: string | null;
  username?: string;
}

export function ShareNoteModal({ isOpen, onOpenChange, noteId, noteTitle }: ShareNoteModalProps) {
  const [query, setQuery] = useState('');
  const [permission, setPermission] = useState<'read' | 'write' | 'admin'>('read');
  const [isLoading, setIsLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [results, setResults] = useState<FoundUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatingCollab, setUpdatingCollab] = useState<string | null>(null);

  // Preview maps (userId -> preview URL|null)
  const [resultPreviews, setResultPreviews] = useState<Record<string, string | null>>({});
  const [sharedPreviews, setSharedPreviews] = useState<Record<string, string | null>>({});

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const validEmail = useMemo(() => emailRegex.test(query.trim()), [query, emailRegex]);

  const fetchAndCachePreview = useCallback(async (fileId?: string | null) => {
    if (!fileId) return null;
    const cached = getCachedProfilePreview(fileId);
    if (cached !== undefined) return cached;
    try {
      const url = await fetchProfilePreview(fileId, 64, 64);
      return url;
    } catch (err) {
      return null;
    }
  }, []);

  const loadSharedUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const users = await getSharedUsers(noteId);
      setSharedUsers(users as SharedUser[]);

      for (const u of users as SharedUser[]) {
        const fileId = u?.profilePicId ?? null;
        if (!fileId) continue;
        try {
          const url = await fetchAndCachePreview(fileId);
          setSharedPreviews(prev => (prev[u.id] === url ? prev : { ...prev, [u.id]: url }));
        } catch {
          // ignore preview errors
        }
      }
    } catch (err) {
      console.error('Failed to load shared users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [noteId, fetchAndCachePreview]);

  useEffect(() => {
    if (isOpen) {
      loadSharedUsers();
      (async () => {
        try {
          const u: any = await account.get();
          setCurrentUserId(u?.$id ?? null);
        } catch {
          setCurrentUserId(null);
        }
      })();
    } else {
      setResults([]);
      setSelectedUser(null);
      setQuery('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, loadSharedUsers]);

  const debouncedSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2 || selectedUser) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { searchGlobalUsers } = await import('@/lib/ecosystem/identity');
      const docs = await searchGlobalUsers(query);

      const filtered = docs
        .filter(u => {
          if (currentUserId && u.id === currentUserId) return false;
          if (sharedUsers.some(s => s.id === u.id)) return false;
          return true;
        })
        .map(u => ({
          id: u.id,
          name: u.title,
          email: u.subtitle.startsWith('@') ? undefined : u.subtitle,
          username: u.subtitle.replace(/^@/, ''),
          avatar: u.avatar,
          profilePicId: u.profilePicId
        }));

      setResults(filtered as FoundUser[]);
    } catch (err) {
      console.error('Global search failed in share modal:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedUser, currentUserId, sharedUsers]);

  useEffect(() => {
    const t = setTimeout(() => {
      debouncedSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [query, debouncedSearch]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      for (const user of results) {
        const fileId = user.profilePicId || user.avatar || null;
        if (!fileId) continue;
        if (resultPreviews[user.id] !== undefined) continue;
        try {
          const url = await fetchAndCachePreview(fileId);
          if (!mounted) return;
          setResultPreviews(prev => ({ ...prev, [user.id]: url }));
        } catch {
          // ignore
        }
      }
    };
    if (results.length) load();
    return () => { mounted = false; };
  }, [results, fetchAndCachePreview, resultPreviews]);

  const resetMessages = () => {
    setErrorMsg(null); setSuccessMsg(null);
  };

  const handleShare = async () => {
    resetMessages();
    if (!selectedUser && !validEmail) {
      setErrorMsg('Select a user or enter a valid email');
      return;
    }

    if (selectedUser && sharedUsers.some(u => u.id === selectedUser.id)) {
      setErrorMsg('Already shared with this user');
      return;
    }
    if (!selectedUser && validEmail && sharedUsers.some(u => u.email.toLowerCase() === query.trim().toLowerCase())) {
      setErrorMsg('Already shared with this email');
      return;
    }

    let optimistic: SharedUser | null = null;
    try {
      setIsLoading(true);
      if (selectedUser) {
        optimistic = {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email || selectedUser.name,
          permission,
          collaborationId: 'pending'
        } as SharedUser;
      } else if (validEmail) {
        optimistic = {
          id: 'pending-' + Date.now(),
          email: query.trim(),
          permission,
          collaborationId: 'pending'
        } as SharedUser;
      }

      if (optimistic) {
        setSharedUsers(prev => [...prev, optimistic!]);
      }

      let response;
      if (selectedUser) {
        response = await shareNoteWithUserId(noteId, selectedUser.id, permission, selectedUser.email || undefined);
      } else {
        response = await shareNoteWithUser(noteId, query.trim(), permission);
      }

      setSuccessMsg(response.message || 'Shared successfully');
      setQuery('');
      setSelectedUser(null);
      setResults([]);
      await loadSharedUsers();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
      setErrorMsg(msg || 'Failed to share note');
      if (optimistic) {
        setSharedUsers(prev => prev.filter(u => u !== optimistic));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (collab: SharedUser, newPerm: 'read' | 'write' | 'admin') => {
    if (collab.permission === newPerm || !collab.collaborationId) return;
    const prevPerm = collab.permission;
    setUpdatingCollab(collab.collaborationId);
    setSharedUsers(prev => prev.map(u => u.id === collab.id ? { ...u, permission: newPerm } : u));
    try {
      await updateCollaborator(collab.collaborationId, { permission: newPerm as any });
      setSuccessMsg('Permission updated');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
      setErrorMsg(msg || 'Failed updating permission');
      setSharedUsers(prev => prev.map(u => u.id === collab.id ? { ...u, permission: prevPerm } : u));
    } finally {
      setUpdatingCollab(null);
    }
  };

  const handleRemoveSharing = async (sharedUserId: string, userEmail: string) => {
    resetMessages();
    const previous = sharedUsers;
    setSharedUsers(prev => prev.filter(u => u.id !== sharedUserId));
    try {
      await removeNoteSharing(noteId, sharedUserId);
      setSuccessMsg(`Removed sharing with ${userEmail}`);
    } catch (err: unknown) {
      console.error('Failed to remove sharing:', err);
      setSharedUsers(previous);
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
      setErrorMsg(msg || 'Failed to remove sharing');
    }
  };

  const shareDisabled = isLoading || (!selectedUser && !validEmail);

  return (
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          backgroundImage: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
            Share Note
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {noteTitle}
          </Typography>
        </Box>
        <IconButton onClick={() => onOpenChange(false)} sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {(errorMsg || successMsg) && (
          <Alert
            severity={errorMsg ? 'error' : 'success'}
            sx={{
              mb: 3,
              borderRadius: '12px',
              bgcolor: errorMsg ? alpha('#FF4D4D', 0.1) : alpha('#00FF00', 0.1),
              color: errorMsg ? '#FF4D4D' : '#00FF00',
              border: '1px solid',
              borderColor: errorMsg ? alpha('#FF4D4D', 0.2) : alpha('#00FF00', 0.2),
              '& .MuiAlert-icon': { color: 'inherit' }
            }}
          >
            {errorMsg || successMsg}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.5 }}>
            Invite Collaborators
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField
                fullWidth
                placeholder="Name or email address"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedUser(null); resetMessages(); }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.3)', display: 'flex' }}>
                        <SearchIcon fontSize="small" />
                      </Box>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#00F5FF' }
                  },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />

              {query && results.length > 0 && !selectedUser && (
                <Paper
                  elevation={0}
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    mt: 1,
                    bgcolor: 'rgba(20, 20, 20, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <List disablePadding>
                    {results.map(user => (
                      <ListItem
                        key={user.id}
                        component="button"
                        onClick={() => { setSelectedUser(user); setQuery(user.name || user.email || ''); resetMessages(); }}
                        sx={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          bgcolor: 'transparent',
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                          p: 1.5
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={resultPreviews[user.id] || undefined}
                            sx={{ width: 32, height: 32, bgcolor: '#00F5FF', color: '#000', fontWeight: 800, fontSize: '0.75rem' }}
                          >
                            {(user.name || user.email || '?').charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.name}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 700, color: 'white' }}
                          secondary={user.username ? `@${user.username}` : user.email}
                          secondaryTypographyProps={{ variant: 'caption', color: 'rgba(255, 255, 255, 0.4)' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>

            <FormControl sx={{ minWidth: 140 }}>
              <Select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'read' | 'write' | 'admin')}
                sx={{
                  borderRadius: '12px',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00F5FF' }
                }}
              >
                <MenuItem value="read">Read Only</MenuItem>
                <MenuItem value="write">Read & Write</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleShare}
              disabled={shareDisabled}
              sx={{
                borderRadius: '12px',
                bgcolor: '#00F5FF',
                color: '#000',
                fontWeight: 800,
                px: 3,
                '&:hover': { bgcolor: '#00D1DA' },
                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.2)' }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Share'}
            </Button>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 2 }}>
            Collaborators
          </Typography>

          {isLoadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ color: '#00F5FF' }} />
            </Box>
          ) : sharedUsers.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 600 }}>
                No collaborators yet
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {sharedUsers.map((user) => (
                <ListItem
                  key={user.id + (user.collaborationId || '')}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    mb: 1.5,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    p: 1.5
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={sharedPreviews[user.id] || undefined}
                      sx={{ width: 40, height: 40, bgcolor: alpha('#00F5FF', 0.1), color: '#00F5FF', fontWeight: 800 }}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name || user.email}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 800, color: 'white' }}
                    secondary={user.name ? user.email : null}
                    secondaryTypographyProps={{ variant: 'caption', color: 'rgba(255, 255, 255, 0.4)' }}
                  />
                  <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Select
                      size="small"
                      value={user.permission}
                      onChange={(e) => handleUpdatePermission(user, e.target.value as 'read' | 'write' | 'admin')}
                      disabled={updatingCollab === user.collaborationId || user.collaborationId === 'pending'}
                      sx={{
                        height: 32,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#00F5FF',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        bgcolor: alpha('#00F5FF', 0.05),
                        borderRadius: '8px'
                      }}
                    >
                      <MenuItem value="read">Read</MenuItem>
                      <MenuItem value="write">Write</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>

                    {updatingCollab === user.collaborationId ? (
                      <CircularProgress size={16} sx={{ color: '#00F5FF' }} />
                    ) : (
                      <Tooltip title="Remove access">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveSharing(user.id, user.email)}
                          disabled={user.collaborationId === 'pending'}
                          sx={{ color: 'rgba(255, 255, 255, 0.3)', '&:hover': { color: '#FF4D4D' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={() => onOpenChange(false)}
          sx={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontWeight: 800,
            '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.05)' }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

