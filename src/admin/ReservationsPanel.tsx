// ReservationsPanel.tsx -- PackedHouseHQ Restaurant Reservations
// v2.0 | 09/09/2026 -- Full port from v1.2: shadcn removed, date-fns removed,
//   multi-tenant (PANEL_CONFIG), auth headers on all calls, dark mode via isDark prop.
//   GHL calendar-based: reads appointments from GHL calendars, tags contacts for workflows.

import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, CalendarDays, List, Utensils, CheckCircle, XCircle,
  AlertTriangle, Users, Phone, FileText, ChevronLeft, ChevronRight,
  Cake, Loader2,
} from 'lucide-react'

// ── Config ─────────────────────────────────────────────────────────────────
export interface ResPanelConfig {
  workerUrl  : string
  locationId : string
  contextKey : string
  calendars  : {
    small  : { id: string; label: string }
    medium : { id: string; label: string }
    large  : { id: string; label: string }
    party  : { id: string; label: string }
  }
}

interface Props { config: ResPanelConfig; isDark: boolean }

const DINER_ARRIVED  = 'Diner Arrived'
const NO_SHOW_TAG    = 'no-show'
const CANCELLED_TAG  = 'Reservation Cancelled'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_SHORT   = ['S','M','T','W','T','F','S']
const DAY_LONG    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Types ───────────────────────────────────────────────────────────────────
interface ApptSummary {
  id: string; calendarId: string; tier: string
  appointmentStatus: string; startTime: string; endTime: string
}
interface ApptDetail extends ApptSummary {
  contactId: string; notes: string
  contact: { firstName: string; lastName: string; phone: string; email: string; dateOfBirth?: string; partySize?: string; tags: string[] }
}
type PendingAction = { apptId: string; action: 'noshow' | 'cancel' | 'arrived-offday' } | null

// ── Helpers ─────────────────────────────────────────────────────────────────
function lockedKey() {
  return `pt_locked_${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })}`
}
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86_400_000) }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
}
function fmtLongDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtMonthDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
}
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return raw
}
function isBirthdayOn(dob: string | undefined, date: Date) {
  if (!dob) return false
  const [, mm, dd] = dob.split('-').map(Number)
  return mm === date.getMonth() + 1 && dd === date.getDate()
}
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

