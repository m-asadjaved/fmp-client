import React from 'react';
import VideoUploader from '@/app/components/VideoUploader'; // Adjust path based on where your file is located
import { UserButton } from '@clerk/nextjs';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Top Navbar for Dashboard */}
      <nav className="flex items-center justify-between px-8 h-16 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white">S</div>
          <span className="font-bold text-white text-sm">StreamCut <span className="text-blue-500 font-medium">Workspace</span></span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </nav>

      {/* Main Dashboard Workspace Content */}
      <main className="py-6">
        <VideoUploader />
      </main>
    </div>
  );
}