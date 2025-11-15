"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/components/ui/AuthContext';
import { AIHeroInput } from '@/components/AIHeroInput';
import {
  SparklesIcon,
  CpuChipIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: <SparklesIcon className="h-8 w-8 text-accent" />,
    title: 'AI-Powered Creation',
    description:
      "Generate comprehensive notes, research summaries, and creative content with advanced AI assistance in seconds.",
  },
  {
    icon: <CpuChipIcon className="h-8 w-8 text-accent" />,
    title: 'Blockchain Integration',
    description:
      'Securely store and share your notes on-chain with cryptographic verification and decentralized access control.',
  },
  {
    icon: <ShieldCheckIcon className="h-8 w-8 text-accent" />,
    title: 'Smart Collaboration',
    description:
      'Real-time collaborative editing with AI insights and secure note management.',
  },
];

export default function LandingPage() {
  const { openIDMWindow, isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Generate user initials from name or email
  const getUserInitials = (user: any): string => {
    if (user?.name) {
      return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Handle AI prompt selection with smart routing
  const handlePromptSelect = async (prompt: string) => {
    if (isAuthenticated) {
      // User is logged in - go directly to notes with AI generation
      router.push(`/notes?ai-prompt=${encodeURIComponent(prompt)}`);
    } else {
      // User not logged in - show auth modal, then proceed
      openIDMWindow();
      // Store prompt in sessionStorage for after login
      sessionStorage.setItem('pending-ai-prompt', prompt);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-light-bg dark:bg-dark-bg text-light-fg dark:text-dark-fg">
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-light-border dark:border-dark-border bg-light-bg/80 dark:bg-dark-bg/80 px-10 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/logo/whisperrnote.png" 
            alt="WhisperRNote Logo" 
            className="h-8 w-8 rounded-lg"
          />
          <h2 className="text-xl font-bold text-light-fg dark:text-dark-fg">WhisperRNote</h2>
        </div>
          <nav className="hidden flex-1 justify-center gap-8 md:flex">
            <a
              className="text-sm font-medium text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
              href="#"
            >
              Product
            </a>
            <a
              className="text-sm font-medium text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
              href="#"
            >
              Solutions
            </a>
            <a
              className="text-sm font-medium text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
              href="#"
            >
              Resources
            </a>
            <a
              className="text-sm font-medium text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
              href="#"
            >
              Pricing
            </a>
          </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-white text-sm font-medium shadow-3d-light dark:shadow-3d-dark">
                {getUserInitials(user)}
              </div>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              onClick={() => openIDMWindow()}
            >
              Login
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1">
        <section className="relative flex items-center justify-center py-24 text-center md:py-32">
          <div className="container relative z-20 mx-auto px-5">
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tighter text-light-fg dark:text-dark-fg md:text-6xl">
              Your notes, AI powered onchain
            </h1>
            <p className="mx-auto mb-12 max-w-3xl text-lg text-light-fg/80 dark:text-dark-fg/80 md:text-xl">
              Transform your ideas with AI assistance and secure your notes. 
              Generate comprehensive content instantly, collaborate seamlessly, and own your data forever.
            </p>
            
            {/* AI Hero Input */}
            <AIHeroInput onPromptSelectAction={handlePromptSelect} className="mb-8" />
          </div>
        </section>
        <section className="bg-light-card dark:bg-dark-card py-20 md:py-28">
          <div className="container mx-auto px-5">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-light-fg dark:text-dark-fg md:text-4xl">
                AI-powered notes for the future
              </h2>
              <p className="mt-4 text-lg text-light-fg/60 dark:text-dark-fg/60">
                Experience next-generation note-taking with intelligent content generation, 
                decentralized storage, and cryptographic security built-in.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col gap-4 bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-3d-light dark:shadow-3d-dark">
                      {feature.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-xl font-bold text-light-fg dark:text-dark-fg">
                      {feature.title}
                    </CardTitle>
                    <p className="text-light-fg/60 dark:text-dark-fg/60">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
        <div className="container mx-auto px-5 py-12">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-6 flex flex-wrap justify-center gap-6 md:mb-0 md:justify-start">
              <a
                className="text-sm text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
                href="#"
              >
                About
              </a>
              <a
                className="text-sm text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
                href="#"
              >
                Contact
              </a>
              <a
                className="text-sm text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="text-sm text-light-fg/60 dark:text-dark-fg/60 transition-colors hover:text-light-fg dark:hover:text-dark-fg"
                href="#"
              >
                Terms of Service
              </a>
            </div>
            <p className="text-sm text-light-fg/40 dark:text-dark-fg/40">
              © 2025 WhisperRNote. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}