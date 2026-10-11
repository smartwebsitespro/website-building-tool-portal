// v2.4 | 09/28/2026 -- Feat: SMS Ramp Status widget (level, capacity bar, rotation, history)
// v2.3 | 09/27/2026 -- Fix: Subscribers section spacing + divider from section above
// v2.2 | 09/27/2026 -- Fix: Subscribers — name+date display, pagination 25/page
// v2.1 | 09/27/2026 -- Feat: Subscribers section — count, search, per-row notify+remove
// v2.0 | 09/27/2026 -- SMS Schedule Engine: day pills, per-day send time, reminder toggle/time/message, KV /sms-schedule endpoint
// v1.0 | 09/09/2026 -- Extracted from RestaurantAdmin monolith

import { useState, useEffect } from 'react'
import { Smartphone, Copy, Globe, X, Clock, ChevronDown, Users } from 'lucide-react'
import type { AdminPageProps, SmsSpecials } from '../adminShared'
import { SectionCard, Toggle, saveLabel, makeHeaders } from '../adminShared'

// ─── Types ────────────────────────────────────────────────────────────────────
type DaySchedule = {
  day             : number   // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  label           : string
  short           : string
  active          : boolean
  specialMessage  : string
  sendTime        : string   // 'HH:MM'
  reminder        : boolean
  reminderTime    : string
  reminderMessage : string
}

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}
const DAYS_ORDER = [
  { day: 1, label: 'Monday',    short: 'Mon' },
  { day: 2, label: 'Tuesday',   short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday',  short: 'Thu' },
  { day: 5, label: 'Friday',    short: 'Fri' },
  { day: 6, label: 'Saturday',  short: 'Sat' },
  { day: 0, label: 'Sunday',    short: 'Sun' },
]
const defaultSchedule = (): DaySchedule[] =>
  DAYS_ORDER.map(d => ({ ...d, active: false, specialMessage: '', sendTime: '10:00', reminder: false, reminderTime: '10:00', reminderMessage: '' }))

const prevDayLabel = (day: number) => DAY_LABELS[day === 0 ? 6 : day - 1]

const TOP_FIELDS = [
  { key: 'welcomeText',  label: 'Welcome Message',  description: 'Sent to new subscribers when they opt in',          rows: 5 },
  { key: 'initialOffer', label: 'Initial Offer',     description: 'First offer sent right after the welcome message',  rows: 5 },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmsSpecialsPage({ isDark, config, t }: AdminPageProps) {

  // Custom values (welcome offer)
  const [smsSpecials, setSmsSpecials] = useState<SmsSpecials | null>(null)
  const [smsLoading,  setSmsLoading]  = useState(false)
  const [smsSaving,   setSmsSaving]   = useState<string | null>(null)
  const [smsSaved,    setSmsSaved]    = useState<string | null>(null)
  const [smsDraft,    setSmsDraft]    = useState<Record<string, string>>({})

  // KV schedule
  const [smsSchedule,    setSmsSchedule]    = useState<DaySchedule[]>(defaultSchedule())
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSaved,  setScheduleSaved]  = useState(false)

  // Broadcast
  const [broadcastOpen,     setBroadcastOpen]     = useState(false)
  const [broadcastMessage,  setBroadcastMessage]  = useState('')
  const [broadcastSending,  setBroadcastSending]  = useState(false)
  const [broadcastSent,     setBroadcastSent]     = useState(false)
  const [broadcastError,    setBroadcastError]    = useState<string | null>(null)
  const [broadcastConfirm,  setBroadcastConfirm]  = useState(false)
  const [broadcastCooldown, setBroadcastCooldown] = useState<{
    canSend: boolean; nextAllowedAt: string | null; minutesRemaining: number
    cooldownActive?: boolean; hoursRemaining?: number; messagePreview?: string
    contactCount?: number; subscriberCount?: number
  }>({ canSend: true, nextAllowedAt: null, minutesRemaining: 0 })
  const [broadcastMessages,   setBroadcastMessages]   = useState<string[]>([])
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('')
  const [showEmbedModal,      setShowEmbedModal]      = useState(false)
  const [copiedEmbed,         setCopiedEmbed]         = useState(false)

  // Subscribers
  type Subscriber = { id: string; firstName: string; lastName: string; phone: string; email: string; dateAdded: string }
  const [subscribers,     setSubscribers]     = useState<Subscriber[]>([])
  const [subTotal,        setSubTotal]        = useState(0)
  const [subSearch,       setSubSearch]       = useState('')
  const [subLoading,      setSubLoading]      = useState(false)
  const [ramp,            setRamp]            = useState<any>(null)
  const [rampLoading,    setRampLoading]    = useState(false)
  const [subPage,         setSubPage]         = useState(1)
  const [subUnsubscribing,setSubUnsubscribing]= useState<string | null>(null)
  const [notifyMap,       setNotifyMap]       = useState<Record<string, boolean>>({})

  // ─── API calls ──────────────────────────────────────────────────────────────
  async function fetchSmsSpecials() {
    setSmsLoading(true)
    try {
      const res  = await fetch(`${config.workerUrl}/sms-specials`, { headers: makeHeaders(config) })
      const data = await res.json() as SmsSpecials
      setSmsSpecials(data)
      const draft: Record<string, string> = {}
      for (const [key, field] of Object.entries(data)) draft[key] = (field as { value: string }).value
      setSmsDraft(draft)
    } catch { /* non-critical */ }
    setSmsLoading(false)
  }

  async function fetchSmsSchedule() {
    try {
      const res = await fetch(`${config.workerUrl}/sms-schedule`, { headers: makeHeaders(config) })
      if (res.ok) {
        const data = await res.json() as DaySchedule[]
        if (Array.isArray(data) && data.length > 0) {
          setSmsSchedule(defaultSchedule().map(def => {
            const saved = data.find(d => d.day === def.day)
            return saved ? { ...def, ...saved } : def
          }))
        }
      }
    } catch { /* non-critical */ }
  }

  async function handleSmsSave(fieldKey: string, value: string) {
    if (!smsSpecials?.[fieldKey]) return
    const field = smsSpecials[fieldKey]
    setSmsSaving(fieldKey)
    try {
      await fetch(`${config.workerUrl}/sms-specials`, {
        method : 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body   : JSON.stringify({ id: field.id, name: field.name, value }),
      })
      setSmsSpecials(prev => prev ? { ...prev, [fieldKey]: { ...prev[fieldKey], value } } : prev)
      setSmsSaved(fieldKey)
      setTimeout(() => setSmsSaved(null), 2000)
    } catch { /* non-critical */ }
    setSmsSaving(null)
  }

  async function handleScheduleSave() {
    setScheduleSaving(true)
    try {
      await fetch(`${config.workerUrl}/sms-schedule`, {
        method : 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body   : JSON.stringify(smsSchedule),
      })
      setScheduleSaved(true)
      setTimeout(() => setScheduleSaved(false), 2500)
    } catch { /* non-critical */ }
    setScheduleSaving(false)
  }

  async function fetchBroadcastMessages() {
    try {
      const res  = await fetch(`${config.workerUrl}/broadcast-messages`, { headers: makeHeaders(config) })
      const data = await res.json()
      if (Array.isArray(data.messages)) setBroadcastMessages(data.messages)
    } catch { /* non-critical */ }
  }

  async function fetchBroadcastCooldown() {
    try {
      const res  = await fetch(`${config.workerUrl}/sms-broadcast`, { headers: makeHeaders(config) })
      const data = await res.json()
      setBroadcastCooldown(data)
    } catch { /* non-critical */ }
  }

  async function fetchRamp() {
    setRampLoading(true)
    try {
      const res = await fetch(`${config.workerUrl}/sms-ramp`, { headers: makeHeaders(config) })
      const data = await res.json()
      setRamp(data)
    } catch { /* non-critical */ }
    setRampLoading(false)
  }

  async function fetchSubscribers(search = subSearch, page = subPage) {
    setSubLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)
      const res = await fetch(`${config.workerUrl}/sms-subscribers?${params}`, { headers: makeHeaders(config) })
      const data = await res.json()
      setSubscribers(data.contacts || [])
      setSubTotal(data.total || 0)
    } catch { /* non-critical */ }
    setSubLoading(false)
  }

  async function handleUnsubscribe(contactId: string, notify: boolean) {
    setSubUnsubscribing(contactId)
    try {
      await fetch(`${config.workerUrl}/sms-subscribers/unsubscribe`, {
        method : 'POST',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body   : JSON.stringify({ contactId, notify }),
      })
      setSubscribers(prev => prev.filter(s => s.id !== contactId))
      setSubTotal(prev => Math.max(0, prev - 1))
      setNotifyMap(prev => { const n = { ...prev }; delete n[contactId]; return n })
    } catch { /* non-critical */ }
    setSubUnsubscribing(null)
  }

    async function handleBroadcastSend() {
    if (!broadcastMessage.trim()) return
    setBroadcastConfirm(false)
    setBroadcastSending(true)
    setBroadcastError(null)
    try {
      const res = await fetch(`${config.workerUrl}/sms-broadcast`, {
        method : 'POST',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body   : JSON.stringify({ message: broadcastMessage.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setBroadcastError(data.error)
      } else {
        const msgs = broadcastMessages.length > 0 ? broadcastMessages : ['Broadcast queued -- GHL workflow is sending now']
        setBroadcastSuccessMsg(msgs[Math.floor(Math.random() * msgs.length)])
        setBroadcastSent(true)
        setBroadcastMessage('')
        setTimeout(() => { setBroadcastSent(false); setBroadcastSuccessMsg('') }, 4000)
        await fetchBroadcastCooldown()
      }
    } catch {
      setBroadcastError('Failed to send broadcast -- please try again')
    }
    setBroadcastSending(false)
  }

  useEffect(() => {
    fetchSmsSpecials()
    fetchSmsSchedule()
    fetchBroadcastMessages()
    fetchBroadcastCooldown()
    fetchSubscribers('')
  }, [config.workerUrl, config.locationId])

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSmsSchedule(prev => prev.map(d => d.day === day ? { ...d, ...patch } : d))
  }

  const activeDays = smsSchedule.filter(d => d.active)

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (smsLoading) return (
    <div className="py-20 text-center">
      <Smartphone className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
      <p className={`text-sm ${t.muted}`}>Loading SMS settings...</p>
    </div>
  )

  return (<>
    <div className="space-y-6">

      {/* Embed code card */}
      <button
        onClick={() => setShowEmbedModal(true)}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all text-left ${
          isDark ? 'border-blue-800/50 bg-blue-900/10 hover:bg-blue-900/20 hover:border-blue-700'
                 : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300'
        }`}
      >
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
          <Copy className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Get Your SMS Opt-In Embed Code</p>
          <p className={`text-xs mt-0.5 ${t.muted}`}>Drop the signup form on any page — or share a direct link to your subscribers.</p>
        </div>
        <Globe className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-500' : 'text-blue-400'}`} />
      </button>

      {/* Broadcast */}
      <div className={`rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
        <button
          onClick={() => setBroadcastOpen(v => !v)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>SMS Broadcast</p>
            <p className={`text-xs mt-0.5 ${t.muted}`}>Send an immediate one-time message to all your SMS subscribers</p>
          </div>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isDark ? 'text-gray-500' : 'text-slate-400'} ${broadcastOpen ? 'rotate-180' : ''}`} />
        </button>
        {broadcastOpen && (
          <div className="px-5 pb-5">
            {broadcastCooldown?.cooldownActive && (
              <div className={`flex items-start gap-3 p-4 rounded-xl mb-3 ${isDark ? 'bg-amber-900/20 border border-amber-800/40' : 'bg-amber-50 border border-amber-200'}`}>
                <span className="text-lg mt-0.5">{String.fromCodePoint(0x23F3)}</span>
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Cooldown Active — {broadcastCooldown.hoursRemaining}h remaining</p>
                  {broadcastCooldown.messagePreview && <p className={`text-xs mt-1 ${t.muted}`}>Last: {broadcastCooldown.messagePreview}</p>}
                  {broadcastCooldown.contactCount != null && <p className={`text-xs mt-0.5 ${t.muted}`}>Sent to {broadcastCooldown.contactCount} subscribers</p>}
                </div>
              </div>
            )}
            {broadcastSent && (
              <div className={`flex items-start gap-3 p-4 rounded-xl mb-3 ${t.smsActive}`}>
                <span className="text-lg mt-0.5">{String.fromCodePoint(0x2705)}</span>
                <p className={`text-sm font-semibold ${t.smsActiveText}`}>{broadcastSuccessMsg || 'Broadcast queued -- GHL workflow is sending now'}</p>
              </div>
            )}
            <textarea
              value={broadcastMessage}
              onChange={e => { setBroadcastMessage(e.target.value); setBroadcastError(null) }}
              rows={5}
              placeholder="Type your broadcast message..."
              disabled={!!(broadcastCooldown?.cooldownActive) || broadcastSending}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none ${t.input}${broadcastCooldown?.cooldownActive ? ' opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex items-center justify-between mt-2 mb-3">
              <span className={`text-xs ${broadcastMessage.length > 160 ? 'text-amber-400 font-medium' : t.muted}`}>
                {broadcastMessage.length} chars{broadcastMessage.length > 160 ? ' (multi-part SMS)' : ''}
              </span>
              {broadcastError && <p className="text-xs text-red-400 font-medium">{broadcastError}</p>}
            </div>
            {broadcastConfirm ? (
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-red-900/20 border-red-800/40' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm flex-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  {broadcastCooldown?.subscriberCount != null
                    ? `Send to ${broadcastCooldown.subscriberCount} SMS subscriber${broadcastCooldown.subscriberCount !== 1 ? 's' : ''}? This cannot be undone.`
                    : 'Send to all SMS subscribers? This cannot be undone.'}
                </p>
                <button onClick={handleBroadcastSend} className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0">Yes, Send</button>
                <button onClick={() => setBroadcastConfirm(false)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex-shrink-0 ${t.btnSec}`}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => { if (broadcastMessage.trim()) setBroadcastConfirm(true) }}
                disabled={!!(broadcastCooldown?.cooldownActive) || broadcastSending || !broadcastMessage.trim()}
                className={'w-full py-2.5 text-sm font-semibold rounded-xl transition-all ' + (
                  broadcastCooldown?.cooldownActive
                    ? 'cursor-not-allowed opacity-50 ' + (isDark ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-gray-100 text-gray-400 border border-gray-200')
                    : broadcastSending ? 'bg-amber-500/40 text-black/40 cursor-not-allowed'
                    : !broadcastMessage.trim() ? 'cursor-not-allowed opacity-50 ' + (isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                    : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
                )}
              >
                {broadcastSending ? 'Sending...' : broadcastCooldown?.cooldownActive ? `Available in ${broadcastCooldown.hoursRemaining}h` : 'Send Broadcast'}
              </button>
            )}
          </div>
        )}
      </div>


      {/* Welcome Offer */}
      <div>
        <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${t.sectionLbl}`}>Welcome Offer</p>
        <p className={`text-xs mb-4 ${t.muted}`}>Sent automatically when a new subscriber opts in. Followed by the tag that enrolls them in weekly specials.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TOP_FIELDS.map(field => {
            const draft  = smsDraft[field.key] ?? ''
            const saving = smsSaving === field.key
            const saved  = smsSaved  === field.key
            const chars  = draft.length
            return (
              <SectionCard key={field.key} isDark={isDark} title={field.label} description={field.description}>
                <textarea
                  value={draft}
                  onChange={e => setSmsDraft((prev: Record<string,string>) => ({ ...prev, [field.key]: e.target.value }))}
                  rows={field.rows}
                  placeholder="Type your message here..."
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none ${t.input}`}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${chars > 160 ? 'text-amber-400 font-medium' : t.muted}`}>
                    {chars} chars{chars > 160 ? ' (multi-part SMS)' : ''}
                  </span>
                  <button
                    onClick={() => handleSmsSave(field.key, draft)}
                    disabled={saving || !smsSpecials}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-900 dark:text-neutral-900 text-sm font-semibold rounded-lg transition-colors min-w-[72px]"
                  >
                    {saveLabel(saving, saved) ?? 'Save'}
                  </button>
                </div>
              </SectionCard>
            )
          })}
        </div>
      </div>

      {/* Weekly SMS Schedule */}
      <div>
        <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${t.sectionLbl}`}>Weekly SMS Schedule</p>
        <p className={`text-xs mb-4 ${t.muted}`}>Select the days to send specials. Configure message, send time, and day-before reminder per day.</p>

        {/* Day pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {smsSchedule.map(d => (
            <button
              key={d.day}
              onClick={() => updateDay(d.day, { active: !d.active })}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                d.active
                  ? 'bg-amber-500 border-amber-400 text-black shadow-sm'
                  : isDark
                  ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  : 'border-stone-200 text-slate-500 hover:border-stone-300 hover:text-slate-700'
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>

        {/* Active day cards */}
        {activeDays.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed p-8 text-center ${isDark ? 'border-gray-800' : 'border-stone-200'}`}>
            <p className={`text-sm ${t.muted}`}>Tap a day above to add it to your schedule</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDays.map(d => (
              <div key={d.day} className={`rounded-xl border p-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>

                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{d.label} Special</p>
                  <button
                    onClick={() => updateDay(d.day, { active: false })}
                    className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-stone-100 text-slate-400'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Special message */}
                <div className="mb-3">
                  <p className={`text-xs font-medium mb-1.5 ${t.muted}`}>Day-of message</p>
                  <textarea
                    value={d.specialMessage}
                    onChange={e => updateDay(d.day, { specialMessage: e.target.value })}
                    rows={4}
                    placeholder={`Today's ${d.label} special...`}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none ${t.input}`}
                  />
                  <span className={`text-xs ${d.specialMessage.length > 160 ? 'text-amber-400 font-medium' : t.muted}`}>
                    {d.specialMessage.length} chars{d.specialMessage.length > 160 ? ' (multi-part)' : ''}
                  </span>
                </div>

                {/* Send time */}
                <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 ${isDark ? 'bg-gray-800' : 'bg-stone-50'}`}>
                  <Clock className={`w-4 h-4 flex-shrink-0 ${t.muted}`} />
                  <p className={`text-xs font-medium flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Send time</p>
                  <input
                    type="time"
                    value={d.sendTime}
                    onChange={e => updateDay(d.day, { sendTime: e.target.value })}
                    className={`text-sm border rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 ${t.input}`}
                  />
                </div>

                {/* Reminder toggle */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-stone-50'}`}>
                  <div>
                    <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Send day-before reminder</p>
                    <p className={`text-xs mt-0.5 ${t.muted}`}>Sends on {prevDayLabel(d.day)} to preview tomorrow's special</p>
                  </div>
                  <Toggle enabled={d.reminder} onChange={v => updateDay(d.day, { reminder: v })} />
                </div>

                {/* Reminder details */}
                {d.reminder && (
                  <div className={`mt-3 pt-3 border-t space-y-3 ${isDark ? 'border-gray-800' : 'border-stone-100'}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-stone-50'}`}>
                      <Clock className={`w-4 h-4 flex-shrink-0 ${t.muted}`} />
                      <p className={`text-xs font-medium flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reminder send time</p>
                      <input
                        type="time"
                        value={d.reminderTime}
                        onChange={e => updateDay(d.day, { reminderTime: e.target.value })}
                        className={`text-sm border rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 ${t.input}`}
                      />
                    </div>
                    <div>
                      <p className={`text-xs font-medium mb-1.5 ${t.muted}`}>Reminder message</p>
                      <textarea
                        value={d.reminderMessage}
                        onChange={e => updateDay(d.day, { reminderMessage: e.target.value })}
                        rows={3}
                        placeholder={`Tomorrow is ${d.label} — here's what's coming...`}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none ${t.input}`}
                      />
                      <span className={`text-xs ${d.reminderMessage.length > 160 ? 'text-amber-400 font-medium' : t.muted}`}>
                        {d.reminderMessage.length} chars{d.reminderMessage.length > 160 ? ' (multi-part)' : ''}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        {/* Save schedule */}
        <div className="mt-4">
          <button
            onClick={handleScheduleSave}
            disabled={scheduleSaving}
            className={`w-full py-3 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ${
              scheduleSaved
                ? isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {scheduleSaving ? 'Saving...' : scheduleSaved ? '\u2713 Schedule Saved' : 'Save Schedule'}
          </button>
        </div>
      </div>

    </div>

      {/* SMS Ramp Status */}
      <div className="mt-10 pt-8 border-t border-stone-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold uppercase tracking-wide ${t.muted}`}>SMS Delivery Ramp</h3>
          <button
            onClick={fetchRamp}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${isDark ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-stone-200 text-slate-500 hover:bg-stone-50'}`}
          >↻ Refresh</button>
        </div>

        {rampLoading ? (
          <p className={`text-xs ${t.muted}`}>Loading ramp status…</p>
        ) : ramp ? (
          <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-stone-200 bg-stone-50'}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Level {ramp.level}
              </span>
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {ramp.currentCapacity.toLocaleString()}/day capacity
              </span>
              {ramp.awaitingLevelUpSince && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  ⏳ Upgrade pending
                </span>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={t.muted}>Sent today</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                  {(ramp.sentToday || 0).toLocaleString()} / {ramp.currentCapacity.toLocaleString()}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-stone-200'}`}>
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((ramp.sentToday || 0) / ramp.currentCapacity) * 100)}%` }}
                />
              </div>
            </div>
            {subTotal > ramp.currentCapacity && (
              <div className="flex justify-between text-xs">
                <span className={t.muted}>Next batch starts at subscriber</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>#{(ramp.lastSentIndex || 0) + 1} of {subTotal}</span>
              </div>
            )}
            {ramp.nextCapacity > ramp.currentCapacity && !ramp.awaitingLevelUpSince && (
              <p className={`text-xs ${t.muted}`}>Send {ramp.currentCapacity.toLocaleString()} msgs in one day to unlock Level {ramp.level + 1} ({ramp.nextCapacity.toLocaleString()}/day)</p>
            )}
            {ramp.awaitingLevelUpSince && (
              <p className={`text-xs ${t.muted}`}>GHL is processing the level-up (24hr pause). Auto-bumps to {ramp.nextCapacity.toLocaleString()}/day in ~{Math.max(0, 48 - Math.round((Date.now() - new Date(ramp.awaitingLevelUpSince).getTime()) / 3600000))}h.</p>
            )}
            {ramp.rampLog && ramp.rampLog.length > 0 && (
              <div className={`pt-2 border-t text-xs space-y-0.5 ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
                <p className={`font-medium mb-1 ${t.muted}`}>Ramp history</p>
                {ramp.rampLog.map((entry: string, i: number) => <p key={i} className={t.muted}>{entry}</p>)}
              </div>
            )}
          </div>
        ) : (
          <p className={`text-xs ${t.muted}`}>No ramp data yet — cron will populate on first automated send.</p>
        )}
      </div>

      {/* SMS Subscribers */}
      <div className="mt-10 pt-8 border-t border-stone-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs uppercase tracking-widest font-semibold ${t.sectionLbl}`}>SMS Subscribers</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-stone-100 text-slate-600'}`}>{subTotal}</span>
        </div>
        <p className={`text-xs mb-4 ${t.muted}`}>Contacts currently enrolled in weekly SMS specials.</p>

        {/* Search */}
        <div className="relative mb-4">
          <Users className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.muted}`} />
          <input
            type="text"
            value={subSearch}
            onChange={e => { setSubSearch(e.target.value); setSubPage(1); fetchSubscribers(e.target.value, 1) }}
            placeholder="Search by name or phone..."
            className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:border-sky-500 transition-colors ${t.input}`}
          />
        </div>

        {/* List */}
        {subLoading ? (
          <p className={`text-sm text-center py-6 ${t.muted}`}>Loading...</p>
        ) : subscribers.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed p-8 text-center ${isDark ? 'border-gray-800' : 'border-stone-200'}`}>
            <p className={`text-sm ${t.muted}`}>{subSearch ? 'No matches found' : 'No subscribers yet'}</p>
          </div>
        ) : (
          <div className={`rounded-xl border divide-y overflow-hidden ${isDark ? 'border-gray-800 divide-gray-800' : 'border-stone-200 divide-stone-100'}`}>
            {subscribers.map(sub => (
              <div key={sub.id} className={`flex items-center gap-3 px-4 py-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {[sub.firstName, sub.lastName].filter(Boolean).join(' ') || '(No name)'}
                  </p>
                  <div className={`flex gap-3 flex-wrap text-xs mt-0.5 ${t.muted}`}>
                    <span>{sub.phone || sub.email || '—'}</span>
                    {sub.dateAdded && (
                      <span>Joined {new Date(sub.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                <label className={`flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap ${t.muted}`}>
                  <input
                    type="checkbox"
                    checked={notifyMap[sub.id] ?? false}
                    onChange={e => setNotifyMap(prev => ({ ...prev, [sub.id]: e.target.checked }))}
                    className="rounded"
                  />
                  Notify
                </label>
                <button
                  onClick={() => handleUnsubscribe(sub.id, notifyMap[sub.id] ?? false)}
                  disabled={subUnsubscribing === sub.id}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {subUnsubscribing === sub.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
        {subTotal > 0 && (
          <div className="flex items-center justify-between mt-3">
            <p className={`text-xs ${t.muted}`}>
              {subTotal} subscriber{subTotal !== 1 ? 's' : ''} · Page {subPage} of {Math.max(1, Math.ceil(subTotal / 25))}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { const p = subPage - 1; setSubPage(p); fetchSubscribers(subSearch, p) }}
                disabled={subPage <= 1 || subLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-stone-200 text-slate-600 hover:bg-stone-50'}`}
              >← Prev</button>
              <button
                onClick={() => { const p = subPage + 1; setSubPage(p); fetchSubscribers(subSearch, p) }}
                disabled={subPage >= Math.ceil(subTotal / 25) || subLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-stone-200 text-slate-600 hover:bg-stone-50'}`}
              >Next →</button>
            </div>
          </div>
        )}
      </div>

        {/* Embed modal */}
    {showEmbedModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>SMS Opt-In Embed Code</h2>
              <p className={`text-xs mt-0.5 ${t.muted}`}>Paste this snippet anywhere you want the signup form to appear.</p>
            </div>
            <button onClick={() => setShowEmbedModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="relative">
              <pre className={`text-xs rounded-xl p-4 pr-20 overflow-x-auto leading-relaxed ${isDark ? 'bg-gray-800 text-green-300' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>{[
                `<div id="ph-sms-signup" data-location="${config.locationId}"></div>`,
                `<script src="${config.workerUrl}/sms-widget.js?locationId=${config.locationId}"><\/script>`,
              ].join('\n')}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText([
                    `<div id="ph-sms-signup" data-location="${config.locationId}"></div>`,
                    `<script src="${config.workerUrl}/sms-widget.js?locationId=${config.locationId}"><\/script>`,
                  ].join('\n'))
                  setCopiedEmbed(true)
                  setTimeout(() => setCopiedEmbed(false), 2000)
                }}
                className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
              >
                <Copy className="w-3 h-3" />
                {copiedEmbed ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              Set GHL workflow trigger to <strong>Tag Added: sms-specials-active-[slug]</strong> before going live.
            </div>
          </div>
        </div>
      </div>
    )}
  </>)

}
