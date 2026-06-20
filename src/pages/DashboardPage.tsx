import { useEffect, useState } from "react"
import { ref, onValue, set, get } from "firebase/database"
import { db } from "../lib/firebase"
import axios from "axios"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Select } from "../components/ui/select"
import { useConfigStore } from "../lib/store"
import { Bot, Terminal, Settings, Activity } from "lucide-react"
import { useAppAuth } from "../lib/auth"

export default function DashboardPage() {
  const { isLoaded, userId, user, getToken } = useAppAuth()
  const { config } = useConfigStore()
  const [searchParams] = useSearchParams()
  const [bots, setBots] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [uptimeData, setUptimeData] = useState<Record<string, any>>({})

  // Form Fields
  const [botName, setBotName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  // Custom Repo Fields
  const [customRepoUrl, setCustomRepoUrl] = useState("")
  const [customBuildCmd, setCustomBuildCmd] = useState("npm install")
  const [customStartCmd, setCustomStartCmd] = useState("npm start")

  useEffect(() => {
    if (isLoaded && userId && user) {
      // Listen to User Data
      const userRef = ref(db, `users/${userId}`);
      const unsubUser = onValue(userRef, (snapshot) => {
        if (!snapshot.exists()) {
          set(userRef, {
            email: user.emailAddresses?.[0]?.emailAddress || (user as any).email || "",
            phone: user.primaryPhoneNumber?.phoneNumber || (user as any).phone || "",
            plan: 'trial',
            balance: 0,
            created_at: Date.now(),
          });
        } else {
          const val = snapshot.val()
          setUserData(val)
          if (val.bots) {
            const list = Object.entries(val.bots).map(([id, data]) => ({ id, ...(data as any) }))
            list.sort((a,b) => (b.created_at || 0) - (a.created_at || 0));
            setBots(list)
          } else {
            setBots([])
          }
        }
      });

      // Listen to Templates
      const templatesRef = ref(db, `bot_templates`);
      const unsubTemplates = onValue(templatesRef, (snapshot) => {
        const val = snapshot.val()
        if (val) {
          // Note: In store we might not filter by status, or we might. Removed status filter for now since it's not strictly set in Admin.
          const list = Object.entries(val).map(([id, data]) => ({ id, ...(data as any) }))
          setTemplates(list)
          
          let initialTid = list[0]?.id;
          const queryTid = searchParams.get('template')
          if (queryTid && list.find(t => t.id === queryTid)) {
            initialTid = queryTid;
          }
          
          if(!selectedTemplate && initialTid) {
            setSelectedTemplate(initialTid)
            const pt = list.find(t => t.id === initialTid)
            if(pt?.required_envs) initEnvVars(pt.required_envs)
          }
        }
      });

      setLoading(false)
      return () => {
        unsubUser()
        unsubTemplates()
      }
    }
  }, [isLoaded, userId, user])

  // Uptime Polling Mechanism
  useEffect(() => {
    let interval: any;
    const fetchUptime = async () => {
      const token = await getToken();
      if (!token) return;
      const data: Record<string, any> = {};
      await Promise.all(bots.filter(b => b.status !== 'deploying').map(async (bot) => {
          try {
              const res = await axios.get(`/api/bot/${bot.id}/uptime`, { headers: { Authorization: `Bearer ${token}` } });
              data[bot.id] = res.data;
          } catch(e) {
              data[bot.id] = { status: "down", uptime_ratio: "0.00", response_time: 0 };
          }
      }));
      setUptimeData(prev => ({ ...prev, ...data }));
    };

    if (bots.length > 0) {
      fetchUptime();
      interval = setInterval(fetchUptime, 30000); // Polling every 30s
    }

    return () => clearInterval(interval);
  }, [bots, getToken]);

  const initEnvVars = (envs: string[]) => {
    const vars: Record<string, string> = {}
    if(envs) {
      envs.forEach(e => vars[e] = "")
    }
    setEnvVars(vars)
  }

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value
    setSelectedTemplate(tid)
    if (tid === 'custom') {
      initEnvVars([]) 
    } else {
      const pt = templates.find(t => t.id === tid)
      if(pt?.required_envs) initEnvVars(pt.required_envs)
    }
  }

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedTemplate === 'custom') {
      if (!customRepoUrl) return setError("Please provide a Github URL.");
      if (!customStartCmd) return setError("Please provide a Start Command.");
    } else {
      // Check missing envs
      const missing = Object.entries(envVars).filter(([k,v]) => !v.trim())
      if (missing.length > 0) {
        setError(`Please fill all required environment variables.`)
        return
      }
    }

    if (!botName.trim()) {
      setError("Please provide a name for your bot.")
      return
    }

    const templateObj = templates.find(t => t.id === selectedTemplate)
    const templatePrice = selectedTemplate === 'custom' ? 3500 : (templateObj?.cost || templateObj?.price_extra || 0)
    if (userData?.balance < templatePrice) {
      setError(`Insufficient balance. Requires ${config.currency_symbol || 'TZS'} ${templatePrice}. Please top up your wallet.`)
      return
    }

    setDeploying(true)
    setError("")

    try {
      const token = await getToken();
      await axios.post("/api/deploy", {
        templateId: selectedTemplate,
        name: botName.trim(),
        envVars,
        customRepoUrl,
        customBuildCmd,
        customStartCmd
      }, { headers: { Authorization: `Bearer ${token}` } });
      setBotName("")
      if (selectedTemplate !== 'custom') {
        initEnvVars(templates.find(t => t.id === selectedTemplate)?.required_envs || [])
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setDeploying(false)
    }
  }

  if (!isLoaded || loading) return <div className="p-8 text-center text-zinc-400">Loading dashboard...</div>

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bots</h1>
          <p className="text-zinc-400">Manage and deploy your WhatsApp bot instances.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Deploy Form */}
        <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900 rounded-xl p-6 h-fit sticky top-20 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Deploy Instance</h2>
          
          {error && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-md mb-4 text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleDeploy} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Select Template</label>
              <Select 
                value={selectedTemplate} 
                onChange={handleTemplateChange}
                disabled={deploying || templates.length === 0}
              >
                {templates.length === 0 && <option value="">No templates available</option>}
                {templates.map(t => {
                  const p = t.cost || t.price_extra || 0;
                  return <option key={t.id} value={t.id}>{t.name} {p ? `(${config.currency_symbol || 'TZS'} ${p})` : '(FREE)'}</option>
                })}
                <option value="custom">Custom Github Repository ({config.currency_symbol || 'TZS'} 3500)</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Bot Name</label>
              <Input 
                placeholder="e.g. My Awesome Bot"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                disabled={deploying}
              />
            </div>
            
            {selectedTemplate === 'custom' && (
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1 text-xs">Github Repo URL</label>
                  <Input 
                    placeholder="https://github.com/user/repo"
                    value={customRepoUrl}
                    onChange={(e) => setCustomRepoUrl(e.target.value)}
                    disabled={deploying}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1 text-xs">Build Command</label>
                  <Input 
                    placeholder="npm install && npm run build"
                    value={customBuildCmd}
                    onChange={(e) => setCustomBuildCmd(e.target.value)}
                    disabled={deploying}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1 text-xs">Start Command</label>
                  <Input 
                    placeholder="npm start"
                    value={customStartCmd}
                    onChange={(e) => setCustomStartCmd(e.target.value)}
                    disabled={deploying}
                  />
                </div>
              </div>
            )}

            {Object.keys(envVars).map(envKey => (
              <div key={envKey}>
                <label className="block text-sm font-medium text-zinc-300 mb-1 font-mono text-xs">{envKey}</label>
                <Input 
                  placeholder={`Enter ${envKey}`}
                  value={envVars[envKey]}
                  onChange={(e) => setEnvVars({...envVars, [envKey]: e.target.value})}
                  disabled={deploying}
                />
              </div>
            ))}
            
            <Button type="submit" className="w-full bg-[var(--primary,#8B5CF6)] hover:opacity-90" disabled={deploying || templates.length === 0}>
              {deploying ? "Deploying..." : "Deploy Bot"}
            </Button>
          </form>
        </div>

        {/* Bot List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Live Instances</h2>
            <div className="text-sm text-zinc-400">Total: {bots.length}</div>
          </div>
          
          {bots.length === 0 ? (
            <div className="border border-zinc-800 bg-zinc-900/50 border-dashed rounded-xl p-12 text-center text-zinc-400">
              <Bot className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50" />
              <p>You haven't deployed any bots yet.</p>
              <p className="text-sm mt-1">Select a template to get started.</p>
            </div>
          ) : (
            bots.map((bot) => (
              <div key={bot.id} className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[var(--primary,#8B5CF6)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{bot.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider bg-[var(--primary,#8B5CF6)]/20 text-[var(--primary,#8B5CF6)] px-2 py-0.5 rounded-full font-medium">
                      {templates.find(t=>t.id===bot.template_id)?.name || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">Started: {new Date(bot.created_at).toLocaleString()}</p>
                    <div className="flex items-center gap-2 text-sm mt-2">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        {bot.status === 'deploying' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${bot.status === 'deploying' ? 'bg-emerald-500' : (bot.status === 'error' ? 'bg-red-500' : 'bg-emerald-500')}`}></span>
                      </span>
                      {bot.status === 'deploying' ? 'Deploying...' : 'Live'}
                    </div>

                    {bot.status !== 'deploying' && uptimeData[bot.id] && (
                      <div className="flex items-center gap-3 ml-2 text-zinc-400 border-l border-zinc-700 pl-3">
                         <div className="flex items-center gap-1 tooltip" title="Live Availability">
                            <Activity className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="font-mono text-xs">{uptimeData[bot.id].uptime_ratio}% Uptime</span>
                         </div>
                         <div className="flex items-center gap-1 tooltip" title="Ping latency">
                            <span className="font-mono text-xs">{uptimeData[bot.id].response_time}ms ping</span>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <a href={bot.render_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full sm:w-auto h-9 px-3 border-zinc-700 hover:bg-zinc-800">Visit URL</Button>
                  </a>
                  <Link to={`/dashboard/logs/${bot.render_service_id}`} className="flex-1 sm:flex-none">
                    <Button variant="secondary" className="w-full sm:w-auto h-9 px-3 gap-2">
                      <Terminal className="h-4 w-4" /> Logs
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
