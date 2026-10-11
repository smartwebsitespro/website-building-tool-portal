// v4.7 | 09/23/2026 1:17 AM PDT -- Gallery Manager: GalleryPage import, PATH/SECTION maps, renderActivePage case
// v5.6 | 10/07/2026 8:13 PM PDT -- Add: AdminDocs page + docs section
// v5.5 | 09/30/2026 9:32 PM PDT -- Remove: ChatPage; Add: MediaManagerPage; reorder sidebar sections
// v5.4 | 09/30/2026 8:05 PM PDT -- Add: ContactsDashboard page + contacts-dashboard section
// v5.3 | 09/25/2026 3:26 AM PDT -- Fix: goToSection preserves slug in URL; PATH_TO_SECTION lookup strips slug prefix so Firefish/PT sections resolve correctly
// v5.2 | 09/24/2026 2:50 PM PDT -- Order Ahead Manager page: conditional sidebar link (ecomEnabled), import + route
// v5.1 | 09/24/2026 2:19 PM PDT -- adminShared: Firefish logoUrl hardcoded; img onError clears to fallback
// v5.0 | 09/24/2026 2:00 PM PDT -- Sidebar logo: fetch live logoUrl from /site after auth; shows Branding section logo per restaurant
// v4.9 | 09/24/2026 3:42 AM PDT -- Portal session: 14-day TTL token skips OTP on revisit; logout clears session
// v4.8 | 09/23/2026 9:48 PM PDT -- Portal home: email OTP flow (Packed House HQ branding); no location picker; cross-location slug resolution via worker
// v4.7 | 09/23/2026 9:27 PM PDT -- Portal home: root / shows Packed House location picker; _slug nullable; TS fix: ternary instead of && for CONFIG type safety
// v4.6 | 09/17/2026 -- Direct-linkable admin pages: URL updates on sidebar nav; landing on /BrandingPage loads admin with correct section active
// v4.5 | 09/09/2026 -- View Location URL - spacedock.smartwebsitespro.biz
// v4.4 | 09/09/2026 -- Fix: copyright pinned to bottom of scroll area via min-h-full flex flex-col
// v4.3 | 09/09/2026 -- Sidebar: logo centered+larger, footer with View Live/Location/SignOut; copyright in scroll area
// v4.2 | 09/09/2026 -- Sidebar: taller logo, Admin Dashboard label, Live pill; topbar: labeled action buttons
// v4.1 | 09/09/2026 -- Fix: h-screen layout, sidebar sticky, content scrolls independently
// v4.0 | 09/09/2026 -- Full page split: each section is its own page component
// v3.61 | 09/09/2026 -- ReservationsPanel v2.0 integrated
// Shell handles: auth, sidebar nav, header, dark mode toggle, section routing
// Each page handles: its own data fetching and state

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu as MenuIcon, X, Sun, Moon, LogOut, Globe, Utensils, ExternalLink } from 'lucide-react'

import {
  RESTAURANT_CONFIGS, SECTIONS, buildTheme, sha256,
  LS_ADMIN_THEME, type SectionId, type RestaurantConfig,
} from './adminShared'

// -- Page imports ------------------------------------------------------------
import DashboardPage      from './pages/DashboardPage'
import MenuManagerPage    from './pages/MenuManagerPage'
import PageManagerPage    from './pages/PageManagerPage'
import SmsSpecialsPage    from './pages/SmsSpecialsPage'
import ReservationsPage   from './pages/ReservationsPage'
import WaitlistPage       from './pages/WaitlistPage'
import MediaManagerPage      from './pages/MediaManagerPage'
import BrandingPage       from './pages/BrandingPage'
import MediaLibraryPage   from './pages/MediaLibraryPage'
import SettingsPage       from './pages/SettingsPage'
import GalleryPage        from './pages/GalleryPage'
import OrderAheadPage        from './pages/OrderAheadPage'
import ContactsDashboard     from './pages/ContactsDashboard'
import AdminDocs             from './pages/AdminDocs'

