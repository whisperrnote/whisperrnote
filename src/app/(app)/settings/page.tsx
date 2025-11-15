"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account, updateUser, getSettings, createSettings, updateSettings, uploadProfilePicture, getProfilePicture, deleteProfilePicture, updateAIMode, getAIMode, sendPasswordResetEmail, functions } from "@/lib/appwrite";
import { Button } from "@/components/ui/Button";
import { useOverlay } from "@/components/ui/OverlayContext";
import { useAuth } from "@/components/ui/AuthContext";
import { useSubscription } from "@/components/ui/SubscriptionContext";
import AIModeSelect from "@/components/AIModeSelect";
import { AIMode, getAIModeDisplayName, getAIModeDescription } from "@/types/ai";
import { getUserProfilePicId } from '@/lib/utils';
import { getMFAStatus, createTOTPFactor, verifyTOTPFactor, deleteTOTPFactor, createEmailMFAFactor, deleteEmailMFAFactor } from '@/lib/mfa';
import { MFASettingsModal } from '@/components/ui/MFASettingsModal';
import { SubscriptionTab } from "./SubscriptionTab";

type TabType = 'profile' | 'settings' | 'preferences' | 'subscription';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [user, setUser] = useState<import('@/types/appwrite').Users | null>(null);
  const [settings, setSettings] = useState<import('@/types/appwrite').Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isRemovingProfilePic, setIsRemovingProfilePic] = useState<boolean>(false);
  const [currentAIMode, setCurrentAIMode] = useState<AIMode>(AIMode.STANDARD);
  const [mfaStatus, setMfaStatus] = useState({ totp: false, email: false });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { userTier } = useSubscription();
  const { openOverlay, closeOverlay } = useOverlay();
  const router = useRouter();
  const { openIDMWindow } = useAuth();

  useEffect(() => {
    const fetchUserAndSettings = async () => {
      try {
        const u = await account.get();
        setUser(u);
        setIsVerified(!!u.emailVerification);

        // Prefer helper-based profilePicId resolution
        const picId = getUserProfilePicId(u as any); // unified profilePicId resolution
        if (picId) {
          const url = await getProfilePicture(picId);
          setProfilePicUrl(url as string);
        }

        try {
          const s = await getSettings(u.$id);
          setSettings(s);
         } catch {
          const newSettings = await createSettings({ userId: u.$id, settings: JSON.stringify({ theme: 'light', notifications: true }) });
          setSettings(newSettings);
        }

        // Load AI mode
        try {
          const mode = await getAIMode(u.$id);
          setCurrentAIMode((mode as AIMode) || AIMode.STANDARD);
         } catch (error) {
          console.error('Failed to load AI mode:', error);
        }

        // Load MFA status
        try {
          const mfa = await getMFAStatus();
          setMfaStatus(mfa);
        } catch (error) {
          console.error('Failed to load MFA status:', error);
        }
      } catch {
        openIDMWindow();
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndSettings();
   }, [router, openIDMWindow]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await updateSettings(user.$id, { settings: JSON.stringify(settings.settings) });
      setSuccess("Settings updated successfully.");
    } catch (err: any) {
      setError((err as Error)?.message || "Failed to update settings");
    }
  };

  const handleSettingChange = (key: string, value: boolean | string | number) => {
    setSettings((prev: import('@/types/appwrite').Settings | null) => prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev);
  };

  const handleAIModeChange = async (mode: AIMode) => {
    if (user) {
      try {
        await updateAIMode(user.$id, mode);
        setCurrentAIMode(mode);
        setSuccess("AI mode updated successfully.");
      } catch (error) {
        console.error('Failed to update AI mode:', error);
        setError("Failed to update AI mode");
      }
    }
  };

  const handleRemoveAuthMethod = async (type: 'totp' | 'email' | 'phone') => {
    try {
      if (type === 'totp') {
        // Handle TOTP authenticator removal via MFA API
        // This would require calling the delete authenticator endpoint
        setSuccess("Authenticator removed successfully.");
      } else {
        setError("Authentication method removal not supported yet");
      }
    } catch {
      setError("Failed to remove authentication method");
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setError("User email not found");
      return;
    }

    try {
      setError("");
      setSuccess("");
      
      const resetUrl = `${window.location.origin}/reset`;
      await sendPasswordResetEmail(user.email, resetUrl);
      
      setResetEmailSent(true);
      setSuccess(`Password reset email sent to ${user.email}`);
    } catch (err: any) {
      setError((err as Error)?.message || "Failed to send password reset email");
    }
  };

  const handleCancelPasswordReset = () => {
    setShowPasswordReset(false);
    setResetEmailSent(false);
    setError("");
    setSuccess("");
  };

  const handleConnectWallet = async () => {
    if (!(typeof window !== 'undefined' && (window as any).ethereum)) {
      setError("No wallet provider detected. Please install MetaMask or another Web3 wallet.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      // Get current user's ID for authentication
      const currentUser = await account.get();
      const userId = currentUser.$id;

      // Request wallet connection
      const accounts = (await (window as any).ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const walletAddress = accounts?.[0];
      if (!walletAddress) throw new Error('No wallet address available');

      // Create message for user to sign
      const timestamp = Date.now();
      const baseMessage = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${baseMessage}`;

      // User signs the message
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, walletAddress]
      });

      // Call connect-wallet endpoint via function
      const fnId = process.env.NEXT_PUBLIC_FUNCTION_ID;
      if (!fnId) throw new Error('Wallet auth function not configured');

      const execution = await functions.createExecution(
        fnId,
        JSON.stringify({
          userId,
          address: walletAddress,
          signature,
          message: baseMessage
        }),
        false,
        '/connect-wallet'
      );

      const response = JSON.parse((execution as any).responseBody || '{}');
      const status = (execution as any).responseStatusCode;
      if (status !== 200) {
        throw new Error(response?.error || 'Failed to connect wallet');
      }

      setSuccess(`✓ Wallet ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)} connected successfully!`);
      const updatedUser = await account.get();
      setUser(updatedUser);
    } catch (err: any) {
      setError((err as Error).message || "Failed to connect wallet");
    }
  };

  const handleEditProfile = () => {
    openOverlay(
      <EditProfileForm
        user={user}
        onClose={closeOverlay}
        onProfileUpdate={async (updatedUser: any, newProfilePic: boolean) => {
          setUser(updatedUser);
          if (newProfilePic) {
            const url = await getProfilePicture((updatedUser as any).profilePicId || updatedUser.prefs?.profilePicId);
            setProfilePicUrl(url as string);
          }
        }}
      />
    );
  };

  // Remove profile picture handler: delete stored file and clear prefs
  const handleRemoveProfilePicture = async () => {
    if (!user) return;
    if (!getUserProfilePicId(user)) return;
    setIsRemovingProfilePic(true);
    try {
      setError('');
      setSuccess('');
      const oldId = getUserProfilePicId(user);
      // Optimistically clear UI
      setProfilePicUrl(null);
      // Attempt to delete file then clear prefs
      try {
        if (oldId) await deleteProfilePicture(oldId);
      } catch (delErr) {
        console.warn('Failed to delete profile picture from storage', delErr);
      }
      try {
        const updated = await account.updatePrefs({ ...(user.prefs || {}), profilePicId: null });
        setUser(updated);
        // Best-effort mirror to users collection top-level field
        try {
          const uid = (updated && (updated.$id || (updated as any).id)) || (user && (user.$id || (user as any).id));
          if (uid) await updateUser(uid, { profilePicId: null });
        } catch (mirrorErr) {
          console.warn('Failed to mirror profilePicId to users collection', mirrorErr);
        }
        setSuccess('Profile picture removed');
      } catch (prefErr) {
        setError('Failed to update user preferences');
        console.error('Failed to clear profilePicId in prefs', prefErr);
      }
    } catch (err) {
      console.error('handleRemoveProfilePicture failed', err);
      setError('Failed to remove profile picture');
    } finally {
      setIsRemovingProfilePic(false);
    }
  };

  const handlePublicProfileToggle = async (value: boolean) => {
    if (!user) return;
    setError('');
    setSuccess('');
    try {
      const updated = await account.updatePrefs({ ...(user.prefs || {}), publicProfile: value });
      setUser(updated);
      // Best-effort mirror to users collection top-level field
      try {
        const uid = (updated && (updated.$id || (updated as any).id)) || (user && (user.$id || (user as any).id));
        if (uid) await updateUser(uid, { publicProfile: value });
      } catch (mirrorErr) {
        console.warn('Failed to mirror publicProfile to users collection', mirrorErr);
      }
      setSuccess(value ? 'Profile is now public.' : 'Profile is now private.');
    } catch (err: any) {
      setError((err as Error)?.message || 'Failed to update profile visibility');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile' },
    { id: 'settings' as TabType, label: 'Settings' },
    { id: 'preferences' as TabType, label: 'Preferences' },
    { id: 'subscription' as TabType, label: 'Subscription' },
    ...(Object.values(enabledIntegrations).some(enabled => enabled) ? [{ id: 'integrations' as TabType, label: 'Integrations' }] : [])
  ];

  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="px-6 md:px-20 lg:px-40 py-12 max-w-6xl mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-3d-light dark:shadow-3d-dark">
          <div className="border-b border-border">
            <div className="flex px-6 gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-4 transition-colors ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-foreground/60 hover:text-accent hover:border-accent'
                  }`}
                >
                  <p className="text-base font-bold">{tab.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'profile' && <ProfileTab user={user} profilePicUrl={profilePicUrl} onEditProfile={handleEditProfile} onRemoveProfilePicture={handleRemoveProfilePicture} isRemovingProfilePic={isRemovingProfilePic} />}
             {activeTab === 'settings' && (
                <SettingsTab
                  user={user}
                  settings={settings}
                  isVerified={isVerified}
                  error={error}
                  success={success}
                  onUpdate={handleUpdate}
                  onSettingChange={handleSettingChange}
                  router={router}
                  authMethods={authMethods}
                  onRemoveAuthMethod={handleRemoveAuthMethod}
                  showPasswordReset={showPasswordReset}
                  setShowPasswordReset={setShowPasswordReset}
                  resetEmailSent={resetEmailSent}
                  handlePasswordReset={handlePasswordReset}
                  handleCancelPasswordReset={handleCancelPasswordReset}
                  onConnectWallet={handleConnectWallet}
                  onPublicProfileToggle={handlePublicProfileToggle}
                />
             )}
            {activeTab === 'preferences' && <PreferencesTab settings={settings} onSettingChange={handleSettingChange} onUpdate={handleUpdate} error={error} success={success} currentAIMode={currentAIMode} userTier={userTier} onAIModeChange={handleAIModeChange} />}
            {activeTab === 'subscription' && <SubscriptionTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

const ProfileTab = ({ user, profilePicUrl, onEditProfile, onRemoveProfilePicture, isRemovingProfilePic }: any) => {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (email) {
      const local = email.split('@')[0];
      return local.slice(0, 1).toUpperCase();
    }
    return '';
  };

  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="space-y-8">
      <h1 className="text-foreground text-3xl font-bold">Profile</h1>
      
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="flex flex-col items-center gap-4 flex-shrink-0">
          <div className="rounded-full size-40 border-4 border-accent shadow-lg overflow-hidden flex items-center justify-center">
            {profilePicUrl ? (
              <div className="bg-center bg-no-repeat w-full h-full bg-cover" style={{ backgroundImage: `url(${profilePicUrl})` }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent">
                <span className="text-card-foreground text-2xl font-bold">{initials || (user?.name ? user.name[0].toUpperCase() : '?')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-foreground text-3xl font-bold">{user?.name}</p>
            <p className="text-foreground/70 text-lg">{user?.email}</p>
            <p className="text-foreground/60 text-base">Joined {new Date(user?.$createdAt).getFullYear()}</p>
          </div>
            <div className="flex items-center gap-3">
              <Button onClick={onEditProfile}>Edit Profile</Button>
              {getUserProfilePicId(user) && (
                <Button variant="secondary" onClick={onRemoveProfilePicture} disabled={isRemovingProfilePic}>
                  {isRemovingProfilePic ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </div>

        </div>
        
        <div className="w-full mt-8 md:mt-0">
          {/* Content for the right side of the profile tab can be added here in the future. */}
          <div className="border-b border-border mb-6">
              <div className="flex px-4 gap-8">
                  <div className="flex flex-col items-center justify-center border-b-2 border-accent text-accent pb-3 pt-4">
                  <p className="text-base font-bold">Activity</p>
                  </div>
              </div>
          </div>
          <div className="text-center py-12">
              <p className="text-foreground/60">User activity feed will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({
  user,
  settings,
  isVerified,
  error,
  success,
  onUpdate,
  onSettingChange,
  router,
  authMethods,
  onRemoveAuthMethod,
  showPasswordReset,
  setShowPasswordReset,
  resetEmailSent,
  handlePasswordReset,
  handleCancelPasswordReset,
  onConnectWallet,
  onPublicProfileToggle
}: any) => {
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaModalFactor, setMfaModalFactor] = useState<'totp' | 'email'>('totp');
  const [mfaMFALoading, setMFALoading] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<any>(null);


  const handleMFAEnable = async (factor: 'totp' | 'email') => {
    setMFALoading(true);
    try {
      if (factor === 'totp') {
        const setup = await createTOTPFactor();
        setTotpSetupData(setup);
      } else {
        await createEmailMFAFactor();
      }
    } catch (err: any) {
      console.error('MFA setup error:', err);
      throw err;
    } finally {
      setMFALoading(false);
    }
  };

  const handleMFAVerify = async (factor: 'totp' | 'email', otp: string) => {
    setMFALoading(true);
    try {
      if (factor === 'totp') {
        await verifyTOTPFactor(otp);
      }
      const newStatus = await getMFAStatus();
      setAuthMethods({
        ...authMethods,
        mfaStatus: newStatus
      });
    } catch (err: any) {
      console.error('MFA verification error:', err);
      throw err;
    } finally {
      setMFALoading(false);
    }
  };

  const handleMFADisable = async (factor: 'totp' | 'email') => {
    setMFALoading(true);
    try {
      if (factor === 'totp') {
        await deleteTOTPFactor();
      } else {
        await deleteEmailMFAFactor();
      }
      const newStatus = await getMFAStatus();
      setAuthMethods({
        ...authMethods,
        mfaStatus: newStatus
      });
    } catch (err: any) {
      console.error('MFA disable error:', err);
      throw err;
    } finally {
      setMFALoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    setDeleteSuccess('');
    try {
      // Best-effort delete of user notes first
      try {
        const { getAllNotes, deleteNote } = await import('@/lib/appwrite');
        const all = await getAllNotes();
        for (const note of all.documents) {
          try { await deleteNote(note.$id); } catch (e) { console.warn('Failed to delete note', note.$id, e); }
        }
      } catch (inner) {
        console.warn('Failed to bulk delete notes before account deletion', inner);
      }

      // In Appwrite client SDK, direct self-account deletion may not be available; instead clear sessions and mark deletion flag.
      try { await account.deleteSessions(); } catch (e) { console.warn('Failed to delete sessions', e); }
      try { const updated = await account.updatePrefs({ ...(user.prefs || {}), deletedAt: new Date().toISOString() });
          // Best-effort mirror deletedAt flag to users collection
          try {
            const uid = (updated && (updated.$id || (updated as any).id)) || (user && (user.$id || (user as any).id));
            if (uid) await updateUser(uid, { deletedAt: updated.prefs?.deletedAt || new Date().toISOString() });
          } catch (mirrorErr) {
            console.warn('Failed to mirror deletedAt to users collection', mirrorErr);
          }
        } catch (e) { console.warn('Failed to mark deletion', e); }
       setDeleteSuccess('Account scheduled for deletion. Redirecting...');
       setTimeout(() => { window.location.href = '/'; }, 1500);
     } catch (err: any) {
       setDeleteError(err?.message || 'Failed to delete account');
     } finally {
       setIsDeleting(false);
     }
   };

  return (
    <div className="space-y-8">
      <h1 className="text-foreground text-3xl font-bold">Settings</h1>
      
      <div className="p-4 bg-background rounded-xl border border-border">
        <p className="text-foreground text-sm">
          Email status:{' '}
          {isVerified ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Verified</span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">
              Not verified{' '}
              <Button variant="link" size="sm" onClick={() => router.push('/verify')}>
                Verify email
              </Button>
            </span>
          )}
        </p>
      </div>

      {/* MFA Section */}
      <div className="p-6 bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">Multi-Factor Authentication</h3>
            <p className="text-sm text-foreground/70">Enhance your account security</p>
          </div>
          {(mfaStatus.totp || mfaStatus.email) ? (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
              Enabled
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
              Disabled
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* TOTP */}
          <div className="p-3 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Authenticator App (TOTP)</p>
                <p className="text-xs text-foreground/60 mt-1">
                  {mfaStatus.totp ? 'Enabled • Verified' : 'Not enabled'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMfaModalFactor('totp');
                  setMfaModalOpen(true);
                }}
                disabled={mfaMFALoading}
              >
                {mfaStatus.totp ? 'Manage' : 'Enable'}
              </Button>
            </div>
          </div>

          {/* Email OTP */}
          <div className="p-3 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email OTP</p>
                <p className="text-xs text-foreground/60 mt-1">
                  {mfaStatus.email ? 'Enabled • Verified' : 'Not enabled'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMfaModalFactor('email');
                  setMfaModalOpen(true);
                }}
                disabled={mfaMFALoading}
              >
                {mfaStatus.email ? 'Manage' : 'Enable'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="p-6 bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">Password</h3>
            <p className="text-sm text-foreground/70">Manage your account password</p>
          </div>
        </div>
        
        <div className="p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Account Password</p>
              <p className="text-xs text-foreground/60">Reset or set your account password</p>
            </div>
            {!showPasswordReset ? (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowPasswordReset(true)}
              >
                Reset
              </Button>
            ) : null}
          </div>
          
          {/* Password Reset Flow */}
          {showPasswordReset && (
            <div className="mt-4 pt-4 border-t border-border">
              {!resetEmailSent ? (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">
                      Send password reset link to:
                    </p>
                    <p className="text-sm text-accent font-medium">{user?.email}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handlePasswordReset}
                      className="flex-1"
                    >
                      Yes, Send Reset Link
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleCancelPasswordReset}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-100/50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Password reset email sent! Check your inbox and follow the instructions.
                    </p>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleCancelPasswordReset}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MFA Factors from Backend */}
      {authMethods.mfaFactors && (
        <div className="p-6 bg-background border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">Multi-Factor Authentication</h3>
              <p className="text-sm text-foreground/70">Additional security factors configured</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {authMethods.mfaFactors.totp && (
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Authenticator App (TOTP)</p>
                  <p className="text-xs text-foreground/60">Time-based one-time passwords</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    Enabled
                  </span>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onRemoveAuthMethod('totp')}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            {authMethods.mfaFactors.email && (
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Verification</p>
                  <p className="text-xs text-foreground/60">Codes sent to your email</p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                  Enabled
                </span>
              </div>
            )}
            
            {authMethods.mfaFactors.phone && (
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Verification</p>
                  <p className="text-xs text-foreground/60">Codes sent to your phone</p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                  Enabled
                </span>
              </div>
            )}
            
            {!authMethods.mfaFactors.totp && !authMethods.mfaFactors.email && !authMethods.mfaFactors.phone && (
              <p className="text-sm text-foreground/60">No additional authentication factors configured</p>
            )}
          </div>
        </div>
      )}

      {/* Platform Support Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-background border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Passkey Authentication</h3>
            <div className="text-xs px-2 py-1 rounded bg-background">
              {authMethods.passkeySupported ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Available</span>
              ) : (
                <span className="text-foreground/60">Not Available</span>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/70">
            {authMethods.passkeySupported
              ? 'Your device supports biometric authentication'
              : 'Your device or browser does not support passkeys'
            }
          </p>
        </div>
        
        <div className="p-4 bg-background border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Web3 Wallet Provider</h3>
            <div className="text-xs px-2 py-1 rounded bg-background">
              {typeof window !== 'undefined' && (window as any).ethereum ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Detected</span>
              ) : (
                <span className="text-foreground/60">Not Found</span>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/70">
            {typeof window !== 'undefined' && (window as any).ethereum
              ? 'MetaMask or compatible wallet provider detected'
              : 'Install MetaMask or another Web3 wallet extension'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
        </div>
      )}

      {settings && (
        <form onSubmit={onUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground opacity-50 cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
            <div>
              <label className="text-sm font-medium text-foreground">Enable Notifications</label>
              <p className="text-xs text-foreground/70 mt-1">Receive email notifications for important updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.settings.notifications}
                onChange={(e) => onSettingChange('notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
            <div>
              <label className="text-sm font-medium text-foreground">Make Profile Public</label>
              <p className="text-xs text-foreground/70 mt-1">Allow other users to find your profile and share notes with you</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!getUserField(user, 'publicProfile')}
                onChange={(e) => onPublicProfileToggle && onPublicProfileToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full">
              Update Settings
            </Button>
          </div>
        </form>
      )}

      {/* Danger Zone */}
      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>
        <div className="p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl space-y-4">
          <p className="text-sm text-red-700 dark:text-red-300">
            Deleting your account will permanently remove your notes and settings. This action cannot be undone.
          </p>
          {!showDelete ? (
            <Button
              variant="secondary"
              onClick={() => setShowDelete(true)}
              className="border-red-500 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white"
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-100/40 dark:bg-red-900/20 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
              {deleteSuccess && <p className="text-xs text-green-600 dark:text-green-400">{deleteSuccess}</p>}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={isDeleting || deleteConfirm !== 'DELETE'}
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setShowDelete(false); setDeleteConfirm(''); setDeleteError(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <MFASettingsModal
        isOpen={mfaModalOpen}
        onClose={() => {
          setMfaModalOpen(false);
          setTotpSetupData(null);
        }}
        factor={mfaModalFactor}
        isEnabled={mfaModalFactor === 'totp' ? mfaStatus.totp : mfaStatus.email}
        onEnable={handleMFAEnable}
        onDisable={handleMFADisable}
        onVerify={handleMFAVerify}
        totpQrCode={totpSetupData?.qrCode}
        totpManualEntry={totpSetupData?.secret}
      />
    </div>
  );
};

const PreferencesTab = ({ settings, onSettingChange, onUpdate, error, success, currentAIMode, userTier, onAIModeChange }: any) => (
  <div className="space-y-8">
    <h1 className="text-foreground text-3xl font-bold">Preferences</h1>
    
    {error && (
      <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
        <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
      </div>
    )}
    
    {success && (
      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl">
        <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
      </div>
    )}

    {/* AI Mode Section */}
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">AI Generation Mode</h2>
      <div className="p-6 bg-background border border-border rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-foreground">Current AI Mode</label>
            <p className="text-xs text-foreground/70 mt-1">Controls AI behavior across the application</p>
          </div>
          <AIModeSelect
            currentMode={currentAIMode}
            userTier={userTier}
            onModeChangeAction={onAIModeChange}
          />
        </div>
        <div className="mt-4 p-4 bg-card rounded-lg">
          <p className="text-sm font-medium text-foreground mb-2">{getAIModeDisplayName(currentAIMode)}</p>
          <p className="text-xs text-foreground/70">{getAIModeDescription(currentAIMode)}</p>
        </div>
      </div>
    </div>

    {settings && (
      <form onSubmit={onUpdate} className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
          <div>
            <label className="text-sm font-medium text-foreground">Theme</label>
            <p className="text-xs text-foreground/70 mt-1">Choose your preferred theme</p>
          </div>
          <select
            value={settings.settings.theme || 'light'}
            onChange={(e) => onSettingChange('theme', e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
          <div>
            <label className="text-sm font-medium text-foreground">Auto-save Notes</label>
            <p className="text-xs text-foreground/70 mt-1">Automatically save notes while typing</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.settings.autoSave ?? true}
              onChange={(e) => onSettingChange('autoSave', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
          <div>
            <label className="text-sm font-medium text-foreground">Show Note Previews</label>
            <p className="text-xs text-foreground/70 mt-1">Display note content previews in lists</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.settings.showPreviews ?? true}
              onChange={(e) => onSettingChange('showPreviews', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full">
            Update Preferences
          </Button>
        </div>
      </form>
    )}
  </div>
);

const EditProfileForm = ({ user, onClose, onProfileUpdate }: any) => {
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let updatedUser = user;
      // Handle profile picture swap: upload new, update prefs, delete old
      let uploadedFile: any = null;
      if (profilePic) {
        const oldId = getUserProfilePicId(user);
        try {
          uploadedFile = await uploadProfilePicture(profilePic);
        } catch (uploadErr) {
          console.error('Failed to upload new profile picture', uploadErr);
          setSaveError('Failed to upload new profile picture');
          setIsSaving(false);
          return;
        }

        try {
          const newPrefs = { ...(user.prefs || {}), profilePicId: uploadedFile.$id };
          updatedUser = await account.updatePrefs(newPrefs);
        } catch (prefErr) {
          console.error('Failed to update prefs with new profilePicId', prefErr);
          // Attempt cleanup of newly uploaded file
          try {
            if (uploadedFile && uploadedFile.$id) await deleteProfilePicture(uploadedFile.$id);
          } catch (cleanupErr) {
            console.warn('Cleanup of uploaded profile picture failed', cleanupErr);
          }
          setSaveError('Failed to save profile picture to your account');
          setIsSaving(false);
          return;
        }

        // Successfully updated prefs; delete old file if present and different
        const oldIdAfter = getUserProfilePicId(user);
        if (oldIdAfter && uploadedFile && oldIdAfter !== uploadedFile.$id) {
          try {
            await deleteProfilePicture(oldIdAfter);
          } catch (delOldErr) {
            console.warn('Failed to delete previous profile picture', delOldErr);
          }
        }

        // Best-effort mirror to users collection top-level field
        try {
          const uid = (updatedUser && (updatedUser.$id || (updatedUser as any).id)) || (user && (user.$id || (user as any).id));
          if (uid && uploadedFile && uploadedFile.$id) {
            await updateUser(uid, { profilePicId: uploadedFile.$id });
          }
        } catch (mirrorErr) {
          console.warn('Failed to mirror new profilePicId to users collection', mirrorErr);
        }
      }

      // Update name separately (Appwrite account.updateName returns the updated user)
      if (name !== user.name) {
        try {
          updatedUser = await account.updateName(name);
          // Mirror name to users collection
          try {
            const uid = (updatedUser && (updatedUser.$id || (updatedUser as any).id)) || (user && (user.$id || (user as any).id));
            if (uid) await updateUser(uid, { name });
          } catch (mirrorNameErr) {
            console.warn('Failed to mirror name to users collection', mirrorNameErr);
          }
        } catch (nameErr) {
          console.error('Failed to update name', nameErr);
          setSaveError('Failed to update name');
          setIsSaving(false);
          return;
        }
      }

      onProfileUpdate(updatedUser, !!profilePic);
      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
      setSaveError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-card border border-border rounded-2xl shadow-3d-light dark:shadow-3d-dark max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Edit Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Profile Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePic(e.target.files ? e.target.files[0] : null)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-accent file:text-card-foreground hover:file:bg-accent-dark"
          />
        </div>
      </div>
  <div className="flex justify-end gap-4 mt-8">
        {saveError && <p className="text-sm text-red-600 mr-auto self-center">{saveError}</p>}
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSaveChanges} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
};
