"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  ShareIcon,
  TagIcon,
  Cog6ToothIcon,
  PuzzlePieceIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PowerIcon,
} from '@heroicons/react/24/outline';
import { useOverlay } from '@/components/ui/OverlayContext';
import { useAuth } from '@/components/ui/AuthContext';
import { useSidebar } from '@/components/ui/SidebarContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profilePreview';
import { getUserProfilePicId } from '@/lib/utils';

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
    { icon: PuzzlePieceIcon, href: '/extensions', label: 'Caps' },
  ];

  return (
    <footer className={`fixed bottom-4 left-4 right-4 z-50 md:hidden ${className}`}>
      <nav className="bg-card/90 border-2 border-border rounded-2xl px-4 py-3 shadow-tangible backdrop-blur-md">
        <div className="flex justify-around items-center">
          {navLinks.map(({ icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl transition-all duration-300 ${isActive(href)
                ? 'text-void bg-accent shadow-tangible-sm transform -translate-y-1'
                : 'text-foreground hover:bg-void hover:transform hover:-translate-y-0.5'
                }`}
            >
              <Icon className="h-6 w-6" />
            </Link>
          ))}
        </div>
      </nav>
    </footer>
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
    { icon: PuzzlePieceIcon, label: 'Extensions', path: '/extensions' },
    { icon: Cog6ToothIcon, label: 'Vault Settings', path: '/settings' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-card border-r-2 border-border shadow-tangible transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'
        } ${className}`}
    >
      <div className="flex items-center justify-between p-4 border-b-2 border-border mb-2">
        {!isCollapsed && <span className="text-[10px] font-bold font-mono tracking-[0.2em] text-muted uppercase">Navigation</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl hover:bg-void text-foreground transition-all duration-200"
        >
          {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${active
                ? 'bg-accent text-void shadow-tangible-sm transform translate-x-1'
                : 'text-foreground hover:bg-void hover:transform hover:translate-x-1'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              {active && !isCollapsed && <div className="w-1 h-5 bg-void/20 rounded-full ml-auto"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-2 border-border space-y-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-2'}`}>
          {!isCollapsed && <span className="text-[10px] font-bold font-mono tracking-widest text-muted uppercase">Mode</span>}
          <ThemeToggle size="sm" />
        </div>

        {isAuthenticated && user && (
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-void/50 border border-border/50 ${isCollapsed ? 'justify-center' : ''}`}>
            {smallProfileUrl ? (
              <img src={smallProfileUrl} alt={user.name || user.email || 'User'} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-void font-bold text-xs shadow-sm">
                {user.name ? user.name[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate text-xs tracking-tight">
                  {user.name || user.email || 'User'}
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-life rounded-full" />
                  <p className="text-[9px] font-bold font-mono text-muted uppercase tracking-tighter">Active</p>
                </div>
              </div>
            )}
          </div>
        )}

        {isAuthenticated && (
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-foreground hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 text-xs font-bold uppercase tracking-wider ${isCollapsed ? 'justify-center px-0' : ''
              }`}
          >
            <PowerIcon className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </aside>
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
