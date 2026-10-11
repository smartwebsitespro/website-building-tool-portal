// v1.0 | 10/10/2026 — WBT Customer Portal — Settings

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useShop } from '../App'
import { WORKER_BASE, WORKER_KEY } from '../config'

export default function SettingsPage() {
  const { shop, reload } = useShop()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [form,   setForm]   = useState({
    name:          shop?.name          ?? '',
    tagline:       shop?.tagline       ?? '',
    primary_color: shop?.primary_color ?? '#4f46e5',
    accent_color:  shop?.accent_color  ?? '#06b6d4',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!shop) return
    setSaving(true)
    try {
      // Update location name/tagline
      await fetch(`${WORKER_BASE}/admin/locations/${shop.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
        body: JSON.stringify({ name: form.name, tagline: form.tagline })
      })
      // Update color settings
      for (const [key, value] of Object.entries({ primary_color: form.primary_color, accent_color: form.accent_color })) {
        await fetch(`${WORKER_BASE}/admin/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
          body: JSON.stringify({ locationId: shop.id, key, value })
        })
      }
      setSaved(true)
      reload()
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shop Info</div>
        <div>
          <label className={labelCls}>Shop Name</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Tagline</label>
          <input className={inputCls} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Your shop's tagline" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branding</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
              <input className={inputCls} value={form.primary_color} onChange={e => set('primary_color', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.accent_color} onChange={e => set('accent_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
              <input className={inputCls} value={form.accent_color} onChange={e => set('accent_color', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
      >
        {saving  && <Loader2 size={14} className="animate-spin" />}
        {saved   && <CheckCircle2 size={14} />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
