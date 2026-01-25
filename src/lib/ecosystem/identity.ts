import { databases, CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, Query, Permission, Role } from '../appwrite';
import { getEffectiveUsername, getEffectiveDisplayName } from '../utils';

const PROFILE_SYNC_KEY = 'whisperr_ecosystem_identity_synced';

/**
 * Ensures the user has a record in the global WhisperrConnect Directory.
 * Uses a lightweight "local-first" check to avoid redundant DB calls.
 */
export async function ensureGlobalIdentity(user: any, force = false) {
    if (!user?.$id) return;

    // Efficiency check: if we've already synced this session on this device, skip.
    if (typeof window !== 'undefined' && !force) {
        const lastSync = localStorage.getItem(PROFILE_SYNC_KEY);
        // Only skip if sync happened in the last 24 hours
        if (lastSync && (Date.now() - parseInt(lastSync)) < 24 * 60 * 60 * 1000) {
            return;
        }
    }

    try {
        // Check if profile exists in global directory
        let profile;
        try {
            profile = await databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id);
        } catch (e: any) {
            if (e.code === 404) {
                // Create new global profile
                const username = getEffectiveUsername(user) || `user${user.$id.slice(0, 6)}`;
                const displayName = getEffectiveDisplayName(user);

                profile = await databases.createDocument(
                    CONNECT_DATABASE_ID,
                    CONNECT_COLLECTION_ID_USERS,
                    user.$id,
                    {
                        username,
                        displayName,
                        appsActive: ['note'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        bio: '',
                        avatarUrl: user.avatarUrl || null,
                        privacySettings: JSON.stringify({ public: true }) // Discoverable by default
                    },
                    [
                        Permission.read(Role.any()), // Crucial for discoverability
                        Permission.update(Role.user(user.$id)),
                        Permission.delete(Role.user(user.$id))
                    ]
                );
            } else {
                throw e;
            }
        }

        // Update active apps list if 'note' is missing
        if (profile && Array.isArray(profile.appsActive) && !profile.appsActive.includes('note')) {
            await databases.updateDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id, {
                appsActive: [...profile.appsActive, 'note'],
                updatedAt: new Date().toISOString()
            });
        }

        // Mark as successfully synced
        if (typeof window !== 'undefined') {
            localStorage.setItem(PROFILE_SYNC_KEY, Date.now().toString());
        }
    } catch (error) {
        console.warn('[Identity] Global identity sync failed:', error);
        // Non-fatal, so we don't block the app
    }
}

/**
 * Searches for users across the entire ecosystem via the global directory.
 */
export async function searchGlobalUsers(query: string, limit = 10) {
    if (!query || query.length < 2) return [];

    try {
        const res = await databases.listDocuments(
            CONNECT_DATABASE_ID,
            CONNECT_COLLECTION_ID_USERS,
            [
                Query.or([
                    Query.startsWith('username', query.toLowerCase()),
                    Query.search('displayName', query)
                ]),
                Query.limit(limit)
            ]
        );

        return res.documents.map(doc => ({
            id: doc.$id,
            type: 'user' as const,
            title: doc.displayName || doc.username,
            subtitle: `@${doc.username}`,
            icon: 'person', // caller handles mapping to actual icon component
            avatar: doc.avatarUrl,
            apps: doc.appsActive || []
        }));
    } catch (error) {
        console.error('[Identity] Global search failed:', error);
        return [];
    }
}
