// PageManagerPage.tsx -- Public site page content editor
// v3.2 | 10/02/2026 -- Feat: category page edge shapes (Edges button per row, flat/dip-in controls, /cat-page-edges KV)
// v3.1 | 10/02/2026 -- Fix: garbled unicode in section subtitles + arrow buttons (ChevronUp/ChevronDown icons)
// v3.0 | 10/02/2026 4:21 PM PDT -- Feat: KV-driven std pages (10 core), enable/disable toggle, locked/editable slugs, Photo Gallery stub
// v2.9 | 10/01/2026 11:40 PM PDT -- Fix: slug derived from config.menuUrl instead of config.workerUrl (fixes pubBase showing niche-engine-worker instead of restaurant slug)
// v2.8 | 10/01/2026 10:18 PM PDT -- Fix: dynamic slug from config.workerUrl (drops hardcoded pacifictable/firefishgrill map); about-firefish-grill -> about-us
// v2.7 | 10/01/2026 9:14 PM PDT -- Fix: confirmInit auto-opens sections panel after save; fix all unicode garbles
// v2.6 | 09/30/2026 6:03 PM PDT -- Fix: hero image load reads data.content.heroImage (GET /page-content returns {slug,content:{heroImage}})
// v2.5 | 09/30/2026 5:39 PM PDT -- Fix: pre-load all catHeroImages on mount so thumbnails+URLs persist after page reload
// v2.4 | 09/30/2026 5:22 PM PDT -- Fix: Saved! pill styling -- dark green bg, white text, rounded-full
// v2.3 | 09/30/2026 5:06 PM PDT -- Feat: Inline Edit per homepage section -- Edit button toggles title/view form; saves to KV on Save
// v2.2 | 09/30/2026 4:58 PM PDT -- Feat: Homepage Sections panel -- add/reorder/remove KV-driven homepage sections; collection picker + view selector
// v2.1 | 09/29/2026 11:49 PM PDT -- Feat: Enable Dinner Pricing toggle per page (saves mealType to KV sections config)
// v2.0 | 09/29/2026 11:02 PM PDT -- Feat: drag-to-reorder sections; landscape/portrait toggle per section (saves sec.orientation to KV)
// v1.9 | 09/29/2026 -- Feat: checkbox Initialize Sections modal (collection picker + auto pre-check); per-section remove button; replaces hardcoded LUNCH_SECTIONS_DEFAULT
// v1.8 | 09/29/2026 -- Feat: Menu Sections panel â per-section 3-image upload, Initialize Lunch Sections, Save via /admin/menu-sections
// v1.8 | 09/29/2026 -- Feat: Menu Sections panel per category page (3-image upload slots, load/save via /admin/menu-sections, Initialize defaults for lunch-menu)
// v1.7 | 09/29/2026 -- Fix: cat page thumbnail from heroImage, Hero panel pre-loads saved URL, routeToTitle for path-style titles
// v1.6 | 09/28/2026 5:45 PM PDT -- Feat: per-page sub-hero images (heroImage on reviews/vip-club/order-ahead; catPage inline hero editor; worker slug fix)
// v1.5 | 09/28/2026 4:55 PM PDT -- Fix: slug key firefish -> firefishgrill so pubBase generates correct preview URLs
// v1.4 | 09/28/2026 4:44 PM PDT -- Feat: Category Pages panel (live list, Add modal with collection dropdown, Remove with guard; calls worker CRUD endpoints)
// v1.3 | 09/23/2026 2:42 AM PDT -- Fix JSX arrow escaping
// v1.2 | 09/23/2026 2:33 AM PDT -- Remove gallery accordion; fix all garbled unicode (en-dash, box-drawing, arrows, checkmarks -> ASCII)
// v1.1 | 09/19/2026 2:15 AM PDT -- Add image upload to page fields; fix garbled unicode
// v1.0 | 09/09/2026 -- Extracted from RestaurantAdmin monolith

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Utensils, Info, Star, Image as ImageIcon, Mail, Phone, Clock, Images, Lock,
  Globe, ChevronDown, ChevronUp, Loader2, CalendarDays, Upload, GripVertical,
} from 'lucide-react'
import type { AdminPageProps } from '../adminShared'
import { saveLabel, makeHeaders, ExtLinkIcon } from '../adminShared'

// -- Module-level page metadata (label, icon, fields) -- static, never in KV
type PageMeta = { label:string; icon:React.ElementType; slugLocked:boolean; auto?:string; fields:Array<{key:string;label:string;type:'text'|'textarea'|'image'|'select';options?:string[];hint?:string}> }
type PageState = { id:string; slug:string; enabled:boolean }

