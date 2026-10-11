// v1.2 | 09/28/2026 -- Fix: saveLabel returns "Save" as default instead of null
// v1.5 | 10/07/2026 8:13 PM PDT -- Add: 'docs' section (SectionId + SECTIONS)
// v1.4 | 10/01/2026 8:41 PM PDT -- Add backninegrill to RESTAURANT_CONFIGS (Back Nine Bar & Grill, locationId hvfI8dLTBiwnx30RSPm4)
// v1.3 | 09/30/2026 9:32 PM PDT -- Reorder: contacts-dashboard→2nd/renamed 'Contact Manager'; remove chat; media-manager replaces media-library+gallery in sidebar
// v1.2 | 09/30/2026 8:05 PM PDT -- Add: 'contacts-dashboard' section (SectionId + SECTIONS)
// v1.1 | 09/23/2026 1:51 AM PDT -- Restored: buildTheme, sha256, AdminPageProps, SectionCard, StatusCard, Toggle, saveLabel, MediaFile, icons, LS constants, order helpers, SmsSpecials
// v1.0 | 09/09/2026 -- Extracted from RestaurantAdmin monolith for page split

import type { ReactNode } from 'react'
import {
  Home, Info, BookOpen, Star, Image as ImageIcon, Mail, Phone,
  LayoutDashboard, Palette, MessageSquare, SlidersHorizontal,
  CalendarDays, Utensils, Library, Smartphone, Users, ShoppingCart,
} from 'lucide-react'

// ── Config types ─────────────────────────────────────────────────────────────────
export interface RestaurantConfig {
  restaurantName  : string
  locationId      : string
  passwordHash    : string
  logoUrl         : string
  menuUrl         : string
  menuManagerUrl  : string
  reservationsUrl : string
  workerUrl       : string
}

export const RESTAURANT_CONFIGS: Record<string, RestaurantConfig> = {
  pacifictable: {
    restaurantName  : 'Pacific Table',
    locationId      : 'zankCSfWlg2g8wagewAU',
    passwordHash    : 'ca683b6f2babed957c191afdbf566c22bff38889d2496efcaaa5c9a387df542f',
    logoUrl         : 'https://vibe.filesafe.space/1778453541861709312/attachments/365f0e7b-38c7-4d8f-9948-8862821fa074.webp',
    menuUrl         : 'https://pacifictable.packedhousehq.com/our-menu',
    menuManagerUrl  : 'https://packedhouseportal.com',
    reservationsUrl : '/reservations-admin',
    workerUrl       : 'https://niche-engine-worker.webadmin-a18.workers.dev',
  },
  firefishgrill: {
    restaurantName  : 'Firefish Grill',
    locationId      : 'HZ0Oc4XG3eQJReGvf51M',
    passwordHash    : '488ba1b51ffba3bfe84fe8ed535bac31366d5f079736344a41375560d1735e3e',
    logoUrl         : 'https://media.packedhousehq.com/HZ0Oc4XG3eQJReGvf51M/images/logo-dark.png',
    menuUrl         : 'https://firefishgrill.packedhousehq.com/our-menu',
    menuManagerUrl  : 'https://packedhouseportal.com',
    reservationsUrl : '/reservations-admin',
    workerUrl       : 'https://niche-engine-worker.webadmin-a18.workers.dev',
  },

  backninegrill: {
    restaurantName  : 'Back Nine Bar & Grill',
    locationId      : 'hvfI8dLTBiwnx30RSPm4',
    passwordHash    : '',
    logoUrl         : '',
    menuUrl         : 'https://backninegrill.packedhousehq.com/our-menu',
    menuManagerUrl  : 'https://packedhouseportal.com',
    reservationsUrl : '/reservations-admin',
    workerUrl       : 'https://niche-engine-worker.webadmin-a18.workers.dev',
  },
}

export const ADMIN_KEY = 'oftheuniverse'

export function makeHeaders(config: RestaurantConfig, extra: Record<string,string> = {}) {
  return { 'X-Context-Key': ADMIN_KEY, 'X-Location-Id': config.locationId, ...extra }
}

// ── Section nav ─────────────────────────────────────────────────────────────────
export type SectionId =
  | 'dashboard' | 'menu' | 'menu-manager' | 'reservations'
  | 'branding' | 'sms-specials' | 'media-library' | 'media-manager'
  | 'settings'  | 'waitlist' | 'gallery' | 'order-ahead'
  | 'contacts-dashboard'
  | 'docs'

