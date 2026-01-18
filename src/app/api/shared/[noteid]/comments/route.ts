import { NextResponse, NextRequest } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { createRateLimiter } from '@/lib/rate-limit-middleware';

const rateLimiter = createRateLimiter({
  max: 20,
  windowMs: 60 * 1000,
});

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '67fe9627001d97e37ef3';
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APPWRITE_TABLE_ID_COMMENTS = process.env.NEXT_PUBLIC_APPWRITE_TABLE_ID_COMMENTS!;

export async function GET(req: NextRequest, { params }: { params: Promise<{ noteid: string }> }) {
  const { noteid } = await params;
  const { allowed, retryAfter } = rateLimiter(req);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter?.toString() || '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);

    const databases = new Databases(client);
    const res = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID_COMMENTS,
      [
        Query.equal('noteId', noteid),
        Query.orderAsc('createdAt'),
        Query.limit(200),
      ]
    );

    return NextResponse.json({ documents: res.documents });
  } catch (error) {
    console.error('Error fetching shared comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}