// v1.0 | 10/10/2026 — WBT Customer Portal — Orders (Phase 4 stub)

import { ClipboardList } from 'lucide-react'
import { useShop } from '../App'

export default function OrdersPage() {
  const { shop } = useShop()
  const isWoo = shop?.shop_type === 'woocommerce'
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Orders</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Orders — Coming in Phase 4</p>
        <p className="text-xs text-gray-400 mt-1">
          {isWoo
            ? 'WooCommerce order sync will be available after OAuth connection in Phase 6.'
            : 'GHL order management coming in Phase 4.'}
        </p>
      </div>
    </div>
  )
}