export const SECTIONS: Array<{ id: SectionId; label: string; subtitle: string; icon: React.ElementType }> = [
  { id: 'dashboard',          label: 'Dashboard',             subtitle: 'Your restaurant at a glance',                icon: LayoutDashboard  },
  { id: 'contacts-dashboard', label: 'Contact Manager',       subtitle: 'Browse and search your GHL contacts',        icon: Users            },
  { id: 'menu-manager',       label: 'Menu Manager',          subtitle: 'Add, edit and remove menu items',            icon: Utensils         },
  { id: 'order-ahead',        label: 'Order Ahead Manager',   subtitle: 'Manage items available for online ordering', icon: ShoppingCart     },
  { id: 'menu',               label: 'Page Manager',          subtitle: 'Manage your digital menu and layout',        icon: BookOpen         },
  { id: 'sms-specials',       label: 'SMS Specials',          subtitle: 'Update and manage your weekly specials',     icon: Smartphone       },
  { id: 'reservations',       label: 'Reservations Manager',  subtitle: 'View and manage your bookings',              icon: CalendarDays     },
  { id: 'waitlist',           label: 'Waitlist Manager',      subtitle: 'Manage your walk-up waitlist queue',         icon: Users            },
  { id: 'branding',           label: 'Branding',              subtitle: "Update your restaurant's look and feel",     icon: Palette          },
  { id: 'media-manager',      label: 'Media Manager',         subtitle: 'Manage images and your photo gallery',       icon: Library          },
  { id: 'docs',               label: 'Documentation',         subtitle: 'Platform reference and how-tos',              icon: BookOpen          },
  { id: 'settings',           label: 'Settings',              subtitle: 'Advanced configuration and preferences',     icon: SlidersHorizontal},
]

// ── Public nav links (Firefish template — all 9 top-level items) ────────────
export const PUBLIC_NAV_LINKS = [
  { name: 'Home',             href: '/',             icon: Home        },
  { name: 'Menus',            href: '/our-menu',     icon: BookOpen    },
  { name: 'Banquets',         href: '/banquets',     icon: Users       },
  { name: 'Photos',           href: '/photos',       icon: ImageIcon   },
  { name: 'About',            href: '/about-firefish-grill', icon: Info },
  { name: 'Contact Us',       href: '/contact-us',   icon: Phone       },
  { name: 'Order Ahead',      href: '/order-ahead',  icon: ShoppingCart},
  { name: 'Reserve a Table',  href: '/reservations', icon: CalendarDays},
  { name: 'Login',            href: '/my-account',   icon: Users       },
]

// ── Menu categories ───────────────────────────────────────────────────────────
export const MENU_CATEGORIES = [
  'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Specials',
  'Desserts', 'Beer & Wine', 'Cocktails', 'Kids Menu',
] as const
export type MenuCategory = typeof MENU_CATEGORIES[number]

export const CATEGORY_ICONS: Record<MenuCategory, string> = {
  Breakfast    : '🍳',
  Brunch       : '🥂',
  Lunch        : '🥗',
  Dinner       : '🍽️',
  Specials     : '⭐',
  Desserts     : '🍰',
  'Beer & Wine': '🍷',
  Cocktails    : '🍹',
  'Kids Menu'  : '🧒',

}
export const LS_ADMIN_THEME = 'packed_house_admin_theme'
export const LS_LAYOUT      = 'packed_house_admin_layout'
const        LS_CAT_ORDER   = 'packed_house_cat_order'
const        LS_NAV_ORDER   = 'packed_house_nav_order'

// ── Theme ──────────────────────────────────────────────────────────────────────
export function buildTheme(isDark: boolean) {
  return isDark ? {
    root       : 'bg-slate-950 text-white',
    sidebar    : 'bg-gray-900',
    sidebarBdr : 'border-gray-800',
    nav        : 'text-slate-300',
    navHover   : 'hover:bg-gray-800 hover:text-white',
    navActive  : 'bg-amber-500/10 text-amber-500',
    input      : 'bg-gray-800 border-gray-700 text-white placeholder-slate-500',
    border     : 'border-gray-800',
    cardBg     : 'bg-gray-900',
    title      : 'text-white',
    muted      : 'text-slate-400',
    sectionLbl : 'text-slate-500',
    qaBg       : 'bg-gray-800/50 border border-gray-700 hover:border-amber-500/30 transition-colors',
    topbar     : 'bg-gray-900',
    topbarBdr  : 'border-gray-800',
    topbarShadow: 'shadow-gray-950/50',
    toggleBtn  : 'text-slate-400 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors',
    btnSec     : 'border border-gray-700 text-slate-300 hover:bg-gray-800 rounded-xl px-3 py-1.5 text-sm transition-colors',
    body       : 'bg-slate-950',
    dragBg     : 'bg-gray-800',
    dragHover  : 'hover:bg-gray-700',
    dragOver   : 'bg-amber-500/10 border-amber-500',
    cardBdr    : 'border-gray-700',
    indexBadge : 'bg-gray-800 text-slate-400',
    borderMid  : 'border-gray-700',
    label      : 'text-slate-400',
    previewHd  : 'bg-gray-800',
    previewLbl : 'text-slate-400',
    smsActive  : 'bg-emerald-500/10 border-emerald-500/30',
    smsActiveText: 'text-emerald-400',
    gripColor  : 'text-slate-600',
  } : {
    root       : 'bg-stone-50 text-slate-900',
    sidebar    : 'bg-white',
    sidebarBdr : 'border-stone-200',
    nav        : 'text-slate-600',
    navHover   : 'hover:bg-stone-100 hover:text-slate-900',
    navActive  : 'bg-amber-50 text-amber-700',
    input      : 'bg-white border-stone-200 text-slate-900 placeholder-slate-400',
    border     : 'border-stone-200',
    cardBg     : 'bg-white',
    title      : 'text-slate-900',
    muted      : 'text-slate-500',
    sectionLbl : 'text-slate-400',
    qaBg       : 'bg-stone-50 border border-stone-200 hover:border-amber-200 transition-colors',
    topbar     : 'bg-white',
    topbarBdr  : 'border-stone-200',
    topbarShadow: 'shadow-stone-200/50',
    toggleBtn  : 'text-slate-500 hover:text-slate-900 hover:bg-stone-100 rounded-lg p-1.5 transition-colors',
    btnSec     : 'border border-stone-200 text-slate-600 hover:bg-stone-50 rounded-xl px-3 py-1.5 text-sm transition-colors',
    body       : 'bg-stone-50',
    dragBg     : 'bg-stone-50',
    dragHover  : 'hover:bg-stone-100',
    dragOver   : 'bg-amber-50 border-amber-300',
    cardBdr    : 'border-stone-200',
    indexBadge : 'bg-stone-100 text-slate-500',
    borderMid  : 'border-stone-300',
    label      : 'text-slate-600',
    previewHd  : 'bg-stone-100',
    previewLbl : 'text-slate-500',
    smsActive  : 'bg-emerald-50 border-emerald-200',
    smsActiveText: 'text-emerald-600',
    gripColor  : 'text-slate-300',
  }
}

