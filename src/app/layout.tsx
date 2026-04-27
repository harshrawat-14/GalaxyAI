import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'NextFlow — Visual LLM Workflow Builder',
  description:
    'Build, chain, and execute LLM workflows visually with a drag-and-drop canvas. Powered by Google Gemini, Trigger.dev, and React Flow.',
  keywords: ['LLM', 'workflow', 'AI', 'Gemini', 'workflow builder', 'visual programming'],
  authors: [{ name: 'NextFlow' }],
  openGraph: {
    title: 'NextFlow — Visual LLM Workflow Builder',
    description: 'Build, chain, and execute LLM workflows visually.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#8b5cf6',
          colorBackground: '#111111',
          colorText: '#e5e5e5',
          colorTextSecondary: '#9a9a9a',
          colorNeutral: '#737373',
          colorAlphaShade: '#ffffff',
          borderRadius: '10px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        elements: {
          /* UserButton popup card */
          userButtonPopoverCard:
            'bg-[#161616] border border-[#2a2a2a] shadow-2xl',
          userButtonPopoverActions: 'bg-[#161616]',
          userButtonPopoverActionButton:
            'hover:bg-[#222222] text-[#e5e5e5]',
          userButtonPopoverActionButtonText: 'text-[#e5e5e5] font-medium',
          userButtonPopoverActionButtonIcon: 'text-[#737373]',
          userButtonPopoverFooter:
            'border-t border-[#2a2a2a] bg-[#111111]',
          userButtonPopoverFooterPages: 'bg-[#111111]',
          /* User preview (name + email at top of popup) */
          userPreviewMainIdentifier:
            'text-[#e5e5e5] font-semibold',
          userPreviewSecondaryIdentifier: 'text-[#737373]',
          userPreviewAvatarContainer: 'ring-1 ring-[#333333]',
          /* Avatar button itself */
          userButtonAvatarBox: 'ring-2 ring-[#8b5cf6]/40',
          /* UserProfile modal (Manage account) */
          modalContent: 'bg-[#111111] border border-[#222222]',
          profileSection: 'bg-[#111111]',
          profileSectionTitle: 'text-[#e5e5e5]',
          profileSectionContent: 'text-[#9a9a9a]',
          navbarButton: 'text-[#9a9a9a] hover:text-[#e5e5e5] hover:bg-[#1a1a1a]',
          navbarButtonActive: 'text-[#e5e5e5] bg-[#1a1a1a]',
          formButtonPrimary:
            'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium',
          badge: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
        },
      }}
    >
      <html lang="en" className="dark">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-canvas text-text antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
