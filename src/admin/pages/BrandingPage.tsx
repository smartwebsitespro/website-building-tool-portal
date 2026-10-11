// BrandingPage.tsx -- Restaurant branding (logo, slogan, hero image)
// v2.15 | 10/08/2026 -- Feat: Slideshow Typography section (hero_heading_font/size/weight, hero_sub_size — independent from H1 typography)
// v2.14 | 10/05/2026 -- Feat: Typography section (font/size/weight for H1, H2, H3, Body, Accent per atmosphere defaults; auto-saves typo_* fields to site config)
// v2.13 | 10/01/2026 -- Feat: Dark Mouseover Color + Light Mouseover Color pickers in Display section
// v2.12 | 09/28/2026 -- Feat: Nav Button color controls (Order Ahead + Reserve a Table bg/text/border) in Display section
// v2.11 | 09/28/2026 -- Feat: Display section added (Menu Layout, Menu Button Color, Primary/Secondary Colors) moved from SettingsPage
// v2.10 | 09/28/2026 -- Fix: sub-page hero preview left-justified card with rounded corners + aspect-video (matches slideshow card style)
// v2.9 | 09/28/2026 -- Fix: sub-page hero preview shows full image (object-contain, not cropped)
// v2.8 | 09/28/2026 -- Feat: Default Sub-Page Hero field (subpageHeroUrl upload + save)
// v2.7 | 09/28/2026 -- Fix: heroVideoUrl always saved to KV regardless of mode (never wiped on slideshow save)
// v2.6 | 09/28/2026 -- Fix: draggable moved to thumbnail only (inputs fully outside drag zone); 3-col grid
// v2.5 | 09/28/2026 -- Fix: draggable parent blocks input clicks (onDragStart guard); larger thumbnails (2-col grid, aspect-square)
// v2.4 | 09/28/2026 -- Feat: per-slide heading + subtext text fields; HeroSlide type {url,heading,subtext}
// v2.3 | 09/28/2026 -- Fix: saveLabel null→Save; Hero multi-slide (8 slots, 4/row, drag-drop); Video mode saves + switches correctly
// v2.2 | 09/28/2026 -- Feat: Hero video toggle (Image / Video mode, YouTube/Vimeo/R2)
// v2.1 | 09/15/2026 -- Fix: hero image preview shows full landscape (aspect-video + object-contain)
// v2.0 | 09/11/2026 -- Rewired: reads from /site config, writes via /site/draft + /site/publish

import { useState, useEffect, useRef } from 'react'
import { Upload, GripVertical, X } from 'lucide-react'
import type { AdminPageProps } from '../adminShared'
import { SectionCard, saveLabel, makeHeaders } from '../adminShared'

