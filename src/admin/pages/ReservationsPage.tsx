// ReservationsPage.tsx -- Daily reservations list + visual floor map
// v2.5 | 09/22/2026 11:10 PM PDT -- Floor ⚡ Quick Seat + ↔ Move Party: handlers + modals + onQuickSeat/onMoveParty props to FloorMapView
// v2.4 | 09/22/2026 10:49 PM PDT -- Floor view: fetch /admin/tables/availability for walk-in occupancy; pass walkinOccupancy to FloorMapView
// v2.3 | 09/20/2026 7:45 PM PDT -- Fix: optimistic tile color update on seat (table_id + pre-await setRows)
// v2.2 | 09/20/2026 7:28 PM PDT -- Seat Reservation flow: Auto Seat + Choose Table seating mode
// v2.1 | 09/20/2026 6:45 PM PDT -- Add Floor view toggle + FloorMapView integration; layout saved to /admin/config
// v2.0 | 09/20/2026 2:49 AM PDT -- Full rebuild: D1 table_reservations, date nav, stats bar, status actions

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Users, Calendar, TableProperties, LayoutGrid, List } from 'lucide-react'
import { makeHeaders } from '../adminShared'
import type { AdminPageProps } from '../adminShared'
import FloorMapView from './FloorMapView'

// ─── Types ────────────────────────────────────────────────────────────────────
type RStatus = 'reserved' | 'seated' | 'done' | 'no-show' | 'cancelled'

