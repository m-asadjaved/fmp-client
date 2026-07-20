'use client';

import React from 'react';
import { SignInButton, UserButton, useAuth, useClerk, useUser } from '@clerk/nextjs';
import CustomCursor from '@/components/ui/CustomCursor';
import { Link, Sparkles, Share, Play, UploadCloud, Focus, Zap, Video, Scissors, Smile, Smartphone, Type } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUpload } from '@/contexts/UploadContext';
import { useAlert } from '@/contexts/AlertContext';
import { initializePaddle } from "@paddle/paddle-js";

import { LandingFeatures } from '../components/ui/LandingFeatures';
import { LandingShowcase } from '../components/ui/LandingShowcase';
import { LandingFaq } from '../components/ui/LandingFaq';
import { InfiniteLogoSlider } from '../components/ui/InfiniteLogoSlider';
import { LandingTools } from '../components/ui/LandingTools';
import { LandingBlog } from '../components/ui/LandingBlog';
import { LandingFooter } from '../components/ui/LandingFooter';
import { PricingClient } from './components/pricing/PricingClient';

const AuthButtonWrapper = ({ children, forceRedirectUrl = "/dashboard" }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return React.cloneElement(children, {
      onClick: (e) => e.preventDefault(),
      style: { ...children.props.style, opacity: 0.7, cursor: 'not-allowed' }
    });
  }

  if (isSignedIn) {
    return React.cloneElement(children, {
      onClick: (e) => {
        if (children.props.onClick) children.props.onClick(e);
        if (!e.defaultPrevented) router.push(forceRedirectUrl);
      }
    });
  }

  return (
    <SignInButton mode="modal" forceRedirectUrl={forceRedirectUrl}>
      {children}
    </SignInButton>
  );
};

