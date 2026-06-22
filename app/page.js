'use client';

import React from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import VideoUploader from '@/app/components/VideoUploader';

export default function HomePage() {
  const { isSignedIn } = useAuth();
  
  const scrollToWorkspace = () => {
    document.getElementById('workspace-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-neutral-950 text-white min-h-screen selection:bg-lime-400 selection:text-black font-sans antialiased overflow-x-hidden">
      
      {/* 1. PREMIUM HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/70 border-b border-neutral-900 px-6 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer">
          <div className="w-9 h-9 bg-lime-400 text-neutral-950 font-black rounded-xl flex items-center justify-center text-xl shadow-lg shadow-lime-400/20">
            S
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Stream<span className="text-lime-400">Cut</span>
          </span>
        </div>

        {/* Dynamic Auth Section using Hook */}
        <div className="flex items-center space-x-4">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="text-sm font-semibold text-neutral-300 hover:text-white px-4 py-2 transition-colors">
                  Login
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all tracking-wide">
                  Get Started Free
                </button>
              </SignInButton>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-400 hidden sm:inline-block bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
                Studio Creator Profile active
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
      </header>

      {/* 2. SSEMBLE STYLE HERO HERO SECTION */}
      <section className="relative pt-24 pb-20 px-6 lg:px-16 max-w-7xl mx-auto text-center flex flex-col items-center justify-center">
        {/* Abstract Glow Graphics Background Effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-lime-400/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 rounded-full border border-neutral-800 text-xs font-mono text-neutral-400 mb-6 tracking-wide">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400"></span>
          </span>
          Next-Gen S3 Cloud Asset Processing
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          The Automated Video Engine Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-300">Creators</span>
        </h1>

        <p className="text-neutral-400 text-base sm:text-xl max-w-2xl leading-relaxed mb-10">
          Drag, drop, and map your media storage directly to enterprise infrastructure. Run secure workflows, capture true clip metadata metrics, and scale production instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <button 
            onClick={scrollToWorkspace}
            className="w-full sm:w-auto bg-lime-400 hover:bg-lime-500 text-neutral-950 font-extrabold text-sm px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-lime-400/10 hover:shadow-lime-400/20 active:scale-95"
          >
            Launch Creator Studio
          </button>
          <a 
            href="#features"
            className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-semibold text-sm px-8 py-4 rounded-xl transition-colors border border-neutral-800 text-center"
          >
            Explore Framework Features
          </a>
        </div>
      </section>

      {/* 3. METRICS BANNER / TICKER LOGO ROW */}
      <section id="metrics" className="border-y border-neutral-900 bg-neutral-900/20 backdrop-blur-sm py-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">0.02ms</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">S3 Sync Latency</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-lime-400">100%</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Metadata Accuracy</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">PostgreSQL</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Supabase Stack</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-lime-400">500 MB</div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Max Upload Tier</div>
          </div>
        </div>
      </section>

      {/* 4. SSEMBLE STYLE DYNAMIC FEATURE MATRIX GRID */}
      <section id="features" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto scroll-mt-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Engineered For Frictionless Upload Pipelines
          </h2>
          <p className="text-neutral-500 mt-3 text-sm sm:text-base max-w-xl mx-auto">
            Everything you need to handle serverless video assets securely without losing user context tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Feature 1 */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 hover:border-neutral-800 transition-all group">
            <div className="w-12 h-12 bg-neutral-900 rounded-xl border border-neutral-800 text-lime-400 flex items-center justify-center mb-6 shadow-inner group-hover:border-lime-400/20 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Presigned S3 Routing</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Files bypass heavy app proxy bottlenecks entirely. Secure, single-use signed paths send binary data streams directly to Amazon S3.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 hover:border-neutral-800 transition-all group">
            <div className="w-12 h-12 bg-neutral-900 rounded-xl border border-neutral-800 text-white flex items-center justify-center mb-6 shadow-inner group-hover:border-lime-400/20 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-lime-400 mb-2">Supabase Sync Logs</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Keeps a persistent transaction index of every file, randomized UUID naming string key references, duration markers, and creator relational mapping keys.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 hover:border-neutral-800 transition-all group">
            <div className="w-12 h-12 bg-neutral-900 rounded-xl border border-neutral-800 text-lime-400 flex items-center justify-center mb-6 shadow-inner group-hover:border-lime-400/20 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Clerk-Backed Limitations</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Enforce multi-tier upload sizes automatically. Guards resources instantly with strict data isolation rules built directly into our endpoint route gateways.
            </p>
          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE LIVE WORKSPACE PIPELINE STUDIO CONTAINER AREA */}
      <section id="workspace-section" className="py-20 bg-neutral-900/10 border-t border-neutral-900 scroll-mt-24">
        <div className="max-w-4xl mx-auto px-6 text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Next.js Interface Upload Terminal
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-md mx-auto">
            Interact with your media pipeline below. Sign in to unlock your persistent historical tracking slots.
          </p>
        </div>
        
        {/* Render our core video engine workspace component box block structure */}
        <div className="px-4">
          <VideoUploader />
        </div>
      </section>

      {/* 6. CLEAN FOOTER AREA */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 px-6 lg:px-16 text-center text-xs text-neutral-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-neutral-800 text-lime-400 font-black rounded flex items-center justify-center text-xs">
              S
            </div>
            <span className="font-bold text-neutral-400">StreamCut Studio Suite</span>
          </div>
          <p>© 2026 StreamCut Media Inc. All technical infrastructure rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}