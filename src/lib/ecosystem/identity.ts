import { databases, CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, Query, Permission, Role } from '../appwrite';
import { getEffectiveUsername, getEffectiveDisplayName } from '../utils';

const PROFILE_SYNC_KEY = 'whisperr_identity_synced_v2';
const SESSION_SYNC_KEY = 'whisperr_session_identity_ok';

/**
 * Ensures the user has a record in the global WhisperrConnect Directory.
 * This is the 'Universal Identity Hook' that enables ecosystem discovery.
 */
export async function ensureGlobalIdentity(user: any, force = false) {
    if (!user?.$id || typeof window === 'undefined') return;

    // Layered Caching
    if (!force && sessionStorage.getItem(SESSION_SYNC_KEY)) return;
    const lastSync = localStorage.getItem(PROFILE_SYNC_KEY);
    if (!force && lastSync && (Date.now() - parseInt(lastSync)) < 24 * 60 * 60 * 1000) {
        sessionStorage.setItem(SESSION_SYNC_KEY, '1');
        return;
    }

    try {
        const { account } = await import('../appwrite');
        const [prefs, profile] = await Promise.all([
            account.getPrefs(),
            databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id).catch(() => null)
        ]);

        let username = user.username || prefs?.username || user.name || user.email?.split('@')[0];
        username = String(username).toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 50);
        if (!username) username = `user_${user.$id.slice(0, 8)}`;

        const profileData = {
            username,
            displayName: user.name || username,
            updatedAt: new Date().toISOString(),
            avatarUrl: user.avatarUrl || user.avatar || null,
            walletAddress: user.walletAddress || null,
            bio: profile?.bio || ""
        };

        if (!profile) {
            await databases.createDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id, {
                ...profileData,
                createdAt: new Date().toISOString(),
            }, [
                Permission.read(Role.any()),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id))
            ]);
        } else {
            if (profile.username !== username) {
                await databases.updateDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id, profileData);
            }
        }

        if (prefs.username !== username) {
            await account.updatePrefs({ ...prefs, username });
        }

        localStorage.setItem(PROFILE_SYNC_KEY, Date.now().toString());
        sessionStorage.setItem(SESSION_SYNC_KEY, '1');
    } catch (error) {
        console.warn('[Identity] Background sync deferred:', error);
    }
}

/**
 * Searches for users across the entire ecosystem via the global directory.
 * Supports email, username, and display name.
 */
export async function searchGlobalUsers(query: string, limit = 10) {
    const cleaned = query.trim().replace(/^@/, '');
    if (!query || cleaned.length < 2) return [];

    try {
        // 1. Primary search: ONLY username (indexed)
        let results: any[] = [];
        try {
            const res = await databases.listDocuments(
                CONNECT_DATABASE_ID,
                CONNECT_COLLECTION_ID_USERS,
                [
                    Query.startsWith('username', cleaned.toLowerCase()),
                    Query.limit(limit)
                ]
            );
            results = res.documents.map(doc => ({
                id: doc.$id,
                type: 'user' as const,
                title: doc.displayName || doc.username,
                subtitle: `@${doc.username}`,
                icon: 'person',
                avatar: doc.avatarUrl,
                profilePicId: doc.avatarFileId || doc.profilePicId,
                apps: doc.appsActive || []
            }));
        } catch (e) {
            console.warn('[Identity] Username search failed:', e);
        }

        // 2. Secondary Fallback: Search by 'name' (Fulltext index in note table)
        if (results.length < 5) {
            try {
                const { APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_USERS } = await import('../appwrite');
                const noteRes = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_TABLE_ID_USERS,
                    [
                        Query.search('name', cleaned),
                        Query.limit(5)
                    ]
                );

                for (const doc of noteRes.documents) {
                    if (!results.find(r => r.id === doc.$id)) {
                        results.push({
                            id: doc.$id,
                            type: 'user' as const,
                            title: doc.name || doc.email?.split('@')[0] || doc.$id.slice(0, 8),
                            subtitle: doc.username ? `@${doc.username}` : doc.email,
                            icon: 'person',
                            avatar: doc.avatar || null,
                            profilePicId: doc.profilePicId || doc.avatarFileId,
                            apps: ['note']
                        });
                    }
                }
            } catch (err) {
                // Ignore fallback errors
            }
        }

        return results;
    } catch (error) {
        console.error('[Identity] Global search failed:', error);
        return [];
    }
}