export default function SsembleCloneLanding({ country }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  const { setPendingFile } = useUpload();
  const { showAlert } = useAlert();
  const clerk = useClerk();

  const [paddle, setPaddle] = React.useState(null);

  React.useEffect(() => {
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!env || !token) {
      console.error("CRITICAL: Missing NEXT_PUBLIC_PADDLE_ENV or NEXT_PUBLIC_PADDLE_CLIENT_TOKEN. Check your .env file.");
      return;
    }

    initializePaddle({ 
      environment: env,
      token: token 
    }).then(setPaddle);
  }, []);

  const [currentPlan, setCurrentPlan] = React.useState(null);
  const { user } = useUser();

  React.useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/credits', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.currentPlan) {
          let displayName = data.currentPlan;
          if (displayName.toLowerCase().startsWith("pri_")) {
            displayName = "Pro";
          }
          setCurrentPlan(displayName.charAt(0).toUpperCase() + displayName.slice(1));
        }
      })
      .catch(console.error);
  }, [isSignedIn]);

  const [isDragActive, setIsDragActive] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile.type.startsWith('video/')) {
      showAlert('Invalid File', 'Please select a valid video file.', 'error');
      return;
    }

    if (isSignedIn) {
      setPendingFile(selectedFile);
      router.push('/dashboard');
    } else {
      clerk.openSignIn({ forceRedirectUrl: '/dashboard' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-surface text-brand-on-surface font-sans selection:bg-brand-primary/20 relative overflow-x-hidden">
      <CustomCursor />
      {/* Stripe signature multi-color gradient mesh (Moved to root so it bleeds under header) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[140%] max-w-[1400px] h-[800px] opacity-100 pointer-events-none z-0 blur-[100px] saturate-200 mix-blend-normal">
        <div className="absolute w-[60%] h-[60%] left-0 top-0 rounded-full animate-mesh-1 opacity-90 bg-[#533afd]" />
        <div className="absolute w-[60%] h-[60%] right-0 top-[20%] rounded-full animate-mesh-2 opacity-90 bg-[#A855F7]" />
        <div className="absolute w-[60%] h-[60%] left-[20%] bottom-0 rounded-full animate-mesh-3 opacity-90 bg-[#7f7dfc]" />
        <div className="absolute w-[60%] h-[60%] right-[20%] bottom-[10%] rounded-full animate-mesh-4 opacity-90 bg-[#14B8A6]" />
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-8">
            <a href="/" className="flex items-center">
              <img
                src="/logo-transparent.png"
                alt="twenty2short"
                className="h-12 md:h-14 w-auto object-contain transform scale-110 origin-left brightness-0"
              />
            </a>

            <div className="hidden md:flex items-center gap-1">
              {['Pricing', 'API', 'MCP', 'Help', 'Blog'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="px-4 py-2 text-[14px] font-[400] text-brand-on-surface-variant rounded-md hover:bg-brand-surfaceBg transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isLoaded ? (
              <div className="w-24 h-10 bg-brand-surfaceBg animate-pulse rounded-md hidden sm:block"></div>
            ) : !isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="stripe-btn-outline hidden sm:block">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="stripe-btn-primary">
                    Create Account
                  </button>
                </SignInButton>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mr-2">
                  <UserButton afterSignOutUrl="/" />
                  <div className="flex flex-col text-left hidden md:flex">
                    <span className="text-sm font-medium text-brand-secondary leading-tight">{user?.fullName || user?.primaryEmailAddress?.emailAddress || "My Account"}</span>
                    {currentPlan ? (
                      <span className="text-[10px] font-[400] text-brand-primary uppercase tracking-wider">{currentPlan}</span>
                    ) : (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-brand-primary border-t-transparent mt-0.5" />
                    )}
                  </div>
                </div>
                <a href="/dashboard" className="stripe-btn-primary">
                  Dashboard
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <div className="relative pt-16 md:pt-20 pb-12 z-10">

          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center text-center relative">
            
            {/* Floating Decorative Glassmorphism Elements */}
            <div className="hidden lg:flex absolute left-[5%] top-[10%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-4 stagger-2 flex-col items-center gap-2 rotate-[-4deg] hover:rotate-0 transition-transform duration-500 cursor-default">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary to-brand-violet-light flex items-center justify-center shadow-md-card">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-label-small text-brand-secondary font-[400]">Auto-Captions</span>
            </div>

            <div className="hidden lg:flex absolute right-[5%] top-[25%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-4 stagger-3 flex-row items-center gap-3 rotate-[3deg] hover:rotate-0 transition-transform duration-500 cursor-default">
              <div className="w-8 h-8 rounded-md bg-[#ff6118]/10  flex items-center justify-center">
                <Play className="w-4 h-4 text-[#ff6118]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-[400] text-brand-secondary leading-tight">Clip #4 Generated</span>
                <span className="text-[10px] font-[300] text-[#ff6118]">Viral potential: 98%</span>
              </div>
            </div>

            <div className="hidden lg:flex absolute left-[12%] top-[65%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-3 stagger-4 flex-row items-center gap-2 rotate-[2deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#A855F7] to-[#14B8A6] flex items-center justify-center shadow-md-card">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-[12px] text-brand-secondary font-[400]">Dynamic Hook</span>
            </div>

            <div className="hidden lg:flex absolute right-[12%] top-[60%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-4 stagger-5 flex-row items-center gap-3 rotate-[-2deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-8 h-8 rounded-md bg-[#14B8A6]/10  flex items-center justify-center">
                <Focus className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-[400] text-brand-secondary leading-tight">Face Tracking</span>
                <span className="text-[10px] font-[300] text-[#14B8A6]">Subject Centered</span>
              </div>
            </div>



            {/* EVEN MORE DECORATIVE BADGES */}
            <div className="hidden lg:flex absolute right-[20%] top-[12%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-3 stagger-2 flex-row items-center gap-2 rotate-[4deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10  flex items-center justify-center">
                <Scissors className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-[400] text-brand-secondary leading-tight">Silence Removed</span>
                <span className="text-[9px] font-[300] text-[#14B8A6]">-14.2s cut</span>
              </div>
            </div>

            <div className="hidden lg:flex absolute left-[2%] top-[40%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-3 stagger-3 flex-row items-center gap-2 rotate-[-6deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-8 h-8 rounded-full bg-[#ff6118]/10  flex items-center justify-center">
                <Smile className="w-4 h-4 text-[#ff6118]" />
              </div>
              <span className="text-[11px] text-brand-secondary font-[400]">Emojis Injected</span>
            </div>

            <div className="hidden lg:flex absolute right-[2%] top-[80%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-3 stagger-5 flex-row items-center gap-2 rotate-[5deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-8 h-8 rounded-md bg-[#A855F7]/10  flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-[#A855F7]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-[400] text-brand-secondary leading-tight">Format: 9:16</span>
                <span className="text-[9px] font-[300] text-[#A855F7]">TikTok Ready</span>
              </div>
            </div>

            <div className="hidden lg:flex absolute left-[20%] top-[30%] bg-white/60 backdrop-blur-xl  shadow-lg-card rounded-xl p-3 stagger-4 flex-row items-center gap-2 rotate-[3deg] hover:rotate-0 transition-transform duration-500 cursor-default z-10">
              <div className="w-6 h-6 rounded-md bg-brand-primary/10  flex items-center justify-center">
                <Type className="w-3 h-3 text-brand-primary" />
              </div>
              <span className="text-[11px] text-brand-secondary font-[400]">AI Subtitles: EN</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[72px] font-[300] max-w-5xl tracking-tight text-balance leading-[1.03] text-brand-secondary stagger-1 relative z-10">
              <span className="block">Turn your long videos into</span>
              <span className="block bg-gradient-to-r from-brand-primary via-[#A855F7] to-[#ff6118] bg-clip-text text-transparent pb-2 mt-1">
                Viral Shorts
              </span>
            </h1>

            <p className="mt-6 text-[16px] md:text-[20px] text-brand-on-surface-variant max-w-2xl leading-[22.4px] font-[300] stagger-2">
              twenty2short automatically clips, captions, and posts your videos to TikTok, YouTube & Instagram.
            </p>

            {/* Social Proof Avatars */}
            <div className="flex flex-col items-center mt-8 mb-4 stagger-3">
              <div className="flex -space-x-4 mb-2">
                {[
                  "https://cf.ssemble.com/ssemble-static-assets/jornadatop.png",
                  "https://cf.ssemble.com/ssemble-static-assets/celleto.png",
                  "https://cf.ssemble.com/ssemble-static-assets/harshhhgautam.png",
                  "https://cf.ssemble.com/ssemble-static-assets/creationsinguliere.png"
                ].map((src, i) => (
                  <div key={i} className="w-10 h-10 rounded-md overflow-hidden shadow-sm-bottom relative transition-transform hover:-translate-y-1 hover:z-10 z-0">
                    <img src={src} alt="Creator avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[#ff6118] text-sm mb-1">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-[11px] text-brand-on-surface-variant font-[300] tracking-wide">
                Trusted by thousands of shorts clippers | 4.9 out of 5
              </p>
            </div>

            {/* Input Action */}
            <div className="w-full max-w-2xl mt-8 px-4 sm:px-0 flex flex-col gap-4 stagger-4 relative z-10">
              <div className="flex flex-col sm:flex-row items-center bg-white/70 backdrop-blur-lg sm:rounded-xl sm: transition-colors shadow-lg-card hover:shadow-xl-popover hover:border-brand-primary/40 duration-300 overflow-hidden gap-3 sm:gap-0 bg-transparent p-0 sm:p-2 cursor-not-allowed relative">
                <input
                  type="url"
                  disabled
                  placeholder="YouTube URL integration under development"
                  className="w-full sm:flex-1 px-6 py-4 text-[16px] focus:outline-none rounded-md sm:rounded-none  sm:border-none shadow-sm-bottom sm:shadow-none bg-brand-surfaceBg text-brand-on-surface-variant cursor-not-allowed font-[400]"
                />
                <button disabled className="stripe-btn-primary w-full sm:w-auto opacity-50 cursor-not-allowed pointer-events-none" onClick={(e) => e.preventDefault()}>
                  Get Clips Now
                </button>
              </div>

              {/* Drag and Drop Area */}
              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full min-h-[160px] flex flex-col items-center justify-center text-center rounded-md cursor-pointer p-6 transition-all border border-dashed ${isDragActive ? "bg-brand-primary/5 border-brand-primary" : "bg-brand-surface border-brand-border-subtle hover:border-brand-on-surface-variant shadow-md-card"
                    }`}
                >
                  <div className="bg-brand-surfaceBg p-3 rounded-md text-brand-on-surface-variant mb-3  shadow-sm-bottom">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-label-small text-brand-secondary mb-1">Upload Video Asset</p>
                  <p className="text-[11px] text-brand-on-surface-variant mb-2 font-[300]">
                    Drag & drop or <span className="text-brand-primary font-[400]">browse files</span>
                  </p>
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] uppercase tracking-wider font-bold rounded-full mt-2 border border-brand-primary/20">
                    Bonus: Limit Increased to 3GB • 1 Hour
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-brand-on-surface-variant mt-2 font-[300]">Plans from $6/mo · Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* DEMO VIDEO SECTION */}
        <div className="w-full bg-brand-surface pt-6 pb-10 stagger-5">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="relative rounded-md overflow-hidden shadow-lg-card  hero-3d-card" style={{ paddingTop: '56.25%' }}>
              <iframe
                src="https://customer-a8pcy45g7jeje4za.cloudflarestream.com/d1158daf5c258ab75f3eb0c9dd3cd6ec/iframe?muted=true&autoplay=true&poster=https%3A%2F%2Fcustomer-a8pcy45g7jeje4za.cloudflarestream.com%2Fd1158daf5c258ab75f3eb0c9dd3cd6ec%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1%26height%3D600&controls=false&loop=true"
                title="twenty2short AI clipping demo"
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0 scale-[1.02] pointer-events-none"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        {/* TRUSTED BY LOGOS */}
        <InfiniteLogoSlider />

        {/* HOW IT WORKS */}
        <div className="py-20 md:py-28 px-4 bg-brand-surface">
          <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-center text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4">
            How It Works
          </h2>
          <p className="text-center text-[16px] text-brand-on-surface-variant max-w-3xl mx-auto mb-16 font-[300]">
            From YouTube video to viral clips in 3 simple steps
          </p>

          <div className="max-w-5xl mx-auto relative">
            {/* Connecting line for desktop */}
            <div className="hidden lg:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-brand-border-subtle -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-md  flex items-center justify-center shadow-md-card mb-6 transition-transform hover:scale-105 bg-brand-surface">
                  <Link className="w-10 h-10 text-brand-secondary" />
                </div>
                <h3 className="text-section-heading-md font-[300] text-brand-secondary mb-3 tracking-[-0.22px]">Paste a YouTube URL</h3>
                <p className="text-brand-on-surface-variant font-[300] leading-[22.4px] max-w-xs text-[16px]">
                  Drop any YouTube video link. Long-form, podcast, gaming stream — anything works.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-md  flex items-center justify-center shadow-md-card mb-6 transition-transform hover:scale-105 bg-brand-surface">
                  <Sparkles className="w-10 h-10 text-brand-primary" />
                </div>
                <h3 className="text-section-heading-md font-[300] text-brand-secondary mb-3 tracking-[-0.22px]">AI Creates Clips</h3>
                <p className="text-brand-on-surface-variant font-[300] leading-[22.4px] max-w-xs text-[16px]">
                  Our AI finds the most viral moments, adds captions, face tracking, and hooks — automatically.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-md  flex items-center justify-center shadow-md-card mb-6 transition-transform hover:scale-105 bg-brand-surface">
                  <Share className="w-10 h-10 text-brand-secondary" />
                </div>
                <h3 className="text-section-heading-md font-[300] text-brand-secondary mb-3 tracking-[-0.22px]">Post Everywhere</h3>
                <p className="text-brand-on-surface-variant font-[300] leading-[22.4px] max-w-xs text-[16px]">
                  Schedule and auto-post to TikTok, YouTube Shorts, and Instagram Reels in one click.
                </p>
              </div>

            </div>

            <div className="text-center mt-16">
              <AuthButtonWrapper forceRedirectUrl="/dashboard">
                <button className="stripe-btn-primary px-6 py-3">
                  Get Started
                </button>
              </AuthButtonWrapper>
            </div>
          </div>
        </div>

        <LandingFeatures />
        <LandingShowcase />

        {/* PRICING SECTION */}
        <PricingClient paddle={paddle} country={country} />

        <LandingFaq />
        <LandingTools />
        <LandingBlog />

        {/* BOTTOM CTA BAND */}
        <section className="bg-brand-surfaceBg py-24 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[1.03] mb-6 text-balance">
              Start creating for free.
            </h2>
            <p className="text-brand-on-surface-variant text-[16px] max-w-2xl mx-auto mb-10 leading-[22.4px] font-[300]">
              Join 200,000+ creators already using twenty2short to grow their audience faster.
            </p>
            <AuthButtonWrapper forceRedirectUrl="/dashboard">
              <button className="stripe-btn-primary px-8 py-3 text-[16px]">
                Start editing free
              </button>
            </AuthButtonWrapper>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}