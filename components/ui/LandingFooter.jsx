import React from 'react';

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Top Footer Section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-12 mb-16">

          {/* Logo & Copyright */}
          <div className="col-span-2 md:col-span-2 flex flex-col items-start">
            <a href="/" className="flex items-center mb-6">
              <img
                src="/logo-transparent.png"
                alt="twenty2short"
                className="h-16 md:h-20 w-auto object-contain transform scale-110 origin-left -ml-2"
              />
            </a>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              AI-powered video creation platform that transforms long videos into engaging short-form clips for TikTok, Instagram, and YouTube.
            </p>
          </div>

          {/* Links Column 1 */}
          <div className="col-span-1">
            <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Product</h4>
            <ul className="space-y-3">
              {['Pricing', 'API Docs', 'Tools', 'MCP', 'Clip Rewards'].map(link => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="col-span-1">
            <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Resources</h4>
            <ul className="space-y-3">
              {['Blog', 'Help Center', 'Community', 'Status', 'Contact'].map(link => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 3 */}
          <div className="col-span-1">
            <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Legal</h4>
            <ul className="space-y-3">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(link => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 4 */}
          <div className="col-span-1">
            <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Alternatives</h4>
            <ul className="space-y-3">
              {['Opus Clip', 'Veed', 'Capcut', 'Vizard', 'Descript'].map(link => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link} Alternative</a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Footer Section */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} twenty2short Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Social Icons Placeholder */}
            {['Twitter', 'YouTube', 'TikTok', 'Instagram'].map(social => (
              <a key={social} href="#" className="text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium">
                {social}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
