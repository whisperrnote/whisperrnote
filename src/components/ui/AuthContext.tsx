'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/appwrite';
import { getUser, createUser } from '@/lib/appwrite/user-profile';

// Lazy load email verification reminder (loading screen removed for instant app feel)
const EmailVerificationReminder = lazy(() => import('./EmailVerificationReminder').then(m => ({ default: m.EmailVerificationReminder })));

interface User {
  $id: string;
  email: string | null;
  name: string | null;
  emailVerification?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  recoverSession: () => Promise<boolean>;
  shouldShowEmailVerificationReminder: () => boolean;
  dismissEmailVerificationReminder: () => void;
  openIDMWindow: () => void;
  closeIDMWindow: () => void;
  idmWindowOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [idmWindowOpen, setIDMWindowOpen] = useState(false);
  const [emailVerificationReminderDismissed, setEmailVerificationReminderDismissed] = useState(false);
  const idmWindowRef = useRef<Window | null>(null);
  const idmOriginRef = useRef<string | null>(null);
  const initAuthStarted = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async (isRetry = false, shouldSetLoading = true) => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        try {
          await getUser(currentUser.$id);
        } catch (e) {
          try {
            await createUser({
              id: currentUser.$id,
              email: currentUser.email,
              name: currentUser.name,
            });
          } catch (createError) {
            console.error('Failed to create user profile:', createError);
          }
        }
      }
      setUser(currentUser);
      if (shouldSetLoading) setIsLoading(false);
      return currentUser;
    } catch (error: any) {
      // If error is network related, don't clear user yet, just set offline flag if we had a user
      const isNetworkError = !error.response && error.message?.includes('Network Error') || error.message?.includes('Failed to fetch');

      if (!isNetworkError) {
        setUser(null);
      } else {
        console.warn('Network issue detected during auth refresh. Retaining last known state.');
      }

      console.error('Failed to get current user:', error);
      return null;
    } finally {
      if (shouldSetLoading) setIsLoading(false);
    }
  }, []);

  // Silent session discovery via iframe
  const attemptSilentAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Skip if already authenticated
    if (user) return;

    const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN;
    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    if (!authSubdomain || !domain) return;

    return new Promise<void>((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://${authSubdomain}.${domain}/silent-check`;
      iframe.style.display = 'none';

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 2000); // Shortened from 5000ms for responsiveness

      const handleIframeMessage = (event: MessageEvent) => {
        if (event.origin !== `https://${authSubdomain}.${domain}`) return;

        if (event.data?.type === 'idm:auth-status' && event.data.status === 'authenticated') {
          console.log('Silent auth discovered active session');
          refreshUser(false, false);
          cleanup();
          resolve();
        } else if (event.data?.type === 'idm:auth-status') {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', handleIframeMessage);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };

      window.addEventListener('message', handleIframeMessage);
      document.body.appendChild(iframe);
    });
  }, [user, refreshUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('emailVerificationReminderDismissed');
      if (dismissed === 'true') {
        setEmailVerificationReminderDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (initAuthStarted.current) return;
    initAuthStarted.current = true;

    const initAuth = async () => {
      setIsLoading(true);
      const localUser = await refreshUser(false, false);
      if (!localUser) {
        // Only attempt silent discovery if we definitely don't have a session locally
        await attemptSilentAuth();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser, attemptSilentAuth]);

  useEffect(() => {
    let lastRefreshTime = Date.now();
    const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // Increased to 5 mins

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRefreshTime >= MIN_REFRESH_INTERVAL && user && !isLoading) {
        lastRefreshTime = now;
        refreshUser();
      }
    };

    document.addEventListener('click', handleUserActivity, { once: false, passive: true });
    document.addEventListener('keydown', handleUserActivity, { once: false, passive: true });

    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
    };
  }, [user, isLoading, refreshUser]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN;
      const domain = process.env.NEXT_PUBLIC_DOMAIN;
      if (!authSubdomain || !domain) return;
      const expectedOrigin = `https://${authSubdomain}.${domain}`;

      if (event.origin !== expectedOrigin) {
        return;
      }
      if (event.data?.type !== 'idm:auth-success') {
        return;
      }

      refreshUser();
      setIDMWindowOpen(false);
      setIsAuthenticating(false);
      if (idmWindowRef.current && !idmWindowRef.current.closed) {
        idmWindowRef.current.close();
      }
      idmWindowRef.current = null;
      if (pathname === '/' || pathname === '/landing') {
        router.replace('/notes');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [refreshUser, router, pathname]);

  useEffect(() => {
    if (!idmWindowOpen) return;

    const interval = setInterval(() => {
      const child = idmWindowRef.current;
      if (child && child.closed) {
        clearInterval(interval);
        idmWindowRef.current = null;
        setIDMWindowOpen(false);
        setIsAuthenticating(false);
        refreshUser();
      }
    }, 700);

    return () => {
      clearInterval(interval);
    };
  }, [idmWindowOpen, refreshUser]);

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Delete the current session
      const { account } = await import('@/lib/appwrite');
      await account.deleteSession('current');

      // Clear any local storage related to authentication
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_cache');
        sessionStorage.removeItem('auth_temp_data');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear local user state regardless of logout success
      setUser(null);
      // Clear any temporary auth state
      setIDMWindowOpen(false);
    }
  }, []);

  // Session recovery function for when authentication state becomes inconsistent
  const recoverSession = useCallback(async () => {
    setIsLoading(true);

    try {
      // Try to refresh the user data
      await refreshUser();

      if (user) {
        return true;
      } else {
        setIDMWindowOpen(true);
        return false;
      }
    } catch (error) {
      console.error('Session recovery failed:', error);
      setIDMWindowOpen(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser, user]);

  // Email verification reminder logic
  const shouldShowEmailVerificationReminder = useCallback((): boolean => {
    if (!user || user.emailVerification || emailVerificationReminderDismissed) {
      return false;
    }

    // Check if account is older than 24 hours
    const accountAge = Date.now() - new Date(user.$createdAt).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    return accountAge > oneDay;
  }, [user, emailVerificationReminderDismissed]);

  const dismissEmailVerificationReminder = useCallback((): void => {
    setEmailVerificationReminderDismissed(true);
    // Store dismissal in localStorage to persist across sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('emailVerificationReminderDismissed', 'true');
    }
  }, []);

  // Opens IDM window for authentication
  const openIDMWindow = useCallback(() => {
    if (typeof window === 'undefined' || isAuthenticating) return;

    setIsAuthenticating(true);
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

    const launch = async () => {
      try {
        // First, check if we already have a session locally
        const currentUser = await getCurrentUser();

        if (currentUser) {
          console.log('Active session detected, skipping IDM window');
          setUser(currentUser);
          setIDMWindowOpen(false);
          setIsAuthenticating(false);
          if (idmWindowRef.current && !idmWindowRef.current.closed) {
            idmWindowRef.current.close();
            idmWindowRef.current = null;
          }
          if (pathname === '/' || pathname === '/landing') {
            router.replace('/notes');
          }
          return;
        }

        // If no local session, try one last silent check before opening window
        await attemptSilentAuth();
        const silentUser = await getCurrentUser();
        if (silentUser) {
          setUser(silentUser);
          setIsAuthenticating(false);
          if (pathname === '/' || pathname === '/landing') {
            router.replace('/notes');
          }
          return;
        }

        const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN;
        const domain = process.env.NEXT_PUBLIC_DOMAIN;

        if (!authSubdomain || !domain) {
          console.error('IDM configuration missing: AUTH_SUBDOMAIN or DOMAIN not set');
          setIsAuthenticating(false);
          router.replace('/landing');
          return;
        }

        const idmUrl = `https://${authSubdomain}.${domain}/login`;
        const idmUrlObj = new URL(idmUrl);
        const mobileTargetUrl = (() => {
          const mobileUrl = new URL(idmUrl);
          mobileUrl.searchParams.set('source', window.location.href);
          return mobileUrl.toString();
        })();
        const width = 400;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        idmOriginRef.current = idmUrlObj.origin;

        if (isMobileDevice) {
          window.location.assign(mobileTargetUrl);
          return;
        }

        if (idmWindowRef.current && !idmWindowRef.current.closed) {
          idmWindowRef.current.focus();
        } else {
          const windowRef = window.open(
            idmUrl,
            'WhisperrNoteIDM',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
          );

          if (!windowRef) {
            console.warn('Popup blocked, falling back to redirect in whisperrnote');
            window.location.assign(mobileTargetUrl);
            return;
          }

          idmWindowRef.current = windowRef;
        }

        setIDMWindowOpen(true);
      } catch (error) {
        console.error('Failed to initiate IDM flow:', error);
        setIsAuthenticating(false);
        router.replace('/landing');
      }
    };

    launch();
  }, [refreshUser, router, pathname, isAuthenticating, attemptSilentAuth]);

  const closeIDMWindow = useCallback(() => {
    if (idmWindowRef.current && !idmWindowRef.current.closed) {
      idmWindowRef.current.close();
    }
    idmWindowRef.current = null;
    setIDMWindowOpen(false);
    setIsAuthenticating(false);
    if (!user) {
      router.replace('/landing');
    }
  }, [router, user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticating,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    recoverSession,
    shouldShowEmailVerificationReminder,
    dismissEmailVerificationReminder,
    openIDMWindow,
    closeIDMWindow,
    idmWindowOpen,
  }), [
    user,
    isLoading,
    isAuthenticating,
    login,
    logout,
    refreshUser,
    recoverSession,
    shouldShowEmailVerificationReminder,
    dismissEmailVerificationReminder,
    openIDMWindow,
    closeIDMWindow,
    idmWindowOpen,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <EmailVerificationReminder />
      </Suspense>
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};