export default function BrandingPage({ isDark, config, t }: AdminPageProps) {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024

  const [taglineInput,       setTaglineInput]       = useState('')
  const [taglineSaving,      setTaglineSaving]       = useState(false)
  const [taglineSaved,       setTaglineSaved]        = useState(false)

  const [navLogoInput,       setNavLogoInput]       = useState(config.logoUrl || '')
  const [navLogoSaving,      setNavLogoSaving]      = useState(false)
  const [navLogoSaved,       setNavLogoSaved]       = useState(false)
  const [navLogoUploading,   setNavLogoUploading]   = useState(false)

  const [footerLogoInput,    setFooterLogoInput]    = useState('')
  const [footerLogoSaving,   setFooterLogoSaving]   = useState(false)
  const [footerLogoSaved,    setFooterLogoSaved]    = useState(false)
  const [footerLogoUploading,setFooterLogoUploading]= useState(false)

  const [brandingVersion,    setBrandingVersion]    = useState(() => Date.now())
  const [templateId,         setTemplateId]         = useState<string>('')

  // Hero state
  const [heroMode,           setHeroMode]           = useState<'image'|'video'>('image')
  const [heroSlides,         setHeroSlides]         = useState<{url:string;heading:string;subtext:string}[]>([])
  const [heroSlideUploading, setHeroSlideUploading] = useState(false)
  const [heroVideoUrl,       setHeroVideoUrl]       = useState('')
  const [heroVideoUploading, setHeroVideoUploading] = useState(false)
  const [heroSaving,         setHeroSaving]         = useState(false)
  const [heroSaved,          setHeroSaved]          = useState(false)
  const [dragIdx,            setDragIdx]            = useState<number|null>(null)

  const [subpageHeroInput,    setSubpageHeroInput]    = useState('')
  const [subpageHeroUploading,setSubpageHeroUploading]= useState(false)
  const [subpageHeroSaving,   setSubpageHeroSaving]   = useState(false)
  const [subpageHeroSaved,    setSubpageHeroSaved]    = useState(false)
  const [subpageHeroKey,      setSubpageHeroKey]      = useState(0)

  // Display state
  const [menuLayout,       setMenuLayout]       = useState<'portrait'|'landscape'>('portrait')
  const [menuLayoutSaving, setMenuLayoutSaving] = useState(false)
  const [menuLayoutSaved,  setMenuLayoutSaved]  = useState(false)
  const [menuButtonColor,  setMenuButtonColor]  = useState('default')
  const [menuBtnSaving,    setMenuBtnSaving]    = useState(false)
  const [menuBtnSaved,     setMenuBtnSaved]     = useState(false)
  const [primaryColor,     setPrimaryColor]     = useState('#1a3c5e')
  const [primarySaving,    setPrimarySaving]    = useState(false)
  const [primarySaved,     setPrimarySaved]     = useState(false)
  const [secondaryColor,   setSecondaryColor]   = useState('#0d1f38')
  const [secondarySaving,  setSecondarySaving]  = useState(false)
  const [secondarySaved,   setSecondarySaved]   = useState(false)
  const [darkMouseoverColor,  setDarkMouseoverColor]  = useState('#1a1a2e')
  const [darkMouseoverSaving, setDarkMouseoverSaving] = useState(false)
  const [darkMouseoverSaved,  setDarkMouseoverSaved]  = useState(false)
  const [lightMouseoverColor, setLightMouseoverColor] = useState('#ffffff')
  const [lightMouseoverSaving,setLightMouseoverSaving]= useState(false)
  const [lightMouseoverSaved, setLightMouseoverSaved] = useState(false)
  const [headingColor,          setHeadingColor]          = useState('#1a3c5e')
  const [headingSaving,         setHeadingSaving]         = useState(false)
  const [headingSaved,          setHeadingSaved]          = useState(false)
  const [dividerHeadingColor,   setDividerHeadingColor]   = useState('#9d6125')
  const [dividerHeadingSaving,  setDividerHeadingSaving]  = useState(false)
  const [dividerHeadingSaved,   setDividerHeadingSaved]   = useState(false)
  const [borderColor,           setBorderColor]           = useState('#dce3eb')
  const [borderSaving,          setBorderSaving]          = useState(false)
  const [borderSaved,           setBorderSaved]           = useState(false)

  // Nav button state
  const [navCtaBg,       setNavCtaBg]       = useState('')
  const [navCtaText,     setNavCtaText]     = useState('#ffffff')
  const [navCtaBorder,   setNavCtaBorder]   = useState('')
  const [navOaBg,        setNavOaBg]        = useState('')
  const [navOaText,      setNavOaText]      = useState('#f59d60')
  const [navOaBorder,    setNavOaBorder]    = useState('')
  const [navBtnsSaving,  setNavBtnsSaving]  = useState(false)
  const [navBtnsSaved,   setNavBtnsSaved]   = useState(false)

  // Typography
  const [typoFields, setTypoFields] = useState<Record<string,string>>({})
  const [typoSaving, setTypoSaving] = useState(false)
  const [typoSaved,  setTypoSaved]  = useState(false)

  const navLogoFileRef    = useRef<HTMLInputElement>(null)
  const footerLogoFileRef = useRef<HTMLInputElement>(null)
  const heroSlideFileRef  = useRef<HTMLInputElement>(null)
  const heroVideoFileRef   = useRef<HTMLInputElement>(null)
  const subpageHeroFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = makeHeaders(config)
    fetch(`${config.workerUrl}/site`, { headers: h })
      .then(r => r.json()).catch(() => null)
      .then(data => {
        const site = data?.site
        if (!site) return
        const content = site.live?.content || site.draft?.content || {}
        const tplId   = site.live?.templateId || site.draft?.templateId || ''
        setTemplateId(tplId)
        if (content.tagline)      setTaglineInput(content.tagline)
        if (content.logoUrl)      setNavLogoInput(content.logoUrl)
        if (content.logoUrlLight) setFooterLogoInput(content.logoUrlLight)
        if (content.heroMode === 'video') setHeroMode('video')
        if (content.heroVideoUrl) setHeroVideoUrl(content.heroVideoUrl)
        // Load heroSlides — normalise: string[] (legacy) → {url,heading,subtext}[]
        if (content.heroSlides) {
          try {
            const parsed = typeof content.heroSlides === 'string'
              ? JSON.parse(content.heroSlides) : content.heroSlides
            if (Array.isArray(parsed)) {
              setHeroSlides(parsed.map((s: any) =>
                typeof s === 'string'
                  ? { url: s, heading: '', subtext: '' }
                  : { url: s.url || '', heading: s.heading || '', subtext: s.subtext || '' }
              ))
            }
          } catch {}
        }
        if (content.subpageHeroUrl) setSubpageHeroInput(content.subpageHeroUrl)
        // Display
        if (content.menuDefaultLayout) setMenuLayout(content.menuDefaultLayout as 'portrait'|'landscape')
        if (content.menuButtonColor)   setMenuButtonColor(content.menuButtonColor)
        if (content.primaryColor)      setPrimaryColor(content.primaryColor)
        if (content.secondaryColor)    setSecondaryColor(content.secondaryColor)
        if (content.darkMouseoverColor)  setDarkMouseoverColor(content.darkMouseoverColor)
        if (content.lightMouseoverColor) setLightMouseoverColor(content.lightMouseoverColor)
        if (content.headingColor)         setHeadingColor(content.headingColor)
        if (content.dividerHeadingColor)  setDividerHeadingColor(content.dividerHeadingColor)
        if (content.borderColor)           setBorderColor(content.borderColor)
        // Nav buttons
        if (content.navCtaBg)     setNavCtaBg(content.navCtaBg)
        if (content.navCtaText)   setNavCtaText(content.navCtaText)
        if (content.navCtaBorder) setNavCtaBorder(content.navCtaBorder)
        if (content.navOaBg)      setNavOaBg(content.navOaBg)
        if (content.navOaText)    setNavOaText(content.navOaText)
        if (content.navOaBorder)  setNavOaBorder(content.navOaBorder)

        // Typography
        const _typoKeys = ['typo_h1_font','typo_h1_size','typo_h1_weight','typo_h2_font','typo_h2_size','typo_h2_weight','typo_h3_font','typo_h3_size','typo_h3_weight','typo_body_font','typo_body_size','typo_body_weight','typo_accent_font','typo_accent_weight','typo_nav_font','typo_nav_size','typo_nav_weight','hero_heading_font','hero_heading_size','hero_heading_weight','hero_sub_size','hero_sub_font','hero_sub_weight']
        const _typoInit: Record<string,string> = {}
        for (const k of _typoKeys) if (content[k]) _typoInit[k] = content[k]
        setTypoFields(_typoInit)
      })
  }, [config.workerUrl, config.locationId])

  const pasteHex = (e: React.ClipboardEvent<HTMLInputElement>, fn: (v: string) => void) => { const v = e.clipboardData.getData('text').trim(); if (v) { e.preventDefault(); fn(v.startsWith('#') ? v : '#' + v) } }

  async function saveField(key: string, value: string): Promise<boolean> {
    const h = makeHeaders(config, { 'Content-Type': 'application/json' })
    await fetch(`${config.workerUrl}/site/draft`, {
      method: 'PUT', headers: h,
      body: JSON.stringify({ templateId, content: { [key]: value } }),
    })
    const res = await fetch(`${config.workerUrl}/site/publish`, {
      method: 'POST', headers: makeHeaders(config),
    })
    return res.ok
  }

  async function handleTaglineSave() {
    setTaglineSaving(true)
    try { await saveField('tagline', taglineInput); setTaglineSaved(true); setTimeout(() => setTaglineSaved(false), 2000) }
    catch {} setTaglineSaving(false)
  }

  async function handleNavLogoUpload(file: File) {
    setNavLogoUploading(true)
    try {
      const form = new FormData()
      form.append('file', file); form.append('folder', 'images'); form.append('slot', 'logo-dark')
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: makeHeaders(config), body: form })
      const data = await res.json()
      if (data.url) { setNavLogoInput(data.url); setBrandingVersion(Date.now()) }
    } catch {}
    setNavLogoUploading(false)
  }

  async function handleNavLogoSave() {
    setNavLogoSaving(true)
    try { await saveField('logoUrl', navLogoInput); setNavLogoSaved(true); setTimeout(() => setNavLogoSaved(false), 2000) }
    catch {} setNavLogoSaving(false)
  }

  async function handleFooterLogoUpload(file: File) {
    setFooterLogoUploading(true)
    try {
      const form = new FormData()
      form.append('file', file); form.append('folder', 'images'); form.append('slot', 'logo-light')
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: makeHeaders(config), body: form })
      const data = await res.json()
      if (data.url) { setFooterLogoInput(data.url); setBrandingVersion(Date.now()) }
    } catch {}
    setFooterLogoUploading(false)
  }

  async function handleFooterLogoSave() {
    setFooterLogoSaving(true)
    try { await saveField('logoUrlLight', footerLogoInput); setFooterLogoSaved(true); setTimeout(() => setFooterLogoSaved(false), 2000) }
    catch {} setFooterLogoSaving(false)
  }

  async function handleSlideUpload(file: File) {
    if (heroSlides.length >= 8) return
    setHeroSlideUploading(true)
    try {
      const form = new FormData()
      form.append('file', file); form.append('folder', 'images'); form.append('slot', `hero-slide-${Date.now()}`)
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: makeHeaders(config), body: form })
      const data = await res.json()
      if (data.url) setHeroSlides(prev => [...prev, { url: data.url, heading: '', subtext: '' }])
    } catch {}
    setHeroSlideUploading(false)
  }

  async function handleHeroVideoUpload(file: File) {
    setHeroVideoUploading(true)
    try {
      const form = new FormData()
      form.append('file', file); form.append('folder', 'images'); form.append('slot', 'hero-video')
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: makeHeaders(config), body: form })
      const data = await res.json()
      if (data.url) setHeroVideoUrl(data.url)
    } catch {}
    setHeroVideoUploading(false)
  }

  function removeSlide(i: number) { setHeroSlides(prev => prev.filter((_, idx) => idx !== i)) }

  function updateSlide(i: number, field: 'heading' | 'subtext', val: string) {
    setHeroSlides(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const next = [...heroSlides]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(targetIdx, 0, moved)
    setHeroSlides(next)
    setDragIdx(null)
  }

  async function handleSubpageHeroUpload(file: File) {
    setSubpageHeroUploading(true)
    try {
      const form = new FormData()
      form.append('file', file); form.append('folder', 'images'); form.append('slot', 'subpage-hero')
      const res  = await fetch(`${config.workerUrl}/upload`, { method: 'POST', headers: makeHeaders(config), body: form })
      const data = await res.json()
      if (data.url) {
        setSubpageHeroInput(data.url)
        setSubpageHeroKey(k => k + 1)
        // auto-save so image is live on the site immediately
        setSubpageHeroSaving(true)
        try { await saveField('subpageHeroUrl', data.url); setSubpageHeroSaved(true); setTimeout(() => setSubpageHeroSaved(false), 2000) }
        catch {} setSubpageHeroSaving(false)
      }
    } catch {}
    setSubpageHeroUploading(false)
  }

  async function handleSubpageHeroSave() {
    setSubpageHeroSaving(true)
    try { await saveField('subpageHeroUrl', subpageHeroInput); setSubpageHeroSaved(true); setTimeout(() => setSubpageHeroSaved(false), 2000) }
    catch {} setSubpageHeroSaving(false)
  }

  async function handleNavBtnChange(key: string, value: string) {
    setNavBtnsSaving(true)
    try { await saveField(key, value); setNavBtnsSaved(true); setTimeout(() => setNavBtnsSaved(false), 2000) }
    catch {} setNavBtnsSaving(false)
  }

  async function handleTypoChange(key: string, value: string) {
    setTypoFields(prev => ({ ...prev, [key]: value }))
    setTypoSaving(true)
    try { await saveField(key, value); setTypoSaved(true); setTimeout(() => setTypoSaved(false), 2000) }
    catch {} setTypoSaving(false)
  }

  async function handleLayoutToggle(newLayout: 'portrait'|'landscape') {
    setMenuLayout(newLayout)
    setMenuLayoutSaving(true)
    try { await saveField('menuDefaultLayout', newLayout); setMenuLayoutSaved(true); setTimeout(() => setMenuLayoutSaved(false), 2000) }
    catch {} setMenuLayoutSaving(false)
  }

  async function handleMenuButtonColorChange(color: string) {
    setMenuButtonColor(color)
    setMenuBtnSaving(true)
    try { await saveField('menuButtonColor', color); setMenuBtnSaved(true); setTimeout(() => setMenuBtnSaved(false), 2000) }
    catch {} setMenuBtnSaving(false)
  }

  async function handlePrimaryColorChange(color: string) {
    setPrimaryColor(color)
    setPrimarySaving(true)
    try { await saveField('primaryColor', color); setPrimarySaved(true); setTimeout(() => setPrimarySaved(false), 2000) }
    catch {} setPrimarySaving(false)
  }

  async function handleSecondaryColorChange(color: string) {
    setSecondaryColor(color)
    setSecondarySaving(true)
    try { await saveField('secondaryColor', color); setSecondarySaved(true); setTimeout(() => setSecondarySaved(false), 2000) }
    catch {} setSecondarySaving(false)
  }

  async function handleDarkMouseoverChange(color: string) {
    setDarkMouseoverColor(color)
    setDarkMouseoverSaving(true)
    try { await saveField('darkMouseoverColor', color); setDarkMouseoverSaved(true); setTimeout(() => setDarkMouseoverSaved(false), 2000) }
    catch {} setDarkMouseoverSaving(false)
  }

  async function handleHeadingColorChange(color: string) {
    setHeadingColor(color)
    setHeadingSaving(true)
    try { await saveField('headingColor', color); setHeadingSaved(true); setTimeout(() => setHeadingSaved(false), 2000) }
    catch {} setHeadingSaving(false)
  }

  async function handleDividerHeadingColorChange(color: string) {
    setDividerHeadingColor(color)
    setDividerHeadingSaving(true)
    try { await saveField('dividerHeadingColor', color); setDividerHeadingSaved(true); setTimeout(() => setDividerHeadingSaved(false), 2000) }
    catch {} setDividerHeadingSaving(false)
  }

  async function handleBorderColorChange(color: string) {
    setBorderColor(color)
    setBorderSaving(true)
    try { await saveField('borderColor', color); setBorderSaved(true); setTimeout(() => setBorderSaved(false), 2000) }
    catch {} setBorderSaving(false)
  }

  async function handleLightMouseoverChange(color: string) {
    setLightMouseoverColor(color)
    setLightMouseoverSaving(true)
    try { await saveField('lightMouseoverColor', color); setLightMouseoverSaved(true); setTimeout(() => setLightMouseoverSaved(false), 2000) }
    catch {} setLightMouseoverSaving(false)
  }

  async function handleHeroSave() {
    setHeroSaving(true)
    try {
      const h = makeHeaders(config, { 'Content-Type': 'application/json' })
      await fetch(`${config.workerUrl}/site/draft`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ templateId, content: {
          heroMode,
          heroVideoUrl,  // always persist — never wipe when toggling modes
          heroSlides: JSON.stringify(heroSlides),
        }}),
      })
      await fetch(`${config.workerUrl}/site/publish`, { method: 'POST', headers: makeHeaders(config) })
      setHeroSaved(true); setTimeout(() => setHeroSaved(false), 2000)
    } catch {}
    setHeroSaving(false)
  }

  return (
    <div className="space-y-6">

      <SectionCard isDark={isDark} title="Restaurant Tagline" description="Appears beneath your restaurant name in the hero and footer">
        {isDesktop ? (
          <div className="flex gap-2">
            <input value={taglineInput} onChange={e => setTaglineInput(e.target.value)}
              placeholder="Your restaurant tagline..."
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
            <button onClick={handleTaglineSave} disabled={taglineSaving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0 min-w-[72px]">
              {saveLabel(taglineSaving, taglineSaved)}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input value={taglineInput} onChange={e => setTaglineInput(e.target.value)}
              placeholder="Your restaurant tagline..."
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
            <button onClick={handleTaglineSave} disabled={taglineSaving}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saveLabel(taglineSaving, taglineSaved)}
            </button>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header Logo */}
        <SectionCard isDark={isDark} title="Header Logo" description="Dark logo for the site header (light background)">
          <input ref={navLogoFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleNavLogoUpload(f); e.target.value = '' }} />
          <div className={`flex ${isDesktop ? '' : 'flex-col'} gap-2`}>
            <div className="flex gap-2 flex-1">
              <input value={navLogoInput} onChange={e => setNavLogoInput(e.target.value)}
                placeholder="https://..."
                className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
              <button onClick={() => navLogoFileRef.current?.click()} disabled={navLogoUploading}
                className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center min-w-[44px] ${t.btnSec}`}>
                {navLogoUploading ? <span className="text-xs">…</span> : <Upload className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleNavLogoSave} disabled={navLogoSaving}
              className={`px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors ${isDesktop ? 'flex-shrink-0 min-w-[64px]' : 'w-full'}`}>
              {saveLabel(navLogoSaving, navLogoSaved)}
            </button>
          </div>
          {navLogoInput && (
            <div className="mt-3 p-3 bg-gray-100 rounded-xl inline-block">
              <img src={`${navLogoInput}?v=${brandingVersion}`} alt="Header logo preview" className="h-10 w-auto" />
            </div>
          )}
        </SectionCard>

        {/* Footer Logo */}
        <SectionCard isDark={isDark} title="Footer Logo" description="White/light logo for the site footer (dark background)">
          <input ref={footerLogoFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFooterLogoUpload(f); e.target.value = '' }} />
          <div className={`flex ${isDesktop ? '' : 'flex-col'} gap-2`}>
            <div className="flex gap-2 flex-1">
              <input value={footerLogoInput} onChange={e => setFooterLogoInput(e.target.value)}
                placeholder="https://..."
                className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
              <button onClick={() => footerLogoFileRef.current?.click()} disabled={footerLogoUploading}
                className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center min-w-[44px] ${t.btnSec}`}>
                {footerLogoUploading ? <span className="text-xs">…</span> : <Upload className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleFooterLogoSave} disabled={footerLogoSaving}
              className={`px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors ${isDesktop ? 'flex-shrink-0 min-w-[64px]' : 'w-full'}`}>
              {saveLabel(footerLogoSaving, footerLogoSaved)}
            </button>
          </div>
          {footerLogoInput && (
            <div className="mt-3 p-3 bg-gray-800 rounded-xl inline-block border border-gray-700">
              <img src={`${footerLogoInput}?v=${brandingVersion}`} alt="Footer logo preview" className="h-10 w-auto" />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Hero — Image / Video */}
      <SectionCard isDark={isDark} title="Hero" description="Full-screen homepage hero — image slideshow (up to 8, drag to reorder) or looping background video">
        <input ref={heroSlideFileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleSlideUpload(f); e.target.value = '' }} />
        <input ref={heroVideoFileRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroVideoUpload(f); e.target.value = '' }} />

        {/* Mode toggle */}
        <div className={`inline-flex rounded-lg border overflow-hidden mb-5 ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
          {(['image','video'] as const).map(m => (
            <button key={m} onClick={() => setHeroMode(m)}
              className={`px-5 py-2 text-sm font-medium transition-colors ${heroMode === m
                ? 'bg-amber-500 text-white'
                : isDark ? 'bg-transparent text-gray-400 hover:text-white' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}>
              {m === 'image' ? '🖼 Slideshow' : '🎬 Video'}
            </button>
          ))}
        </div>

        {heroMode === 'image' ? (
          <div className="space-y-3">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Upload up to 8 images. Drag to reorder. Saved slides replace the default homepage photos.
            </p>
            {/* 3-col slide grid — thumbnail is the ONLY draggable element; inputs are outside drag zone */}
            <div className="grid grid-cols-3 gap-3">
              {heroSlides.map((slide, i) => (
                <div key={i}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={`rounded-xl border-2 overflow-hidden transition-all
                    ${dragIdx === i
                      ? 'opacity-40 border-amber-400 scale-95'
                      : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-stone-200 hover:border-stone-300'}`}>
                  {/* Thumbnail — ONLY this div is draggable; inputs below are unaffected */}
                  <div
                    draggable
                    onDragStart={e => {
                      setDragIdx(i)
                      const el = e.currentTarget
                      const rect = el.getBoundingClientRect()
                      e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top)
                    }}
                    onDragEnd={() => setDragIdx(null)}
                    className="relative aspect-square cursor-grab select-none">
                    <img src={slide.url} alt={`Slide ${i+1}`} crossOrigin="anonymous" className="w-full h-full object-cover pointer-events-none" />
                    <button onClick={() => removeSlide(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors z-10 pointer-events-auto">
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5 pointer-events-none">
                      <GripVertical className="w-3 h-3 text-white/80" />
                      <span className="text-[10px] text-white/80 font-medium">{i + 1}</span>
                    </div>
                  </div>
                  {/* Text fields — NOT inside draggable; click/select/double-click work normally */}
                  <div className={`p-2 space-y-1.5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <input
                      value={slide.heading}
                      onChange={e => updateSlide(i, 'heading', e.target.value)}
                      placeholder="Heading…"
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500 transition-colors ${t.input}`}
                    />
                    <input
                      value={slide.subtext}
                      onChange={e => updateSlide(i, 'subtext', e.target.value)}
                      placeholder="Subtext…"
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500 transition-colors ${t.input}`}
                    />
                  </div>
                </div>
              ))}
              {heroSlides.length < 8 && (
                <button onClick={() => heroSlideFileRef.current?.click()} disabled={heroSlideUploading}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-sm transition-colors
                    ${isDark ? 'border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400' : 'border-stone-300 text-slate-400 hover:border-amber-500 hover:text-amber-500'}`}>
                  {heroSlideUploading ? <span className="text-base">…</span> : <><Upload className="w-5 h-5" /><span className="text-xs text-center">Add slide<br/><span className="opacity-60">{heroSlides.length}/8</span></span></>}
                </button>
              )}
            </div>
            {heroSlides.length === 0 && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                No slides added — homepage will show the default built-in images until you upload.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Paste a YouTube or Vimeo URL, or upload a short MP4 (≤ 30s) to host on R2. The video loops silently behind your hero content.
            </p>
            <div className="flex gap-2">
              <input value={heroVideoUrl} onChange={e => setHeroVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
              <button onClick={() => heroVideoFileRef.current?.click()} disabled={heroVideoUploading}
                title="Upload MP4 to R2"
                className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center min-w-[44px] ${t.btnSec}`}>
                {heroVideoUploading ? <span className="text-xs">…</span> : <Upload className="w-4 h-4" />}
              </button>
            </div>
            {heroVideoUrl && (
              <p className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                ✓ {heroVideoUrl.includes('youtu') ? 'YouTube' : heroVideoUrl.includes('vimeo') ? 'Vimeo' : 'R2 video'} set — loops silently as hero background after Save.
              </p>
            )}
          </div>
        )}

        <button onClick={handleHeroSave} disabled={heroSaving}
          className="mt-5 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {heroSaving ? 'Saving…' : heroSaved ? 'Saved ✓' : 'Save Hero'}
        </button>
      </SectionCard>

      {/* Default Sub-Page Hero */}
      <SectionCard isDark={isDark} title="Default Sub-Page Hero" description="Fallback banner image for all interior pages (About, Reviews, VIP Club, etc.) that don’t have a page-specific hero set in Page Manager">
        <input ref={subpageHeroFileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleSubpageHeroUpload(f); e.target.value = '' }} />
        <div className={`flex ${isDesktop ? '' : 'flex-col'} gap-2`}>
          <div className="flex gap-2 flex-1">
            <input value={subpageHeroInput} onChange={e => setSubpageHeroInput(e.target.value)}
              placeholder="https://... (paste URL or upload photo)"
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`} />
            <button onClick={() => subpageHeroFileRef.current?.click()} disabled={subpageHeroUploading}
              className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center min-w-[44px] ${t.btnSec}`}>
              {subpageHeroUploading ? <span className="text-xs">…</span> : <Upload className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={handleSubpageHeroSave} disabled={subpageHeroSaving}
            className={`px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors ${isDesktop ? 'flex-shrink-0 min-w-[64px]' : 'w-full'}`}>
            {saveLabel(subpageHeroSaving, subpageHeroSaved)}
          </button>
        </div>
        {subpageHeroInput && (
          <div className={`mt-3 w-64 rounded-xl border-2 overflow-hidden ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
            <div className="relative aspect-video">
              <img key={subpageHeroKey} src={subpageHeroInput + '?cb=' + subpageHeroKey} alt="Sub-page hero preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          Per-page images set in Page Manager always take priority over this default.
        </p>
      </SectionCard>

      {/* Display */}
      <SectionCard isDark={isDark} title="Display" description="Colors, menu layout, and button style for your public site">

        {/* Row 1: Menu Card Layout + Menu Button Color */}
        <div className="grid grid-cols-2 gap-6">

          {/* Menu Card Layout */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Menu Card Layout</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Default view visitors see on your menu page.</p>
              </div>
              {menuLayoutSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0 mt-1`}>Saving…</span>}
              {menuLayoutSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0 mt-1">Saved ✓</span>}
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium transition-colors ${menuLayout === 'portrait' ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-gray-400' : 'text-slate-400')}`}>Portrait</span>
              <button
                onClick={() => handleLayoutToggle(menuLayout === 'portrait' ? 'landscape' : 'portrait')}
                style={{
                  position:'relative', flexShrink:0, width:'52px', height:'28px',
                  borderRadius:'14px', padding:'4px', border:'none', cursor:'pointer',
                  background: menuLayout === 'landscape' ? '#f59e0b' : (isDark ? '#4b5563' : '#d1d5db'),
                  transition:'background 0.2s', outline:'none',
                }}>
                <span style={{
                  display:'block', width:'20px', height:'20px', borderRadius:'50%',
                  background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.25)',
                  transition:'transform 0.2s',
                  transform: menuLayout === 'landscape' ? 'translateX(24px)' : 'translateX(0)',
                }} />
              </button>
              <span className={`text-sm font-medium transition-colors ${menuLayout === 'landscape' ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-gray-400' : 'text-slate-400')}`}>Landscape</span>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves automatically when you toggle.</p>
          </div>

          {/* Menu Button Color */}
          <div className={`pl-6 border-l ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Menu Button Color</p>
              {menuBtnSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {menuBtnSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Color of the &ldquo;See More&rdquo; buttons on each menu card.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'default', label: 'Default (Black)' },
                { value: 'primary', label: 'Primary Color' },
                { value: 'custom',  label: 'Custom' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => {
                    const isCustom = opt.value === 'custom'
                    const isCurrentlyCustom = !['default','primary'].includes(menuButtonColor)
                    if (isCustom) { if (!isCurrentlyCustom) handleMenuButtonColorChange('#c8a96e') }
                    else { handleMenuButtonColorChange(opt.value) }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${
                    (opt.value === 'custom' ? !['default','primary'].includes(menuButtonColor) : menuButtonColor === opt.value)
                      ? 'border-amber-500 bg-amber-500/10 ' + (isDark ? 'text-amber-300' : 'text-amber-600')
                      : (isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-stone-200 bg-stone-50 text-slate-600 hover:bg-stone-100')
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {!['default','primary'].includes(menuButtonColor) && (
              <div className="flex items-center gap-3 mt-2">
                <input type="color" value={menuButtonColor} onChange={e => handleMenuButtonColorChange(e.target.value)}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                <input type="text" value={menuButtonColor} onChange={e => handleMenuButtonColorChange(e.target.value)}
                  onPaste={e => pasteHex(e, handleMenuButtonColorChange)}
                  placeholder="#000000"
                  className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>white text</span>
              </div>
            )}
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>
        </div>

        {/* Row 2: Primary + Secondary Colors */}
        <div className={`grid grid-cols-2 gap-6 mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>

          {/* Primary Color */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Primary Color</p>
              {primarySaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {primarySaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Your site&apos;s main brand color &mdash; backgrounds, navigation, and buttons.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={e => handlePrimaryColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={primaryColor} onChange={e => handlePrimaryColorChange(e.target.value)}
                onPaste={e => pasteHex(e, handlePrimaryColorChange)}
                placeholder="#1a3c5e"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>

          {/* Secondary Color */}
          <div className={`pl-6 border-l ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Secondary Color</p>
              {secondarySaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {secondarySaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Footer background, nav Reservations button, and order page banner.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={secondaryColor} onChange={e => handleSecondaryColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={secondaryColor} onChange={e => handleSecondaryColorChange(e.target.value)}
                onPaste={e => pasteHex(e, handleSecondaryColorChange)}
                placeholder="#0d1f38"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>
        </div>

        {/* Row 3: Dark + Light Mouseover Colors */}
        <div className={`grid grid-cols-2 gap-6 mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>

          {/* Dark Mouseover Color */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Dark Mouseover Color</p>
              {darkMouseoverSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {darkMouseoverSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Hover color for elements on light backgrounds.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={darkMouseoverColor} onChange={e => handleDarkMouseoverChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={darkMouseoverColor} onChange={e => handleDarkMouseoverChange(e.target.value)}
                onPaste={e => pasteHex(e, handleDarkMouseoverChange)}
                placeholder="#1a1a2e"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>

          {/* Light Mouseover Color */}
          <div className={`pl-6 border-l ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Light Mouseover Color</p>
              {lightMouseoverSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {lightMouseoverSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Hover color for elements on dark or colored backgrounds — wired to the hero action bar.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={lightMouseoverColor} onChange={e => handleLightMouseoverChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={lightMouseoverColor} onChange={e => handleLightMouseoverChange(e.target.value)}
                onPaste={e => pasteHex(e, handleLightMouseoverChange)}
                placeholder="#ffffff"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>
        </div>

      </SectionCard>

      {/* Typography Colors */}
      <SectionCard isDark={isDark} title="Typography Colors" description="Control heading and accent text colors throughout the site">
        <div className="grid grid-cols-2 gap-6">

          {/* Section Heading Color */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Section Heading Color</p>
              {headingSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {headingSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Color of h1, h2 section headings throughout the site.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={headingColor} onChange={e => handleHeadingColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={headingColor} onChange={e => handleHeadingColorChange(e.target.value)}
                onPaste={e => pasteHex(e, handleHeadingColorChange)}
                placeholder="#1a3c5e"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>

          {/* Divider Heading Color */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Divider Heading Color</p>
              {dividerHeadingSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {dividerHeadingSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Color of the featured band headings over background images.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={dividerHeadingColor} onChange={e => handleDividerHeadingColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={dividerHeadingColor} onChange={e => handleDividerHeadingColorChange(e.target.value)}
                onPaste={e => pasteHex(e, handleDividerHeadingColorChange)}
                placeholder="#9d6125"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>

          {/* Border Color */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Border Color</p>
              {borderSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'} flex-shrink-0`}>Saving…</span>}
              {borderSaved  && <span className="text-xs text-green-400 font-medium flex-shrink-0">Saved ✓</span>}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} mb-4`}>Light border used on cards, image frames, and dividers across the site.</p>
            <div className="flex items-center gap-3">
              <input type="color" value={borderColor} onChange={e => handleBorderColorChange(e.target.value)}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
              <input type="text" value={borderColor} onChange={e => handleBorderColorChange(e.target.value)}
                onPaste={e => pasteHex(e, handleBorderColorChange)}
                placeholder="#dce3eb"
                className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Saves and publishes automatically.</p>
          </div>

        </div>
      </SectionCard>

      {/* Nav Buttons */}
      <SectionCard isDark={isDark} title="Nav Buttons" description="Background, text, and border color for the Order Ahead and Reserve a Table buttons in the navigation">
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Changes publish automatically. Leave a field blank to use the site accent color default.</p>
          <div className="flex-shrink-0 ml-4">
            {navBtnsSaving && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Saving…</span>}
            {navBtnsSaved  && <span className="text-xs text-green-400 font-medium">Saved ✓</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">

          {/* Order Ahead */}
          <div>
            <p className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Order Ahead <span className={`text-xs font-normal ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>(outlined style)</span></p>

            <div className="space-y-4">
              {/* OA Border */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Border Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navOaBorder || '#e07b39'}
                    onChange={e => setNavOaBorder(e.target.value)}
                    onBlur={e => handleNavBtnChange('navOaBorder', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navOaBorder}
                    onChange={e => setNavOaBorder(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavOaBorder(v); handleNavBtnChange('navOaBorder', v) })}
                    onBlur={e => handleNavBtnChange('navOaBorder', e.target.value)}
                    placeholder="accent (default)"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>

              {/* OA Text */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Text Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navOaText || '#f59d60'}
                    onChange={e => setNavOaText(e.target.value)}
                    onBlur={e => handleNavBtnChange('navOaText', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navOaText}
                    onChange={e => setNavOaText(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavOaText(v); handleNavBtnChange('navOaText', v) })}
                    onBlur={e => handleNavBtnChange('navOaText', e.target.value)}
                    placeholder="#f59d60"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>

              {/* OA Background */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Background <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>(type &ldquo;transparent&rdquo; for outlined)</span></p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navOaBg && navOaBg !== 'transparent' ? navOaBg : '#ffffff'}
                    onChange={e => setNavOaBg(e.target.value)}
                    onBlur={e => handleNavBtnChange('navOaBg', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navOaBg}
                    onChange={e => setNavOaBg(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavOaBg(v); handleNavBtnChange('navOaBg', v) })}
                    onBlur={e => handleNavBtnChange('navOaBg', e.target.value)}
                    placeholder="transparent (default)"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>
            </div>
          </div>

          {/* Reserve a Table */}
          <div className={`pl-8 border-l ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
            <p className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Reserve a Table <span className={`text-xs font-normal ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>(solid style)</span></p>

            <div className="space-y-4">
              {/* CTA Background */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Background Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navCtaBg || '#e07b39'}
                    onChange={e => setNavCtaBg(e.target.value)}
                    onBlur={e => handleNavBtnChange('navCtaBg', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navCtaBg}
                    onChange={e => setNavCtaBg(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavCtaBg(v); handleNavBtnChange('navCtaBg', v) })}
                    onBlur={e => handleNavBtnChange('navCtaBg', e.target.value)}
                    placeholder="accent (default)"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>

              {/* CTA Text */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Text Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navCtaText || '#ffffff'}
                    onChange={e => setNavCtaText(e.target.value)}
                    onBlur={e => handleNavBtnChange('navCtaText', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navCtaText}
                    onChange={e => setNavCtaText(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavCtaText(v); handleNavBtnChange('navCtaText', v) })}
                    onBlur={e => handleNavBtnChange('navCtaText', e.target.value)}
                    placeholder="#ffffff"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>

              {/* CTA Border */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Border Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={navCtaBorder || '#e07b39'}
                    onChange={e => setNavCtaBorder(e.target.value)}
                    onBlur={e => handleNavBtnChange('navCtaBorder', e.target.value)}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0.5 flex-shrink-0"/>
                  <input type="text" value={navCtaBorder}
                    onChange={e => setNavCtaBorder(e.target.value)}
                    onPaste={e => pasteHex(e, v => { setNavCtaBorder(v); handleNavBtnChange('navCtaBorder', v) })}
                    onBlur={e => handleNavBtnChange('navCtaBorder', e.target.value)}
                    placeholder="same as background"
                    className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400`}/>
                </div>
              </div>
            </div>
          </div>
        </div>

      </SectionCard>

      {/* ── Typography ───────────────────────────────────────────────── */}
      <SectionCard title="Typography" isDark={isDark}>
        {(() => {
          const FONTS = [
            { v: 'Plus Jakarta Sans',   l: 'Plus Jakarta Sans — Sans Serif' },
            { v: 'Playfair Display',    l: 'Playfair Display — Elegant Serif' },
            { v: 'Dancing Script',      l: 'Dancing Script — Script' },
            { v: 'Cormorant Garamond',  l: 'Cormorant Garamond — Classic Serif' },
            { v: 'Lora',               l: 'Lora — Readable Serif' },
            { v: 'Merriweather',       l: 'Merriweather — Bold Serif' },
            { v: 'Montserrat',         l: 'Montserrat — Clean Sans' },
            { v: 'Oswald',             l: 'Oswald — Condensed Sans' },
            { v: 'Raleway',            l: 'Raleway — Elegant Sans' },
            { v: 'Rye',               l: 'Rye — Display / Western' },
          ]
          const WEIGHTS = ['300','400','500','600','700','800']
          const H1_SIZES = [
            { v: 'clamp(2rem,5vw,3.5rem)',    l: 'Small' },
            { v: 'clamp(2.5rem,6vw,4.5rem)',  l: 'Medium' },
            { v: 'clamp(3rem,7.5vw,5.8rem)',  l: 'Large' },
            { v: 'clamp(3.5rem,8.5vw,7rem)',  l: 'X-Large' },
          ]
          const H2_SIZES = [
            { v: 'clamp(1.4rem,3vw,2rem)',    l: 'Small' },
            { v: 'clamp(1.6rem,3.5vw,2.5rem)',l: 'Medium' },
            { v: 'clamp(1.9rem,4.5vw,2.9rem)',l: 'Large' },
            { v: 'clamp(2.2rem,5vw,3.5rem)',  l: 'X-Large' },
          ]
          const H3_SIZES = [
            { v: '.95rem',  l: 'Small' },
            { v: '1.1rem',  l: 'Medium' },
            { v: '1.3rem',  l: 'Large' },
            { v: '1.5rem',  l: 'X-Large' },
          ]
          const BODY_SIZES = [
            { v: '.875rem',   l: 'Small (.875)' },
            { v: '1rem',      l: 'Normal (1rem)' },
            { v: '1.0625rem', l: 'Large (1.0625)' },
          ]
          const HERO_SIZES = [
            { v: 'clamp(1.4rem,3vw,2.2rem)',   l: 'XSmall' },
            { v: 'clamp(1.8rem,4vw,3rem)',     l: 'Small' },
            { v: 'clamp(2.2rem,5vw,3.8rem)',   l: 'Medium' },
            { v: 'clamp(2.8rem,6vw,4.5rem)',   l: 'Large' },
            { v: 'clamp(3rem,7.5vw,5.8rem)',   l: 'X-Large' },
          ]
          const HERO_SUB_SIZES = [
            { v: '.8rem',                      l: 'Small' },
            { v: 'clamp(.9rem,1.6vw,1.1rem)',  l: 'Normal' },
            { v: 'clamp(1rem,1.8vw,1.25rem)',  l: 'Large' },
          ]
          const sel = `w-full px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-stone-200 bg-white text-slate-800'} text-sm outline-none focus:ring-1 focus:ring-amber-400`
          const fontSel = (key: string) => (
            <select value={typoFields[key] || ''} onChange={e => handleTypoChange(key, e.target.value)} className={sel}>
              <option value="">Atmosphere default</option>
              {FONTS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          )
          const sizeSel = (key: string, sizes: {v:string,l:string}[], def: string) => (
            <select value={typoFields[key] || def} onChange={e => handleTypoChange(key, e.target.value)} className={sel}>
              {sizes.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          )
          const weightSel = (key: string, def: string) => (
            <select value={typoFields[key] || def} onChange={e => handleTypoChange(key, e.target.value)} className={sel}>
              {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          )
          const rowLabel = (label: string, sub: string) => (
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>{sub}</p>
            </div>
          )
          const divider = `pt-3 border-t ${isDark ? 'border-gray-700' : 'border-stone-100'}`
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Changes save automatically on select</p>
                {typoSaving && <span className="text-xs text-amber-500">Saving…</span>}
                {typoSaved  && <span className="text-xs text-emerald-500">Saved ✓</span>}
              </div>
              <div className={`grid grid-cols-4 gap-3 pb-2 border-b ${isDark ? 'border-gray-700' : 'border-stone-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Element</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Font</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Size</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Weight</p>
              </div>
              <div className="grid grid-cols-4 gap-3 items-center">
                {rowLabel('Heading — H1', 'Hero titles, large banners')}
                {fontSel('typo_h1_font')}
                {sizeSel('typo_h1_size', H1_SIZES, 'clamp(3rem,7.5vw,5.8rem)')}
                {weightSel('typo_h1_weight', '800')}
              </div>
              <div className={`grid grid-cols-4 gap-3 items-center ${divider}`}>
                {rowLabel('Subheading — H2', 'Section titles, page headings')}
                {fontSel('typo_h2_font')}
                {sizeSel('typo_h2_size', H2_SIZES, 'clamp(1.9rem,4.5vw,2.9rem)')}
                {weightSel('typo_h2_weight', '700')}
              </div>
              <div className={`grid grid-cols-4 gap-3 items-center ${divider}`}>
                {rowLabel('Card title — H3', 'Cards, menu items, features')}
                {fontSel('typo_h3_font')}
                {sizeSel('typo_h3_size', H3_SIZES, '1.3rem')}
                {weightSel('typo_h3_weight', '700')}
              </div>
              <div className={`grid grid-cols-4 gap-3 items-center ${divider}`}>
                {rowLabel('Body text', 'Paragraphs, descriptions, nav links')}
                {fontSel('typo_body_font')}
                {sizeSel('typo_body_size', BODY_SIZES, '1rem')}
                {weightSel('typo_body_weight', '400')}
              </div>
              <div className={`grid grid-cols-4 gap-3 items-center ${divider}`}>
                {rowLabel('Accent / Script', 'Decorative headings, specials section')}
                {fontSel('typo_accent_font')}
                <div className={`text-sm ${isDark ? 'text-gray-600' : 'text-slate-300'}`}>—</div>
                {weightSel('typo_accent_weight', '700')}
              </div>
              <div className={`pt-4 mt-2 border-t-2 ${isDark ? 'border-gray-600' : 'border-stone-300'} flex items-center justify-between`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Slideshow Typography</p>
                <div className="mb-3">
                  {typoSaving && <span className="text-xs text-amber-500">Saving…</span>}
                  {typoSaved  && <span className="text-xs text-emerald-500">Saved ✓</span>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 items-center">
                {rowLabel('Slide Heading', 'Font, size and weight of hero slide headings')}
                {fontSel('hero_heading_font')}
                {sizeSel('hero_heading_size', HERO_SIZES, 'clamp(2.2rem,5vw,3.8rem)')}
                {weightSel('hero_heading_weight', '800')}
              </div>
              <div className={`grid grid-cols-4 gap-3 items-center ${divider}`}>
                {rowLabel('Slide Subtext', 'Font, size and weight of subtext below each slide heading')}
                {fontSel('hero_sub_font')}
                {sizeSel('hero_sub_size', HERO_SUB_SIZES, 'clamp(.9rem,1.6vw,1.1rem)')}
                {weightSel('hero_sub_weight', '300')}
              </div>
              <p className={`text-xs pt-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                &ldquo;Atmosphere default&rdquo; uses the built-in fonts for this restaurant&apos;s design. Changes override the default for this location only.
              </p>
            </div>
          )
        })()}
      </SectionCard>

    </div>
  )
}
