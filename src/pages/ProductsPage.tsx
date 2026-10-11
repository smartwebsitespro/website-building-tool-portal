// v1.0 | 10/10/2026 — WBT Customer Portal — Products (Phase 4 stub)

import { Package } from 'lucide-react'
import { useShop } from '../App'

export default function ProductsPage() {
  const { shop } = useShop()
  const isWoo = shop?.shop_type === 'woocommerce'
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Products</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Package size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Products — Coming in Phase 4</p>
        <p className="text-xs text-gray-400 mt-1">
          {isWoo
            ? 'WooCommerce product sync will be available after OAuth connection in Phase 6.'
            : 'GHL product catalog management coming in Phase 4.'}
        </p>
      </div>
    </div>
  )
}
