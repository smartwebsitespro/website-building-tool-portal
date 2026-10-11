// AdminDocs.tsx v1.0.0 | 10/07/2026 -- PackedHouseHQ admin portal docs viewer
import { useState, useEffect } from 'react'
import { BookOpen, Search, ChevronLeft, Download, ExternalLink, Loader2 } from 'lucide-react'

const BIONIC_URL = 'https://bionic-memory.webadmin-a18.workers.dev'
const BIONIC_HDR = { 'X-Location-Id': '1Mv6rZANvd7ehMZ7n5pV' }
const PROJECT    = 'packedhousehq'

const CATEGORY_CLS: Record<string, string> = {
  endpoint:     'bg-blue-100 text-blue-700',
  portal:       'bg-teal-100 text-teal-700',
  procedure:    'bg-purple-100 text-purple-700',
  architecture: 'bg-orange-100 text-orange-700',
  workflow:     'bg-green-100 text-green-700',
  reference:    'bg-gray-100 text-gray-600',
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function renderMarkdown(md: string): string {
  let html = escHtml(md)
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, c) =>
    `<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono text-gray-800">${c.trim()}</code></pre>`)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-gray-900 mt-4 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm,  '<h2 class="text-base font-bold text-gray-900 mt-5 mb-1.5 pb-1 border-b border-gray-200">$1</h2>')
  html = html.replace(/^# (.+)$/gm,   '<h1 class="text-lg font-bold text-gray-900 mt-2 mb-3">$1</h1>')
  html = html.replace(/^---$/gm, '<hr class="border-gray-200 my-3" />')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-blue-700">$1</code>')
  html = html.replace(/^\|(.+)\|$/gm, (_, row) => {
    const cells = row.split('|').map((c: string) => c.trim())
    return '<tr>' + cells.map((c: string) => `<td class="px-3 py-1.5 text-sm border border-gray-200 align-top">${c}</td>`).join('') + '</tr>'
  })
  html = html.replace(/^\|[-| :]+\|$/gm, '')
  html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, m => `<table class="w-full border-collapse my-3 text-sm">${m}</table>`)
  html = html.replace(/^- (.+)$/gm, '<li class="flex gap-1.5 text-sm text-gray-700 py-0.5"><span class="text-blue-500 flex-shrink-0">\u2022</span><span>$1</span></li>')
  html = html.replace(/(<li[\s\S]*?<\/li>\n?)+/g, m => `<ul class="my-1.5 space-y-0.5">${m}</ul>`)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-blue-400 pl-3 text-sm text-gray-500 italic my-1">$1</blockquote>')
  html = html.replace(/^(?!<|\d+\.)([^\n].+)$/gm, '<p class="text-sm text-gray-700 my-1 leading-relaxed">$1</p>')
  return html
}

interface DocMeta {
  slug: string; title: string; category: string; summary?: string; version?: string; lastUpdated?: string
}
interface DocFull extends DocMeta { content: string }

export default function AdminDocs() {
  const [docs,      setDocs]      = useState<DocMeta[]>([])
  const [selected,  setSelected]  = useState<DocFull | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    fetch(`${BIONIC_URL}/docs?project=${PROJECT}`, { headers: BIONIC_HDR })
      .then(r => r.ok ? r.json() : { docs: [] })
      .then(d => setDocs(d.docs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function openDoc(slug: string) {
    setLoadingDoc(true)
    fetch(`${BIONIC_URL}/docs/${slug}`, { headers: BIONIC_HDR })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSelected(d))
      .catch(() => {})
      .finally(() => setLoadingDoc(false))
  }

  const filtered = docs.filter(d => {
    const q = search.toLowerCase()
    const matchQ = !q || d.title.toLowerCase().includes(q) || (d.summary||'').toLowerCase().includes(q)
    return matchQ && (!catFilter || d.category === catFilter)
  })

  const categories = [...new Set(docs.map(d => d.category))].sort()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" /> Documentation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{docs.length} docs — PackedHouseHQ reference &amp; how-tos</p>
        </div>
        <button onClick={() => window.open(`${BIONIC_URL}/docs/export?project=${PROJECT}`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl">
          <Download size={14} /> Export All
        </button>
      </div>

      {selected ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{selected.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_CLS[selected.category] || CATEGORY_CLS.reference}`}>{selected.category}</span>
                {selected.version && <span className="text-xs text-gray-400">{selected.version}</span>}
                {selected.lastUpdated && <span className="text-xs text-gray-400">Updated {selected.lastUpdated}</span>}
              </div>
            </div>
          </div>
          <div className="px-6 py-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }} />
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search docs..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No docs found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(doc => (
                <button key={doc.slug} onClick={() => openDoc(doc.slug)}
                  className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_CLS[doc.category] || CATEGORY_CLS.reference}`}>{doc.category}</span>
                    <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mt-2 leading-snug">{doc.title}</h3>
                  {doc.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{doc.summary}</p>}
                </button>
              ))}
            </div>
          )}
          {loadingDoc && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>}
        </>
      )}
    </div>
  )
}
