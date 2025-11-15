import { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role, TablesDB, OAuthProvider } from 'appwrite';
import type {
  Users,
  Notes,
  Tags,
  ApiKeys,
  Comments,
  Extensions,
  Reactions,
  Collaborators,
  ActivityLog,
  Settings,
} from '../types/appwrite';

import {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    listUsers,
    searchUsers,
} from './appwrite/user-profile';

import { createRevision, pruneRevisions } from '@/lib/revisions';

// Named re-exports for user profile helpers
export { createUser, getUser, updateUser, deleteUser, listUsers, searchUsers };

export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '67fe9627001d97e37ef3';
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const functions = new Functions(client);

// export app public uri
 export const APP_URI = process.env.NEXT_PUBLIC_APP_URI ?? 'http://localhost:3000';

// Appwrite config IDs from env
export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const APPWRITE_TABLE_ID_USERS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_USERS!;
export const APPWRITE_TABLE_ID_NOTES = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTES!;
export const APPWRITE_TABLE_ID_TAGS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_TAGS!;
export const APPWRITE_TABLE_ID_APIKEYS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_APIKEYS!;
export const APPWRITE_TABLE_ID_COMMENTS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_COMMENTS!;
export const APPWRITE_TABLE_ID_EXTENSIONS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_EXTENSIONS!;
export const APPWRITE_TABLE_ID_REACTIONS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_REACTIONS!;
export const APPWRITE_TABLE_ID_COLLABORATORS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_COLLABORATORS!;
export const APPWRITE_TABLE_ID_ACTIVITYLOG = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_ACTIVITYLOG!;
export const APPWRITE_TABLE_ID_SETTINGS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_SETTINGS!;
export const APPWRITE_TABLE_ID_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_SUBSCRIPTIONS!;

export const APPWRITE_BUCKET_PROFILE_PICTURES = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_PROFILE_PICTURES!;
export const APPWRITE_BUCKET_NOTES_ATTACHMENTS = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_NOTES_ATTACHMENTS!;
export const APPWRITE_BUCKET_EXTENSION_ASSETS = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_EXTENSION_ASSETS!;
export const APPWRITE_BUCKET_BACKUPS = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_BACKUPS!;
export const APPWRITE_BUCKET_TEMP_UPLOADS = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_TEMP_UPLOADS!;

export { client, account, databases, tablesDB, storage, functions, ID, Query, Permission, Role, OAuthProvider };

function cleanDocumentData<T>(data: Partial<T>): Record<string, any> {
  const { $id, $sequence, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...cleanData } = data as any;
  return cleanData;
}

// --- USER SESSION ---

export async function getCurrentUser(): Promise<Users | null> {
  try {
    return await account.get() as unknown as Users;
  } catch {
    return null;
  }
}

// Unified resolver: attempts global session then cookie-based fallback
export async function resolveCurrentUser(req?: { headers: { get(k: string): string | null } } | null): Promise<Users | null> {
  const direct = await getCurrentUser();
  if (direct && direct.$id) return direct;
  if (req) {
    const fallback = await getCurrentUserFromRequest(req as any);
    if (fallback && (fallback as any).$id) return fallback;
  }
  return null;
}

// Per-request user fetch using incoming Cookie header (fallback when global client session missing)
// Accepts a minimal object with headers.get('cookie') capability (e.g., NextRequest)
export async function getCurrentUserFromRequest(req: { headers: { get(k: string): string | null } } | null | undefined): Promise<Users | null> {
  try {
    if (!req) return null;
    const cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
    if (!cookieHeader) return null;
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'Cookie': cookieHeader,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Basic shape check
    if (!data || typeof data !== 'object' || !data.$id) return null;
    return data as Users;
  } catch (e) {
    console.error('getCurrentUserFromRequest error', e);
    return null;
  }
}

// --- EMAIL VERIFICATION ---

export async function sendEmailVerification(redirectUrl: string) {
  return account.createVerification(redirectUrl);
}

export async function completeEmailVerification(userId: string, secret: string) {
  return account.updateVerification(userId, secret);
}

export async function getEmailVerificationStatus(): Promise<boolean> {
  try {
    const user = await account.get();
    return !!user.emailVerification;
  } catch {
    return false;
  }
}

// --- PASSWORD RESET ---

export async function sendPasswordResetEmail(email: string, redirectUrl: string) {
  return account.createRecovery(email, redirectUrl);
}

export async function completePasswordReset(userId: string, secret: string, password: string) {
  return account.updateRecovery(userId, secret, password);
}

// --- NOTES CRUD ---

export async function createNote(data: Partial<Notes>) {
  // Plan limit enforcement removed: notes are now unlimited across all plans.
  // (Previous enforcement block retained in git history for reference.)
  const user = await getCurrentUser();
  if (!user || !user.$id) throw new Error("User not authenticated");
  const now = new Date().toISOString();
  const cleanData = cleanDocumentData(data);
  // Remove attachments from creation payload as it's initialized separately
  const { attachments, ...noteData } = cleanData;
  const initialPermissions = [
    Permission.read(Role.user(user.$id)),
    Permission.update(Role.user(user.$id)),
    Permission.delete(Role.user(user.$id))
  ];
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_NOTES,
    ID.unique(),
    {
      ...noteData,
      userId: user.$id,
      id: null,
      createdAt: now,
      updatedAt: now,
      attachments: null
    },
    initialPermissions
  );
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_NOTES,
    doc.$id,
    { id: doc.$id }
  );
  // Dual-write tags to note_tags pivot including tagId resolution
  try {
    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
    const tagsCollection = APPWRITE_TABLE_ID_TAGS;
    const rawTags: string[] = Array.isArray((data as any).tags) ? (data as any).tags.filter(Boolean) : [];
    if (rawTags.length) {
      const unique = Array.from(new Set(rawTags.map(t => t.trim()))).filter(Boolean);
      if (unique.length) {
        // Preload existing tag docs for user (only those needed)
        let existingTagDocs: Record<string, any> = {};
        try {
          const existingTagsRes = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            tagsCollection,
            [Query.equal('userId', user.$id), Query.equal('nameLower', unique.map(t => t.toLowerCase())), Query.limit(unique.length)] as any
          );
          for (const td of existingTagsRes.documents as any[]) {
            if (td.nameLower) existingTagDocs[td.nameLower] = td;
          }
        } catch (tagListErr) {
          console.error('tag preload failed', tagListErr);
        }
        // Create missing tag docs (best-effort, ignoring races)
        for (const tagName of unique) {
          const key = tagName.toLowerCase();
          if (!existingTagDocs[key]) {
            try {
              const created = await databases.createDocument(
                APPWRITE_DATABASE_ID,
                tagsCollection,
                ID.unique(),
                { name: tagName, nameLower: key, userId: user.$id, createdAt: now, usageCount: 0 }
              );
              existingTagDocs[key] = created;
            } catch (createTagErr: any) {
              // Possible race: re-fetch single
              try {
                const retry = await databases.listDocuments(
                  APPWRITE_DATABASE_ID,
                  tagsCollection,
                  [Query.equal('userId', user.$id), Query.equal('nameLower', key), Query.limit(1)] as any
                );
                if (retry.documents.length) existingTagDocs[key] = retry.documents[0];
              } catch {}
            }
          }
        }
        // Fetch existing pivot rows once
        const existingPivot = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          noteTagsCollection,
          [Query.equal('noteId', doc.$id), Query.limit(500)] as any
        );
        const existingPairs = new Set(existingPivot.documents.map((p: any) => `${p.tagId || ''}::${p.tag || ''}`));
        for (const tagName of unique) {
          const key = tagName.toLowerCase();
          const tagDoc = existingTagDocs[key];
          const tagId = tagDoc ? (tagDoc.$id || tagDoc.id) : undefined;
          if (!tagId) continue; // must have tagId for unique index
          const pairKey = `${tagId}::${tagName}`;
          // Increment usage count (best-effort)
          adjustTagUsage(user.$id, tagName, 1);
          if (existingPairs.has(pairKey)) continue;
          try {
            await databases.createDocument(
              APPWRITE_DATABASE_ID,
              noteTagsCollection,
              ID.unique(),
              { noteId: doc.$id, tagId, tag: tagName, userId: user.$id, createdAt: now }
            );
          } catch (e: any) {
            console.error('note_tags create failed', e?.message || e);
          }
        }
      }
    }
  } catch (e) {
    console.error('dual-write note_tags error', e);
  }
  return await getNote(doc.$id);
}

