// WaitlistPanel.tsx -- Pacific Table Waitlist Panel
// v1.22 | 10/09/2026 12:05 AM PDT -- Fix: accept config prop; remove hardcoded locationId (zankCSfWlg2g8wagewAU) and workerUrl (niche-engine-worker); now reads from config passed by WaitlistPage
// v1.21 | 09/22/2026 10:49 PM PDT -- Move Party: ↔ button on occupied cards + modal + handleMoveTable() + worker action:move-table
// v1.20 | 09/22/2026 10:32 PM PDT -- Cut In Line: ⚡ Quick Seat + handleCutIn() with error surfacing [hotfix: catch was silent]
// v1.19 | 09/22/2026 9:02 PM PDT -- Reservation cross-ref on table cards; Resolved Today accordion (closed by default)
// v1.19 | 09/22/2026 9:02 PM PDT -- Reservation cross-ref on table cards; Resolved Today accordion (closed by default)
// v1.18 | 09/22/2026 8:21 PM PDT -- "Party Left" pill on occupied table cards; handleClearTable() → PUT action:clear-table
// v1.17 | 09/22/2026 8:03 PM PDT -- Remove ARRIVE btn; SEAT is only arrival path; "No Table" fallback in seat modal
// v1.16 | 09/22/2026 -- Fix: mapRow() converts D1 snake_case→camelCase + epoch→ISO (NaN/blank party fix)
// v1.15 | 09/22/2026 -- Fix: POST add needs action:join; PUT uses entryId; noshow→no-show
// v1.14 | 09/22/2026 -- Fix: add X-Location-Id header to all 9 fetch calls (was missing on 8/9)
// v1.13 | 09/22/2026 -- Fix: auth key bionic2026->oftheuniverse (401 fix); Table grid always visible
// v1.12 | 09/22/2026 -- Table Availability grid + seat-to-table modal (GET /admin/tables/availability; seat action stores tableId)
// v1.11 | 09/05/2026 -- Rewired to niche-engine-worker for packed-house-portal
// v1.10 | 05-28-2026 5:39 PM PDT
// Changes: Timezone no longer hardcoded. Fetched from /info on mount and stored
//          in state. pstDateKey, formatTime, getLast7Days all accept tz param.
//          Defaults to America/Los_Angeles if fetch fails.

import { useState, useEffect, useCallback } from 'react'
import { Users, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'



type WaitlistStatus = 'waiting' | 'summoned' | 'arrived' | 'no-show' | 'canceled'

type WaitlistEntry = {
  id           : string
  name         : string
  phone        : string
  partySize    : number
  position     : number
  status       : WaitlistStatus
  addedAt      : string
  summonedAt   : string | null
  resolvedAt   : string | null
  consentGiven : boolean
  ghlContactId : string | null
  cleanupAfter   ?: string
  overdueAt      ?: string | null
  timeoutMin     ?: number
  gracePeriodMin ?: number
}

type SortField = 'time' | 'status' | 'partySize'

type TableAvailStatus = 'available' | 'occupied'

type RestaurantTable = {
  id          : string
  label       : string
  seats       : number
  section     : string | null
  status      : TableAvailStatus
  occupant    : { name: string; partySize: number } | null
  reservation ?: { contactName: string; startTime: string; partySize: number; active: boolean; minutesAway: number } | null
}

function pstDateKey(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz })
}

