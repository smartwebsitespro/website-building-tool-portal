// MediaLibraryPage.tsx -- PackedHouseHQ Media Library
// v1.0 | 09/09/2026 -- Full implementation: list, filter, search, copy URL, upload, delete
// Calls: GET /files/list · DELETE /files/delete · POST /upload (worker v0.3.53+)

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, RefreshCw, Search, Copy, Trash2, CheckCircle,
  Loader2, Image as ImageIcon, FileCode, FileText, File,
  X, FolderOpen, ChevronDown,
} from 'lucide-react'
import type { AdminPageProps, MediaFile } from '../adminShared'
import { makeHeaders } from '../adminShared'

type FilterTab = 'all' | 'images' | 'code' | 'docs' | 'other'

const isImage  = (t: string) => t.startsWith('image/')
const isCode   = (t: string) => ['javascript','typescript','css','html','x-sh','x-python','sql'].some(s => t.includes(s))
const isDocs   = (t: string) => ['plain','json','markdown','yaml','xml','csv','toml'].some(s => t.includes(s))

function matchesFilter(f: MediaFile, tab: FilterTab) {
  if (tab === 'all')    return true
  if (tab === 'images') return isImage(f.type)
  if (tab === 'code')   return isCode(f.type)
  if (tab === 'docs')   return isDocs(f.type)
  return !isImage(f.type) && !isCode(f.type) && !isDocs(f.type)
}

function formatSize(bytes: number) {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '' }
}

function FileIcon({ type, className = '' }: { type: string; className?: string }) {
  if (isImage(type)) return <ImageIcon className={className} />
  if (isCode(type))  return <FileCode  className={className} />
  if (isDocs(type))  return <FileText  className={className} />
  return <File className={className} />
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose, isDark }: { file: MediaFile; onClose: () => void; isDark: boolean }) {
  const bg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-stone-200'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className={`relative max-w-3xl w-full rounded-2xl border shadow-2xl overflow-hidden ${bg}`}
        onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-stone-200'}`}>
          <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{file.name}</p>
          <button onClick={onClose} className={`ml-3 p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-stone-100'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className={`${isDark ? 'bg-slate-950' : 'bg-stone-50'} p-4 flex items-center justify-center min-h-[300px]`}>
          {isImage(file.type)
            ? <img src={file.url} alt={file.name} className="max-h-[60vh] max-w-full object-contain rounded-lg" />
            : <div className="text-center space-y-3">
                <FileIcon type={file.type} className={`w-16 h-16 mx-auto ${isDark ? 'text-slate-600' : 'text-stone-300'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{file.type}</p>
              </div>
          }
        </div>
        <div className={`px-4 py-3 border-t text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-stone-200 text-slate-400'} flex gap-4`}>
          <span>{formatSize(file.size)}</span>
          <span>{fmtDate(file.uploaded)}</span>
          <span className="font-mono truncate">{file.folder || '/'}</span>
          <a href={file.url} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-sky-500 hover:underline">Open in new tab</a>
        </div>
      </div>
    </div>
  )
}

