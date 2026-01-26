"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  AppBar, 
  Toolbar, 
  Box, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Avatar, 
  Tooltip, 
  Divider,
  ListItemIcon,
  ListItemText,
  Grid,
  Paper,
  alpha
} from '@mui/material';
import {
  Settings,
  LogOut,
  LayoutGrid,
  Download,
  Sparkles,
  Bell,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/components/ui/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

import { useOverlay } from '@/components/ui/OverlayContext';
import { getUserProfilePicId } from '@/lib/utils';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profilePreview';
import { ECOSYSTEM_APPS, getEcosystemUrl } from '@/constants/ecosystem';
import { TopBarSearch } from '@/components/TopBarSearch';
import { AICommandModal } from '@/components/ai/AICommandModal';
import { EcosystemPortal } from '@/components/common/EcosystemPortal';

interface AppHeaderProps {
  className?: string;
}

export default function AppHeader({ className }: AppHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { openOverlay, closeOverlay } = useOverlay();
  const [anchorElAccount, setAnchorElAccount] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isEcosystemPortalOpen, setIsEcosystemPortalOpen] = useState(false);

  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(null);
  const [smallProfileUrl, setSmallProfileUrl] = useState<string | null>(null);
  const profilePicId = getUserProfilePicId(user);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setIsEcosystemPortalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname;
    const segments = host.split('.');
    if (segments.length <= 2) {
      setCurrentSubdomain('app');
      return;
    }
    setCurrentSubdomain(segments[0]);
  }, [isAuthenticated, user]);

  useEffect(() => {
    let mounted = true;
    const cached = getCachedProfilePreview(profilePicId || undefined);
    if (cached !== undefined) {
      setSmallProfileUrl(cached ?? null);
    }

    const fetchPreview = async () => {
      try {
        if (profilePicId) {
          const url = await fetchProfilePreview(profilePicId, 64, 64);
          if (mounted) setSmallProfileUrl(url as unknown as string);
        } else {
          if (mounted) setSmallProfileUrl(null);
        }
      } catch (err) {
        console.warn('Failed to load profile preview', err);
        if (mounted) setSmallProfileUrl(null);
      }
    };
    fetchPreview();
    return () => { mounted = false; };
  }, [profilePicId]);

  const handleLogout = () => {
    setAnchorElAccount(null);
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }


  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      className={className}
      sx={{ 
        zIndex: 1201,
        bgcolor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(25px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundImage: 'none'
      }}
    >
      <Toolbar sx={{ 
        gap: 2, 
        '@media (min-width: 900px)': { gap: 4 },
        px: { xs: 2, md: 3 }, 
        minHeight: '72px' 
      }}>
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <Box sx={{ 
            width: 42, 
            height: 42, 
            bgcolor: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <Image src="/logo/whisperrnote.png" alt="Logo" width={28} height={28} style={{ objectFit: 'contain' }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontWeight: 900, 
              letterSpacing: '-0.05em',
              fontFamily: 'var(--font-space-grotesk)',
              color: 'white'
            }}
          >
            WHISPERR<Box component="span" sx={{ color: '#00F5FF' }}>NOTE</Box>
          </Typography>
        </Box>

        {/* Center: Search */}
        <Box sx={{ flexGrow: 1, maxWidth: 700 }}>
          <TopBarSearch />
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Tooltip title="Notifications">
            <IconButton 
              onClick={(e) => setAnchorElNotifications(e.currentTarget)}
              sx={{ 
                color: unreadCount > 0 ? '#00F5FF' : 'rgba(255, 255, 255, 0.4)',
                bgcolor: alpha('#00F5FF', 0.03),
                border: '1px solid',
                borderColor: unreadCount > 0 ? alpha('#00F5FF', 0.3) : alpha('#00F5FF', 0.1),
                borderRadius: '12px',
                width: 42,
                height: 42,
                position: 'relative',
                '&:hover': { 
                  bgcolor: alpha('#00F5FF', 0.08), 
                  boxShadow: '0 0 15px rgba(0, 245, 255, 0.2)' 
                }
              }}
            >
              <Bell size={20} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <Box sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  bgcolor: '#FF4D4D',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0A0A0A',
                  boxShadow: '0 0 10px rgba(255, 77, 77, 0.4)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Box>
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Cognitive Link (AI)">
            <IconButton 
              onClick={() => setIsAIModalOpen(true)}
              sx={{ 
                color: '#00F5FF',
                bgcolor: alpha('#00F5FF', 0.03),
                border: '1px solid',
                borderColor: alpha('#00F5FF', 0.1),
                borderRadius: '12px',
                width: 42,
                height: 42,
                '&:hover': { 
                  bgcolor: alpha('#00F5FF', 0.08), 
                  boxShadow: '0 0 15px rgba(0, 245, 255, 0.2)' 
                }
              }}
            >
              <Sparkles size={20} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Whisperr Portal (Ctrl+Space)">
            <IconButton 
              onClick={() => setIsEcosystemPortalOpen(true)}
              sx={{ 
                color: '#00F5FF',
                bgcolor: alpha('#00F5FF', 0.05),
                border: '1px solid',
                borderColor: alpha('#00F5FF', 0.1),
                borderRadius: '12px',
                width: 42,
                height: 42,
                animation: 'pulse-slow 4s infinite ease-in-out',
                '@keyframes pulse-slow': {
                  '0%': { boxShadow: '0 0 0 0 rgba(0, 245, 255, 0.2)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(0, 245, 255, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(0, 245, 255, 0)' },
                },
                '&:hover': { 
                  bgcolor: alpha('#00F5FF', 0.1), 
                  borderColor: '#00F5FF',
                  boxShadow: '0 0 15px rgba(0, 245, 255, 0.3)' 
                }
              }}
            >
              <LayoutGrid size={22} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>

          <IconButton 
            onClick={(e) => setAnchorElAccount(e.currentTarget)}
            sx={{ 
              p: 0.5,
              '&:hover': { transform: 'scale(1.05)' },
              transition: 'transform 0.2s'
            }}
          >
            <Avatar 
              src={smallProfileUrl || undefined}
              sx={{ 
                width: 38, 
                height: 38, 
                bgcolor: '#00F5FF',
                fontSize: '0.875rem',
                fontWeight: 800,
                color: '#000',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px'
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
          </IconButton>
        </Box>

        {/* Account Menu */}
        <Menu
          anchorEl={anchorElAccount}
          open={Boolean(anchorElAccount)}
          onClose={() => setAnchorElAccount(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              width: 280,
              bgcolor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              backgroundImage: 'none',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }
          }}
        >
          <Box sx={{ px: 3, py: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Account Identity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', mt: 0.5, opacity: 0.9 }}>
              {user?.email}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          <Box sx={{ py: 1 }}>
            <MenuItem 
              onClick={() => {
                const domain = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.space';
                const idSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'id';
                window.location.href = `https://${idSubdomain}.${domain}/settings?source=${encodeURIComponent(window.location.origin)}`;
                setAnchorElAccount(null);
              }}
              sx={{ py: 1.5, px: 3, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}
            >
              <ListItemIcon><Settings size={18} strokeWidth={1.5} color="rgba(255, 255, 255, 0.4)" /></ListItemIcon>
              <ListItemText primary="Settings" primaryTypographyProps={{ variant: 'caption', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }} />
            </MenuItem>
            <MenuItem 
              onClick={() => {
                alert('Exporting your data to Markdown...');
                setAnchorElAccount(null);
              }}
              sx={{ py: 1.5, px: 3, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}
            >
              <ListItemIcon><Download size={18} strokeWidth={1.5} color="rgba(255, 255, 255, 0.4)" /></ListItemIcon>
              <ListItemText primary="Export Data" primaryTypographyProps={{ variant: 'caption', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }} />
            </MenuItem>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          <MenuItem onClick={handleLogout} sx={{ py: 2, px: 3, color: '#FF4D4D', '&:hover': { bgcolor: alpha('#FF4D4D', 0.05) } }}>
            <ListItemIcon><LogOut size={18} strokeWidth={1.5} color="#FF4D4D" /></ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'caption', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={anchorElNotifications}
          open={Boolean(anchorElNotifications)}
          onClose={() => setAnchorElNotifications(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              width: 360,
              bgcolor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              backgroundImage: 'none',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }
          }}
        >
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Intelligence Feed
            </Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="caption" 
                onClick={() => { markAllAsRead(); setAnchorElNotifications(null); }}
                sx={{ cursor: 'pointer', fontWeight: 800, color: '#00F5FF', '&:hover': { textDecoration: 'underline' } }}
              >
                MARK ALL READ
              </Typography>
            )}
          </Box>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Clock size={32} color="rgba(255, 255, 255, 0.1)" style={{ marginBottom: 12 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                  No recent activity detected
                </Typography>
              </Box>
            ) : (
              notifications.slice(0, 10).map((notif) => {
                const isRead = !!localStorage.getItem(`read_notif_${notif.$id}`);
                return (
                  <MenuItem 
                    key={notif.$id} 
                    onClick={() => { markAsRead(notif.$id); setAnchorElNotifications(null); }}
                    sx={{ 
                      py: 2, 
                      px: 3, 
                      gap: 2,
                      borderLeft: isRead ? 'none' : '3px solid #00F5FF',
                      bgcolor: isRead ? 'transparent' : alpha('#00F5FF', 0.03),
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } 
                    }}
                  >
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '12px', 
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {notif.action.toLowerCase().includes('delete') ? (
                        <XCircle size={20} color="#FF4D4D" />
                      ) : (
                        <CheckCircle size={20} color="#00F5FF" />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', display: 'block' }}>
                        {notif.action.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notif.targetType}: {notif.details || notif.targetId}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.65rem', fontWeight: 700 }}>
                        {new Date(notif.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })
            )}
          </Box>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
          <MenuItem sx={{ py: 2, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.05em' }}>
              VIEW ALL ACTIVITY
            </Typography>
          </MenuItem>
        </Menu>

        <AICommandModal 
          isOpen={isAIModalOpen} 
          onClose={() => setIsAIModalOpen(false)} 
        />

        <EcosystemPortal 
          open={isEcosystemPortalOpen} 
          onClose={() => setIsEcosystemPortalOpen(false)} 
        />
      </Toolbar>
    </AppBar>
  );
}
