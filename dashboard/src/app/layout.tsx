import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Quirkly - AI-Powered Reply Generator for X (Twitter) | Save 15+ Hours/Week',
    template: '%s | Quirkly'
  },
  description: 'Quirkly is the #1 AI-powered reply generator for X (Twitter). Generate human-like, engaging replies in seconds. Save 15+ hours per week while increasing engagement by 340%. Free trial available.',
  keywords: [
    'AI reply generator',
    'Twitter reply AI',
    'X reply generator',
    'social media automation',
    'AI social media tools',
    'Twitter engagement',
    'social media management',
    'AI content creation',
    'Twitter bot',
    'social media AI',
    'automated replies',
    'social media productivity',
    'Twitter marketing tools',
    'AI marketing',
    'social media automation'
  ],
  authors: [{ name: 'Quirkly Team' }],
  creator: 'Quirkly',
  publisher: 'Quirkly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://quirkly.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://quirkly.app',
    title: 'Quirkly - AI-Powered Reply Generator for X (Twitter)',
    description: 'Generate human-like, engaging replies in seconds. Save 15+ hours per week while increasing engagement by 340%.',
    siteName: 'Quirkly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Quirkly - AI-Powered Reply Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quirkly - AI-Powered Reply Generator for X (Twitter)',
    description: 'Generate human-like, engaging replies in seconds. Save 15+ hours per week while increasing engagement by 340%.',
    images: ['/og-image.png'],
    creator: '@quirkly',
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
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#6D5EF8" />
      </head>
      <body className={`${plusJakartaSans.className} h-full bg-bg text-ink`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#FFFFFF',
                color: '#1E293B',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#16A34A',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