export async function getNote(noteId: string): Promise<Notes> {
  const doc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, noteId) as any;
  try {
    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
    const pivot = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      noteTagsCollection,
      [Query.equal('noteId', noteId), Query.limit(200)] as any
    );
    if (pivot.documents.length) {
      const tags = Array.from(new Set(pivot.documents.map((p: any) => p.tag).filter(Boolean)));
      (doc as any).tags = tags;
    }
  } catch (e) {
    // Non-fatal
  }
  if (!(doc as any).attachments || !Array.isArray((doc as any).attachments)) {
    (doc as any).attachments = [];
  }
  return doc as Notes;
}

export async function updateNote(noteId: string, data: Partial<Notes>) {
  const cleanData = cleanDocumentData(data);
  const { id, userId, ...rest } = cleanData;
  const updatedAt = new Date().toISOString();
  const updatedData = { ...rest, updatedAt };
  const before = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, noteId) as any;
  const doc = await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, noteId, updatedData) as any;
  
  // Create revision using new system (handles diff, validation, etc.)
  try {
    await createRevision(noteId, before, doc, 'manual');
    
    // Prune old revisions based on user plan (best-effort, non-blocking)
    pruneRevisions(noteId, before.userId).catch(e => 
      console.error('Revision pruning failed (non-blocking):', e)
    );
  } catch (revErr) {
    console.error('Revision tracking failed:', revErr);
    // Don't break note updates if revision system fails
  }
  
  // Handle tags if provided
  try {
    if (Array.isArray((data as any).tags)) {
      const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
      const tagsCollection = APPWRITE_TABLE_ID_TAGS;
      const incomingRaw: string[] = (data as any).tags.filter(Boolean).map((t: string) => t.trim());
      const normalizedIncoming = Array.from(new Set(incomingRaw)).filter(Boolean);
      const incomingSet = new Set(normalizedIncoming);
      const currentUser = await getCurrentUser();

      // Preload or create tag documents for all incoming
      const tagDocs: Record<string, any> = {};
      if (normalizedIncoming.length && currentUser?.$id) {
        try {
          const existingTagsRes = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            tagsCollection,
            [Query.equal('userId', currentUser.$id), Query.equal('nameLower', normalizedIncoming.map(t => t.toLowerCase())), Query.limit(normalizedIncoming.length)] as any
          );
          for (const td of existingTagsRes.documents as any[]) {
            if (td.nameLower) tagDocs[td.nameLower] = td;
          }
        } catch (preErr) {
          console.error('updateNote tag preload failed', preErr);
        }
        for (const tagName of normalizedIncoming) {
          const key = tagName.toLowerCase();
          if (!tagDocs[key]) {
            try {
              const created = await databases.createDocument(
                APPWRITE_DATABASE_ID,
                tagsCollection,
                ID.unique(),
                { name: tagName, nameLower: key, userId: currentUser?.$id, createdAt: updatedAt, usageCount: 0 }
              );
              tagDocs[key] = created;
            } catch (createErr) {
              // Race: re-fetch
              try {
                const retry = await databases.listDocuments(
                  APPWRITE_DATABASE_ID,
                  tagsCollection,
                  [Query.equal('userId', currentUser?.$id), Query.equal('nameLower', key), Query.limit(1)] as any
                );
                if (retry.documents.length) tagDocs[key] = retry.documents[0];
              } catch {}
            }
          }
        }
      }

      // Fetch existing pivot rows
      const existingPivot = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        noteTagsCollection,
        [Query.equal('noteId', noteId), Query.limit(500)] as any
      );
      const existingByTag: Record<string, any> = {};
      const existingPairs = new Set<string>();
      for (const p of existingPivot.documents as any[]) {
        if (p.tag) existingByTag[p.tag] = p;
        if (p.tagId && p.tag) existingPairs.add(`${p.tagId}::${p.tag}`);
      }

      // Patch legacy rows lacking tagId if possible
      for (const p of existingPivot.documents as any[]) {
        if (!p.tagId && p.tag) {
          const key = p.tag.toLowerCase();
          const tagDoc = tagDocs[key];
          if (tagDoc) {
            try {
              await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                noteTagsCollection,
                p.$id,
                { tagId: tagDoc.$id || tagDoc.id }
              );
              existingPairs.add(`${tagDoc.$id || tagDoc.id}::${p.tag}`);
            } catch (patchErr) {
              console.error('legacy pivot patch failed', patchErr);
            }
          }
        }
      }

      // Add missing pivots
      for (const tagName of normalizedIncoming) {
        const key = tagName.toLowerCase();
        const tagDoc = tagDocs[key];
        const tagId = tagDoc ? (tagDoc.$id || tagDoc.id) : undefined;
        if (!tagId) continue;
        const pairKey = `${tagId}::${tagName}`;
        if (existingPairs.has(pairKey)) continue;
        // Increment usage for new association only if not already there
        adjustTagUsage(currentUser?.$id, tagName, 1);
        try {
          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            noteTagsCollection,
            ID.unique(),
            { noteId, tagId, tag: tagName, userId: currentUser?.$id || null, createdAt: updatedAt }
          );
          existingPairs.add(pairKey);
        } catch (ie) {
          console.error('note_tags create (updateNote) failed', ie);
        }
      }

      // Remove stale associations (those existingByTag where tag not in incoming)
      for (const [tagName, pivotDoc] of Object.entries(existingByTag)) {
        if (!incomingSet.has(tagName)) {
          // Decrement usage
          adjustTagUsage(currentUser?.$id, tagName, -1);
          try {
            await databases.deleteDocument(
              APPWRITE_DATABASE_ID,
              noteTagsCollection,
              (pivotDoc as any).$id
            );
          } catch (de) {
            console.error('note_tags stale delete failed', de);
          }
        }
      }
    }
  } catch (e) {
    console.error('dual-write note_tags update error', e);
  }
  return doc as Notes;
}

export async function deleteNote(noteId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, noteId);
}

export async function listNotes(queries: any[] = [], limit: number = 100) {
  // Default: notes for current user
  if (!queries.length) {
    const user = await getCurrentUser();
    if (!user || !user.$id) {
      return { documents: [], total: 0 };
    }
    queries = [Query.equal('userId', user.$id)];
  }

  const finalQueries = [
    ...queries,
    Query.limit(limit),
    Query.orderDesc('$createdAt')
  ];

  const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, finalQueries);
  const notes = res.documents as unknown as Notes[];

  // Hydrate tags from pivot collection in batch (best-effort)
  try {
    if (notes.length) {
      const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
      const noteIds = notes.map((n: any) => n.$id || (n as any).id).filter(Boolean);
      if (noteIds.length) {
        // Appwrite supports passing array to Query.equal for multiple values
        const pivotRes = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          noteTagsCollection,
          [Query.equal('noteId', noteIds), Query.limit(Math.min(1000, noteIds.length * 10))] as any
        );
        const tagMap: Record<string, Set<string>> = {};
        for (const p of pivotRes.documents as any[]) {
          if (!p.noteId || !p.tag) continue;
            if (!tagMap[p.noteId]) tagMap[p.noteId] = new Set();
          tagMap[p.noteId].add(p.tag);
        }
        for (const n of notes as any[]) {
          const id = n.$id || n.id;
          if (id && tagMap[id] && tagMap[id].size) {
            n.tags = Array.from(tagMap[id]);
          }
          if (!(n as any).attachments || !Array.isArray((n as any).attachments)) {
            (n as any).attachments = [];
          }
        }
      }
    }
  } catch (e) {
    // Non-fatal hydration error
  }

  return { ...res, documents: notes };
}

// New function to get all notes with cursor pagination
export async function getAllNotes(): Promise<{ documents: Notes[], total: number }> {
  const user = await getCurrentUser();
  if (!user || !user.$id) {
    return { documents: [], total: 0 };
  }
  let allNotes: Notes[] = [];
  let cursor: string | undefined;
  const batchSize = 100;
  while (true) {
    const queries: any[] = [
      Query.equal('userId', user.$id),
      Query.limit(batchSize),
      Query.orderDesc('$createdAt')
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, queries);
    const notes = res.documents as unknown as Notes[];
    allNotes.push(...notes);
    if (notes.length < batchSize) break;
    cursor = notes[notes.length - 1].$id;
  }
  // Hydrate all tags in one or multiple batches if necessary
  try {
    if (allNotes.length) {
      const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
      const noteIds = allNotes.map((n: any) => n.$id || (n as any).id).filter(Boolean);
      if (noteIds.length) {
        // Appwrite max limit per request (assuming 100); chunk ids
        const chunk = <T,>(arr: T[], size: number): T[][] => arr.length ? [arr.slice(0, size), ...chunk(arr.slice(size), size)] : [];
        const idChunks = chunk(noteIds, 100);
        const tagMap: Record<string, Set<string>> = {};
        for (const ids of idChunks) {
          const pivotRes = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            noteTagsCollection,
            [Query.equal('noteId', ids), Query.limit(Math.min(1000, ids.length * 10))] as any
          );
          for (const p of pivotRes.documents as any[]) {
            if (!p.noteId || !p.tag) continue;
            if (!tagMap[p.noteId]) tagMap[p.noteId] = new Set();
            tagMap[p.noteId].add(p.tag);
          }
        }
        for (const n of allNotes as any[]) {
          const id = n.$id || n.id;
            if (id && tagMap[id] && tagMap[id].size) {
            n.tags = Array.from(tagMap[id]);
          }
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return { documents: allNotes, total: allNotes.length };
}

// --- TAGS CRUD ---

export async function createTag(data: Partial<Tags>) {
  // Get current user for userId
  const user = await getCurrentUser();
  if (!user || !user.$id) throw new Error("User not authenticated");
  
  // Create tag with proper timestamps
  const now = new Date().toISOString();
  const cleanData = cleanDocumentData(data);
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_TAGS,
    ID.unique(),
    {
      ...cleanData,
      userId: user.$id,
      id: null, // id will be set after creation
      createdAt: now
    }
  );
  
  // Patch the tag to set id = $id (Appwrite does not set this automatically)
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_TAGS,
    doc.$id,
    { id: doc.$id }
  );
  
  // Return the updated document as Tags type
  return await getTag(doc.$id);
}

export async function getTag(tagId: string): Promise<Tags> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, tagId) as Promise<Tags>;
}

