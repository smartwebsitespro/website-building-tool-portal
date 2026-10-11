// MenuManagerPanel.tsx -- Pacific Table Menu Manager (Embedded Admin Panel)
// v3.17 | 10/02/2026 2:47 AM PDT -- Fix: garbled ellipsis in placeholders + any other garbles
// v3.16 | 10/02/2026 2:31 AM PDT -- Feat: multi-select + bulk delete in Manage Categories
// v3.15 | 10/02/2026 2:26 AM PDT -- Fix: delete category optimistic (no fetchData), remove double-checkmark from toast
// v3.14 | 10/02/2026 1:54 AM PDT -- Feat: Happy Hour Price field ([happy-hour:XX] tag, mirrors dinner price pattern)
// v3.13 | 10/02/2026 12:29 AM PDT -- Fix: 17 garbled chars (em dash, ellipsis, sparkle, apostrophe)
// v3.12 | 10/02/2026 12:18 AM PDT -- Feat: Manage Categories panel (create/delete GHL collections without leaving admin)
// v3.11 | 09/30/2026 11:51 PM PDT -- Rename price label to 'Ask Server For Price'
// v3.10 | 09/30/2026 11:31 PM PDT -- mmFormatPrice: remap 'Market Price' name -> 'Ask Server For Price'
// v3.9 | 09/30/2026 11:26 PM PDT -- Update $0 price label + placeholder to 'Ask Server For Price'
// v3.8 | 09/30/2026 11:10 PM PDT -- Fix: AI Generate wired to Agent Studio (/admin/ai-generate, dishName, category, restaurantName)
// v3.7 | 09/25/2026 1:08 AM PDT -- Feat: dynamic categories — remove MENU_CATEGORIES allowlist filter; all GHL collections (except Order Ahead) shown automatically; no code change or sync needed for new categories
// v3.6 | 09/25/2026 12:59 AM PDT -- Fix: fetchData merges GHL collections into KV state so newly created collections (e.g. Specials) appear without Force Sync; auto-reseeds KV when merge finds gaps
// v3.5 | 09/25/2026 12:51 AM PDT -- Fix: add Specials to MENU_CATEGORIES + CATEGORY_ICONS so seedMenuKV includes it and accordion shows
// v3.4 | 09/24/2026 2:50 PM PDT -- Remove OA accordion, OA row pill, toggleOrderAhead; OA managed in OrderAheadPage. Fix formTogo init to use availableInStore.
// v3.3 | 09/24/2026 4:12 AM PDT -- renderCategorySection: show OA accordion even when empty (empty-state hint); other categories still hide when empty
// v3.2 | 09/24/2026 4:05 AM PDT -- fetchData self-heals: if Order Ahead missing from KV, fetches live from GHL and merges; fixes OA toggle 'collection not found' and silent edit fail
// v3.1 | 09/24/2026 3:50 AM PDT -- Fix OA badge condition (collection-only, not availableInStore); remove availableInStore side-effect from OA toggle; fix garbled em dashes
// v3.0 | 09/24/2026 -- Multi-tenant: accept AdminPageProps; drop PANEL_CONFIG hardcoding
// v2.9 | 09/22/2026 -- OA pill <-> To-Go toggle full sync fix
// v2.8 | 09/22/2026 -- type='button' on OA pill + accordion toggles + Collapse All (prevents form-submit page reload)
// v2.7 | 09/22/2026 -- OA toggle: replace fetchData() with setProducts(seeded) -- no spinner, instant inline update
// v2.6 | 09/22/2026 -- Accordion section borders; OA button pulse-in-place (no grey flash)
// v2.5 | 09/22/2026 -- Category accordions (all closed by default); Collapse All / Expand All
// v2.4 | 09/29/2026 11:02 PM PDT -- Feat: Dinner Price field ([dinner:XX] tag embedded in description; stripped from display; shown on dinner route)
// v2.3 | 09/17/2026 -- Search bar, AI description generator, light mode fix for categories/labels, full-width image preview, media.packedhousehq.com URL
// v2.2 | 09/17/2026 -- Add Reseed Menu button: browser-side full detail+price fetch bypasses Cloudflare 50 subrequest limit in worker
// v2.1 | 09/17/2026 -- fetchData uses direct GHL product API (all 74 products visible); seedMenuKV filters to menu cats only; Uncategorized section for unassigned products
// v2.0 | 09/10/2026 -- KV wiring: seed cache after every create/edit/delete/restore
// v1.9 | 09/05/2026 -- Rewired to niche-engine-worker for packed-house-portal
// v1.8 | 05-28-2026 5:39 PM PDT
// Changes: Panel root padding changed from pr-1 to px-1 for equal left/right margins.

import { useState, useEffect, useCallback, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import type { AdminPageProps } from './adminShared'


const R2_HOST = 'media.packedhousehq.com'

const MENU_CATEGORIES = [
  'Lunch', 'Dinner',
  'Starters', 'Chowders & Salads', 'Burgers & Sandwiches',
  'House Specialties', 'Fish & Chips', 'Firefish Favorites',
  'Light Lunches', 'Mesquite Charcoal Broiler', 'Pasta',
  'Steaks & Combinations', 'Locals Specials', 'Specials',
  'Beer', 'Wine', 'Cocktails', 'Mocktails', 'Kids Menu',
] as const
type MenuCategory = typeof MENU_CATEGORIES[number]

const CATEGORY_ICONS: Record<string, string> = {
  Lunch                      : '\u{1F957}',
  Dinner                     : '\u{1F37D}\uFE0F',
  Starters                   : '\u{1F959}',
  'Chowders & Salads'        : '\u{1F372}',
  'Burgers & Sandwiches'     : '\u{1F354}',
  'House Specialties'        : '\u2B50',
  'Fish & Chips'             : '\u{1F41F}',
  'Firefish Favorites'       : '\u{1F525}',
  'Light Lunches'            : '\u{1F96A}',
  'Mesquite Charcoal Broiler': '\u{1F356}',
  Pasta                      : '\u{1F35D}',
  'Steaks & Combinations'    : '\u{1F969}',
  'Locals Specials'          : '\u{1F31F}',
  Specials                   : '\u{1F4AB}',
  Beer                       : '\u{1F37A}',
  Wine                       : '\u{1F377}',
  Cocktails                  : '\u{1F379}',
  Mocktails                  : '\u{1F964}',
  'Kids Menu'                : '\u{1F9D2}',
}

const TOGO_ICON  = '\u{1F961}'

const DIETARY_OPTIONS: { label: string; icon: string }[] = [
  { label: 'Vegetarian', icon: '\u{1F33F}' },
  { label: 'Vegan',      icon: '\u{1F331}' },
  { label: 'Gluten-Free',icon: 'GF' },
  { label: 'Dairy-Free', icon: 'DF' },
  { label: 'Seasonal',   icon: '\u{1F342}' },
]
const STAR_ICON  = '\u2B50'
const EMPTY_ICON = '\u{1F37D}\uFE0F'

const DEF_COLORS: BrandColors = { primary: '#0ea5e9', accent: '#0ea5e9', secondary: '#64748B' }

const PILL_COLORS = [
  'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600/50',
  'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-600/50',
  'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-600/50',
  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-600/50',
  'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-600/50',
  'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-600/50',
]

interface Price {
  _id      : string
  name     : string
  amount   : number
  currency : string
  type     : string
  deleted? : boolean
}

interface Product {
  _id              : string
  name             : string
  description?     : string
  productType      : string
  availableInStore : boolean
  collectionIds?   : string[]
  slug?            : string
  status?          : string
  image?           : string
  deleted?         : boolean
  prices           : Price[]
}

interface Collection {
  _id  : string
  name : string
  slug : string
}

interface BrandColor {
  _id   : string
  hex   : string
  label : string
}

interface BrandColors {
  primary  : string
  accent   : string
  secondary: string
}

interface UploadSizes {
  original  : number
  converted : number
}

interface TrashImage {
  trashKey   : string
  publicUrl  : string
  productName: string
  productId  : string
  originalKey: string
  deletedAt  : string
  expiresAt  : string
  timeLabel  : string
  msLeft     : number
}

interface TrashProduct {
  trashKey      : string
  productName   : string
  productId     : string
  deletedAt     : string
  expiresAt     : string
  timeLabel     : string
  msLeft        : number
  hasImage      : boolean
  imageTrashKey : string
  imagePublicUrl: string
  priceDisplay  : string
  collectionIds : string[]
}

type UploadStatus = 'idle' | 'converting' | 'uploading' | 'done' | 'error'

async function toWebP(file: File, maxWidth = 1000, quality = 0.82): Promise<Blob> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const scale   = Math.min(1, maxWidth / img.width)
      const canvas  = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(src)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('WebP conversion failed -- try a different image')),
        'image/webp',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Could not read image file')) }
    img.src = src
  })
}