interface Res {
  id: number
  ghl_appointment_id: string
  table_id: number
  table_label: string
  contact_name: string
  party_size: number
  date: string
  start_time: string
  end_time: string
  status: RStatus
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS: Record<RStatus, { label: string; pill: string }> = {
  reserved:  { label: 'Reserved',  pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  seated:    { label: 'Seated',    pill: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  done:      { label: 'Done',      pill: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  'no-show': { label: 'No Show',   pill: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  cancelled: { label: 'Cancelled', pill: 'bg-gray-100 text-gray-400 dark:bg-gray-800/60 dark:text-gray-500' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLA(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
}

function shiftDate(d: string, days: number): string {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().slice(0, 10)
}

function labelDate(d: string): string {
  const today = todayLA()
  if (d === today)              return 'Today'
  if (d === shiftDate(today, 1)) return 'Tomorrow'
  if (d === shiftDate(today,-1)) return 'Yesterday'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles',
    })
  } catch { return iso }
}

// ─── Action Buttons — Seating Flow ──────────────────────────────────────────
function ActionBtns({ r, busy, autoSeating, seatExpanded, onStatus,
  onAutoSeat, onChooseTable, onToggleSeatExpand, isDark }: {
  r: Res; busy: boolean; autoSeating: boolean; seatExpanded: boolean
  onStatus:           (id: number, status: RStatus) => void
  onAutoSeat:         (id: number) => void
  onChooseTable:      (r: Res) => void
  onToggleSeatExpand: (id: number) => void
  isDark: boolean
}) {
  if (busy || autoSeating) return <Loader2 className="w-4 h-4 animate-spin text-sky-500" />

  const dim   = 'text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors opacity-50 hover:opacity-80'
  const ghost = isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700/40' : 'border-gray-300 text-gray-500 hover:bg-gray-100'
  const seat  = 'text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-colors border-green-400 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'

  if (r.status === 'reserved') {
    if (!seatExpanded) return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => onToggleSeatExpand(r.id)} className={seat}>
          Seat Reservation &#x2228;
        </button>
        <button type="button" onClick={() => onStatus(r.id, 'no-show')}
          className={`${dim} border-red-300 text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20`}>
          No Show
        </button>
        <button type="button" onClick={() => onStatus(r.id, 'cancelled')} className={`${dim} ${ghost}`}>
          Cancel
        </button>
      </div>
    )
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button type="button" onClick={() => onAutoSeat(r.id)} className={seat}>
            &#10003; Auto Seat
          </button>
          <button type="button" onClick={() => onChooseTable(r)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-colors ${
              isDark ? 'border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                     : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}>
            &#x229E; Choose Table
          </button>
          <button type="button" onClick={() => onToggleSeatExpand(r.id)}
            className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${ghost}`}>
            &#x00D7;
          </button>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onStatus(r.id, 'no-show')}
            className={`${dim} border-red-300 text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20`}>
            No Show
          </button>
          <button type="button" onClick={() => onStatus(r.id, 'cancelled')} className={`${dim} ${ghost}`}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (r.status === 'seated') return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => onStatus(r.id, 'done')}
        className="text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50 transition-colors">
        &#10003; Table Done
      </button>
      <button type="button" onClick={() => onStatus(r.id, 'no-show')}
        className={`${dim} border-red-300 text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20`}>
        No Show
      </button>
    </div>
  )

  return <span className="text-[10px] text-gray-300 dark:text-gray-600">&mdash;</span>
}

export default function ReservationsPage({ isDark, config, t }: AdminPageProps) {
  const [view,         setView]         = useState<'list'|'floor'>('list')
  const [date,         setDate]          = useState(todayLA)
  const [rows,         setRows]          = useState<Res[]>([])
  const [loading,      setLoading]       = useState(true)
  const [busy,         setBusy]          = useState<Record<number, boolean>>({})
  const [spin,         setSpin]          = useState(false)
  // Floor view
  const [tables,       setTables]        = useState<any[]>([])
  const [tableLayout,  setTableLayout]   = useState<Record<string,{x:number,y:number}>>({})
  const [floorLoaded,      setFloorLoaded]      = useState(false)
  const [walkinOccupancy, setWalkinOccupancy] = useState<Record<string,{name:string;partySize:number}>>({})
  // Seating flow
  const [seatExpanded,     setSeatExpanded]     = useState<Record<number,boolean>>({})
  const [autoSeating,      setAutoSeating]      = useState<Record<number,boolean>>({})
  const [choosingTableFor,    setChoosingTableFor]    = useState<{id:number;name:string;partySize:number}|null>(null)
  // Floor Quick Seat + Move Party
  const [floorQSTable,  setFloorQSTable]  = useState<{id:number;label:string}|null>(null)
  const [floorQSName,   setFloorQSName]   = useState('')
  const [floorQSBusy,   setFloorQSBusy]   = useState(false)
  const [floorMPTable,  setFloorMPTable]  = useState<{id:number;label:string}|null>(null)
  const [floorMPBusy,   setFloorMPBusy]   = useState(false)

  const load = useCallback(async (showSpin = false) => {
    if (showSpin) setSpin(true); else setLoading(true)
    try {
      const res  = await fetch(`${config.workerUrl}/admin/table-reservations?date=${date}`, {
        headers: makeHeaders(config),
      })
      const data = res.ok ? await res.json() : { reservations: [] }
      setRows((data.reservations ?? []).sort((a: Res, b: Res) => a.start_time.localeCompare(b.start_time)))
    } catch { setRows([]) }
    finally { setLoading(false); setSpin(false) }
  }, [date, config.workerUrl, config.locationId])

  useEffect(() => { load() }, [load])

  // Load tables + saved layout when switching to floor view
  useEffect(() => {
    if (view !== 'floor' || floorLoaded) return
    const h = makeHeaders(config)
    Promise.all([
      fetch(`${config.workerUrl}/admin/tables`, { headers: h }).then(r => r.ok ? r.json() : { tables: [] }),
      fetch(`${config.workerUrl}/admin/config`, { headers: h }).then(r => r.ok ? r.json() : { config: {} }),
      fetch(`${config.workerUrl}/admin/tables/availability`, { headers: h }).then(r => r.ok ? r.json() : { tables: [] }),
    ]).then(([tblData, cfgData, availData]) => {
      setTables(tblData.tables || [])
      setTableLayout(cfgData.config?.tableLayout || {})
      const occ: Record<string,{name:string;partySize:number}> = {}
      for (const t of (availData.tables || [])) {
        if (t.status === 'occupied' && t.occupant) occ[String(t.id)] = { name: t.occupant.name, partySize: t.occupant.partySize }
      }
      setWalkinOccupancy(occ)
      setFloorLoaded(true)
    }).catch(() => setFloorLoaded(true))
  }, [view, floorLoaded, config.workerUrl, config.locationId])

  async function handleSaveLayout(layout: Record<string,{x:number,y:number}>) {
    setTableLayout(layout)
    await fetch(`${config.workerUrl}/admin/config`, {
      method: 'PATCH',
      headers: { ...makeHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: config.locationId, config: { tableLayout: layout } }),
    }).catch(() => null)
  }

  async function refreshWalkinOccupancy() {
    const data = await fetch(`${config.workerUrl}/admin/tables/availability`, { headers: makeHeaders(config) })
      .then(r => r.ok ? r.json() : { tables: [] }).catch(() => ({ tables: [] }))
    const occ: Record<string,{name:string;partySize:number}> = {}
    for (const t of (data.tables || [])) {
      if (t.status === 'occupied' && t.occupant) occ[String(t.id)] = { name: t.occupant.name, partySize: t.occupant.partySize }
    }
    setWalkinOccupancy(occ)
  }

  async function handleFloorQuickSeat() {
    if (!floorQSTable || floorQSBusy) return
    setFloorQSBusy(true)
    try {
      const r = await fetch(`${config.workerUrl}/waitlist`, {
        method: 'PUT',
        headers: { ...makeHeaders(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manual-seat', tableId: String(floorQSTable.id), name: floorQSName.trim() || 'Walk-in' }),
      })
      if (r.ok) { setFloorQSTable(null); setFloorQSName(''); await refreshWalkinOccupancy() }
    } catch {} finally { setFloorQSBusy(false) }
  }

  async function handleFloorMoveParty(toTableId: string) {
    if (!floorMPTable || floorMPBusy) return
    setFloorMPBusy(true)
    try {
      const r = await fetch(`${config.workerUrl}/waitlist`, {
        method: 'PUT',
        headers: { ...makeHeaders(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move-table', fromTableId: String(floorMPTable.id), toTableId }),
      })
      if (r.ok) { setFloorMPTable(null); await refreshWalkinOccupancy() }
    } catch {} finally { setFloorMPBusy(false) }
  }

  async function handleAutoSeat(id: number) {
    setAutoSeating(p => ({ ...p, [id]: true }))
    setSeatExpanded(p => ({ ...p, [id]: false }))
    const r = await fetch(`${config.workerUrl}/admin/table-reservations/${id}/auto-seat`, {
      method: 'POST', headers: makeHeaders(config),
    }).catch(() => null)
    if (r?.ok) {
      const d = await r.json()
      // Update table_id so floor tile changes color immediately
      setRows(prev => prev.map(row => row.id === id
        ? { ...row, status: 'seated' as RStatus, table_id: d.tableId || row.table_id, table_label: d.tableLabel || row.table_label }
        : row))
    }
    setAutoSeating(p => ({ ...p, [id]: false }))
  }

  async function handleSeatAtTable(resId: number, tableId: number, tableLabel: string) {
    setChoosingTableFor(null)
    // Optimistic: update tile color immediately before API responds
    setRows(prev => prev.map(row => row.id === resId
      ? { ...row, status: 'seated' as RStatus, table_id: tableId, table_label: tableLabel }
      : row))
    setBusy(p => ({ ...p, [resId]: true }))
    await fetch(`${config.workerUrl}/admin/table-reservations/${resId}/seat-at`, {
      method: 'POST',
      headers: { ...makeHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId }),
    }).catch(() => null)
    setBusy(p => ({ ...p, [resId]: false }))
  }

  async function onStatus(id: number, status: RStatus) {
    setBusy(p => ({ ...p, [id]: true }))
    await fetch(`${config.workerUrl}/admin/table-reservations/${id}/status`, {
      method: 'PATCH',
      headers: { ...makeHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setBusy(p => ({ ...p, [id]: false }))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const active  = rows.filter(r => r.status !== 'cancelled')
  const covers  = active.reduce((s, r) => s + (r.party_size || 0), 0)
  const nSeated = rows.filter(r => r.status === 'seated').length
  const nNoShow = rows.filter(r => r.status === 'no-show').length
  const isToday = date === todayLA()

  // ── Theme tokens (t may be undefined for older callers) ──────────────────
  const C = {
    card:    t?.cardBg   ?? (isDark ? 'bg-gray-900' : 'bg-white'),
    bdr:     t?.cardBdr  ?? (isDark ? 'border-gray-700/60' : 'border-gray-200'),
    title:   t?.title    ?? (isDark ? 'text-gray-100' : 'text-gray-900'),
    muted:   t?.muted    ?? (isDark ? 'text-gray-500' : 'text-gray-400'),
    body:    t?.body     ?? (isDark ? 'text-gray-300' : 'text-gray-700'),
    border:  t?.border   ?? (isDark ? 'border-gray-700/50' : 'border-gray-200'),
    row:     t?.dragBg   ?? (isDark ? 'bg-gray-800/50' : 'bg-gray-50/60'),
    inp:     t?.input    ?? (isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'),
    hd:      t?.previewHd  ?? (isDark ? 'bg-gray-800/80' : 'bg-gray-50'),
    hdLbl:   t?.previewLbl ?? (isDark ? 'text-gray-400' : 'text-gray-500'),
  }

  // ── Nav button shared styles ───────────────────────────────────────────────
  const navBtn = `w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${C.bdr} ${C.body} hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-40`

  return (
    <div className="space-y-5">

      {/* ── View toggle + Date Nav ──────────────────────────────────────── */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-2xl border ${C.bdr} ${C.card}`}>
        <div className="flex items-center gap-2">
          <button className={navBtn} onClick={() => setDate(d => shiftDate(d, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[150px]">
            <p className={`font-bold text-base leading-tight ${C.title}`}>{labelDate(date)}</p>
            <p className={`text-xs ${C.muted}`}>{date}</p>
          </div>
          <button className={navBtn} onClick={() => setDate(d => shiftDate(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={() => setDate(todayLA())}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isDark ? 'bg-blue-900/30 border-blue-700/50 text-blue-300 hover:bg-blue-800/40'
                       : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}>
              Today
            </button>
          )}
          {/* View toggle */}
          <div className={`flex rounded-lg border overflow-hidden ml-1 ${C.bdr}`}>
            {(['list','floor'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v
                    ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : isDark ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-white text-gray-500 hover:text-gray-700'
                }`}>
                {v === 'list' ? <><List className='w-3 h-3' /> List</> : <><LayoutGrid className='w-3 h-3' /> Floor</>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className={`text-xs rounded-lg border px-3 py-1.5 ${C.inp} outline-none focus:ring-1 focus:ring-sky-400`} />
          <button className={navBtn} onClick={() => load(true)} disabled={spin}>
            <RefreshCw className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Bookings', val: active.length,  Icon: Calendar,         cls: 'text-blue-500' },
          { label: 'Covers',   val: covers,          Icon: Users,            cls: 'text-sky-500' },
          { label: 'Seated',   val: nSeated,         Icon: TableProperties,  cls: 'text-green-500' },
          { label: 'No Shows', val: nNoShow,         Icon: null,             cls: 'text-red-400' },
        ] as const).map(({ label, val, Icon, cls }) => (
          <div key={label} className={`px-4 py-3 rounded-2xl border ${C.bdr} ${C.card} flex items-center gap-3`}>
            {Icon
              ? <Icon className={`w-5 h-5 flex-shrink-0 ${cls}`} />
              : <span className={`w-5 h-5 flex-shrink-0 text-center text-lg leading-5 font-bold ${cls}`}>&times;</span>
            }
            <div>
              <p className={`text-2xl font-bold leading-none ${C.title}`}>{val}</p>
              <p className={`text-[10px] font-semibold mt-0.5 uppercase tracking-wide ${C.muted}`}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Reservations ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${C.bdr} overflow-hidden`}>

        {/* Header */}
        <div className={`px-5 py-3.5 border-b ${C.border} ${C.hd} flex items-center justify-between`}>
          <h3 className={`font-semibold text-sm ${C.title}`}>
            {rows.length} {rows.length === 1 ? 'Reservation' : 'Reservations'}
          </h3>
          {spin && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
        </div>

        {/* Loading */}
        {loading ? (
          <div className={`flex justify-center py-14 ${C.card}`}>
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>

        /* Empty */
        ) : rows.length === 0 ? (
          <div className={`py-14 text-center ${C.card}`}>
            <Calendar className={`w-8 h-8 mx-auto mb-3 ${C.muted}`} />
            <p className={`text-sm font-semibold ${C.title}`}>No reservations</p>
            <p className={`text-xs mt-1 ${C.muted}`}>Nothing scheduled for {labelDate(date).toLowerCase()}</p>
          </div>

        ) : (<>

          {/* Desktop table */}
          <div className={`hidden sm:block ${C.card}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={C.hd}>
                  {['Time','Guest','Party','Table','Status','Actions'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[10px] ${C.hdLbl} border-b ${C.border}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={`border-b ${C.border} last:border-b-0 hover:bg-sky-50/20 dark:hover:bg-sky-900/10 transition-colors`}>

                    {/* Time */}
                    <td className={`px-4 py-3.5 font-mono text-xs font-semibold ${C.title} whitespace-nowrap`}>
                      {fmtTime(r.start_time)}
                    </td>

                    {/* Guest */}
                    <td className={`px-4 py-3.5 font-semibold ${C.title}`}>
                      {r.contact_name || <span className={C.muted}>—</span>}
                    </td>

                    {/* Party size */}
                    <td className={`px-4 py-3.5 ${C.body}`}>
                      {r.party_size
                        ? <span className="flex items-center gap-1"><Users className="w-3 h-3 inline-block opacity-60" />{r.party_size}</span>
                        : <span className={C.muted}>—</span>
                      }
                    </td>

                    {/* Table */}
                    <td className="px-4 py-3.5">
                      {r.table_label
                        ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            {r.table_label}
                          </span>
                        : <span className={C.muted}>—</span>
                      }
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS[r.status]?.pill ?? ''}`}>
                        {STATUS[r.status]?.label ?? r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <ActionBtns r={r} busy={!!busy[r.id]}
                        autoSeating={!!autoSeating[r.id]}
                        seatExpanded={!!seatExpanded[r.id]}
                        onStatus={onStatus} onAutoSeat={handleAutoSeat}
                        onChooseTable={res => {
                          setSeatExpanded(p=>({...p,[res.id]:false}))
                          setChoosingTableFor({id:res.id,name:res.contact_name||'Guest',partySize:res.party_size||2})
                          setView('floor')
                        }}
                        onToggleSeatExpand={id=>setSeatExpanded(p=>({...p,[id]:!p[id]}))}
                        isDark={isDark} />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={`sm:hidden divide-y ${C.border} ${C.card}`}>
            {rows.map(r => (
              <div key={r.id} className={`p-4 space-y-2.5 ${C.row}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-bold text-sm ${C.title}`}>{r.contact_name || '—'}</p>
                    <p className={`text-xs ${C.muted} mt-0.5`}>
                      {fmtTime(r.start_time)}
                      {r.party_size ? ` · ${r.party_size} guests` : ''}
                      {r.table_label ? ` · Table ${r.table_label}` : ''}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${STATUS[r.status]?.pill ?? ''}`}>
                    {STATUS[r.status]?.label ?? r.status}
                  </span>
                </div>
                <ActionBtns r={r} busy={!!busy[r.id]}
                        autoSeating={!!autoSeating[r.id]}
                        seatExpanded={!!seatExpanded[r.id]}
                        onStatus={onStatus} onAutoSeat={handleAutoSeat}
                        onChooseTable={res => {
                          setSeatExpanded(p=>({...p,[res.id]:false}))
                          setChoosingTableFor({id:res.id,name:res.contact_name||'Guest',partySize:res.party_size||2})
                          setView('floor')
                        }}
                        onToggleSeatExpand={id=>setSeatExpanded(p=>({...p,[id]:!p[id]}))}
                        isDark={isDark} />
              </div>
            ))}
          </div>

        </>)}
      </div>

      {/* ── Floor Map ─────────────────────────────────────────────────────── */}
      {view === 'floor' && (
        <div className={`rounded-2xl border ${C.bdr} p-5 ${C.card}`}>
          {!floorLoaded ? (
            <div className='flex justify-center py-14'><Loader2 className='w-6 h-6 animate-spin text-sky-500' /></div>
          ) : (
            <FloorMapView
              tables={tables}
              reservations={rows as any}
              savedLayout={tableLayout}
              onSaveLayout={handleSaveLayout}
              onStatusUpdate={onStatus}
              busyIds={busy}
              isDark={isDark}
              choosingRes={choosingTableFor}
              onSeatAtTable={handleSeatAtTable}
              walkinOccupancy={walkinOccupancy}
              onQuickSeat={(tableId, tableLabel) => { setFloorQSTable({id:tableId,label:tableLabel}); setFloorQSName('') }}
              onMoveParty={(tableId, tableLabel) => setFloorMPTable({id:tableId,label:tableLabel})}
            />
          )}
        </div>
      )}


      {/* Floor Quick Seat Modal */}
      {floorQSTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !floorQSBusy) { setFloorQSTable(null); setFloorQSName('') } }}>
          <div className={`rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>⚡ Quick Seat — {floorQSTable.label}</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Seat someone without a reservation</p>
            <input type="text" value={floorQSName} onChange={e => setFloorQSName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFloorQuickSeat()}
              placeholder="Guest name (optional)"
              className={`w-full px-3 py-2 text-sm border rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                isDark ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`} />
            <div className="flex gap-2">
              <button type="button" disabled={floorQSBusy}
                onClick={() => { setFloorQSTable(null); setFloorQSName('') }}
                className={`flex-1 px-4 py-2 text-sm font-medium border rounded-xl transition-colors disabled:opacity-50 ${
                  isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>Cancel</button>
              <button type="button" disabled={floorQSBusy} onClick={handleFloorQuickSeat}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
                {floorQSBusy ? '⏳' : '⚡ Mark Occupied'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floor Move Party Modal */}
      {floorMPTable && (() => {
        const takenByRes = new Set(rows.filter(r => r.status === 'reserved' || r.status === 'seated').map(r => String(r.table_id)))
        const available = tables.filter(t => t.active && !walkinOccupancy[String(t.id)] && !takenByRes.has(String(t.id)))
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget && !floorMPBusy) setFloorMPTable(null) }}>
            <div className={`rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>↔ Move Party from {floorMPTable.label}</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select an available table to move them to</p>
              {available.length === 0 ? (
                <p className={`text-sm text-center py-4 mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No available tables right now</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {available.map((t: any) => (
                    <button key={t.id} type="button" disabled={floorMPBusy}
                      onClick={() => handleFloorMoveParty(String(t.id))}
                      className="p-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300 disabled:opacity-50 transition-colors text-center">
                      <div className="font-bold text-sm">{t.label}</div>
                      <div className="text-[10px] opacity-70">{t.seats}p</div>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setFloorMPTable(null)} disabled={floorMPBusy}
                className={`w-full px-4 py-2 text-sm font-medium border rounded-xl transition-colors disabled:opacity-50 ${
                  isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>Cancel</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}