export async function updateTag(tagId: string, data: Partial<Tags>) {
  // Do not allow updating id or userId directly
  const { id, userId, ...rest } = data;
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, tagId, cleanDocumentData(rest));
}

export async function deleteTag(tagId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, tagId);
}

export async function listTags(queries: any[] = [], limit: number = 100) {
  // By default, fetch all tags for the current user
  if (!queries.length) {
    const user = await getCurrentUser();
    if (!user || !user.$id) {
      // Return empty result instead of throwing error for unauthenticated users
      return { 
        documents: [], 
        total: 0 
      };
    }
    queries = [Query.equal("userId", user.$id)];
  }
  
  // Add limit and ordering
  const finalQueries = [
    ...queries,
    Query.limit(limit),
    Query.orderDesc("$createdAt")
  ];
  
  // Cast documents to Tags[]
  const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, finalQueries);
  return { ...res, documents: res.documents as unknown as Tags[] };
}

// New function to get all tags with cursor pagination
export async function getAllTags(): Promise<{ documents: Tags[], total: number }> {
  const user = await getCurrentUser();
  if (!user || !user.$id) {
    return { documents: [], total: 0 };
  }

  let allTags: Tags[] = [];
  let cursor: string | undefined = undefined;
  const batchSize = 100;
  
  while (true) {
    const queries = [
      Query.equal("userId", user.$id),
      Query.limit(batchSize),
      Query.orderDesc("$createdAt")
    ];
    
    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }
    
    const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, queries);
    const tags = res.documents as unknown as Tags[];
    
    allTags = [...allTags, ...tags];
    
    if (tags.length < batchSize) {
      break;
    }
    
    cursor = tags[tags.length - 1].$id;
  }
  
  return {
    documents: allTags,
    total: allTags.length
  };
}

export async function listTagsByUser(userId: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_TAGS, [Query.equal('userId', userId)]);
}

// Internal helper: adjust tag usage count (best-effort, non-atomic)
async function adjustTagUsage(userId: string | null | undefined, tagName: string, delta: number) {
  try {
    if (!userId || !tagName) return;
    const res = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_TAGS,
      [Query.equal('userId', userId), Query.equal('name', tagName), Query.limit(1)] as any
    );
    if (res.documents.length) {
      const doc: any = res.documents[0];
      const current = typeof doc.usageCount === 'number' && !isNaN(doc.usageCount) ? doc.usageCount : 0;
      const next = current + delta;
      if (next >= 0 && next !== current) {
        try {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_TABLE_ID_TAGS,
            doc.$id,
            { usageCount: next }
          );
        } catch (upErr) {
          console.error('adjustTagUsage update failed', upErr);
        }
      }
    }
  } catch (e) {
    console.error('adjustTagUsage failed', e);
  }
}

// --- APIKEYS CRUD ---

export async function createApiKey(data: Partial<ApiKeys>) {
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_APIKEYS, ID.unique(), cleanDocumentData(data));
}

export async function getApiKey(apiKeyId: string): Promise<ApiKeys> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_APIKEYS, apiKeyId) as Promise<ApiKeys>;
}

export async function updateApiKey(apiKeyId: string, data: Partial<ApiKeys>) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_APIKEYS, apiKeyId, cleanDocumentData(data));
}

export async function deleteApiKey(apiKeyId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_APIKEYS, apiKeyId);
}

export async function listApiKeys(queries: any[] = []) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_APIKEYS, queries);
}

// --- COMMENTS CRUD ---

export async function createComment(noteId: string, content: string) {
  const user = await getCurrentUser();
  if (!user || !user.$id) throw new Error("User not authenticated");
  const data = {
    noteId,
    content,
    userId: user.$id,
    createdAt: new Date().toISOString(),
  };
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COMMENTS, ID.unique(), data);
}

export async function getComment(commentId: string): Promise<Comments> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COMMENTS, commentId) as Promise<Comments>;
}

export async function updateComment(commentId: string, data: Partial<Comments>) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COMMENTS, commentId, cleanDocumentData(data));
}

export async function deleteComment(commentId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COMMENTS, commentId);
}

export async function listComments(noteId: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COMMENTS, [Query.equal('noteId', noteId)]);
}

// --- EXTENSIONS CRUD ---

export async function createExtension(data: Partial<Extensions>) {
  // Get current user for authorId
  const user = await getCurrentUser();
  if (!user || !user.$id) throw new Error("User not authenticated");
  
  // Create extension with proper timestamps
  const now = new Date().toISOString();
  const cleanData = cleanDocumentData(data);
  
  // Set initial permissions - private by default (only owner can access)
  const initialPermissions = [
    Permission.read(Role.user(user.$id)),
    Permission.update(Role.user(user.$id)),
    Permission.delete(Role.user(user.$id))
  ];
  
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_EXTENSIONS,
    ID.unique(),
    {
      ...cleanData,
      authorId: user.$id,
      id: null, // id will be set after creation
      createdAt: now,
      updatedAt: now,
      isPublic: false // Default to private
    },
    initialPermissions
  );
  
  // Patch the extension to set id = $id (Appwrite does not set this automatically)
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_EXTENSIONS,
    doc.$id,
    { id: doc.$id }
  );
  
  // Return the updated document as Extensions type
  return await getExtension(doc.$id);
}

export async function getExtension(extensionId: string): Promise<Extensions> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_EXTENSIONS, extensionId) as Promise<Extensions>;
}

export async function updateExtension(extensionId: string, data: Partial<Extensions>) {
  // Use cleanDocumentData to remove Appwrite system fields and id/authorId
  const cleanData = cleanDocumentData(data);
  const { id, authorId, ...rest } = cleanData;
  
  // Add updatedAt timestamp
  const updatedData = {
    ...rest,
    updatedAt: new Date().toISOString()
  };
  
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_EXTENSIONS, extensionId, updatedData) as Promise<Extensions>;
}

export async function deleteExtension(extensionId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_EXTENSIONS, extensionId);
}

export async function listExtensions(queries: any[] = []) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_EXTENSIONS, queries);
}

// --- REACTIONS CRUD ---

export async function createReaction(data: Partial<Reactions>) {
  // Duplicate guard: ensure single (userId,targetType,targetId,emoji)
  try {
    if (data && (data as any).userId && (data as any).targetId && (data as any).emoji) {
      const userId = (data as any).userId;
      const targetId = (data as any).targetId;
      const emoji = (data as any).emoji;
      const targetType = (data as any).targetType;
      try {
        const existing = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_TABLE_ID_REACTIONS,
          [
            Query.equal('userId', userId),
            Query.equal('targetId', targetId),
            Query.equal('emoji', emoji),
            Query.equal('targetType', targetType),
            Query.limit(1)
          ] as any
        );
        if (existing.documents.length) {
          // Idempotent return existing document
            return existing.documents[0] as any;
        }
      } catch (listErr) {
        console.error('createReaction duplicate guard list failed', listErr);
      }
      // Attach createdAt if not present
      if (!(data as any).createdAt) {
        (data as any).createdAt = new Date().toISOString();
      }
    }
  } catch (guardErr) {
    console.error('createReaction duplicate guard failed', guardErr);
  }
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_REACTIONS, ID.unique(), cleanDocumentData(data));
}

export async function getReaction(reactionId: string): Promise<Reactions> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_REACTIONS, reactionId) as Promise<Reactions>;
}

export async function updateReaction(reactionId: string, data: Partial<Reactions>) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_REACTIONS, reactionId, cleanDocumentData(data));
}