const PAGE_META: Record<string,PageMeta> = {
  'home':          { label:'Home',          icon:LayoutDashboard, slugLocked:true,  auto:'Managed by General Settings — no editor needed', fields:[] },
  'photo-gallery': { label:'Photo Gallery', icon:Images,          slugLocked:true,  auto:'Coming soon — enable when gallery is ready',     fields:[] },
  'our-menu':      { label:'Our Menu',      icon:Utensils,        slugLocked:true,  auto:'Auto-rendered from Menu Manager — no editor needed', fields:[] },
  'order-ahead':   { label:'Order Ahead',   icon:Globe,           slugLocked:true,  fields:[
    {key:'heroImage', label:'Sub-Hero Image',     type:'image'},
    {key:'headline',  label:'Headline',            type:'text',    hint:'e.g. Order Ahead'},
    {key:'subtext',   label:'Description',         type:'textarea',hint:'A short description of your ordering experience'},
    {key:'orderUrl',  label:'Order Platform URL',  type:'text',    hint:'Your Toast, Square, or other ordering link'},
    {key:'platform',  label:'Platform Name',       type:'text',    hint:'e.g. Toast, Square, Slice'},
  ]},
  'reservations':  { label:'Reservations',  icon:CalendarDays,    slugLocked:true,  auto:'Managed in the Reservations tab', fields:[] },
  'vip-club':      { label:'VIP Club',      icon:Mail,            slugLocked:true,  fields:[
    {key:'heroImage', label:'Sub-Hero Image',       type:'image'},
    {key:'headline',  label:'Sub-Hero Headline',     type:'text',    hint:'e.g. Join Our VIP Club'},
    {key:'subtext',   label:'Sub-Hero Subtext',      type:'textarea',hint:'Short tagline under the headline'},
    {key:'perk1',     label:'Perk 1 — Title',   type:'text',    hint:'e.g. Flash Deals & Limited-Time Offers'},
    {key:'perk1Sub',  label:'Perk 1 — Description', type:'text'},
    {key:'perk2',     label:'Perk 2 — Title',   type:'text',    hint:'e.g. Free Birthday Dessert'},
    {key:'perk2Sub',  label:'Perk 2 — Description', type:'text'},
    {key:'perk3',     label:'Perk 3 — Title',   type:'text'},
    {key:'perk3Sub',  label:'Perk 3 — Description', type:'text'},
    {key:'perk4',     label:'Perk 4 — Title',   type:'text'},
    {key:'perk4Sub',  label:'Perk 4 — Description', type:'text'},
  ]},
  'happy-hour':    { label:'Happy Hour',    icon:Clock,           slugLocked:true,  fields:[
    {key:'heroImage', label:'Hero Background Image', type:'image', hint:'Recommended: 1600x600px or wider. Dark overlay added automatically.'},
  ]},
  'contact-us':    { label:'Contact',       icon:Phone,           slugLocked:false, fields:[
    {key:'heroImage',    label:'Hero Background Image', type:'image'},
    {key:'address',      label:'Street Address',        type:'text',    hint:'e.g. 123 Pacific Ave'},
    {key:'city',         label:'City, State ZIP',        type:'text',    hint:'e.g. Santa Cruz, CA 95060'},
    {key:'phone',        label:'Phone Number',           type:'text',    hint:'e.g. (831) 555-0123'},
    {key:'email',        label:'Email Address',          type:'text'},
    {key:'hoursWeekday', label:'Weekday Hours',          type:'text',    hint:'e.g. Mon-Thu: 11am-9pm'},
    {key:'hoursWeekend', label:'Weekend Hours',          type:'text',    hint:'e.g. Fri-Sat: 11am-10pm'},
    {key:'hoursSunday',  label:'Sunday Hours',           type:'text',    hint:'e.g. Sun: 10am-9pm'},
  ]},
  'about-us':      { label:'About',         icon:Info,            slugLocked:false, fields:[
    {key:'heroImage',    label:'Hero Background Image',  type:'image'},
    {key:'heroTitle',    label:'Hero Title',             type:'text',    hint:'e.g. Our Story'},
    {key:'heroSubtitle', label:'Hero Subtitle',          type:'text',    hint:'Short line under the title'},
    {key:'heading',      label:'Section Heading',        type:'text',    hint:'e.g. Where Every Meal is a Celebration'},
    {key:'story',        label:'Story Text',             type:'textarea',hint:'Main paragraph about your restaurant'},
    {key:'storyImage',   label:'Story Section Image',    type:'image'},
    {key:'chefName',     label:'Chef Name',              type:'text',    hint:'e.g. James Whitfield'},
    {key:'chefTitle',    label:'Chef Title / Role',      type:'text',    hint:'e.g. Executive Chef & Owner'},
    {key:'chefPhoto',    label:'Chef Photo',             type:'image'},
    {key:'chefCaption',  label:'Chef Photo Caption',     type:'text',    hint:'e.g. Ben Kralj · Executive Chef · Back Nine Grill'},
    {key:'chefBio',     label:'Chef Bio',               type:'textarea',hint:'Two-paragraph bio — separate paragraphs with a blank line'},
    {key:'chefQuote',   label:'Chef Signature Quote',   type:'textarea',hint:'Short pull quote shown below the bio (optional)'},
    {key:'chefLayout',    label:'Chef Section Layout',    type:'select',  options:['image-left','image-right'],   hint:'Toggle image position'},
    {key:'chefImageStyle', label:'Chef Image Style',       type:'select',  options:['portrait','landscape'],         hint:'Portrait = full headshot (2:3) · Landscape = wide photo (4:3)'},
    {key:'chefImageSize',  label:'Chef Image Size',        type:'select',  options:['small','medium','large','full'], hint:'Max height — ratio always preserved'},

  ]},
  'reviews':       { label:'Reviews',       icon:Star,            slugLocked:true,  fields:[
    {key:'heroImage',      label:'Sub-Hero Image',        type:'image'},
    {key:'rating',          label:'Overall Rating',        type:'text',    hint:'e.g. 4.9'},
    {key:'reviewCount',     label:'Total Reviews',         type:'text',    hint:'e.g. 400+'},
    {key:'award',           label:'Award / Badge',         type:'text',    hint:"e.g. 2026 Diner's Choice Award"},
    {key:'googleReviewUrl', label:'Google Review Link',    type:'text'},
    {key:'review1Name',     label:'Review 1 - Reviewer',  type:'text'},
    {key:'review1Platform', label:'Review 1 - Platform',  type:'text',    hint:'Google / Yelp / TripAdvisor'},
    {key:'review1Date',     label:'Review 1 - Date',      type:'text',    hint:'e.g. 2 weeks ago'},
    {key:'review1Text',     label:'Review 1 - Text',      type:'textarea'},
    {key:'review2Name',     label:'Review 2 - Reviewer',  type:'text'},
    {key:'review2Platform', label:'Review 2 - Platform',  type:'text'},
    {key:'review2Date',     label:'Review 2 - Date',      type:'text'},
    {key:'review2Text',     label:'Review 2 - Text',      type:'textarea'},
    {key:'review3Name',     label:'Review 3 - Reviewer',  type:'text'},
    {key:'review3Platform', label:'Review 3 - Platform',  type:'text'},
    {key:'review3Date',     label:'Review 3 - Date',      type:'text'},
    {key:'review3Text',     label:'Review 3 - Text',      type:'textarea'},
  ]},
}

const DEFAULT_PAGES: PageState[] = [
  { id:'home',          slug:'/',              enabled:true  },
  { id:'photo-gallery', slug:'/photo-gallery', enabled:false },
  { id:'our-menu',      slug:'/our-menu',      enabled:true  },
  { id:'order-ahead',   slug:'/order-ahead',   enabled:true  },
  { id:'reservations',  slug:'/reservations',  enabled:true  },
  { id:'vip-club',      slug:'/vip-club',      enabled:true  },
  { id:'happy-hour',    slug:'/happy-hour',    enabled:true  },
  { id:'contact-us',    slug:'/contact-us',    enabled:true  },
  { id:'about-us',      slug:'/about-us',      enabled:true  },
  { id:'reviews',       slug:'/reviews',       enabled:true  },
]

