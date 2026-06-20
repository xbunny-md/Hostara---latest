import { useState, useEffect } from "react"
import { useAppAuth } from "../lib/auth"
import { useConfigStore } from "../lib/store"
import { supabase } from "../lib/supabase"
import { Wallet, CreditCard, ArrowRight, History, Gift } from "lucide-react"
import { Button } from "../components/ui/button"
import axios from "axios"

export default function WalletPage() {
  const { isLoaded, userId, user, getToken } = useAppAuth()
  const { config } = useConfigStore()
  const [balance, setBalance] = useState<number>(0)
  const [claiming, setClaiming] = useState(false)
  const [msg, setMsg] = useState<{text: string, type: 'error'|'success'} | null>(null)
  
  useEffect(() => {
    if (userId) {
      const fetchBalance = async () => {
         const { data } = await supabase.from('users').select('balance').eq('id', userId).single();
         if (data) setBalance(data.balance || 0);
      };
      fetchBalance();
      
      const channel = supabase.channel('wallet_user_balance').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, () => {
        fetchBalance();
      }).subscribe();
      
      return () => { supabase.removeChannel(channel) };
    }
  }, [userId])

  const handleClaimBonus = async () => {
    setClaiming(true)
    setMsg(null)
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.post('/api/wallet/bonus', {}, { headers: { Authorization: `Bearer ${token}` } })
      setMsg({ text: res.data.message, type: 'success' })
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error || "Failed to claim bonus", type: 'error' })
    } finally {
      setClaiming(false)
    }
  }

  if (!isLoaded) return <div className="p-8 text-center text-zinc-400">Loading wallet...</div>
  
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-3.5rem)]">
        <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
        <p className="text-zinc-400 max-w-md">You need to sign in to view your wallet.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-8 max-w-4xl h-[calc(100vh-3.5rem)] fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-zinc-400">Manage your balance and billing.</p>
      </div>

      {msg && (
        <div className={`p-4 border rounded-xl text-sm font-medium ${msg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-zinc-900 flex flex-col">
          <div className="p-6 bg-[var(--primary,#8B5CF6)] text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Wallet className="h-24 w-24" />
            </div>
            <h2 className="text-sm font-medium text-white/80 mb-2 relative z-10">Current Balance</h2>
            <div className="text-5xl font-bold mb-6 tracking-tight relative z-10">
              {config.currency_symbol || '$'}{balance.toLocaleString()}
            </div>
            
            <Button className="w-full bg-white text-black hover:bg-zinc-200 relative z-10 gap-2 font-semibold">
              <CreditCard className="h-4 w-4" /> Top Up Balance
            </Button>
          </div>
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-2">
             <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 gap-2" onClick={handleClaimBonus} disabled={claiming}>
                <Gift className="h-4 w-4 text-[var(--primary,#8B5CF6)]" /> {claiming ? "Claiming..." : "Claim Daily Bonus"}
             </Button>
          </div>
        </div>

        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold">Transaction History</h2>
          </div>

          <div className="flex flex-col items-center justify-center p-8 text-zinc-500 space-y-4">
            <div className="p-4 rounded-full bg-zinc-950 border border-zinc-800">
               <History className="h-6 w-6 opacity-50" />
            </div>
            <p>No recent transactions.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