export async function deleteReaction(reactionId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_REACTIONS, reactionId);
}

export async function listReactions(queries: any[] = []) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_REACTIONS, queries);
}

// --- COLLABORATORS CRUD ---

export async function createCollaborator(data: Partial<Collaborators>) {
  // Duplicate guard: unique per (noteId,userId)
  try {
    if (data && (data as any).noteId && (data as any).userId) {
      const noteId = (data as any).noteId;
      const userId = (data as any).userId;
      try {
        const existing = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_TABLE_ID_COLLABORATORS,
          [
            Query.equal('noteId', noteId),
            Query.equal('userId', userId),
            Query.limit(1)
          ] as any
        );
        if (existing.documents.length) {
          // Optionally update permission if provided and different
          if ((data as any).permission && existing.documents[0].permission !== (data as any).permission) {
            try {
              await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_TABLE_ID_COLLABORATORS,
                existing.documents[0].$id,
                { permission: (data as any).permission }
              );
              (existing.documents[0] as any).permission = (data as any).permission;
            } catch (upErr) {
              console.error('createCollaborator permission sync failed', upErr);
            }
          }
          return existing.documents[0] as any;
        }
      } catch (listErr) {
        console.error('createCollaborator duplicate guard list failed', listErr);
      }
      if (!(data as any).invitedAt) {
        (data as any).invitedAt = new Date().toISOString();
      }
      if (typeof (data as any).accepted === 'undefined') {
        (data as any).accepted = true;
      }
    }
  } catch (guardErr) {
    console.error('createCollaborator duplicate guard failed', guardErr);
  }
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COLLABORATORS, ID.unique(), cleanDocumentData(data));
}

export async function getCollaborator(collaboratorId: string): Promise<Collaborators> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COLLABORATORS, collaboratorId) as Promise<Collaborators>;
}

export async function updateCollaborator(collaboratorId: string, data: Partial<Collaborators>) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COLLABORATORS, collaboratorId, cleanDocumentData(data));
}

export async function deleteCollaborator(collaboratorId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COLLABORATORS, collaboratorId);
}

export async function listCollaborators(noteId: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_COLLABORATORS, [Query.equal('noteId', noteId)]);
}

// --- ACTIVITY LOG CRUD ---

export async function createActivityLog(data: Partial<ActivityLog>) {
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_ACTIVITYLOG, ID.unique(), cleanDocumentData(data));
}

export async function getActivityLog(activityLogId: string): Promise<ActivityLog> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_ACTIVITYLOG, activityLogId) as Promise<ActivityLog>;
}

export async function updateActivityLog(activityLogId: string, data: Partial<ActivityLog>) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_ACTIVITYLOG, activityLogId, cleanDocumentData(data));
}

export async function deleteActivityLog(activityLogId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_ACTIVITYLOG, activityLogId);
}

export async function listActivityLogs() {
  const user = await getCurrentUser();
  if (!user || !user.$id) throw new Error("User not authenticated");
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_ACTIVITYLOG, [Query.equal('userId', user.$id)]);
}

// --- SETTINGS CRUD ---

export async function createSettings(data: Pick<Settings, 'userId' | 'settings'> & { mode?: string }) {
  if (!data.userId) throw new Error("userId is required to create settings");
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_SETTINGS, data.userId, data);
}

export async function getSettings(settingsId: string): Promise<Settings> {
  return databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_SETTINGS, settingsId) as Promise<Settings>;
}

export async function updateSettings(settingsId: string, data: any) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_SETTINGS, settingsId, data);
}

export async function deleteSettings(settingsId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_SETTINGS, settingsId);
}

export async function listSettings(queries: any[] = []) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_SETTINGS, queries);
}

// AI Mode specific functions
export async function updateAIMode(userId: string, mode: string) {
  try {
    await getSettings(userId);
    return await updateSettings(userId, { mode });
  } catch (error) {
    // If settings don't exist, create them with the AI mode
    return await createSettings({ 
      userId, 
      settings: JSON.stringify({ theme: 'light', notifications: true }),
      mode 
    });
  }
}

export async function getAIMode(userId: string): Promise<string | null> {
  try {
    const settings = await getSettings(userId);
    return (settings as any).mode || 'standard';
  } catch (error) {
    return 'standard'; // Default to standard mode
  }
}

// --- STORAGE/BUCKETS ---
export async function uploadFile(bucketId: string, file: File, userId?: string) {
  try {
    const user = userId ? { $id: userId } : await getCurrentUser();
    if (!user?.$id) {
      throw new Error('User not authenticated for file upload');
    }

    const permissions = [
      Permission.read(Role.user(user.$id)),
      Permission.update(Role.user(user.$id)),
      Permission.delete(Role.user(user.$id))
    ];

    const result = await storage.createFile(bucketId, ID.unique(), file, permissions);
    return result;
  } catch (e: any) {
    console.error('[uploadFile] error', {
      bucketId,
      fileName: (file as any)?.name,
      fileSize: (file as any)?.size,
      fileType: (file as any)?.type,
      message: e?.message,
      code: e?.code,
      statusCode: e?.statusCode,
      type: e?.type
    });
    throw e;
  }
}

export async function getFile(bucketId: string, fileId: string) {
  return storage.getFile(bucketId, fileId);
}

export async function deleteFile(bucketId: string, fileId: string) {
  return storage.deleteFile(bucketId, fileId);
}

export async function listFiles(bucketId: string, queries: any[] = []) {
  return storage.listFiles(bucketId, queries);
}

// --- UTILITY ---

export async function listDocuments(collectionId: string, queries: any[] = []) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, collectionId, queries);
}

export async function getDocument(collectionId: string, documentId: string) {
  return databases.getDocument(APPWRITE_DATABASE_ID, collectionId, documentId);
}

export async function updateDocument(collectionId: string, documentId: string, data: any) {
  return databases.updateDocument(APPWRITE_DATABASE_ID, collectionId, documentId, data);
}

export async function deleteDocument(collectionId: string, documentId: string) {
  return databases.deleteDocument(APPWRITE_DATABASE_ID, collectionId, documentId);
}

// --- SUBSCRIPTIONS ---
// All subscription logic is now handled by the modular subscription provider.
// See src/lib/subscriptions/

// --- ADVANCED/SEARCH ---

export async function searchNotesByTitle(title: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, [Query.search('title', title)]);
}

export async function searchNotesByTag(tagId: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, [Query.contains('tags', tagId)]);
}

export async function getNotesByTag(tagId: string): Promise<Notes[]> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.$id) {
      return [];
    }

    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
    const pivotRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      noteTagsCollection,
      [Query.equal('tag', tagId), Query.limit(1000)] as any
    );

    const noteIds = pivotRes.documents.map((p: any) => p.noteId).filter(Boolean);
    if (!noteIds.length) {
      return [];
    }

    const notesRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_NOTES,
      [Query.equal('$id', noteIds), Query.equal('userId', user.$id), Query.orderDesc('$createdAt')] as any
    );

    const notes = notesRes.documents as unknown as Notes[];

    try {
      if (notes.length) {
        const pivotResForHydration = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          noteTagsCollection,
          [Query.equal('noteId', notes.map((n: any) => n.$id || (n as any).id).filter(Boolean)), Query.limit(Math.min(1000, notes.length * 10))] as any
        );
        const tagsByNoteId: { [noteId: string]: Set<string> } = {};
        pivotResForHydration.documents.forEach((p: any) => {
          const noteId = p.noteId;
          if (noteId) {
            if (!tagsByNoteId[noteId]) {
              tagsByNoteId[noteId] = new Set();
            }
            if (p.tag) {
              tagsByNoteId[noteId].add(p.tag);
            }
          }
        });
        notes.forEach((note: any) => {
          const noteId = note.$id || (note as any).id;
          if (noteId && tagsByNoteId[noteId]) {
            note.tags = Array.from(tagsByNoteId[noteId]);
          }
        });
      }
    } catch (e) {
      console.error('Error hydrating tags:', e);
    }

    return notes;
  } catch (error) {
    console.error('Error fetching notes by tag:', error);
    throw error;
  }
}

export async function listNotesByUser(userId: string) {
  return databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, [Query.equal('userId', userId)]);
}


export async function listPublicNotesByUser(userId: string) {
  return databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_NOTES,
    [Query.equal('isPublic', true), Query.equal('userId', userId)]
  );
}

// --- PRIVATE SHARING ---

