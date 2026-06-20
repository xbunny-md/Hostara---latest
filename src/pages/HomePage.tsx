import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"
import { useConfigStore } from "../lib/store"

export default function HomePage() {
  const { config } = useConfigStore()

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 min-h-[calc(100vh-3.5rem)] container mx-auto fade-in">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Host Your WhatsApp Bots with <span className="text-[var(--primary,#8B5CF6)]">{config.app_name}</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
          The ultimate hosting platform {config.app_tagline}. Deploy your bots directly to our scalable Render cloud pools with a single click.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8">
        <SignedIn>
          <Link to="/dashboard">
            <Button size="lg" className="w-full sm:w-auto text-base bg-[var(--primary,#8B5CF6)] text-white hover:opacity-90">
              Go to Dashboard
            </Button>
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button size="lg" className="w-full sm:w-auto text-base bg-[var(--primary,#8B5CF6)] text-white hover:opacity-90">
              Get Started Now
            </Button>
          </SignInButton>
          <Link to={config.guest_mode_enabled ? "/store" : "#"}>
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base border-zinc-700 hover:bg-zinc-800">
              Browse Templates
            </Button>
          </Link>
        </SignedOut>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 w-full max-w-5xl">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-[var(--primary,#8B5CF6)]/10 text-[var(--primary,#8B5CF6)] rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Instant Deployment</h3>
          <p className="text-zinc-400">One-click deploys to our global cloud pools. No terminal required.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-[var(--primary,#8B5CF6)]/10 text-[var(--primary,#8B5CF6)] rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Secure Backend</h3>
          <p className="text-zinc-400">Your specific configurations are completely isolated and secure.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-[var(--primary,#8B5CF6)]/10 text-[var(--primary,#8B5CF6)] rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Live Logs</h3>
          <p className="text-zinc-400">Real-time terminal visibility straight from your dashboard.</p>
        </div>
      </div>
    </div>
  )
}
