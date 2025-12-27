"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/ui/AuthContext';
import { useSidebar } from '@/components/ui/SidebarContext';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ShareIcon from '@mui/icons-material/Share';
import TagIcon from '@mui/icons-material/LocalOffer';
import SettingsIcon from '@mui/icons-material/Settings';
import ExtensionIcon from '@mui/icons-material/Extension';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';

interface NavigationProps {
  className?: string;
}


export const MobileBottomNav: React.FC<NavigationProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  const navLinks = [
    { icon: HomeIcon, href: '/notes', label: 'Vault' },
    { icon: ShareIcon, href: '/shared', label: 'Links' },
    { icon: TagIcon, href: '/tags', label: 'Tags' },
    { icon: ExtensionIcon, href: '/extensions', label: 'Caps' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        display: { xs: 'block', md: 'none' }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          px: 2,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}
      >
        {navLinks.map(({ icon: Icon, href }) => (
          <IconButton
            key={href}
            component={Link}
            href={href}
            sx={{
              color: isActive(href) ? 'background.default' : 'text.primary',
              bgcolor: isActive(href) ? 'primary.main' : 'transparent',
              borderRadius: '12px',
              p: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: isActive(href) ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                transform: 'translateY(-2px)'
              },
              ...(isActive(href) && {
                boxShadow: '0 4px 12px rgba(0, 240, 255, 0.3)',
                transform: 'translateY(-4px)'
              })
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </IconButton>
        ))}
      </Paper>
    </Box>
  );
};

export const DesktopSidebar: React.FC<NavigationProps> = ({ className = '' }) => {
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
    { icon: HomeIcon, label: 'Private Vault', path: '/notes' },
    { icon: ShareIcon, label: 'Shared Links', path: '/shared' },
    { icon: TagIcon, label: 'Tags', path: '/tags' },
    { icon: ExtensionIcon, label: 'Extensions', path: '/extensions' },
    { icon: SettingsIcon, label: 'Vault Settings', path: '/settings' },
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
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isCollapsed ? '64px' : '256px',
        zIndex: 1200,
        pt: '64px' // Offset for AppHeader
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between',
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        {!isCollapsed && (
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.2em', color: 'text.secondary', textTransform: 'uppercase' }}>
            Navigation
          </Typography>
        )}
        <IconButton 
          size="small" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{ 
            color: 'text.primary',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
          }}
        >
          {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 2, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Tooltip key={item.path} title={isCollapsed ? item.label : ''} placement="right">
              <ListItemButton
                component={Link}
                href={item.path}
                sx={{
                  borderRadius: '12px',
                  mb: 1,
                  px: isCollapsed ? 1.5 : 2,
                  py: 1.5,
                  transition: 'all 0.2s',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? 'background.default' : 'text.primary',
                  '&:hover': {
                    bgcolor: active ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                    transform: 'translateX(4px)'
                  },
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: isCollapsed ? 0 : 40, 
                  color: 'inherit',
                  justifyContent: 'center'
                }}>
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      variant: 'body2', 
                      fontWeight: 700,
                      letterSpacing: '-0.01em'
                    }} 
                  />
                )}
                {active && !isCollapsed && (
                  <Box sx={{ width: 4, height: 20, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: '2px', ml: 'auto' }} />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          mb: 3,
          px: isCollapsed ? 0 : 1
        }}>
          {!isCollapsed && (
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary', textTransform: 'uppercase' }}>
              Mode
            </Typography>
          )}
          <ThemeToggle size="sm" />
        </Box>

        {isAuthenticated && user && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            p: 1.5, 
            borderRadius: '12px', 
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.05)',
            mb: 2,
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}>
            <Avatar 
              src={smallProfileUrl || undefined}
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main',
                color: 'background.default',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px'
              }}
            >
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            {!isCollapsed && (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', truncate: true }}>
                  {user.name || user.email}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, bgcolor: '#00FF00', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ fontSize: '8px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
            borderRadius: '12px',
            px: isCollapsed ? 1.5 : 2,
            py: 1.25,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'rgba(255, 0, 0, 0.05)',
              color: 'error.main'
            },
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, color: 'inherit', justifyContent: 'center' }}>
            <LogoutIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ 
                variant: 'caption', 
                fontWeight: 700, 
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

export default function Navigation({ className }: NavigationProps) {
  return (
    <>
      <DesktopSidebar className={className} />
      <MobileBottomNav className={className} />
    </>
  );
}