export async function shareNoteWithUser(noteId: string, email: string, permission: 'read' | 'write' | 'admin' = 'read') {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    // First check if note exists and user owns it
    const note = await getNote(noteId);
    if (note.userId !== currentUser.$id) {
      throw new Error("Only note owner can share notes");
    }

    // Find user by email (check in Users collection)
    const usersList = await databases.listDocuments(
      APPWRITE_DATABASE_ID, 
      APPWRITE_TABLE_ID_USERS, 
      [Query.equal('email', email)]
    );

    if (usersList.documents.length === 0) {
      throw new Error(`No user found with email: ${email}`);
    }

    const targetUserId = usersList.documents[0].id || usersList.documents[0].$id;
    if (!targetUserId) throw new Error(`Invalid user data for email: ${email}`);

    return await shareNoteWithUserId(noteId, targetUserId, permission, email);
  } catch (error: any) {
    console.error('shareNoteWithUser error:', error);
    throw new Error(error.message || 'Failed to share note');
  }
}

// Share note directly with a known userId (used after search selection)
export async function shareNoteWithUserId(noteId: string, targetUserId: string, permission: 'read' | 'write' | 'admin' = 'read', emailForMessage?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    const note = await getNote(noteId);
    if (note.userId !== currentUser.$id) {
      throw new Error("Only note owner can share notes");
    }

    if (targetUserId === currentUser.$id) {
      throw new Error("Cannot share a note with yourself");
    }

    const existingShares = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COLLABORATORS,
      [
        Query.equal('noteId', noteId),
        Query.equal('userId', targetUserId)
      ]
    );

    if (existingShares.documents.length > 0) {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_TABLE_ID_COLLABORATORS,
        existingShares.documents[0].$id,
        { permission }
      );
    } else {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_TABLE_ID_COLLABORATORS,
        ID.unique(),
        {
          noteId,
          userId: targetUserId,
          permission,
          invitedAt: new Date().toISOString(),
          accepted: true
        }
      );
    }

    return { success: true, message: `Note shared${emailForMessage ? ' with ' + emailForMessage : ''}` };
  } catch (error: any) {
    console.error('shareNoteWithUserId error:', error);
    throw new Error(error.message || 'Failed to share note');
  }
}

export async function getSharedUsers(noteId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    // Get all collaborations for this note
    const collaborations = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COLLABORATORS,
      [Query.equal('noteId', noteId)]
    );

    // Get user details for each collaborator and include profile picture id when available
    const sharedUsers = await Promise.all(
      collaborations.documents.map(async (collab: any) => {
        try {
          const user: any = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_TABLE_ID_USERS,
            collab.userId
          );

          // Prefer the prefs.profilePicId field but fall back to a legacy avatar field if present
          const profilePicId = (user?.prefs && (user as any).prefs.profilePicId)
            ? (user as any).prefs.profilePicId
            : (user?.avatar || null);

          return {
            id: collab.userId,
            name: user.name,
            email: user.email,
            permission: collab.permission,
            collaborationId: collab.$id,
            profilePicId
          };
        } catch (error) {
          console.error('Error fetching user details:', error);
          return null;
        }
      })
    );

    return sharedUsers.filter(user => user !== null);
  } catch (error: any) {
    console.error('getSharedUsers error:', error);
    throw new Error(error.message || 'Failed to get shared users');
  }
}

export async function removeNoteSharing(noteId: string, targetUserId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    // Check if user owns the note
    const note = await getNote(noteId);
    if (note.userId !== currentUser.$id) {
      throw new Error("Only note owner can remove sharing");
    }

    // Find and delete the collaboration record
    const collaborations = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COLLABORATORS,
      [
        Query.equal('noteId', noteId),
        Query.equal('userId', targetUserId)
      ]
    );

    if (collaborations.documents.length > 0) {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_TABLE_ID_COLLABORATORS,
        collaborations.documents[0].$id
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error('removeNoteSharing error:', error);
    throw new Error(error.message || 'Failed to remove sharing');
  }
}

export async function getSharedNotes(): Promise<{ documents: Notes[], total: number }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { documents: [], total: 0 };

    // Get all collaborations where current user is a collaborator
    const collaborations = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COLLABORATORS,
      [Query.equal('userId', currentUser.$id)]
    );

    // Get note details for each collaboration
    const sharedNotes = await Promise.all(
      collaborations.documents.map(async (collab: any): Promise<Notes | null> => {
        try {
          const note = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_TABLE_ID_NOTES,
            collab.noteId
          ) as unknown as Notes;
          
          // Add sharing info to note
          (note as any).sharedPermission = collab.permission;
          (note as any).sharedAt = collab.invitedAt;
          // Ensure attachments is always an array for UI consistency
          if (!(note as any).attachments || !Array.isArray((note as any).attachments)) {
            (note as any).attachments = [];
          }
          
          return note;
        } catch (error) {
          console.error('Error fetching shared note:', error);
          return null;
        }
      })
    );

    const validNotes = (sharedNotes.filter((n: Notes | null): n is Notes => n !== null));
    
    return {
      documents: validNotes,
      total: validNotes.length
    };
  } catch (error: any) {
    console.error('getSharedNotes error:', error);
    return { documents: [], total: 0 };
  }
}

export async function getNoteWithSharing(noteId: string): Promise<(Notes & { isSharedWithUser?: boolean, sharePermission?: string, sharedBy?: any }) | null> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    const note = await getNote(noteId);
    
    // Check if note is shared with current user
    const collaboration = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COLLABORATORS,
      [
        Query.equal('noteId', noteId),
        Query.equal('userId', currentUser.$id)
      ]
    );

    let sharedBy = null;
    if (collaboration.documents.length > 0 && note.userId && note.userId !== currentUser.$id) {
      // Get details about who shared this note
      try {
        sharedBy = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_TABLE_ID_USERS,
          note.userId
        );
      } catch (error) {
        console.error('Error fetching note owner details:', error);
      }
    }

    return {
      ...note,
      isSharedWithUser: collaboration.documents.length > 0,
      sharePermission: collaboration.documents.length > 0 ? collaboration.documents[0].permission : undefined,
      sharedBy: sharedBy ? { name: sharedBy.name, email: sharedBy.email } : null
    };
  } catch (error) {
    console.error('getNoteWithSharing error:', error);
    return null;
  }
}

export async function getPublicNote(noteId: string): Promise<Notes | null> {
  try {
    const note = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID_NOTES, noteId) as unknown as Notes;
    
    // Only return note if it's public
    if (note.isPublic) {
      return note;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// --- PROFILE PICTURE HELPERS ---

export async function uploadProfilePicture(file: File) {
  return uploadFile(APPWRITE_BUCKET_PROFILE_PICTURES, file);
}

export async function getProfilePicture(fileId: string) {
  return storage.getFileView(APPWRITE_BUCKET_PROFILE_PICTURES, fileId);
}

export async function getFilePreview(bucketId: string, fileId: string, width: number = 64, height: number = 64) {
  return storage.getFilePreview(bucketId, fileId, width, height);
}

export async function getProfilePicturePreview(fileId: string, width: number = 64, height: number = 64) {
  return getFilePreview(APPWRITE_BUCKET_PROFILE_PICTURES, fileId, width, height);
}

export async function deleteProfilePicture(fileId: string) {
  return deleteFile(APPWRITE_BUCKET_PROFILE_PICTURES, fileId);
}

// --- NOTES ATTACHMENTS HELPERS (Legacy embedded + new collection) ---

// Basic upload wrapper (raw file upload only)
export async function uploadNoteAttachment(file: File, userId?: string) {
  const bucketId = APPWRITE_BUCKET_NOTES_ATTACHMENTS;
  const startedAt = Date.now();
  if (!bucketId) {
    const err: any = new Error('Missing notes attachments bucket id');
    err.code = 'MISSING_BUCKET_ID';
    console.error('[attachments] uploadNoteAttachment:config_error');
    throw err;
  }
  try {
    const res: any = await uploadFile(bucketId, file, userId);
    console.log('[attachments] uploadNoteAttachment:success', { bucketId, fileId: res.$id || res.id, durationMs: Date.now() - startedAt });
    return res;
  } catch (e: any) {
    console.error('[attachments] uploadNoteAttachment:error', { bucketId, error: e?.message || String(e) });
    throw e;
  }
}

export async function getNoteAttachment(fileId: string) {
  return getFile(APPWRITE_BUCKET_NOTES_ATTACHMENTS, fileId);
}

export async function deleteNoteAttachment(fileId: string) {
  return deleteFile(APPWRITE_BUCKET_NOTES_ATTACHMENTS, fileId);
}

// Attachment metadata shape (lightweight, embedded in note.attachments array as JSON string)
// We avoid schema change for now; each entry: { id: fileId, name, size, mime, createdAt }
interface EmbeddedAttachmentMeta {
  id: string;
  name: string;
  size: number;
  mime: string | null;
  createdAt: string;
}

function serializeAttachmentMeta(meta: EmbeddedAttachmentMeta): string {
  return JSON.stringify(meta);
}

function parseAttachmentMeta(raw: any): EmbeddedAttachmentMeta | null {
  if (!raw) return null;
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    if (typeof raw === 'object' && raw.id) return raw as EmbeddedAttachmentMeta;
  } catch {}
  return null;
}

function normalizeNoteAttachmentsField(note: any): EmbeddedAttachmentMeta[] {
  const arr: any[] = Array.isArray(note.attachments) ? note.attachments : [];
  const metas: EmbeddedAttachmentMeta[] = [];
  for (const entry of arr) {
    const meta = parseAttachmentMeta(entry);
    if (meta && meta.id) metas.push(meta);
  }
  return metas;
}

async function enforceAttachmentPlanLimit(userId: string, _currentCount: number, fileSizeBytes?: number) {
  try {
    const { getActivePlan } = await import('./subscriptions/index');
    const { plan } = await getActivePlan(userId);
    const { planPolicies } = await import('./subscriptions/policy');
    const policy: any = (planPolicies as any)[plan];
    if (fileSizeBytes) {
      const perFileLimitMB: number = policy.attachmentSizeMB;
      if (fileSizeBytes > perFileLimitMB * 1024 * 1024) {
        const err: any = new Error(`Attachment exceeds plan per-file limit (${perFileLimitMB}MB)`);
        err.code = 'ATTACHMENT_SIZE_LIMIT';
        err.limitMB = perFileLimitMB;
        throw err;
      }
    }
  } catch (e: any) {
    if (e?.code === 'ATTACHMENT_SIZE_LIMIT') throw e;
  }
}

// Public helpers to manage attachment association to a note
// Basic security: allow-list MIME types that align with bucket extension allowlist
// notes_attachments bucket allows: png, jpg, jpeg, webp, gif, pdf, md, txt
const ATTACHMENT_ALLOWED_MIME_PREFIXES = ['image/'];
const ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  // Common variants for text files
  'text/x-markdown',
  // Allow generic octet-stream as fallback for text files; will rely on extension for safety
  'application/octet-stream'
];

