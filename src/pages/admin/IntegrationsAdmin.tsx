import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Save } from 'lucide-react'

export function IntegrationsAdmin() {
  const [keys, setKeys] = useState({
    render_api_key: '',
    owner_id: '',
    uptimerobot_api_key: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchKeys = async () => {
      const { data } = await supabase.from('admin_keys').select('*').eq('id', 'default').single();
      if (data) {
        setKeys({
          render_api_key: data.render_api_key || '',
          owner_id: data.owner_id || '',
          uptimerobot_api_key: data.uptimerobot_api_key || ''
        });
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('admin_keys').upsert({
      id: 'default',
      ...keys,
      updated_at: new Date().toISOString()
    });
    setSaving(false);
    alert('Integrations saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">API Integrations</h2>
        <Button onClick={handleSave} disabled={saving} className="bg-[var(--primary,#8B5CF6)] hover:opacity-90">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Config"}
        </Button>
      </div>

      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4">
        <h3 className="font-medium text-lg border-b border-zinc-800 pb-2 mb-4">Render Hosting</h3>
        <div>
          <label className="text-xs text-zinc-400">Render API Key</label>
          <Input type="password" value={keys.render_api_key} onChange={e => setKeys({...keys, render_api_key: e.target.value})} placeholder="rnd_xxxxx" />
          <p className="text-[10px] text-zinc-500 mt-1">Used to automatically deploy bots.</p>
        </div>
        <div>
          <label className="text-xs text-zinc-400">Render Owner ID (Optional)</label>
          <Input value={keys.owner_id} onChange={e => setKeys({...keys, owner_id: e.target.value})} placeholder="usr_xxxxx or tea_xxxxx" />
          <p className="text-[10px] text-zinc-500 mt-1">Leave blank to deploy to your personal account.</p>
        </div>
      </div>

      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4">
        <h3 className="font-medium text-lg border-b border-zinc-800 pb-2 mb-4">UptimeRobot</h3>
        <div>
          <label className="text-xs text-zinc-400">UptimeRobot API Key</label>
          <Input type="password" value={keys.uptimerobot_api_key} onChange={e => setKeys({...keys, uptimerobot_api_key: e.target.value})} placeholder="urxxxxxx-xxxxxx" />
          <p className="text-[10px] text-zinc-500 mt-1">Used to automatically add uptime monitors for deployed bots.</p>
        </div>
      </div>
    </div>
  )
}