// ── Component ───────────────────────────────────────────────────────────────
export default function ReservationsPanel({ config, isDark }: Props) {
  const { workerUrl, locationId, contextKey, calendars } = config
  const today = new Date()

  const authHeaders = () => ({
    'Content-Type'   : 'application/json',
    'X-Context-Key'  : contextKey,
    'X-Location-Id'  : locationId,
  })

  function getCalendarTier(calId: string) {
    return Object.entries(calendars).find(([, c]) => c.id === calId)?.[0] || 'small'
  }
  const calStyles: Record<string, { color: string; border: string }> = {
    small  : { color: isDark ? 'bg-sky-900/40 text-sky-300'    : 'bg-sky-100 text-sky-800',    border: 'border-l-sky-400'    },
    medium : { color: isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-800', border: 'border-l-indigo-400' },
    large  : { color: isDark ? 'bg-amber-900/40 text-amber-300'  : 'bg-amber-100 text-amber-800',  border: 'border-l-amber-400'  },
    party  : { color: isDark ? 'bg-rose-900/40 text-rose-300'   : 'bg-rose-100 text-rose-800',   border: 'border-l-rose-400'   },
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode,       setViewMode]       = useState<'calendar' | 'list'>('calendar')
  const [viewYear,       setViewYear]       = useState(today.getFullYear())
  const [viewMonth,      setViewMonth]      = useState(today.getMonth())
  const [selectedDate,   setSelectedDate]   = useState<Date>(today)
  const [monthSummaries, setMonthSummaries] = useState<ApptSummary[]>([])
  const [dayDetails,     setDayDetails]     = useState<ApptDetail[]>([])
  const [loadingMonth,   setLoadingMonth]   = useState(false)
  const [loadingDay,     setLoadingDay]     = useState(false)
  const [actionLoading,  setActionLoading]  = useState<Record<string, string>>({})
  const [feedback,       setFeedback]       = useState<Record<string, string>>({})
  const [pendingAction,  setPendingAction]  = useState<PendingAction>(null)
  const [now,            setNow]            = useState(new Date())
  const [lockedIds,      setLockedIds]      = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(lockedKey()); return s ? new Set(JSON.parse(s)) : new Set() }
    catch { return new Set() }
  })

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  // ── API ────────────────────────────────────────────────────────────────────
  async function fetchMonthList(calendarId: string, year: number, month: number): Promise<ApptSummary[]> {
    const start = new Date(year, month, 1, 0, 0, 0).getTime()
    const end   = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    try {
      const res = await fetch(
        `${workerUrl}/appointments/?calendarId=${calendarId}&locationId=${locationId}&startDate=${start}&endDate=${end}`,
        { headers: authHeaders() }
      )
      if (!res.ok) return []
      const data = await res.json()
      return (data.appointments || []).map((a: any) => {
        const calId = a.calendarServiceId || calendarId
        return {
          id: a.id, calendarId: calId, tier: getCalendarTier(calId),
          appointmentStatus: (a.appointmentStatus || a.appoinmentStatus || a.status || 'confirmed').toLowerCase(),
          startTime: a.startTime, endTime: a.endTime,
        }
      })
    } catch { return [] }
  }

  async function fetchDayList(calendarId: string, date: Date): Promise<ApptSummary[]> {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime()
    const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime()
    try {
      const res = await fetch(
        `${workerUrl}/appointments/?calendarId=${calendarId}&locationId=${locationId}&startDate=${start}&endDate=${end}`,
        { headers: authHeaders() }
      )
      if (!res.ok) return []
      const data = await res.json()
      return (data.appointments || []).map((a: any) => {
        const calId = a.calendarServiceId || calendarId
        return {
          id: a.id, calendarId: calId, tier: getCalendarTier(calId),
          appointmentStatus: (a.appointmentStatus || a.appoinmentStatus || a.status || 'confirmed').toLowerCase(),
          startTime: a.startTime, endTime: a.endTime,
        }
      })
    } catch { return [] }
  }

  async function fetchApptDetail(id: string): Promise<ApptDetail | null> {
    try {
      const res = await fetch(`${workerUrl}/appointments/${id}`, { headers: authHeaders() })
      if (!res.ok) return null
      const a = await res.json()
      const f = a.appointmentMeta?.defaultFormDetails || {}
      const tier = getCalendarTier(a.calendarId)
      let partySize = ''
      try {
        const cRes = await fetch(`${workerUrl}/contacts/${a.contactId}`, { headers: authHeaders() })
        if (cRes.ok) {
          const cData = await cRes.json()
          const pf = cData.contact?.customFields?.find((cf: any) => cf.fieldKey === 'contact.party_size' || cf.fieldKey === 'party_size')
          partySize = pf?.value || ''
        }
      } catch {}
      return {
        id: a.id, calendarId: a.calendarId, tier,
        appointmentStatus: (a.appointmentStatus || a.appoinmentStatus || 'confirmed').toLowerCase(),
        startTime: a.startTime, endTime: a.endTime,
        contactId: a.contactId || '', notes: a.notes || '',
        contact: {
          firstName: a.contact?.firstName || f.firstName || '',
          lastName:  a.contact?.lastName  || f.lastName  || '',
          phone:     a.contact?.phone     || f.phone     || '',
          email:     a.contact?.email     || f.email     || '',
          dateOfBirth: a.contact?.dateOfBirth,
          partySize, tags: a.contact?.tags || [],
        },
      }
    } catch { return null }
  }

  async function addTag(contactId: string, tag: string): Promise<boolean> {
    try {
      const res = await fetch(`${workerUrl}/contacts/${contactId}/tags/`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ tags: [tag] }),
      })
      return res.ok
    } catch { return false }
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadMonth = useCallback(async (year: number, month: number) => {
    setLoadingMonth(true)
    try {
      const results = await Promise.all(Object.values(calendars).map(c => fetchMonthList(c.id, year, month)))
      setMonthSummaries(results.flat())
    } finally { setLoadingMonth(false) }
  }, [workerUrl, locationId])

  const loadDay = useCallback(async (date: Date) => {
    setLoadingDay(true); setDayDetails([])
    try {
      const results = await Promise.all(Object.values(calendars).map(c => fetchDayList(c.id, date)))
      const all = results.flat().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      const details = await Promise.all(all.map(a => fetchApptDetail(a.id)))
      setDayDetails(details.filter(Boolean) as ApptDetail[])
    } finally { setLoadingDay(false) }
  }, [workerUrl, locationId])

  useEffect(() => { loadMonth(viewYear, viewMonth) }, [viewYear, viewMonth, loadMonth])
  useEffect(() => { if (viewMode === 'list') loadDay(selectedDate) }, [viewMode, selectedDate, loadDay])
  useEffect(() => {
    if (selectedDate.getMonth() !== viewMonth || selectedDate.getFullYear() !== viewYear) {
      setViewMonth(selectedDate.getMonth()); setViewYear(selectedDate.getFullYear())
    }
  }, [selectedDate])

  // ── Navigation ────────────────────────────────────────────────────────────
  function prevMonth() { viewMonth === 0 ? (setViewYear(y => y-1), setViewMonth(11)) : setViewMonth(m => m-1) }
  function nextMonth() { viewMonth === 11 ? (setViewYear(y => y+1), setViewMonth(0)) : setViewMonth(m => m+1) }
  function selectDay(day: number) {
    setSelectedDate(new Date(viewYear, viewMonth, day))
    setFeedback({}); setPendingAction(null); setViewMode('list')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function navigateDay(dir: number) {
    setSelectedDate(d => addDays(d, dir)); setFeedback({}); setPendingAction(null)
  }

  function lockAppt(id: string) {
    setLockedIds(prev => {
      const next = new Set(prev); next.add(id)
      try { localStorage.setItem(lockedKey(), JSON.stringify([...next])) } catch {}
      return next
    })
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleArrivedClick(appt: ApptDetail) {
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    if (todayStr !== dateKey(appt.startTime)) setPendingAction({ apptId: appt.id, action: 'arrived-offday' })
    else executeArrived(appt)
  }
  async function executeArrived(appt: ApptDetail) {
    setPendingAction(null); setActionLoading(p => ({ ...p, [appt.id]: 'arrived' }))
    try {
      const ok = await addTag(appt.contactId, DINER_ARRIVED)
      if (ok) { lockAppt(appt.id); setFeedback(p => ({ ...p, [appt.id]: 'Marked arrived. Review request will be sent shortly.' })) }
      else setFeedback(p => ({ ...p, [appt.id]: 'Action failed — please try again.' }))
    } finally { setActionLoading(p => ({ ...p, [appt.id]: '' })) }
  }
  async function handleNoShowConfirmed(appt: ApptDetail) {
    setPendingAction(null); setActionLoading(p => ({ ...p, [appt.id]: 'noshow' }))
    try {
      const ok = await addTag(appt.contactId, NO_SHOW_TAG)
      if (ok) { lockAppt(appt.id); setFeedback(p => ({ ...p, [appt.id]: 'Marked as no-show. Staff workflow triggered.' })) }
      else setFeedback(p => ({ ...p, [appt.id]: 'Action failed — please try again.' }))
    } finally { setActionLoading(p => ({ ...p, [appt.id]: '' })) }
  }
  async function handleCancelConfirmed(appt: ApptDetail) {
    setPendingAction(null); setActionLoading(p => ({ ...p, [appt.id]: 'cancel' }))
    try {
      const ok = await addTag(appt.contactId, CANCELLED_TAG)
      if (ok) { lockAppt(appt.id); setFeedback(p => ({ ...p, [appt.id]: 'Reservation cancelled. Guest notification sent.' })) }
      else setFeedback(p => ({ ...p, [appt.id]: 'Action failed — please try again.' }))
    } finally { setActionLoading(p => ({ ...p, [appt.id]: '' })) }
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const active = monthSummaries.filter(a => a.appointmentStatus !== 'cancelled')
  const countsByDate: Record<string, number> = {}
  active.forEach(a => { const k = dateKey(a.startTime); countsByDate[k] = (countsByDate[k] || 0) + 1 })
  const dayActive    = dayDetails.filter(r => !['cancelled','invalid'].includes(r.appointmentStatus))
  const dayArrived   = dayDetails.filter(r => r.appointmentStatus === 'showed')
  const dayNoShows   = dayDetails.filter(r => r.appointmentStatus === 'noshow')
  const dayCovers    = dayActive.reduce((s, r) => s + parseInt(r.contact.partySize || '0', 10), 0)
  const dayCancelled = dayDetails.filter(r => r.appointmentStatus === 'cancelled')
  const numDays  = daysInMonth(viewYear, viewMonth)
  const firstDay = firstDayOfMonth(viewYear, viewMonth)

  // ── Style helpers ─────────────────────────────────────────────────────────
  const card  = `rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-200'}`
  const muted = isDark ? 'text-slate-400' : 'text-slate-500'
  const title = isDark ? 'text-white' : 'text-slate-900'

  const statusMap: Record<string, { label: string; cls: string }> = {
    showed    : { label: 'Arrived',   cls: isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-800' },
    noshow    : { label: 'No Show',   cls: isDark ? 'bg-rose-900/40 text-rose-300'       : 'bg-rose-100 text-rose-800'       },
    cancelled : { label: 'Cancelled', cls: isDark ? 'bg-slate-700 text-slate-400'        : 'bg-slate-100 text-slate-500'     },
    confirmed : { label: 'Confirmed', cls: isDark ? 'bg-sky-900/40 text-sky-300'         : 'bg-sky-100 text-sky-800'         },
    booked    : { label: 'Confirmed', cls: isDark ? 'bg-sky-900/40 text-sky-300'         : 'bg-sky-100 text-sky-800'         },
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-stone-200'}`}>
          {(['calendar','list'] as const).map((mode, i) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 h-9 px-4 text-sm font-medium transition-colors ${i > 0 ? `border-l ${isDark ? 'border-slate-700' : 'border-stone-200'}` : ''} ${
                viewMode === mode
                  ? (isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-700')
                  : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-stone-50')
              }`}>
              {mode === 'calendar' ? <CalendarDays className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {mode === 'calendar' ? 'Calendar' : 'List'}
            </button>
          ))}
        </div>
        <button onClick={() => viewMode === 'calendar' ? loadMonth(viewYear, viewMonth) : loadDay(selectedDate)}
          disabled={loadingMonth || loadingDay}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-stone-200 text-slate-600 hover:bg-stone-50'}`}>
          <RefreshCw className={`w-4 h-4 ${(loadingMonth || loadingDay) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className={card}>
            <div className="p-4 md:p-6">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-slate-600'}`}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className={`font-bold text-lg ${title}`}>{MONTH_NAMES[viewMonth]} {viewYear}</h2>
                <button onClick={nextMonth} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-stone-100 text-slate-600'}`}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {loadingMonth ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {DAY_SHORT.map((s, i) => (
                      <div key={i} className={`text-center text-xs font-semibold py-1 ${muted}`}>
                        <span className="md:hidden">{s}</span>
                        <span className="hidden md:inline">{DAY_LONG[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`pad-${i}`} className="aspect-square md:min-h-16" />)}
                    {Array.from({ length: numDays }).map((_, i) => {
                      const day  = i + 1
                      const date = new Date(viewYear, viewMonth, day)
                      const key  = date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
                      const count   = countsByDate[key] || 0
                      const isToday = date.toDateString() === today.toDateString()
                      const isPast  = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                      return (
                        <button key={day} onClick={() => selectDay(day)}
                          className={`aspect-square md:min-h-16 rounded-xl border flex flex-col items-center justify-center md:items-start md:justify-start md:p-2 font-medium transition-all ${isPast && !isToday ? 'opacity-40' : ''} ${
                            isToday ? 'bg-sky-600 text-white border-sky-600 shadow-sm' :
                            count > 0 ? (isDark ? 'bg-sky-900/20 hover:bg-sky-900/40 text-white border-sky-800/40' : 'bg-sky-50 hover:bg-sky-100 text-slate-900 border-sky-200') :
                            (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700' : 'bg-white hover:bg-stone-50 text-slate-500 border-stone-200')
                          }`}>
                          <span className="text-sm md:text-base leading-none">{day}</span>
                          {count > 0 && (
                            <>
                              <span className={`md:hidden w-1.5 h-1.5 rounded-full mt-1 ${isToday ? 'bg-white/70' : 'bg-sky-500'}`} />
                              <span className={`hidden md:inline-flex items-center mt-1.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${isToday ? 'bg-white/20 text-white' : (isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700')}`}>
                                {count} {count === 1 ? 'booking' : 'bookings'}
                              </span>
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Monthly stats */}
          {!loadingMonth && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Days with Bookings', value: Object.keys(countsByDate).filter(k => countsByDate[k] > 0).length },
                { label: 'Total Bookings',     value: Object.values(countsByDate).reduce((a, b) => a + b, 0) },
                { label: 'Month',              value: MONTH_NAMES[viewMonth] },
              ].map(s => (
                <div key={s.label} className={`${card} p-3 md:p-4 text-center`}>
                  <p className="text-2xl font-bold text-sky-500">{s.value}</p>
                  <p className={`text-xs mt-0.5 ${muted}`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <p className={`text-center text-xs ${muted}`}>Tap any date to view that day's reservations.</p>
        </div>
      )}

      {/* ── LIST / DAY VIEW ── */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {/* Date navigation */}
          <div className={`${card} p-4 flex items-center justify-between`}>
            <button onClick={() => navigateDay(-1)}
              className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-stone-200 text-slate-600 hover:bg-stone-100'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className={`font-bold text-lg ${title}`}>{fmtLongDate(selectedDate)}</p>
              <p className={`text-xs ${muted}`}>{selectedDate.getFullYear()}</p>
            </div>
            <button onClick={() => navigateDay(1)}
              className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-stone-200 text-slate-600 hover:bg-stone-100'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Bookings', value: dayActive.length,   icon: <List className="w-4 h-4" />,          cls: 'text-sky-500'     },
              { label: 'Covers',   value: dayCovers || '--',  icon: <Users className="w-4 h-4" />,         cls: 'text-sky-500'     },
              { label: 'Arrived',  value: dayArrived.length,  icon: <CheckCircle className="w-4 h-4" />,   cls: 'text-emerald-500' },
              { label: 'No-Show',  value: dayNoShows.length,  icon: <AlertTriangle className="w-4 h-4" />, cls: 'text-rose-500'    },
            ].map(s => (
              <div key={s.label} className={`${card} p-3 text-center`}>
                <div className={`flex justify-center mb-1 ${s.cls}`}>{s.icon}</div>
                <p className={`text-xl md:text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className={`text-xs mt-0.5 ${muted}`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Reservation cards */}
          {loadingDay ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
          ) : dayDetails.length === 0 ? (
            <div className={`text-center py-16 space-y-3 ${muted}`}>
              <Utensils className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-medium">No reservations for this date.</p>
              <button onClick={() => setViewMode('calendar')} className="text-sky-500 text-sm hover:underline font-medium">Back to Calendar</button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayDetails.map(appt => {
                const calCfg      = calStyles[appt.tier] || calStyles.small
                const isLocked    = lockedIds.has(appt.id)
                const loading     = actionLoading[appt.id]
                const msg         = feedback[appt.id]
                const isPending   = pendingAction?.apptId === appt.id
                const pendingType = pendingAction?.action
                const isBirthday  = isBirthdayOn(appt.contact.dateOfBirth, selectedDate)
                const name        = `${appt.contact.firstName} ${appt.contact.lastName}`.trim()
                const noShowEnabled = now.getTime() >= new Date(appt.startTime).getTime() + 1000
                const canAct = !isLocked && !msg && !['cancelled','noshow','showed'].includes(appt.appointmentStatus)
                const sc = statusMap[appt.appointmentStatus] || statusMap.confirmed
                const borderCls = isDark
                  ? `bg-slate-800 border-slate-700 border-l-4 ${calCfg.border}`
                  : `bg-white border-stone-200 border-l-4 ${calCfg.border}`

                return (
                  <div key={appt.id} className={`rounded-2xl border transition-all ${borderCls} ${isBirthday ? 'ring-2 ring-amber-400' : ''} ${isLocked ? 'opacity-60' : ''}`}>
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Time + tier */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:min-w-[100px]">
                          <p className="font-bold text-sky-500 text-xl">{fmtTime(appt.startTime)}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${calCfg.color}`}>
                            {calendars[appt.tier as keyof typeof calendars]?.label || '1-2 Guests'}
                          </span>
                        </div>

                        {/* Guest info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-semibold text-base ${title}`}>{name || 'Unknown Guest'}</p>
                            {isBirthday && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                                <Cake className="w-3 h-3" /> Birthday!
                              </span>
                            )}
                            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>{sc.label}</span>
                          </div>

                          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${muted}`}>
                            {appt.contact.partySize && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Party of {appt.contact.partySize}</span>}
                            {appt.contact.phone && (
                              <a href={`tel:${appt.contact.phone}`} className={`flex items-center gap-1 hover:text-sky-500 transition-colors`}>
                                <Phone className="w-3.5 h-3.5" /> {formatPhone(appt.contact.phone)}
                              </a>
                            )}
                          </div>

                          {appt.notes && (
                            <div className={`flex items-start gap-1.5 text-sm rounded-xl px-2.5 py-2 ${isDark ? 'bg-slate-900/50' : 'bg-stone-50'}`}>
                              <FileText className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${muted}`} />
                              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{appt.notes}</span>
                            </div>
                          )}

                          {msg && (
                            <div className={`flex items-center gap-1.5 text-sm rounded-xl px-2.5 py-2 ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
                            </div>
                          )}

                          {/* Off-day arrived warning */}
                          {canAct && isPending && pendingType === 'arrived-offday' && (
                            <div className={`border rounded-xl p-3 ${isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                              <p className={`text-sm font-semibold flex items-center gap-1.5 mb-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                <AlertTriangle className="w-4 h-4" /> Different reservation date
                              </p>
                              <p className={`text-xs mb-3 ${isDark ? 'text-amber-500' : 'text-amber-700'}`}>
                                Today is <strong>{today.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</strong> but this reservation is on <strong>{fmtMonthDay(appt.startTime)}</strong>. Check in anyway?
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => executeArrived(appt)} disabled={!!loading}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                                  {loading === 'arrived' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, check in'}
                                </button>
                                <button onClick={() => setPendingAction(null)}
                                  className={`flex-1 border text-xs font-semibold py-2 rounded-lg transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800' : 'border-stone-200 text-slate-600 hover:bg-stone-50 bg-white'}`}>
                                  No, go back
                                </button>
                              </div>
                            </div>
                          )}

                          {/* No-show / cancel confirmation */}
                          {canAct && isPending && (pendingType === 'noshow' || pendingType === 'cancel') && (
                            <div className={`border rounded-xl p-3 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-stone-50 border-stone-200'}`}>
                              <p className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {pendingType === 'noshow' ? `Mark ${appt.contact.firstName} as a no-show?` : `Cancel ${appt.contact.firstName}'s reservation?`}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => pendingType === 'noshow' ? handleNoShowConfirmed(appt) : handleCancelConfirmed(appt)}
                                  disabled={!!loading}
                                  className={`flex-1 text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center ${pendingType === 'noshow' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-600 hover:bg-slate-700'}`}>
                                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, confirm'}
                                </button>
                                <button onClick={() => setPendingAction(null)}
                                  className={`flex-1 border text-xs font-semibold py-2 rounded-lg transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800' : 'border-stone-200 text-slate-600 hover:bg-stone-50 bg-white'}`}>
                                  Go back
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          {canAct && !isPending && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button onClick={() => handleArrivedClick(appt)} disabled={!!loading}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-3 rounded-lg transition-colors disabled:opacity-50">
                                {loading === 'arrived' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /> Arrived</>}
                              </button>
                              <div className="flex flex-col items-start gap-0.5">
                                <button
                                  onClick={() => setPendingAction({ apptId: appt.id, action: 'noshow' })}
                                  disabled={!!loading || !noShowEnabled}
                                  className={`flex items-center gap-1.5 text-xs font-semibold h-8 px-3 rounded-lg transition-colors ${noShowEnabled ? `border text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 ${isDark ? 'border-rose-800/60' : 'border-rose-300'}` : `border ${isDark ? 'border-slate-700 text-slate-500' : 'border-stone-200 text-slate-400'} cursor-not-allowed opacity-50`}`}>
                                  <AlertTriangle className="w-3 h-3" /> No Show
                                </button>
                                {!noShowEnabled && <span className={`text-xs px-1 ${muted}`}>After {fmtTime(appt.startTime)}</span>}
                              </div>
                              <button onClick={() => setPendingAction({ apptId: appt.id, action: 'cancel' })} disabled={!!loading}
                                className={`flex items-center gap-1.5 border text-xs font-semibold h-8 px-3 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700/50' : 'border-stone-200 text-slate-500 hover:bg-stone-50'}`}>
                                <XCircle className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {dayCancelled.length > 0 && (
                <p className={`text-center text-xs pt-1 ${muted}`}>{dayCancelled.length} cancelled reservation{dayCancelled.length > 1 ? 's' : ''} shown above in gray.</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-center pb-8">
            <button onClick={() => setViewMode('calendar')} className="flex items-center gap-1.5 text-sm text-sky-500 hover:underline font-medium">
              <CalendarDays className="w-4 h-4" /> Back to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
