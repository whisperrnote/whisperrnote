'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrentUser } from '@/lib/appwrite';
import { InitialLoadingScreen } from './InitialLoadingScreen';
import { EmailVerificationReminder } from './EmailVerificationReminder';
import { getUser, createUser } from '@/lib/appwrite/user-profile';

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
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const [idmWindowOpen, setIDMWindowOpen] = useState(false);
  const [emailVerificationReminderDismissed, setEmailVerificationReminderDismissed] = useState(false);
  const [idmWindowRef, setIDMWindowRef] = useState<Window | null>(null);

  const refreshUser = async (isRetry = false) => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        try {
          await getUser(currentUser.$id);
        } catch (e) {
          // Assuming a 'not found' error, create the user profile
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
    } catch (error) {
      console.error('Failed to get current user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      // Reduced loading time to prevent excessive flashing
      setTimeout(() => {
        setShowInitialLoading(false);
      }, 800); // Reduced from 1500ms to 800ms
    }
  };

  // Session validation on initial load and manual refresh only
  useEffect(() => {
    // Restore email verification reminder dismissal state
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('emailVerificationReminderDismissed');
      if (dismissed === 'true') {
        setEmailVerificationReminderDismissed(true);
      }
    }

    refreshUser();

    let lastRefreshTime = Date.now();
    const MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute minimum between refreshes

    // Event-based session validation only on explicit user actions (prevent polling abuse)
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle refreshes: max 1 per minute
      if (now - lastRefreshTime >= MIN_REFRESH_INTERVAL && user && !isLoading) {
        lastRefreshTime = now;
        refreshUser();
      }
    };

    // Only validate on explicit user interaction (click, keydown)
    // Removed visibility and online events to prevent automatic refresh abuse
    document.addEventListener('click', handleUserActivity, { once: false, passive: true });
    document.addEventListener('keydown', handleUserActivity, { once: false, passive: true });

    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
    };
  }, [user, isLoading]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
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
  };

  // Session recovery function for when authentication state becomes inconsistent
  const recoverSession = async () => {
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
  };

  // Email verification reminder logic
  const shouldShowEmailVerificationReminder = (): boolean => {
    if (!user || user.emailVerification || emailVerificationReminderDismissed) {
      return false;
    }

    // Check if account is older than 24 hours
    const accountAge = Date.now() - new Date(user.$createdAt).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    return accountAge > oneDay;
  };

  const dismissEmailVerificationReminder = (): void => {
    setEmailVerificationReminderDismissed(true);
    // Store dismissal in localStorage to persist across sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('emailVerificationReminderDismissed', 'true');
    }
  };

  // Opens IDM window for authentication
  const openIDMWindow = useCallback(() => {
    // First check if user already has a valid session
    refreshUser().then(() => {
      // Check user state directly instead of from closure
      getCurrentUser().then((currentUser) => {
        if (currentUser) {
          setIDMWindowOpen(false);
          return;
        }

        // Get IDM configuration from environment
        const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN;
        const domain = process.env.NEXT_PUBLIC_DOMAIN;

        if (!authSubdomain || !domain) {
          console.error('IDM configuration missing: AUTH_SUBDOMAIN or DOMAIN not set');
          return;
        }

        const idmUrl = `https://${authSubdomain}.${domain}`;
        const width = 400;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const windowRef = window.open(
          idmUrl,
          'WhisperrNoteIDM',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        setIDMWindowRef(windowRef);
        setIDMWindowOpen(true);

        // Poll for session changes (only for IDM window)
        if (windowRef) {
          const pollInterval = setInterval(async () => {
            try {
              const checkedUser = await getCurrentUser();
              if (checkedUser) {
                setUser(checkedUser);
                setIDMWindowOpen(false);
                windowRef.close();
                clearInterval(pollInterval);
              } else if (windowRef.closed) {
                clearInterval(pollInterval);
                setIDMWindowOpen(false);
              }
            } catch (error) {
              console.error('Error checking session:', error);
            }
          }, 1000); // Check every second

          // Clear interval after 10 minutes (safety timeout)
          setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
        }
      }).catch((error) => {
        console.error('Error checking user session:', error);
      });
    });
  }, []);

  const closeIDMWindow = useCallback(() => {
    if (idmWindowRef && !idmWindowRef.closed) {
      idmWindowRef.close();
    }
    setIDMWindowOpen(false);
  }, [idmWindowRef]);

  const value = {
    user,
    isLoading,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showInitialLoading && <InitialLoadingScreen show={true} />}
      <EmailVerificationReminder />
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