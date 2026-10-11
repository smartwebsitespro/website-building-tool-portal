// v2.0 | 09/24/2026 4:25 PM PDT -- Add: mode selector (global/category windows); per-category time windows; bulk category Add All/Remove All; oa-hours KV config; GET /admin/kv support
// v1.4 | 10/05/2026 3:00 AM PDT -- Fix: preserve product image on OA toggle
// v1.3 | 10/01/2026 1:58 AM PDT -- Categories default closed on load (openCats starts empty)

// v1.2 | 09/24/2026 3:49 PM PDT -- Seed KV cache after every toggle
// v1.1 | 09/24/2026 3:35 PM PDT -- OA accordion at top (basket); categories below (source)

import { useState, useEffect, useCallback } from 'react'
import type { AdminPageProps } from '../adminShared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Price { _id: string; name: string; amount: number; currency: string; type: string; deleted?: boolean }
interface Product { _id: string; name: string; description?: string; availableInStore: boolean; collectionIds?: string[]; image?: string; deleted?: boolean; prices: Price[] }
interface Collection { _id: string; name: string; slug: string }
interface CatHours { from: string; to: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HDRS = (locationId: string) => ({
  'X-Context-Key': 'oftheuniverse',
  'X-Location-Id': locationId,
  'Content-Type' : 'application/json',
})

function fmtPrice(prices: Price[]): string {
  const active = (prices ?? []).filter(p => !p.deleted)
  if (!active.length) return ''
  const p = active[0]
  if (!p.amount) return p.name || ''
  return '$' + Number(p.amount).toFixed(2)
}

const CAT_ICONS: Record<string, string> = {
  Breakfast    : '\u{1F305}',
  Brunch       : '\u{1F942}',
  Lunch        : '\u{1F957}',
  Dinner       : '\u{1F37D}\uFE0F',
  Specials     : '\u2B50',
  Desserts     : '\u{1F370}',
  'Beer & Wine': '\u{1F377}',
  Cocktails    : '\u{1F379}',
  'Kids Menu'  : '\u{1F9D2}',
}
const DISH_ICON = '\u{1F37D}\uFE0F'
const CART_ICON = '\u{1F6D2}'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OrderAheadPage({ isDark, config }: AdminPageProps) {
  // Core state
  const [collections,   setCollections]  = useState<Collection[]>([])
  const [products,      setProducts]     = useState<Product[]>([])
  const [oaColId,       setOaColId]      = useState<string>('')
  const [loading,       setLoading]      = useState(true)
  const [error,         setError]        = useState<string | null>(null)
  const [togglingId,    setTogglingId]   = useState<string | null>(null)
  const [catAllLoading, setCatAllLoading]= useState<string | null>(null)
  const [openCats,      setOpenCats]     = useState<Set<string>>(new Set())
  const [oaOpen,        setOaOpen]       = useState(true)
  const [successMsg,    setSuccessMsg]   = useState<string | null>(null)
  const [searchQuery,   setSearchQuery]  = useState('')
  // Availability mode & hours
  const [oaMode,        setOaMode]       = useState<'global' | 'category'>('global')
  const [categoryHours, setCategoryHours]= useState<Record<string, CatHours>>({})
  const [hoursSaving,   setHoursSaving]  = useState(false)

  function showToast(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 2800) }
  function toggleCat(id: string) { setOpenCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  // ---- KV helpers ----------------------------------------------------------
  async function seedMenuKV(prods: Product[], cols: Collection[], oaId: string) {
    const allCols  = [...cols, { _id: oaId, name: 'Order Ahead', slug: 'order-ahead' }]
    const menuIds  = new Set(allCols.map(c => c._id))
    const menuProds = prods.filter(p => !p.deleted && (p.collectionIds ?? []).some(id => menuIds.has(id)))
    fetch(`${config.workerUrl}/admin/kv`, {
      method : 'PUT',
      headers: HDRS(config.locationId),
      body   : JSON.stringify({ key: `${config.locationId}/cache/menu`, value: { collections: allCols, products: menuProds } }),
    }).catch(() => {})
  }

  async function saveOaHours(newMode?: 'global' | 'category', newHours?: Record<string, CatHours>) {
    setHoursSaving(true)
    const mode  = newMode  ?? oaMode
    const hours = newHours ?? categoryHours
    try {
      await fetch(`${config.workerUrl}/admin/kv`, {
        method : 'PUT',
        headers: HDRS(config.locationId),
        body   : JSON.stringify({ key: `${config.locationId}/oa-hours`, value: { mode, categories: hours } }),
      })
      showToast('Availability settings saved.')
    } catch { showToast('Failed to save settings.') }
    finally { setHoursSaving(false) }
  }

  async function loadOaHours() {
    try {
      const res = await fetch(
        `${config.workerUrl}/admin/kv?key=${encodeURIComponent(config.locationId + '/oa-hours')}`,
        { headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': config.locationId } }
      )
      if (res.ok) {
        const { value } = await res.json()
        if (value?.mode)       setOaMode(value.mode)
        if (value?.categories) setCategoryHours(value.categories)
      }
    } catch { /* non-critical */ }
  }

  // ---- Data load -----------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${config.workerUrl}/menu`, {
        headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': config.locationId },
        cache  : 'no-store',
      })
      if (!res.ok) throw new Error(`Menu API ${res.status}`)
      const data  = await res.json()
      const prods = (data.products ?? []).filter((p: Product) => !p.deleted)
      let cols: Collection[] = data.collections ?? []
      // Self-heal: ensure OA collection exists
      if (!cols.find((c: Collection) => c.name === 'Order Ahead')) {
        try {
          const colRes  = await fetch(
            `${config.workerUrl}/products/collections?altId=${config.locationId}&altType=location&limit=50`,
            { headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': config.locationId } }
          )
          const colData = colRes.ok ? await colRes.json() : {}
          const oa      = (colData.data ?? []).find((c: Collection) => c.name === 'Order Ahead')
          if (oa) cols  = [...cols, oa]
        } catch { }
      }
      const oaCol = cols.find((c: Collection) => c.name === 'Order Ahead')
      setOaColId(oaCol?._id ?? '')
      const menuCols = cols.filter((c: Collection) => c.name !== 'Order Ahead')
      setCollections(menuCols)
      setProducts(prods)
      setOpenCats(new Set()) // v1.3: start all categories closed; only OA list (oaOpen) stays open
      await loadOaHours()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setLoading(false) }
  }, [config.workerUrl, config.locationId])

  useEffect(() => { fetchData() }, [fetchData])

  // ---- Individual item toggle ----------------------------------------------
  async function handleToggle(product: Product) {
    if (!oaColId) { showToast('Order Ahead collection not found.'); return }
    const isIn   = (product.collectionIds ?? []).includes(oaColId)
    const newIds = isIn
      ? (product.collectionIds ?? []).filter(id => id !== oaColId)
      : [...(product.collectionIds ?? []), oaColId]
    const updatedProducts = products.map(p => p._id === product._id ? { ...p, collectionIds: newIds } : p)
    setProducts(updatedProducts)
    setTogglingId(product._id)
    try {
      const res = await fetch(`${config.workerUrl}/products/${product._id}`, {
        method : 'PUT',
        headers: HDRS(config.locationId),
        body   : JSON.stringify({
          name: product.name, description: product.description ?? '',
          collectionIds: newIds, availableInStore: product.availableInStore,
          locationId: config.locationId, productType: 'PHYSICAL', variants: [],
          medias: product.image ? [{ url: product.image, type: 'image' }] : [],
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      await seedMenuKV(updatedProducts, collections, oaColId)
      showToast(isIn ? `\u201c${product.name}\u201d removed.` : `\u201c${product.name}\u201d added!`)
    } catch {
      setProducts(products.map(p => p._id === product._id ? { ...p, collectionIds: product.collectionIds } : p))
      showToast('Failed to update. Please try again.')
    } finally { setTogglingId(null) }
  }

  // ---- Bulk category toggle (Add All / Remove All) -------------------------
  async function handleCategoryBulkToggle(col: Collection) {
    if (!oaColId) { showToast('Order Ahead collection not found.'); return }
    const allCatProds = products.filter(p => (p.collectionIds ?? []).includes(col._id) && !p.deleted)
    const allInOa     = allCatProds.length > 0 && allCatProds.every(p => (p.collectionIds ?? []).includes(oaColId))
    // Adding: items not yet in OA. Removing: items currently in OA.
    const toToggle    = allInOa
      ? allCatProds.filter(p =>  (p.collectionIds ?? []).includes(oaColId))
      : allCatProds.filter(p => !(p.collectionIds ?? []).includes(oaColId))
    if (!toToggle.length) { showToast('Nothing to update.'); return }

    // Optimistic update
    const updatedProds = products.map(p => {
      if (!toToggle.find(t => t._id === p._id)) return p
      const newIds = allInOa
        ? (p.collectionIds ?? []).filter(id => id !== oaColId)
        : [...(p.collectionIds ?? []), oaColId]
      return { ...p, collectionIds: newIds }
    })
    setProducts(updatedProds)
    setCatAllLoading(col._id)
    try {
      await Promise.allSettled(toToggle.map(product => {
        const newIds = allInOa
          ? (product.collectionIds ?? []).filter(id => id !== oaColId)
          : [...(product.collectionIds ?? []), oaColId]
        return fetch(`${config.workerUrl}/products/${product._id}`, {
          method : 'PUT',
          headers: HDRS(config.locationId),
          body   : JSON.stringify({
            name: product.name, description: product.description ?? '',
            collectionIds: newIds, availableInStore: product.availableInStore,
            locationId: config.locationId, productType: 'PHYSICAL', variants: [],
            medias: product.image ? [{ url: product.image, type: 'image' }] : [],
          }),
        })
      }))
      await seedMenuKV(updatedProds, collections, oaColId)
      showToast(allInOa
        ? `All ${col.name} items removed from Order Ahead.`
        : `All ${col.name} items added to Order Ahead!`
      )
    } catch {
      setProducts(products)
      showToast('Bulk update failed. Please try again.')
    } finally { setCatAllLoading(null) }
  }

  // ---- Category hours helpers ----------------------------------------------
  function updateCatHours(colId: string, field: 'from' | 'to', val: string) {
    setCategoryHours(prev => {
      const existing = prev[colId] ?? { from: '', to: '' }
      return { ...prev, [colId]: { ...existing, [field]: val } }
    })
  }
  async function saveCatHoursEntry(colId: string) {
    const updated = { ...categoryHours }
    // If both are empty, delete the entry (= full order hours)
    if (!updated[colId]?.from && !updated[colId]?.to) delete updated[colId]
    setCategoryHours(updated)
    await saveOaHours(undefined, updated)
  }

  // ---- Product row render --------------------------------------------------
  function renderProductRow(product: Product, opts: { inOa: boolean; catName?: string }) {
    const { inOa, catName } = opts
    const price  = fmtPrice(product.prices)
    const icon   = catName ? (CAT_ICONS[catName] ?? DISH_ICON) : CART_ICON
    const isBusy = togglingId === product._id
    return (
      <div key={product._id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        inOa
          ? (isDark ? 'bg-teal-900/20 border-teal-700/40' : 'bg-teal-50 border-teal-200')
          : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-200')
      }`}>
        <div className={`w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border ${
          isDark ? 'bg-slate-700 border-slate-600' : 'bg-stone-100 border-stone-200'
        }`}>
          {product.image
            ? <img src={product.image} alt={product.name} loading='lazy' className='w-full h-full object-cover' />
            : <div className='w-full h-full flex items-center justify-center text-base text-slate-400'>{icon}</div>
          }
        </div>
        <div className='flex-1 min-w-0'>
          <p className={`font-medium text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{product.name}</p>
          {price && <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{price}</p>}
        </div>
        {inOa ? (
          <button type='button' onClick={() => handleToggle(product)} disabled={isBusy}
            className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait ${
              isBusy ? 'animate-pulse' : ''
            } ${isDark ? 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'}`}>
            {isBusy ? '\u2026' : 'Remove'}
          </button>
        ) : (
          <button type='button' onClick={() => handleToggle(product)} disabled={!oaColId || isBusy}
            className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait ${
              isBusy ? 'animate-pulse' : ''
            } ${isDark ? 'bg-slate-700 hover:bg-teal-700 text-slate-300 hover:text-white border border-slate-600 hover:border-teal-600' : 'bg-stone-100 hover:bg-teal-500 text-slate-600 hover:text-white border border-stone-200 hover:border-teal-500'}`}>
            {isBusy ? '\u2026' : '+ Add'}
          </button>
        )}
      </div>
    )
  }

  // ---- Loading / error -----------------------------------------------------
  if (loading) return (
    <div className='flex items-center justify-center py-24'>
      <div className='w-8 h-8 border-4 border-t-transparent rounded-full animate-spin'
        style={{ borderColor: 'var(--p,#0ea5e9)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (error) return (
    <div className='rounded-xl border border-red-700/30 bg-red-950/20 px-5 py-4 text-red-400 text-sm'>{error}</div>
  )

  const oaItems = products.filter(p =>
    oaColId &&
    (p.collectionIds ?? []).includes(oaColId) &&
    (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // ---- Render --------------------------------------------------------------
  return (
    <div className='space-y-4'>

      {/* ===== HEADER + MODE SELECTOR ===== */}
      <div className={`rounded-2xl border p-5 space-y-4 ${
        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-stone-200'
      }`}>
        <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
          <div className='flex-1'>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Ahead Manager</h2>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {oaItems.length} item{oaItems.length !== 1 ? 's' : ''} available for ordering
            </p>
          </div>
          <button onClick={fetchData}
            className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300' : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-slate-600'
            }`}>
            ↻ Sync Menu
          </button>
        </div>

        {/* Mode selector */}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>Availability Mode</p>
          <div className={`inline-flex rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-600' : 'border-stone-200'
          }`}>
            {(['global', 'category'] as const).map(mode => (
              <button key={mode} type='button'
                onClick={() => { setOaMode(mode); saveOaHours(mode, categoryHours) }}
                className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
                  oaMode === mode
                    ? (isDark ? 'bg-teal-700 text-white' : 'bg-teal-600 text-white')
                    : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-stone-50')
                }`}>
                {mode === 'global' ? '\u{1F550} Full Order Hours' : '\u{1F4C5} Category Windows'}
              </button>
            ))}
          </div>
          <p className={`text-xs mt-2 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {oaMode === 'global'
              ? 'All OA items available during your global order hours (Settings \u2192 Ecommerce).'
              : 'Each category uses its own window. Leave blank = uses full order hours.'}
          </p>
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl bg-slate-800 text-white pointer-events-none border border-slate-600'>
          {successMsg}
        </div>
      )}

      {/* No OA collection warning */}
      {!oaColId && (
        <div className={`rounded-xl border px-5 py-4 text-sm ${
          isDark ? 'border-amber-700/40 bg-amber-900/20 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          ⚠️ Order Ahead collection not found. Click “↻ Sync Menu” to reload.
        </div>
      )}

      {/* Search */}
      <div className='relative'>
        <input type='text' value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder='Search menu items…'
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-teal-500'
              : 'bg-white border-stone-200 text-slate-900 placeholder-slate-400 focus:border-teal-500'
          }`}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none'>
            &times;
          </button>
        )}
      </div>

      {/* ===== OA BASKET (top) ===== */}
      <div className='space-y-2'>
        <button type='button' onClick={() => setOaOpen(v => !v)}
          className={`flex items-center gap-3 px-4 w-full text-left py-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-teal-900/30 border-teal-700/50 hover:border-teal-600' : 'bg-teal-50 border-teal-200 hover:border-teal-300'
          }`}>
          <span className='text-xl'>{CART_ICON}</span>
          <span className={`font-bold text-sm flex-1 ${
            isDark ? 'text-teal-300' : 'text-teal-800'
          }`}>Order Ahead</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            oaItems.length > 0
              ? (isDark ? 'bg-teal-700/50 text-teal-200' : 'bg-teal-100 text-teal-700')
              : (isDark ? 'text-slate-500' : 'text-slate-400')
          }`}>
            {oaItems.length} item{oaItems.length !== 1 ? 's' : ''}
          </span>
          <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${
            isDark ? 'text-teal-500' : 'text-teal-600'
          } ${oaOpen ? '' : '-rotate-90'}`}
            fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>

        {oaOpen && (
          <div className='space-y-2'>
            {oaItems.length === 0 ? (
              <div className={`rounded-xl border border-dashed px-5 py-8 text-center ${
                isDark ? 'border-slate-600' : 'border-stone-300'
              }`}>
                <p className='text-3xl mb-2'>{CART_ICON}</p>
                <p className={`text-sm font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>No items yet</p>
                <p className={`text-xs mt-1 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>Tap <strong>+ Add</strong> or <strong>Add All</strong> on any category below</p>
              </div>
            ) : oaItems.map(p => {
              const primaryCat = collections.find(c => (p.collectionIds ?? []).includes(c._id))
              return renderProductRow(p, { inOa: true, catName: primaryCat?.name })
            })}
          </div>
        )}
      </div>

      {/* ===== CATEGORY ACCORDIONS (source) ===== */}
      {collections.length === 0 && (
        <p className={`text-center py-12 text-sm ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}>No menu categories found. Run ↻ Sync Menu.</p>
      )}

      {collections.map(col => {
        // All products in this category
        const allCatProds = products.filter(p => (p.collectionIds ?? []).includes(col._id) && !p.deleted)
        // Items not yet in OA (filtered for search)
        const catProds    = allCatProds.filter(p =>
          !(p.collectionIds ?? []).includes(oaColId) &&
          (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        const catProdsAll  = allCatProds.filter(p => !(p.collectionIds ?? []).includes(oaColId)) // unfiltered count
        const isOpen       = openCats.has(col._id)
        const allInOa      = allCatProds.length > 0 && allCatProds.every(p => (p.collectionIds ?? []).includes(oaColId))
        const isBulkBusy   = catAllLoading === col._id
        const catH         = categoryHours[col._id] ?? { from: '', to: '' }

        return (
          <div key={col._id} className='space-y-2'>

            {/* Category header row */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-stone-200 hover:border-stone-300'
            }`}>
              {/* Expand/collapse — left side */}
              <button type='button' onClick={() => toggleCat(col._id)} className='flex items-center gap-3 flex-1 text-left'>
                <span className='text-xl'>{CAT_ICONS[col.name] ?? DISH_ICON}</span>
                <span className={`font-semibold text-sm flex-1 ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>{col.name}</span>
                <span className={`text-xs mr-1 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>{catProdsAll.length}/{allCatProds.length}</span>
              </button>
              {/* Add All / Remove All */}
              <button type='button'
                onClick={() => handleCategoryBulkToggle(col)}
                disabled={!oaColId || isBulkBusy || allCatProds.length === 0}
                title={allInOa ? `Remove all ${col.name} from Order Ahead` : `Add all ${col.name} to Order Ahead`}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isBulkBusy ? 'animate-pulse' : ''
                } ${
                  allInOa
                    ? (isDark ? 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200')
                    : (isDark ? 'bg-teal-900/40 hover:bg-teal-700/60 text-teal-300 border border-teal-700/50' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200')
                }`}>
                {isBulkBusy ? '\u2026' : allInOa ? 'Remove All' : 'Add All'}
              </button>
              {/* Chevron */}
              <button type='button' onClick={() => toggleCat(col._id)}>
                <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
                  isOpen ? '' : '-rotate-90'
                }`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                </svg>
              </button>
            </div>

            {/* Category Windows mode: time picker (visible when expanded) */}
            {isOpen && oaMode === 'category' && (
              <div className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border ${
                isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-stone-50 border-stone-200'
              }`}>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>⏰ Service Hours</span>
                <div className='flex items-center gap-2 flex-wrap'>
                  <input type='time' value={catH.from}
                    onChange={e => updateCatHours(col._id, 'from', e.target.value)}
                    className={`text-sm border rounded-lg px-2 py-1.5 outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-stone-200 text-slate-900'
                    }`}
                  />
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>to</span>
                  <input type='time' value={catH.to}
                    onChange={e => updateCatHours(col._id, 'to', e.target.value)}
                    className={`text-sm border rounded-lg px-2 py-1.5 outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-stone-200 text-slate-900'
                    }`}
                  />
                  <button onClick={() => saveCatHoursEntry(col._id)} disabled={hoursSaving}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      isDark ? 'bg-teal-700 hover:bg-teal-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}>
                    {hoursSaving ? '\u2026' : 'Save'}
                  </button>
                </div>
                <span className={`text-xs ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>Leave blank = full order hours</span>
              </div>
            )}

            {/* Items list */}
            {isOpen && (
              <div className='space-y-2'>
                {catProds.length === 0 ? (
                  <div className={`rounded-xl border border-dashed px-5 py-5 text-center ${
                    isDark ? 'border-slate-600' : 'border-stone-300'
                  }`}>
                    <p className={`text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {allInOa && allCatProds.length > 0
                        ? `All ${col.name} items are in Order Ahead \u2014 click \u201cRemove All\u201d to return them`
                        : searchQuery
                          ? 'No items match your search'
                          : 'No items in this category'}
                    </p>
                  </div>
                ) : catProds.map(p => renderProductRow(p, { inOa: false, catName: col.name }))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
