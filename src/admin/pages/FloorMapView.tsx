// FloorMapView.tsx -- Visual restaurant floor plan: table tiles scaled by seats, drag-to-position, live status, booking popover
// v1.3 | 09/22/2026 11:10 PM PDT -- AVAIL→emerald; onQuickSeat/onMoveParty props; popover walk-in info + action pills
// v1.2 | 09/22/2026 10:49 PM PDT -- walkinOccupancy prop: show walk-in occupied tables in orange; dim in seating mode
// v1.1 | 09/20/2026 7:28 PM PDT -- Popover hierarchy fix (status badge + primary/secondary tiers); Seating Mode (choosingRes)
// v1.0 | 09/20/2026 6:45 PM PDT -- New component

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Move } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type RStatus = 'reserved' | 'seated' | 'done' | 'no-show' | 'cancelled'
export interface FMTable { id: number; label: string; seats: number; type: string; active: number }
export interface FMRes   {
  id: number; table_id: number; table_label: string
  contact_name: string; party_size: number
  start_time: string; status: RStatus
}
export interface Pos { x: number; y: number }  // percentage-based (0–100)

export interface FloorMapViewProps {
  tables:         FMTable[]
  reservations:   FMRes[]
  savedLayout:    Record<string, Pos>
  onSaveLayout:   (l: Record<string, Pos>) => void
  onStatusUpdate: (id: number, status: RStatus) => void
  busyIds:        Record<number, boolean>
  isDark:         boolean
  choosingRes?:      { id: number; name: string; partySize: number } | null
  onSeatAtTable?:    (resId: number, tableId: number, tableLabel: string) => void
  walkinOccupancy?:  Record<string, { name: string; partySize: number }>
  onQuickSeat?:      (tableId: number, tableLabel: string) => void
  onMoveParty?:      (tableId: number, tableLabel: string) => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const FLOOR_H   = 480   // px logical height
const LOGICAL_W = 800   // px logical width for auto-layout calc
const COLS      = 4     // columns in auto-grid

const STATUS_TILE: Record<RStatus, { border: string; bg: string; label_c: string; dot: string }> = {
  reserved:  { border:'border-blue-400 dark:border-blue-500',   bg:'bg-blue-50 dark:bg-blue-900/40',    label_c:'text-blue-700 dark:text-blue-300',   dot:'bg-blue-400' },
  seated:    { border:'border-green-500 dark:border-green-400', bg:'bg-green-100 dark:bg-green-900/40', label_c:'text-green-700 dark:text-green-300',  dot:'bg-green-500' },
  done:      { border:'border-gray-200 dark:border-gray-700',   bg:'bg-gray-50 dark:bg-gray-800/40',    label_c:'text-gray-400 dark:text-gray-500',   dot:'bg-gray-300' },
  'no-show': { border:'border-red-300 dark:border-red-700',     bg:'bg-red-50 dark:bg-red-900/20',      label_c:'text-red-500 dark:text-red-400',     dot:'bg-red-400' },
  cancelled: { border:'border-gray-200 dark:border-gray-700',   bg:'bg-gray-50/50 dark:bg-gray-800/20', label_c:'text-gray-300 dark:text-gray-600',   dot:'bg-gray-200' },
}
const AVAIL  = { border:'border-emerald-300 dark:border-emerald-700/60', bg:'bg-emerald-50 dark:bg-emerald-900/20', label_c:'text-emerald-700 dark:text-emerald-400', dot:'bg-emerald-400' }
const WALKIN = { border:'border-orange-400 dark:border-orange-500', bg:'bg-orange-50 dark:bg-orange-900/30', label_c:'text-orange-700 dark:text-orange-300', dot:'bg-orange-400' }

const TYPE_PILL: Record<string, string> = {
  indoor:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  patio:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bar:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  private: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const LEGEND: [string, typeof AVAIL][] = [
  ['Available', AVAIL],
  ['Walk-in',   WALKIN],
  ['Reserved',  STATUS_TILE.reserved],
  ['Seated',    STATUS_TILE.seated],
  ['No Show',   STATUS_TILE['no-show']],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tileSize(seats: number): number {
  return Math.min(116, 64 + seats * 8)
}

function autoLayout(tables: FMTable[]): Record<string, Pos> {
  const GAP_X = 16, GAP_Y = 20, PAD_X = 14, PAD_Y = 14
  const out: Record<string, Pos> = {}
  let x = PAD_X, y = PAD_Y, rowH = 0, col = 0
  for (const tbl of tables) {
    if (col >= COLS) { x = PAD_X; y += rowH + GAP_Y; rowH = 0; col = 0 }
    const sz = tileSize(tbl.seats)
    out[String(tbl.id)] = {
      x: Math.min(88, (x / LOGICAL_W) * 100),
      y: Math.min(82, (y / FLOOR_H) * 100),
    }
    x += sz + GAP_X
    rowH = Math.max(rowH, sz)
    col++
  }
  return out
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Los_Angeles'}) }
  catch { return iso }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FloorMapView({
  tables, reservations, savedLayout, onSaveLayout, onStatusUpdate, busyIds, isDark,
  choosingRes = null, onSeatAtTable,
  walkinOccupancy = {}, onQuickSeat, onMoveParty,
}: FloorMapViewProps) {
  const [editMode, setEditMode] = useState(false)
  const [popover,  setPopover]  = useState<number | null>(null)  // tableId

  // Merged layout: savedLayout positions + auto-generated defaults for missing tables
  const activeTables = useMemo(() => tables.filter(t => t.active), [tables])

  const defaultLayout = useMemo(() => autoLayout(activeTables), [activeTables])

  const [liveLayout, setLiveLayout] = useState<Record<string, Pos>>(() => ({
    ...defaultLayout,
    ...savedLayout,
  }))

  // Sync when saved layout arrives / changes
  useEffect(() => {
    setLiveLayout({ ...defaultLayout, ...savedLayout })
  }, [savedLayout, defaultLayout])

  // Keep a ref so onMouseUp always sees latest layout
  const liveLayoutRef = useRef(liveLayout)
  liveLayoutRef.current = liveLayout

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string
    startMX: number; startMY: number
    startX: number;  startY: number
  } | null>(null)

  // Close popover on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-popover]') && !(e.target as Element).closest('[data-tile]'))
        setPopover(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const onTileMouseDown = useCallback((e: React.MouseEvent, id: number, pos: Pos) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { id: String(id), startMX: e.clientX, startMY: e.clientY, startX: pos.x, startY: pos.y }
  }, [editMode])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current
    if (!d || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - d.startMX) / width)  * 100
    const dy = ((e.clientY - d.startMY) / height) * 100
    setLiveLayout(prev => ({
      ...prev,
      [d.id]: {
        x: Math.max(0, Math.min(88, d.startX + dx)),
        y: Math.max(0, Math.min(82, d.startY + dy)),
      },
    }))
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    onSaveLayout({ ...liveLayoutRef.current })
  }, [onSaveLayout])

