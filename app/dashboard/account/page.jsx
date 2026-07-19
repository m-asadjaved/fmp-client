"use client";

import { useState, useEffect } from "react";
import { createPortalSession } from "../../actions/portal";
import { useUser, UserProfile, SignOutButton } from "@clerk/nextjs";
import { CreditCard, LogOut, ChevronRight, Zap, Settings2, Save, Loader2 } from "lucide-react";

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Editor Preferences State
  const [preferences, setPreferences] = useState({
    activeTheme: "classic",
    animationOverride: "theme",
    bgMusicVolume: 20,
    hookEnabled: false
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/preferences')
        .then(res => res.json())
        .then(data => {
          if (data.preferences) {
            setPreferences(prev => ({
              ...prev,
              activeTheme: data.preferences.active_theme,
              animationOverride: data.preferences.animation_override,
              bgMusicVolume: data.preferences.bg_music_volume,
              hookEnabled: data.preferences.hook_enabled
            }));
          }
        })
        .catch(console.error)
        .finally(() => setPrefsLoading(false));
    }
  }, [isSignedIn]);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefsMessage({ text: "", type: "" });
    try {
      const payload = {
        activeTheme: preferences.activeTheme,
        animationOverride: preferences.animationOverride,
        bgMusicVolume: preferences.bgMusicVolume,
        hookEnabled: preferences.hookEnabled,
      };

      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.error) {
        setPrefsMessage({ text: data.error, type: "error" });
      } else {
        setPrefsMessage({ text: "Preferences saved successfully!", type: "success" });
      }
    } catch (err) {
      setPrefsMessage({ text: "Failed to save preferences.", type: "error" });
    } finally {
      setSavingPrefs(false);
      setTimeout(() => setPrefsMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createPortalSession();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#0F2347] border-t-transparent animate-spin"></div>
          <p className="text-[#6b7280] font-medium tracking-wider text-sm uppercase">Loading Profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dot-pattern py-10 px-4 sm:px-6 lg:px-8 w-full min-h-[100vh]">
      <div className="max-w-[55rem] mx-auto space-y-10">
        
        {/* Page Header */}
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-bold text-[#0F2347] tracking-tight">Account Settings</h1>
          <p className="text-base text-gray-500 font-medium">Manage your profile, billing, and security preferences.</p>
        </div>

        {/* Clerk User Profile Management */}
        <div className="w-full flex justify-center stagger-1">
          <UserProfile 
            routing="hash" 
            appearance={{
              variables: {
                colorPrimary: '#00C0D4',
                colorText: '#0F2347',
                colorbackground: "var(--surface)",
                colorInputbackground: "var(--surface-bg)",
                colorInputText: '#0F2347',
                borderRadius: '0.75rem',
                fontFamily: 'inherit'
              },
              elements: {
                cardBox: "shadow-sm border border-gray-200",
                navbar: "border-r border-gray-200 bg-gray-50/50",
                navbarButton: "text-gray-600 hover:text-[#00C0D4] hover:bg-cyan-50/50 transition-colors",
                headerTitle: "text-xl font-bold text-[#0F2347]",
                headerSubtitle: "text-gray-500",
                profileSectionTitleText: "text-lg font-semibold text-[#0F2347]",
                formButtonPrimary: "bg-[#00C0D4] hover:bg-[#00a8ba] shadow-sm transition-all",
                formFieldInput: "bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#00C0D4]/20",
                badge: "bg-cyan-50 text-cyan-700 border-cyan-100",
              }
            }}
          />
        </div>

        {/* Editor Preferences */}
        <div className="stagger-2 bg-[var(--surface)] rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden relative transition-shadow duration-300 hover:shadow-md">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center gap-4">
             <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center">
                <Settings2 className="text-[#00C0D4]" size={24} />
             </div>
             <div>
               <h3 className="text-lg font-bold text-[#0F2347]">Editor Defaults</h3>
               <p className="text-sm text-gray-500">Configure your default settings for new video generations.</p>
             </div>
          </div>
          <div className="px-6 py-6 space-y-6">
            {prefsLoading ? (
               <div className="flex justify-center py-8">
                 <Loader2 className="animate-spin text-[#00C0D4]" size={32} />
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 
                 {/* Default Theme */}
                 <div>
                   <label className="block text-sm font-semibold text-[#0F2347] mb-2">Default Theme</label>
                   <select 
                     value={preferences.activeTheme}
                     onChange={(e) => setPreferences(p => ({ ...p, activeTheme: e.target.value }))}
                     className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#0F2347] focus:outline-none focus:ring-2 focus:ring-[#00C0D4]/20"
                   >
                     <option value="classic">Classic</option>
                     <option value="modern">Modern</option>
                     <option value="bold">Bold</option>
                     <option value="minimal">Minimal</option>
                   </select>
                 </div>

                 {/* Default Animation */}
                 <div>
                   <label className="block text-sm font-semibold text-[#0F2347] mb-2">Default Animation</label>
                   <select 
                     value={preferences.animationOverride}
                     onChange={(e) => setPreferences(p => ({ ...p, animationOverride: e.target.value }))}
                     className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#0F2347] focus:outline-none focus:ring-2 focus:ring-[#00C0D4]/20"
                   >
                     <option value="theme">Match Theme</option>
                     <option value="pop">Pop In</option>
                     <option value="fade">Fade In</option>
                     <option value="slide">Slide Up</option>
                   </select>
                 </div>

                 {/* Music Volume */}
                 <div>
                   <label className="flex items-center justify-between text-sm font-semibold text-[#0F2347] mb-2">
                     Background Music Volume
                     <span className="text-gray-500">{preferences.bgMusicVolume}%</span>
                   </label>
                   <input 
                     type="range" min="0" max="100" 
                     value={preferences.bgMusicVolume}
                     onChange={(e) => setPreferences(p => ({ ...p, bgMusicVolume: parseInt(e.target.value) }))}
                     className="w-full accent-[#00C0D4]"
                   />
                 </div>

                 {/* Hook Enabled */}
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                   <div>
                     <label className="block text-sm font-semibold text-[#0F2347]">Enable Hook</label>
                     <p className="text-xs text-gray-500 mt-1">Start videos with a "Wait for it..." hook.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" checked={preferences.hookEnabled} onChange={(e) => setPreferences(p => ({ ...p, hookEnabled: e.target.checked }))} />
                     <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C0D4]"></div>
                   </label>
                 </div>

               </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end">
            <div className="flex items-center gap-4">
              {prefsMessage.text && (
                <span className={`text-sm ${prefsMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'} font-medium`}>
                  {prefsMessage.text}
                </span>
              )}
              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs || prefsLoading}
                className="flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-[#00C0D4] hover:bg-[#00a8ba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C0D4] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300"
              >
                {savingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>

        <div className="stagger-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscription Management */}
          <div className="group bg-[var(--surface)] rounded-xl border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full relative overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 relative z-10 flex-1">
              <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                <CreditCard className="text-[#00C0D4]" size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#0F2347] mb-2">Billing & Subscription</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Update your payment method, download past invoices, or upgrade your plan to unlock premium features.
              </p>
            </div>
            <div className="px-6 py-5 bg-gray-50/50 mt-auto relative z-10">
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full flex items-center justify-between px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-[#00C0D4] hover:bg-[#00a8ba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C0D4] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300"
              >
                <span>{loading ? "Preparing Portal..." : "Manage Billing Portal"}</span>
                {!loading && <ChevronRight size={18} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full relative overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 relative z-10 flex-1">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                <LogOut className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#0F2347] mb-2">Sign Out</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Securely log out of your account on this device. You will need to enter your credentials to access your dashboard again.
              </p>
            </div>
            <div className="px-6 py-5 bg-gray-50/50 mt-auto relative z-10">
              <SignOutButton signOutOptions={{ redirectUrl: '/' }}>
                <button className="w-full flex items-center justify-between px-5 py-2.5 border border-gray-200 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300">
                  <span>Sign Out</span>
                  <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