function getLast7Days(tz: string): string[] {
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: tz }))
  }
  return days
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function elapsedLabel(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function saveLabel(saving: boolean, saved: boolean, idle = 'Save'): string {
  if (saving) return 'Saving...'
  if (saved)  return '\u2705'
  return idle
}


function mapRow(row: any, idx: number): WaitlistEntry {
  const toIso = (v: any): string | null => {
    if (!v) return null
    if (typeof v === 'string' && isNaN(Number(v))) return v  // already ISO
    return new Date(Number(v)).toISOString()
  }
  return {
    id           : row.id,
    name         : row.name ?? '',
    phone        : row.phone ?? '',
    partySize    : row.party_size ?? row.partySize ?? 1,
    position     : idx + 1,
    status       : row.status ?? 'waiting',
    addedAt      : toIso(row.joined_at ?? row.addedAt) ?? new Date().toISOString(),
    summonedAt   : toIso(row.summoned_at ?? row.summonedAt),
    resolvedAt   : toIso(row.arrived_at  ?? row.resolvedAt),
    consentGiven : row.consent_given ?? row.consentGiven ?? false,
    ghlContactId : row.ghl_contact_id ?? row.ghlContactId ?? null,
  }
}

function sortEntries(entries: WaitlistEntry[], field: SortField): WaitlistEntry[] {
  return [...entries].sort((a, b) => {
    if (field === 'time')      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    if (field === 'status')    return a.status.localeCompare(b.status)
    if (field === 'partySize') return b.partySize - a.partySize
    return 0
  })
}

function StatusBadge({ status }: { status: WaitlistStatus }) {
  const map: Record<WaitlistStatus, { label: string; cls: string }> = {
    waiting  : { label: 'Waiting',  cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40' },
    summoned : { label: 'Summoned', cls: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40' },
    arrived  : { label: 'Arrived',  cls: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800/40' },
    'no-show': { label: 'No Show',  cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30' },
    canceled : { label: 'Canceled', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600' },
  }
  const { label, cls } = map[status] ?? map.canceled
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
}

export default function WaitlistPanel({ config, isDark }: { config: { workerUrl: string; locationId: string }; isDark?: boolean }) {
  const CONFIG = { locationId: config.locationId, workerUrl: config.workerUrl }

  const [queue,         setQueue]         = useState<WaitlistEntry[]>([])
  const [settings,      setSettings]      = useState<{ noShowTimeoutMin: number; overdueGracePeriodMin: number }>({ noShowTimeoutMin: 10, overdueGracePeriodMin: 2 })
  const [timezone,      setTimezone]      = useState('America/Los_Angeles')
  const [loading,       setLoading]       = useState(false)
  const [adding,        setAdding]        = useState(false)
  const [actionId,      setActionId]      = useState<string | null>(null)
  const [formError,     setFormError]     = useState<string | null>(null)
  const [timeoutDraft,  setTimeoutDraft]  = useState(10)
  const [timeoutSaving, setTimeoutSaving] = useState(false)
  const [timeoutSaved,  setTimeoutSaved]  = useState(false)
  const [graceDraft,    setGraceDraft]    = useState(2)
  const [graceSaving,   setGraceSaving]   = useState(false)
  const [graceSaved,    setGraceSaved]    = useState(false)
  const [purging,       setPurging]       = useState(false)
  const [purgeConfirm,  setPurgeConfirm]  = useState(false)
  const [,              setTick]          = useState(0)
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; status: string } | null>(null)
  const [form,          setForm]          = useState({ name: '', phone: '', partySize: 2, consentGiven: false })
  const [openDays,      setOpenDays]      = useState<Set<string>>(new Set())
  const [sortFields,    setSortFields]    = useState<Record<string, SortField>>({})
  const [tables,        setTables]        = useState<RestaurantTable[]>([])
  const [seatingEntry,  setSeatingEntry]  = useState<WaitlistEntry | null>(null)
  const [tableBusy,     setTableBusy]     = useState(false)
  const [resolvedOpen,  setResolvedOpen]  = useState(false)
  const [cutInTable,    setCutInTable]    = useState<RestaurantTable | null>(null)
  const [cutInName,     setCutInName]     = useState('')
  const [cutInBusy,     setCutInBusy]     = useState(false)
  const [cutInError,    setCutInError]    = useState<string | null>(null)
  const [moveFromTable, setMoveFromTable] = useState<RestaurantTable | null>(null)
  const [moveBusy,      setMoveBusy]      = useState(false)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${CONFIG.workerUrl}/waitlist`, { headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId } })
      const data = await res.json()
      if (Array.isArray(data.queue)) setQueue(data.queue.map((r: any, i: number) => mapRow(r, i)))
      if (data.settings) {
        setSettings(data.settings)
        setTimeoutDraft(data.settings.noShowTimeoutMin ?? 10)
        setGraceDraft(data.settings.overdueGracePeriodMin ?? 2)
      }
    } catch { /* non-critical */ }
    setLoading(false)
  }, [])

  const fetchTables = useCallback(async () => {
    try {
      const res  = await fetch(`${CONFIG.workerUrl}/admin/tables/availability`, {
        headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
      })
      const data = await res.json()
      if (Array.isArray(data.tables)) setTables(data.tables)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    fetchQueue()
    fetchTables()
    fetch(`${CONFIG.workerUrl}/info`)
      .then(r => r.json())
      .then(d => { if (d.timezone) setTimezone(d.timezone) })
      .catch(() => {})
  }, [fetchQueue, fetchTables])

  useEffect(() => {
    const hasSummoned = queue.some(e => e.status === 'summoned')
    const interval    = setInterval(fetchQueue, hasSummoned ? 5_000 : 30_000)
    return () => clearInterval(interval)
  }, [fetchQueue, queue])

  useEffect(() => {
    const hasSummoned = queue.some(e => e.status === 'summoned')
    if (!hasSummoned) return
    const id = setInterval(() => setTick(t => t + 1), 1_000)
    return () => clearInterval(id)
  }, [queue])

  async function handleAdd() {
    const { name, phone, partySize, consentGiven } = form
    if (!name.trim())  { setFormError('Name is required'); return }
    if (!phone.trim()) { setFormError('Phone is required'); return }
    if (partySize < 1) { setFormError('Party size must be at least 1'); return }
    if (!consentGiven)  { setFormError('Guest must consent to SMS waitlist notifications to be added'); return }
    setFormError(null); setAdding(true)
    try {
      const res  = await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ action: 'join', name: name.trim(), phone: phone.trim(), partySize: Number(partySize), consentGiven }),
      })
      const data = await res.json()
      if (data.duplicate) {
        setDuplicateWarning({ name: data.existingName, status: data.existingStatus })
        setAdding(false); return
      }
      if (data.error) { setFormError(data.error) }
      else { setForm({ name: '', phone: '', partySize: 2, consentGiven: false }); await fetchQueue() }
    } catch { setFormError('Failed to add -- please try again') }
    setAdding(false)
  }

  async function handleAction(id: string, action: 'summon' | 'arrive' | 'cancel' | 'noshow') {
    setActionId(id)
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ entryId: id, action: action === 'noshow' ? 'no-show' : action }),
      })
      await fetchQueue()
    } catch { /* non-critical */ }
    setActionId(null)
  }

  async function handleConfirmSeat(tableId: string) {
    if (!seatingEntry) return
    setTableBusy(true)
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body   : JSON.stringify({ id: seatingEntry.id, action: 'seat', tableId }),
      })
      setSeatingEntry(null)
      await Promise.all([fetchQueue(), fetchTables()])
    } catch { /* non-critical */ }
    setTableBusy(false)
  }

  function handlePurge() { setPurgeConfirm(true) }

  async function handlePurgeConfirmed() {
    setPurgeConfirm(false); setPurging(true)
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist/purge`, {
        method: 'DELETE',
        headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
      })
      await fetchQueue()
    } catch { /* non-critical */ }
    setPurging(false)
  }

  async function handleGraceSave() {
    setGraceSaving(true)
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ overdueGracePeriodMin: graceDraft }),
      })
      setSettings(prev => ({ ...prev, overdueGracePeriodMin: graceDraft }))
      setGraceSaved(true); setTimeout(() => setGraceSaved(false), 2000)
    } catch { /* non-critical */ }
    setGraceSaving(false)
  }

  async function handleAddAnyway() {
    const { name, phone, partySize, consentGiven } = form
    setDuplicateWarning(null); setAdding(true)
    try {
      const res  = await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ action: 'join', name: name.trim(), phone: phone.trim(), partySize: Number(partySize), consentGiven, allowDuplicate: true }),
      })
      const data = await res.json()
      if (data.error) { setFormError(data.error) }
      else { setForm({ name: '', phone: '', partySize: 2, consentGiven: false }); await fetchQueue() }
    } catch { setFormError('Failed to add -- please try again') }
    setAdding(false)
  }

  async function handleClearTable(tableId: string | number) {
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body   : JSON.stringify({ action: 'clear-table', tableId: String(tableId) }),
      })
      await fetchTables()
    } catch { /* non-critical */ }
  }

  async function handleCutIn() {
    if (!cutInTable || cutInBusy) return
    setCutInBusy(true)
    setCutInError(null)
    try {
      const res = await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body   : JSON.stringify({ action: 'manual-seat', tableId: String(cutInTable.id), name: cutInName.trim() || 'Walk-in' }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      setCutInTable(null)
      setCutInName('')
      await fetchTables()
    } catch(e: any) {
      setCutInError(e?.message || 'Request failed')
    } finally {
      setCutInBusy(false)
    }
  }

  async function handleMoveTable(toTableId: string) {
    if (!moveFromTable || moveBusy) return
    setMoveBusy(true)
    try {
      const res = await fetch(`${CONFIG.workerUrl}/waitlist`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body   : JSON.stringify({ action: 'move-table', fromTableId: String(moveFromTable.id), toTableId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMoveFromTable(null)
      await fetchTables()
    } catch { /* non-critical */ } finally {
      setMoveBusy(false)
    }
  }

  async function handleAutoSummon() {
    const next = queue.find(e => e.status === 'waiting')
    if (next) await handleAction(next.id, 'summon')
  }

  async function handleTimeoutSave() {
    setTimeoutSaving(true)
    try {
      await fetch(`${CONFIG.workerUrl}/waitlist/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ noShowTimeoutMin: timeoutDraft }),
      })
      setSettings(prev => ({ ...prev, noShowTimeoutMin: timeoutDraft }))
      setTimeoutSaved(true); setTimeout(() => setTimeoutSaved(false), 2000)
    } catch { /* non-critical */ }
    setTimeoutSaving(false)
  }

  function toggleDay(key: string) {
    setOpenDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function setDaySort(day: string, field: SortField) {
    setSortFields(prev => ({ ...prev, [day]: field }))
  }

  function summonedCountdown(entry: WaitlistEntry): { label: string; cls: string; isOverdue: boolean } {
    const now            = Date.now()
    const timeoutMin     = entry.timeoutMin     ?? settings.noShowTimeoutMin    ?? 10
    const gracePeriodMin = entry.gracePeriodMin ?? settings.overdueGracePeriodMin ?? 2
    if (entry.overdueAt) {
      const graceMs  = gracePeriodMin * 60_000
      const elapsed  = now - new Date(entry.overdueAt).getTime()
      const secsLeft = Math.max(0, Math.ceil((graceMs - elapsed) / 1000))
      const minsLeft = Math.floor(secsLeft / 60)
      const secs     = secsLeft % 60
      const label    = secsLeft <= 0 ? 'Removing...' : `${minsLeft}:${String(secs).padStart(2, '0')} to no-show`
      return { label, cls: 'text-red-500 dark:text-red-400', isOverdue: true }
    }
    if (!entry.summonedAt) return { label: '', cls: '', isOverdue: false }
    const elapsed = now - new Date(entry.summonedAt).getTime()
    const minLeft = timeoutMin - Math.floor(elapsed / 60_000)
    if (minLeft <= 0) return { label: 'Overdue', cls: 'text-red-500 dark:text-red-400', isOverdue: true }
    if (minLeft <= 2) return { label: `${minLeft}m left`, cls: 'text-red-500 dark:text-red-400', isOverdue: false }
    if (minLeft <= 5) return { label: `${minLeft}m left`, cls: 'text-amber-500 dark:text-amber-400', isOverdue: false }
    return              { label: `${minLeft}m left`,      cls: 'text-slate-500 dark:text-slate-400', isOverdue: false }
  }

  const waiting       = queue.filter(e => e.status === 'waiting')
  const summoned      = queue.filter(e => e.status === 'summoned')
  const resolved      = queue.filter(e => ['arrived', 'no-show', 'canceled'].includes(e.status))
  const last7         = getLast7Days(timezone)
  const today         = last7[0]
  const todayResolved = resolved.filter(e => pstDateKey(e.addedAt, timezone) === today)

  const historyByDay: Record<string, WaitlistEntry[]> = {}
  resolved.forEach(e => {
    const key = pstDateKey(e.addedAt, timezone)
    if (key !== today && last7.includes(key)) {
      if (!historyByDay[key]) historyByDay[key] = []
      historyByDay[key].push(e)
    }
  })
  const historyDays = last7.slice(1).filter(k => historyByDay[k]?.length > 0)

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Waiting',  count: waiting.length,  hi: false },
          { label: 'Summoned', count: summoned.length, hi: summoned.length > 0 },
          { label: 'Resolved', count: resolved.length, hi: false },
        ].map(({ label, count, hi }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl p-5 text-center">
            <p className={`text-3xl font-bold font-heading ${hi ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>{count}</p>
            <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Add to Waitlist */}
        <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Add to Waitlist</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Enter guest details to add them to the queue</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500 dark:text-slate-400">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Guest name"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors bg-stone-50 border-stone-300 text-slate-800 placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500 dark:text-slate-400">Party Size *</label>
                <input type="number" min={1} max={20} value={form.partySize} onChange={e => setForm(p => ({ ...p, partySize: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors bg-stone-50 border-stone-300 text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500 dark:text-slate-400">Phone *</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(831) 555-1234" type="tel"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors bg-stone-50 border-stone-300 text-slate-800 placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.consentGiven} onChange={e => setForm(p => ({ ...p, consentGiven: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Guest consents to receive SMS waitlist notifications</span>
            </label>
            {formError && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{formError}</p>}
            {duplicateWarning && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">{duplicateWarning.name} is already in the queue ({duplicateWarning.status}). Add anyway?</p>
                <div className="flex gap-2">
                  <button onClick={handleAddAnyway} disabled={adding}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors">
                    Add Anyway
                  </button>
                  <button onClick={() => setDuplicateWarning(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button onClick={handleAdd} disabled={adding}
              className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white">
              {adding ? 'Adding...' : 'Add to Waitlist'}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Waitlist Settings</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Configure no-show timeout for this location</p>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500 dark:text-slate-400">No-Show Timeout (minutes)</label>
            <p className="text-xs mb-3 text-slate-500 dark:text-slate-400">Summoned guests not checked in within this time are auto-marked no-show.</p>
            <div className="flex gap-2">
              <input type="number" min={1} max={60} value={timeoutDraft} onChange={e => setTimeoutDraft(Number(e.target.value))}
                className="flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors bg-stone-50 border-stone-300 text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
              <button onClick={handleTimeoutSave} disabled={timeoutSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors min-w-[72px]">
                {saveLabel(timeoutSaving, timeoutSaved)}
              </button>
            </div>
            <p className="text-xs mt-3 text-slate-500 dark:text-slate-400">Current: {settings.noShowTimeoutMin} minutes</p>
          </div>
          <div className="mt-5 pt-5 border-t border-stone-200 dark:border-slate-700">
            <label className="block text-xs font-medium mb-1 text-slate-500 dark:text-slate-400">Overdue Grace Period (minutes)</label>
            <p className="text-xs mb-3 text-slate-500 dark:text-slate-400">Last-call SMS fires at OVERDUE. This is how long the hostess has before auto-no-show.</p>
            <div className="flex gap-2">
              <input type="number" min={1} max={10} value={graceDraft} onChange={e => setGraceDraft(Number(e.target.value))}
                className="flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors bg-stone-50 border-stone-300 text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
              <button onClick={handleGraceSave} disabled={graceSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors min-w-[72px]">
                {saveLabel(graceSaving, graceSaved)}
              </button>
            </div>
            <p className="text-xs mt-3 text-slate-500 dark:text-slate-400">Current: {settings.overdueGracePeriodMin} minutes</p>
          </div>
        </div>

      </div>

      {/* Active Queue */}
      <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Active Queue</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {waiting.length} waiting{summoned.length > 0 ? `, ${summoned.length} summoned` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {waiting.length > 0 && (
              <button onClick={handleAutoSummon} disabled={!!actionId}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors">
                Auto-Summon Next
              </button>
            )}
            <button onClick={fetchQueue} disabled={loading}
              className="px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-slate-600 rounded-lg transition-colors bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refresh'}
            </button>
          </div>
        </div>

        {loading && waiting.length === 0 && summoned.length === 0 ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500" /></div>
        ) : waiting.length === 0 && summoned.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-stone-300 dark:text-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No active guests in the queue.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...summoned, ...waiting].map(entry => {
              const busy = actionId === entry.id
              const cd   = entry.status === 'summoned' ? summonedCountdown(entry) : null
              return (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border bg-stone-50 border-stone-200 dark:bg-slate-900/50 dark:border-slate-700">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    entry.status === 'waiting' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                  }`}>
                    {entry.status === 'waiting' ? entry.position : '\u2713'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.name}</p>
                      {entry.overdueAt
                        ? <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40">Overdue</span>
                        : <StatusBadge status={entry.status} />}
                      <span className="text-xs text-slate-500 dark:text-slate-400">Party of {entry.partySize}</span>
                      {entry.consentGiven && <span className="text-xs font-medium text-green-600 dark:text-green-400">SMS opt-in</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {!cd?.isOverdue && <p className="text-xs text-slate-500 dark:text-slate-400">Waiting {elapsedLabel(entry.addedAt)}</p>}
                      {cd && <span className={`text-xs font-semibold ${cd.cls}`}>{cd.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {entry.status === 'waiting' && (
                      <button onClick={() => handleAction(entry.id, 'summon')} disabled={busy}
                        className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                        {busy ? '...' : 'Summon'}
                      </button>
                    )}

                    {entry.status === 'summoned' && entry.overdueAt && (
                      <button onClick={() => handleAction(entry.id, 'noshow')} disabled={busy}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                        {busy ? '...' : 'No-Show'}
                      </button>
                    )}
                    {(entry.status === 'waiting' || entry.status === 'summoned') && (
                      <button onClick={() => handleAction(entry.id, 'cancel')} disabled={busy}
                        className="px-2.5 py-1.5 text-xs font-medium border border-stone-200 dark:border-slate-600 rounded-lg transition-colors bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300">
                        {busy ? '...' : 'Cancel'}
                      </button>
                    )}
                    {(entry.status === 'waiting' || entry.status === 'summoned') && (
                      <button type="button" onClick={() => setSeatingEntry(entry)} disabled={busy}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors">
                        {busy ? '...' : '🪑 Seat'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Table Availability */}
      {(
        <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Table Availability</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {tables.filter(t => t.status === 'available').length} of {tables.length} tables available
              </p>
            </div>
            <button type="button" onClick={fetchTables}
              className="px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-slate-600 rounded-lg transition-colors bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300">
              Refresh
            </button>
          </div>
          {tables.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No tables configured yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add tables in Settings → Table Configuration to enable seating assignment.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map(table => (
              <div key={table.id} className={`rounded-xl border p-3 text-center transition-colors ${
                table.status === 'available'
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40'
              }`}>
                <div className={`text-lg font-bold ${table.status === 'available' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {table.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{table.seats} seats</div>
                {table.section && <div className="text-xs text-slate-400 dark:text-slate-500">{table.section}</div>}
                {table.status === 'occupied' && table.occupant && (
                  <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium truncate">
                    {table.occupant.name} ({table.occupant.partySize})
                  </div>
                )}
                <div className={`mt-1.5 text-xs font-semibold ${table.status === 'available' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {table.status === 'available' ? 'Available' : 'Occupied'}
                </div>
                {table.reservation && (
                  <div className={`mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    table.reservation.active
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                      : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                  }`}>
                    {table.reservation.active ? '📋 Reserved NOW' : `📋 Rsvp ${table.reservation.startTime}`}
                  </div>
                )}
                {table.status === 'occupied' && (
                  <div className="mt-2 space-y-1">
                    <button type="button" onClick={() => handleClearTable(table.id)}
                      className="w-full text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-red-300 text-red-600 hover:bg-red-100 dark:bg-slate-700 dark:border-red-700/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                      ✓ Party Left
                    </button>
                    <button type="button" onClick={() => setMoveFromTable(table)}
                      className="w-full text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 dark:bg-slate-700 dark:border-sky-700/50 dark:text-sky-400 dark:hover:bg-sky-900/20 transition-colors">
                      ↔ Move Party
                    </button>
                  </div>
                )}
                {table.status === 'available' && (
                  <button type="button" onClick={() => { setCutInTable(table); setCutInName('') }}
                    className="mt-2 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:bg-slate-700 dark:border-emerald-700/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors">
                    ⚡ Quick Seat
                  </button>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Resolved Today -- accordion, closed by default */}
      {todayResolved.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <button type="button" onClick={() => setResolvedOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 dark:hover:bg-slate-700/40 transition-colors text-left">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Resolved Today</span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                ({todayResolved.filter(e => e.status === 'arrived').length} arrived · {todayResolved.filter(e => e.status === 'no-show').length} no-show · {todayResolved.filter(e => e.status === 'canceled').length} canceled)
              </span>
            </div>
            {resolvedOpen ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
          </button>
          {resolvedOpen && (
            <div className="px-6 pb-5 space-y-2 opacity-70">
              {todayResolved.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border bg-stone-50 border-stone-200 dark:bg-slate-900/50 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.name}</p>
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Party of {entry.partySize}</span>
                    </div>
                    <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                      {formatTime(entry.addedAt, timezone)}{entry.resolvedAt ? ` -- resolved ${formatTime(entry.resolvedAt, timezone)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7-Day History Accordion */}
      <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">7-Day History</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Rolling 7-day guest log -- excludes today</p>
            </div>
            {purgeConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Clear all history?</span>
                <button onClick={handlePurgeConfirmed} disabled={purging}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                  {purging ? 'Clearing...' : 'Confirm'}
                </button>
                <button onClick={() => setPurgeConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={handlePurge} disabled={purging}
                className="px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-800/40 rounded-lg transition-colors bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 disabled:opacity-50">
                Clear History
              </button>
            )}
          </div>
        </div>

        {historyDays.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Clock className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No history from the past 7 days.</p>
          </div>
        ) : (
          historyDays.map(dayKey => {
            const entries       = historyByDay[dayKey]
            const isOpen        = openDays.has(dayKey)
            const sortField     = sortFields[dayKey] ?? 'time'
            const sorted        = sortEntries(entries, sortField)
            const arrivedCount  = entries.filter(e => e.status === 'arrived').length
            const noShowCount   = entries.filter(e => e.status === 'no-show').length
            const canceledCount = entries.filter(e => e.status === 'canceled').length
            const covers        = entries.filter(e => e.status === 'arrived').reduce((s, e) => s + e.partySize, 0)
            return (
              <div key={dayKey} className="border-b border-stone-200 dark:border-slate-700 last:border-b-0">
                <button onClick={() => toggleDay(dayKey)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 dark:hover:bg-slate-700/40 transition-colors text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{formatDayLabel(dayKey)}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>{entries.length} {entries.length === 1 ? 'guest' : 'guests'}</span>
                      {arrivedCount  > 0 && <span className="text-sky-600 dark:text-sky-400">{arrivedCount} arrived</span>}
                      {noShowCount   > 0 && <span className="text-red-500 dark:text-red-400">{noShowCount} no-show</span>}
                      {canceledCount > 0 && <span>{canceledCount} canceled</span>}
                      {covers        > 0 && <span className="text-emerald-600 dark:text-emerald-400">{covers} covers</span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sort by:</span>
                      {(['time', 'status', 'partySize'] as SortField[]).map(field => (
                        <button key={field} onClick={() => setDaySort(dayKey, field)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                            sortField === field
                              ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-400'
                              : 'border-stone-200 text-slate-500 hover:bg-stone-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                          }`}>
                          {field === 'partySize' ? 'Party Size' : field.charAt(0).toUpperCase() + field.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {sorted.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border bg-stone-50 border-stone-200 dark:bg-slate-900/50 dark:border-slate-700">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.name}</p>
                              <StatusBadge status={entry.status} />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Party of {entry.partySize}</span>
                              {entry.consentGiven && <span className="text-xs text-green-600 dark:text-green-400 font-medium">SMS opt-in</span>}
                            </div>
                            <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                              {formatTime(entry.addedAt, timezone)}{entry.resolvedAt ? ` -- resolved ${formatTime(entry.resolvedAt, timezone)}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Table Picker Modal */}
      {seatingEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { if (!tableBusy) setSeatingEntry(null) }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={e => e.stopPropagation()}>
            <div className="mb-5">
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Seat {seatingEntry.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Party of {seatingEntry.partySize} — select an available table
              </p>
            </div>
            {tables.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No tables configured. Add tables in Settings → Table Configuration.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {tables.map(table => {
                  const fits  = table.seats >= seatingEntry.partySize
                  const avail = table.status === 'available'
                  return (
                    <button key={table.id} type="button"
                      disabled={!avail || tableBusy}
                      onClick={() => { if (avail && !tableBusy) handleConfirmSeat(table.id) }}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        avail && fits
                          ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:hover:bg-emerald-900/30 cursor-pointer'
                          : avail
                          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800/40 cursor-pointer'
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40 opacity-60 cursor-not-allowed'
                      }`}>
                      <div className={`text-base font-bold ${
                        avail ? (fits ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')
                              : 'text-red-500 dark:text-red-400'
                      }`}>
                        {table.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{table.seats} seats</div>
                      {table.section && <div className="text-xs text-slate-400 dark:text-slate-500">{table.section}</div>}
                      {!avail && table.occupant && (
                        <div className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium truncate">
                          {table.occupant.name}
                        </div>
                      )}
                      <div className={`text-xs font-semibold mt-1 ${
                        avail ? (fits ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
                              : 'text-red-500 dark:text-red-400'
                      }`}>
                        {tableBusy ? '⏳' : avail ? (fits ? '✓ Available' : 'Too small') : 'Occupied'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <button type="button"
              onClick={async () => { await handleAction(seatingEntry.id, 'arrive'); setSeatingEntry(null) }}
              disabled={tableBusy}
              className="w-full px-4 py-2 text-sm font-medium border border-amber-300 dark:border-amber-700 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 transition-colors disabled:opacity-50 mb-2">
              Mark Arrived (No Table)
            </button>
            <button type="button" onClick={() => setSeatingEntry(null)} disabled={tableBusy}
              className="w-full px-4 py-2 text-sm font-medium border border-stone-200 dark:border-slate-600 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Move Party Modal */}
      {moveFromTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !moveBusy) setMoveFromTable(null) }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">↔ Move Party from {moveFromTable.label}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select an available table to move them to</p>
            {tables.filter(t => t.status === 'available').length === 0 ? (
              <p className="text-sm text-center text-slate-400 dark:text-slate-500 py-4 mb-4">No available tables right now</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {tables.filter(t => t.status === 'available').map(t => (
                  <button key={t.id} type="button" disabled={moveBusy}
                    onClick={() => handleMoveTable(String(t.id))}
                    className="p-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300 disabled:opacity-50 transition-colors text-center">
                    <div className="font-bold text-sm">{t.label}</div>
                    <div className="text-[10px] opacity-70">{t.seats}p</div>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setMoveFromTable(null)} disabled={moveBusy}
              className="w-full px-4 py-2 text-sm font-medium border border-stone-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cut In Line Modal */}
      {cutInTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !cutInBusy) { setCutInTable(null); setCutInName('') } }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">⚡ Quick Seat — {cutInTable.label}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{cutInTable.seats} seats · Seat someone without a waitlist entry</p>
            <input
              type="text"
              value={cutInName}
              onChange={e => setCutInName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCutIn()}
              placeholder="Guest name (optional — defaults to Walk-in)"
              className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4"
            />
            {cutInError && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3 px-1">⚠️ {cutInError}</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCutInTable(null); setCutInName(''); setCutInError(null) }} disabled={cutInBusy}
                className="flex-1 px-4 py-2 text-sm font-medium border border-stone-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleCutIn} disabled={cutInBusy}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
                {cutInBusy ? '⏳ Seating...' : '⚡ Mark Occupied'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}