  const onTileClick = useCallback((e: React.MouseEvent, id: number, tblLabel: string) => {
    e.stopPropagation()
    if (editMode) return
    // Seating mode: click assigns the reservation to this table (block walk-in tables)
    if (choosingRes && onSeatAtTable) {
      if (!walkinOccupancy[String(id)]) onSeatAtTable(choosingRes.id, id, tblLabel)
      return
    }
    setPopover(prev => prev === id ? null : id)
  }, [editMode, choosingRes, onSeatAtTable, walkinOccupancy])

  // ── Status legend types present ─────────────────────────────────────────────
  const typesPresent = useMemo(() =>
    (['indoor','patio','bar','private'] as const).filter(type => activeTables.some(t => t.type === type)),
  [activeTables])

  return (
    <div className="space-y-3">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {typesPresent.map(type => (
            <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_PILL[type] ?? ''}`}>
              {type}
            </span>
          ))}
        </div>
        {!choosingRes && <button
          type="button"
          onClick={() => { setEditMode(e => !e); setPopover(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            editMode
              ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400'
              : isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          {editMode ? 'Done Editing' : 'Edit Layout'}
        </button>}
      </div>

      {editMode && !choosingRes && (
        <p className={`text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          Drag tables to reposition — layout saves automatically on drop.
        </p>
      )}

      {/* Seating mode banner */}
      {choosingRes && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-green-400 ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <p className={`text-xs font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
            Seating <strong>{choosingRes.name}</strong> (party of {choosingRes.partySize}) — click an available table below
          </p>
        </div>
      )}

      {/* ── Floor canvas ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={() => setPopover(null)}
        className={`relative w-full rounded-2xl border-2 overflow-visible select-none transition-colors ${
          editMode
            ? isDark ? 'border-amber-600/50 bg-gray-900' : 'border-amber-400/50 bg-amber-50/30'
            : isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-slate-50'
        }`}
        style={{ height: FLOOR_H }}
      >
        {/* Dot-grid background */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.15] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="fmdots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill={isDark ? '#6b7280' : '#9ca3af'} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fmdots)" />
        </svg>

        {/* Floor label */}
        <span className={`absolute top-3 left-4 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
          DINING FLOOR
        </span>

        {/* Empty state */}
        {activeTables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No active tables — configure in Settings → Table Configuration</p>
          </div>
        )}

        {/* Table tiles */}
        {activeTables.map((tbl) => {
          const pos  = liveLayout[String(tbl.id)] ?? defaultLayout[String(tbl.id)] ?? { x: 2, y: 4 }
          const sz   = tileSize(tbl.seats)
          const res    = reservations.find(r => r.table_id === tbl.id && r.status !== 'done' && r.status !== 'cancelled')
          const walkin = !res ? (walkinOccupancy[String(tbl.id)] ?? null) : null
          const st     = res ? STATUS_TILE[res.status] : walkin ? WALKIN : AVAIL
          const busy = res ? !!busyIds[res.id] : false
          const sel  = popover === tbl.id

          return (
            <div
              key={tbl.id}
              data-tile="1"
              onMouseDown={e => onTileMouseDown(e, tbl.id, pos)}
              onClick={e => onTileClick(e, tbl.id, tbl.label)}
              className={`absolute flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75 ${
                // Seating mode: available tables glow green, occupied dim
                choosingRes
                  ? (res || walkin)
                    ? 'opacity-30 cursor-not-allowed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40'
                    : 'border-green-500 bg-green-50 dark:bg-green-900/30 cursor-pointer hover:scale-105 hover:shadow-lg ring-2 ring-green-400/50'
                  : `${st.bg} ${st.border} ${
                      editMode ? 'cursor-grab active:cursor-grabbing shadow-lg scale-105'
                               : res ? 'cursor-pointer hover:brightness-95 hover:shadow-md' : 'cursor-default'
                    }`
              } ${!choosingRes && sel ? 'ring-2 ring-sky-400 ring-offset-2 dark:ring-offset-gray-900 z-20' : 'z-10'}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: sz, height: sz }}
            >
              {busy
                ? <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                : (<>
                    {/* Status dot */}
                    {res && <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${st.dot}`} />}
                    <span className={`font-bold leading-none ${sz < 90 ? 'text-sm' : 'text-base'} ${st.label_c}`}>{tbl.label}</span>
                    <span className={`text-[9px] font-semibold opacity-70 ${st.label_c}`}>{tbl.seats}p</span>
                    {(res || walkin) && (
                      <span className={`text-[9px] font-medium mt-0.5 px-1 text-center leading-tight max-w-full truncate ${st.label_c}`}>
                        {res ? (res.contact_name?.split(' ')[0] ?? '') : (walkin?.name?.split(' ')[0] ?? 'Walk-in')}
                      </span>
                    )}
                  </>)
              }
            </div>
          )
        })}

        {/* Booking popover */}
        {popover !== null && (() => {
          const tbl = activeTables.find(t => t.id === popover)
          if (!tbl) return null
          const pos  = liveLayout[String(tbl.id)] ?? { x: 20, y: 20 }
          const sz   = tileSize(tbl.seats)
          const res  = reservations.find(r => r.table_id === tbl.id && r.status !== 'done' && r.status !== 'cancelled')
          const busy   = res ? !!busyIds[res.id] : false
          const walkin = !res ? (walkinOccupancy[String(tbl.id)] ?? null) : null
          // Position popover to the right of the tile; flip left if near right edge
          const pRight = pos.x > 62
          const popLeft = pRight
            ? `calc(${pos.x}% - 212px)`
            : `calc(${pos.x}% + ${sz + 8}px)`
          const popTop = `${Math.min(pos.y, 60)}%`
          const btnBase = 'text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-colors'

          return (
            <div
              data-popover="1"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              className={`absolute z-30 w-52 rounded-xl border shadow-2xl p-3 space-y-2.5 ${
                isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
              }`}
              style={{ left: popLeft, top: popTop }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">Table {tbl.label}</p>
                  <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {tbl.seats} seats · <span className="capitalize">{tbl.type}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setPopover(null)}
                  className={`text-xs opacity-50 hover:opacity-100 transition-opacity mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  &times;
                </button>
              </div>

              {/* Booking info */}
              {busy ? (
                <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-sky-500" /></div>
              ) : res ? (<>
                <div className={`text-xs space-y-1 pb-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className="font-semibold">{res.contact_name || '—'}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    {res.party_size} guests · {fmtTime(res.start_time)}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_TILE[res.status].bg} ${STATUS_TILE[res.status].label_c} ${STATUS_TILE[res.status].border} border`}>
                    {res.status === 'no-show' ? 'No Show' : res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                  </span>
                </div>
                {/* Primary action */}
              {res.status === 'reserved' && (
                <button
                  className={`w-full py-2 text-xs font-bold rounded-lg border-2 transition-colors border-green-400 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50`}
                  onClick={() => { onStatusUpdate(res.id, 'seated'); setPopover(null) }}>
                  Seat Party
                </button>
              )}
              {res.status === 'seated' && (
                <button
                  className={`w-full py-2 text-xs font-bold rounded-lg border-2 transition-colors border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50`}
                  onClick={() => { onStatusUpdate(res.id, 'done'); setPopover(null) }}>
                  ✓ Table Done
                </button>
              )}
              {/* Secondary actions */}
              <div className={`flex gap-1.5 pt-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                {(res.status === 'reserved' || res.status === 'seated') && (
                  <button className={`${btnBase} flex-1 opacity-60 hover:opacity-100 border-red-300 text-red-500 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20`}
                    onClick={() => { onStatusUpdate(res.id, 'no-show'); setPopover(null) }}>No Show</button>
                )}
                {res.status === 'reserved' && (
                  <button className={`${btnBase} flex-1 opacity-50 hover:opacity-80 ${isDark?'border-gray-600 text-gray-400 hover:bg-gray-700':'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => { onStatusUpdate(res.id, 'cancelled'); setPopover(null) }}>Cancel</button>
                )}
              </div>
              </>) : walkin ? (<>
                <div className={`text-xs space-y-1 pb-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className="font-semibold">{walkin.name}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Party of {walkin.partySize} · Walk-in</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
                    Walk-in
                  </span>
                </div>
                {onMoveParty && (
                  <button type="button" className="w-full py-2 text-xs font-bold rounded-lg border-2 transition-colors border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                    onClick={() => { onMoveParty(tbl.id, tbl.label); setPopover(null) }}>
                    ↔ Move Party
                  </button>
                )}
              </>) : (<>
                <p className={`text-xs italic pb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No active booking</p>
                {onQuickSeat && (
                  <button type="button" className="w-full py-2 text-xs font-bold rounded-lg border-2 transition-colors border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    onClick={() => { onQuickSeat(tbl.id, tbl.label); setPopover(null) }}>
                    ⚡ Quick Seat
                  </button>
                )}
              </>)}
            </div>
          )
        })()}
      </div>

      {/* ── Status legend ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        {LEGEND.map(([label, style]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded border-2 flex-shrink-0 ${style.bg} ${style.border}`} />
            <span className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
          </span>
        ))}
        <span className={`text-[10px] ml-auto ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
          {activeTables.length} tables · click to manage
        </span>
      </div>

    </div>
  )
}