function mmAuthHeaders(locationId: string) {
  return {
    'Content-Type'  : 'application/json',
    'X-Context-Key' : 'oftheuniverse',
    'X-Location-Id' : locationId,
  }
}

function mmFormatPrice(prices: Price[]): string {
  if (!prices?.length) return '\u2014'
  const active = prices.filter(p => !p.deleted)
  if (!active.length) return '\u2014'
  const p = active[0]
  if (p.amount === 0) return (p.name && p.name !== 'Market Price') ? p.name : 'Ask Server For Price'
  return `$${p.amount.toFixed(2)}`
}

function mmSlugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function mmClearCache() {
  try {
    sessionStorage.removeItem('scr_menu_data')
    sessionStorage.removeItem('scr_togo_data')
    localStorage.setItem('scr_menu_cache_invalid', Date.now().toString())
  } catch { /* ignore */ }
}

function mmProductPayload(p: Product, overrides: Partial<Product> & { locationId: string }) {
  return {
    name            : p.name,
    description     : p.description     ?? '',
    productType     : p.productType,
    availableInStore: p.availableInStore,
    collectionIds   : p.collectionIds   ?? [],
    ...(p.slug   ? { slug:   p.slug   } : {}),
    ...(p.status ? { status: p.status } : {}),
    ...overrides,
  }
}

function mmFormatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function mmIsR2(url: string): boolean { return url.includes(R2_HOST) }

