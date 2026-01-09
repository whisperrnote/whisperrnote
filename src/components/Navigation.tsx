"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/ui/AuthContext';
import { useSidebar } from '@/components/ui/SidebarContext';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profilePreview';
import { getUserProfilePicId } from '@/lib/utils';

import { 
  Box, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  IconButton, 
  Avatar, 
  Paper,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Home as HomeIcon,
  Share as ShareIcon,
  LocalOffer as TagIcon,
  Settings as SettingsIcon,
  Extension as ExtensionIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

interface NavigationProps {
}


export const MobileBottomNav: React.FC<NavigationProps> = () => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  const navLinks = [
    { icon: HomeIcon, href: '/notes', label: 'Notes' },
    { icon: ShareIcon, href: '/shared', label: 'Links' },
    { icon: TagIcon, href: '/tags', label: 'Tags' },
    { icon: ExtensionIcon, href: '/extensions', label: 'Caps' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 1300,
        display: { xs: 'block', md: 'none' }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          px: 2,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backgroundImage: 'none'
        }}
      >
        {navLinks.map(({ icon: Icon, href }) => (
          <IconButton
            key={href}
            component={Link}
            href={href}
            sx={{
              color: isActive(href) ? '#000' : 'rgba(255, 255, 255, 0.6)',
              bgcolor: isActive(href) ? '#00F5FF' : 'transparent',
              borderRadius: '16px',
              p: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: isActive(href) ? '#00D1DA' : 'rgba(255, 255, 255, 0.05)',
                transform: 'translateY(-2px)'
              },
              ...(isActive(href) && {
                boxShadow: '0 0 15px rgba(0, 245, 255, 0.4)',
                transform: 'translateY(-4px)'
              })
            }}
          >
            <Icon sx={{ fontSize: 26 }} />
          </IconButton>
        ))}
      </Paper>
    </Box>
  );
};

export const DesktopSidebar: React.FC<NavigationProps> = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [smallProfileUrl, setSmallProfileUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const profilePicId = getUserProfilePicId(user);
    const cached = getCachedProfilePreview(profilePicId || undefined);
    if (cached !== undefined && mounted) {
      setSmallProfileUrl(cached ?? null);
    }

    const fetchPreview = async () => {
      try {
        if (profilePicId) {
          const url = await fetchProfilePreview(profilePicId, 64, 64);
          if (mounted) setSmallProfileUrl(url as unknown as string);
        } else if (mounted) setSmallProfileUrl(null);
      } catch (err) {
        if (mounted) setSmallProfileUrl(null);
      }
    };

    fetchPreview();
    return () => { mounted = false; };
  }, [user]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  const navItems = [
    { icon: HomeIcon, label: 'Notes', path: '/notes' },
    { icon: ShareIcon, label: 'Shared Links', path: '/shared' },
    { icon: TagIcon, label: 'Tags', path: '/tags' },
    { icon: ExtensionIcon, label: 'Extensions', path: '/extensions' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <Box
      component="aside"
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        bgcolor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(25px) saturate(180%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isCollapsed ? '80px' : '280px',
        zIndex: 1200,
        pt: '80px' // Offset for AppHeader
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between',
        p: 3,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {!isCollapsed && (
          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
            Navigation
          </Typography>
        )}
        <IconButton 
          size="small" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.4)',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: 'white' }
          }}
        >
          {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>

      <List sx={{ flex: 1, px: 2, py: 3, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Tooltip key={item.path} title={isCollapsed ? item.label : ''} placement="right">
              <ListItemButton
                component={Link}
                href={item.path}
                sx={{
                  borderRadius: '16px',
                  mb: 1.5,
                  px: isCollapsed ? 2 : 2.5,
                  py: 1.75,
                  transition: 'all 0.2s ease',
                  bgcolor: active ? alpha('#00F5FF', 0.1) : 'transparent',
                  color: active ? '#00F5FF' : 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid',
                  borderColor: active ? alpha('#00F5FF', 0.2) : 'transparent',
                  '&:hover': {
                    bgcolor: active ? alpha('#00F5FF', 0.15) : 'rgba(255, 255, 255, 0.05)',
                    transform: 'translateX(4px)',
                    color: active ? '#00F5FF' : 'white'
                  },
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: isCollapsed ? 0 : 40, 
                  color: 'inherit',
                  justifyContent: 'center'
                }}>
                  <Icon sx={{ fontSize: 22 }} />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      variant: 'body2', 
                      fontWeight: 800,
                      letterSpacing: '-0.01em'
                    }} 
                  />
                )}
                {active && !isCollapsed && (
                  <Box sx={{ width: 4, height: 20, bgcolor: '#00F5FF', borderRadius: '2px', ml: 'auto', boxShadow: '0 0 10px #00F5FF' }} />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {isAuthenticated && user && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            p: 2, 
            borderRadius: '16px', 
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            mb: 2,
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}>
            <Avatar 
              src={smallProfileUrl || undefined}
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: '#00F5FF',
                color: '#000',
                fontSize: '0.875rem',
                fontWeight: 800,
                borderRadius: '10px'
              }}
            >
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            {!isCollapsed && (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.email}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, bgcolor: '#00FF00', borderRadius: '50%', boxShadow: '0 0 8px #00FF00' }} />
                  <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        <ListItemButton
          onClick={() => logout()}
          sx={{
            borderRadius: '16px',
            px: isCollapsed ? 2 : 2.5,
            py: 1.5,
            color: 'rgba(255, 255, 255, 0.4)',
            '&:hover': {
              bgcolor: alpha('#FF4D4D', 0.05),
              color: '#FF4D4D'
            },
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, color: 'inherit', justifyContent: 'center' }}>
            <LogoutIcon sx={{ fontSize: 22 }} />
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ 
                variant: 'caption', 
                fontWeight: 800, 
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }} 
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );
};

export default function Navigation() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}
