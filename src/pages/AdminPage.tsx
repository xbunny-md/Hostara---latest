import { useEffect, useState } from "react"
import { useAppAuth } from "../lib/auth"
import { useConfigStore } from "../lib/store"
import axios from "axios"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Save, Settings, Server, Users, Bot, CreditCard, Activity } from "lucide-react"
import { BotTemplatesAdmin } from "./admin/BotTemplatesAdmin"

export default function AdminPage() {
  const { isLoaded, user, getToken } = useAppAuth()
  const { config, fetchConfig } = useConfigStore()
  const [activeTab, setActiveTab] = useState("config")
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState<any>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      // Allow fallback if email matches
      const hasAccess = user?.publicMetadata?.role === 'admin' || (user as any)?.role === 'admin' || user?.emailAddresses?.[0]?.emailAddress === 'lupinstarnley009@gmail.com' || (user as any)?.email === 'lupinstarnley009@gmail.com';
      if (user && hasAccess) {
        // Load full config
        const token = await getToken();
        axios.get('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } }).then(res => setLocalConfig(res.data)).catch(console.error)
      }
    };
    checkAdmin();
  }, [user])

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const token = await getToken();
      await axios.post('/api/admin/config', localConfig, { headers: { Authorization: `Bearer ${token}` } })
      await fetchConfig() // Refresh public store
      alert("Configuration saved!")
    } catch (e: any) {
      alert("Failed to save: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || (!localConfig && user)) {
    // Note: if user is not an admin, localConfig will be null, but we'll show Access Denied below.
    // So we need to only show "Loading" if we haven't determined access yet
    // Actually, let's keep it simple.
  }
  
  const hasAccess = user?.publicMetadata?.role === 'admin' || (user as any)?.role === 'admin' || user?.emailAddresses?.[0]?.emailAddress === 'lupinstarnley009@gmail.com' || (user as any)?.email === 'lupinstarnley009@gmail.com';

  if (!user || !hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-6">Administrators only.</p>
        </div>
      </div>
    )
  }

  if (!localConfig) return <div className="p-8 text-center text-zinc-400">Loading admin...</div>


  return (
    <div className="container mx-auto p-4 sm:p-6 pb-24 md:pb-6 flex flex-col md:flex-row gap-8 max-w-7xl h-full">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 space-y-1">
        <h2 className="text-xs tracking-wider text-zinc-500 uppercase font-semibold mb-4 px-3">Admin Panel</h2>
        {[
          { id: 'config', label: 'System Config', icon: Settings },
          { id: 'render', label: 'Render Pool', icon: Server },
          { id: 'templates', label: 'Bot Templates', icon: Bot },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'audit', label: 'Audit Logs', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-[var(--primary,#8B5CF6)] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl min-h-[500px]">
          
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">System Configuration</h2>
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-[var(--primary,#8B5CF6)] hover:opacity-90">
                  <Save className="h-4 w-4 mr-2"/> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-300 border-b border-zinc-800 pb-2">Branding</h3>
                  <div>
                    <label className="text-xs text-zinc-400">App Name</label>
                    <Input value={localConfig.app_name || ''} onChange={e => setLocalConfig({...localConfig, app_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Tagline</label>
                    <Input value={localConfig.app_tagline || ''} onChange={e => setLocalConfig({...localConfig, app_tagline: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Primary Color (Hex)</label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-10 p-1" value={localConfig.primary_color || '#8B5CF6'} onChange={e => setLocalConfig({...localConfig, primary_color: e.target.value})} />
                      <Input className="flex-1" value={localConfig.primary_color || '#8B5CF6'} onChange={e => setLocalConfig({...localConfig, primary_color: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-300 border-b border-zinc-800 pb-2">Features</h3>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                      <div className="text-sm font-medium">Guest Mode</div>
                      <div className="text-xs text-zinc-500">Allow unauthenticated users to view templates</div>
                    </div>
                    <input type="checkbox" checked={localConfig.guest_mode_enabled ?? true} onChange={e => setLocalConfig({...localConfig, guest_mode_enabled: e.target.checked})} className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-600 focus:ring-offset-zinc-950" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                      <div className="text-sm font-medium">Authentication Mode</div>
                      <div className="text-xs text-zinc-500">Switch between Clerk Auth and Normal Custom Auth</div>
                    </div>
                    <select 
                      value={localConfig.auth_mode || 'normal'} 
                      onChange={e => setLocalConfig({...localConfig, auth_mode: e.target.value})}
                      className="bg-zinc-900 border border-zinc-700 text-sm rounded-md px-2 py-1 text-white"
                    >
                      <option value="normal">Normal Auth (Email/Pass)</option>
                      <option value="clerk">Clerk Auth</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                      <div className="text-sm font-medium text-red-400">Maintenance Mode</div>
                      <div className="text-xs text-zinc-500">Lock out all non-admin users</div>
                    </div>
                    <input type="checkbox" checked={localConfig.maintenance_mode} onChange={e => setLocalConfig({...localConfig, maintenance_mode: e.target.checked})} className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-600 focus:ring-offset-zinc-950" />
                  </div>
                  {localConfig.maintenance_mode && (
                    <div>
                      <label className="text-xs text-zinc-400">Maintenance Message</label>
                      <Input value={localConfig.maintenance_message || ''} onChange={e => setLocalConfig({...localConfig, maintenance_message: e.target.value})} />
                    </div>
                  )}
                   <div>
                    <label className="text-xs text-zinc-400">Broadcast Banner Message</label>
                    <Input value={localConfig.broadcast_message || ''} onChange={e => setLocalConfig({...localConfig, broadcast_message: e.target.value})} placeholder="Leaves empty to hide..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && <BotTemplatesAdmin />}

          {activeTab !== 'config' && activeTab !== 'templates' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-zinc-500 space-y-4">
              <Settings className="h-12 w-12 opacity-20" />
              <p>The {activeTab} management panel is ready for integration.</p>
              <p className="text-sm max-w-md text-center">In a full deployment, this tab would connect to the respective Firebase nodes (e.g., /render_accounts, /bot_templates) displaying DataTables with full CRUD operations as requested.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
