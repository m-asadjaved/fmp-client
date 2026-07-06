'use client';

import React from 'react';
import { SignInButton, UserButton, useAuth, PricingTable } from '@clerk/nextjs';

const SAMPLES = [
  { cat: 'Podcast', title: 'Weekly creator roundup — Episode 42', user: '@alexmakes', views: '14k', color: '#2563eb', span: 'span 7' },
  { cat: 'Product Ad', title: 'Summer collection launch — 15s reel', user: '@mirabrand', views: '31k', color: '#e11d48', span: 'span 5' },
  { cat: 'Tutorial', title: 'How I built my SaaS in 30 days', user: '@jdevs', views: '88k', color: '#3b82f6', span: 'span 4' },
  { cat: 'Short Film', title: 'Cinematic travel vlog — Tokyo 2026', user: '@sanavisuals', views: '52k', color: '#7c3aed', span: 'span 8' },
  { cat: 'Course Promo', title: 'Free Figma masterclass — signup teaser', user: '@kdesign', views: '19k', color: '#059669', span: 'span 6' },
  { cat: 'Newsletter', title: 'Turning my email list into a video series', user: '@rwritesnow', views: '7k', color: '#d97706', span: 'span 6' },
];

const THUMB_COLORS = ['#eff6ff', '#fff7ed', '#fff1f2', '#f0f9ff', '#f5f3ff', '#f0fdf4'];

const FEATURES = [
  { icon: '✂️', title: 'AI Auto-Captions', desc: 'Transcribe audio in 30+ languages instantly with flawless burn-in stylized text overlays.' },
  { icon: '⬜', title: 'Smart canvas resize', desc: 'Auto-reframe any video composition into 9:16 Shorts, 1:1 square, or 16:9 widescreen formats.' },
  { icon: '🔌', title: 'Creator plugin store', desc: 'Supercharge edits with background removers, realistic AI voiceovers, and sound effects libraries.' },
  { icon: '🗂', title: 'Cloud project library', desc: 'Save project files securely online. Edit, collaborate, and cut from any machine, anywhere.' },
];

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    desc: 'Perfect for casual creators getting started.',
    buttonText: 'Start for free',
    popular: false,
    features: ['720p HD Video Exports', 'Watermark on videos', '10 mins AI Captions / mo', '2GB Secure Cloud Storage', 'Access to standard plugins']
  },
  {
    name: 'Pro Premium',
    price: '$24',
    period: '/mo',
    desc: 'Our most popular plan for professional creators.',
    buttonText: 'Upgrade to Pro',
    popular: true,
    features: ['Up to 4K Ultra HD Exports', 'No Watermark', '300 mins AI Captions / mo', '100GB Premium Storage', 'Unlimited Pro Plugin Store', 'Priority cloud rendering speed']
  },
  {
    name: 'Team / Business',
    price: '$49',
    period: '/mo',
    desc: 'Built for agencies, brands, and content teams.',
    buttonText: 'Get Team access',
    popular: false,
    features: ['Everything in Pro Premium Plan', 'Shared team folders & assets', '1,200 mins AI Captions / mo', '500GB Team Cloud Storage', 'Dedicated account representative', 'Custom brand kits & fonts']
  }
];