// -- Slug + config resolution -------------------------------------------------
const _slug  = window.location.pathname.split('/').find(s => s && RESTAURANT_CONFIGS[s]) ?? null
const _isPortalHome = !_slug
const CONFIG : RestaurantConfig = (_slug !== null ? RESTAURANT_CONFIGS[_slug] : undefined) ?? RESTAURANT_CONFIGS.pacifictable
const STORE_KEY = `${_slug ?? 'portal'}_admin_hash`

// URL <-> section maps -- every admin page is directly linkable
const PATH_TO_SECTION: Record<string, string> = {
  '/DashboardPage':    'dashboard',
  '/MenuManagerPage':  'menu-manager',
  '/PageManagerPage':  'menu',
  '/SmsSpecialsPage':  'sms-specials',
  '/ReservationsPage': 'reservations',
  '/WaitlistPage':     'waitlist',
  '/MediaManagerPage':     'media-manager',
  '/BrandingPage':     'branding',
  '/MediaLibraryPage': 'media-library',
  '/SettingsPage':     'settings',
  '/GalleryPage':      'gallery',
  '/OrderAheadPage':       'order-ahead',
  '/ContactsDashboard':    'contacts-dashboard',
  '/AdminDocs':             'docs',
}
const SECTION_TO_PATH: Record<string, string> = {
  'dashboard':     '/DashboardPage',
  'menu-manager':  '/MenuManagerPage',
  'menu':          '/PageManagerPage',
  'sms-specials':  '/SmsSpecialsPage',
  'reservations':  '/ReservationsPage',
  'waitlist':      '/WaitlistPage',
  'media-manager':    '/MediaManagerPage',
  'branding':      '/BrandingPage',
  'media-library': '/MediaLibraryPage',
  'settings':      '/SettingsPage',
  'gallery':       '/GalleryPage',
  'order-ahead':          '/OrderAheadPage',
  'contacts-dashboard':   '/ContactsDashboard',
  'docs':                   '/AdminDocs',
}

