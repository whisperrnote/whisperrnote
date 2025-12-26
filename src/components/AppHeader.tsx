"use client";

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
  Paper
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AppsIcon from '@mui/icons-material/Apps';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface AppHeaderProps {
  className?: string;
}

export default function AppHeader({ className = '' }: AppHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { openOverlay, closeOverlay } = useOverlay();
  const [aiLoading, setAiLoading] = useState(false);
  const [anchorElAccount, setAnchorElAccount] = useState<null | HTMLElement>(null);
  const [anchorElApps, setAnchorElApps] = useState<null | HTMLElement>(null);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(null);
  const [smallProfileUrl, setSmallProfileUrl] = useState<string | null>(null);
  const profilePicId = getUserProfilePicId(user);

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
    const cached = getCachedProfilePreview(profilePicId);
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

  const handleAIGenerateClick = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const { ensureAI } = await import('@/lib/ai/lazy');
      const ai = await ensureAI();
      const openGenerateModal = ai.getOpenGenerateModal({ openOverlay, closeOverlay });
      await openGenerateModal({
        onGenerated: () => {
          // Additional handling if needed
        }
      });
    } catch (e) {
      console.error('Failed to load AI', e);
    } finally {
      setAiLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const handleAppClick = (subdomain: string | undefined) => {
    if (!subdomain) return;
    if (typeof window === 'undefined') return;
    if (currentSubdomain === subdomain) return;
    window.location.href = getEcosystemUrl(subdomain);
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        zIndex: 1201,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <Toolbar sx={{ gap: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            bgcolor: 'background.paper', 
            border: '1px solid', 
            borderColor: 'divider', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src="/logo/whisperrnote.png" alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontWeight: 900, 
              letterSpacing: '-0.05em',
              fontFamily: 'Space Grotesk, sans-serif'
            }}
          >
            WHISPERR<Box component="span" sx={{ color: 'primary.main' }}>NOTE</Box>
          </Typography>
        </Box>

        {/* Center: Search */}
        <Box sx={{ flexGrow: 1, maxWidth: 700 }}>
          <TopBarSearch />
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Tooltip title="AI Generate">
            <IconButton 
              onClick={handleAIGenerateClick}
              disabled={aiLoading}
              sx={{ 
                display: { xs: 'none', md: 'flex' },
                bgcolor: 'primary.main',
                color: 'background.default',
                '&:hover': { bgcolor: 'primary.dark' },
                borderRadius: '10px',
                width: 40,
                height: 40
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <IconButton 
            onClick={(e) => setAnchorElApps(e.currentTarget)}
            sx={{ 
              color: 'text.primary',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              width: 40,
              height: 40
            }}
          >
            <AppsIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <IconButton 
            onClick={(e) => setAnchorElAccount(e.currentTarget)}
            sx={{ p: 0.5 }}
          >
            <Avatar 
              src={smallProfileUrl || undefined}
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'background.default',
                border: '2px solid',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
          </IconButton>
        </Box>

        {/* Apps Menu */}
        <Menu
          anchorEl={anchorElApps}
          open={Boolean(anchorElApps)}
          onClose={() => setAnchorElApps(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              width: 280,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '16px',
              p: 2,
              backdropFilter: 'blur(20px)',
              backgroundColor: 'rgba(10, 10, 10, 0.8)',
            }
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
            Ecosystem Apps
          </Typography>
          <Grid container spacing={1}>
            {ECOSYSTEM_APPS.map((app) => {
              const isActive = currentSubdomain === app.subdomain;
              return (
                <Grid item xs={4} key={app.id}>
                  <Paper
                    component="button"
                    onClick={() => handleAppClick(app.subdomain)}
                    disabled={isActive}
                    elevation={0}
                    sx={{
                      width: '100%',
                      aspectRatio: '1/1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      bgcolor: isActive ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      border: '1px solid',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      borderRadius: '12px',
                      cursor: isActive ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': isActive ? {} : {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'divider'
                      }
                    }}
                  >
                    <img src="/logo/whisperrnote.png" alt={app.label} style={{ width: 24, height: 24, opacity: isActive ? 0.5 : 1 }} />
                    <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 700, color: isActive ? 'text.secondary' : 'text.primary' }}>
                      {app.label}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Menu>

        {/* Account Menu */}
        <Menu
          anchorEl={anchorElAccount}
          open={Boolean(anchorElAccount)}
          onClose={() => setAnchorElAccount(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              width: 240,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'rgba(10, 10, 10, 0.8)',
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Account Identity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5, opacity: 0.7 }}>
              {user?.email}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'divider' }} />
          <MenuItem 
            onClick={() => {
              window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN}.${process.env.NEXT_PUBLIC_DOMAIN}/settings?source=${encodeURIComponent(window.location.origin)}`;
              setAnchorElAccount(null);
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Vault Settings" primaryTypographyProps={{ variant: 'caption', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          </MenuItem>
          <MenuItem 
            onClick={() => {
              alert('Exporting your data to Markdown...');
              setAnchorElAccount(null);
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Export Data" primaryTypographyProps={{ variant: 'caption', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          </MenuItem>
          <Divider sx={{ borderColor: 'divider' }} />
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Mode</Typography>
            <ThemeToggle size="sm" />
          </Box>
          <Divider sx={{ borderColor: 'divider' }} />
          <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'caption', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}