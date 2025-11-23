'use client';

import { useState, useEffect } from 'react';

const slides = [
  {
    id: 1,
    title: "Whisperrnote",
    subtitle: "AI × Blockchain Intelligence",
    content: (
      <div className="space-y-12">
        <div className="w-40 h-40 mx-auto bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center text-8xl shadow-2xl shadow-blue-500/30 animate-pulse">
          🧠
        </div>
        
        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white/5 backdrop-blur rounded-2xl border border-white/10">
            <div className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">73%</div>
            <div className="text-lg opacity-80">Want AI Notes</div>
          </div>
          <div className="text-center p-6 bg-white/5 backdrop-blur rounded-2xl border border-white/10">
            <div className="text-5xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">$4.5M</div>
            <div className="text-lg opacity-80">Breach Cost</div>
          </div>
          <div className="text-center p-6 bg-white/5 backdrop-blur rounded-2xl border border-white/10">
            <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">0</div>
            <div className="text-lg opacity-80">AI+Blockchain</div>
          </div>
        </div>
        
        <div className="text-2xl font-light opacity-90 max-w-3xl mx-auto">
          The first <span className="font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">AI-powered notes</span> platform
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "The Problem",
    subtitle: "Security vs Intelligence",
    content: (
      <div className="grid grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
        <div className="space-y-8">
          <div className="bg-red-500/20 border border-red-500/30 rounded-3xl p-8 backdrop-blur">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-2xl font-bold mb-4">Traditional Notes</div>
            <div className="space-y-2 text-lg opacity-90">
              <div>• Data breaches</div>
              <div>• No AI enhancement</div>
              <div>• Centralized control</div>
            </div>
          </div>
          
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-3xl p-8 backdrop-blur">
            <div className="text-6xl mb-4">🤖</div>
            <div className="text-2xl font-bold mb-4">AI Tools</div>
            <div className="space-y-2 text-lg opacity-90">
              <div>• Privacy concerns</div>
              <div>• Data mining</div>
              <div>• Limited features</div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-8xl mb-8 animate-pulse">💔</div>
          <div className="text-3xl font-bold mb-6">Choose One:</div>
          <div className="text-xl opacity-80 space-y-3">
            <div>🛡️ Security</div>
            <div className="text-2xl font-black">OR</div>
            <div>🧠 Intelligence</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Our Solution",
    subtitle: "Best of Both Worlds",
    content: (
      <div className="space-y-16">
        <div className="flex justify-center items-center relative">
          <div className="w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">🧠</div>
              <div className="text-lg font-bold">AI Layer</div>
            </div>
          </div>
          
          <div className="absolute w-24 h-1 bg-gradient-to-r from-cyan-400 to-purple-600 animate-pulse"></div>
          
          <div className="w-48 h-48 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center ml-24 shadow-2xl shadow-purple-500/40">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">🔗</div>
              <div className="text-lg font-bold">Blockchain</div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
            = Secure Intelligence
          </div>
          <div className="text-xl opacity-90 max-w-2xl mx-auto">
            AI enhances your thoughts while powerful encryption protects them
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Core Features",
    subtitle: "Advanced Technology",
    content: (
      <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500">
          <div className="text-6xl mb-4">🤖</div>
          <div className="text-2xl font-bold mb-3">Multi-AI Engine</div>
          <div className="text-lg opacity-90">GPT-4.1, Gemini, auto-failover</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500">
          <div className="text-6xl mb-4">🔐</div>
          <div className="text-2xl font-bold mb-3">End-to-End Encryption</div>
          <div className="text-lg opacity-90">Military-grade security</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500">
          <div className="text-6xl mb-4">⚡</div>
          <div className="text-2xl font-bold mb-3">Smart Automation</div>
          <div className="text-lg opacity-90">Auto-tagging, enhancement</div>
        </div>
        
        <div className="bg-gradient-to-br from-pink-500/20 to-red-600/20 backdrop-blur border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500">
          <div className="text-6xl mb-4">🌍</div>
          <div className="text-2xl font-bold mb-3">Universal Access</div>
          <div className="text-lg opacity-90">Web, mobile, desktop</div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Market Opportunity",
    subtitle: "$135B+ TAM",
    content: (
      <div className="space-y-12">
        <div className="grid grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 bg-white/5 backdrop-blur rounded-3xl border border-white/10">
            <div className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">$45B</div>
            <div className="text-xl opacity-80 mt-2">Note-taking</div>
          </div>
          <div className="text-center p-8 bg-white/5 backdrop-blur rounded-3xl border border-white/10">
            <div className="text-6xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">$67B</div>
            <div className="text-xl opacity-80 mt-2">AI Software</div>
          </div>
          <div className="text-center p-8 bg-white/5 backdrop-blur rounded-3xl border border-white/10">
            <div className="text-6xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">$23B</div>
            <div className="text-xl opacity-80 mt-2">Blockchain</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur border border-white/20 rounded-3xl p-6">
            <div className="text-3xl mb-3">🎯</div>
            <div className="text-xl font-bold mb-2">First Mover</div>
            <div className="text-lg opacity-90">No AI+Blockchain notes exist</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur border border-white/20 rounded-3xl p-6">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-xl font-bold mb-2">Revenue Model</div>
            <div className="text-lg opacity-90">Freemium + Enterprise</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Traction",
    subtitle: "Building Momentum",
    content: (
      <div className="grid grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="text-center p-8 bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur border border-white/20 rounded-3xl">
          <div className="text-6xl mb-4">🚀</div>
          <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-2">Live</div>
          <div className="text-lg opacity-90">Product deployed</div>
        </div>
        
        <div className="text-center p-8 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur border border-white/20 rounded-3xl">
          <div className="text-6xl mb-4">👥</div>
          <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2">Users</div>
          <div className="text-lg opacity-90">Growing community</div>
        </div>
        
        <div className="text-center p-8 bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur border border-white/20 rounded-3xl">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">Awards</div>
          <div className="text-lg opacity-90">Tech recognition</div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "Join Us",
    subtitle: "Shape the Future",
    content: (
      <div className="space-y-12">
        <div className="w-32 h-32 mx-auto bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center text-6xl shadow-2xl shadow-blue-500/30 animate-pulse">
          🚀
        </div>
        
        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur border border-white/20 rounded-3xl">
            <div className="text-4xl mb-3">💰</div>
            <div className="text-xl font-bold">Investors</div>
            <div className="text-lg opacity-90">$2M seed</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur border border-white/20 rounded-3xl">
            <div className="text-4xl mb-3">🤝</div>
            <div className="text-xl font-bold">Partners</div>
            <div className="text-lg opacity-90">Strategic alliances</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur border border-white/20 rounded-3xl">
            <div className="text-4xl mb-3">⭐</div>
            <div className="text-xl font-bold">Talent</div>
            <div className="text-lg opacity-90">Join our team</div>
          </div>
        </div>
        
        <div className="space-x-6">
          <a 
            href="https://whisperrnote.space" 
            className="inline-block bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-10 py-4 rounded-full text-xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-2xl shadow-lg"
          >
            Try Now →
          </a>
          <a 
            href="mailto:team@whisperrnote.space" 
            className="inline-block bg-white/10 backdrop-blur border border-white/30 text-white px-10 py-4 rounded-full text-xl font-bold transition-all duration-300 hover:scale-110 hover:bg-white/20"
          >
            Contact Us
          </a>
        </div>
        
        <div className="text-xl font-light opacity-90 max-w-2xl mx-auto">
          The future of knowledge is <span className="font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">secure, intelligent, and yours</span>
        </div>
      </div>
    )
  }
];

export default function PitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        goToSlide(parseInt(e.key) - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-slate-900" />
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)
          `
        }}
      />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      
      {/* Main Content */}
      <div className={`h-full flex flex-col justify-center items-center p-8 z-10 relative transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="max-w-7xl w-full text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
            {currentSlideData.title}
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-12 font-light tracking-wide">
            {currentSlideData.subtitle}
          </p>
          {currentSlideData.content}
        </div>
      </div>
      
      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={`absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-2xl transition-all duration-300 z-20 ${
          currentSlide === 0 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-black/30 hover:scale-110 cursor-pointer hover:border-white/40'
        }`}
      >
        ←
      </button>
      
      <button
        onClick={nextSlide}
        disabled={currentSlide === slides.length - 1}
        className={`absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-2xl transition-all duration-300 z-20 ${
          currentSlide === slides.length - 1 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-black/30 hover:scale-110 cursor-pointer hover:border-white/40'
        }`}
      >
        →
      </button>
      
      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSlide === index 
                ? 'bg-white scale-125 shadow-lg' 
                : 'bg-white/40 hover:bg-white/70 hover:scale-110'
            }`}
          />
        ))}
      </div>
      
      {/* Slide Counter */}
      <div className="absolute top-8 right-8 bg-black/20 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 z-20">
        <span className="text-lg font-semibold">{currentSlide + 1} / {slides.length}</span>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-8 right-8 text-sm opacity-50 z-20">
        <p>Use ← → arrows or 1-7 keys</p>
      </div>
    </div>
  );
}