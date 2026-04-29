import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, ChevronDown } from 'lucide-react'

export default async function HomePage() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-[#8b5cf6]/30">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222222]/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">NextFlow</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a3a3a3]">
          {/* Removed non-functional links */}
        </nav>

        <div className="flex items-center gap-4">
          <Link 
            href="/sign-up"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-gray-100 transition-colors"
          >
            Sign up for free
          </Link>
          <Link 
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-transparent border border-[#333333] rounded-full hover:bg-[#1a1a1a] transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto text-center flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl lg:text-[80px] font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6">
          NextFlow is the world&apos;s most powerful visual AI suite.
        </h1>
        
        <p className="text-lg md:text-xl text-[#a3a3a3] max-w-2xl mx-auto mb-10">
          Build, chain, and execute complex LLM pipelines, image processors, and AI agents visually. No code required.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 relative">
          {/* Subtle vertical line connecting buttons to monitor */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-[#333333] to-transparent z-0 hidden sm:block"></div>
          
          <Link 
            href="/sign-up"
            className="relative z-10 w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-gray-100 transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            Start for free
          </Link>
          <Link 
            href="/dashboard"
            className="relative z-10 w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-[#0e0e0e] border border-[#333333] rounded-full hover:bg-[#161616] hover:border-[#444444] transition-all active:scale-95"
          >
            Launch App
          </Link>
        </div>

        {/* App Showcase Image */}
        <div className="relative w-full max-w-5xl mx-auto mt-4 z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-20 h-full w-full pointer-events-none" />
          <div className="rounded-2xl md:rounded-[32px] overflow-hidden border border-[#222222] shadow-[0_0_100px_rgba(139,92,246,0.15)] bg-[#111111] relative">
            <Image
              src="/mockup.png"
              alt="NextFlow App Interface"
              width={1920}
              height={1080}
              className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
              priority
            />
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>
      </main>
    </div>
  )
}