const FAQS = [
  { q: 'Will my rendered videos have watermarks?', a: 'Videos created on our Free plan include a small brand watermark. Upgrading to the Pro Premium or Team plan removes all watermarks completely from your content.' },
  { q: 'How do the AI Caption minutes work?', a: 'Every billing month, your allowance resets. Minutes are calculated based on the length of the audio track you upload for automated translation or subtitle generation.' },
  { q: 'Can I cancel or change my plan later?', a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription straight from your account billing portal at any time with zero cancellation penalties.' }
];

const s = {
  root: { background: '#ffffff', color: '#09090b', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5rem', height: 64, background: '#ffffff', borderBottom: '1px solid #e4e4e7', position: 'sticky', top: 0, zIndex: 50 },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  lmark: { width: 30, height: 30, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#ffffff', border: '1px solid #3b82f6' },
  ltext: { fontSize: 16, fontWeight: 800, letterSpacing: '-0.4px', color: '#09090b' },
  navLinks: { display: 'flex', gap: '2rem' },
  navLink: { fontSize: 13, color: '#52525b', fontWeight: 500, textDecoration: 'none' },
  navR: { display: 'flex', gap: 12, alignItems: 'center' },
  btnOutline: { background: 'transparent', border: '1.5px solid #e4e4e7', color: '#09090b', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 100, cursor: 'pointer' },
  btnAccent: { background: '#2563eb', border: '1px solid #3b82f6', color: '#ffffff', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 100, cursor: 'pointer' },

  /* NEW HERO LAYOUT (SPLIT 2-COLUMN) */
  heroSection: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '3.5rem', alignItems: 'center', padding: '7rem 2.5rem 5rem', maxWidth: 1200, margin: '0 auto' },
  heroLeft: { textAlign: 'left' },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 100, padding: '6px 14px', fontSize: 11, color: '#1e40af', fontWeight: 700, letterSpacing: '.5px', marginBottom: '1.5rem' },
  badgeDot: { width: 6, height: 6, background: '#3b82f6', borderRadius: '50%', display: 'inline-block' },
  h1: { fontSize: '3.4rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#09090b', marginBottom: '1.5rem' },
  heroSub: { fontSize: '1.1rem', color: '#52525b', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 520 },
  heroCtas: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' },
  btnHero: { background: '#2563eb', border: '1px solid #3b82f6', color: '#ffffff', fontSize: 15, fontWeight: 700, padding: '14px 32px', borderRadius: 100, cursor: 'pointer' },
  btnSec: { background: '#ffffff', border: '1px solid #e4e4e7', color: '#09090b', fontSize: 15, fontWeight: 600, padding: '14px 28px', borderRadius: 100, cursor: 'pointer' },
  note: { fontSize: 12, color: '#71717a' },

  /* HERO MOCK WORKSTATION VISUAL */
  heroRight: { background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 20, padding: '1rem', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', position: 'relative' },
  mockHeader: { display: 'flex', gap: 6, marginBottom: 12 },
  mockDot: { width: 10, height: 10, borderRadius: '50%', background: '#e4e4e7' },
  mockStage: { background: '#18181b', borderRadius: 12, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  mockPlay: { width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 16 },
  mockBadge: { position: 'absolute', top: 12, left: 12, background: '#2563eb', color: '#ffffff', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 },
  mockTrack: { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 10, padding: 10, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  mockBar: { height: 8, background: '#f4f4f5', borderRadius: 4, width: '100%' },
  mockWave: { height: 24, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, position: 'relative', overflow: 'hidden' },
  mockWaveFill: { position: 'absolute', left: '15%', top: 0, bottom: 0, width: '50%', background: '#dbeafe' },

  trusted: { textAlign: 'center', padding: '2rem 2rem 4rem' },
  trustedTxt: { fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1.5rem', fontWeight: 700 },
  trustedRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3.5rem', flexWrap: 'wrap' },
  trustedLogo: { fontSize: 14, fontWeight: 800, color: '#71717a', letterSpacing: '-.3px' },

  /* NEW CREATOR SHOWCASE GRID (BENTO ASYMMETRIC) */
  sectionWrap: { padding: '6rem 2.5rem', background: '#ffffff', borderTop: '1px solid #e4e4e7', borderBottom: '1px solid #e4e4e7' },
  eyebrow: { fontSize: 11, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, textAlign: 'center', marginBottom: '.75rem' },
  sectionH: { fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', textAlign: 'center', color: '#09090b', marginBottom: '.75rem' },
  sectionSub: { fontSize: 15, color: '#52525b', textAlign: 'center', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 4rem' },
  samplesGrid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, maxWidth: 1140, margin: '0 auto' },
  sampleCard: { borderRadius: 16, overflow: 'hidden', border: '1px solid #e4e4e7', background: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column' },
  sampleThumb: { height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  sampleBody: { padding: '18px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  sampleCat: { fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 },
  sampleTitle: { fontSize: 15, fontWeight: 700, color: '#09090b', lineHeight: 1.4 },
  sampleMeta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 },
  sampleUser: { fontSize: 12, color: '#71717a' },

  howWrap: { padding: '6rem 2.5rem', background: '#f0f9ff', borderBottom: '1px solid #e0f2fe' },
  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' },
  howCard: { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center' },
  howIcon: { width: 48, height: 48, background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 22 },
  howH: { fontSize: 16, fontWeight: 700, color: '#09090b', marginBottom: 8 },
  howP: { fontSize: 13, color: '#52525b', lineHeight: 1.6 },
  featWrap: { padding: '6rem 2.5rem', background: '#ffffff', borderBottom: '1px solid #e4e4e7' },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 900, margin: '0 auto' },
  featCard: { background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 16, padding: '2rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' },
  featIcon: { width: 44, height: 44, background: '#f4f4f5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 },
  featH: { fontSize: 15, fontWeight: 700, color: '#09090b', marginBottom: 6 },
  featP: { fontSize: 13, color: '#52525b', lineHeight: 1.6 },

  priceWrap: { padding: '6rem 2.5rem', background: '#ffffff', borderBottom: '1px solid #e4e4e7' },
  priceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' },
  priceCard: { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 20, padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', position: 'relative' },
  priceCardPop: { background: '#ffffff', border: '2.5px solid #2563eb', borderRadius: 20, padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px -10px rgba(37,99,235,0.12)' },
  popBadge: { position: 'absolute', top: -12, right: 24, background: '#2563eb', color: '#ffffff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 100, border: '1px solid #3b82f6', textTransform: 'uppercase', letterSpacing: '.5px' },
  priceH3: { fontSize: 18, fontWeight: 800, color: '#09090b', marginBottom: 6 },
  priceDesc: { fontSize: 13, color: '#71717a', lineHeight: 1.4, marginBottom: '1.5rem' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.5rem' },
  priceNum: { fontSize: '2.5rem', fontWeight: 900, color: '#09090b', letterSpacing: '-1px' },
  pricePer: { fontSize: 14, color: '#71717a', fontWeight: 500 },
  btnPrice: { width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e4e4e7', background: '#ffffff', color: '#09090b', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: '2rem' },
  btnPricePop: { width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: '2rem' },
  fList: { display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' },
  fItem: { fontSize: 13, color: '#3f3f46', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500 },
  fCheck: { color: '#2563eb', fontWeight: 900, fontSize: 14 },

  faqWrap: { padding: '6rem 2.5rem', background: '#fafafa', borderBottom: '1px solid #e4e4e7' },
  faqGrid: { maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 },
  faqCard: { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 14, padding: '1.5rem 2rem' },
  faqQ: { fontSize: 15, fontWeight: 800, color: '#09090b', marginBottom: 8 },
  faqA: { fontSize: 13, color: '#52525b', lineHeight: 1.6 },

  ctaBand: { background: '#2563eb', padding: '6rem 2.5rem', textAlign: 'center', borderTop: '1px solid #3b82f6' },
  ctaH: { fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '1rem' },
  ctaP: { fontSize: 16, color: '#dbeafe', marginBottom: '2.5rem', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6, fontWeight: 500 },
  btnWhite: { background: '#ffffff', color: '#000000', fontSize: 15, fontWeight: 700, padding: '16px 36px', borderRadius: 100, border: 'none', cursor: 'pointer' },
  footer: { background: '#ffffff', borderTop: '1px solid #e4e4e7', padding: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  footerCopy: { fontSize: 12, color: '#71717a' },
  footerLinks: { display: 'flex', gap: '1.5rem' },
  footerLink: { fontSize: 12, color: '#71717a', textDecoration: 'none' },
};

function SampleThumb({ index }) {
  const bg = THUMB_COLORS[index];
  if (index === 0) return (
    <div style={{ ...s.sampleThumb, background: bg, flexDirection: 'column', gap: 4, padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 70 }}>
        {[30, 50, 40, 65, 45, 55, 35, 60, 40, 50].map((h, i) => (
          <div key={i} style={{ width: 18, height: h, background: i % 2 === 0 ? '#3b82f6' : '#2563eb', borderRadius: '4px 4px 0 0' }} />
        ))}
      </div>
      <div style={{ height: 6, background: '#e4e4e7', borderRadius: 3, width: '80%' }} />
    </div>
  );
  if (index === 1) return (
    <div style={{ ...s.sampleThumb, background: bg }}>
      <div style={{ background: '#ffffff', borderRadius: 10, padding: 10, width: '75%', border: '1px solid #e4e4e7' }}>
        <div style={{ height: 8, background: '#f4f4f5', borderRadius: 4, marginBottom: 6, width: '80%' }} />
        <div style={{ height: 8, background: '#f4f4f5', borderRadius: 4, marginBottom: 10, width: '55%' }} />
        <div style={{ height: 28, background: '#e11d48', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#ffffff' }}>SHOP NOW</span>
        </div>
      </div>
    </div>
  );
  if (index === 2) return (
    <div style={{ ...s.sampleThumb, background: bg }}>
      <div style={{ background: '#ffffff', borderRadius: 10, padding: 10, width: '75%', border: '1px solid #e4e4e7' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: 6 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, marginBottom: 4 }} />
            <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, width: '60%' }} />
          </div>
        </div>
        <div style={{ height: 6, background: '#f4f4f5', borderRadius: 3, marginBottom: 4 }} />
        <div style={{ height: 6, background: '#f4f4f5', borderRadius: 3, width: '70%' }} />
      </div>
    </div>
  );
  if (index === 3) return (
    <div style={{ ...s.sampleThumb, background: bg }}>
      <div style={{ background: '#ffffff', borderRadius: 10, padding: 12, width: '80%', border: '1px solid #e4e4e7', textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, background: '#f4f4f5', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</div>
        <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, marginBottom: 4 }} />
        <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, width: '65%', margin: '0 auto' }} />
      </div>
    </div>
  );
  if (index === 4) return (
    <div style={{ ...s.sampleThumb, background: bg }}>
      <div style={{ background: '#ffffff', borderRadius: 10, padding: 10, width: '75%', border: '1px solid #e4e4e7' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <div style={{ height: 40, flex: 2, background: '#059669', borderRadius: 6 }} />
          <div style={{ height: 40, flex: 1, background: '#f4f4f5', borderRadius: 6 }} />
        </div>
        <div style={{ height: 18, background: '#2563eb', border: '1px solid #3b82f6', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#ffffff' }}>WATCH NOW</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ ...s.sampleThumb, background: bg }}>
      <div style={{ background: '#ffffff', borderRadius: 10, padding: 10, width: '75%', border: '1px solid #e4e4e7' }}>
        <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, marginBottom: 5, width: '90%' }} />
        <div style={{ height: 7, background: '#f4f4f5', borderRadius: 3, marginBottom: 10, width: '65%' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 24, flex: 1, background: i % 2 === 0 ? '#d97706' : '#fef3c7', borderRadius: 5 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StreamCutLanding() {
  const { isSignedIn } = useAuth();

  return (
    <div style={s.root}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.logo}>
          <div style={s.lmark}>S</div>
          <span style={s.ltext}>Stream<span style={{ color: '#2563eb' }}>Cut</span></span>
        </div>
        <div style={s.navLinks}>
          <a href={`dashboard`} style={s.navLink}>Dashboard</a>
          {['Templates', 'Features', 'Pricing', 'FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={s.navLink}>{l}</a>
          ))}
        </div>
        <div style={s.navR}>
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button style={s.btnOutline}>Log in</button>
              </SignInButton>
              <SignInButton mode="modal">
                <button style={s.btnAccent}>Start for free</button>
              </SignInButton>
            </>
          ) : (
            <UserButton afterSignOutUrl="/" />
          )}
        </div>
      </nav>

      {/* NEW ASYMMETRIC HERO */}
      <section style={s.heroSection}>
        <div style={s.heroLeft}>
          <div style={s.heroBadge}>
            <span style={s.badgeDot} />
            New — AI-powered clip editor
          </div>
          <h1 style={s.h1}>
            Edit videos like a<br />
            <span style={{ background: '#2563eb', padding: '0 12px', borderRadius: 8, border: '1px solid #3b82f6', color: '#ffffff' }}>pro</span>, in minutes.
          </h1>
          <p style={s.heroSub}>
            StreamCut is the fastest way to cut, caption, and publish high-engagement videos.
            Drop your raw assets and let smart automation configure perfect renders.
          </p>
          <div style={s.heroCtas}>
            <SignInButton mode="modal">
              <button style={s.btnHero}>Start editing free</button>
            </SignInButton>
            <button style={s.btnSec}>Browse templates</button>
          </div>
          <p style={s.note}>No credit card required · Free forever plan</p>
        </div>

        {/* HERO WORKSTATION VISUAL */}
        <div style={s.heroRight}>
          <div style={s.mockHeader}>
            <div style={s.mockDot} />
            <div style={s.mockDot} />
            <div style={s.mockDot} />
          </div>
          <div style={s.mockStage}>
            <div style={s.mockBadge}>Active Composition · 16:9</div>
            <div style={s.mockPlay}>▶</div>
          </div>
          <div style={s.mockTrack}>
            <div style={{ ...s.mockBar, width: '40%', background: '#2563eb', height: 6 }} />
            <div style={s.mockWave}>
              <div style={s.mockWaveFill} />
            </div>
            <div style={{ ...s.mockWave, background: '#fbfbfe' }}>
              <div style={{ ...s.mockWaveFill, background: '#e0f2fe', left: '40%', width: '35%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <div style={s.trusted}>
        <p style={s.trustedTxt}>Trusted by creators at</p>
        <div style={s.trustedRow}>
          {['YouTube', 'TikTok', 'Shopify', 'Notion', 'Figma'].map(b => (
            <span key={b} style={s.trustedLogo}>{b}</span>
          ))}
        </div>
      </div>

      {/* NEW BENTO GALLERY SHOWCASE */}
      <section id="templates" style={s.sectionWrap}>
        <div style={s.eyebrow}>Made with StreamCut</div>
        <h2 style={s.sectionH}>See what creators are making</h2>
        <p style={s.sectionSub}>
          From viral social promos to polished full-length podcasts. Explore responsive user productions.
        </p>

        <div style={s.samplesGrid}>
          {SAMPLES.map((item, i) => (
            <div key={i} style={{ ...s.sampleCard, gridColumn: item.span }}>
              <SampleThumb index={i} />
              <div style={s.sampleBody}>
                <div>
                  <div style={s.sampleCat}>{item.cat}</div>
                  <div style={s.sampleTitle}>{item.title}</div>
                </div>
                <div style={s.sampleMeta}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#ffffff', flexShrink: 0 }}>
                    {item.user[1].toUpperCase()}
                  </div>
                  <span style={s.sampleUser}>{item.user} · {item.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={s.howWrap}>
        <div style={s.eyebrow}>How it works</div>
        <h2 style={s.sectionH}>Ready in three steps</h2>
        <p style={s.sectionSub}>Upload, customise, export. No timeline. No tutorials needed.</p>
        <div style={s.howGrid}>
          {[
            { icon: '⬆', title: 'Upload your clip', desc: 'Drag in any video file up to 5GB. We handle the transcoding automatically.' },
            { icon: '✂', title: 'Edit with one click', desc: 'Add captions, trim silences, resize for any platform, and drop in your brand kit.' },
            { icon: '↗', title: 'Export and publish', desc: 'Download in HD or publish directly to YouTube, TikTok, and Instagram in one click.' },
          ].map((step) => (
            <div key={step.title} style={s.howCard}>
              <div style={s.howIcon}>{step.icon}</div>
              <div style={s.howH}>{step.title}</div>
              <p style={s.howP}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={s.featWrap}>
        <div style={s.eyebrow}>Features</div>
        <h2 style={s.sectionH}>Everything a creator needs</h2>
        <p style={s.sectionSub}>Powerful workflow components that stay out of your way.</p>
        <div style={s.featGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={s.featCard}>
              <div style={s.featIcon}>{f.icon}</div>
              <div>
                <div style={s.featH}>{f.title}</div>
                <p style={s.featP}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING PLANS */}
      <section id="pricing" style={s.priceWrap}>
        <div style={s.eyebrow}>Pricing plans</div>
        <h2 style={s.sectionH}>Simple, crystal-clear tiers</h2>
        <p style={s.sectionSub}>Scale your output effortlessly. Upgrade or downgrade seamlessly whenever your workflow changes.</p>

        <div style={s.priceGrid}>
          {PRICING_TIERS.map((tier) => (
            <div key={tier.name} style={tier.popular ? s.priceCardPop : s.priceCard}>
              {tier.popular && <div style={s.popBadge}>Most Popular</div>}
              <div style={s.priceH3}>{tier.name}</div>
              <p style={s.priceDesc}>{tier.desc}</p>
              <div style={s.priceRow}>
                <span style={s.priceNum}>{tier.price}</span>
                {tier.period && <span style={s.pricePer}>{tier.period}</span>}
              </div>

              <SignInButton mode="modal">
                <button style={tier.popular ? s.btnPricePop : s.btnPrice}>
                  {tier.buttonText}
                </button>
              </SignInButton>

              <ul style={s.fList}>
                {tier.features.map((feat, index) => (
                  <li key={index} style={s.fItem}>
                    <span style={s.fCheck}>✓</span> {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <PricingTable
        checkoutSuccessUrl="/purchase-success"
        checkoutCancelUrl="/#pricing"
      />

      {/* FAQ SECTION */}
      <section id="faq" style={s.faqWrap}>
        <div style={s.eyebrow}>FAQ</div>
        <h2 style={s.sectionH}>Got questions? We have answers</h2>
        <p style={s.sectionSub}>Everything you need to know about plans, features, and billing setups.</p>

        <div style={s.faqGrid}>
          {FAQS.map((faq, index) => (
            <div key={index} style={s.faqCard}>
              <div style={s.faqQ}>{faq.q}</div>
              <p style={s.faqA}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section style={s.ctaBand}>
        <h2 style={s.ctaH}>Start creating for free.</h2>
        <p style={s.ctaP}>
          Join 200,000+ creators already using StreamCut to grow their audience faster.
        </p>
        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
          <button style={s.btnHero}>Start editing free</button>
        </SignInButton>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.logo}>
          <div style={{ ...s.lmark, width: 24, height: 24, fontSize: 12, borderRadius: 6 }}>S</div>
          <span style={{ ...s.ltext, fontSize: 13 }}>Stream<span style={{ color: '#2563eb' }}>Cut</span></span>
        </div>
        <span style={s.footerCopy}>© 2026 StreamCut Media Inc.</span>
        <div style={s.footerLinks}>
          {['Privacy', 'Terms', 'Docs'].map(l => (
            <a key={l} href="#" style={s.footerLink}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
}