function sanitizeAttachmentFilename(name: string): string {
  try {
    if (!name) return 'attachment';
    // Strip path components (just in case)
    name = name.split('\\').pop()!.split('/').pop()!;
    // Replace spaces with underscores
    name = name.replace(/\s+/g, '_');
    // Remove disallowed chars (allow alnum, dash, underscore, dot)
    name = name.replace(/[^A-Za-z0-9._-]/g, '');
    // Enforce length bounds
    if (!name || name.length < 1) name = 'attachment';
    if (name.length > 120) name = name.slice(0, 120);
    // Ensure has an extension (best-effort) for common images if missing
    if (!name.includes('.')) name = name + '.bin';
    return name;
  } catch {
    return 'attachment';
  }
}

function validateAttachmentMime(mime: string | null | undefined) {
  if (!mime) return; // Allow unknown mime (treated as application/octet-stream)
  const ok = ATTACHMENT_ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p)) || ATTACHMENT_ALLOWED_MIME_TYPES.includes(mime);
  if (!ok) {
    const err: any = new Error(`Unsupported MIME type: ${mime}`);
    err.code = 'UNSUPPORTED_MIME_TYPE';
    err.allowed = { prefixes: ATTACHMENT_ALLOWED_MIME_PREFIXES, types: ATTACHMENT_ALLOWED_MIME_TYPES };
    throw err;
  }
}

export async function addAttachmentToNote(noteId: string, file: File, userId?: string) {
  const startTs = Date.now();
  console.log('[attachments] addAttachmentToNote:start', { noteId, name: (file as any)?.name, size: (file as any)?.size, type: (file as any)?.type });
  const user = userId ? { $id: userId } : await getCurrentUser();
  if (!user?.$id) throw new Error('User not authenticated');
  // Get existing note + attachments
  const note = await getNote(noteId) as any;
  if (!note) throw new Error('Note not found');
  if (note.userId !== user.$id) throw new Error('Only owner can add attachments currently');

  // Normalize current attachments (embedded metadata)
  const existingMetas = normalizeNoteAttachmentsField(note);
  await enforceAttachmentPlanLimit(user.$id, existingMetas.length);

  // Enforce per-file size limit via plan policy
  try {
    await enforceAttachmentPlanLimit(user.$id, existingMetas.length, file.size);
  } catch (e: any) {
    if (e?.code === 'ATTACHMENT_SIZE_LIMIT') throw e;
    console.error('[attachments] plan limit check error', { error: e?.message });
  }

  // MIME validation + filename sanitization
  try {
    validateAttachmentMime((file as any).type);
  } catch (mimeErr: any) {
    throw mimeErr; // bubble with code UNSUPPORTED_MIME_TYPE
  }
  const sanitizedName = sanitizeAttachmentFilename((file as any).name || 'attachment');

  // Upload file
  let uploaded: any;
  try {
    uploaded = await uploadNoteAttachment(file, user.$id);
  } catch (uploadErr: any) {
    console.error('[attachments] uploadNoteAttachment failed', {
      noteId,
      fileName: (file as any)?.name,
      message: uploadErr?.message,
      code: uploadErr?.code
    });
    throw uploadErr;
  }

  // Build metadata
  const meta: EmbeddedAttachmentMeta = {
    id: uploaded.$id || uploaded.id,
    name: sanitizedName || uploaded.name || 'attachment',
    size: uploaded.sizeOriginal || (file as any).size || 0,
    mime: uploaded.mimeType || (file as any).type || null,
    createdAt: new Date().toISOString(),
  };

  const updatedMetas = [...existingMetas, meta];
  const serialized = updatedMetas.map(serializeAttachmentMeta);

  // Persist to note
  await updateNote(noteId, { attachments: serialized } as any);
  // Dual-write to attachments collection if enabled (best-effort)
  try {
    await createAttachmentRecord({
      noteId,
      ownerId: user.$id,
      fileId: meta.id,
      filename: meta.name,
      mimetype: meta.mime,
      sizeBytes: meta.size,
    });
  } catch (e) {
    console.error('dual-write attachment record failed', e);
  }
  console.log('[attachments] addAttachmentToNote:done', { noteId, attachmentId: meta.id, durationMs: Date.now() - startTs });
  return meta;
}

export async function listNoteAttachments(noteId: string, currentUserId?: string): Promise<EmbeddedAttachmentMeta[]> {
  const startTs = Date.now();
  // Optional access guard: if currentUserId provided, ensure user is owner or collaborator.
  try {
    if (currentUserId) {
      const note = await getNote(noteId) as any;
      if (note.userId !== currentUserId) {
        try {
          const collabRes: any = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_TABLE_ID_COLLABORATORS,
            [Query.equal('noteId', noteId), Query.equal('userId', currentUserId)] as any
          );
          const isCollab = Array.isArray(collabRes?.documents) && collabRes.documents.length > 0;
          if (!isCollab) return [];
        } catch {
          return [];
        }
      }
    }
  } catch (authErr) {
    return [];
  }
  const note = await getNote(noteId) as any;
  const embedded = normalizeNoteAttachmentsField(note);
  // If collection enabled, merge records (favor collection metadata if conflicts by fileId)
  if (APPWRITE_TABLE_ID_ATTACHMENTS) {
    try {
      const collectionRecords = await listAttachmentsForNote(noteId);
      if (collectionRecords.length) {
        const byId: Record<string, EmbeddedAttachmentMeta> = {};
        for (const m of embedded) byId[m.id] = m;
        for (const rec of collectionRecords) {
          const existing = byId[rec.fileId];
          const merged: EmbeddedAttachmentMeta = {
            id: rec.fileId,
            name: rec.filename || existing?.name || 'attachment',
            size: rec.sizeBytes || existing?.size || 0,
            mime: rec.mimetype || existing?.mime || null,
            createdAt: existing?.createdAt || rec.createdAt || new Date().toISOString(),
          };
          byId[rec.fileId] = merged;
        }
        return Object.values(byId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }
    } catch (e) {
      console.error('listNoteAttachments merge failed', e);
    }
  }
  const durationMs = Date.now() - startTs;
  console.log('[attachments] list:done', { noteId, count: embedded.length, durationMs });
  return embedded;
}

export async function removeAttachmentFromNote(noteId: string, attachmentId: string) {
  const startTs = Date.now();
  console.log('[attachments] removeAttachment:start', { noteId, attachmentId });
  const user = await getCurrentUser();
  if (!user?.$id) throw new Error('User not authenticated');
  const note = await getNote(noteId) as any;
  if (note.userId !== user.$id) throw new Error('Only owner can remove attachments currently');
  const existingMetas = normalizeNoteAttachmentsField(note);
  const remaining = existingMetas.filter(a => a.id !== attachmentId);
  if (remaining.length === existingMetas.length) return { removed: false };
  const serialized = remaining.map(serializeAttachmentMeta);
  await updateNote(noteId, { attachments: serialized } as any);
  try { await deleteNoteAttachment(attachmentId); } catch (e) { /* non-fatal */ }
  const durationMs = Date.now() - startTs;
  console.log('[attachments] removeAttachment:done', { noteId, attachmentId, durationMs, remaining: remaining.length });
  return { removed: true };
}

