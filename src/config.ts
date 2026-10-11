// v1.0 | 10/10/2026 — WBT Customer Portal config
// Detects slug from subdomain: slug.websitebuildingtool.com

const WBT_DOMAIN = 'websitebuildingtool.com'
const hostname   = window.location.hostname

// slug.websitebuildingtool.com → 'slug' | localhost → 'dev'
export const SLUG: string = hostname.endsWith(`.${WBT_DOMAIN}`)
  ? hostname.slice(0, hostname.length - WBT_DOMAIN.length - 1)
  : (import.meta.env.VITE_DEV_SLUG ?? 'dev')

export const WORKER_BASE = 'https://websitebuildingtool.com'
export const WORKER_KEY  = import.meta.env.VITE_WORKER_KEY ?? ''
export const MEDIA_BASE  = 'https://media.websitebuildingtool.com'
export const PORTAL_BASE = (slug: string) => `https://${slug}.${WBT_DOMAIN}`
