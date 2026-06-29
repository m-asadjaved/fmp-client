import { ClerkProvider } from '@clerk/nextjs'
import Sidebar from './components/Sidebar';
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
        <div className="min-h-screen bg-brand-background text-brand-on-surface font-sans flex">
        <Sidebar />
          {children}
        </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
