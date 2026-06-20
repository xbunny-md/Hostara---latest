import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useAppAuth } from "../lib/auth"
import axios from "axios"
import { Button } from "../components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"

export default function LogsPage() {
  const { botId } = useParams()
  const { isLoaded, userId, getToken } = useAppAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchLogs = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.get(`/api/bot/${botId}/logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (Array.isArray(res.data)) {
        setLogs(res.data.reverse()); // Render sends newest first
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && userId && botId) {
      fetchLogs()
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [isLoaded, userId, botId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  if (!isLoaded) return <div className="p-8 text-center text-zinc-400">Loading terminal...</div>

  return (
    <div className="container mx-auto p-4 sm:p-6 pb-24 md:pb-6 max-w-5xl h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white">
              <ArrowLeft className="h-4 w-4"/>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Terminal Logs</h1>
            <p className="text-xs text-zinc-500 font-mono">{botId}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2 border-zinc-700 hover:bg-zinc-800 hover:text-white bg-zinc-900">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? "Syncing..." : "Sync"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-900 text-red-500 p-3 rounded-md mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 bg-[#050505] border border-zinc-800 rounded-xl overflow-hidden flex flex-col relative shadow-2xl">
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
          </div>
          <div className="text-xs text-zinc-500 ml-4 font-mono font-medium">server-logs.sh</div>
        </div>
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm text-zinc-300 space-y-1.5"
        >
          {logs.length === 0 && !loading && !error && (
            <div className="text-zinc-600 flex flex-col items-center justify-center h-full space-y-2">
              <div className="animate-pulse">Waiting for stdout...</div>
            </div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="break-words hover:bg-zinc-900/50 rounded px-1 transition-colors">
              <span className="text-zinc-600 mr-3 hidden sm:inline-block select-none">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
              <span className={log.message.toLowerCase().includes('error') ? 'text-red-400' : log.message.toLowerCase().includes('warn') ? 'text-yellow-400' : 'text-zinc-300'}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
