"use client";

import { useState, useEffect, useRef } from 'react';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, SparklesIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/ui/AuthContext';
// AI context removed for lazy loading
import { TopBarSearch } from '@/components/TopBarSearch';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useOverlay } from '@/components/ui/OverlayContext';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profilePreview';
import { getUserProfilePicId } from '@/lib/utils';
import { ECOSYSTEM_APPS, getEcosystemUrl, DEFAULT_ECOSYSTEM_LOGO } from '@/constants/ecosystem';

interface AppHeaderProps {
  className?: string;
}

export default function AppHeader({ className = '' }: AppHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { openOverlay, closeOverlay } = useOverlay();
  const appsMenuButtonRef = useRef<HTMLButtonElement>(null);
  const appsMenuRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
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
    setIsAccountMenuOpen(false);
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

  useEffect(() => {
    if (!isAppsMenuOpen) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!appsMenuRef.current?.contains(target) && !appsMenuButtonRef.current?.contains(target)) {
        setIsAppsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isAppsMenuOpen]);

  return (
    <header className={`fixed top-0 right-0 left-0 z-30 bg-background/80 backdrop-blur-md border-b-2 border-border/50 ${className}`}>
      <div className="flex items-center justify-between px-6 py-3 gap-6">
        {/* Left: Whisperrnote Logo - Always at the edge */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-card border-2 border-border flex items-center justify-center rounded-xl shadow-tangible overflow-hidden bg-void">
            <img
              src="/logo/whisperrnote.png"
              alt="Whisperrnote Logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <h1 className="hidden sm:block text-2xl font-black font-mono tracking-tighter text-foreground">
            WHISPERR<span className="text-accent">NOTE</span>
          </h1>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl">
          <TopBarSearch />
        </div>

        {/* Right: AI Generate Button (Desktop) + Account Menu */}
        <div className="relative flex items-center gap-3 shrink-0">
          {/* AI Generate Button - Desktop Only */}
          <div className="hidden md:block">
            <Button
              onClick={handleAIGenerateClick}
              disabled={aiLoading || aiGenerating}
              className={`gap-2 ${aiLoading ? 'opacity-60 cursor-wait' : ''}`}
              variant="default"
              title={aiLoading ? 'Loading AI...' : 'Generate with AI'}
            >
              <SparklesIcon className={`h-4 w-4 ${aiLoading || aiGenerating ? 'animate-pulse' : ''}`} />
              {aiLoading ? 'Loading...' : aiGenerating ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>

          {/* Apps Dropdown Button */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setIsAppsMenuOpen((prev) => !prev)}
              aria-expanded={isAppsMenuOpen}
              ref={appsMenuButtonRef}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Apps</span>
            </Button>
          </div>

          <button
            onClick={() => setIsAppsMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-card/80 transition-all duration-200"
          >
            <Squares2X2Icon className="h-4 w-4" />
            <span>Apps</span>
          </button>

          {isAppsMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsAppsMenuOpen(false)}
              />
              <div
                ref={appsMenuRef}
                className="absolute top-full right-0 mt-2 w-48 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-lg shadow-black/5 z-20"
              >
                <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground">
                  Apps
                </div>
                <div className="flex flex-wrap justify-center gap-3 px-3 py-2">
                  {ECOSYSTEM_APPS.map((app) => {
                    const isActive = currentSubdomain === app.subdomain;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleAppClick(app.subdomain)}
                        disabled={isActive}
                        className={`flex min-w-[60px] flex-col items-center gap-2 rounded-2xl px-1 py-2 text-[10px] font-semibold transition duration-150 shadow-sm shadow-black/20 ${isActive
                          ? 'cursor-default opacity-70'
                          : 'text-foreground hover:text-foreground hover:bg-yellow-50 dark:hover:bg-yellow-500/20 active:bg-yellow-100 dark:active:bg-yellow-400/20'
                          }`}
                      >
                        <img
                          src="/logo/whisperrnote.png"
                          alt="Whisperrnote logo"
                          className={`h-8 w-8 rounded-md object-cover shadow-lg shadow-yellow-500/30`}
                        />
                        <p className="text-[9px] font-semibold text-foreground">
                          {app.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Account Menu Button - Mobile Only */}
          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-card/80 transition-all duration-200"
          >
            {/* Render profile picture if available, otherwise fallback to initials */}
            {smallProfileUrl ? (
              <div className="relative">
                <img
                  src={smallProfileUrl}
                  alt={user?.name || user?.email || 'User Profile'}
                  className="h-5 w-5 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-life rounded-full border border-void shadow-sm" title="Verified Account" />
              </div>
            ) : (
              <div className="relative overflow-visible">
                <div className="h-5 w-5 rounded-full bg-accent/80 flex items-center justify-center text-white text-xs font-medium">
                  {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-life rounded-full border border-void shadow-sm" title="Verified Account" />
              </div>
            )}
            <span className="hidden sm:inline text-sm font-bold tracking-tight text-foreground">
              {user?.name || user?.email || 'User Profile'}
            </span>
          </button>

          {/* Account Dropdown Menu */}
          {isAccountMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsAccountMenuOpen(false)}
              />

              {/* Menu */}
              <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-tangible z-20 py-2 divide-y divide-border">
                <div className="px-4 py-2">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">Account Identity</p>
                  <p className="text-xs font-medium truncate opacity-70">{user?.email}</p>
                </div>

                <div className="py-1">
                  <a
                    href={`https://${process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN}.${process.env.NEXT_PUBLIC_DOMAIN}/settings?source=${encodeURIComponent(window.location.origin)}`}
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-void transition-colors duration-200"
                  >
                    <Cog6ToothIcon className="h-4 w-4 text-muted" />
                    <span className="text-xs font-bold uppercase tracking-wider">Vault Settings</span>
                  </a>

                  <button
                    onClick={() => {
                      alert('Exporting your data to Markdown...');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sun hover:bg-void transition-colors duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 rotate-180" />
                    <span className="text-xs font-bold uppercase tracking-wider">Export Data</span>
                  </button>
                </div>

                <div className="py-1">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Mode</span>
                    <ThemeToggle size="sm" />
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 transition-colors duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}