// ...add similar helpers for other buckets as needed...

// --- NEW ATTACHMENTS COLLECTION MODEL ---
// Progressive enhancement: supports richer metadata beyond embedded JSON strings.
// If NEXT_PUBLIC_APPWRITE_TABLE_ID_ATTACHMENTS is set, we will dual-write to that collection.

export const APPWRITE_TABLE_ID_ATTACHMENTS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_ATTACHMENTS || undefined;

export interface AttachmentRecord {
  id: string;
  noteId: string;
  ownerId: string;
  fileId: string; // underlying storage file id
  filename: string;
  mimetype: string | null;
  sizeBytes: number;
  createdAt: string;
  metadata?: any;
}

async function createAttachmentRecord(meta: { noteId: string; ownerId: string; fileId: string; filename: string; mimetype: string | null; sizeBytes: number; }): Promise<AttachmentRecord | null> {
  if (!APPWRITE_TABLE_ID_ATTACHMENTS) return null;
  try {
    const now = new Date().toISOString();
    const doc: any = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_ATTACHMENTS,
      ID.unique(),
      {
        noteId: meta.noteId,
        ownerId: meta.ownerId,
        fileId: meta.fileId,
        filename: meta.filename,
        mimetype: meta.mimetype,
        sizeBytes: meta.sizeBytes,
        createdAt: now,
        id: null,
      }
    );
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_ATTACHMENTS,
      doc.$id,
      { id: doc.$id }
    );
    return {
      id: doc.$id,
      noteId: meta.noteId,
      ownerId: meta.ownerId,
      fileId: meta.fileId,
      filename: meta.filename,
      mimetype: meta.mimetype,
      sizeBytes: meta.sizeBytes,
      createdAt: now,
    };
  } catch (e) {
    console.error('createAttachmentRecord failed', e);
    return null;
  }
}

export async function listAttachmentsForNote(noteId: string): Promise<AttachmentRecord[]> {
  if (!APPWRITE_TABLE_ID_ATTACHMENTS) return [];
  try {
    const res: any = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_ATTACHMENTS,
      [Query.equal('noteId', noteId), Query.limit(200), Query.orderDesc('$createdAt')] as any
    );
    return res.documents as AttachmentRecord[];
  } catch (e) {
    console.error('listAttachmentsForNote failed', e);
    return [];
  }
}

export async function deleteAttachmentRecord(attachmentId: string) {
  if (!APPWRITE_TABLE_ID_ATTACHMENTS) return;
  try {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_ATTACHMENTS,
      attachmentId
    );
  } catch (e) {
    console.error('deleteAttachmentRecord failed', e);
  }
}

// --- SIGNED ATTACHMENT URL HELPERS ---
// Short-lived HMAC signed URLs that point to a proxy download route.
// These are generated server-side only. If secret missing, returns null (feature disabled).
import crypto from 'crypto';
const ATTACHMENT_URL_SIGNING_SECRET = process.env.ATTACHMENT_URL_SIGNING_SECRET || '';
const ATTACHMENT_URL_TTL_SECONDS = parseInt(process.env.ATTACHMENT_URL_TTL_SECONDS || '300', 10);

function generateAttachmentSignature(noteId: string, ownerId: string, fileId: string, exp: number) {
  if (!ATTACHMENT_URL_SIGNING_SECRET) return null;
  const h = crypto.createHmac('sha256', ATTACHMENT_URL_SIGNING_SECRET);
  h.update(`${noteId}.${ownerId}.${fileId}.${exp}`);
  return h.digest('hex');
}

export function generateSignedAttachmentURL(noteId: string, ownerId: string, fileId: string, ttlSeconds?: number) {
  if (!ATTACHMENT_URL_SIGNING_SECRET) return null;
  const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : ATTACHMENT_URL_TTL_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttl;
  const sig = generateAttachmentSignature(noteId, ownerId, fileId, exp);
  if (!sig) return null;
  return {
    url: `/api/attachments/download?noteId=${encodeURIComponent(noteId)}&ownerId=${encodeURIComponent(ownerId)}&fileId=${encodeURIComponent(fileId)}&exp=${exp}&sig=${sig}`,
    expiresAt: exp * 1000,
    ttl,
  };
}

export function verifySignedAttachmentURL(params: { noteId: string; ownerId: string; fileId: string; exp: number | string; sig: string; }): { valid: boolean; reason?: string } {
  if (!ATTACHMENT_URL_SIGNING_SECRET) return { valid: false, reason: 'signing_disabled' };
  const { noteId, ownerId, fileId } = params;
  let expNum = typeof params.exp === 'string' ? parseInt(params.exp, 10) : params.exp;
  if (!expNum || isNaN(expNum)) return { valid: false, reason: 'invalid_exp' };
  const now = Math.floor(Date.now() / 1000);
  if (expNum < now) return { valid: false, reason: 'expired' };
  const expected = generateAttachmentSignature(noteId, ownerId, fileId, expNum);
  if (!expected) return { valid: false, reason: 'signature_unavailable' };
  if (expected !== params.sig) return { valid: false, reason: 'invalid_signature' };
  return { valid: true };
}


// --- NOTE REVISIONS UTILITIES ---
export async function listNoteRevisions(noteId: string, limit: number = 50) {
  try {
    const revisionsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTEREVISIONS || 'note_revisions';
    const res = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      revisionsCollection,
      [Query.equal('noteId', noteId), Query.orderDesc('revision'), Query.limit(limit)] as any
    );
    return res;
  } catch (e) {
    console.error('listNoteRevisions failed', e);
    return { documents: [], total: 0 } as any;
  }
}

// --- MAINTENANCE HELPERS (Best-effort, on-demand) ---
// Backfill tagId on legacy note_tags rows missing tagId for a user's notes
export async function backfillNoteTagPivots(userId?: string) {
  try {
    const currentUser = userId ? { $id: userId } as any : await getCurrentUser();
    if (!currentUser?.$id) throw new Error('User not authenticated');
    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
    const tagsCollection = APPWRITE_TABLE_ID_TAGS;
    // Fetch tag docs for user
    const tagDocsRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      tagsCollection,
      [Query.equal('userId', currentUser.$id), Query.limit(500)] as any
    );
    const byNameLower: Record<string, any> = {};
    for (const td of tagDocsRes.documents as any[]) {
      if (td.nameLower) byNameLower[td.nameLower] = td;
      else if (td.name) byNameLower[String(td.name).toLowerCase()] = td;
    }
    // Fetch pivots missing tagId
    const pivotsRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      noteTagsCollection,
      [Query.equal('userId', currentUser.$id), Query.isNull('tagId'), Query.limit(1000)] as any
    );
    let patched = 0;
    for (const p of pivotsRes.documents as any[]) {
      if (!p.tag || p.tagId) continue;
      const key = String(p.tag).toLowerCase();
      const tagDoc = byNameLower[key];
      if (tagDoc) {
        try {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            noteTagsCollection,
            p.$id,
            { tagId: tagDoc.$id || tagDoc.id }
          );
          patched++;
        } catch (upErr) {
          console.error('backfill pivot update failed', upErr);
        }
      }
    }
    return { attempted: pivotsRes.documents.length, patched };
  } catch (e) {
    console.error('backfillNoteTagPivots failed', e);
    return { attempted: 0, patched: 0, error: String(e) };
  }
}

// Recompute tag usageCount by counting pivot rows per tag for a user
export async function reconcileTagUsage(userId?: string) {
  try {
    const currentUser = userId ? { $id: userId } as any : await getCurrentUser();
    if (!currentUser?.$id) throw new Error('User not authenticated');
    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
    const tagsCollection = APPWRITE_TABLE_ID_TAGS;
    // Fetch all user tag docs
    const tagDocsRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      tagsCollection,
      [Query.equal('userId', currentUser.$id), Query.limit(500)] as any
    );
    const tagDocs = tagDocsRes.documents as any[];
    const tagIdToDoc: Record<string, any> = {};
    for (const td of tagDocs) tagIdToDoc[td.$id || td.id] = td;
    // Fetch all pivots for user
    const pivotsRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      noteTagsCollection,
      [Query.equal('userId', currentUser.$id), Query.limit(5000)] as any
    );
    const counts: Record<string, number> = {};
    for (const p of pivotsRes.documents as any[]) {
      const tId = p.tagId;
      if (!tId) continue;
      counts[tId] = (counts[tId] || 0) + 1;
    }
    let updated = 0;
    for (const td of tagDocs) {
      const desired = counts[td.$id] || 0;
      const current = typeof td.usageCount === 'number' ? td.usageCount : 0;
      if (desired !== current) {
        try {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            tagsCollection,
            td.$id,
            { usageCount: desired }
          );
          updated++;
        } catch (upErr) {
          console.error('reconcileTagUsage update failed', upErr);
        }
      }
    }
    return { tags: tagDocs.length, pivots: pivotsRes.documents.length, updated };
  } catch (e) {
    console.error('reconcileTagUsage failed', e);
    return { tags: 0, pivots: 0, updated: 0, error: String(e) };
  }
}