export default function PageManagerPage({ isDark, config, t }: AdminPageProps) {
  const slug = (() => { try { return new URL(config.menuUrl).hostname.split('.')[0] } catch { return 'pacifictable' } })()
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024

  const [siteConfig,     setSiteConfig]     = useState<{live:any,draft:any,publishedAt:string}|null>(null)
  const [siteTemplates,  setSiteTemplates]  = useState<any[]>([])
  const [siteFields,     setSiteFields]     = useState<Record<string,string>>({})
  const [siteSaving,     setSiteSaving]     = useState(false)
  const [sitePublishing, setSitePublishing] = useState(false)
  const [siteSaved,      setSiteSaved]      = useState(false)
  const [pmView,         setPmView]         = useState<'list'|'edit'>('list')
  const [pmSlug,         setPmSlug]         = useState<string|null>(null)
  const [pmContent,      setPmContent]      = useState<Record<string,Record<string,string>>>({})
  const [pmSaving,       setPmSaving]       = useState(false)
  const [pmSaved,        setPmSaved]        = useState<string|null>(null)
  const [imgUploading,   setImgUploading]   = useState<Record<string,boolean>>({})
  const [imgUploadError, setImgUploadError] = useState<Record<string,string>>({})
  // Category pages
  const [catPages,     setCatPages]     = useState<{route:string,title:string,collectionName:string|null}[]>([])
  const [menuCols,     setMenuCols]     = useState<{name:string,_id:string}[]>([])
  const [catLoading,   setCatLoading]   = useState(false)
  const [catAdding,    setCatAdding]    = useState(false)
  const [catRemoving,  setCatRemoving]  = useState<string|null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm,      setAddForm]      = useState({ collectionName:'', route:'', pageTitle:'', subheroSub:'' })
  const [addError,     setAddError]     = useState('')
  const [addSaved,     setAddSaved]     = useState(false)
  // Category page hero editing
  const [catHeroEdit,      setCatHeroEdit]      = useState<string|null>(null)
  const [catHeroUrl,       setCatHeroUrl]       = useState('')
  const [catHeroSaving,    setCatHeroSaving]    = useState(false)
  const [catHeroUploading, setCatHeroUploading] = useState(false)
  const [catHeroError,     setCatHeroError]     = useState('')
  const [catHeroImages,    setCatHeroImages]    = useState<Record<string,string>>({})

  // Menu sections
  const [catSectionsEdit, setCatSectionsEdit] = useState<string|null>(null)
  const [catSections,     setCatSections]     = useState<Record<string,{label:string,collectionName:string,images:string[],orientation?:'landscape'|'portrait'}[]>>({})
  const [catSecLoading,   setCatSecLoading]   = useState(false)
  const [catSecSaving,    setCatSecSaving]    = useState(false)
  const [catMealType,     setCatMealType]     = useState<Record<string,boolean>>({})
  const [catSecImgUp,     setCatSecImgUp]     = useState<Record<string,boolean>>({})
  const [showInitModal,    setShowInitModal]    = useState<string|null>(null)
  const [initColsSelected, setInitColsSelected] = useState<Set<string>>(new Set())
  const [dragSecIdx,       setDragSecIdx]       = useState<{route:string;si:number}|null>(null)
  // Homepage sections
  const [hpSections,   setHpSections]   = useState<{collectionId:string;title:string;view:'landscape'|'portrait'|'split';order:number;iconUrl?:string}[]>([])
  const [hpLoading,    setHpLoading]    = useState(false)
  const [hpSaving,     setHpSaving]     = useState(false)
  // Category page edge shapes
  const [catEdges,      setCatEdges]      = useState<Record<string,{topEdge:string,bottomEdge:string}>>({})
  const [catEdgeEdit,   setCatEdgeEdit]   = useState<string|null>(null)
  const [catEdgeSaving, setCatEdgeSaving] = useState<string|null>(null)
  const [hpSaved,      setHpSaved]      = useState(false)
  const [showHpModal,  setShowHpModal]  = useState(false)
  const [hpForm,       setHpForm]       = useState<{collectionId:string;title:string;view:'landscape'|'portrait'|'split'}>({ collectionId:'', title:'', view:'landscape' })
  const [hpError,      setHpError]      = useState('')
  const [hpEditIdx,    setHpEditIdx]    = useState<number|null>(null)
  const [hpEditForm,   setHpEditForm]   = useState<{title:string;view:'landscape'|'portrait'|'split'}>({ title:'', view:'landscape' })
  const [stdPages,        setStdPages]        = useState<PageState[]>(DEFAULT_PAGES)
  const [stdPagesDirty,   setStdPagesDirty]   = useState(false)
  const [stdPagesSaved,   setStdPagesSaved]   = useState(false)
  const [stdPagesLoading, setStdPagesLoading] = useState(true)
  useEffect(() => {
    const _ch = makeHeaders(config)
    fetch(`${config.workerUrl}/admin/page-definitions`, { headers: _ch })
      .then(r => r.json()).then((d:any) => { if (Array.isArray(d.pages)) setStdPages(d.pages) })
      .catch(() => {}).finally(() => setStdPagesLoading(false))
  }, [])
  async function handleSaveStdPages() {
    const r = await fetch(`${config.workerUrl}/admin/page-definitions`, {
      method:'PUT', headers:{ ...makeHeaders(config), 'Content-Type':'application/json' },
      body: JSON.stringify({ pages: stdPages })
    })
    if (r.ok) { setStdPagesSaved(true); setStdPagesDirty(false); setTimeout(() => setStdPagesSaved(false), 2500) }
  }
  useEffect(() => {
    const _ch = makeHeaders(config)
    fetch(`${config.workerUrl}/admin/category-pages`, { headers: _ch })
      .then(r => r.json())
      .then(async (d: any) => {
        const pages = (d.pages||[]).filter((p:any) => p.isCategoryPage)
        setCatPages(pages)
        const imgs: Record<string,string> = {}
        await Promise.all(pages.map(async (cp: any) => {
          try {
            const slug = (cp.route||'').replace(/^\//, '')
            const res = await fetch(`${config.workerUrl}/page-content/${slug}`, { headers: _ch })
            const data = await res.json()
            if (data.content?.heroImage) imgs[cp.route] = data.content.heroImage
          } catch {}
        }))
        setCatHeroImages(imgs)
      }).catch(()=>{})
    // Also load cat-page-edges KV config
    fetch(`${config.workerUrl}/admin/kv?key=${encodeURIComponent(config.locationId + '/cat-page-edges')}`, { headers: _ch })
      .then(r => r.ok ? r.json() : null).then((d: any) => { if (d?.value) setCatEdges(d.value) }).catch(() => {})
  }, [config.workerUrl])

  useEffect(() => {
    setHpLoading(true)
    fetch(`${config.workerUrl}/admin/kv?key=${encodeURIComponent(config.locationId + '/homepage-sections')}`, { headers: makeHeaders(config) })
      .then(r => r.json()).then(d => setHpSections(d.value || [])).catch(() => {}).finally(() => setHpLoading(false))
  }, [config.workerUrl, config.locationId])

  useEffect(() => {
    const h = makeHeaders(config)
    Promise.all([
      fetch(`${config.workerUrl}/site`, { headers: h }).then(r => r.json()).catch(() => null),
      fetch(`${config.workerUrl}/templates`, { headers: h }).then(r => r.json()).catch(() => ({templates:[]})),
    ]).then(([sc, tmpl]) => {
      if (sc) {
        const siteData = sc.site || sc
        setSiteConfig(siteData)
        const live = siteData.live || siteData.draft || siteData
        setSiteFields(live?.content || {})
      }
      setSiteTemplates(tmpl?.templates || [])
    })
  }, [config.workerUrl, config.locationId])

  async function savePageContent(slug: string) {
    setPmSaving(true)
    try {
      await fetch(`${config.workerUrl}/page-content/${slug}`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(pmContent[slug] || {}),
      })
      setPmSaved(slug)
      setTimeout(() => setPmSaved(null), 3000)
    } catch { /* silent */ } finally { setPmSaving(false) }
  }
  async function handleImageUpload(pageSlug: string, fieldKey: string, file: File) {
    const uk = pageSlug + ':' + fieldKey
    setImgUploading(prev => ({ ...prev, [uk]: true }))
    setImgUploadError(prev => ({ ...prev, [uk]: '' }))
    try {
      const res = await fetch(`${config.workerUrl}/upload`, {
        method: 'POST',
        headers: makeHeaders(config, { 'Content-Type': file.type || 'image/png', 'X-Filename': file.name, 'X-Folder': 'images' }),
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        setPmContent(prev => ({ ...prev, [pageSlug]: { ...(prev[pageSlug]||{}), [fieldKey]: data.url } }))
      } else {
        setImgUploadError(prev => ({ ...prev, [uk]: 'Upload failed' }))
      }
    } catch { setImgUploadError(prev => ({ ...prev, [uk]: 'Upload failed' })) }
    finally  { setImgUploading(prev => ({ ...prev, [uk]: false })) }
  }
  async function saveCatHeroImage(route: string) {
    setCatHeroSaving(true)
    try {
      const slug = route.replace(/^\//, '')
      await fetch(`${config.workerUrl}/page-content/${slug}`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ heroImage: catHeroUrl }),
      })
      setCatHeroImages(prev => ({ ...prev, [route]: catHeroUrl }))
      setCatHeroEdit(null)
      setCatHeroUrl('')
    } catch {} finally { setCatHeroSaving(false) }
  }
  async function uploadCatHeroImage(route: string, file: File) {
    setCatHeroUploading(true)
    setCatHeroError('')
    try {
      const res = await fetch(`${config.workerUrl}/upload`, {
        method: 'POST',
        headers: makeHeaders(config, { 'Content-Type': file.type || 'image/png', 'X-Filename': file.name, 'X-Folder': 'images' }),
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) setCatHeroUrl(data.url)
      else setCatHeroError('Upload failed')
    } catch { setCatHeroError('Upload failed') } finally { setCatHeroUploading(false) }
  }

  async function openInitModal(route: string) {
    setShowInitModal(route)
    setInitColsSelected(new Set())
    if (!menuCols.length) {
      try {
        const r = await fetch(`${config.workerUrl}/menu`, { headers: makeHeaders(config) })
        const d = await r.json()
        const cols = d.collections || []
        setMenuCols(cols)
        const kw = route.split('/').pop()?.split('-')[0]?.toLowerCase() || ''
        setInitColsSelected(new Set(cols.filter((c:any) => kw && c.name.toLowerCase().includes(kw)).map((c:any) => c.name)))
        return
      } catch {}
    }
    const kw = route.split('/').pop()?.split('-')[0]?.toLowerCase() || ''
    setInitColsSelected(new Set(menuCols.filter(c => kw && c.name.toLowerCase().includes(kw)).map(c => c.name)))
  }
  function toggleInitCol(name: string) {
    setInitColsSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }
  async function confirmInit(route: string) {
    const selected = menuCols.filter(c => initColsSelected.has(c.name))
    const newSecs = selected.map(c => ({ label: c.name, collectionName: c.name, images: ['','',''] }))
    setCatSections(prev => ({ ...prev, [route]: newSecs }))
    setShowInitModal(null)
    setCatSectionsEdit(route)
    setCatSecSaving(true)
    try {
      await fetch(`${config.workerUrl}/admin/menu-sections`, {
        method: 'PUT',
        headers: makeHeaders(config, {'Content-Type':'application/json'}),
        body: JSON.stringify({ route, sections: newSecs }),
      })
    } catch {} finally { setCatSecSaving(false) }
  }
  function removeSection(route: string, si: number) {
    setCatSections(prev => { const s = [...(prev[route]||[])]; s.splice(si,1); return {...prev,[route]:s} })
  }
  async function handleOpenSections(route: string) {
    if (catSectionsEdit === route) { setCatSectionsEdit(null); return }
    setCatSectionsEdit(route); setCatSecLoading(true)
    try {
      const r = await fetch(`${config.workerUrl}/admin/menu-sections?route=${encodeURIComponent(route)}`, { headers: makeHeaders(config) })
      const d = await r.json()
      setCatSections(prev => ({...prev, [route]: d.sections || []}))
      setCatMealType(prev => ({...prev, [route]: d.mealType === 'dinner'}))
    } catch {} finally { setCatSecLoading(false) }
  }
  async function saveSections(route: string) {
    setCatSecSaving(true)
    try {
      await fetch(`${config.workerUrl}/admin/menu-sections`, {
        method: 'PUT',
        headers: makeHeaders(config, {'Content-Type':'application/json'}),
        body: JSON.stringify({ route, sections: catSections[route] || [], mealType: catMealType[route] ? 'dinner' : '' }),
      })
    } catch {} finally { setCatSecSaving(false) }
  }
  async function uploadSectionImg(route: string, si: number, ii: number, file: File) {
    const uk = `${route}:${si}:${ii}`
    setCatSecImgUp(prev => ({...prev, [uk]: true}))
    try {
      const res = await fetch(`${config.workerUrl}/upload`, {
        method: 'POST',
        headers: makeHeaders(config, {'Content-Type': file.type||'image/png', 'X-Filename': file.name, 'X-Folder': 'images'}),
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        setCatSections(prev => {
          const secs = [...(prev[route]||[])]
          const sec = {...secs[si], images: [...(secs[si]?.images||['','',''])]}
          sec.images[ii] = data.url
          secs[si] = sec
          return {...prev, [route]: secs}
        })
      }
    } catch {} finally { setCatSecImgUp(prev => ({...prev, [uk]: false})) }
  }
  function colToRoute(n: string) {
    return '/menus/' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '')
  }
  function routeToTitle(r: string): string {
    return r.replace(/^\/menus\/|\//, '').split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  async function loadMenuCols() {
    try {
      const r = await fetch(`${config.workerUrl}/menu`, { headers: makeHeaders(config) })
      const d = await r.json()
      setMenuCols(d.collections || [])
    } catch {}
  }
  async function saveCatEdge(route: string, edge: {topEdge:string,bottomEdge:string}) {
    setCatEdgeSaving(route)
    try {
      const newEdges = {...catEdges, [route]: edge}
      const h = makeHeaders(config, {'Content-Type':'application/json'})
      await fetch(`${config.workerUrl}/admin/kv`, { method:'PUT', headers:h, body:JSON.stringify({key:`${config.locationId}/cat-page-edges`, value:newEdges}) })
      setCatEdges(newEdges)
    } catch {} finally { setCatEdgeSaving(null) }
  }
  async function addCategoryPage() {
    setAddError('')
    if (!addForm.collectionName || !addForm.route || !addForm.pageTitle) { setAddError('All fields required'); return }
    setCatAdding(true)
    try {
      const r = await fetch(`${config.workerUrl}/admin/add-category-page`, {
        method: 'POST',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(addForm),
      })
      const d = await r.json()
      if (!r.ok) { setAddError(d.error || 'Failed'); return }
      setShowAddModal(false)
      setAddForm({ collectionName:'', route:'', pageTitle:'', subheroSub:'' })
      setAddSaved(true)
      setTimeout(() => setAddSaved(false), 3000)
      const r2 = await fetch(`${config.workerUrl}/admin/category-pages`, { headers: makeHeaders(config) })
      const d2 = await r2.json()
      setCatPages((d2.pages||[]).filter((p:any)=>p.isCategoryPage))
    } catch { setAddError('Network error') } finally { setCatAdding(false) }
  }
  async function saveHpSections(secs: {collectionId:string;title:string;view:'landscape'|'portrait'|'split';order:number;iconUrl?:string}[]) {
    setHpSaving(true)
    try {
      await fetch(`${config.workerUrl}/admin/kv`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key: `${config.locationId}/homepage-sections`, value: secs }),
      })
      setHpSaved(true); setTimeout(() => setHpSaved(false), 3000)
    } catch {} finally { setHpSaving(false) }
  }
  function addHpSection() {
    if (!hpForm.collectionId || !hpForm.title) { setHpError('Collection and title required'); return }
    const newSec = { collectionId: hpForm.collectionId, title: hpForm.title, view: hpForm.view, order: hpSections.length + 1 }
    const updated = [...hpSections, newSec]
    setHpSections(updated); setShowHpModal(false); setHpForm({ collectionId:'', title:'', view:'landscape' }); setHpError('')
    saveHpSections(updated)
  }
  function moveHpSection(i: number, dir: -1|1) {
    const s = [...hpSections]; const j = i + dir
    if (j < 0 || j >= s.length) return
    ;[s[i], s[j]] = [s[j], s[i]]
    const reordered = s.map((sec, idx) => ({...sec, order: idx + 1}))
    setHpSections(reordered); saveHpSections(reordered)
  }
  function removeHpSection(i: number) {
    const updated = hpSections.filter((_, idx) => idx !== i).map((sec, idx) => ({...sec, order: idx + 1}))
    setHpSections(updated); saveHpSections(updated)
  }
  async function removeCategoryPage(route: string) {
    if (!window.confirm(`Remove the page at ${route}? This edits the live template.`)) return
    setCatRemoving(route)
    try {
      await fetch(`${config.workerUrl}/admin/remove-category-page`, {
        method: 'DELETE',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ route }),
      })
      setCatPages(prev => prev.filter(p => p.route !== route))
    } catch {} finally { setCatRemoving(null) }
  }
  async function saveSiteDraft() {
    setSiteSaving(true)
    const tplId = siteConfig?.draft?.templateId || siteConfig?.live?.templateId || siteTemplates[0]?.id
    try {
      await fetch(`${config.workerUrl}/site/draft`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ templateId: tplId, content: siteFields }),
      })
      setSiteConfig(prev => ({ ...prev!, draft: { templateId: tplId, content: siteFields } }))
      setSiteSaved(true)
      setTimeout(() => setSiteSaved(false), 3000)
    } catch { /* silent */ } finally { setSiteSaving(false) }
  }
  async function publishSite() {
    setSitePublishing(true)
    try {
      const tplId = siteConfig?.draft?.templateId || siteConfig?.live?.templateId || siteTemplates[0]?.id
      await fetch(`${config.workerUrl}/site/draft`, {
        method: 'PUT',
        headers: makeHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ templateId: tplId, content: siteFields }),
      })
      const res = await fetch(`${config.workerUrl}/site/publish`, {
        method: 'POST', headers: makeHeaders(config),
      })
      const data = await res.json()
      if (data.publishedAt) {
        setSiteConfig(prev => ({
          ...prev!,
          live: { templateId: tplId, content: siteFields },
          publishedAt: data.publishedAt,
        }))
        setSiteSaved(true)
        setTimeout(() => setSiteSaved(false), 3000)
      }
    } catch { /* silent */ } finally { setSitePublishing(false) }
  }


    // -- Page definitions ------------------------------------------------------
    const isPublished = !!(siteConfig?.live?.templateId)
    const publishedAt = siteConfig?.publishedAt ? new Date(siteConfig.publishedAt).toLocaleString() : null
    const pubUrl = isPublished ? `https://${slug}.packedhousehq.com` : null
    const PAGES: PageState[] = [
      { id:'home',          slug:'/',              enabled:true  },
      { id:'photo-gallery', slug:'/photo-gallery', enabled:false },
      { id:'our-menu',      slug:'/our-menu',      enabled:true  },
      { id:'order-ahead',   slug:'/order-ahead',   enabled:true  },
      { id:'reservations',  slug:'/reservations',  enabled:true  },
      { id:'vip-club',      slug:'/vip-club',      enabled:true  },
      { id:'happy-hour',    slug:'/happy-hour',    enabled:true  },
      { id:'contact-us',    slug:'/contact-us',    enabled:true  },
      { id:'about-us',      slug:'/about-us',      enabled:true  },
      { id:'reviews',       slug:'/reviews',       enabled:true  },
    ]

    const pubBase = `https://${slug}.packedhousehq.com`

    // -- LIST VIEW ------------------------------------------------------------
    if (pmView === 'list') {
      return (
      <div className="space-y-5">

        {/* -- Publish Status -- */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-2xl border ${
          isPublished ? (isDark ? 'bg-green-900/20 border-green-800/40' : 'bg-green-50 border-green-200')
                      : (isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200')
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPublished ? 'bg-green-400' : 'bg-amber-400'}`} />
            <div>
              <p className={`text-sm font-semibold ${isPublished ? (isDark?'text-green-300':'text-green-700') : (isDark?'text-amber-300':'text-amber-700')}`}>
                {isPublished ? 'Site Published' : 'Site Not Published'}
              </p>
              {publishedAt && <p className={`text-xs ${t.muted}`}>Last published {publishedAt}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {siteSaved && <span className="text-xs text-green-400 font-medium">+ Saved</span>}
            {pubUrl && (
              <a href={pubUrl} target="_blank" rel="noopener noreferrer"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
                Preview {'->'}
              </a>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className={`flex items-center justify-between mb-2`}>
            <p className={`text-sm ${t.muted}`}>Select a page to edit its content.</p>
            <a href={pubBase} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
              View Site {'->'}
            </a>
          </div>
          {stdPagesLoading && <p className={`text-xs ${t.muted}`}>Loading pages...</p>}
          {!stdPagesLoading && stdPages.map(pg => {
            const meta = PAGE_META[pg.id]
            if (!meta) return null
            const Icon = meta.icon
            const hasFields = !meta.auto && meta.fields.length > 0
            return (
            <div key={pg.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-opacity ${t.cardBg} ${t.cardBdr} ${!pg.enabled ? 'opacity-50' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/8' : 'bg-gray-100'}`}>
                <Icon className={`w-4 h-4 ${t.muted}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${t.title}`}>{meta.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {meta.slugLocked
                    ? <span className={`text-xs ${t.muted} opacity-50 flex items-center gap-1`}><Lock className="w-2.5 h-2.5" />{pg.slug}</span>
                    : <input value={pg.slug} onChange={e => { setStdPages(prev => prev.map(p => p.id===pg.id ? {...p,slug:e.target.value} : p)); setStdPagesDirty(true) }}
                        className={`text-xs px-1.5 py-0.5 rounded border ${t.border} ${isDark?'bg-white/5 text-white/70':'bg-gray-50 text-gray-600'} w-36`} />
                  }
                  {meta.auto && <span className={`text-xs ${t.muted} italic`}>{meta.auto}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {pg.id !== 'home' && (
                  <button onClick={() => { setStdPages(prev => prev.map(p => p.id===pg.id ? {...p,enabled:!p.enabled} : p)); setStdPagesDirty(true) }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${pg.enabled ? 'bg-green-500/20 border-green-500/40 text-green-400' : (isDark?'bg-white/5 border-white/10 text-white/30':'bg-gray-100 border-gray-200 text-gray-400')}`}>
                    {pg.enabled ? 'On' : 'Off'}
                  </button>
                )}
                {!pg.enabled && pg.id !== 'home' && (
                  <span className={`text-xs ${t.muted}`}>Disabled</span>
                )}
                {pg.enabled && !meta.auto && (
                  <a href={`${pubBase}${pg.slug}`} target="_blank" rel="noopener noreferrer"
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover}`}>
                    {'->'}</a>
                )}
                {pg.enabled && hasFields && (
                  <button onClick={() => {
                    setPmSlug(pg.id); setPmView('edit');
                    if (!pmContent[pg.id] || Object.keys(pmContent[pg.id]).length === 0) {
                      fetch(`${config.workerUrl}/page-content/${pg.id}`, { headers: makeHeaders(config) })
                        .then(res => res.json())
                        .then((d: any) => { if (d.content && Object.keys(d.content).length > 0) setPmContent(prev => ({ ...prev, [pg.id]: d.content })) })
                        .catch(() => {})
                    }
                  }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors">
                    Edit
                  </button>
                )}
                {pg.enabled && meta.auto && (
                  <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'}`}>Auto</span>
                )}
              </div>
            </div>
          )})}
          {stdPagesDirty && (
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSaveStdPages}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors">
                Save Page Settings
              </button>
              {stdPagesSaved && <span className="text-xs text-green-400 font-medium">Saved!</span>}
            </div>
          )}
        </div>

        {/* -- Homepage Sections ----------------------------------------- */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${t.title}`}>Homepage Sections</p>
              <p className={`text-xs mt-0.5 ${t.muted}`}>Collection cards shown on the homepage - add, reorder, or remove</p>
            </div>
            <button onClick={() => { setShowHpModal(true); loadMenuCols() }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors">
              + Add Section
            </button>
          </div>
          {hpLoading && <p className={`text-xs ${t.muted}`}>Loading...</p>}
          {!hpLoading && hpSections.length === 0 && (
            <div className={`px-5 py-4 rounded-2xl border text-center ${t.cardBg} ${t.cardBdr}`}>
              <p className={`text-xs ${t.muted}`}>No homepage sections yet. Click &quot;+ Add Section&quot; to add one.</p>
            </div>
          )}
          {hpSections.map((sec, i) => (
            <div key={i} className="space-y-2">
            <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${t.cardBg} ${t.cardBdr}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${t.title}`}>{sec.title}</p>
                <p className={`text-xs mt-0.5 ${t.muted}`}>View: <span className="font-medium">{sec.view}</span> &middot; Order: {sec.order}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => moveHpSection(i, -1)} disabled={i === 0}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover} disabled:opacity-30`}>
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveHpSection(i, 1)} disabled={i === hpSections.length - 1}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover} disabled:opacity-30`}>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button onClick={() => { if (hpEditIdx === i) { setHpEditIdx(null) } else { setHpEditIdx(i); setHpEditForm({ title: sec.title, view: sec.view }) } }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover} ${hpEditIdx === i ? 'ring-1 ring-amber-400' : ''}`}>
                  Edit
                </button>
                <button onClick={() => removeHpSection(i)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition-colors">
                  Remove
                </button>
              </div>
            </div>
            {hpEditIdx === i && (
              <div className={`px-5 py-4 rounded-xl border ${t.cardBdr} ${t.cardBg} space-y-3`}>
                <p className={`text-xs font-bold ${t.title}`}>Edit Section</p>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Section Title</label>
                  <input type="text" value={hpEditForm.title} onChange={e => setHpEditForm(f => ({...f, title: e.target.value}))}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>View Style</label>
                  <select value={hpEditForm.view} onChange={e => setHpEditForm(f => ({...f, view: e.target.value as any}))}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}>
                    <option value="landscape">Landscape (3-col, wide cards)</option>
                    <option value="portrait">Portrait (3-col, tall cards)</option>
                    <option value="split">Split (alternating image/text rows)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setHpEditIdx(null)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
                    Cancel
                  </button>
                  <button onClick={() => { const updated = hpSections.map((s, idx) => idx === i ? {...s, ...hpEditForm} : s); setHpSections(updated); saveHpSections(updated); setHpEditIdx(null) }}
                    className="flex-1 px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors">
                    Save
                  </button>
                </div>
              </div>
            )}
            </div>
          ))}
          {hpSaving && <p className={`text-xs ${t.muted}`}>Saving...</p>}
          {hpSaved && <span className="inline-block px-4 py-1.5 text-xs font-bold rounded-full bg-green-600 text-white shadow-sm">&#10003; Saved!</span>}
        </div>

        {/* -- Category Pages -------------------------------------------- */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${t.title}`}>Menu Category Pages</p>
              <p className={`text-xs mt-0.5 ${t.muted}`}>Live collection pages, auto-built from GHL products</p>
            </div>
            <button onClick={() => { setShowAddModal(true); loadMenuCols() }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors">
              + Add Page
            </button>
          </div>
          {catLoading && <p className={`text-xs ${t.muted}`}>Loading pages...</p>}
          {!catLoading && catPages.length === 0 && (
            <div className={`px-5 py-4 rounded-2xl border text-center ${t.cardBg} ${t.cardBdr}`}>
              <p className={`text-xs ${t.muted}`}>No category pages yet. Click "+ Add Page" to create one.</p>
            </div>
          )}
          {catPages.map(cp => (
            <div key={cp.route} className="space-y-2">
            <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${t.cardBg} ${t.cardBdr}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-white/8' : 'bg-gray-100'}`}>
                {catHeroImages[cp.route]
                  ? <img src={catHeroImages[cp.route]} alt="" className="w-full h-full object-cover" onError={() => setCatHeroImages(prev => ({...prev, [cp.route]: ''}))} />
                  : <Utensils className={`w-4 h-4 ${t.muted}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${t.title}`}>{cp.title && !cp.title.startsWith('/') ? cp.title : routeToTitle(cp.route)}</p>
                <p className={`text-xs ${t.muted} truncate`}>{pubBase}{cp.route}</p>
                {cp.collectionName && <p className={`text-xs mt-0.5 ${t.muted}`}>Collection: {cp.collectionName}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`${pubBase}${cp.route}`} target="_blank" rel="noopener noreferrer"
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover}`}>
                  {'->'}
                </a>
                <button onClick={() => { if (catHeroEdit === cp.route) { setCatHeroEdit(null); return } setCatHeroEdit(cp.route); setCatHeroError(''); const saved = catHeroImages[cp.route] || ''; setCatHeroUrl(saved); if (!saved) { const s = cp.route.replace(/^\//, ''); fetch(`${config.workerUrl}/page-content/${s}`, { headers: makeHeaders(config) }).then(r => r.json()).then((d: any) => { if (d.content?.heroImage) { setCatHeroUrl(d.content.heroImage); setCatHeroImages(prev => ({...prev, [cp.route]: d.content.heroImage})) } }).catch(() => {}) } }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover} ${catHeroEdit === cp.route ? 'ring-1 ring-amber-400' : ''}`}>
                  Hero
                </button>
                <button onClick={() => handleOpenSections(cp.route)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover} ${catSectionsEdit === cp.route ? 'ring-1 ring-purple-400' : ''}`}>
                  Sections
                </button>

                <button onClick={() => setCatEdgeEdit(catEdgeEdit === cp.route ? null : cp.route)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.muted} ${t.dragHover} ${catEdgeEdit === cp.route ? 'ring-1 ring-emerald-400' : ''}`}>
                  Edges
                </button>
                <button onClick={() => removeCategoryPage(cp.route)} disabled={catRemoving === cp.route}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
                  {catRemoving === cp.route ? '...' : 'Remove'}
                </button>
              </div>
            </div>
            {catHeroEdit === cp.route && (
              <div className={`px-5 py-4 rounded-xl border ${t.cardBdr} ${t.cardBg}`}>
                <label className={`block text-xs font-semibold mb-2 ${t.muted}`}>Sub-Hero Image</label>
                <div className="flex flex-wrap items-center gap-2">
                  {catHeroUrl && <img src={catHeroUrl} alt="" className="w-12 h-12 rounded-lg object-cover border flex-shrink-0" onError={e => (e.currentTarget.style.display='none')} />}
                  <input type="text" value={catHeroUrl} onChange={e => setCatHeroUrl(e.target.value)} placeholder="https://..." className={`flex-1 min-w-0 px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
                  <label className="flex-shrink-0 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCatHeroImage(cp.route, f); e.currentTarget.value = '' }} />
                    <span className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${t.border} ${t.dragBg} ${t.body} ${t.dragHover} ${catHeroUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {catHeroUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {catHeroUploading ? 'Uploading...' : 'Upload'}
                    </span>
                  </label>
                  <button onClick={() => saveCatHeroImage(cp.route)} disabled={catHeroSaving} className="flex-shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50">{catHeroSaving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => { setCatHeroEdit(null); setCatHeroUrl(''); setCatHeroError('') }} className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg border ${t.border} ${t.dragBg} ${t.body}`}>Cancel</button>
                </div>
                {catHeroError && <p className="text-xs text-red-400 mt-1">{catHeroError}</p>}
              </div>
            )}
            {catSectionsEdit === cp.route && (
              <div className={`px-5 py-4 rounded-xl border ${t.cardBdr} ${t.cardBg} space-y-4`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${t.title}`}>Menu Sections</p>
                  <button onClick={() => openInitModal(cp.route)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors">
                    + Add Sections
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={catMealType[cp.route]||false} onChange={e => setCatMealType(prev => ({...prev,[cp.route]:e.target.checked}))} className="w-4 h-4 accent-amber-500" />
                  <span className={`text-xs font-medium ${t.muted}`}>Enable Dinner Pricing</span>
                  {catMealType[cp.route] && <span className="text-xs font-bold text-amber-500 ml-1">ON â dinner prices active</span>}
                </label>
                {catSecLoading && <p className={`text-xs ${t.muted}`}>Loading sections...</p>}
                {(catSections[cp.route]||[]).map((sec, si) => (
                  <div key={si}
                    draggable={true}
                    onDragStart={() => setDragSecIdx({route:cp.route, si})}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (!dragSecIdx || dragSecIdx.route !== cp.route) return; setCatSections(prev => { const s=[...(prev[cp.route]||[])]; const [moved]=s.splice(dragSecIdx.si,1); s.splice(si,0,moved); return {...prev,[cp.route]:s} }); setDragSecIdx(null) }}
                    onDragEnd={() => setDragSecIdx(null)}
                    className={`p-4 rounded-xl border ${t.cardBdr} ${isDark ? 'bg-white/4' : 'bg-gray-50'} transition-opacity ${dragSecIdx?.route===cp.route&&dragSecIdx?.si===si?'opacity-40':''}`}>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical className={`w-4 h-4 ${t.muted} flex-shrink-0 cursor-grab`} />
                        <div className="min-w-0"><p className={`text-sm font-semibold ${t.title}`}>{sec.label}</p><p className={`text-xs ${t.muted}`}>Collection: {sec.collectionName}</p></div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => setCatSections(prev => { const s=[...(prev[cp.route]||[])]; s[si]={...s[si],orientation:(s[si].orientation||'landscape')==='portrait'?'landscape':'portrait'}; return {...prev,[cp.route]:s} })} className={`text-xs px-2 py-0.5 rounded border ${t.border} ${t.muted} hover:opacity-70 transition-opacity whitespace-nowrap`} title="Toggle orientation">{(sec.orientation||'landscape')==='portrait'?'â Port':'â Land'}</button>
                        <button onClick={() => removeSection(cp.route, si)} className="text-red-400 hover:text-red-300 text-xs font-bold rounded px-1 transition-colors" title="Remove section">â</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[0,1,2].map(ii => {
                        const uk = `${cp.route}:${si}:${ii}`
                        return (
                          <div key={ii} className="space-y-1">
                            {sec.images?.[ii] && <img src={sec.images[ii]} alt="" className="w-full h-16 object-cover rounded-lg border" onError={e => (e.currentTarget.style.display='none')} />}
                            <input type="text" value={sec.images?.[ii]||''}
                              onChange={e => { const v=e.target.value; setCatSections(prev => { const secs=[...(prev[cp.route]||[])]; const s={...secs[si],images:[...(secs[si]?.images||['','',''])]}; s.images[ii]=v; secs[si]=s; return {...prev,[cp.route]:secs} }) }}
                              placeholder={`Image ${ii+1} URL`}
                              className={`w-full text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.cardBg} ${t.title} outline-none focus:ring-1 focus:ring-purple-400`} />
                            <label className="block cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) uploadSectionImg(cp.route,si,ii,f); e.currentTarget.value='' }} />
                              <span className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${t.border} ${t.dragBg} ${t.body} ${t.dragHover} ${catSecImgUp[uk]?'opacity-50 pointer-events-none':''}`}>
                                {catSecImgUp[uk] ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                                {catSecImgUp[uk]?'Uploading...':'Upload'}
                              </span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {(catSections[cp.route]||[]).length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => saveSections(cp.route)} disabled={catSecSaving}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition-colors">
                      {catSecSaving ? 'Saving...' : 'Save Sections'}
                    </button>
                    <button onClick={() => setCatSectionsEdit(null)} className={`px-4 py-2 text-xs font-medium rounded-lg border ${t.border} ${t.dragBg} ${t.body}`}>Close</button>
                  </div>
                )}
              </div>
            )}
            {catEdgeEdit === cp.route && (
              <div className={`px-5 py-4 rounded-xl border ${t.cardBdr} ${t.cardBg} space-y-3`}>
                <p className={`text-xs font-bold ${t.title}`}>Page Edge Shapes</p>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${t.muted} w-20 flex-shrink-0`}>Top edge:</span>
                  {(['flat','dip'] as const).map(v => (
                    <button key={v} onClick={() => saveCatEdge(cp.route, {topEdge:v, bottomEdge:(catEdges[cp.route]?.bottomEdge||'flat')})}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border-2 transition-colors ${(catEdges[cp.route]?.topEdge||'flat')===v?'border-amber-500 bg-amber-500/10 text-amber-400':`${t.border} ${isDark?'bg-gray-800 text-gray-300':'bg-stone-50 text-slate-600'}`}`}>
                      {v==='flat'?'Flat':'Dip in'}</button>
                  ))}
                  {catEdgeSaving===cp.route && <span className={`text-xs ${t.muted}`}>Saving...</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${t.muted} w-20 flex-shrink-0`}>Bottom edge:</span>
                  {(['flat','dip'] as const).map(v => (
                    <button key={v} onClick={() => saveCatEdge(cp.route, {topEdge:(catEdges[cp.route]?.topEdge||'flat'), bottomEdge:v})}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border-2 transition-colors ${(catEdges[cp.route]?.bottomEdge||'flat')===v?'border-amber-500 bg-amber-500/10 text-amber-400':`${t.border} ${isDark?'bg-gray-800 text-gray-300':'bg-stone-50 text-slate-600'}`}`}>
                      {v==='flat'?'Flat':'Dip in'}</button>
                  ))}
                </div>
                <p className={`text-xs ${t.muted}`}>Changes apply on next page load.</p>
              </div>
            )}
            </div>
          ))}
          {addSaved && <p className="text-xs text-green-400 font-medium mt-1">Category page added and live!</p>}
        </div>

        {/* Add Category Page Modal */}
        {showInitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInitModal(null)}>
            <div className={`w-full max-w-md mx-4 rounded-2xl border ${t.cardBdr} ${t.cardBg} p-6 space-y-4`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${t.title}`}>Add Sections â {routeToTitle(showInitModal)}</h3>
                <button onClick={() => setShowInitModal(null)} className={`text-xs ${t.muted} hover:opacity-70`}>â</button>
              </div>
              {menuCols.length === 0 ? (
                <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /><span className={`text-sm ${t.muted}`}>Loading collections...</span></div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {menuCols.slice().sort((a,b) => a.name.localeCompare(b.name)).map(col => (
                    <label key={col._id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5">
                      <input type="checkbox" checked={initColsSelected.has(col.name)} onChange={() => toggleInitCol(col.name)} className="w-4 h-4 accent-purple-500" />
                      <span className={`text-sm ${t.body}`}>{col.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowInitModal(null)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border ${t.dragBg} ${t.border} ${t.body} transition-colors`}>Cancel</button>
                <button onClick={() => confirmInit(showInitModal)} disabled={initColsSelected.size === 0}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors">
                  Add {initColsSelected.size > 0 ? `(${initColsSelected.size})` : ''} Sections
                </button>
              </div>
            </div>
          </div>
        )}
        {showHpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl ${t.cardBg} ${t.cardBdr}`}>
              <p className={`text-base font-bold ${t.title}`}>Add Homepage Section</p>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Collection</label>
                  <select value={hpForm.collectionId}
                    onChange={e => { const col = menuCols.find(c => c._id === e.target.value); setHpForm(f => ({ ...f, collectionId: e.target.value, title: col?.name || f.title })) }}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}>
                    <option value="">-- Select a collection --</option>
                    {menuCols.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Section Title</label>
                  <input type="text" value={hpForm.title} onChange={e => setHpForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Featured Delicacies"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>View Style</label>
                  <select value={hpForm.view} onChange={e => setHpForm(f => ({ ...f, view: e.target.value as any }))}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}>
                    <option value="landscape">Landscape (3-col, wide cards)</option>
                    <option value="portrait">Portrait (3-col, tall cards)</option>
                    <option value="split">Split (alternating image/text rows)</option>
                  </select>
                </div>
              </div>
              {hpError && <p className="text-xs text-red-400">{hpError}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowHpModal(false); setHpError('') }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
                  Cancel
                </button>
                <button onClick={addHpSection}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors">
                  Add Section
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${t.cardBg} ${t.cardBdr}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-bold ${t.title}`}>Add Category Page</h2>
                <button onClick={() => { setShowAddModal(false); setAddError('') }}
                  className={`p-1.5 rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.dragHover}`}>
                  <ChevronDown className={`w-4 h-4 ${t.muted} rotate-180`} />
                </button>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Collection</label>
                <select value={addForm.collectionName}
                  onChange={e => { const n = e.target.value; setAddForm(f => ({ ...f, collectionName: n, route: n ? colToRoute(n) : '', pageTitle: f.pageTitle || n })) }}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}>
                  <option value="">Select a collection...</option>
                  {menuCols.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Route</label>
                <input type="text" value={addForm.route} onChange={e => setAddForm(f => ({ ...f, route: e.target.value }))}
                  placeholder="/menus/cocktails"
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
                <p className={`text-xs mt-1 ${t.muted}`}>Auto-generated from collection name; edit if needed</p>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Page Title</label>
                <input type="text" value={addForm.pageTitle} onChange={e => setAddForm(f => ({ ...f, pageTitle: e.target.value }))}
                  placeholder="e.g. Specialty Cocktails"
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Subheading</label>
                <input type="text" value={addForm.subheroSub} onChange={e => setAddForm(f => ({ ...f, subheroSub: e.target.value }))}
                  placeholder="e.g. Handcrafted for every occasion"
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`} />
              </div>
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowAddModal(false); setAddError('') }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
                  Cancel
                </button>
                <button onClick={addCategoryPage} disabled={catAdding}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-50">
                  {catAdding ? 'Adding...' : 'Add Page'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      )
    }

    // -- EDIT VIEW ------------------------------------------------------------
    const _pg = stdPages.find(p => p.id === pmSlug)
    const _meta = PAGE_META[pmSlug || '']
    if (!_pg || !_meta || !_meta.fields.length) return null
    const page = { ..._meta, slug: _pg.id }
    const pageSlug = _pg.id
    const pageFields = pmContent[pageSlug] || {}
    function setField(key: string, val: string) {
      setPmContent(prev => ({ ...prev, [pageSlug]: { ...(prev[pageSlug]||{}), [key]: val } }))
    }

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setPmView('list'); setPmSlug(null) }}
            className={`p-2 rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.dragHover}`}>
            <ChevronDown className={`w-4 h-4 rotate-90 ${t.muted}`} />
          </button>
          <div className="flex-1">
            <h2 className={`font-bold ${t.title}`}>{page.label}</h2>
            <p className={`text-xs ${t.muted}`}>{pubBase}{_pg?.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            {pmSaved === page.slug && <span className="text-xs text-green-400 font-medium">+ Saved</span>}
            <a href={`${pubBase}${_pg?.slug}`} target="_blank" rel="noopener noreferrer"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
              Preview {'->'}
            </a>
            <button onClick={() => savePageContent(page.slug)} disabled={pmSaving}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-50">
              {pmSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className={`rounded-2xl border ${t.cardBdr} overflow-hidden`}>
          <div className={`p-5 grid gap-5 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'} ${t.cardBg}`}>
            {page.fields.map(field => (
              <div key={field.key} className={field.type === 'textarea' || field.type === 'image' || field.type === 'select' ? 'col-span-full' : ''}>
                <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>{field.label}</label>
                {field.hint && <p className={`text-xs mb-1.5 ${t.muted} opacity-70`}>{field.hint}</p>}

                {field.type === 'image' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {pageFields[field.key] && (
                        <img src={pageFields[field.key]} alt=""
                          className="w-14 h-14 rounded-xl object-cover border flex-shrink-0"
                          onError={e => (e.currentTarget.style.display='none')}
                        />
                      )}
                      <input type="text" value={pageFields[field.key]||''}
                        onChange={e => setField(field.key, e.target.value)}
                        placeholder="https://..."
                        className={`flex-1 px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}
                      />
                      <label className="flex-shrink-0 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(pageSlug, field.key, f); e.currentTarget.value = '' }}
                        />
                        <span className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${t.border} ${t.dragBg} ${t.body} ${t.dragHover} ${imgUploading[pageSlug+':'+field.key] ? 'opacity-50 pointer-events-none' : ''}`}>
                          {imgUploading[pageSlug+':'+field.key] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {imgUploading[pageSlug+':'+field.key] ? 'Uploading...' : 'Upload'}
                        </span>
                      </label>
                    </div>
                    {imgUploadError[pageSlug+':'+field.key] && (
                      <p className="text-xs text-red-400">{imgUploadError[pageSlug+':'+field.key]}</p>
                    )}
                  </div>
                )}

                {field.type === 'textarea' && (
                  <textarea rows={3} value={pageFields[field.key]||''}
                    onChange={e => setField(field.key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400 resize-y`}
                  />
                )}

                {field.type === 'text' && (
                  <input type="text" value={pageFields[field.key]||''}
                    onChange={e => setField(field.key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.cardBg} ${t.title} text-sm outline-none focus:ring-1 focus:ring-amber-400`}
                  />
                )}

                {field.type === 'select' && (
                  <div className="flex gap-2 flex-wrap">
                    {((field as any).options || []).map((opt: string) => {
                      const current = pageFields[field.key] || ((field as any).options||[])[0]
                      return (
                        <button key={opt} onClick={() => setField(field.key, opt)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-colors ${current === opt ? 'border-amber-500 bg-amber-500/10 text-amber-400' : `${t.cardBdr} ${isDark?'bg-gray-800 text-gray-300':'bg-stone-50 text-slate-600'}`}`}>
                          {opt === 'image-left' ? '← Image Left'
            : opt === 'image-right' ? 'Image Right →'
            : opt === 'small'  ? 'Small · 280px'
            : opt === 'medium' ? 'Medium · 420px'
            : opt === 'large'  ? 'Large · 580px'
            : opt === 'full'   ? 'Full Height'
            : opt === 'portrait'  ? 'Portrait (2:3)'
            : opt === 'landscape' ? 'Landscape (4:3)'
            : opt}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex justify-end gap-2">
          <button onClick={() => { setPmView('list'); setPmSlug(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${t.dragBg} ${t.border} ${t.body} ${t.dragHover}`}>
            {'<-'} Back
          </button>
          <button onClick={() => savePageContent(page.slug)} disabled={pmSaving}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-50">
            {pmSaving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>
    )
  
}