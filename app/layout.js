import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";
import { RenderProvider } from "@/contexts/RenderContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { UploadProvider } from "@/contexts/UploadContext";
import NextTopLoader from 'nextjs-toploader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Twenty2Short",
  description: "Generate professional video edits from your long-form content for TikTok, Instagram Reels, and YouTube Shorts.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader
          color="#00C0D4"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #00C0D4,0 0 5px #00C0D4"
          zIndex={1600000}
        />
        <ClerkProvider dynamic>
          <UploadProvider>
            <AlertProvider>
              <RenderProvider>
                {children}
              </RenderProvider>
            </AlertProvider>
          </UploadProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