// ── Crypto ─────────────────────────────────────────────────────────────────────
export async function sha256(text: string): Promise<string> {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AdminPageProps {
  isDark : boolean
  config : RestaurantConfig
  t      : ReturnType<typeof buildTheme>
}

export interface MediaFile {
  key      : string
  name     : string
  url      : string
  type     : string
  size     : number
  uploaded : string
  folder   : string
}

export interface SmsSpecial {
  id    : string
  name  : string
  value : string
}
export type SmsSpecials = Record<string, SmsSpecial>

// ── Order helpers ─────────────────────────────────────────────────────────────
export function loadCategoryOrder(): MenuCategory[] {
  try {
    const s = localStorage.getItem(LS_CAT_ORDER)
    if (s) { const p = JSON.parse(s) as MenuCategory[]; if (Array.isArray(p)) return p }
  } catch { /* ignore */ }
  return [...MENU_CATEGORIES]
}
export function saveCategoryOrder(order: MenuCategory[]): void {
  try { localStorage.setItem(LS_CAT_ORDER, JSON.stringify(order)) } catch { /* ignore */ }
}
export function loadNavLinkOrder(): string[] {
  try {
    const s = localStorage.getItem(LS_NAV_ORDER)
    if (s) { const p = JSON.parse(s) as string[]; if (Array.isArray(p)) return p }
  } catch { /* ignore */ }
  return PUBLIC_NAV_LINKS.map(l => l.name)
}
export function saveNavLinkOrder(order: string[]): void {
  try { localStorage.setItem(LS_NAV_ORDER, JSON.stringify(order)) } catch { /* ignore */ }
}

// ── UI Components ─────────────────────────────────────────────────────────────
export function SectionCard({ isDark, title, description, action, comingSoon = false, children }: {
  isDark      : boolean
  title       : string
  description?: string
  action?     : ReactNode
  comingSoon? : boolean
  children?   : ReactNode
}) {
  return (
    <div className={`rounded-2xl border p-5 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
          {description && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {comingSoon && (
            <span className="text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
          )}
        </div>
      </div>
      {!comingSoon && children}
    </div>
  )
}

export function StatusCard({ isDark, label, value, icon, variant = 'gray' }: {
  isDark   : boolean
  label    : string
  value    : string
  icon     : string
  variant? : 'green' | 'amber' | 'gray' | 'red'
}) {
  const colors: Record<string, string> = {
    green : 'text-emerald-500 bg-emerald-500/10',
    amber : 'text-amber-500 bg-amber-500/10',
    gray  : isDark ? 'text-slate-400 bg-slate-400/10' : 'text-slate-500 bg-slate-500/10',
    red   : 'text-rose-500 bg-rose-500/10',
  }
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[variant]}`}>{value}</span>
      </div>
      <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
    </div>
  )
}

export function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-checked={enabled}
      role="switch"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-amber-500' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function saveLabel(saving: boolean, saved: boolean): ReactNode {
  if (saving) return <span className="animate-pulse">Saving...</span>
  if (saved)  return <span className="text-emerald-100 font-medium">Saved!</span>
  return <>Save</>
}

// ── Icons ──────────────────────────────────────────────────────────────────────
export function ExtLinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
    </svg>
  )
}

export function PortraitIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    </svg>
  )
}

export function LandscapeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    </svg>
  )
}

export function GripDots({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7"  cy="5"  r="1.5" />
      <circle cx="13" cy="5"  r="1.5" />
      <circle cx="7"  cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7"  cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  )
}
