import { Routes, Route, Link, Outlet } from "react-router-dom"
import { Home, Bot, ShoppingBag, Wallet, ShieldAlert, Cpu } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"
import { useConfigStore } from "./lib/store"
import { db } from "./lib/firebase"
import { ref, onValue } from "firebase/database"
import { useAppAuth, AppSignedIn, AppSignedOut, AppSignInButton, AppUserButton, AuthProvider } from "./lib/auth"

import HomePage from "./pages/HomePage"
import DashboardPage from "./pages/DashboardPage"
import AdminPage from "./pages/AdminPage"
import LogsPage from "./pages/LogsPage"
import WalletPage from "./pages/WalletPage"

import StorePage from "./pages/StorePage"

function MainLayout() {
  const { config, fetchConfig } = useConfigStore()
  const { isLoaded, userId, user, getToken } = useAppAuth()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])
  
  useEffect(() => {
    if (config.primary_color) {
      document.documentElement.style.setProperty('--primary', config.primary_color)
    }
  }, [config.primary_color])

  useEffect(() => {
    if (isLoaded && user && user.emailAddresses?.[0]?.emailAddress === 'lupinstarnley009@gmail.com' && user.publicMetadata?.role !== 'admin') {
      getToken().then((token: string) => {
        axios.post('/api/setup/first-admin', {}, { headers: { Authorization: `Bearer ${token}` } }).then(() => window.location.reload()).catch(e => console.error(e))
      });
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (userId) {
      const userRef = ref(db, `users/${userId}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setBalance(snapshot.val().balance || 0);
        }
      });
      return () => unsub();
    }
  }, [userId])

  // Need to safely check role for both firebase and clerk users
  const role = user?.publicMetadata?.role || (user as any)?.role;

  if (config.maintenance_mode && role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-6 text-white space-y-4">
        <ShieldAlert className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold">Under Maintenance</h1>
        <p className="text-zinc-400 max-w-md">{config.maintenance_message}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50 flex flex-col font-sans">
      {config.broadcast_message && (
        <div className="bg-[var(--primary,#8B5CF6)] text-white text-center text-sm py-1.5 px-4 font-medium sticky top-0 z-50">
          {config.broadcast_message}
        </div>
      )}
      
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#0A0A0A]/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-6 w-6" />}
            <span className="font-bold text-xl text-white tracking-tight">{config.app_name}</span>
            <span className="text-xs text-zinc-500 hidden sm:inline-block mt-0.5">{config.app_tagline}</span>
          </Link>
          <div className="flex items-center space-x-4">
            <AppSignedIn>
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link to="/" className="transition-colors hover:text-white text-zinc-400">Home</Link>
                <Link to="/dashboard" className="transition-colors hover:text-white text-zinc-400">Dashboard</Link>
                <Link to="/wallet" className="transition-colors hover:text-white text-zinc-400 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" /> 
                  {balance !== null ? `${config.currency_symbol || '$'}${balance}` : 'Wallet'}
                </Link>
                <Link to="/store" className="transition-colors hover:text-white text-zinc-400">Store</Link>
                {role === 'admin' && (
                  <Link to="/admin" className="transition-colors text-[var(--primary,#8B5CF6)] hover:text-white flex items-center gap-1">
                    <Cpu className="h-4 w-4" /> Admin
                  </Link>
                )}
              </nav>
              <AppUserButton />
            </AppSignedIn>
            <AppSignedOut>
              <AppSignInButton mode="modal">
                <button className="h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-[var(--primary,#8B5CF6)] text-white hover:opacity-90 transition-opacity cursor-pointer">
                  Sign In
                </button>
              </AppSignInButton>
            </AppSignedOut>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col pb-20 md:pb-0">
        <Outlet />
      </main>

      <AppSignedIn>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-[#0A0A0A] py-2 px-6 flex justify-between items-center pb-safe">
          <Link to="/" className="flex flex-col items-center text-zinc-400 hover:text-[var(--primary,#8B5CF6)]">
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center text-zinc-400 hover:text-[var(--primary,#8B5CF6)]">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">My Bots</span>
          </Link>
          <Link to="/store" className="flex flex-col items-center text-zinc-400 hover:text-[var(--primary,#8B5CF6)]">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Store</span>
          </Link>
          <div className="flex flex-col items-center justify-center">
            <AppUserButton />
            <span className="text-[10px] mt-1 text-zinc-400 font-medium">Profile</span>
          </div>
        </div>
      </AppSignedIn>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/logs/:botId" element={<LogsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
