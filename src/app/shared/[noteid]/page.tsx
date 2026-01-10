import React from 'react';
import { validatePublicNoteAccess } from '@/lib/appwrite';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite';
import { preProcessMarkdown } from '@/lib/markdown';
import SharedNoteClient from './SharedNoteClient';
import { headers } from 'next/headers';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit-middleware';
import type { NextRequest } from 'next/server';

function stripMarkdown(md?: string) {
   if (!md) return '';
   let text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
   text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
   text = text.replace(/```[\s\S]*?```/g, '');
   text = text.replace(/`[^`]*`/g, '');
   text = text.replace(/^[#>\-\*\+]{1,}\s?/gm, '');
   text = text.replace(/[\*\_\~\#\>]/g, '');
   text = text.replace(/\s+/g, ' ').trim();
   return text;
}

function firstParagraph(md?: string) {
   const plain = stripMarkdown(md);
   if (!plain) return '';
   const paras = plain.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
   if (paras.length) return paras[0];
   const lines = plain.split(/\n/).map(l => l.trim()).filter(Boolean);
   return lines[0] || plain;
}

function truncate(s: string | undefined, n: number) {
   if (!s) return '';
   return s.length > n ? s.slice(0, n).trim() + '…' : s;
}

export async function generateMetadata({ params }: { params: Promise<{ noteid: string }> }) {
   try {
     const { noteid } = await params;
     const note = await validatePublicNoteAccess(noteid);
     const baseUrl = (process.env.NEXT_PUBLIC_APP_URI || 'http://localhost:3001').replace(/\/$/, '');

     if (!note) {
       return {
         title: 'Note Not Found • Whisperrnote',
         description: 'This note is not available or is not public.'
       };
     }

     const titleText = note.title && note.title.trim() ? truncate(note.title.trim(), 70) : truncate(firstParagraph(note.content || undefined), 70);
     const description = truncate(firstParagraph(note.content || undefined) || 'Shared via Whisperrnote', 160);
     const url = `${baseUrl}/shared/${noteid}`;
     const image = `${baseUrl}/api/og/note/${noteid}`;

     return {
       title: titleText,
       description,
       openGraph: {
         title: titleText,
         description,
         url,
         images: [
           {
             url: image,
             alt: `Shared Note: ${titleText}`,
             width: 1200,
             height: 630
           }
         ],
         siteName: 'Whisperrnote',
         type: 'article'
       },
       twitter: {
         card: 'summary_large_image',
         title: titleText,
         description,
         images: [image]
       }
     } as any;
   } catch (err) {
     return {
       title: 'Shared Note • Whisperrnote',
       description: 'A note shared via Whisperrnote.'
     };
   }
}

export default async function SharedNotePage({ params }: { params: Promise<{ noteid: string }> }) {
   // Server only renders shell - actual note fetching happens client-side
   // This ensures Turnstile verification and rate limiting are enforced before database access
   const { noteid } = await params;
   return <SharedNoteClient noteId={noteid} />;
}
