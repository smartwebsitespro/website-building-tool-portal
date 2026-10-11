// v1.0 | 10/10/2026 — WBT Customer Portal layout
// Mode-aware nav: GHL shows Products + Orders, WooCommerce shows management links

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart,
  Settings, Package, ClipboardList, Loader2, AlertCircle
} from 'lucide-react'
import { useShop } from '../App'
import { SLUG } from '../config'

export default function AdminLayout() {
  const { shop, loading, error } = useShop()
  const navigate = useNavigate()

  const isGHL = shop?.shop_type === 'ghl'
  const isWoo = shop?.shop_type === 'woocommerce'

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {shop?.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">
              {loading ? 'Loading…' : (shop?.name ?? 'My Shop')}
            </div>
            <div className="text-[10px] text-gray-400">
              {isGHL ? 'GHL Store' : isWoo ? 'WooCommerce' : SLUG}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <NavLink to="/dashboard" className={navCls}>
            <LayoutDashboard size={15} /> Dashboard
          </NavLink>

          {/* GHL: Products + Orders */}
          {(isGHL || loading) && (
            <>
              <NavLink to="/products" className={navCls}>
                <Package size={15} /> Products
              </NavLink>
              <NavLink to="/orders" className={navCls}>
                <ClipboardList size={15} /> Orders
              </NavLink>
            </>
          )}

          {/* WooCommerce: WooCommerce management links */}
          {isWoo && (
            <>
              <NavLink to="/products" className={navCls}>
                <ShoppingCart size={15} /> WooCommerce Products
              </NavLink>
              <NavLink to="/orders" className={navCls}>
                <ShoppingBag size={15} /> WooCommerce Orders
              </NavLink>
            </>
          )}

          <NavLink to="/settings" className={navCls}>
            <Settings size={15} /> Settings
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 truncate">{SLUG}.websitebuildingtool.com</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading shop…
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <p className="text-xs text-gray-400">Slug detected: <code>{SLUG}</code></p>
          </div>
        )}
        {!loading && !error && (
          <div className="p-6">
            <Outlet />
          </div>
        )}
      </main>

    </div>
  )
}
