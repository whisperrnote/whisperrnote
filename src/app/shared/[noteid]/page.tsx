import React from 'react';
import { validatePublicNoteAccess } from '@/lib/appwrite/permissions/notes';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite.d';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { preProcessMarkdown } from '@/lib/markdown';
import {
  ClockIcon,
  EyeIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/appwrite/auth';
import AppHeader from '@/components/AppHeader';

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
   const [note, user] = await Promise.all([
     validatePublicNoteAccess(params.noteid),
     getCurrentUser()
   ]);

   if (!note) {
     return (
       <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
         <header className="border-b border-light-border dark:border-dark-border bg-white/50 dark:bg-black/50 backdrop-blur-sm">
           <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Image src="/logo/whisperrnote.png" alt="WhisperRNote" width={32} height={32} className="rounded-lg" />
               <h1 className="text-xl font-bold text-light-fg dark:text-dark-fg">WhisperRNote</h1>
             </div>
             {!user && (
               <div className="hidden sm:flex items-center gap-3">
                 <a href="/" className="rounded-xl px-3 py-2 text-sm font-medium bg-accent/10">Home</a>
                 <a href="/" className="rounded-xl px-3 py-2 text-sm font-medium bg-accent text-white">Join</a>
               </div>
             )}
           </div>
         </header>

         {!user && (
           <section className="border-b border-light-border dark:border-dark-border bg-gradient-to-r from-accent/10 via-transparent to-accent/10">
             <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
               <p className="text-sm text-light-fg/70 dark:text-dark-fg/70">Organize unlimited notes, AI insights & secure sharing.</p>
               <a href="/" className="inline-flex items-center rounded-lg px-4 py-2 bg-accent text-white text-sm font-medium">
                 Get Started Free <ArrowRightIcon className="h-4 w-4 ml-1" />
               </a>
             </div>
           </section>
         )}

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

   return (
     <>
       {user ? (
         <div className="min-h-screen bg-background dark:bg-dark-bg pt-16">
           <AppHeader />
           <main className="max-w-4xl mx-auto px-6 py-8">
             <article className="bg-card dark:bg-dark-card rounded-3xl border border-border dark:border-dark-border overflow-hidden">
               <header className="p-8 border-b border-border dark:border-dark-border">
                 <div className="space-y-6">
                   <h1 className="text-3xl font-bold text-foreground dark:text-dark-fg leading-tight">{note.title || 'Untitled Note'}</h1>

                   <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                     <div className="flex items-center gap-2">
                       <ClockIcon className="h-4 w-4" />
                       <span>Created {formatNoteCreatedDate(note, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <EyeIcon className="h-4 w-4" />
                       <span>Public Note</span>
                     </div>
                   </div>

                   {note.tags && note.tags.length > 0 && (
                     <div className="flex items-center gap-2 flex-wrap text-sm text-muted">
                       <TagIcon className="h-4 w-4" />
                       {note.tags.map((tag: string, i: number) => (
                         <span key={i} className="px-2 py-1 bg-background dark:bg-dark-bg rounded-full text-xs">{tag}</span>
                       ))}
                     </div>
                   )}
                 </div>
               </header>

               <div className="p-8">
                 <div className="prose prose-lg max-w-none dark:prose-invert text-foreground dark:text-dark-fg [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-6 [&>h1]:mt-8 [&>h2]:mb-5 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0">
                   {note.content ? (
                     <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{preProcessMarkdown(note.content)}</ReactMarkdown>
                   ) : (
                     <div className="text-muted italic">This note is empty.</div>
                   )}
                 </div>
               </div>

               <footer className="p-6 bg-background/50 dark:bg-dark-bg/50 border-t border-border dark:border-dark-border">
                 <div className="flex items-center justify-between">
                   <div className="text-sm text-muted">Last updated {formatNoteUpdatedDate(note, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                   <div className="text-sm text-muted">Shared via WhisperRNote</div>
                 </div>
               </footer>
             </article>

             <div className="mt-12 text-center">
               <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-2xl p-8 border border-accent/20">
                 <h2 className="text-2xl font-bold text-foreground dark:text-dark-fg mb-4">View Your Notes</h2>
                 <p className="text-muted mb-6 max-w-lg mx-auto">Check out all your notes and continue organizing your thoughts.</p>
                 <a href="/notes" className="inline-flex items-center justify-center rounded-xl px-6 py-3 bg-accent text-white font-semibold">
                   Go to Your Notes
                   <ArrowRightIcon className="h-5 w-5 ml-3" />
                 </a>
               </div>
             </div>
           </main>
         </div>
       ) : (
         <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
           <header className="border-b border-light-border dark:border-dark-border bg-white/50 dark:bg-black/50 backdrop-blur-sm">
             <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <Image src="/logo/whisperrnote.png" alt="WhisperRNote" width={32} height={32} className="rounded-lg" />
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

           <main className="max-w-4xl mx-auto px-6 py-8">
             <article className="bg-light-card dark:bg-dark-card rounded-3xl border-2 border-light-border dark:border-dark-border overflow-hidden">
               <header className="p-8 border-b border-light-border dark:border-dark-border">
                 <div className="space-y-6">
                   <h1 className="text-3xl font-bold text-light-fg dark:text-dark-fg leading-tight">{note.title || 'Untitled Note'}</h1>

                   <div className="flex flex-wrap items-center gap-4 text-sm text-light-fg/60 dark:text-dark-fg/60">
                     <div className="flex items-center gap-2">
                       <ClockIcon className="h-4 w-4" />
                       <span>Created {formatNoteCreatedDate(note, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <EyeIcon className="h-4 w-4" />
                       <span>Public Note</span>
                     </div>
                   </div>

                   {note.tags && note.tags.length > 0 && (
                     <div className="flex items-center gap-2 flex-wrap text-sm text-light-fg/60 dark:text-dark-fg/60">
                       <TagIcon className="h-4 w-4" />
                       {note.tags.map((tag: string, i: number) => (
                         <span key={i} className="px-2 py-1 bg-light-bg dark:bg-dark-bg rounded-full text-xs">{tag}</span>
                       ))}
                     </div>
                   )}
                 </div>
               </header>

               <div className="p-8">
                 <div className="prose prose-lg max-w-none dark:prose-invert text-light-fg dark:text-dark-fg [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-6 [&>h1]:mt-8 [&>h2]:mb-5 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0">
                   {note.content ? (
                     <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{preProcessMarkdown(note.content)}</ReactMarkdown>
                   ) : (
                     <div className="text-light-fg/60 dark:text-dark-fg/60 italic">This note is empty.</div>
                   )}
                 </div>
               </div>

               <footer className="p-6 bg-light-bg/50 dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border">
                 <div className="flex items-center justify-between">
                   <div className="text-sm text-light-fg/60 dark:text-dark-fg/60">Last updated {formatNoteUpdatedDate(note, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                   <div className="text-sm text-light-fg/60 dark:text-dark-fg/60">Shared via WhisperRNote</div>
                 </div>
               </footer>
             </article>

             <div className="mt-12 text-center">
               <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-2xl p-8 border border-accent/20">
                 <h2 className="text-2xl font-bold text-light-fg dark:text-dark-fg mb-4">Create Your Own Notes</h2>
                 <p className="text-light-fg/70 dark:text-dark-fg/70 mb-6 max-w-lg mx-auto">Join thousands of users who trust WhisperRNote to capture, organize, and share their thoughts.</p>
                 <a href="/" className="inline-flex items-center justify-center rounded-xl px-6 py-3 bg-accent text-white font-semibold">
                   Start Writing for Free
                   <ArrowRightIcon className="h-5 w-5 ml-3" />
                 </a>
               </div>
             </div>
           </main>
         </div>
       )}
     </>
   );
}
