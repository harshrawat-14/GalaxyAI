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
          colorPrimary: '#1a56db',
          colorBackground: '#1a1a1a',
          colorText: '#ffffff',
          colorTextSecondary: '#ffffff',
          colorNeutral: '#ffffff',
          colorAlphaShade: '#ffffff',
          colorInputBackground: '#262626',
          colorInputText: '#ffffff',
          borderRadius: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        elements: {
          /* UserProfile modal (Manage account) — make fully opaque + brighter */
          modalBackdrop: 'bg-black/80 backdrop-blur-md',
          modalContent:
            '!bg-[#111111] border border-[#333333] shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden',
          rootBox: 'text-[#e5e5e5]',
          card: 'bg-transparent shadow-none',
          cardBox: 'bg-transparent',
          headerTitle: '!text-[#f5f5f5] font-semibold text-lg tracking-tight',
          headerSubtitle: '!text-[#a3a3a3] text-sm',
          
          /* Close (X) button */
          closeButton:
            '!text-[#a3a3a3] hover:!text-[#f5f5f5] hover:!bg-[#262626] !rounded-lg !transition-colors',
          closeButtonIcon: '!text-[#a3a3a3] hover:!text-[#f5f5f5]',

          /* Navbar (left side) */
          navbar: '!bg-[#161616] border-r border-[#2a2a2a] !text-[#f5f5f5]',
          navbarHeader: '!text-[#f5f5f5]',
          navbarButton:
            '!text-[#cfcfcf] hover:!text-[#f5f5f5] hover:!bg-[#222222] !transition-colors',
          navbarButtonActive: '!text-[#f5f5f5] !bg-[#222222]',
          navbarButtonIcon: '!text-inherit',
          navbarButtonText: '!text-inherit',
          
          /* Main panel */
          scrollBox: 'bg-transparent',
          pageScrollBox: 'bg-transparent',
          page: 'bg-transparent p-8',
          profileSection: 'border-b border-[#2a2a2a] pb-8 mb-8 last:border-0',
          profileSectionTitle: '!text-[#f5f5f5] font-semibold text-base mb-4',
          profileSectionTitleText: '!text-[#f5f5f5] font-semibold',
          profileSectionContent: '!text-[#e5e5e5]',
          
          /* User Profile Text Elements */
          userPreviewMainIdentifier: '!text-[#f5f5f5] font-semibold',
          userPreviewSecondaryIdentifier: '!text-[#cfcfcf]',
          accordionTriggerButton: '!text-[#f5f5f5] hover:!bg-[#222222]',
          breadcrumbs: '!text-[#f5f5f5]',
          breadcrumbsItem: '!text-[#f5f5f5]',
          breadcrumbsItemDivider: '!text-[#737373]',
          breadcrumbsItemButton: '!text-[#cfcfcf] hover:!text-[#f5f5f5]',

          /* Email / identifier display */
          identifierText: '!text-[#e5e5e5]',
          formattedPhoneNumber: '!text-[#e5e5e5]',

          /* Tags / badges inside modal (PRIMARY badge etc.) */
          tag: '!bg-[#1a56db]/15 !text-[#93bbfd] border !border-[#1a56db]/30',
          tagInputContainer: '!bg-[#1a1a1a] !border-[#333333]',

          /* Menu items (three-dot menus) */
          menuList: '!bg-[#1a1a1a] !border-[#333333]',
          menuItem: '!text-[#e5e5e5] hover:!bg-[#262626]',
          menuButton: '!text-[#cfcfcf] hover:!text-[#f5f5f5]',

          /* Connected account item text */
          providerIcon: 'opacity-100',

          profileSectionPrimaryButton:
            '!text-[#3b82f6] hover:!text-[#60a5fa] font-medium transition-colors',
          profileSectionSecondaryButton:
            '!text-[#3b82f6] hover:!text-[#60a5fa] font-medium transition-colors',
          profileSectionItemReadonlyText: '!text-[#e5e5e5]',
            
          /* Form elements */
          formFieldLabel: '!text-[#e5e5e5] font-medium mb-1.5 text-sm',
          formFieldInput:
            '!bg-[#262626] !border-[#333333] !text-[#f5f5f5] rounded-xl focus:!border-[#1a56db] focus:!ring-1 focus:!ring-[#1a56db] transition-all h-10',
          formFieldHintText: '!text-[#a3a3a3] text-xs mt-1.5',
          formButtonPrimary:
            '!bg-[#1a56db] hover:!bg-[#2563eb] !text-white font-semibold py-2 px-4 rounded-xl shadow-[0_4px_12px_rgba(26,86,219,0.3)] transition-all active:scale-[0.98]',
          formButtonReset:
            '!text-[#a3a3a3] hover:!text-[#f5f5f5] hover:!bg-[#262626] transition-all rounded-xl',
            
          /* Misc elements */
          badge: '!bg-[#1a56db]/10 !text-[#3b82f6] border border-[#1a56db]/20 font-medium px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider',
          avatarBox: 'ring-1 ring-[#333333] rounded-xl',
          userButtonAvatarBox: 'ring-2 ring-[#1a56db]/20',
          
          /* Hide the "Development" / Clerk branding elements */
          footer: 'hidden',
          internal_developmentTag: 'hidden',
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
          <style>{`
            /* Force hide Clerk development/branding elements that can't be reached via props */
            .cl-internal-phkr6,
            .cl-internal-1919246,
            .cl-internal-291129,
            [data-clerk-brand] {
              display: none !important;
            }
            /* Force all Clerk modal text to white */
            .cl-modalContent *,
            .cl-userProfile-root *,
            .cl-card * {
              color: #ffffff !important;
            }
            /* Re-apply blue for primary action buttons */
            .cl-modalContent .cl-formButtonPrimary,
            .cl-userProfile-root .cl-formButtonPrimary {
              color: #ffffff !important;
              background-color: #1a56db !important;
            }
            /* Keep primary badge styled */
            .cl-modalContent .cl-badge,
            .cl-userProfile-root .cl-badge {
              color: #ffffff !important;
            }
          `}</style>
        </head>
        <body className="bg-canvas text-text antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
