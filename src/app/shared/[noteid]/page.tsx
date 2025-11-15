import React from 'react';
import { validatePublicNoteAccess } from '@/lib/appwrite/permissions/notes';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite.d';
import { preProcessMarkdown } from '@/lib/markdown';
import { ClockIcon, EyeIcon, TagIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
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

export async function generateMetadata({ params }: { params: { noteid: string } }) {
   try {
     const note = await validatePublicNoteAccess(params.noteid);
     const baseUrl = (process.env.NEXT_PUBLIC_APP_URI || 'http://localhost:3001').replace(/\/$/, '');

     if (!note) {
       return {
         title: 'Note Not Found • WhisperRNote',
         description: 'This note is not available or is not public.'
       };
     }

     const titleText = note.title && note.title.trim() ? truncate(note.title.trim(), 70) : truncate(firstParagraph(note.content), 70);
     const description = truncate(firstParagraph(note.content) || 'Shared via WhisperRNote', 160);
     const url = `${baseUrl}/shared/${params.noteid}`;
     const image = `${baseUrl}/logo/whisperrnote.png`;

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
             alt: 'WhisperRNote',
             width: 1200,
             height: 630
           }
         ],
         siteName: 'WhisperRNote',
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
       title: 'Shared Note • WhisperRNote',
       description: 'A note shared via WhisperRNote.'
     };
   }
}

export default async function SharedNotePage({ params }: { params: { noteid: string } }) {
   const note = await validatePublicNoteAccess(params.noteid);

   if (!note) {
     return (
       <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
         <header className="border-b border-light-border dark:border-dark-border bg-white/50 dark:bg-black/50 backdrop-blur-sm">
           <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <img src="/logo/whisperrnote.png" alt="WhisperRNote" className="w-8 h-8 rounded-lg" />
               <h1 className="text-xl font-bold text-light-fg dark:text-dark-fg">WhisperRNote</h1>
             </div>
             <div className="hidden sm:flex items-center gap-3">
               <a href="/" className="rounded-xl px-3 py-2 text-sm font-medium bg-accent/10">Home</a>
               <a href="/" className="rounded-xl px-3 py-2 text-sm font-medium bg-accent text-white">Join</a>
             </div>
           </div>
         </header>

         <section className="border-b border-light-border dark:border-dark-border bg-gradient-to-r from-accent/10 via-transparent to-accent/10">
           <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-sm text-light-fg/70 dark:text-dark-fg/70">Organize unlimited notes, AI insights & secure sharing.</p>
             <a href="/" className="inline-flex items-center rounded-lg px-4 py-2 bg-accent text-white text-sm font-medium">
               Get Started Free <ArrowRightIcon className="h-4 w-4 ml-1" />
             </a>
           </div>
         </section>

         <main className="max-w-4xl mx-auto px-6 py-16">
           <div className="text-center space-y-8">
             <div className="space-y-4">
               <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
                 <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
               </div>
               <h1 className="text-3xl font-bold text-light-fg dark:text-dark-fg">Note Not Found</h1>
               <p className="text-lg text-light-fg/70 dark:text-dark-fg/70 max-w-md mx-auto">
                 This note doesn&apos;t exist or is no longer publicly available.
               </p>
             </div>

             <div className="bg-light-card dark:bg-dark-card rounded-2xl p-8 border-2 border-light-border dark:border-dark-border max-w-md mx-auto">
               <h2 className="text-xl font-semibold text-light-fg dark:text-dark-fg mb-4">Create Your Own Notes</h2>
               <p className="text-light-fg/70 dark:text-dark-fg/70 mb-6">Join WhisperRNote to create, organize, and share your own notes with the world.</p>
               <a href="/" className="inline-flex items-center justify-center w-full rounded-xl px-4 py-3 bg-accent text-white font-semibold">
                 Get Started Free
                 <ArrowRightIcon className="h-4 w-4 ml-2" />
               </a>
             </div>
           </div>
         </main>
       </div>
     );
   }

   return <SharedNoteClient note={note} />;
}
