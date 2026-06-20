import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { ref, onValue, set, remove, update } from 'firebase/database'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Trash, Edit, Save, X, Ban, MessageSquare, Gift } from 'lucide-react'
import { useConfigStore } from '../../lib/store'

export function UsersAdmin() {
  const { config } = useConfigStore()
  const currencySymbol = config.currency_symbol || 'TZS'
  const [users, setUsers] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    balance: 0,
    role: 'user',
    suspended: false
  })

  useEffect(() => {
    const unsub = onValue(ref(db, 'users'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setUsers(Object.entries(data).map(([key, val]: any) => ({ id: key, ...val })))
      } else {
        setUsers([])
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleEdit = (user: any) => {
    setEditingId(user.id)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      balance: user.balance || 0,
      role: user.role || 'user',
      suspended: user.suspended || false
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user? ALL THEIR DATA WILL BE LOST.')) {
      await remove(ref(db, `users/${id}`))
    }
  }

  const handleSuspend = async (user: any) => {
    const isSuspended = !user.suspended
    await update(ref(db, `users/${user.id}`), { suspended: isSuspended })
  }

  const handleSendGift = async (user: any) => {
    const amountStr = prompt(`Enter amount (${currencySymbol}) to gift to ${user.email}:`)
    if (!amountStr) return
    const amount = Number(amountStr)
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount')
    
    await update(ref(db, `users/${user.id}`), { balance: (user.balance || 0) + amount })
    alert(`Gifted ${amount} ${currencySymbol} to ${user.email}`)
  }

  const handleWarn = async (user: any) => {
    const warning = prompt(`Enter warning message for ${user.email}:`)
    if (!warning) return
    
    // In a real app we'd trigger an email/notification, checking our scope we can just save it or show success
    alert(`Warning sent to ${user.email}. (Simulated)`)
  }

  const handleSave = async () => {
    if (editingId) {
      await update(ref(db, `users/${editingId}`), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        balance: Number(formData.balance),
        role: formData.role,
        suspended: formData.suspended
      })
    }
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
  }

  if (loading) return <div>Loading users...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">User Management</h2>

      {editingId ? (
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4">
          <h3 className="font-medium text-lg border-b border-zinc-800 pb-2 mb-4">Edit User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="User Name" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Email</label>
              <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Phone</label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+255..." />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Balance ({currencySymbol})</label>
              <Input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Role</label>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 text-sm rounded-md px-3 py-2 text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input 
                type="checkbox" 
                id="suspend" 
                checked={formData.suspended} 
                onChange={e => setFormData({...formData, suspended: e.target.checked})} 
              />
              <label htmlFor="suspend" className="text-sm text-red-400 font-medium">Account Suspended</label>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800 mt-6">
            <Button variant="outline" onClick={handleCancel} className="border-zinc-700 hover:bg-zinc-800">
               <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[var(--primary,#8B5CF6)] hover:opacity-90">
               <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-900/50 uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-zinc-800 bg-zinc-950">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{user.name || 'No Name'}</div>
                    <div className="text-xs text-zinc-500">{user.email || 'No Email'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--primary,#8B5CF6)]">
                    {currencySymbol} {user.balance?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${user.role === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-300'}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.suspended ? (
                      <span className="text-red-400 text-xs font-semibold">Suspended</span>
                    ) : (
                      <span className="text-emerald-400 text-xs font-semibold">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(user)} title="Edit">
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" onClick={() => handleSendGift(user)} title="Gift Credits">
                         <Gift className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" onClick={() => handleWarn(user)} title="Warn">
                         <MessageSquare className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10" onClick={() => handleSuspend(user)} title={user.suspended ? "Unsuspend" : "Suspend"}>
                         <Ban className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDelete(user.id)} title="Delete">
                         <Trash className="h-4 w-4" />
                       </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-zinc-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
