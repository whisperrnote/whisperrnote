'use client';

import React, { useState } from 'react';
import { formatNoteCreatedDate, formatNoteUpdatedDate } from '@/lib/date-utils';
import type { Notes } from '@/types/appwrite.d';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import { ClockIcon, EyeIcon, TagIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/components/ui/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PublicNoteAccess } from '@/components/PublicNoteAccess';
import { LinkComponent } from '@/components/LinkRenderer';
import { preProcessMarkdown } from '@/lib/markdown';
import Image from 'next/image';

interface SharedNoteClientProps {
   noteId: string;
}

function SharedNoteHeader() {
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    logout();
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-6 py-3 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/logo/whisperrnote.png" 
            alt="WhisperRNote Logo" 
            className="w-8 h-8 rounded-lg shadow-lg"
          />
          <h1 className="hidden sm:block text-xl font-black text-foreground bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
            WhisperRNote
          </h1>
        </div>

        <div className="flex-1" />

        <div className="relative flex items-center gap-3 shrink-0">
          <ThemeToggle size="sm" />

          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-card/80 transition-all duration-200"
          >
            <div className="h-5 w-5 rounded-full bg-accent/80 flex items-center justify-center text-white text-xs font-medium">
              {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {user?.name || user?.email || 'Account'}
            </span>
          </button>

          {isAccountMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setIsAccountMenuOpen(false)}
              />
              
              <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-lg z-20 py-2">
                <a
                  href="/settings"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-background transition-colors duration-200"
                >
                  <span className="text-sm font-medium">Settings</span>
                </a>
                
                <div className="border-t border-border my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function SharedNoteClient({ noteId }: SharedNoteClientProps) {
  const [verifiedNote, setVerifiedNote] = useState<Notes | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!verifiedNote) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Verify Access</h1>
            <p className="text-muted">Please complete the verification to view this shared note</p>
          </div>
          <PublicNoteAccess
            noteId={noteId}
            onVerified={setVerifiedNote}
            onError={setError}
          />
          {error && (
            <div className="bg-red-100/80 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }
  const { isAuthenticated, isLoading } = useAuth();
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopyContent = () => {
    navigator.clipboard.writeText(verifiedNote?.content || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background dark:bg-dark-bg">
        <SharedNoteHeader />
        <main className="max-w-4xl mx-auto px-6 py-8 pt-20">
          <article className="bg-card dark:bg-dark-card rounded-3xl border border-border dark:border-dark-border overflow-hidden">
            <header className="p-8 border-b border-border dark:border-dark-border">
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-foreground dark:text-dark-fg leading-tight">{verifiedNote.title || 'Untitled Note'}</h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>Created {formatNoteCreatedDate(verifiedNote, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EyeIcon className="h-4 w-4" />
                    <span>Public Note</span>
                  </div>
                </div>

                {verifiedNote.tags && verifiedNote.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-sm text-muted">
                    <TagIcon className="h-4 w-4" />
                    {verifiedNote.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-background dark:bg-dark-bg rounded-full text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </header>

            <div className="relative p-8 bg-background/70 dark:bg-dark-bg/40 rounded-xl">
              <button
                onClick={handleCopyContent}
                className={`absolute top-4 right-4 p-2 rounded-lg border transition-all duration-200 group ${
                  isCopied
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                    : 'bg-background dark:bg-dark-card border-border hover:bg-card dark:hover:bg-dark-card/80'
                }`}
                title={isCopied ? 'Copied!' : 'Copy content'}
              >
                {isCopied ? (
                  <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors" />
                ) : (
                  <svg className="h-5 w-5 text-foreground group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <div className="prose prose-lg max-w-none dark:prose-invert text-foreground dark:text-dark-fg [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-8 [&>h1]:mt-8 [&>h2]:mb-6 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>ol>li]:marker:font-bold [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0 [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-4">
                {verifiedNote.content ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]} 
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      a: LinkComponent
                    }}
                  >
                    {verifiedNote.content}
                  </ReactMarkdown>
                ) : (
                  <div className="text-muted italic">This note is empty.</div>
                )}
              </div>
            </div>

            <footer className="p-6 bg-background/50 dark:bg-dark-bg/50 border-t border-border dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">Last updated {formatNoteUpdatedDate(verifiedNote, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
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
    );
  }

  return (
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
              <h1 className="text-3xl font-bold text-light-fg dark:text-dark-fg leading-tight">{verifiedNote.title || 'Untitled Note'}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-light-fg/60 dark:text-dark-fg/60">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>Created {formatNoteCreatedDate(verifiedNote, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <EyeIcon className="h-4 w-4" />
                  <span>Public Note</span>
                </div>
              </div>

              {verifiedNote.tags && verifiedNote.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-sm text-light-fg/60 dark:text-dark-fg/60">
                  <TagIcon className="h-4 w-4" />
                  {verifiedNote.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-light-bg dark:bg-dark-bg rounded-full text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className="p-8">
            <div className="prose prose-lg max-w-none dark:prose-invert text-light-fg dark:text-dark-fg [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-6 [&>h1]:mt-8 [&>h2]:mb-5 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0">
              {verifiedNote.content ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    a: LinkComponent
                  }}
                >
                  {preProcessMarkdown(verifiedNote.content)}
                </ReactMarkdown>
              ) : (
                <div className="text-light-fg/60 dark:text-dark-fg/60 italic">This note is empty.</div>
              )}
            </div>
          </div>

          <footer className="p-6 bg-light-bg/50 dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-light-fg/60 dark:text-dark-fg/60">Last updated {formatNoteUpdatedDate(verifiedNote, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
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
  );
}
