import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text">Welcome to NextFlow</h1>
          <p className="text-textmuted mt-1.5 text-sm">
            Build and run LLM workflows visually
          </p>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorBackground: '#111111',
              colorText: '#e5e5e5',
              colorPrimary: '#8b5cf6',
              colorInputBackground: '#1a1a1a',
              colorInputText: '#e5e5e5',
              colorTextSecondary: '#737373',
              colorTextOnPrimaryBackground: '#ffffff',
              colorNeutral: '#737373',
              colorAlphaShade: '#ffffff',
              borderRadius: '10px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSmoothing: 'antialiased',
              fontSize: '14px',
              spacingUnit: '16px',
            },
            elements: {
              card: 'bg-[#111111] border border-[#222222] shadow-2xl',
              headerTitle: 'text-[#e5e5e5] font-semibold',
              headerSubtitle: 'text-[#737373]',
              socialButtonsBlockButton:
                'bg-[#1a1a1a] border border-[#333333] text-[#e5e5e5] hover:bg-[#222222] hover:border-[#444444] transition-colors',
              socialButtonsBlockButtonText: 'text-[#e5e5e5] font-medium',
              socialButtonsProviderIcon: 'opacity-100',
              dividerLine: 'bg-[#2a2a2a]',
              dividerText: 'text-[#525252] text-xs',
              formFieldLabel: 'text-[#9a9a9a] text-xs font-medium',
              formFieldInput:
                'bg-[#1a1a1a] border-[#333333] text-[#e5e5e5] focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/20',
              formButtonPrimary:
                'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium transition-colors',
              footerActionText: 'text-[#525252]',
              footerActionLink: 'text-[#8b5cf6] hover:text-[#7c3aed]',
              identityPreviewText: 'text-[#e5e5e5]',
              identityPreviewEditButton: 'text-[#8b5cf6]',
              formFieldInputShowPasswordButton: 'text-[#737373]',
              alertText: 'text-[#e5e5e5]',
              badge: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
            },
          }}
        />
      </div>
    </div>
  )
}
