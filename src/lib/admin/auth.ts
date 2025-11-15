import { getCurrentUser } from '@/lib/appwrite';
import { Client, Account } from 'appwrite';

export async function requireAdminFromRequest(req: Request): Promise<{ allowed: boolean; reason?: string; user?: any; }> {
  try {
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '').trim();
    if (!authHeader.startsWith('Bearer ')) return { allowed: false, reason: 'missing_token' } as any;
    const token = authHeader.substring('Bearer '.length).trim();
    if (!token) return { allowed: false, reason: 'missing_token' } as any;

    // Appwrite environment configuration from env vars
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT || process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT;
    if (!endpoint || !project) return { allowed: false, reason: 'server_misconfig' } as any;

    const client = new Client().setEndpoint(endpoint).setProject(project).setJWT(token);
    const account = new Account(client);
    const user: any = await account.get();
    if (!user || !user.$id) return { allowed: false, reason: 'unauthenticated' } as any;

    const prefs = (user as any).prefs || {};
    const labels: string[] = Array.isArray(user.labels) ? user.labels : [];
    const adminPref = prefs.admin === true || prefs.admin === 'true' || prefs.admin === 1 || prefs.admin === '1';
    const labelAdmin = labels.includes('admin') || labels.includes('Admin');
    if (!(adminPref || labelAdmin)) return { allowed: false, reason: 'forbidden' } as any;
    return { allowed: true, user } as any;
  } catch (e: any) {
    return { allowed: false, reason: 'error:' + (e?.message || 'unknown') } as any;
  }
}


// Determines if current user is an admin based on Appwrite user preference 'admin' == 'true' (string) or boolean true fallback
// Deprecated legacy function name retained temporarily for backward compatibility.
// TODO: Remove requireFounder occurrences after confirming no external dependencies rely on it.
export async function requireFounder(): Promise<{ allowed: boolean; reason?: string; user?: any; }> {
  try {
    // Try auth-layer enriched user first, fallback to raw Appwrite
    let user: any = await getAuthUser();
    if (!user) user = await getAppwriteUser();
    if (!user || !user.$id) return { allowed: false, reason: 'unauthenticated' };
    // Use user preferences for admin gating. Appwrite stores preferences in user.prefs
    const prefs = (user as any).prefs || {};
    const adminPref = prefs.admin === true || prefs.admin === 'true' || prefs.admin === 1 || prefs.admin === '1';
    const labels: string[] = Array.isArray(user.labels) ? user.labels : [];
    const labelAdmin = labels.includes('admin') || labels.includes('Admin');
    const allowed = adminPref || labelAdmin;
    if (!allowed) return { allowed: false, reason: 'forbidden' } as any;
    return { allowed: true, user } as any;
  } catch (e: any) {
    return { allowed: false, reason: 'error:' + (e?.message || 'unknown') };
  }
}
