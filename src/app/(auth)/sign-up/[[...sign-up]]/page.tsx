import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#0a0a0a] opacity-90 backdrop-blur-xl"></div>
        {/* Subtle glowing orb in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      {/* Main Modal Container */}
      <div className="relative z-10 w-full max-w-[900px] bg-[#0e0e0e] rounded-3xl sm:rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-[#222222]">
        
        {/* Close button */}
        <Link 
          href="/" 
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </Link>

        {/* Left Side: Clerk SignUp */}
        <div className="w-full md:w-[50%] p-8 sm:p-12 flex flex-col justify-center items-center relative">
          <div className="w-full max-w-[320px]">
            <h2 className="text-3xl font-bold text-white mb-8 tracking-tight text-center md:text-left">Create account</h2>
            
            <SignUp
              appearance={{
                variables: {
                  colorBackground: 'transparent',
                  colorText: '#e5e5e5',
                  colorPrimary: '#1a56db',
                  colorInputBackground: 'transparent',
                  colorInputText: '#e5e5e5',
                  colorTextSecondary: '#737373',
                  colorTextOnPrimaryBackground: '#ffffff',
                  colorNeutral: '#737373',
                  colorAlphaShade: '#ffffff',
                  borderRadius: '12px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSmoothing: 'antialiased',
                  fontSize: '14px',
                  spacingUnit: '16px',
                },
                elements: {
                  card: 'bg-transparent border-none shadow-none p-0 w-full max-w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  logoBox: 'hidden',
                  socialButtonsBlockButton:
                    '!bg-white !border-white !text-black hover:!bg-gray-100 transition-all font-semibold h-12 justify-center rounded-2xl',
                  socialButtonsBlockButtonText: '!text-black font-semibold',
                  socialButtonsProviderIcon: 'opacity-100',
                  dividerLine: '!bg-[#2a2a2a]',
                  dividerText: '!text-[#737373] text-[11px] font-medium uppercase tracking-widest !bg-transparent',
                  dividerRow: 'my-6',
                  formFieldLabel: '!text-[#a3a3a3] font-medium mb-1.5',
                  formFieldInput:
                    '!bg-[#0a0a0a] !border-[#222222] !text-[#e5e5e5] focus:!border-[#1a56db] focus:!ring-1 focus:!ring-[#1a56db] h-12 rounded-xl px-4 placeholder:!text-[#737373]',
                  formButtonPrimary:
                    '!bg-[#0f172a] !border-[#1e293b] hover:!bg-[#1e293b] !text-[#3b82f6] font-semibold transition-all h-12 rounded-xl mt-4',
                  footerActionText: '!text-[#737373] text-xs',
                  footerActionLink: 'text-white hover:text-white font-medium hover:underline text-xs',
                  identityPreviewText: 'text-[#e5e5e5]',
                  identityPreviewEditButton: 'text-[#1a56db]',
                  formFieldInputShowPasswordButton: 'text-[#737373]',
                  alertText: 'text-[#e5e5e5]',
                  badge: 'bg-[#1a56db]/20 text-[#1a56db]',
                  main: 'gap-0', // Reduce gap between elements
                  footer: 'mt-6',
                  internal_developmentTag: 'hidden',
                },
              }}
              routing="hash"
            />
          </div>
        </div>

        {/* Right Side: Showcase Image */}
        <div className="hidden md:block w-[50%] relative bg-[#111111] overflow-hidden">
          <Image
            src="/auth_showcase.png"
            alt="Showcase Artwork"
            fill
            className="object-cover"
            priority
          />
          {/* Subtle inner shadow overlay */}
          <div className="absolute inset-0 border-l border-[#222222]/50 pointer-events-none"></div>
        </div>
        
      </div>
    </div>
  )
}
