import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { ref, onValue, remove, update } from 'firebase/database'
import { Button } from '../../components/ui/button'
import { Trash, Ban, Edit, Activity } from 'lucide-react'

export function BotsAdmin() {
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onValue(ref(db, 'users'), (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val()
        const allBots: any[] = []
        for (const [uid, userRecord] of Object.entries(usersData) as any) {
          if (userRecord.bots) {
            for (const [botId, botData] of Object.entries(userRecord.bots) as any) {
              allBots.push({
                ...botData,
                id: botId,
                userId: uid,
                userName: userRecord.email || userRecord.name || uid
              })
            }
          }
        }
        setBots(allBots.sort((a, b) => b.created_at - a.created_at))
      } else {
        setBots([])
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleDelete = async (userId: string, botId: string) => {
    if (confirm('Are you sure you want to delete this bot deployment?')) {
      await remove(ref(db, `users/${userId}/bots/${botId}`))
    }
  }

  const handleSuspend = async (bot: any) => {
    const newStatus = bot.status === 'suspended' ? 'published' : 'suspended'
    await update(ref(db, `users/${bot.userId}/bots/${bot.id}`), { status: newStatus })
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'deploying': return 'text-yellow-400 bg-yellow-400/10'
      case 'published': return 'text-emerald-400 bg-emerald-400/10'
      case 'error': return 'text-red-400 bg-red-400/10'
      case 'suspended': return 'text-orange-400 bg-orange-400/10'
      default: return 'text-zinc-400 bg-zinc-800'
    }
  }

  if (loading) return <div>Loading bots...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Active Deployments (Bots)</h2>

      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-400 bg-zinc-900/50 uppercase">
            <tr>
              <th className="px-4 py-3">Bot Name</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map(bot => (
              <tr key={bot.id} className="border-b border-zinc-800 bg-zinc-950">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{bot.name || 'Unnamed Bot'}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">{bot.id}</div>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {bot.templateId || 'custom'}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-mono text-zinc-400 truncate max-w-[120px]" title={bot.userId}>
                    {bot.userId}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${getStatusColor(bot.status)}`}>
                    {bot.status || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10" onClick={() => handleSuspend(bot)} title={bot.status === 'suspended' ? 'Unsuspend' : 'Suspend'}>
                       <Ban className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDelete(bot.userId, bot.id)} title="Delete">
                       <Trash className="h-4 w-4" />
                     </Button>
                  </div>
                </td>
              </tr>
            ))}
            {bots.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-zinc-500">No bots deployed yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
