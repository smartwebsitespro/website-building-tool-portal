// v2.0 | 09/23/2026 3:15 AM PDT -- Multi-upload: select up to 10, staged metadata editing, bulk category, per-file progress
// v1.0 | 09/23/2026 12:51 AM PDT -- Initial: data-driven gallery (upload, reorder, grid/masonry toggle, carousel embed)

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, Edit3, GripVertical, Copy, Check, Plus, Image, Grid3X3, Layers, X, AlertCircle } from 'lucide-react'
import type { AdminPageProps } from '../adminShared'
import { SectionCard, makeHeaders } from '../adminShared'

interface GalleryPhoto {
  id: string
  url: string
  title: string
  caption: string
  category: string
  order: number
}

interface GalleryConfig {
  layout: 'grid' | 'masonry'
  heroImage?: string
  instagramHandle?: string
  photos: GalleryPhoto[]
}

interface StagedFile {
  id: string
  file: File
  preview: string
  title: string
  caption: string
  category: string
  uploadedUrl: string
  uploading: boolean
  error: string
  done: boolean
}

const CATEGORIES = ['Food', 'Atmosphere', 'Dining Area', 'Patio', 'Bar', 'Events']
const DEFAULT_CONFIG: GalleryConfig = { layout: 'grid', photos: [] }
const MAX_FILES = 10

