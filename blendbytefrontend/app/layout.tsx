import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blendbyte.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BlendByte | Gift Ideas for Mom, Dad, Girlfriend & More',
    template: '%s | BlendByte',
  },
  description:
    'Find thoughtful gifts fast with AI. Get personalized gift ideas for mother, father, girlfriend, boyfriend, friends, and family based on budget and occasion.',
  keywords: [
    'gifts for mother',
    'gifts for father',
    'gifts for girlfriend',
    'gift ideas for mom',
    'gift ideas for dad',
    'birthday gifts for her',
    'birthday gifts for him',
    'anniversary gifts',
    'personalized gift recommendations',
    'gift finder India',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'BlendByte | Personalized Gift Recommendations',
    description:
      'Tell us who you are gifting, occasion, and budget. BlendByte finds ranked, personalized gift recommendations in minutes.',
    siteName: 'BlendByte',
    locale: 'en_IN',
    images: [
      {
        url: '/favicon.ico',
        width: 256,
        height: 256,
        alt: 'BlendByte logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'BlendByte | Gift Ideas for Mom, Dad, Girlfriend',
    description:
      'AI-powered gift finder for personalized gift recommendations by person, occasion, and budget.',
    images: ['/favicon.ico'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BlendByte',
    url: siteUrl,
    description:
      'AI gift recommendation website for finding gift ideas for mom, dad, girlfriend, and more.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const appStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BlendByte',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    url: siteUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    featureList: [
      'Gift recommendations by recipient and occasion',
      'Budget-aware ranking',
      'Personalized gift reasons',
      'Session history for past gift searches',
    ],
  }

  return (
    <ClerkProvider>
      <html lang="en-IN">
        <body className={inter.className}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(appStructuredData) }}
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
