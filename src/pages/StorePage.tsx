import { useEffect, useState } from "react"
import { useAppAuth } from "../lib/auth"
import { useConfigStore } from "../lib/store"
import { supabase } from "../lib/supabase"
import { Star, Download, Zap } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function StorePage() {
  const { isLoaded, user } = useAppAuth()
  const { config } = useConfigStore()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.from('bot_templates').select('*');
      if (data) setTemplates(data);
      setLoading(false);
    };
    fetchTemplates();
    
    const channel = supabase.channel('store_templates').on('postgres_changes', { event: '*', schema: 'public', table: 'bot_templates' }, () => {
      fetchTemplates();
    }).subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [])

  if (!isLoaded || loading) {
    return <div className="p-8 text-center text-zinc-400">Loading templates...</div>
  }

  // If no guest mode, require user
  if (!config.guest_mode_enabled && !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-zinc-400 max-w-md">You need to sign in to browse templates.</p>
      </div>
    )
  }

  const handleDeploy = (templateId: string) => {
    if (!user) {
      alert("Please sign in to deploy this bot.")
      return
    }
    // Navigate to dashboard and pre-select this template if we supported query params there
    // Alternatively, just send them to dashboard and they can pick
    navigate(`/dashboard?template=${templateId}`)
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 pb-24 md:pb-6 max-w-7xl relative">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold font-display uppercase tracking-wider mb-2" style={{ color: config.primary_color || '#8B5CF6' }}>
          Bot Store
        </h1>
        <p className="text-zinc-400">Deploy high-performance bot templates instantly.</p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center p-12 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-zinc-500">No bot templates available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(bot => (
            <div key={bot.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden flex flex-col group relative transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(255,255,255,0.05)] duration-300">
              {/* Image Section */}
              <div className="relative h-48 sm:h-56 bg-zinc-900 overflow-hidden">
                <span className="absolute top-3 left-3 bg-[#FC4C64] text-white text-[10px] font-bold px-2 py-1 rounded-sm z-10 tracking-wider">
                  NEW
                </span>
                {bot.image_url ? (
                  <img src={bot.image_url} alt={bot.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-700">
                    <span className="font-display font-bold text-4xl opacity-50">{bot.name?.charAt(0)}</span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent"></div>
              </div>

              {/* Info Section */}
              <div className="p-4 flex-1 flex flex-col relative z-20 -mt-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold font-display text-white uppercase tracking-tight truncate pr-2">
                    {bot.name}
                  </h3>
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-sm">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs font-bold">{bot.rating || "5.0"}</span>
                  </div>
                </div>
                
                <p className="text-zinc-400 text-xs mb-4 line-clamp-1">
                  {bot.category || "GeneralBot"}
                </p>

                <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    <span>{bot.downloads || 0}</span>
                  </div>
                  <div className="font-mono font-bold text-[10px] text-[#FC4C64] uppercase tracking-wider">
                    {bot.cost ? `${config.currency_symbol || 'TZS'} ${bot.cost.toLocaleString()}` : "FREE"}
                  </div>
                </div>

                <div className="flex gap-2">
                  {bot.pairing_url && (
                    <Button 
                      variant="outline"
                      className="flex-1 border-[#FC4C64] text-[#FC4C64] hover:bg-[#FC4C64] hover:text-white font-medium rounded-xl py-5 transition-colors"
                      onClick={() => window.open(bot.pairing_url, '_blank')}
                    >
                      Pair
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleDeploy(bot.id)}
                    className="flex-[2] bg-[#FC4C64] hover:bg-[#E03A52] text-white font-medium rounded-xl py-5 transition-colors"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Deploy
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
