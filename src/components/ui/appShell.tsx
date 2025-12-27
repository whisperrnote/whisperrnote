"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/appwrite";
import { useAuth } from "./AuthContext";
import Navigation from "../Navigation";
import QuickCreateFab from "./QuickCreateFab";
import { Box, CircularProgress, Typography } from "@mui/material";

const PUBLIC_ROUTES = [
  "/reset", "/verify", "/landing"
];

function isPublicRoute(path: string) {
  return PUBLIC_ROUTES.includes(path);
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openIDMWindow, idmWindowOpen } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);


  useEffect(() => {
    if (isPublicRoute(pathname)) {
      setAuthChecked(true);
      return;
    }
    getCurrentUser()
      .then(user => {
        if (!user) openIDMWindow();
        setAuthChecked(true);
      })
      .catch(() => {
        openIDMWindow();
        setAuthChecked(true);
      });
  }, [pathname, router]);

  const handleCreateNote = () => {
    router.push('/notes/new');
  };

  const handleCreateDoodle = () => {
    router.push('/notes/new?format=doodle');
  };

  const handleCreateVoiceNote = () => {
    console.log('Creating voice note...');
  };

  const handleCreatePhotoNote = () => {
    console.log('Creating photo note...');
  };

  const handleCreateLinkNote = () => {
    console.log('Creating link note...');
  };

  if (!authChecked) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" color="text.secondary">
          Loading WhisperNote...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          filter: idmWindowOpen ? 'blur(4px)' : 'none',
          transition: 'filter 0.2s ease',
        }}
      >
        <Navigation />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            // Desktop: account for sidebar width
            width: { xs: '100%', md: 'calc(100% - 280px)' },
            ml: { xs: 0, md: '280px' },
            // Mobile: account for top header and bottom nav
            pt: { xs: 0, md: 0 },
            pb: { xs: '100px', md: 2 }, // Space for mobile bottom nav
            minHeight: '100vh',
          }}
        >
          <Box
            sx={{
              flex: 1,
              p: { xs: 2, md: 3 },
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            {children}
          </Box>
        </Box>

        <QuickCreateFab
          onCreateNote={handleCreateNote}
          onCreateDoodle={handleCreateDoodle}
          onCreateVoiceNote={handleCreateVoiceNote}
          onCreatePhotoNote={handleCreatePhotoNote}
          onCreateLinkNote={handleCreateLinkNote}
        />
      </Box>

      {idmWindowOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 1400,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            px: 3,
          }}
        >
          <Box>
            <Typography variant="h6" color="common.white" sx={{ mb: 1 }}>
              IDM authentication window open
            </Typography>
            <Typography variant="body2" color="common.white">
              Please finish logging in from the IDM popup. You can close this overlay afterward.
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