// -- Component ----------------------------------------------------------------
export default function RestaurantAdmin() {
  const loc = useLocation()
  const navigate = useNavigate()

  const [authed,         setAuthed]         = useState(false)
  const [password,       setPassword]       = useState('')
  const [authError,      setAuthError]      = useState(false)
  const [authLoading,    setAuthLoading]    = useState(false)
  const [activeSection,  setActiveSection]  = useState<SectionId>('dashboard')
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false)
  const [adminTheme,     setAdminTheme]     = useState<'dark'|'light'>(() => {
    try { return (localStorage.getItem(LS_ADMIN_THEME) as 'dark'|'light') || 'dark' } catch { return 'dark' }
  })

  const isDark = adminTheme === 'dark'
  const t = buildTheme(isDark)

  // -- Admin Help Bot ----------------------------------------------------------
  const [adminChatEnabled, setAdminChatEnabled] = useState(false)
  const [chatOpen,         setChatOpen]         = useState(false)
  const [chatMessages,     setChatMessages]     = useState<Array<{ role: 'user'|'assistant'; content: string }>>( [])
  const [chatInput,        setChatInput]        = useState('')
  const [chatLoading,      setChatLoading]      = useState(false)
  const [chatSessionId,    setChatSessionId]    = useState<string|null>(null)

  // -- Portal home OTP state --------------------------------------------------
  const [portalEmail,    setPortalEmail]    = useState('')
  const [portalOtpSent,  setPortalOtpSent]  = useState(false)
  const [portalCode,     setPortalCode]     = useState('')
  const [portalLoading,  setPortalLoading]  = useState(false)
  const [portalError,    setPortalError]    = useState('')
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string>(CONFIG.logoUrl || '')
  const [ecomEnabled,    setEcomEnabled]    = useState<boolean>(false)

  useEffect(() => {
    function onChatToggle(e: Event) { setAdminChatEnabled((e as CustomEvent<boolean>).detail) }
    window.addEventListener('adminChatToggle', onChatToggle)
    return () => window.removeEventListener('adminChatToggle', onChatToggle)
  }, [])

  useEffect(() => {
    fetch(`${CONFIG.workerUrl}/admin/config`, {
      headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId }
    })
      .then(r => r.json())
      .then(d => { if (d.config?.adminChatEnabled) setAdminChatEnabled(true) })
      .catch(() => {})
  }, [])

  async function sendChatMessage() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const r = await fetch(`${CONFIG.workerUrl}/admin/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId },
        body: JSON.stringify({ message: msg, sessionId: chatSessionId })
      })
      const d = await r.json()
      if (d.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }])
        if (d.sessionId) setChatSessionId(d.sessionId)
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // -- Auth check --------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved) { setAuthed(true); return }
    // Portal home: skip OTP if valid session exists (within 8h TTL)
    if (_isPortalHome) {
      try {
        const sess = JSON.parse(localStorage.getItem('portal_session') || 'null')
        if (sess && sess.expires > Date.now() && sess.slug) {
          sessionStorage.setItem('portal_authed_slug', sess.slug)
          window.location.href = `/${sess.slug}`
          return
        }
      } catch { /* ignore */ }
    }
    // OTP portal session: set by portal home after verify, consumed once
    if (!_isPortalHome && _slug) {
      const otpSlug = sessionStorage.getItem('portal_authed_slug')
      if (otpSlug === _slug) {
        sessionStorage.removeItem('portal_authed_slug')
        localStorage.setItem(STORE_KEY, 'portal_otp_session')
        try { const s = JSON.parse(localStorage.getItem('portal_session') || 'null'); if (s) localStorage.setItem('portal_session', JSON.stringify({ ...s, expires: Date.now() + 14 * 24 * 60 * 60 * 1000 })) } catch { /* ignore */ }
        setAuthed(true)
      }
    }
  }, [])

  // Sync active section from URL on mount and browser back/forward
  useEffect(() => {
    const section = PATH_TO_SECTION[_slug ? loc.pathname.replace('/' + _slug, '') : loc.pathname]
    if (section) setActiveSection(section as SectionId)
  }, [loc.pathname])

  // -- Cross-page navigation via custom event (from DashboardPage quick actions)
  useEffect(() => {
    function onNav(e: Event) {
      const section = (e as CustomEvent).detail as SectionId
      if (section) goToSection(section as SectionId)
    }
    window.addEventListener('admin-navigate', onNav)
    return () => window.removeEventListener('admin-navigate', onNav)
  }, [])

  // -- Fetch live logo URL from /site after auth (reflects Branding section saves)
  useEffect(() => {
    if (!authed) return
    fetch(`${CONFIG.workerUrl}/site`, {
      headers: { 'X-Context-Key': 'oftheuniverse', 'X-Location-Id': CONFIG.locationId }
    })
      .then(r => r.json())
      .catch(() => null)
      .then(data => {
        const site = data?.site
        if (!site) return
        const content = site.live?.content || site.draft?.content || {}
        if (content.logoUrl) setSidebarLogoUrl(content.logoUrl)
        if (content.ecommerceEnabled) setEcomEnabled(true)
      })
  }, [authed])

  // -- Portal OTP handlers (root / only) --------------------------------------
  const _WORKER = 'https://niche-engine-worker.webadmin-a18.workers.dev'

  async function handlePortalRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setPortalLoading(true); setPortalError('')
    try {
      const r = await fetch(`${_WORKER}/admin/portal/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: portalEmail }),
      })
      const d = await r.json()
      if (d.ok) setPortalOtpSent(true)
      else setPortalError(d.error || 'Something went wrong. Try again.')
    } catch { setPortalError('Network error. Please try again.') }
    setPortalLoading(false)
  }

  async function handlePortalVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setPortalLoading(true); setPortalError('')
    try {
      const r = await fetch(`${_WORKER}/admin/portal/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: portalEmail, code: portalCode }),
      })
      const d = await r.json()
      if (d.ok && d.slug) {
        sessionStorage.setItem('portal_authed_slug', d.slug)
        try { localStorage.setItem('portal_session', JSON.stringify({ slug: d.slug, email: portalEmail, expires: Date.now() + 14 * 24 * 60 * 60 * 1000 })) } catch { /* ignore */ }
        window.location.href = `/${d.slug}`
      } else {
        setPortalError(d.error || 'Incorrect code. Please try again.')
      }
    } catch { setPortalError('Network error. Please try again.') }
    setPortalLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(false)
    const hash = await sha256(password)
    if (hash === CONFIG.passwordHash) {
      localStorage.setItem(STORE_KEY, hash)
      setAuthed(true)
    } else {
      setAuthError(true)
    }
    setPassword('')
    setAuthLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem(STORE_KEY)
    try { localStorage.removeItem('portal_session') } catch { /* ignore */ }
    setAuthed(false)
  }

  function goToSection(section: SectionId) {
    setActiveSection(section)
    setIsSidebarOpen(false)
    const path = SECTION_TO_PATH[section]
    const fullPath = _slug ? ('/' + _slug + path) : path
    if (path && loc.pathname !== fullPath) navigate(fullPath)
  }

  function toggleAdminTheme() {
    const next = isDark ? 'light' : 'dark'
    setAdminTheme(next)
    try { localStorage.setItem(LS_ADMIN_THEME, next) } catch { /* ignore */ }
  }

  // -- Portal home (root / with no slug — Packed House location picker) -------
  if (_isPortalHome) return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Utensils className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Packed House</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Admin Portal</p>
        </div>
        <div className={`rounded-3xl border p-8 shadow-xl ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
          {!portalOtpSent ? (
            <form onSubmit={handlePortalRequestOtp} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Admin Email</label>
                <input type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)}
                  autoFocus autoComplete="email"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors ${t.input}`}
                  placeholder="you@example.com" />
                {portalError && <p className="text-rose-400 text-xs mt-1.5">{portalError}</p>}
              </div>
              <button type="submit" disabled={portalLoading || !portalEmail}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors">
                {portalLoading ? 'Sending…' : 'Send Login Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePortalVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Code sent to <strong>{portalEmail}</strong></p>
                <button type="button" onClick={() => { setPortalOtpSent(false); setPortalError('') }}
                  className="text-amber-500 text-xs mt-1 hover:underline">Use a different email</button>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>6-Digit Code</label>
                <input type="tel" value={portalCode} onChange={e => setPortalCode(e.target.value)}
                  maxLength={6} autoFocus autoComplete="one-time-code"
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-center tracking-widest font-bold focus:outline-none focus:border-amber-500 transition-colors ${t.input}`}
                  placeholder="000000" />
                {portalError && <p className="text-rose-400 text-xs mt-1.5 text-center">{portalError}</p>}
              </div>
              <button type="submit" disabled={portalLoading || portalCode.length < 6}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors">
                {portalLoading ? 'Verifying…' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
        <p className={`text-center text-xs mt-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Packed House &middot; Restaurant Management Portal</p>
      </div>
    </div>
  )

  // -- Login screen ------------------------------------------------------------
  if (!authed) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}>
        <div className={`w-full max-w-sm rounded-3xl border p-8 shadow-xl ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{CONFIG.restaurantName}</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Admin Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition-colors ${t.input}`}
                placeholder="Enter admin password"
              />
              {authError && <p className="text-rose-400 text-xs mt-1.5">Incorrect password. Try again.</p>}
            </div>
            <button type="submit" disabled={authLoading || !password}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors">
              {authLoading ? 'Checking…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // -- Active page -------------------------------------------------------------
  const pageProps = { isDark, config: CONFIG, t }

  function renderActivePage() {
    switch (activeSection) {
      case 'dashboard'    : return <DashboardPage    {...pageProps} />
      case 'menu-manager' : return <MenuManagerPage  {...pageProps} />
      case 'menu'         : return <PageManagerPage  {...pageProps} />
      case 'sms-specials' : return <SmsSpecialsPage  {...pageProps} />
      case 'reservations' : return <ReservationsPage {...pageProps} />
      case 'waitlist'     : return <WaitlistPage     {...pageProps} />
      case 'branding'     : return <BrandingPage     {...pageProps} />
      case 'media-library': return <MediaLibraryPage {...pageProps} />
      case 'media-manager': return <MediaManagerPage  {...pageProps} goToSection={goToSection} />
      case 'gallery'      : return <GalleryPage       {...pageProps} />
      case 'settings'     : return <SettingsPage      {...pageProps} />
      case 'order-ahead'        : return <OrderAheadPage      {...pageProps} />
      case 'contacts-dashboard' : return <ContactsDashboard   {...pageProps} />
      case 'docs'               : return <AdminDocs />
      default                   : return <DashboardPage       {...pageProps} />
    }
  }

  const activeSection_ = SECTIONS.find(s => s.id === activeSection)

  // -- Main layout -------------------------------------------------------------
  return (
    <div className={`h-screen flex overflow-hidden ${t.root}`}>

      {/* Sidebar overlay (mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col border-r transition-transform duration-300 flex-shrink-0 ${t.sidebar} ${t.sidebarBdr} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}>
        {/* Logo area */}
        <div className={`px-5 py-5 border-b ${t.sidebarBdr} relative`}>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-center text-center gap-2 mb-3">
            {sidebarLogoUrl ? (
              <img src={sidebarLogoUrl} alt={CONFIG.restaurantName} className="h-16 w-auto max-w-[180px] object-contain" onError={() => setSidebarLogoUrl('')} />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Utensils className="w-8 h-8 text-amber-500" />
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{CONFIG.restaurantName}</span>
              </div>
            )}
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Admin Dashboard</p>
          </div>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Live
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 min-h-0">
          <div className="px-3 space-y-0.5">
            {SECTIONS.filter(s => s.id !== 'order-ahead' || ecomEnabled).map(section => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => goToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isActive ? t.navActive : `${t.nav} ${t.navHover}`}`}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  {section.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className={`p-4 border-t ${t.sidebarBdr} space-y-0.5`}>
          <a href={CONFIG.menuUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${t.nav} ${t.navHover}`}>
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            View Live Website
          </a>
          <a href={`https://spacedock.smartwebsitespro.biz/v2/location/${CONFIG.locationId}/dashboard`} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${t.nav} ${t.navHover}`}>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            View Location
          </a>
          <button onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${t.nav} hover:text-rose-400 hover:bg-rose-500/10`}>
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top bar */}
        <header className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${t.topbar} ${t.topbarBdr} ${t.topbarShadow}`}>
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white">
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSection_?.label ?? 'Dashboard'}
            </h1>
            {activeSection_?.subtitle && (
              <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{activeSection_.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAdminTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${t.toggleBtn}`}>
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>
            <a href={CONFIG.menuUrl} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${t.toggleBtn}`}>
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Site</span>
            </a>
            <button onClick={handleLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${t.toggleBtn} hover:text-rose-400 hover:border-rose-400/40`}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col p-4 md:p-6 lg:p-8">
            <div className="flex-1">
              {renderActivePage()}
            </div>
            <p className={`text-xs text-center mt-10 pt-4 border-t ${isDark ? 'border-gray-800 text-slate-600' : 'border-stone-200 text-slate-400'}`}>
              {CONFIG.restaurantName} &copy; {new Date().getFullYear()} &mdash; Powered by Packed House HQ
            </p>
          </div>
        </main>

      </div>

      {/* ── Admin Help Bot floating widget ──────────────────────────────────────────── */}
      {adminChatEnabled && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)', fontSize: '24px'
              }}
              title="Admin Help Bot"
            >🤖</button>
          )}
          {chatOpen && (
            <div style={{
              width: '360px', height: '500px', borderRadius: '16px',
              background: isDark ? '#1e293b' : '#fff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>Admin Help Bot</div>
                    <div style={{ fontSize: '11px', opacity: 0.85 }}>Packed House HQ</div>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: '12px', marginTop: '40px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
                    <p>Hi! I'm your admin help bot.</p>
                    <p style={{ marginTop: '4px' }}>Ask me anything about the admin portal!</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.5',
                      background: msg.role === 'user' ? '#22c55e' : (isDark ? '#334155' : '#f1f5f9'),
                      color: msg.role === 'user' ? 'white' : (isDark ? '#e2e8f0' : '#1e293b')
                    }}>{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '13px', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' }}>Thinking…</div>
                  </div>
                )}
              </div>
              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                  placeholder="Ask anything…"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
                    background: isDark ? '#0f172a' : '#f8fafc',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    color: isDark ? '#e2e8f0' : '#1e293b', outline: 'none'
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', background: '#22c55e',
                    border: 'none', color: 'white', fontWeight: 700, fontSize: '13px',
                    cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                    opacity: chatInput.trim() && !chatLoading ? 1 : 0.5
                  }}
                >Send</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
