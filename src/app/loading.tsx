'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
      {/* Main loading card */}
      <div className="w-full max-w-md p-12 bg-card border border-border rounded-3xl shadow-3d-light dark:shadow-3d-dark transform perspective-500 rotate-x-[10deg] rotate-y-[-5deg] preserve-3d transition-all duration-400 ease-out animate-fade-in-delayed">
        {/* App title with 3D effect */}
        <h1 className="text-4xl font-black text-center mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent transform perspective-500 rotate-x-[10deg] origin-bottom tracking-tight">
          Whisperrnote
        </h1>
        
        {/* Loading text */}
        <p className="text-foreground/70 text-center text-lg font-medium mb-6 tracking-wide">
          Loading your creative space...
        </p>
        
        {/* Progress bar container */}
        <div className="w-full h-3 bg-background border border-border rounded-lg overflow-hidden shadow-inner-light dark:shadow-inner-dark relative perspective-500">
          <div className="h-full bg-gradient-to-r from-accent via-accent-dark to-accent rounded-lg shadow-lg animate-progress relative">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-lg"></div>
          </div>
        </div>
        
        {/* Floating note elements */}
        <div className="flex justify-center mt-8 space-x-4">
          <div className="w-6 h-8 bg-accent/20 rounded-lg shadow-sm animate-float-1"></div>
          <div className="w-4 h-6 bg-accent/30 rounded-lg shadow-sm animate-float-2"></div>
          <div className="w-5 h-7 bg-accent/25 rounded-lg shadow-sm animate-float-3"></div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 w-full text-center text-foreground/40 text-xs">
        © 2025 Whisperrnote. All Rights Reserved.
      </div>
      
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-8 h-10 bg-accent/10 rounded-xl animate-float-slow opacity-50"></div>
      <div className="absolute top-32 right-16 w-6 h-8 bg-accent/15 rounded-lg animate-float-slow-reverse opacity-40"></div>
      <div className="absolute bottom-40 left-20 w-10 h-6 bg-accent/10 rounded-2xl animate-float-slow opacity-30"></div>
      <div className="absolute bottom-60 right-12 w-4 h-12 bg-accent/20 rounded-lg animate-float-slow-reverse opacity-35"></div>
    </div>
  );
}