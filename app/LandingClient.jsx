'use client';

import React from 'react';
import { SignInButton, UserButton, useAuth, useClerk } from '@clerk/nextjs';
import { Link, Sparkles, Share, Play, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUpload } from '@/contexts/UploadContext';
import { useAlert } from '@/contexts/AlertContext';
import { initializePaddle } from "@paddle/paddle-js";

import { LandingFeatures } from '../components/ui/LandingFeatures';
import { LandingShowcase } from '../components/ui/LandingShowcase';
import { LandingFaq } from '../components/ui/LandingFaq';
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
    <div className="min-h-screen w-full bg-white text-black font-sans selection:bg-[#00C0D4]/20">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-8">
            <a href="/" className="flex items-center">
              <img
                src="/logo-transparent.png"
                alt="twenty2short"
                className="h-12 md:h-14 w-auto object-contain transform scale-110 origin-left"
              />
            </a>

            <div className="hidden md:flex items-center gap-1">
              {['Pricing', 'API', 'MCP', 'Help', 'Blog'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isLoaded ? (
              <div className="w-24 h-10 bg-gray-100 animate-pulse rounded-md hidden sm:block"></div>
            ) : !isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-sm font-medium text-[#0F2347] hover:text-[#00C0D4] transition-colors hidden sm:block cursor-pointer bg-transparent border-0">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-sm font-semibold text-white bg-[#00C0D4] rounded-md shadow-sm hover:bg-[#00A6B8] transition-colors cursor-pointer border-0">
                    Create Account
                  </button>
                </SignInButton>
              </>
            ) : (
              <>
                <a href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                  Dashboard
                </a>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <div className="relative overflow-hidden bg-white pt-10 md:pt-8 pb-6">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-b from-[#00C0D4]/20 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold max-w-5xl tracking-tight text-balance leading-[1.1]">
              <span className="block text-black">Turn your long videos into</span>
              <span className="block bg-gradient-to-r from-[#00C0D4] to-[#00C0D4] bg-clip-text text-transparent pb-2 mt-1">
                Viral Shorts
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed">
              twenty2short automatically clips, captions, and posts your videos to TikTok, YouTube & Instagram.
            </p>

            {/* Social Proof Avatars */}
            <div className="flex flex-col items-center mt-8 mb-4">
              <div className="flex -space-x-4 mb-2">
                {[
                  "https://cf.ssemble.com/ssemble-static-assets/jornadatop.png",
                  "https://cf.ssemble.com/ssemble-static-assets/celleto.png",
                  "https://cf.ssemble.com/ssemble-static-assets/harshhhgautam.png",
                  "https://cf.ssemble.com/ssemble-static-assets/creationsinguliere.png"
                ].map((src, i) => (
                  <div key={i} className="w-10 h-10 rounded-2xl border-2 border-white overflow-hidden shadow-sm relative transition-transform hover:-translate-y-1 hover:z-10 z-0">
                    <img src={src} alt="Creator avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-yellow-400 text-sm mb-1">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-xs text-gray-400 font-medium tracking-wide">
                Trusted by thousands of shorts clippers | 4.9 out of 5
              </p>
            </div>

            {/* Input Action */}
            <div className="w-full max-w-2xl mt-2 px-4 sm:px-0 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center bg-gray-50 sm:rounded-2xl sm:border-2 border-gray-200 transition-colors shadow-sm overflow-hidden gap-3 sm:gap-0 bg-transparent sm:bg-gray-50 p-0 sm:p-1 opacity-80 cursor-not-allowed relative">
                <input
                  type="url"
                  disabled
                  placeholder="YouTube URL integration under development"
                  className="w-full sm:flex-1 px-6 py-4 text-lg focus:outline-none rounded-2xl sm:rounded-none border-2 border-gray-200 sm:border-none shadow-md sm:shadow-none bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <AuthButtonWrapper forceRedirectUrl="/dashboard">
                  <button disabled className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gray-400 rounded-2xl shadow-sm whitespace-nowrap cursor-not-allowed border-0">
                    Get Clips Now
                  </button>
                </AuthButtonWrapper>
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
                  className={`w-full min-h-[160px] flex flex-col items-center justify-center text-center rounded-2xl cursor-pointer p-6 transition-all border-2 border-dashed ${isDragActive ? "bg-[#00C0D4]/5 border-[#0F2347]" : "bg-white border-gray-200 hover:border-gray-400 shadow-md hover:shadow-lg"
                    }`}
                >
                  <div className="bg-gray-50 p-3 rounded-full text-gray-500 mb-3 border border-gray-200 shadow-sm">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#0F2347] mb-1">Upload Video Asset</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Drag & drop or <span className="text-[#00C0D4] font-semibold">browse files</span>
                  </p>
                  <span className="text-[10px] font-bold text-[#00C0D4] bg-[#00C0D4]/10 border border-[#00C0D4]/20 px-2 py-1 rounded-full uppercase tracking-wider mt-2">
                    Bonus: Limit Increased to 3GB • 1 Hour
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2">Plans from $6/mo · Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* DEMO VIDEO SECTION */}
        <div className="w-full bg-white pt-6 pb-10">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="relative rounded-2xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
              <iframe
                src="https://customer-a8pcy45g7jeje4za.cloudflarestream.com/d1158daf5c258ab75f3eb0c9dd3cd6ec/iframe?muted=true&autoplay=true&poster=https%3A%2F%2Fcustomer-a8pcy45g7jeje4za.cloudflarestream.com%2Fd1158daf5c258ab75f3eb0c9dd3cd6ec%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1%26height%3D600&controls=false&loop=true"
                title="twenty2short AI clipping demo"
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0 scale-[1.02]"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        {/* TRUSTED BY LOGOS */}
        <div className="py-12 bg-gray-50 border-y border-gray-100">
          <p className="text-center text-sm font-medium text-gray-400 mb-8 uppercase tracking-widest">
            Trusted by teams at leading companies and institutions
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 px-4 opacity-50 grayscale">
            {['Google', 'Meta', 'Amazon', 'Netflix', 'Shopify'].map((brand) => (
              <div key={brand} className="text-xl md:text-2xl font-black text-[#0F2347]">{brand}</div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="py-20 md:py-28 px-4 bg-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#0F2347] tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-center text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-16">
            From YouTube video to viral clips in 3 simple steps
          </p>

          <div className="max-w-5xl mx-auto relative">
            {/* Connecting line for desktop */}
            <div className="hidden lg:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gray-200 -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border border-gray-100 flex items-center justify-center shadow-sm mb-6 transition-transform hover:scale-105 bg-white">
                  <Link className="w-10 h-10 text-[#0F2347]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F2347] mb-3">Paste a YouTube URL</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs">
                  Drop any YouTube video link. Long-form, podcast, gaming stream — anything works.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border border-gray-100 flex items-center justify-center shadow-sm mb-6 transition-transform hover:scale-105 bg-white">
                  <Sparkles className="w-10 h-10 text-[#00C0D4]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F2347] mb-3">AI Creates Clips</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs">
                  Our AI finds the most viral moments, adds captions, face tracking, and hooks — automatically.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border border-gray-100 flex items-center justify-center shadow-sm mb-6 transition-transform hover:scale-105 bg-white">
                  <Share className="w-10 h-10 text-[#0F2347]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F2347] mb-3">Post Everywhere</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs">
                  Schedule and auto-post to TikTok, YouTube Shorts, and Instagram Reels in one click.
                </p>
              </div>

            </div>

            <div className="text-center mt-16">
              <AuthButtonWrapper forceRedirectUrl="/dashboard">
                <button className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[#0F2347] to-[#00C0D4] hover:from-[#0C1C3A] hover:to-[#00A6B8] border-0 rounded-2xl shadow-lg hover:scale-105 transition-transform cursor-pointer">
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
        <section className="bg-[#0F2347] py-24 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 text-balance">
              Start creating for free.
            </h2>
            <p className="text-cyan-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Join 200,000+ creators already using twenty2short to grow their audience faster.
            </p>
            <AuthButtonWrapper forceRedirectUrl="/dashboard">
              <button className="px-10 py-5 text-lg font-bold text-[#0F2347] bg-white rounded-full shadow-lg hover:scale-105 hover:bg-gray-50 transition-all cursor-pointer border-0">
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