// --- MAINTENANCE AUDIT HELPERS ---
// Analyze note_tags pivot health for a user without mutating data
export async function auditNoteTagPivots(userId?: string) {
  try {
    const currentUser = userId ? { $id: userId } as any : await getCurrentUser();
    if (!currentUser?.$id) throw new Error('User not authenticated');
    const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';

    // Fetch pivots (bounded)
    const pivotsRes = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      noteTagsCollection,
      [Query.equal('userId', currentUser.$id), Query.limit(5000)] as any
    );
    const pivots = pivotsRes.documents as any[];

    let missingTagId = 0;
    const sampleMissing: string[] = [];
    const pairCounts: Record<string, number> = {};

    for (const p of pivots) {
      if (!p.tagId) {
        missingTagId++;
        if (sampleMissing.length < 10) sampleMissing.push(p.$id);
      }
      if (p.tagId && p.tag) {
        const key = `${p.tagId}::${p.tag}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }

    const duplicatePairs = Object.entries(pairCounts)
      .filter(([, count]) => count > 1)
      .map(([key, count]) => {
        const [tagId, tag] = key.split('::');
        return { tagId, tag, count };
      })
      .sort((a, b) => b.count - a.count);

    const suggested: string[] = [];
    if (missingTagId > 0) suggested.push('Run backfillNoteTagPivots to patch missing tagId values');
    if (duplicatePairs.length > 0) suggested.push('Consider enforcing unique constraint (noteId, tagId) and deduplicating');
    if (!missingTagId && !duplicatePairs.length) suggested.push('No action needed');

    return {
      userId: currentUser.$id,
      total: pivots.length,
      missingTagId,
      duplicatePairCount: duplicatePairs.length,
      duplicatePairs,
      sampleMissing,
      suggested
    };
  } catch (e) {
    console.error('auditNoteTagPivots failed', e);
    return { error: String(e) };
  }
}

// --- EXPORT DEFAULTS ---
/**
 * --- PAGINATED NOTES LISTING ---
 * Cursor-based pagination for notes with optional tag hydration.
 * Returns: { documents, total, nextCursor, hasMore }
 *
 * Example:
 *   const page1 = await listNotesPaginated({ limit: 50 });
 *   if (page1.hasMore) {
 *     const page2 = await listNotesPaginated({ limit: 50, cursor: page1.nextCursor });
 *   }
 *
 * Provide custom queries to override default user filter or a specific userId.
 * Set hydrateTags=false to skip tag pivot hydration for performance sensitive paths.
 */
export interface ListNotesPaginatedOptions {
  limit?: number;
  cursor?: string | null;
  userId?: string; // override current user (admin/future use)
  queries?: any[]; // additional custom queries (overrides userId logic if provided)
  hydrateTags?: boolean; // default true
}

export async function listNotesPaginated(options: ListNotesPaginatedOptions = {}) {
  const {
    limit = 50,
    cursor = null,
    userId,
    queries,
    hydrateTags = true,
  } = options;

  let baseQueries: any[] = [];
  if (Array.isArray(queries) && queries.length) {
    baseQueries = [...queries];
  } else {
    const user = userId ? { $id: userId } as any : await getCurrentUser();
    if (!user?.$id) {
      return { documents: [], total: 0, nextCursor: null, hasMore: false };
    }
    baseQueries = [Query.equal('userId', user.$id)];
  }

  const finalQueries: any[] = [
    ...baseQueries,
    Query.limit(limit),
    Query.orderDesc('$createdAt'),
  ];
  if (cursor) finalQueries.push(Query.cursorAfter(cursor));

  const res: any = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_TABLE_ID_NOTES,
    finalQueries
  );
  const notes = res.documents as unknown as Notes[];

  if (hydrateTags && notes.length) {
    try {
      const noteTagsCollection = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_NOTETAGS || 'note_tags';
      const noteIds = notes.map((n: any) => n.$id || (n as any).id).filter(Boolean);
      if (noteIds.length) {
        const pivotRes = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          noteTagsCollection,
          [Query.equal('noteId', noteIds), Query.limit(Math.min(1000, noteIds.length * 10))] as any
        );
        const tagMap: Record<string, Set<string>> = {};
        for (const p of pivotRes.documents as any[]) {
          if (!p.noteId || !p.tag) continue;
          if (!tagMap[p.noteId]) tagMap[p.noteId] = new Set();
          tagMap[p.noteId].add(p.tag);
        }
        for (const n of notes as any[]) {
          const id = n.$id || n.id;
          if (id && tagMap[id] && tagMap[id].size) {
            n.tags = Array.from(tagMap[id]);
          }
          if (!(n as any).attachments || !Array.isArray((n as any).attachments)) {
            (n as any).attachments = [];
          }
        }
      }
    } catch {/* non-fatal */}
  }

  const batchLength = notes.length;
  const hasMore = batchLength === limit; // heuristic
  const nextCursor = hasMore && batchLength ? (notes[batchLength - 1] as any).$id || null : null;

  return {
    documents: notes,
    total: typeof res.total === 'number' ? res.total : notes.length,
    nextCursor,
    hasMore,
  };
}

export default {
  client,
  account,
  databases,
  tablesDB,
  storage,
  // IDs
  APPWRITE_DATABASE_ID,
  APPWRITE_TABLE_ID_USERS,
  APPWRITE_TABLE_ID_NOTES,
  APPWRITE_TABLE_ID_TAGS,
  APPWRITE_TABLE_ID_APIKEYS,
  APPWRITE_TABLE_ID_COMMENTS,
  APPWRITE_TABLE_ID_EXTENSIONS,
  APPWRITE_TABLE_ID_REACTIONS,
  APPWRITE_TABLE_ID_COLLABORATORS,
  APPWRITE_TABLE_ID_ACTIVITYLOG,
   APPWRITE_TABLE_ID_SETTINGS,
   APPWRITE_TABLE_ID_SUBSCRIPTIONS,
  APPWRITE_BUCKET_PROFILE_PICTURES,
  APPWRITE_BUCKET_NOTES_ATTACHMENTS,
  APPWRITE_BUCKET_EXTENSION_ASSETS,
  APPWRITE_BUCKET_BACKUPS,
  APPWRITE_BUCKET_TEMP_UPLOADS,
  // Methods
  getCurrentUser,
  sendEmailVerification,
  completeEmailVerification,
  getEmailVerificationStatus,
  sendPasswordResetEmail,
  completePasswordReset,
  createNote,
  getNote,
  updateNote,
  deleteNote,
   listNotes,
   listNotesPaginated,
   getAllNotes,
  createTag,
  getTag,
  updateTag,
  deleteTag,
  listTags,
  getAllTags,
  listTagsByUser,
  createApiKey,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  listApiKeys,
  createComment,
  getComment,
  updateComment,
  deleteComment,
  listComments,
  createExtension,
  getExtension,
  updateExtension,
  deleteExtension,
  listExtensions,
  createReaction,
  getReaction,
  updateReaction,
  deleteReaction,
  listReactions,
  createCollaborator,
  getCollaborator,
  updateCollaborator,
  deleteCollaborator,
  listCollaborators,
  createActivityLog,
  getActivityLog,
  updateActivityLog,
  deleteActivityLog,
  listActivityLogs,
  createSettings,
  getSettings,
  updateSettings,
  deleteSettings,
  listSettings,
  updateAIMode,
  getAIMode,
  uploadFile,
  getFile,
  deleteFile,
  listFiles,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  searchNotesByTitle,
  searchNotesByTag,
  getNotesByTag,
  listNotesByUser,
  listPublicNotesByUser,
  getPublicNote,
  shareNoteWithUser,
   shareNoteWithUserId,
   getSharedUsers,
   removeNoteSharing,
  getSharedNotes,
  getNoteWithSharing,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  uploadNoteAttachment,
  getNoteAttachment,
   deleteNoteAttachment,
   listNoteRevisions,
   backfillNoteTagPivots,
   reconcileTagUsage,
   auditNoteTagPivots,
    // User profile functions
    createUser,
    getUser,
    updateUser,
    deleteUser,
    listUsers,
    searchUsers,
    generateSignedAttachmentURL,
    verifySignedAttachmentURL,
};