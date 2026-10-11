// v1.0 | 10/10/2026 — WBT Customer Portal App
// Subdomain-aware: detects slug, loads shop info, switches GHL/WooCommerce mode

import { useEffect, useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import SettingsPage from './pages/SettingsPage'
import { SLUG, WORKER_BASE } from './config'

// ---- Shop context ----
export interface ShopInfo {
  id:           string
  slug:         string
  shop_type:    'ghl' | 'woocommerce'
  name:         string
  tagline:      string | null
  logo_url:     string | null
  atmosphere:   string
  status:       string
  primary_color: string
  accent_color:  string
}

interface ShopCtx {
  shop:    ShopInfo | null
  loading: boolean
  error:   string | null
  reload:  () => void
}

const Ctx = createContext<ShopCtx>({ shop: null, loading: true, error: null, reload: () => {} })
export const useShop = () => useContext(Ctx)

function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shop,    setShop]    = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = async () => {
    if (!SLUG || SLUG === 'dev') {
      setError('No shop slug detected. Open this portal from your shop subdomain.')
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${WORKER_BASE}/api/shop?slug=${SLUG}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setShop(d.shop)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  return <Ctx.Provider value={{ shop, loading, error, reload: load }}>{children}</Ctx.Provider>
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products"  element={<ProductsPage />} />
            <Route path="orders"    element={<OrdersPage />} />
            <Route path="settings"  element={<SettingsPage />} />
          </Route>
        </Routes>
      </ShopProvider>
    </BrowserRouter>
  )
}