export default function GalleryManagerPanel({ isDark, config, t }: AdminPageProps) {
  const [gallery,      setGallery]      = useState<GalleryConfig>(DEFAULT_CONFIG)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)

  // Multi-upload staging
  const [staged,       setStaged]       = useState<StagedFile[]>([])
  const [bulkCat,      setBulkCat]      = useState('Food')
  const [uploadingAll, setUploadingAll] = useState(false)

  // Edit photo modal
  const [editPhoto,    setEditPhoto]    = useState<GalleryPhoto | null>(null)
  const [editTitle,    setEditTitle]    = useState('')
  const [editCaption,  setEditCaption]  = useState('')
  const [editCategory, setEditCategory] = useState('Food')
  const [editSaving,   setEditSaving]   = useState(false)

  // Drag reorder
  const [dragIdx,      setDragIdx]      = useState<number | null>(null)
  const [dragOver,     setDragOver]     = useState<number | null>(null)

  // Embed copy
  const [copied,       setCopied]       = useState(false)
  const [siteUrl,      setSiteUrl]      = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // -- Load -------------------------------------------------------------------
  useEffect(() => {
    const h = makeHeaders(config)
    fetch(`${config.workerUrl}/admin/gallery`, { headers: h })
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(data => {
        if (data?.gallery && typeof data.gallery === 'object') {
          setGallery({ ...DEFAULT_CONFIG, ...data.gallery, photos: data.gallery.photos || [] })
        }
        setLoading(false)
      })
    fetch(`${config.workerUrl}/site`, { headers: h })
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(data => {
        const url = data?.site?.live?.content?.siteUrl || data?.site?.draft?.content?.siteUrl || ''
        if (url) setSiteUrl(url.replace(/\/$/, ''))
      })
  }, [config.workerUrl, config.locationId])

  // -- Save ------------------------------------------------------------------
  const saveGallery = useCallback(async (updated: GalleryConfig) => {
    setSaving(true)
    try {
      await fetch(`${config.workerUrl}/admin/gallery`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(updated),
      })
    } catch { /* ignore */ }
    setSaving(false)
  }, [config])

  // -- Layout toggle ---------------------------------------------------------
  async function handleLayout(layout: 'grid' | 'masonry') {
    const updated = { ...gallery, layout }
    setGallery(updated)
    await saveGallery(updated)
  }

  // -- File staging ----------------------------------------------------------
  function handleFilesSelected(files: FileList) {
    const slots = MAX_FILES - staged.length
    if (slots <= 0) return
    const arr = Array.from(files).slice(0, slots)
    const newStaged: StagedFile[] = arr.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      caption: '',
      category: bulkCat,
      uploadedUrl: '',
      uploading: false,
      error: '',
      done: false,
    }))
    setStaged(prev => [...prev, ...newStaged].slice(0, MAX_FILES))
  }

  function updateStaged(id: string, patch: Partial<StagedFile>) {
    setStaged(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function removeStaged(id: string) {
    setStaged(prev => {
      const item = prev.find(s => s.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter(s => s.id !== id)
    })
  }

  function applyBulkCat(cat: string) {
    setBulkCat(cat)
    setStaged(prev => prev.map(s => s.done ? s : { ...s, category: cat }))
  }

  function clearStaging() {
    staged.forEach(s => { if (s.preview) URL.revokeObjectURL(s.preview) })
    setStaged([])
  }

  // -- Upload all staged -----------------------------------------------------
  async function handleUploadAll() {
    const pending = staged.filter(s => !s.done)
    if (uploadingAll || pending.length === 0) return
    setUploadingAll(true)

    const results: GalleryPhoto[] = []
    const snapshot = [...staged] // capture current order

    for (const item of snapshot) {
      if (item.done) continue
      updateStaged(item.id, { uploading: true, error: '' })
      try {
        const form = new FormData()
        form.append('file', item.file)
        form.append('folder', 'gallery')
        const res  = await fetch(`${config.workerUrl}/upload`, {
          method: 'POST', headers: makeHeaders(config), body: form,
        })
        const data = await res.json().catch(() => ({}))
        if (data.url) {
          updateStaged(item.id, { uploading: false, done: true, uploadedUrl: data.url })
          results.push({
            id: crypto.randomUUID(),
            url: data.url,
            title: item.title.trim() || 'Untitled',
            caption: item.caption.trim(),
            category: item.category,
            order: gallery.photos.length + results.length,
          })
        } else {
          updateStaged(item.id, { uploading: false, error: 'Upload failed' })
        }
      } catch {
        updateStaged(item.id, { uploading: false, error: 'Network error' })
      }
    }

    if (results.length > 0) {
      const updated = { ...gallery, photos: [...gallery.photos, ...results] }
      setGallery(updated)
      await saveGallery(updated)
    }

    // Remove successful items from staging; keep failed ones for retry
    setStaged(prev => {
      prev.filter(s => s.done).forEach(s => URL.revokeObjectURL(s.preview))
      return prev.filter(s => !s.done)
    })
    setUploadingAll(false)
  }

  // -- Edit photo ------------------------------------------------------------
  function openEdit(p: GalleryPhoto) {
    setEditPhoto(p); setEditTitle(p.title); setEditCaption(p.caption); setEditCategory(p.category)
  }

  async function handleSaveEdit() {
    if (!editPhoto) return
    setEditSaving(true)
    const updated: GalleryConfig = {
      ...gallery,
      photos: gallery.photos.map(p => p.id === editPhoto.id
        ? { ...p, title: editTitle.trim() || 'Untitled', caption: editCaption.trim(), category: editCategory }
        : p),
    }
    setGallery(updated)
    await saveGallery(updated)
    setEditPhoto(null); setEditSaving(false)
  }

  // -- Delete photo ----------------------------------------------------------
  async function handleDelete(id: string) {
    const updated = { ...gallery, photos: gallery.photos.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i })) }
    setGallery(updated)
    await saveGallery(updated)
  }

  // -- Drag reorder ----------------------------------------------------------
  function onDragStart(idx: number) { setDragIdx(idx) }
  function onDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOver(idx) }
  function onDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOver(null); return }
    const arr = [...gallery.photos]
    const [moved] = arr.splice(dragIdx, 1)
    arr.splice(idx, 0, moved)
    const reordered = arr.map((p, i) => ({ ...p, order: i }))
    const updated = { ...gallery, photos: reordered }
    setGallery(updated)
    saveGallery(updated)
    setDragIdx(null); setDragOver(null)
  }

  // -- Embed copy ------------------------------------------------------------
  function handleCopyEmbed() {
    const src  = siteUrl ? `${siteUrl}/gallery?embed=carousel` : `[YOUR_SITE_URL]/gallery?embed=carousel`
    const code = `<iframe src="${src}" width="100%" height="420" frameborder="0" scrolling="no" style="border:none;border-radius:12px"></iframe>`
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // -- Render ----------------------------------------------------------------
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3 opacity-40" />
          <p className="text-sm">Loading gallery...</p>
        </div>
      </div>
    )
  }

  const embedSrc  = siteUrl ? `${siteUrl}/gallery?embed=carousel` : `[YOUR_SITE_URL]/gallery?embed=carousel`
  const embedCode = `<iframe src="${embedSrc}" width="100%" height="420" frameborder="0" scrolling="no" style="border:none;border-radius:12px"></iframe>`
  const sorted    = [...gallery.photos].sort((a, b) => a.order - b.order)
  const pendingCount = staged.filter(s => !s.done).length
  const hasErrors    = staged.some(s => s.error)

  return (
    <div className="space-y-6">

      {/* -- Layout Toggle -------------------------------------------------- */}
      <SectionCard isDark={isDark} title="Gallery Layout" description="Controls how photos display on your gallery page">
        <div className="flex items-center gap-2 flex-wrap">
          {(['grid', 'masonry'] as const).map(opt => (
            <button key={opt} type="button" onClick={() => handleLayout(opt)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                gallery.layout === opt
                  ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600'
                  : `border-transparent ${t.btnSec}`
              }`}>
              {opt === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              {opt === 'grid' ? 'Even Grid' : 'Masonry'}
            </button>
          ))}
          {saving && <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Saving...</span>}
        </div>
      </SectionCard>

      {/* -- Upload Staging ------------------------------------------------- */}
      <SectionCard isDark={isDark} title="Upload Photos"
        description={`Select up to ${MAX_FILES} photos at once. Edit titles, captions, and categories, then upload all.`}>

        {/* Drop zone */}
        {staged.length < MAX_FILES && (
          <div
            onClick={() => !uploadingAll && fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (!uploadingAll) handleFilesSelected(e.dataTransfer.files) }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors py-8 px-4 mb-4 ${
              uploadingAll ? 'opacity-40 cursor-not-allowed' :
              isDark ? 'border-gray-600 hover:border-amber-500 text-gray-400' : 'border-gray-200 hover:border-amber-400 text-gray-400'
            }`}>
            <Upload className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium mb-0.5">Click or drag photos here</p>
            <p className="text-xs opacity-60">
              {staged.length > 0
                ? `${staged.length}/${MAX_FILES} selected - ${MAX_FILES - staged.length} slot${MAX_FILES - staged.length !== 1 ? 's' : ''} left`
                : `Up to ${MAX_FILES} files - JPG, PNG, WebP`}
            </p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { if (e.target.files) handleFilesSelected(e.target.files); e.target.value = '' }} />

        {/* Staging area */}
        {staged.length > 0 && (
          <div className="space-y-4">

            {/* Bulk category */}
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/60' : 'border-gray-100 bg-gray-50'}`}>
              <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Set all:</span>
              <select value={bulkCat} onChange={e => applyBulkCat(e.target.value)}
                className={`flex-1 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 ${t.input}`}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {staged.length}/{MAX_FILES} file{staged.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Per-file cards */}
            <div className="space-y-2">
              {staged.map(item => (
                <div key={item.id}
                  className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                    item.done  ? (isDark ? 'border-green-800/40 bg-green-900/20'  : 'border-green-100 bg-green-50/80') :
                    item.error ? (isDark ? 'border-red-800/40   bg-red-900/20'    : 'border-red-100   bg-red-50/80')   :
                    isDark     ? 'border-gray-700' : 'border-gray-100'
                  }`}>

                  {/* Thumb */}
                  <div className="relative flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-200">
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    {item.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {item.done && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-600/75">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {item.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-600/75">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input type="text" value={item.title}
                      onChange={e => updateStaged(item.id, { title: e.target.value })}
                      disabled={item.uploading || item.done}
                      placeholder="Photo title"
                      className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 ${t.input}`} />
                    <input type="text" value={item.caption}
                      onChange={e => updateStaged(item.id, { caption: e.target.value })}
                      disabled={item.uploading || item.done}
                      placeholder="Caption (optional)"
                      className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 ${t.input}`} />
                    <div className="flex items-center gap-2">
                      <select value={item.category}
                        onChange={e => updateStaged(item.id, { category: e.target.value })}
                        disabled={item.uploading || item.done}
                        className={`flex-1 px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 ${t.input}`}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {item.error && <span className="text-xs text-red-500 whitespace-nowrap">{item.error}</span>}
                      {!item.done && (
                        <button type="button" disabled={item.uploading} onClick={() => removeStaged(item.id)}
                          className={`flex-shrink-0 p-1.5 rounded-lg disabled:opacity-40 transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div className="flex gap-2 pt-1">
              {!uploadingAll && (
                <button type="button" onClick={clearStaging}
                  className={`px-4 py-2 text-sm font-medium border rounded-xl transition-colors ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Clear
                </button>
              )}
              {pendingCount > 0 && (
                <button type="button" disabled={uploadingAll} onClick={handleUploadAll}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black rounded-xl transition-colors">
                  {uploadingAll
                    ? <><div className="w-4 h-4 border-2 border-black/60 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                    : <><Upload className="w-4 h-4" /> Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''}</>
                  }
                </button>
              )}
              {hasErrors && !uploadingAll && pendingCount === 0 && (
                <button type="button" onClick={() => setStaged(prev => prev.filter(s => s.error).map(s => ({ ...s, error: '' })))}
                  className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-400 text-white rounded-xl transition-colors">
                  Retry Failed
                </button>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* -- Photos --------------------------------------------------------- */}
      <SectionCard isDark={isDark} title={`Photos (${gallery.photos.length})`}
        description="Drag to reorder - hover to edit or delete">

        {sorted.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-14 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <Image className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No photos yet</p>
            <p className="text-xs">Use the upload area above to add your first photos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map((photo, idx) => (
              <div key={photo.id} draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  dragOver === idx ? 'border-amber-400 scale-[1.04]' :
                  dragIdx  === idx ? 'opacity-40 border-dashed border-gray-400' :
                  isDark ? 'border-gray-700' : 'border-gray-100'
                }`}>
                <img src={photo.url} alt={photo.title} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/55 transition-all flex flex-col justify-between p-2 opacity-0 hover:opacity-100">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => handleDelete(photo.id)}
                      className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold truncate mb-1">{photo.title}</p>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/70 bg-white/20 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">{photo.category}</span>
                      <button type="button" onClick={() => openEdit(photo)}
                        className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors flex-shrink-0">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1.5 left-1.5 pointer-events-none">
                  <GripVertical className="w-4 h-4 text-white/50 drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* -- Embed Carousel ------------------------------------------------- */}
      <SectionCard isDark={isDark} title="Embed Carousel"
        description="Drop this code anywhere on your site - funnel page, GHL builder, or external site - to show an auto-playing carousel of your gallery photos">
        <div className={`rounded-xl border font-mono text-xs p-3 break-all select-all leading-relaxed ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          {embedCode}
        </div>
        <button type="button" onClick={handleCopyEmbed}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors">
          {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Embed Code</>}
        </button>
        {!siteUrl && (
          <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Replace <code>[YOUR_SITE_URL]</code> with your actual site URL (e.g. <code>https://pacifictable.packedhousehq.com</code>)
          </p>
        )}
      </SectionCard>

      {/* -- Edit Photo Modal ----------------------------------------------- */}
      {editPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !editSaving) setEditPhoto(null) }}>
          <div className={`rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4 space-y-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Photo</h3>
            <img src={editPhoto.url} alt={editPhoto.title} className="w-full h-32 object-cover rounded-xl" />
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title"
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 ${t.input}`} />
            <input type="text" value={editCaption} onChange={e => setEditCaption(e.target.value)} placeholder="Caption (optional)"
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 ${t.input}`} />
            <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 ${t.input}`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" disabled={editSaving} onClick={() => setEditPhoto(null)}
                className={`flex-1 px-4 py-2 text-sm font-medium border rounded-xl transition-colors disabled:opacity-50 ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button type="button" disabled={editSaving} onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl transition-colors">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
