import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import InstallPrompt from "@/components/InstallPrompt";
import SecurityBanner from "@/components/SecurityBanner";

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "HerCare+ | Private Women's Health Companion",
  description: "Anonymous, AI-powered women's health platform. Check symptoms, track cycles, find care - all private and secure. Available in 6 Indian languages.",
  keywords: ["women's health", "gynecology", "menstrual tracking", "private health", "AI health", "India women health"],
  authors: [{ name: "HerCare+ Team" }],
  creator: "HerCare+",
  publisher: "HerCare+",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "HerCare+ | Your Private Health Companion",
    description: "Anonymous symptom checking, cycle tracking, and women-friendly care finder. Privacy-first health platform for Indian women.",
    type: "website",
    locale: "en_IN",
    url: "https://hercare.vercel.app",
    siteName: "HerCare+",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HerCare+ - Women's Health Companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HerCare+ | Private Women's Health",
    description: "Anonymous AI health companion for women. Private, caring, and available in your language.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={nunito.variable}>
        <meta name="theme-color" content="#FFB6C1" />
        <link rel="manifest" href="/manifest.json" />
        {/* Mobile App Container Simulation */}
        <div className="page-container">
          <Navbar />
          <SecurityBanner />
          {children}
          <InstallPrompt />
        </div>
      </body>
    </html>
  );
}
