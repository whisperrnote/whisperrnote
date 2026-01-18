"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  account, 
  updateUser, 
  getUser,
  getSettings, 
  createSettings, 
  updateSettings, 
  uploadProfilePicture, 
  getProfilePicture, 
  deleteProfilePicture, 
  sendPasswordResetEmail 
} from "@/lib/appwrite";
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Tabs, 
  Tab, 
  Avatar, 
  Button, 
  TextField, 
  Switch, 
  FormControlLabel, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Divider, 
  CircularProgress, 
  Alert, 
  Stack,
  alpha,
  IconButton
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Settings as SettingsIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Security as SecurityIcon
} from "@mui/icons-material";
import { useOverlay } from "@/components/ui/OverlayContext";
import { useAuth } from "@/components/ui/AuthContext";
import { getUserProfilePicId, getUserField } from '@/lib/utils';

type TabType = 'profile' | 'preferences' | 'account';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isRemovingProfilePic, setIsRemovingProfilePic] = useState<boolean>(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { openOverlay, closeOverlay } = useOverlay();
  const router = useRouter();
  const { openIDMWindow } = useAuth();

  useEffect(() => {
    const fetchUserAndSettings = async () => {
      try {
        const u = await account.get();
        let dbUser = {};
        try {
          dbUser = await getUser(u.$id);
        } catch (dbErr) {
          console.warn('Could not fetch DB user profile for settings');
        }
        
        const mergedUser = { ...u, ...dbUser };
        setUser(mergedUser);
        setIsVerified(!!u.emailVerification);

        const picId = getUserProfilePicId(mergedUser as any);
        if (picId) {
          try {
            const url = await getProfilePicture(picId);
            setProfilePicUrl(url as string);
          } catch (picErr) {
            console.warn('Failed to fetch profile picture URL');
          }
        }

        try {
          const s = await getSettings(u.$id);
          setSettings(s);
         } catch {
          const newSettings = await createSettings({ userId: u.$id, settings: JSON.stringify({ theme: 'light', notifications: true }) });
          setSettings(newSettings);
        }
      } catch {
        openIDMWindow();
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndSettings();
   }, [router, openIDMWindow]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await updateSettings(user!.$id, { settings: JSON.stringify(settings!.settings) });
      setSuccess("Settings updated successfully.");
    } catch (err: any) {
      setError((err as Error)?.message || "Failed to update settings");
    }
  };

  const handleSettingChange = (key: string, value: boolean | string | number) => {
    setSettings((prev: any) => prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev);
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

  const handleRemoveProfilePicture = async () => {
    if (!user) return;
    if (!getUserProfilePicId(user)) return;
    setIsRemovingProfilePic(true);
    try {
      setError('');
      setSuccess('');
      const oldId = getUserProfilePicId(user);
      setProfilePicUrl(null);
      try {
        if (oldId) await deleteProfilePicture(oldId);
      } catch (delErr) {
        console.warn('Failed to delete profile picture from storage', delErr);
      }
      try {
        const updated = await account.updatePrefs({ ...(user.prefs || {}), profilePicId: null });
        setUser(updated);
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

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await account.createRecovery(user.email, `${window.location.origin}/reset-password`);
      setResetEmailSent(true);
      setSuccess("Password reset email sent.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelPasswordReset = () => {
    setShowPasswordReset(false);
    setResetEmailSent(false);
  };

  const handlePublicProfileToggle = async (enabled: boolean) => {
    if (!user) return;
    try {
      const newPrefs = { ...(user.prefs || {}), publicProfile: enabled };
      const updatedUser = await account.updatePrefs(newPrefs);
      try {
        const uid = updatedUser?.$id || user?.$id;
        if (uid) await updateUser(uid, { publicProfile: enabled });
      } catch (err) {
        console.warn('Failed to mirror publicProfile to users collection', err);
      }
      setUser(updatedUser);
      setSuccess(`Public profile ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      setError('Failed to update profile visibility');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00F5FF' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(10, 10, 10, 0.95)', py: 8 }}>
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            borderRadius: '32px',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(25px) saturate(180%)',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, val) => setActiveTab(val)}
              sx={{
                px: 4,
                '& .MuiTabs-indicator': { bgcolor: '#00F5FF', height: 3 },
                '& .MuiTab-root': { 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontWeight: 700, 
                  py: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&.Mui-selected': { color: '#00F5FF' }
                }
              }}
            >
              <Tab label="Profile" value="profile" icon={<PersonIcon sx={{ fontSize: 20 }} />} iconPosition="start" />
              <Tab label="Preferences" value="preferences" icon={<SettingsIcon sx={{ fontSize: 20 }} />} iconPosition="start" />
              <Tab label="Account" value="account" icon={<SecurityIcon sx={{ fontSize: 20 }} />} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 4, md: 6 } }}>
            {error && <Alert severity="error" sx={{ mb: 4, borderRadius: '16px', bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff5252', border: '1px solid rgba(211, 47, 47, 0.2)' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 4, borderRadius: '16px', bgcolor: 'rgba(46, 125, 50, 0.1)', color: '#66bb6a', border: '1px solid rgba(46, 125, 50, 0.2)' }}>{success}</Alert>}

            {activeTab === 'profile' && (
              <ProfileTab 
                user={user} 
                profilePicUrl={profilePicUrl} 
                onEditProfile={handleEditProfile} 
                onRemoveProfilePicture={handleRemoveProfilePicture} 
                isRemovingProfilePic={isRemovingProfilePic} 
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab 
                settings={settings} 
                onSettingChange={handleSettingChange} 
                onUpdate={handleUpdate} 
                user={user}
                isVerified={isVerified}
              />
            )}
            {activeTab === 'account' && (
              <SettingsTab 
                user={user}
                settings={settings}
                isVerified={isVerified}
                error={error}
                success={success}
                onUpdate={handleUpdate}
                onSettingChange={handleSettingChange}
                router={router}
                showPasswordReset={showPasswordReset}
                setShowPasswordReset={setShowPasswordReset}
                resetEmailSent={resetEmailSent}
                handlePasswordReset={handlePasswordReset}
                handleCancelPasswordReset={handleCancelPasswordReset}
                onPublicProfileToggle={handlePublicProfileToggle}
              />
            )}
          </Box>

        </Paper>
      </Container>
    </Box>
  );
}

const ProfileTab = ({ user, profilePicUrl, onEditProfile, onRemoveProfilePicture, isRemovingProfilePic }: any) => {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return '?';
  };

  const initials = getInitials(user?.name, user?.email);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 6, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
        Profile
      </Typography>
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={8} alignItems={{ xs: 'center', md: 'flex-start' }}>
        <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
          <Avatar 
            src={profilePicUrl || undefined}
            sx={{ 
              width: 160, 
              height: 160, 
              mb: 3, 
              border: '4px solid #00F5FF',
              boxShadow: '0 0 30px rgba(0, 245, 255, 0.2)',
              bgcolor: '#00F5FF',
              color: '#000',
              fontSize: '3rem',
              fontWeight: 900
            }}
          >
            {!profilePicUrl && initials}
          </Avatar>

          <Typography variant="h5" sx={{ fontWeight: 900, color: 'white', mb: 0.5 }}>{user?.name}</Typography>
          {user?.username && (
            <Typography variant="subtitle1" sx={{ color: '#00F5FF', fontWeight: 700, mb: 1 }}>@{user.username}</Typography>
          )}
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>{user?.email}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mb: 4 }}>
            Joined {new Date(user?.$createdAt).getFullYear()}
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button 
              variant="contained" 
              onClick={onEditProfile}
              startIcon={<EditIcon />}
              sx={{ 
                borderRadius: '12px', 
                bgcolor: '#00F5FF', 
                color: '#000', 
                fontWeight: 800,
                '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
              }}
            >
              Edit Profile
            </Button>
            {getUserProfilePicId(user) && (
              <Button 
                variant="outlined" 
                onClick={onRemoveProfilePicture} 
                disabled={isRemovingProfilePic}
                startIcon={<DeleteIcon />}
                sx={{ 
                  borderRadius: '12px', 
                  borderColor: 'rgba(255, 77, 77, 0.5)', 
                  color: '#ff4d4d',
                  '&:hover': { borderColor: '#ff4d4d', bgcolor: 'rgba(255, 77, 77, 0.05)' }
                }}
              >
                {isRemovingProfilePic ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </Stack>
        </Box>
        
        <Box sx={{ flex: 1, width: '100%' }}>
          <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#00F5FF', pb: 2, borderBottom: '2px solid #00F5FF', display: 'inline-block' }}>
              Activity
            </Typography>
          </Box>
          <Paper sx={{ p: 6, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>User activity feed will be displayed here.</Typography>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

const PreferencesTab = ({ 
  settings, 
  onSettingChange, 
  onUpdate, 
  user,
  isVerified
}: any) => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 6, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
        Preferences
      </Typography>

      <Stack spacing={6}>
        {/* Account Status */}
        <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <EmailIcon sx={{ color: isVerified ? '#66bb6a' : '#ff4d4d' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Email Verification</Typography>
              <Typography variant="body2" sx={{ color: isVerified ? '#66bb6a' : '#ff4d4d' }}>
                {isVerified ? 'Your email is verified.' : 'Your email is not verified.'}
              </Typography>
            </Box>
            {!isVerified && (
              <Button variant="outlined" size="small" sx={{ borderRadius: '8px', color: '#00F5FF', borderColor: '#00F5FF' }}>
                Verify Now
              </Button>
            )}
          </Stack>
        </Paper>

        {/* App Settings */}
        {settings && (
          <Box component="form" onSubmit={onUpdate}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SettingsIcon sx={{ color: '#00F5FF' }} /> Application Settings
            </Typography>
            <Stack spacing={3}>

              <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Theme</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Choose your preferred theme</Typography>
                  </Box>
                  <Select
                    value={settings.settings.theme || 'light'}
                    onChange={(e) => onSettingChange('theme', e.target.value)}
                    size="small"
                    sx={{ 
                      minWidth: 120, 
                      color: 'white', 
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00F5FF' }
                    }}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                  </Select>
                </Stack>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.settings.notifications} 
                      onChange={(e) => onSettingChange('notifications', e.target.checked)}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00F5FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00F5FF' } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Enable Notifications</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Receive email notifications for important updates</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', justifyContent: 'space-between', m: 0, flexDirection: 'row-reverse' }}
                />
              </Paper>

              <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.settings.autoSave ?? true} 
                      onChange={(e) => onSettingChange('autoSave', e.target.checked)}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00F5FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00F5FF' } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Auto-save Notes</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Automatically save notes while typing</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', justifyContent: 'space-between', m: 0, flexDirection: 'row-reverse' }}
                />
              </Paper>

              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<SaveIcon />}
                sx={{ 
                  py: 2, 
                  borderRadius: '16px', 
                  bgcolor: '#00F5FF', 
                  color: '#000', 
                  fontWeight: 900,
                  '&:hover': { bgcolor: alpha('#00F5FF', 0.8) }
                }}
              >
                Update Preferences
              </Button>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

const EditProfileForm = ({ user, onClose, onProfileUpdate }: any) => {
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let updatedUser = user;
      let uploadedFile: any = null;
      if (profilePic) {
        try {
          uploadedFile = await uploadProfilePicture(profilePic);
        } catch (uploadErr) {
          setSaveError('Failed to upload new profile picture');
          setIsSaving(false);
          return;
        }

        try {
          const newPrefs = { ...(user.prefs || {}), profilePicId: uploadedFile.$id };
          updatedUser = await account.updatePrefs(newPrefs);
        } catch (prefErr) {
          try { if (uploadedFile?.$id) await deleteProfilePicture(uploadedFile.$id); } catch {}
          setSaveError('Failed to save profile picture to your account');
          setIsSaving(false);
          return;
        }

        const oldIdAfter = getUserProfilePicId(user);
        if (oldIdAfter && uploadedFile && oldIdAfter !== uploadedFile.$id) {
          try { await deleteProfilePicture(oldIdAfter); } catch {}
        }

        try {
          const uid = updatedUser?.$id || user?.$id;
          if (uid && uploadedFile?.$id) await updateUser(uid, { profilePicId: uploadedFile.$id });
        } catch {}
      }

      const userUpdates: any = {};
      if (name !== user.name) userUpdates.name = name;
      if (username !== (user.username || '')) {
        // Simple client-side validation for username
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
        userUpdates.username = cleanUsername;
      }

      if (Object.keys(userUpdates).length > 0) {
        try {
          if (userUpdates.name) {
            updatedUser = await account.updateName(userUpdates.name);
          }
          
          // Sync username to global account preferences for ecosystem-wide coherence
          if (userUpdates.username) {
            const currentPrefs = await account.getPrefs();
            updatedUser = await account.updatePrefs({
              ...currentPrefs,
              username: userUpdates.username,
              last_username_edit: new Date().toISOString()
            });
          }

          const uid = updatedUser?.$id || user?.$id;
          if (uid) {
            await updateUser(uid, userUpdates);
          }
        } catch (e: any) {
          setSaveError(e?.message || 'Failed to update profile info');
          setIsSaving(false);
          return;
        }
      }

      onProfileUpdate({ ...updatedUser, ...userUpdates }, !!profilePic);
      onClose();
    } catch {
      setSaveError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 6, borderRadius: '32px', bgcolor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(30px) saturate(180%)', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: 450, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 4, color: 'white', fontFamily: 'var(--font-space-grotesk)' }}>Edit Profile</Typography>
      <Stack spacing={4}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{ 
            '& .MuiOutlinedInput-root': { color: 'white', borderRadius: '16px', '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' }, '&:hover fieldset': { borderColor: '#00F5FF' } },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' }
          }}
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          variant="outlined"
          placeholder="username"
          InputProps={{
            startAdornment: <Typography sx={{ color: 'rgba(255, 255, 255, 0.3)', mr: 0.5 }}>@</Typography>
          }}
          sx={{ 
            '& .MuiOutlinedInput-root': { color: 'white', borderRadius: '16px', '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' }, '&:hover fieldset': { borderColor: '#00F5FF' } },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' }
          }}
        />
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1, display: 'block' }}>Profile Picture</Typography>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePic(e.target.files ? e.target.files[0] : null)}
            style={{ color: 'white', width: '100%' }}
          />
        </Box>
        {saveError && <Typography variant="caption" sx={{ color: '#ff4d4d' }}>{saveError}</Typography>}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Cancel</Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving}
            variant="contained"
            sx={{ borderRadius: '12px', bgcolor: '#00F5FF', color: '#000', fontWeight: 800 }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
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
  showPasswordReset,
  setShowPasswordReset,
  resetEmailSent,
  handlePasswordReset,
  handleCancelPasswordReset,
  onPublicProfileToggle
}: any) => {
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

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
      try {
        const { getAllNotes, deleteNote } = await import('@/lib/appwrite');
        const all = await getAllNotes();
        for (const note of all.documents) {
          try { await deleteNote(note.$id); } catch (e) { console.warn('Failed to delete note', note.$id, e); }
        }
      } catch (inner) {
        console.warn('Failed to bulk delete notes before account deletion', inner);
      }

      try { await account.deleteSessions(); } catch (e) { console.warn('Failed to delete sessions', e); }
      try { 
        const updated = await account.updatePrefs({ ...(user.prefs || {}), deletedAt: new Date().toISOString() });
        const uid = (updated && (updated.$id || (updated as any).id)) || (user && (user.$id || (user as any).id));
        if (uid) await updateUser(uid, { deletedAt: updated.prefs?.deletedAt || new Date().toISOString() });
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
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 6, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
        Account Settings
      </Typography>

      <Stack spacing={6}>
        {/* Email Status */}
        <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <EmailIcon sx={{ color: isVerified ? '#66bb6a' : '#ff4d4d' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Email Status</Typography>
              <Typography variant="body2" sx={{ color: isVerified ? '#66bb6a' : '#ff4d4d' }}>
                {isVerified ? 'Verified' : 'Not verified'}
              </Typography>
            </Box>
            {!isVerified && (
              <Button variant="outlined" size="small" onClick={() => router.push('/verify')} sx={{ borderRadius: '8px', color: '#00F5FF', borderColor: '#00F5FF' }}>
                Verify Now
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Password Section */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LockIcon sx={{ color: '#00F5FF' }} /> Password
          </Typography>
          <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Account Password</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Reset or set your account password</Typography>
              </Box>
              {!showPasswordReset && (
                <Button 
                  variant="outlined" 
                  onClick={() => setShowPasswordReset(true)}
                  sx={{ borderRadius: '12px', color: '#00F5FF', borderColor: 'rgba(0, 245, 255, 0.3)' }}
                >
                  Reset
                </Button>
              )}
            </Stack>
            
            {showPasswordReset && (
              <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {!resetEmailSent ? (
                  <Stack spacing={3}>
                    <Alert severity="warning" sx={{ borderRadius: '16px', bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                      Send password reset link to: <strong>{user?.email}</strong>
                    </Alert>
                    <Stack direction="row" spacing={2}>
                      <Button variant="contained" fullWidth onClick={handlePasswordReset} sx={{ bgcolor: '#00F5FF', color: '#000', fontWeight: 800 }}>
                        Send Reset Link
                      </Button>
                      <Button variant="outlined" fullWidth onClick={handleCancelPasswordReset} sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    <Alert severity="success" sx={{ borderRadius: '16px', bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                      Password reset email sent! Check your inbox.
                    </Alert>
                    <Button variant="outlined" fullWidth onClick={handleCancelPasswordReset} sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      Done
                    </Button>
                  </Stack>
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Public Profile Toggle */}
        <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={!!getUserField(user, 'publicProfile')} 
                onChange={(e) => onPublicProfileToggle && onPublicProfileToggle(e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00F5FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00F5FF' } }}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white' }}>Make Profile Public</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Allow other users to find your profile and share notes with you</Typography>
              </Box>
            }
            sx={{ width: '100%', justifyContent: 'space-between', m: 0, flexDirection: 'row-reverse' }}
          />
        </Paper>

        {/* Danger Zone */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#ff4d4d', mb: 3 }}>Danger Zone</Typography>
          <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'rgba(255, 77, 77, 0.05)', border: '1px solid rgba(255, 77, 77, 0.1)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
              Deleting your account will permanently remove your notes and settings. This action cannot be undone.
            </Typography>
            {!showDelete ? (
              <Button 
                variant="outlined" 
                onClick={() => setShowDelete(true)}
                sx={{ color: '#ff4d4d', borderColor: 'rgba(255, 77, 77, 0.3)', '&:hover': { borderColor: '#ff4d4d', bgcolor: 'rgba(255, 77, 77, 0.05)' } }}
              >
                Delete Account
              </Button>
            ) : (
              <Stack spacing={3}>
                <TextField
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(255, 77, 77, 0.3)' }, '&:hover fieldset': { borderColor: '#ff4d4d' } }
                  }}
                />
                {deleteError && <Typography variant="caption" sx={{ color: '#ff4d4d' }}>{deleteError}</Typography>}
                {deleteSuccess && <Typography variant="caption" sx={{ color: '#4caf50' }}>{deleteSuccess}</Typography>}
                <Stack direction="row" spacing={2}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    disabled={isDeleting || deleteConfirm !== 'DELETE'} 
                    onClick={handleDeleteAccount}
                    sx={{ bgcolor: '#ff4d4d', color: 'white', fontWeight: 800, '&:hover': { bgcolor: '#d32f2f' } }}
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                  </Button>
                  <Button variant="outlined" fullWidth onClick={() => { setShowDelete(false); setDeleteConfirm(''); setDeleteError(''); }} sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};


