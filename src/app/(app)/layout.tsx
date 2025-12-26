"use client";

import React, { useEffect, Suspense, lazy } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/SidebarContext';
import { DynamicSidebarProvider, useDynamicSidebar, DynamicSidebar } from '@/components/ui/DynamicSidebar';
import { SIDEBAR_IGNORE_ATTR } from '@/constants/sidebar';
import { NotesProvider } from '@/contexts/NotesContext';

// Lazy load navigation components for faster initial render
const DesktopSidebar = lazy(() => import('@/components/Navigation').then(m => ({ default: m.DesktopSidebar })));
const MobileBottomNav = lazy(() => import('@/components/Navigation').then(m => ({ default: m.MobileBottomNav })));
const AppHeader = lazy(() => import('@/components/AppHeader'));

import { Box, Container } from '@mui/material';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { isOpen: isDynamicSidebarOpen, closeSidebar } = useDynamicSidebar();

  useEffect(() => {
    if (!isDynamicSidebarOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const targetElement = event.target as Element | null;
      if (!targetElement) return;
      if (targetElement.closest('[data-dynamic-sidebar]')) {
        return;
      }
      if (targetElement.closest(`[${SIDEBAR_IGNORE_ATTR}]`)) {
        return;
      }
      closeSidebar();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDynamicSidebarOpen, closeSidebar]);
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      {/* Header spans full width */}
      <Suspense fallback={<Box sx={{ h: 64, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }} />}>
        <AppHeader />
      </Suspense>
      
      {/* Main layout container */}
      <Box sx={{ pt: '64px' }}>
        {/* Sidebar - now fixed positioned */}
        <Suspense fallback={null}>
          <DesktopSidebar />
        </Suspense>
        
        {/* Main content area - offset to account for fixed sidebar and dynamic sidebar */}
        <Box
          component="main"
          sx={{
            minWidth: 0,
            pb: { xs: 12, md: 4 },
            transition: 'all 0.3s ease-in-out',
            ml: {
              md: isCollapsed ? '64px' : '256px'
            },
            mr: {
              md: isDynamicSidebarOpen ? { md: '28rem', lg: '32rem' } : 0
            }
          }}
        >
          {/* Content wrapper with proper padding */}
          <Box sx={{ px: { xs: 2, md: 3, lg: 4 }, py: 3 }}>
            {children}
          </Box>
        </Box>
      </Box>
      
      {/* Dynamic Sidebar */}
      <DynamicSidebar />
      
      {/* Mobile Bottom Navigation */}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </Box>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DynamicSidebarProvider>
        <NotesProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </NotesProvider>
      </DynamicSidebarProvider>
    </SidebarProvider>
  );
}