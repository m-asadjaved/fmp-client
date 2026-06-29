'use client'

import React, { useState } from "react";
import { 
    LayoutDashboard, 
    FolderMinus, 
    Film, 
    Layers, 
    Settings, 
    HelpCircle, 
    LifeBuoy
  } from 'lucide-react';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('Dashboard');

	return (
		<>
			{/* SIDEBAR NAVIGATION PANEL */}
			<aside className="w-64 bg-white border-r border-brand-border-subtle flex flex-col justify-between p-4 sticky top-0 h-screen z-10">
				<div>
					{/* Brand Identity Branding Header */}
					<div className="flex items-center gap-2 px-2 py-4 mb-4">
						<div className="bg-brand-primary p-2 rounded text-white flex items-center justify-center">
							<Film size={20} />
						</div>
						<div>
							<h1 className="font-bold text-lg leading-none flex items-center gap-1 text-brand-on-surface">
								ClipAI
							</h1>
							<span className="text-xs font-semibold text-brand-primary tracking-wider uppercase">
								Pro Plan
							</span>
						</div>
					</div>

					{/* Navigation Link Lists */}
					<nav className="space-y-1">
						{[
							{
								name: "Dashboard",
								icon: LayoutDashboard,
								link: "/dashboard/v2",
							},
							{
								name: "My Projects",
								icon: FolderMinus,
								link: "/dashboard/v2",
							},
							{
								name: "Clips",
								icon: Film,
								link: "/dashboard/v2",
							},
							{
								name: "Assets",
								icon: Layers,
								link: "/dashboard/v2",
							},
							{
								name: "Settings",
								icon: Settings,
								link: "/dashboard/v2",
							},
						].map((item) => {
							const Icon = item.icon;
							const isActive = activeTab === item.name;
							return (
								<button
									key={item.name}
									onClick={() => {
										setActiveTab(item.name);
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
										isActive
											? "bg-[var(--primary)] text-white hover:cursor-pointer"
											: "hover:cursor-pointer"
									}`}
								>
									<Icon size={18} />
									{item.name}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Footer Support Utilities inside Sidebar */}
				<div className="space-y-4">
					<div className="space-y-1 border-t border-brand-border-subtle pt-4">
						<button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-on-surface-variant hover:text-brand-on-surface">
							<HelpCircle size={18} /> Help
						</button>
						<button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-on-surface-variant hover:text-brand-on-surface">
							<LifeBuoy size={18} /> Support
						</button>
					</div>

					{/* Promotional Marketing Upsell Card */}
					<div className="bg-brand-surfaceBg border border-brand-border-subtle rounded-lg p-4">
						<h4 className="text-sm font-bold text-brand-on-surface mb-1">
							Upgrade to Enterprise
						</h4>
						<p className="text-xs text-brand-on-surface-variant mb-3 leading-relaxed">
							Unlock unlimited AI rendering pipeline rules and 4K
							exports.
						</p>
						<button className="w-full bg-brand-primary text-white font-medium py-2 px-3 rounded text-xs hover:bg-brand-primaryHover transition-colors">
							Upgrade Now
						</button>
					</div>
				</div>
			</aside>
		</>
	);
};

export default Sidebar;
