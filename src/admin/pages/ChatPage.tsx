// ChatPage.tsx -- AI Chat & Voice agent toggle
// v1.0 | 09/09/2026 -- Extracted from RestaurantAdmin

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { AdminPageProps } from '../adminShared'
import { SectionCard, Toggle, makeHeaders } from '../adminShared'

export default function ChatPage({ isDark, config, t }: AdminPageProps) {
  const [chatEnabled, setChatEnabled] = useState(true)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    fetch(`${config.workerUrl}/chat`, { headers: makeHeaders(config) })
      .then(r => r.json())
      .then(d => { if (typeof d.chatEnabled === 'boolean') setChatEnabled(d.chatEnabled) })
      .catch(() => {})
  }, [config.workerUrl, config.locationId])

  async function handleChatToggle(val: boolean) {
    setSaving(true)
    setChatEnabled(val)
    try {
      await fetch(`${config.workerUrl}/chat`, {
        method : 'POST',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body   : JSON.stringify({ chatEnabled: val }),
      })
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <SectionCard isDark={isDark} title="AI Chat Widget"
        description="Enable or disable the live chat widget on your public site"
        action={saving ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${t.title}`}>Chat widget</p>
            <p className={`text-xs mt-0.5 ${t.muted}`}>{chatEnabled ? 'Visible on your public site' : 'Hidden from visitors'}</p>
          </div>
          <Toggle enabled={chatEnabled} onChange={handleChatToggle} />
        </div>
      </SectionCard>

      <SectionCard isDark={isDark} title="Voice Agent" description="Inbound call AI" comingSoon />
      <SectionCard isDark={isDark} title="Outbound AI" description="Follow-up automation" comingSoon />
    </div>
  )
}
