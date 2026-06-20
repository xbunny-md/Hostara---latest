import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Plus, Trash, Edit, X, Save } from 'lucide-react'
import { useConfigStore } from '../../lib/store'

export function BotTemplatesAdmin() {
  const { config } = useConfigStore()
  const currencySymbol = config.currency_symbol || 'TZS'
  const [templates, setTemplates] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
    github_url: '',
    pairing_url: '',
    image_url: '',
    required_envs: '',
    build_cmd: '',
    start_cmd: '',
    rating: '5.0'
  })

  useEffect(() => {
    const fetchTemplates = async () => {
       const { data } = await supabase.from('bot_templates').select('*');
       if (data) setTemplates(data);
    };
    fetchTemplates();
    
    const channel = supabase.channel('bot_templates_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'bot_templates' }, () => {
      fetchTemplates();
    }).subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [])

  const handleEdit = (template: any) => {
    setEditingId(template.id)
    setFormData({
      name: template.name || '',
      category: template.category || '',
      cost: template.cost || '',
      github_url: template.github_url || '',
      pairing_url: template.pairing_url || '',
      image_url: template.image_url || '',
      required_envs: template.required_envs ? template.required_envs.join(', ') : '',
      build_cmd: template.build_cmd || '',
      start_cmd: template.start_cmd || '',
      rating: template.rating || '5.0'
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await supabase.from('bot_templates').delete().eq('id', id);
    }
  }

  const handleSave = async () => {
    const payload = {
      ...formData,
      required_envs: formData.required_envs.split(',').map(e => e.trim()).filter(e => e),
      cost: Number(formData.cost) || 0,
      downloads: editingId && editingId !== 'new' ? (templates.find(t => t.id === editingId)?.downloads || 0) : 0
    }
    
    if (editingId && editingId !== 'new') {
      await supabase.from('bot_templates').update(payload).eq('id', editingId);
    } else {
      await supabase.from('bot_templates').insert(payload);
    }
    
    setEditingId(null)
    setFormData({ name: '', category: '', cost: '', github_url: '', pairing_url: '', image_url: '', required_envs: '', build_cmd: '', start_cmd: '', rating: '5.0' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ name: '', category: '', cost: '', github_url: '', pairing_url: '', image_url: '', required_envs: '', build_cmd: '', start_cmd: '', rating: '5.0' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bot Templates</h2>
        {!editingId && (
          <Button onClick={() => setEditingId('new')} className="bg-[var(--primary,#8B5CF6)] hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Add Template
          </Button>
        )}
      </div>

      {editingId ? (
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4">
          <h3 className="font-medium text-lg border-b border-zinc-800 pb-2 mb-4">
            {editingId === 'new' ? 'Create New Template' : 'Edit Template'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. DODGE-DMN" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Category</label>
              <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Silent, Weak" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Cost ({currencySymbol})</label>
              <Input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="260" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Rating</label>
              <Input value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} placeholder="5.0" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400">Image URL (IMGBB, Imgur, etc.)</label>
              <Input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://i.ibb.co/..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400">Pairing Site URL</label>
              <Input value={formData.pairing_url} onChange={e => setFormData({...formData, pairing_url: e.target.value})} placeholder="https://pair.website.com" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400">GitHub Repository URL</label>
              <Input value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})} placeholder="https://github.com/user/repo" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400">Required Environment Variables (comma-separated)</label>
              <Input value={formData.required_envs} onChange={e => setFormData({...formData, required_envs: e.target.value})} placeholder="SESSION_ID, API_KEY, PREFIX" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Build Command</label>
              <Input value={formData.build_cmd} onChange={e => setFormData({...formData, build_cmd: e.target.value})} placeholder="npm install" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Start Command</label>
              <Input value={formData.start_cmd} onChange={e => setFormData({...formData, start_cmd: e.target.value})} placeholder="npm start" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800 mt-6">
            <Button variant="outline" onClick={handleCancel} className="border-zinc-700 hover:bg-zinc-800">
               <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[var(--primary,#8B5CF6)] hover:opacity-90">
               <Save className="h-4 w-4 mr-2" /> Save Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tmp => (
            <div key={tmp.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col">
              <div className="flex gap-4 items-start mb-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-md overflow-hidden flex-shrink-0">
                   {tmp.image_url ? (
                     <img src={tmp.image_url} alt={tmp.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xl font-bold uppercase">{tmp.name?.charAt(0)}</div>
                   )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold truncate text-white">{tmp.name}</h4>
                  <p className="text-xs text-zinc-400 mb-1">{tmp.category || 'Uncategorized'}</p>
                  <p className="text-xs font-mono text-[var(--primary,#8B5CF6)]">{tmp.cost ? `${currencySymbol} ${tmp.cost.toLocaleString()}` : 'FREE'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-zinc-800">
                <Button variant="outline" size="sm" onClick={() => handleEdit(tmp)} className="flex-1 border-zinc-700 hover:bg-zinc-800 text-xs">
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(tmp.id)} className="flex-1 border-zinc-700 hover:bg-red-900/50 hover:text-red-400 hover:border-red-900/50 text-xs">
                  <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
             <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800 border-dashed">
               No templates added yet.
             </div>
          )}
        </div>
      )}
    </div>
  )
}