/** Seed the worker KV cache with fresh menu data after any write operation. */
async function seedMenuKV(cols: Collection[], prods: Product[], kvCfg: { workerUrl: string; locationId: string }): Promise<void> {
  // All collections except Order Ahead — no hardcoded allowlist; new GHL categories appear automatically
  const menuCols  = cols.filter(c => c.name !== 'Order Ahead')
  const menuIds   = new Set(menuCols.map(c => c._id))
  const menuProds = prods.filter(p => !p.deleted && (p.collectionIds ?? []).some((id: string) => menuIds.has(id)))
  try {
    await fetch(`${kvCfg.workerUrl}/admin/kv`, {
      method : 'PUT',
      headers: {
        'Content-Type' : 'application/json',
        'X-Context-Key': 'oftheuniverse',
        'X-Location-Id': kvCfg.locationId,
      },
      body: JSON.stringify({
        key  : `${kvCfg.locationId}/cache/menu`,
        value: { collections: menuCols, products: menuProds },
      }),
    })
  } catch { /* non-critical — menu still works, just not instant-updated */ }
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      role='switch'
      aria-checked={enabled}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-sky-500' : 'bg-violet-400'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

export default function MenuManagerPanel({ config, isDark, t }: AdminPageProps) {
  const [collections,   setCollections]   = useState<Collection[]>([])
  const [products,      setProducts]      = useState<Product[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [brandColors,   setBrandColors]   = useState<BrandColors>(DEF_COLORS)
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null)
  const [panelOpen,     setPanelOpen]     = useState(false)
  const [showCatMgr,   setShowCatMgr]   = useState(false)
  const [newCatName,   setNewCatName]   = useState('')
  const [catCreating,  setCatCreating]  = useState(false)
  const [catDeleting,  setCatDeleting]  = useState<string|null>(null)
  const [catSelected,  setCatSelected]  = useState<Set<string>>(new Set())
  const [panelMode,     setPanelMode]     = useState<'create' | 'edit'>('create')
  const [editProduct,   setEditProduct]   = useState<Product | null>(null)
  const [formName,      setFormName]      = useState('')
  const [formDesc,      setFormDesc]      = useState('')
  const [formPrice,     setFormPrice]     = useState('')
  const [formDinnerPrice, setFormDinnerPrice] = useState('')
  const [formHappyHourPrice, setFormHappyHourPrice] = useState('')
  const [formCollIds,   setFormCollIds]   = useState<string[]>([])
  const [formTogo,      setFormTogo]      = useState(false)
  const [formDietary,   setFormDietary]   = useState<string[]>([])
  const [formImageUrl,  setFormImageUrl]  = useState('')
  const [formSaving,    setFormSaving]    = useState(false)
  const [formError,     setFormError]     = useState<string | null>(null)
  const [uploadStatus,  setUploadStatus]  = useState<UploadStatus>('idle')
  const [uploadSizes,   setUploadSizes]   = useState<UploadSizes | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [lastSavedId,   setLastSavedId]   = useState<string | null>(null)
  const [scrollToCat,   setScrollToCat]   = useState<string | null>(null)
  const [trashImages,   setTrashImages]   = useState<TrashImage[]>([])
  const [trashProducts, setTrashProducts] = useState<TrashProduct[]>([])
  const [trashOpen,     setTrashOpen]     = useState(false)
  const [trashModal,    setTrashModal]    = useState<TrashImage | null>(null)
  const [trashLoading,  setTrashLoading]  = useState(false)
  const [restoringKey,  setRestoringKey]  = useState<string | null>(null)
  const [restoredUrl,   setRestoredUrl]   = useState<string | null>(null)
  const [reseeding,     setReseeding]     = useState(false)
  const [showAdvanced,  setShowAdvanced]  = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [aiGenerating,  setAiGenerating]  = useState(false)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [logoUrl,       setLogoUrl]       = useState(config.logoUrl ?? '')
  const [logoUrlLight,  setLogoUrlLight]  = useState('')

  useEffect(() => {
    if (!lastSavedId || panelOpen) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-product-id="${lastSavedId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setLastSavedId(null)
    }, 350)
    return () => clearTimeout(timer)
  }, [lastSavedId, panelOpen])

  useEffect(() => {
    if (!scrollToCat) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-category="${scrollToCat}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setScrollToCat(null)
    }, 400)
    return () => clearTimeout(timer)
  }, [scrollToCat])

  useEffect(() => {
    async function fetchBrand() {
      try {
        const r1 = await fetch(
          `${config.workerUrl}/brand-boards/${config.locationId}`,
          { headers: mmAuthHeaders(config.locationId) }
        )
        if (!r1.ok) return
        const d1    = await r1.json()
        const board = d1.brandBoards?.[0]
        if (!board) return
        const r2 = await fetch(
          `${config.workerUrl}/brand-boards/${config.locationId}/${board._id}`,
          { headers: mmAuthHeaders(config.locationId) }
        )
        if (!r2.ok) return
        const d2     = await r2.json()
        const colors = d2.colors as BrandColor[] | undefined
        if (colors?.length) {
          const get = (label: string, fallback: string) =>
            colors.find(c => c.label === label)?.hex ?? fallback
          setBrandColors({
            primary  : get('Primary',   DEF_COLORS.primary),
            accent   : get('Accent',    DEF_COLORS.accent),
            secondary: get('Secondary', DEF_COLORS.secondary),
          })
        }
        if (d2.logoUrl)      setLogoUrl(d2.logoUrl)
        if (d2.logoUrlLight) setLogoUrlLight(d2.logoUrlLight)
      } catch { /* fallback */ }
      // Also fetch KV config for logo URLs
      try {
        const cfgRes = await fetch(`${config.workerUrl}/admin/config`, {
          headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': config.locationId }
        })
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json()
          if (cfgData.config?.logoUrl)      setLogoUrl(cfgData.config.logoUrl)
          if (cfgData.config?.logoUrlLight) setLogoUrlLight(cfgData.config.logoUrlLight)
        }
      } catch { /* fallback */ }
    }
    fetchBrand()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (trashModal)   { setTrashModal(null);   return }
      if (deleteTarget) { setDeleteTarget(null); return }
      if (panelOpen)    { closePanel();          return }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [panelOpen, deleteTarget, trashModal])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // KV-only: products have full details (collectionIds + prices). GHL list API omitted -- it strips collectionIds.
      // Products added directly in GHL won't appear here until Force Menu Sync is run.
      const menuRes = await fetch(`${config.workerUrl}/menu`, { headers: mmAuthHeaders(config.locationId), cache: 'no-store' })
      if (!menuRes.ok) throw new Error(`Menu API returned ${menuRes.status}`)
      const menuData  = await menuRes.json()
      const menuProds = (menuData.products ?? []).filter((p: Product) => !p.deleted)
      setProducts(menuProds)
      let kvCols: Collection[] = menuData.collections ?? []
      // Merge in any GHL collections missing from KV cache (e.g. newly created 'Specials')
      try {
        const colRes = await fetch(`${config.workerUrl}/products/collections?altId=${config.locationId}&altType=location&limit=50`, { headers: mmAuthHeaders(config.locationId), cache: 'no-store' })
        if (colRes.ok) {
          const colData = await colRes.json()
          const ghlCols: Collection[] = colData.data ?? []
          const kvColIds = new Set(kvCols.map((c: Collection) => c._id))
          const newCols  = ghlCols.filter((c: Collection) => !kvColIds.has(c._id))
          if (newCols.length > 0) {
            kvCols = [...kvCols, ...newCols]
            // Write merged collections back so future seedMenuKV calls have the full set
            await seedMenuKV(kvCols, menuProds, config)
          }
        }
      } catch { /* non-critical — GHL collections merge is best-effort */ }
      setCollections(kvCols.filter((c: Collection) => c.name !== 'Order Ahead'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); loadTrash() }, [fetchData])

  async function loadTrash() {
    setTrashLoading(true)
    try {
      await fetch(`${config.workerUrl}/purge-expired-trash`, { method: 'POST', headers: mmAuthHeaders(config.locationId) })
      const res  = await fetch(`${config.workerUrl}/list-trash`, { headers: mmAuthHeaders(config.locationId) })
      const data = await res.json()
      setTrashImages(data.images   ?? [])
      setTrashProducts(data.products ?? [])
    } catch { /* non-critical */ }
    finally { setTrashLoading(false) }
  }

  async function reseedFullMenu() {
    setReseeding(true)
    try {
      const [colRes, listRes] = await Promise.all([
        fetch(`${config.workerUrl}/products/collections?altId=${config.locationId}&altType=location&limit=50`, { headers: mmAuthHeaders(config.locationId), cache: 'no-store' }),
        fetch(`${config.workerUrl}/products/?locationId=${config.locationId}&limit=300`, { headers: mmAuthHeaders(config.locationId), cache: 'no-store' }),
      ])
      const allCols  = colRes.ok  ? ((await colRes.json()).data  ?? []) : []
      const allProds = listRes.ok ? ((await listRes.json()).products ?? []).filter((p: Product) => !p.deleted) : []
      // Fetch detail + price for every product in batches of 4 (browser-side -- no worker subrequest limit)
      const withDetails: Product[] = []
      for (let i = 0; i < allProds.length; i += 4) {
        if (i > 0) await new Promise(r => setTimeout(r, 200))
        const batch   = allProds.slice(i, i + 4)
        const results = await Promise.all(batch.map(async (p: Product) => {
          try {
            const dr   = await fetch(`${config.workerUrl}/products/${p._id}?locationId=${config.locationId}`, { headers: mmAuthHeaders(config.locationId) })
            const dd   = dr.ok ? await dr.json() : {}
            const cids = (dd.collectionIds && dd.collectionIds.length > 0) ? dd.collectionIds : (p.collectionIds || [])
            let prices = dd.prices ?? p.prices ?? []
            try {
              const pr = await fetch(`${config.workerUrl}/products/${p._id}/price?locationId=${config.locationId}`, { headers: mmAuthHeaders(config.locationId) })
              if (pr.ok) { const pd = await pr.json(); prices = pd.list ?? pd.prices ?? prices }
            } catch { /* price optional */ }
            return { ...p, collectionIds: cids, prices }
          } catch { return { ...p } }
        }))
        withDetails.push(...results)
      }
      await seedMenuKV(allCols, withDetails, config)
      await fetchData()
      showSuccess(`Menu reseeded — ${withDetails.length} products, ${withDetails.filter((p: Product) => (p.prices ?? []).length > 0).length} with prices.`)
    } catch (err) {
      showSuccess('Reseed failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setReseeding(false)
    }
  }

  async function softDeleteImage(imageUrl: string, productName: string, productId: string): Promise<boolean> {
    if (!mmIsR2(imageUrl)) return false
    try {
      const res = await fetch(`${config.workerUrl}/soft-delete-image`, {
        method : 'POST',
        headers: mmAuthHeaders(config.locationId),
        body   : JSON.stringify({ imageUrl, productName, productId }),
      })
      return res.ok
    } catch { return false }
  }

  async function handleRestoreImage(trashKey: string) {
    setRestoringKey(trashKey)
    try {
      const res  = await fetch(`${config.workerUrl}/restore-image`, {
        method : 'POST',
        headers: mmAuthHeaders(config.locationId),
        body   : JSON.stringify({ trashKey }),
      })
      const data = await res.json()
      if (data.success) {
        setTrashImages(prev => prev.filter(t => t.trashKey !== trashKey))
        setTrashModal(null)
        mmClearCache()
        await fetchData()
        if (data.ghlUpdated) showSuccess('Image restored and product updated.')
        else setRestoredUrl(data.restoredUrl)
      } else {
        showSuccess(`Restore failed: ${data.error ?? 'unknown error'}`)
      }
    } catch { showSuccess('Restore failed -- check connection') }
    finally { setRestoringKey(null) }
  }

  async function handleRestoreProduct(trashKey: string) {
    setRestoringKey(trashKey)
    try {
      const res  = await fetch(`${config.workerUrl}/restore-product`, {
        method : 'POST',
        headers: mmAuthHeaders(config.locationId),
        body   : JSON.stringify({ trashKey }),
      })
      const data = await res.json()
      if (data.success) {
        setTrashProducts(prev => prev.filter(t => t.trashKey !== trashKey))
        // Seed KV: fetch restored product (single call, no rate-limit issue) then add to cache
        if (data.newProductId) {
          try {
            const pr = await fetch(`${config.workerUrl}/products/${data.newProductId}`, { headers: mmAuthHeaders(config.locationId) })
            if (pr.ok) {
              const pd: Product = await pr.json()
              await seedMenuKV(collections, [...products.filter(p => p._id !== data.newProductId), pd], config)
            }
          } catch { /* non-critical */ }
        }
        mmClearCache()
        await fetchData()
        await loadTrash()
        setLastSavedId(data.newProductId)
        showSuccess(`"${data.productName}" restored — menu live.`)
      } else {
        showSuccess(`Restore failed: ${data.error ?? 'unknown error'}`)
      }
    } catch { showSuccess('Restore failed -- check connection') }
    finally { setRestoringKey(null) }
  }

  function resetUpload() { setUploadStatus('idle'); setUploadSizes(null) }

  function parseDietary(desc: string): string[] {
    const m = desc.match(/\[dietary:\s*([^\]]+)\]/)
    if (!m) return []
    return m[1].split(',').map(s => s.trim()).filter(Boolean)
  }
  function cleanDesc(desc: string): string {
    return desc.replace(/\s*\[dietary:[^\]]*\]/g, '').replace(/\s*\[dinner:[^\]]*\]/g, '').replace(/\s*\[happy-hour:[^\]]*\]/g, '').trim()
  }
  function parseDinnerPrice(desc: string): string {
    const m = desc.match(/\[dinner:([^\]]*)\]/)
    return m ? m[1] : ''
  }
  function parseHappyHourPrice(desc: string): string {
    const m = desc.match(/\[happy-hour:([^\]]*)\]/)
    return m ? m[1] : ''
  }
  function buildDesc(text: string, tags: string[], dinnerPrice?: string, happyHourPrice?: string): string {
    const clean = cleanDesc(text)
    let result = tags.length > 0 ? `${clean} [dietary: ${tags.join(', ')}]` : clean
    if (dinnerPrice && parseFloat(dinnerPrice) > 0) result += ` [dinner:${dinnerPrice}]`
    if (happyHourPrice && parseFloat(happyHourPrice) > 0) result += ` [happy-hour:${happyHourPrice}]`
    return result
  }

  async function createCollection() {
    if (!newCatName.trim()) return
    setCatCreating(true)
    try {
      const res = await fetch(`${config.workerUrl}/admin/collections`, {
        method: 'POST',
        headers: { ...mmAuthHeaders(config.locationId), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setSuccessMsg('Error: ' + (d.error || 'create failed')); setTimeout(() => setSuccessMsg(null), 3000); return }
      const created = newCatName.trim()
      setNewCatName('')
      await fetchData()
      setSuccessMsg('Category "' + created + '" created')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch { setSuccessMsg('Error: network failed'); setTimeout(() => setSuccessMsg(null), 3000) }
    finally { setCatCreating(false) }
  }

  async function deleteCollection(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"? Products will become uncategorized.`)) return
    setCatDeleting(id)
    try {
      const res = await fetch(`${config.workerUrl}/admin/collections/${id}`, {
        method: 'DELETE',
        headers: mmAuthHeaders(config.locationId),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setSuccessMsg('Error: ' + (d.error || 'delete failed')); setTimeout(() => setSuccessMsg(null), 3000); return }
      setCollections(prev => prev.filter(c => c._id !== id))
      setSuccessMsg('Category "' + name + '" deleted')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch { setSuccessMsg('Error: network failed'); setTimeout(() => setSuccessMsg(null), 3000) }
    finally { setCatDeleting(null) }
  }

  async function deleteSelectedCollections() {
    const toDelete = collections.filter(c => catSelected.has(c._id) && c.name !== 'Order Ahead')
    if (toDelete.length === 0) return
    const plural = toDelete.length > 1 ? 'ies' : 'y'
    if (!window.confirm(`Delete ${toDelete.length} categor${plural}? Products will become uncategorized.`)) return
    setCatDeleting('bulk')
    try {
      await Promise.all(toDelete.map(c =>
        fetch(`${config.workerUrl}/admin/collections/${c._id}`, { method: 'DELETE', headers: mmAuthHeaders(config.locationId) })
      ))
      const deletedIds = new Set(toDelete.map(c => c._id))
      setCollections(prev => prev.filter(c => !deletedIds.has(c._id)))
      setCatSelected(new Set())
      setSuccessMsg(`${toDelete.length} categor${plural} deleted`)
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch { setSuccessMsg('Error: bulk delete failed'); setTimeout(() => setSuccessMsg(null), 3000) }
    finally { setCatDeleting(null) }
  }

  function openCreate() {
    setFormName(''); setFormDesc(''); setFormPrice(''); setFormDinnerPrice(''); setFormHappyHourPrice('')
    setFormCollIds([]); setFormTogo(false); setFormImageUrl(''); setFormDietary([])
    setFormError(null); resetUpload(); setEditProduct(null)
    setPanelMode('create'); setPanelOpen(true)
  }

  function openEdit(product: Product) {
    const active = product.prices?.filter(p => !p.deleted) ?? []
    setFormName(product.name)
    setFormDesc(cleanDesc(product.description ?? ''))
    setFormDietary(parseDietary(product.description ?? ''))
    setFormDinnerPrice(parseDinnerPrice(product.description ?? ''))
    setFormHappyHourPrice(parseHappyHourPrice(product.description ?? ''))
    setFormPrice(active[0]?.amount ? String(active[0].amount) : '')
    setFormCollIds(product.collectionIds ?? [])
    setFormTogo(product.availableInStore)
    setFormImageUrl(product.image ?? '')
    setFormError(null); resetUpload()
    setEditProduct(product); setPanelMode('edit'); setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false); setFormError(null); resetUpload()
    setTimeout(() => setEditProduct(null), 300)
  }

  function toggleFormCollection(id: string) {
    setFormCollIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus('converting'); setUploadSizes(null); setFormError(null)
    try {
      const webpBlob = await toWebP(file)
      setUploadStatus('uploading')
      const form = new FormData()
      form.append('file', webpBlob, file.name.replace(/\.\w+$/, '.webp'))
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': config.locationId }, body: form })
      const data = await res.json()
      if (!data.url) throw new Error('No URL returned from upload.')
      setFormImageUrl(data.url)
      setUploadSizes({ original: file.size, converted: webpBlob.size })
      setUploadStatus('done')
    } catch (err) {
      setUploadStatus('error')
      setFormError(err instanceof Error ? err.message : 'Upload failed. Try pasting a URL instead.')
    } finally { e.target.value = '' }
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('Name is required.'); return }
    setFormSaving(true); setFormError(null)
    const headers = mmAuthHeaders(config.locationId)
    try {
      if (panelMode === 'edit' && editProduct) {
        const oldImageUrl = editProduct.image ?? ''
        const imageToSave = formImageUrl.trim() || oldImageUrl
        const res = await fetch(`${config.workerUrl}/products/${editProduct._id}`, {
          method: 'PUT',
          headers,
          body  : JSON.stringify(mmProductPayload(editProduct, {
            name            : formName.trim(),
            description     : buildDesc(formDesc, formDietary, formDinnerPrice, formHappyHourPrice),
            collectionIds   : formCollIds,
            availableInStore: formTogo,
            ...(imageToSave ? { image: imageToSave } : {}),
            locationId      : config.locationId,
          })),
        })
        if (!res.ok) throw new Error('Failed to update product.')
        const priceAmt = parseFloat(formPrice)
        const active   = editProduct.prices?.filter(p => !p.deleted) ?? []
        if (!isNaN(priceAmt)) {
          if (active.length) {
            await fetch(`${config.workerUrl}/products/${editProduct._id}/price/${active[0]._id}`, {
              method: 'PUT',
              headers,
              body  : JSON.stringify({
                name      : active[0].name,
                type      : active[0].type,
                currency  : active[0].currency,
                amount    : priceAmt,
                locationId: config.locationId,
              }),
            })
          } else {
            await fetch(`${config.workerUrl}/products/${editProduct._id}/price`, {
              method: 'POST',
              headers,
              body  : JSON.stringify({ name: 'Standard', type: 'one_time', currency: 'USD', amount: priceAmt, locationId: config.locationId }),
            })
          }
        }
        const newImageUrl = formImageUrl.trim()
        const replaced    = oldImageUrl && mmIsR2(oldImageUrl) && newImageUrl && newImageUrl !== oldImageUrl
        const savedId     = editProduct._id
        const savedName   = formName.trim()
        // Seed KV with updated product before fetchData so cache is fresh
        const updatedProd: Product = {
          ...editProduct,
          name            : formName.trim(),
          description     : buildDesc(formDesc, formDietary, formDinnerPrice, formHappyHourPrice),
          collectionIds   : formCollIds,
          availableInStore: formTogo,
          ...(newImageUrl ? { image: newImageUrl } : {}),
          prices: (() => {
            const priceAmt2 = parseFloat(formPrice)
            if (isNaN(priceAmt2)) return editProduct.prices
            const active2 = editProduct.prices?.filter(p => !p.deleted) ?? []
            if (active2.length) return editProduct.prices.map(p => p._id === active2[0]._id ? { ...p, amount: priceAmt2 } : p)
            return [{ _id: 'new', name: 'Standard', amount: priceAmt2, currency: 'USD', type: 'one_time' }]
          })(),
        }
        const seededProds = products.map(p => p._id === savedId ? updatedProd : p)
        await seedMenuKV(collections, seededProds, config)
        setLastSavedId(savedId)
        mmClearCache()
        await fetchData()
        closePanel()
        showSuccess(`"${savedName}" updated — menu live.`)
        if (replaced) softDeleteImage(oldImageUrl, savedName, savedId).then(() => loadTrash())
      } else {
        const itemName = formName.trim().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        const prodRes  = await fetch(`${config.workerUrl}/products/`, {
          method: 'POST',
          headers,
          body  : JSON.stringify({
            name            : itemName,
            description     : buildDesc(formDesc, formDietary, formDinnerPrice, formHappyHourPrice),
            locationId      : config.locationId,
            productType     : 'PHYSICAL',
            availableInStore: formTogo,
            collectionIds   : formCollIds,
            slug            : mmSlugify(formName.trim()),
            ...(formImageUrl.trim() ? { image: formImageUrl.trim() } : {}),
          }),
        })
        if (!prodRes.ok) throw new Error('Failed to create product.')
        const prodData = await prodRes.json()
        const priceAmt = parseFloat(formPrice)
        if (!isNaN(priceAmt) && prodData._id) {
          await fetch(`${config.workerUrl}/products/${prodData._id}/price`, {
            method: 'POST',
            headers,
            body  : JSON.stringify({ name: 'Standard', type: 'one_time', currency: 'USD', amount: priceAmt, locationId: config.locationId }),
          })
        }
        // Seed KV with new product before fetchData
        if (prodData._id) {
          const priceAmt2 = parseFloat(formPrice)
          const newProd: Product = {
            _id             : prodData._id,
            name            : itemName,
            description     : buildDesc(formDesc, formDietary, formDinnerPrice, formHappyHourPrice),
            productType     : 'PHYSICAL',
            availableInStore: formTogo,
            collectionIds   : formCollIds,
            ...(formImageUrl.trim() ? { image: formImageUrl.trim() } : {}),
            prices: isNaN(priceAmt2) ? [] : [{ _id: 'kv-tmp', name: 'Standard', amount: priceAmt2, currency: 'USD', type: 'one_time' }],
          }
          await seedMenuKV(collections, [...products, newProd], config)
          setLastSavedId(prodData._id)
        }
        mmClearCache()
        await fetchData()
        closePanel()
        showSuccess(`"${itemName}" created — menu live.`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setFormSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const deletedCol = collections.find(c => deleteTarget.collectionIds?.includes(c._id))
    try {
      const res = await fetch(`${config.workerUrl}/soft-delete-product`, {
        method : 'POST',
        headers: mmAuthHeaders(config.locationId),
        body   : JSON.stringify({ productId: deleteTarget._id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete product')
      }
      // Seed KV with product removed before fetchData
      const deletedId = deleteTarget._id
      await seedMenuKV(collections, products.filter(p => p._id !== deletedId), config)
      mmClearCache()
      const name = deleteTarget.name
      setDeleteTarget(null)
      await fetchData()
      await loadTrash()
      if (deletedCol) setScrollToCat(deletedCol.name)
      showSuccess(`"${name}" deleted — menu live.`)
    } catch (err) {
      showSuccess(err instanceof Error ? err.message : 'Delete failed.')
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  function renderProductRow(product: Product, currentCol: Collection) {
    const allCols = collections.filter(c => c.name.toLowerCase() !== 'special' && product.collectionIds?.includes(c._id))
    const price     = mmFormatPrice(product.prices)
    return (
      <div
        key={`${product._id}-${currentCol._id}`}
        data-product-id={product._id}
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border bg-white border-stone-200 hover:border-stone-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg overflow-hidden border bg-stone-100 border-stone-200 dark:bg-slate-700 dark:border-slate-600/50">
          {product.image
            ? <img src={product.image} alt={product.name} loading='lazy' className='w-full h-full object-cover' />
            : <div className='w-full h-full flex items-center justify-center text-lg text-slate-500'>{CATEGORY_ICONS[currentCol.name as MenuCategory] ?? EMPTY_ICON}</div>
          }
        </div>
        <div className='flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3'>
          <div className='flex-1 min-w-0 flex items-center gap-1.5 flex-wrap'>
            <a
              href={`${config.menuUrl}?tab=${encodeURIComponent(currentCol.name)}`}
              target='_blank'
              rel='noopener noreferrer'
              className="font-medium text-sm truncate hover:underline text-slate-900 dark:text-slate-100"
            >
              {product.name}
            </a>

            {allCols.map(c => (
              <span key={c._id} className="text-xs border rounded-full px-1.5 py-0.5 leading-none bg-stone-100 text-stone-600 border-stone-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                {CATEGORY_ICONS[c.name as MenuCategory] ?? EMPTY_ICON} {c.name}
              </span>
            ))}
          </div>
          <div className='flex items-center gap-2 sm:gap-3 flex-shrink-0'>
            <span className='text-sm font-bold' style={{ color: brandColors.accent }}>{price}</span>
            <button
              onClick={() => openEdit(product)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-sky-500 hover:bg-sky-400 text-white dark:bg-sky-600 dark:hover:bg-sky-500"
            >Edit</button>
            <button
              onClick={() => setDeleteTarget(product)}
              className='text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-red-500 hover:bg-red-400 text-white dark:bg-red-600 dark:hover:bg-red-500'
            >Delete</button>

          </div>
        </div>
      </div>
    )
  }



  async function handleAiGenerate() {
    if (!formName) return
    setAiGenerating(true)
    try {
      const cats = collections.filter(c => formCollIds.includes(c._id)).map(c => c.name).join(', ')
      const res = await fetch(`${config.workerUrl}/admin/ai-generate`, {
        method: 'POST',
        headers: { ...mmAuthHeaders(config.locationId), 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: formName, category: cats, restaurantName: config.restaurantName || '', locationId: config.locationId })
      })
      const data = await res.json()
      if (data.description) setFormDesc(data.description)
    } catch { /* silently fail */ } finally { setAiGenerating(false) }
  }

  function toggleCategory(name: string) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  function renderCategorySection(col: Collection) {
    const catProducts = products.filter(p =>
      p.collectionIds?.includes(col._id) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    if (catProducts.length === 0) return null
    return (
      <div key={col._id} className='space-y-2' data-category={col.name}>
        <button type='button' onClick={() => toggleCategory(col.name)} className='flex items-center gap-2 px-3 w-full text-left py-3 rounded-xl border bg-white border-stone-200 hover:border-stone-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 transition-colors'>
          <span className='text-xl'>{CATEGORY_ICONS[col.name as MenuCategory] ?? EMPTY_ICON}</span>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex-1">{col.name}</h3>
          <span className='text-slate-500 text-xs'>{catProducts.length} item{catProducts.length !== 1 ? 's' : ''}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${openCategories.has(col.name) ? 'rotate-0' : '-rotate-90'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' /></svg>
        </button>
        {openCategories.has(col.name) && (
          <div className='space-y-2'>{catProducts.map(p => renderProductRow(p, col))}</div>
        )}
      </div>
    )
  }

  function renderUploadButton() {
    const isActive = uploadStatus === 'converting' || uploadStatus === 'uploading'
    const label =
      uploadStatus === 'converting' ? 'Converting\u2026' :
      uploadStatus === 'uploading'  ? 'Uploading\u2026'  :
      uploadStatus === 'done'       ? '\u2713 Done'       :
      uploadStatus === 'error'      ? 'Failed'            : 'Upload'
    const colorClass =
      uploadStatus === 'done'  ? 'border-green-700/60 text-green-400' :
      uploadStatus === 'error' ? 'border-red-700/60 text-red-400' : ''
    const isPrimary = uploadStatus !== 'done' && uploadStatus !== 'error'
    return (
      <label
        style={isPrimary ? { backgroundColor: brandColors.primary, borderColor: brandColors.primary, color: 'white' } : {}}
        className={`flex-shrink-0 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${colorClass} ${
        isActive ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      }`}>
        {label}
        <input type='file' accept='image/*' className='hidden' onChange={handleImageUpload} disabled={isActive} />
      </label>
    )
  }

  function renderPanel() {
    return createPortal(
      <>
        <div
          className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
            panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closePanel}
        />
        <div className={`fixed inset-y-0 right-0 w-full max-w-md border-l z-50 flex flex-col transform transition-transform duration-300 bg-white border-stone-200 dark:bg-slate-900 dark:border-slate-700 ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0 border-stone-200 dark:border-slate-700">
            <div>
              {panelMode === 'edit' && (logoUrl || logoUrlLight) && (
                <div className='mb-1.5'>
                  {logoUrl && <img src={logoUrl} alt='' className='h-14 w-auto object-contain dark:hidden' />}
                  {logoUrlLight && <img src={logoUrlLight} alt='' className='h-14 w-auto object-contain hidden dark:block' />}
                </div>
              )}
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">{panelMode === 'create' ? 'New Menu Item' : `Edit ${formName}`}</h2>
              {panelMode === 'edit' && formCollIds.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-1'>
                  {formCollIds.map((id, idx) => {
                    const col = collections.find(c => c._id === id)
                    if (!col) return null
                    return <span key={id} className={`text-xs px-2.5 py-0.5 rounded-full border ${PILL_COLORS[idx % PILL_COLORS.length]}`}>{col.name}</span>
                  })}
                </div>
              )}
            </div>
            <button onClick={closePanel} className="transition-colors text-stone-400 hover:text-stone-900 dark:text-slate-500 dark:hover:text-slate-100">
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
          <div className='flex-1 overflow-y-auto p-5 space-y-5'>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Name <span className='text-red-400'>*</span></label>
              <input type='text' value={formName} onChange={e => setFormName(e.target.value)} placeholder='e.g. Eggs Benedict'
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500" />
            </div>
            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <button type='button' onClick={handleAiGenerate} disabled={!formName || aiGenerating}
                  className='flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400 dark:bg-violet-900/30 dark:hover:bg-violet-900/50'>
                  {aiGenerating ? '✨ Generating…' : '✨ AI Generate'}
                </button>
              </div>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder='Briefly describe the dish...' rows={3}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors resize-none bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500" />
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-2 mb-1.5'>Dietary Tags</p>
            <div className='flex flex-wrap gap-1.5'>
              {DIETARY_OPTIONS.map(opt => {
                const on = formDietary.includes(opt.label)
                return (
                  <button key={opt.label} type='button'
                    onClick={() => setFormDietary(d => d.includes(opt.label) ? d.filter(x => x !== opt.label) : [...d, opt.label])}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${on ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-600/60 dark:text-emerald-300' : 'bg-stone-50 border-amber-300 text-slate-600 hover:border-amber-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-400 dark:hover:border-amber-600'}`}>
                    <span>{opt.icon}</span>{opt.label}
                  </button>
                )
              })}
            </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Price</label>
              <div className='relative'>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">$</span>
                <input type='number' min='0' step='0.01' value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder='0.00'
                  className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500" />
              </div>
              <p className='text-slate-500 text-xs mt-1'>Leave blank for &ldquo;Ask Server For Price&rdquo;</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Dinner Price <span className="text-slate-400 text-xs font-normal">(if different from lunch)</span></label>
              <div className='relative'>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">$</span>
                <input type='number' min='0' step='0.01' value={formDinnerPrice} onChange={e => setFormDinnerPrice(e.target.value)} placeholder='e.g. 28.99'
                  className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500" />
              </div>
              <p className='text-slate-500 text-xs mt-1'>Leave blank if dinner price matches lunch</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Happy Hour Price <span className="text-slate-400 text-xs font-normal">(leave blank if no happy hour price)</span></label>
              <div className='relative'>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">$</span>
                <input type='number' min='0' step='0.01' value={formHappyHourPrice} onChange={e => setFormHappyHourPrice(e.target.value)} placeholder='e.g. 12.99'
                  className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500" />
              </div>
              <p className='text-slate-500 text-xs mt-1'>Happy hour pricing — stored in description as [happy-hour:XX]</p>
            </div>
            <div>
              <label className='block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300'>Categories</label>
              <div className='grid grid-cols-2 gap-2'>
                {collections.filter(col => col.name !== 'Order Ahead').map(col => {
                  const checked = formCollIds.includes(col._id)
                  return (
                    <button key={col._id} type='button' onClick={() => toggleFormCollection(col._id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors text-left ${
                        checked ? 'bg-sky-50 border-sky-400 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700/60 dark:text-sky-300' : 'bg-stone-50 border-amber-300 text-slate-600 hover:border-amber-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-400 dark:hover:border-amber-600 dark:hover:text-slate-300'
                      }`}>
                      <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                        checked ? 'bg-sky-500 border-sky-500' : 'border-slate-500'
                      }`}>
                        {checked && (
                          <svg className='w-3 h-3 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                          </svg>
                        )}
                      </span>
                      <span className='truncate text-xs'>{CATEGORY_ICONS[col.name as MenuCategory] ?? EMPTY_ICON} {col.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className='flex items-center justify-between py-1'>
              <div>
                <p className='text-sm font-medium text-slate-900 dark:text-slate-300'>Available for To-Go</p>
                <p className='text-slate-500 text-xs mt-0.5'>Item is available for takeout / pickup</p>
              </div>
              <Toggle enabled={formTogo} onChange={v => setFormTogo(v)} />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300'>Image</label>
              <div className='w-full rounded-xl overflow-hidden mb-2 border bg-stone-50 border-stone-200 dark:bg-slate-800 dark:border-slate-700'>
                {formImageUrl
                  ? <img src={formImageUrl} alt='Preview' className='w-full h-auto block' onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  : <div className='h-24 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm'>No image — upload or paste a URL below</div>
                }
              </div>
              <div className='flex gap-2 items-center'>
                <input type='text' value={formImageUrl} onChange={e => { setFormImageUrl(e.target.value); resetUpload() }}
                  placeholder='https://media.packedhousehq.com/...'
                  className='flex-1 min-w-0 border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors bg-stone-50 border-amber-300 text-slate-900 placeholder-slate-400 dark:bg-slate-700 dark:border-amber-700/40 dark:text-slate-100 dark:placeholder-slate-500' />
                {renderUploadButton()}
                {formImageUrl && (
                  <div className='w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100 dark:bg-slate-700 border border-stone-200 dark:border-slate-600'>
                    <img src={formImageUrl} alt='' className='w-full h-full object-cover' onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  </div>
                )}
              </div>
              {uploadSizes ? (
                <p className='text-green-400 text-xs mt-1.5 flex items-center gap-1'>
                  <svg className='w-3 h-3 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                  </svg>
                  {mmFormatBytes(uploadSizes.original)} \u2192 {mmFormatBytes(uploadSizes.converted)} saved as WebP
                </p>
              ) : (
                <p className='text-slate-500 text-xs mt-1.5'>Best results: landscape photos (4:3 ratio). Max 10 MB. Auto-converted to WebP.</p>
              )}
            </div>
            {formError && (
              <div className='bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2.5 text-red-400 text-sm'>{formError}</div>
            )}
          </div>
          <div className='flex items-center gap-3 px-5 py-4 border-t border-slate-700 flex-shrink-0'>
            <button onClick={closePanel}
              className='flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 text-sm font-medium py-2.5 rounded-xl transition-colors'
            >Cancel</button>
            <button onClick={handleSave}
              disabled={formSaving || uploadStatus === 'converting' || uploadStatus === 'uploading'}
              className='flex-1 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50'
              style={{ backgroundColor: brandColors.primary }}
            >
              {formSaving ? 'Saving\u2026' : panelMode === 'create' ? 'Create Item' : 'Save Changes'}
            </button>
          </div>
        </div>
      </>,
      document.body
    )
  }

  function renderDeleteConfirm() {
    if (!deleteTarget) return null
    return (
      <div className='fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4'
        onClick={() => { if (!deleteLoading) setDeleteTarget(null) }}>
        <div className='bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl'
          onClick={e => e.stopPropagation()}>
          <div className='flex items-center gap-3 mb-3'>
            <div className='w-10 h-10 bg-red-950/60 rounded-full flex items-center justify-center flex-shrink-0'>
              <svg className='w-5 h-5 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
              </svg>
            </div>
            <div>
              <h3 className='text-slate-50 font-semibold text-sm'>Delete this item?</h3>
              <p className='text-slate-400 text-xs mt-0.5'>&ldquo;{deleteTarget.name}&rdquo;</p>
            </div>
          </div>
          <p className='text-slate-500 text-xs mb-4'>
            The product and its image will be saved for 24 hours and can be fully restored from Recently Deleted.
            After 24 hours both are permanently removed.
          </p>
          <div className='flex gap-2'>
            <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
              className='flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-50'
            >Cancel</button>
            <button onClick={confirmDelete} disabled={deleteLoading}
              className='flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50'
            >{deleteLoading ? 'Deleting\u2026' : 'Yes, Delete'}</button>
          </div>
        </div>
      </div>
    )
  }

  function renderTrashPanel() {
    const trashCount = trashImages.length + trashProducts.length
    return (
      <div className='mt-10 pt-6 border-t border-slate-700'>
        <button onClick={() => setTrashOpen(o => !o)}
          className='flex items-center justify-between w-full px-1 py-1 text-slate-500 hover:text-slate-400 transition-colors'>
          <span className='flex items-center gap-2 text-sm font-medium'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
            </svg>
            Recently Deleted
            {trashCount > 0 && (
              <span className='text-xs bg-slate-700 border border-slate-600 text-slate-400 rounded-full px-2 py-0.5'>{trashCount}</span>
            )}
          </span>
          <svg className={`w-4 h-4 transition-transform duration-200 ${trashOpen ? 'rotate-180' : ''}`}
            fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>
        {trashOpen && (
          <div className='mt-3 space-y-5'>
            {trashLoading && <p className='text-slate-500 text-sm text-center py-6'>Loading&hellip;</p>}
            {!trashLoading && trashCount === 0 && (
              <p className='text-slate-500 text-sm text-center py-6'>No items in trash.</p>
            )}
            {!trashLoading && trashProducts.length > 0 && (
              <div>
                <p className='text-slate-500 text-xs font-semibold uppercase tracking-wider px-1 mb-2'>Products</p>
                <div className='space-y-2'>
                  {trashProducts.map(item => (
                    <div key={item.trashKey} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white border-stone-200 dark:bg-slate-800 dark:border-slate-700">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg overflow-hidden border bg-stone-100 border-stone-200 dark:bg-slate-700 dark:border-slate-600/50">
                        {item.hasImage && item.imagePublicUrl
                          ? <img src={item.imagePublicUrl} alt={item.productName} loading='lazy' className='w-full h-full object-cover' />
                          : <div className='w-full h-full flex items-center justify-center text-slate-500 text-lg'>{EMPTY_ICON}</div>
                        }
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{item.productName}</p>
                          {item.priceDisplay && (
                            <span className='text-xs font-bold' style={{ color: brandColors.accent }}>{item.priceDisplay}</span>
                          )}
                        </div>
                        <div className='flex flex-wrap gap-1 mt-0.5'>
                          {item.collectionIds.map(id => {
                            const col = collections.find(c => c._id === id)
                            if (!col) return null
                            return (
                              <span key={id} className="text-xs border rounded-full px-1.5 py-0.5 leading-none bg-stone-100 text-stone-600 border-stone-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                                {CATEGORY_ICONS[col.name as MenuCategory] ?? ''} {col.name}
                              </span>
                            )
                          })}
                        </div>
                        <p className='text-slate-500 text-xs mt-0.5'>Expires in {item.timeLabel}</p>
                      </div>
                      <button onClick={() => handleRestoreProduct(item.trashKey)} disabled={!!restoringKey}
                        className='flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50'
                        style={{ borderColor: brandColors.accent + '80', color: brandColors.accent }}>
                        {restoringKey === item.trashKey ? 'Restoring\u2026' : '\u21A9 Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!trashLoading && trashImages.length > 0 && (
              <div>
                <p className='text-slate-500 text-xs font-semibold uppercase tracking-wider px-1 mb-2'>Images</p>
                <div className='space-y-2'>
                  {trashImages.map(item => (
                    <div key={item.trashKey} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white border-stone-200 dark:bg-slate-800 dark:border-slate-700">
                      <button onClick={() => setTrashModal(item)}
                        className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border transition-colors bg-stone-100 border-stone-200 hover:border-stone-300 dark:bg-slate-700 dark:border-slate-600/50 dark:hover:border-slate-400"
                        title='Click to preview'>
                        <img src={item.publicUrl} alt={item.productName} loading='lazy' className='w-full h-full object-cover' />
                      </button>
                      <div className='flex-1 min-w-0'>
                        <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{item.productName}</p>
                        <p className='text-slate-500 text-xs mt-0.5'>Expires in {item.timeLabel}</p>
                      </div>
                      <button onClick={() => handleRestoreImage(item.trashKey)} disabled={!!restoringKey}
                        className='flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50'
                        style={{ borderColor: brandColors.accent + '80', color: brandColors.accent }}>
                        {restoringKey === item.trashKey ? 'Restoring\u2026' : '\u21A9 Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderTrashModal() {
    if (!trashModal) return null
    return (
      <div className='fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4'
        onClick={() => setTrashModal(null)}>
        <div className='bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl'
          onClick={e => e.stopPropagation()}>
          <div className='flex items-start justify-between mb-4'>
            <h3 className='text-slate-50 font-semibold text-sm pr-4'>{trashModal.productName}</h3>
            <button onClick={() => setTrashModal(null)} className='text-slate-500 hover:text-slate-100 transition-colors flex-shrink-0'>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
          <div className='w-full aspect-video bg-slate-700 rounded-xl overflow-hidden mb-4'>
            <img src={trashModal.publicUrl} alt={trashModal.productName} className='w-full h-full object-contain' />
          </div>
          <p className='text-slate-500 text-xs font-mono mb-1 break-all'>{trashModal.trashKey.split('/').pop()}</p>
          <p className='text-slate-400 text-xs mb-4'>Expires in {trashModal.timeLabel}</p>
          <button onClick={() => handleRestoreImage(trashModal.trashKey)} disabled={!!restoringKey}
            className='w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50'
            style={{ backgroundColor: brandColors.primary }}>
            {restoringKey === trashModal.trashKey ? 'Restoring\u2026' : '\u21A9 Restore Image'}
          </button>
        </div>
      </div>
    )
  }

  const _knownSet  = new Set(MENU_CATEGORIES as readonly string[])
  const _menuDisp  = [
    // Known categories in preferred display order
    ...MENU_CATEGORIES.map(n => collections.find(c => c.name === n)).filter((c): c is Collection => !!c),
    // Any new GHL collections not in the known list — appear automatically, sorted A-Z
    ...collections.filter(c => !_knownSet.has(c.name) && c.name !== 'Order Ahead').sort((a, b) => a.name.localeCompare(b.name)),
  ]
  const _menuIds    = new Set(_menuDisp.map(c => c._id))
  const _uncatProds = products.filter(p => !(p.collectionIds ?? []).some((id: string) => _menuIds.has(id)))

  return (
    <div className='space-y-6 px-1'>
      <div className='flex items-center justify-end gap-2'>
        <button
          type='button'
          onClick={() => setOpenCategories(prev => prev.size === 0 ? new Set([..._menuDisp.map(c => c.name), 'Uncategorized']) : new Set())}
          className='text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-2 py-2'
        >{openCategories.size === 0 ? 'Expand All' : 'Collapse All'}</button>
        <button type='button' onClick={() => { setShowCatMgr(v => !v); if (showCatMgr) setCatSelected(new Set()) }}
          className={`text-xs px-3 py-2 rounded-xl border transition-colors flex-shrink-0 ${showCatMgr ? 'border-amber-400/60 bg-amber-500/10 text-amber-400' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400'}`}>
          {showCatMgr ? 'Done' : 'Categories'}
        </button>
        <button
          onClick={openCreate}
          className='flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors flex-shrink-0'
          style={{ backgroundColor: brandColors.primary }}
        >
          <Plus className='w-4 h-4' />
          New Item
        </button>
      </div>
      {showCatMgr && (
        <div className='rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3'>
          <p className='text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>Manage Categories</p>
          {(() => {
            const _cats = collections.filter(c => c.name !== 'Order Ahead')
            const _allChecked = _cats.length > 0 && _cats.every(c => catSelected.has(c._id))
            return (
              <div className='space-y-1.5'>
                {_cats.length > 0 && (
                  <div className='flex items-center gap-2.5 px-3 py-1.5'>
                    <input type='checkbox' checked={_allChecked}
                      onChange={e => setCatSelected(e.target.checked ? new Set(_cats.map(c => c._id)) : new Set())}
                      className='w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0' />
                    <span className='text-xs text-slate-500 dark:text-slate-400 flex-1'>
                      {catSelected.size > 0 ? `${catSelected.size} selected` : 'Select all'}
                    </span>
                    {catSelected.size > 0 && (
                      <button type='button' onClick={deleteSelectedCollections} disabled={catDeleting === 'bulk'}
                        className='text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-40'>
                        {catDeleting === 'bulk' ? 'Deleting…' : `Delete ${catSelected.size}`}
                      </button>
                    )}
                  </div>
                )}
                {_cats.map(col => (
                  <div key={col._id} className='flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50'>
                    <input type='checkbox' checked={catSelected.has(col._id)}
                      onChange={e => setCatSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(col._id) : n.delete(col._id); return n })}
                      className='w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0' />
                    <span className='text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-1'>
                      <span>{CATEGORY_ICONS[col.name] || '📋'}</span>
                      {col.name}
                    </span>
                    <button type='button' onClick={() => deleteCollection(col._id, col.name)} disabled={catDeleting === col._id}
                      className='text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40'>
                      {catDeleting === col._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ))}
                {_cats.length === 0 && <p className='text-xs text-slate-400 px-2 py-1'>No categories yet.</p>}
              </div>
            )
          })()}
          <div className='flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700'>
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCollection() }}
              placeholder={'New category name…'} maxLength={60}
              className='flex-1 text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-amber-400 transition-colors' />
            <button type='button' onClick={createCollection} disabled={catCreating || !newCatName.trim()}
              className='px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-40'>
              {catCreating ? 'Adding\u2026' : 'Add'}
            </button>
          </div>
        </div>
      )}
      {successMsg && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium bg-slate-800 border-green-700/60 text-green-400 min-w-[240px] max-w-[90vw] justify-center'>
          <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          {successMsg}
        </div>
      )}
      {loading ? (
        <div className='flex items-center justify-center py-24'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-8 h-8 border-2 rounded-full animate-spin'
              style={{ borderColor: brandColors.primary, borderTopColor: 'transparent' }} />
            <p className='text-slate-400 text-sm'>Loading products&hellip;</p>
          </div>
        </div>
      ) : error ? (
        <div className='flex items-center justify-center py-24 text-center'>
          <div className='space-y-3'>
            <p className='text-red-400 font-medium'>Failed to load products</p>
            <p className='text-slate-500 text-sm max-w-sm'>{error}</p>
            <button onClick={fetchData} className='text-sm underline' style={{ color: brandColors.accent }}>Retry</button>
          </div>
        </div>
      ) : (
        <>
        <div className='mb-4 relative'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' /></svg>
            <input type='text' value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search menu items…'
              className='w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border outline-none focus:border-sky-500 transition-colors bg-white border-stone-200 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500' />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
              </button>
            )}
          </div>
        <div className='space-y-8'>
          {_menuDisp.map(col => renderCategorySection(col))}
          {_uncatProds.length > 0 && (
            <div className='space-y-2 mt-4' data-category='Uncategorized'>
              <button type='button' onClick={() => toggleCategory('Uncategorized')} className='flex items-center gap-2 px-3 mb-1 w-full text-left py-3 rounded-xl border bg-white border-stone-200 hover:border-stone-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 transition-colors'>
                <span className='text-xl'>&#9888;&#65039;</span>
                <h3 className='font-semibold text-sm text-slate-900 dark:text-slate-100 flex-1'>Uncategorized</h3>
                <span className='text-slate-500 text-xs'>{_uncatProds.length} item{_uncatProds.length !== 1 ? 's' : ''}</span>
                <span className='text-xs text-amber-500 border border-amber-500/30 bg-amber-500/10 rounded-full px-2 py-0.5'>assign a category to show on /our-menu</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${openCategories.has('Uncategorized') ? 'rotate-0' : '-rotate-90'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' /></svg>
              </button>
              {openCategories.has('Uncategorized') && (
                <div className='space-y-2'>{_uncatProds.map((p: Product) => renderProductRow(p, {_id:'__none__',name:'Uncategorized',slug:'uncategorized'}))}</div>
              )}
            </div>
          )}
          {products.length === 0 && (
            <div className='flex items-center justify-center py-24 text-center'>
              <div>
                <p className='text-5xl mb-4'>{EMPTY_ICON}</p>
                <p className='text-slate-400 text-lg font-medium'>No menu items yet</p>
                <p className='text-slate-500 text-sm mt-2'>Click &ldquo;New Item&rdquo; to add your first.</p>
              </div>
            </div>
          )}
          {renderTrashPanel()}
        </div>
        </>
      )}
      {/* Force Menu Sync -- advanced accordion */}
      <div className='mt-10 pt-6 border-t border-slate-700'>
        <button onClick={() => setShowAdvanced(v => !v)}
          className='flex items-center justify-between w-full px-1 py-1 text-slate-500 hover:text-slate-400 transition-colors'>
          <span className='flex items-center gap-2 text-sm font-medium'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
            </svg>
            Advanced Menu Manager Settings
          </span>
          <svg className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>
        {showAdvanced && (
          <div className='mt-3'>
            <div className='flex items-start justify-between gap-4'>
              <p className='flex-1 text-xs text-slate-400 dark:text-slate-500'>Use this only if you added products directly in GHL and they aren’t showing here yet.</p>
              <button
                onClick={reseedFullMenu}
                disabled={reseeding || loading}
                className='flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              >
                {reseeding ? 'Syncing…' : 'Force Menu Sync'}
              </button>
            </div>
          </div>
        )}
      </div>

      {restoredUrl && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-lg'>
          <div className='bg-slate-900 border border-green-700/60 rounded-xl shadow-2xl px-4 py-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex-1 min-w-0'>
                <p className='text-green-400 text-xs font-semibold mb-1'>
                  \u21A9 Image restored. If the product image was not auto-updated, paste this URL into the product image field:
                </p>
                <code className='text-green-300 text-xs break-all'>{restoredUrl}</code>
              </div>
              <button onClick={() => setRestoredUrl(null)}
                className='text-slate-500 hover:text-slate-100 flex-shrink-0 transition-colors mt-0.5'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {renderPanel()}
      {renderDeleteConfirm()}
      {renderTrashModal()}
    </div>
  )
}