// ── Upload drop zone ──────────────────────────────────────────────────────────
function UploadZone({ config, isDark, t, onUploaded }: {
  config: AdminPageProps['config']; isDark: boolean
  t: AdminPageProps['t']; onUploaded: () => void
}) {
  const [dragging,     setDragging]     = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [lastFilename, setLastFilename] = useState<string | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true); setError(null); setLastFilename(null)
    try {
      const res = await fetch(`${config.workerUrl}/upload`, {
        method  : 'POST',
        headers : {
          ...makeHeaders(config),
          'Content-Type' : file.type || 'application/octet-stream',
          'X-Filename'   : file.name,
          'X-Folder'     : 'uploads',
        },
        body: file,
      })
      const data = await res.json()
      if (data.ok) { setLastFilename(file.name); onUploaded() }
      else setError(data.error || 'Upload failed')
    } catch { setError('Upload failed') }
    finally { setUploading(false) }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const base = isDark ? 'border-slate-700 bg-slate-800/40 hover:border-sky-500/50 hover:bg-slate-800/70'
                      : 'border-stone-300 bg-stone-50 hover:border-sky-400/60 hover:bg-sky-50/30'
  const drag = 'border-sky-500 bg-sky-900/20'

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${dragging ? drag : base}`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={onFileChange} accept="image/*,video/*,application/pdf,.txt,.csv,.json" />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className={`text-sm ${t.muted}`}>Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <Upload className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} />
          <p className={`text-sm font-medium ${t.body}`}>Drop a file here or <span className="text-sky-500">browse</span></p>
          <p className={`text-xs ${t.muted}`}>Images, PDFs, CSV, JSON — max 20 MB</p>
          {lastFilename && (
            <p className="text-xs text-emerald-500 flex items-center gap-1 pointer-events-auto">
              <CheckCircle className="w-3 h-3" /> {lastFilename} uploaded
            </p>
          )}
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MediaLibraryPage({ isDark, config, t }: AdminPageProps) {
  const [files,         setFiles]         = useState<MediaFile[]>([])
  const [loading,       setLoading]       = useState(false)
  const [filter,        setFilter]        = useState<FilterTab>('all')
  const [search,        setSearch]        = useState('')
  const [copied,        setCopied]        = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [preview,       setPreview]       = useState<MediaFile | null>(null)
  const [folderFilter,  setFolderFilter]  = useState<string>('all')
  const [showUpload,    setShowUpload]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${config.workerUrl}/files/list`, { headers: makeHeaders(config) })
      const data = await res.json()
      if (Array.isArray(data.files)) setFiles(data.files)
    } catch { /* non-critical */ }
    finally { setLoading(false) }
  }, [config.workerUrl, config.locationId])

  useEffect(() => { load() }, [load])

  async function handleDelete(file: MediaFile) {
    setDeleting(file.key)
    try {
      await fetch(`${config.workerUrl}/files/delete`, {
        method  : 'DELETE',
        headers : makeHeaders(config, { 'Content-Type': 'application/json' }),
        body    : JSON.stringify({ key: file.key }),
      })
      setFiles(prev => prev.filter(f => f.key !== file.key))
    } catch { /* ignore */ }
    finally { setDeleting(null); setDeleteConfirm(null) }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  // Derived data
  const folders   = ['all', ...Array.from(new Set(files.map(f => f.folder).filter(Boolean))).sort()]
  const filtered  = files.filter(f => {
    if (!matchesFilter(f, filter))     return false
    if (folderFilter !== 'all' && f.folder !== folderFilter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts: Record<FilterTab, number> = {
    all   : files.length,
    images: files.filter(f => isImage(f.type)).length,
    code  : files.filter(f => isCode(f.type)).length,
    docs  : files.filter(f => isDocs(f.type)).length,
    other : files.filter(f => !isImage(f.type) && !isCode(f.type) && !isDocs(f.type)).length,
  }

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',    label: `All (${counts.all})`       },
    { id: 'images', label: `Images (${counts.images})` },
    { id: 'docs',   label: `Docs (${counts.docs})`     },
    { id: 'code',   label: `Code (${counts.code})`     },
    { id: 'other',  label: `Other (${counts.other})`   },
  ]

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className={`flex rounded-xl overflow-hidden border ${t.border}`}>
          {TABS.map((tab, i) => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${i > 0 ? `border-l ${t.border}` : ''} ${
                filter === tab.id ? 'bg-amber-500 text-black' : `${t.dragBg} ${t.body} ${t.dragHover}`
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Folder filter */}
        {folders.length > 2 && (
          <div className="relative">
            <select
              value={folderFilter}
              onChange={e => setFolderFilter(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-2 text-xs font-medium border rounded-xl cursor-pointer transition-colors focus:outline-none ${t.input} ${t.border}`}>
              {folders.map(f => <option key={f} value={f}>{f === 'all' ? 'All folders' : `📁 ${f}`}</option>)}
            </select>
            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${t.muted}`} />
          </div>
        )}

        {/* Search */}
        <div className="flex-1 min-w-[160px] relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.muted}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-sky-500 transition-colors ${t.input} ${t.border}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.muted} hover:text-rose-400`}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <button onClick={() => setShowUpload(v => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors">
          <Upload className="w-4 h-4" />
          Upload
        </button>
        <button onClick={load} disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-colors disabled:opacity-50 ${t.btnSec} ${t.border}`}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Upload zone (collapsible) */}
      {showUpload && (
        <UploadZone config={config} isDark={isDark} t={t} onUploaded={() => { load(); setShowUpload(false) }} />
      )}

      {/* Stats bar */}
      <div className={`flex items-center gap-4 text-xs ${t.muted} border-b pb-3 ${t.border}`}>
        <span className="flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" />
          {filtered.length} of {files.length} files
        </span>
        {folderFilter !== 'all' && <span>📁 {folderFilter}</span>}
        {search && <span>🔍 "{search}"</span>}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className={`text-sm ${t.muted}`}>Loading media library…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <ImageIcon className={`w-10 h-10 mx-auto ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm ${t.muted}`}>
            {search || filter !== 'all' || folderFilter !== 'all'
              ? 'No files match your filter.'
              : 'No files uploaded yet. Upload one above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(file => {
            const isCopied   = copied === file.url
            const isDeleting = deleting === file.key
            const isConfirm  = deleteConfirm === file.key

            return (
              <div key={file.key}
                className={`${t.cardBg} border ${t.cardBdr} rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md`}>

                {/* Thumbnail / placeholder */}
                {isImage(file.type) ? (
                  <button onClick={() => setPreview(file)}
                    className={`block h-36 overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'} hover:opacity-90 transition-opacity`}>
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ) : (
                  <button onClick={() => setPreview(file)}
                    className={`h-24 flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-100 hover:bg-gray-150'} transition-colors`}>
                    <FileIcon type={file.type} className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${t.indexBadge} ${t.borderMid}`}>
                      {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </span>
                  </button>
                )}

                {/* File info */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div>
                    <p className={`text-sm font-medium truncate ${t.title}`} title={file.name}>{file.name}</p>
                    <div className={`flex items-center gap-2 text-xs ${t.muted} mt-0.5`}>
                      <span>{formatSize(file.size)}</span>
                      {file.folder && <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-stone-100 text-slate-500'}`}>{file.folder}</span>}
                    </div>
                  </div>

                  <p className={`text-xs font-mono truncate ${t.label}`} title={file.url}>
                    {file.url.split('/').slice(-2).join('/')}
                  </p>
                  <p className={`text-xs ${t.muted}`}>{fmtDate(file.uploaded)}</p>

                  {/* Delete confirmation */}
                  {isConfirm ? (
                    <div className="flex items-center gap-1.5 mt-auto">
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={isDeleting}
                        className="flex-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center">
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`px-2 py-1.5 text-xs font-medium border rounded-lg transition-colors ${t.btnSec} ${t.border}`}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => handleCopy(file.url)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          isCopied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : `${t.btnSec} ${t.border}`
                        }`}>
                        {isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? 'Copied!' : 'Copy URL'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(file.key)}
                        className={`flex items-center justify-center p-2 rounded-xl border transition-colors ${t.border} ${t.body} hover:bg-rose-900/30 hover:border-rose-500/40 hover:text-rose-400`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} isDark={isDark} />}
    </div>
  )
}
