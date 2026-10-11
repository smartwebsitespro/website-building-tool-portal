// v1.0 | 09/30/2026 8:05 PM PDT -- Init: Contacts Dashboard for Packed-House-Portal (AdminPageProps pattern)
import { useState, useEffect, useMemo } from 'react'
import {
  Search, Users, ChevronLeft, ChevronRight,
  Mail, Phone, Tag, X, Calendar, Loader2,
} from 'lucide-react'
import { type AdminPageProps, makeHeaders } from '../adminShared'

const PAGE_SIZE = 20

const TAG_COLORS: Record<string, string> = {
  'banquet-inquiry':     'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  'sms-optin-new':       'bg-green-500/15 text-green-400 border border-green-500/20',
  'sms-specials-active': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  'vip':                 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
}
const TAG_D = 'bg-slate-700/50 text-slate-400 border border-slate-600/40'
const TAG_L = 'bg-gray-100 text-gray-600 border border-gray-200'

function TagBadge({ tag, isDark }: { tag: string; isDark: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] ?? (isDark ? TAG_D : TAG_L)}`}>
      {tag}
    </span>
  )
}

export default function ContactsDashboard({ isDark, config }: AdminPageProps) {
  const [contacts, setContacts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [page, setPage]           = useState(0)
  const [selected, setSelected]   = useState<any>(null)

  useEffect(() => { setPage(0) }, [search, tagFilter])

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`${config.workerUrl}/admin/customers`, { headers: makeHeaders(config) })
      .then(r => { if (!r.ok) throw new Error('Fetch failed'); return r.json() })
      .then(d  => { setContacts(d.contacts ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load contacts.'); setLoading(false) })
  }, [config.locationId])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach(c => (c.tags || []).forEach((t: string) => s.add(t)))
    return Array.from(s).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return contacts.filter(c => {
      const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
      const matchSearch = !term || name.includes(term) || (c.email ?? '').toLowerCase().includes(term) || (c.phone ?? '').includes(term)
      const matchTag    = !tagFilter || (c.tags || []).includes(tagFilter)
      return matchSearch && matchTag
    })
  }, [contacts, search, tagFilter])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageContacts = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const fullName     = (c: any) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown'

  const card    = isDark ? 'bg-gray-900 border-gray-800'  : 'bg-white border-stone-200'
  const text    = isDark ? 'text-white'                    : 'text-slate-900'
  const muted   = isDark ? 'text-slate-400'                : 'text-slate-500'
  const divider = isDark ? 'border-gray-800'               : 'border-stone-100'
  const rowHov  = isDark ? 'hover:bg-white/5'              : 'hover:bg-purple-50/40'
  const rowAlt  = isDark ? 'bg-white/[0.02]'               : 'bg-gray-50/40'
  const head    = isDark ? 'bg-white/5'                    : 'bg-gray-50'
  const pgBtn   = isDark ? 'hover:bg-white/10'             : 'hover:bg-gray-100'

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  )
  if (error) return <div className="text-rose-400 p-6">{error}</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0c2340 0%,#1a3a5c 55%,#92278f 100%)' }}>
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Contacts Dashboard</h2>
              <p className="text-sm text-white/60">
                {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
                {tagFilter ? ` · "${tagFilter}"` : ''}
                {search     ? ` · "${search}"`     : ''}
              </p>
            </div>
          </div>
          <div className="md:ml-auto relative md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email or phone…"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 text-sm focus:outline-none focus:border-white/40" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="px-6 pb-4 flex gap-2 flex-wrap">
            <button onClick={() => setTagFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!tagFilter ? 'bg-white text-[#92278f] border-white' : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20'}`}>All</button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${tag === tagFilter ? 'bg-white text-[#92278f] border-white' : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20'}`}>{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${divider} ${head}`}>
                <th className={`text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide ${muted}`}>Name</th>
                <th className={`text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide ${muted}`}>Email</th>
                <th className={`text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide ${muted} hidden sm:table-cell`}>Phone</th>
                <th className={`text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide ${muted} hidden md:table-cell`}>Tags</th>
                <th className={`text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide ${muted} hidden lg:table-cell`}>Added</th>
              </tr>
            </thead>
            <tbody>
              {pageContacts.length === 0 ? (
                <tr><td colSpan={5} className={`text-center py-16 ${muted}`}>
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No contacts found</p>
                </td></tr>
              ) : pageContacts.map((c, i) => (
                <tr key={c.id} onClick={() => setSelected(c)}
                  className={`border-b ${divider} cursor-pointer transition-colors ${rowHov} ${i % 2 !== 0 ? rowAlt : ''}`}>
                  <td className={`px-5 py-3 font-semibold ${text}`}>{fullName(c)}</td>
                  <td className={`px-5 py-3 ${muted} max-w-[160px] truncate`}>{c.email || '—'}</td>
                  <td className={`px-5 py-3 ${muted} hidden sm:table-cell`}>{c.phone || '—'}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).slice(0, 2).map((t: string) => <TagBadge key={t} tag={t} isDark={isDark} />)}
                      {(c.tags || []).length > 2 && <span className={`text-xs ${muted}`}>+{c.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className={`px-5 py-3 text-xs ${muted} hidden lg:table-cell`}>
                    {c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-5 py-3 border-t ${divider}`}>
            <span className={`text-xs ${muted}`}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${pgBtn}`}>
                <ChevronLeft size={15} className={muted} />
              </button>
              <span className={`text-xs ${muted} min-w-[56px] text-center`}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${pgBtn}`}>
                <ChevronRight size={15} className={muted} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelected(null)}>
          <div className="flex-1 bg-black/50" />
          <div className={`w-full max-w-sm h-full overflow-y-auto shadow-2xl flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#0c2340,#92278f)' }}>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-0.5">Contact Detail</p>
                <p className="text-base font-bold text-white">{fullName(selected)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 p-5 space-y-4">
              {selected.email && (
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${selected.email}`} className="text-sm text-purple-400 hover:underline break-all">{selected.email}</a>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  <a href={`tel:${selected.phone}`} className={`text-sm ${muted}`}>{selected.phone}</a>
                </div>
              )}
              {selected.dateAdded && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                  <span className={`text-sm ${muted}`}>Added {new Date(selected.dateAdded).toLocaleDateString()}</span>
                </div>
              )}
              {(selected.tags || []).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={12} className="text-slate-400" />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t: string) => <TagBadge key={t} tag={t} isDark={isDark} />)}
                  </div>
                </div>
              )}
              {(selected.tags || []).includes('banquet-inquiry') && (
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-1">Banquet Inquiry</p>
                  <p className="text-sm text-purple-300/80">Submitted a banquet inquiry. Check GHL for full event details.</p>
                </div>
              )}
            </div>
            <div className={`p-5 border-t ${divider}`}>
              <p className={`text-xs text-center ${muted}`}>More contact actions coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}