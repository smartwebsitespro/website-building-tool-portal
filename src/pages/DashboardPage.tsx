// v1.0 | 10/10/2026 — WBT Customer Portal Dashboard

import { useNavigate } from 'react-router-dom'
import {
  Package, ClipboardList, Settings, Globe,
  ShoppingCart, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useShop } from '../App'
import { SLUG } from '../config'

export default function DashboardPage() {
  const { shop } = useShop()
  const navigate  = useNavigate()
  const isGHL     = shop?.shop_type === 'ghl'
  const isWoo     = shop?.shop_type === 'woocommerce'

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{shop?.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {shop?.tagline || (isGHL ? 'GHL Store' : 'WooCommerce Management Portal')}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {shop?.status === 'active' ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            <AlertCircle size={12} /> {shop?.status}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {isGHL ? 'Full store + public site' : 'Management portal only'}
        </span>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isGHL && (
          <QuickCard
            icon={<Globe size={18} className="text-indigo-600" />}
            label="Public Site"
            desc="View your live store"
            color="indigo"
            href={`https://websitebuildingtool.com/${SLUG}`}
            external
          />
        )}
        <QuickCard
          icon={<Package size={18} className="text-blue-600" />}
          label="Products"
          desc={isGHL ? 'Manage your catalog' : 'WooCommerce products'}
          color="blue"
          onClick={() => navigate('/products')}
        />
        <QuickCard
          icon={<ClipboardList size={18} className="text-purple-600" />}
          label="Orders"
          desc={isGHL ? 'View orders' : 'WooCommerce orders'}
          color="purple"
          onClick={() => navigate('/orders')}
        />
        <QuickCard
          icon={<Settings size={18} className="text-gray-600" />}
          label="Settings"
          desc="Colors, logo, contact info"
          color="gray"
          onClick={() => navigate('/settings')}
        />
        {isWoo && shop && (
          <QuickCard
            icon={<ShoppingCart size={18} className="text-purple-600" />}
            label="WooCommerce Admin"
            desc="Go to your WordPress admin"
            color="purple"
            href={`${shop.id}/wp-admin`}
            external
          />
        )}
      </div>

      {/* Shop info card */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs font-semibold text-gray-500 mb-3">Shop Info</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="Slug"       value={SLUG} />
          <InfoRow label="Type"       value={isGHL ? 'GHL (Full Store)' : 'WooCommerce'} />
          <InfoRow label="Atmosphere" value={shop?.atmosphere ?? '—'} />
          <InfoRow label="Status"     value={shop?.status ?? '—'} />
          {shop?.primary_color && <InfoRow label="Primary Color" value={shop.primary_color} />}
          {shop?.accent_color  && <InfoRow label="Accent Color"  value={shop.accent_color}  />}
        </div>
      </div>

      {/* Coming soon notice for WooCommerce OAuth */}
      {isWoo && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800">
          <p className="font-semibold mb-1">WooCommerce Connection — Coming Soon</p>
          <p className="text-xs text-purple-600">
            Phase 6 will add full WooCommerce OAuth so products and orders sync automatically.
            For now, use the WooCommerce Admin link above to manage your store.
          </p>
        </div>
      )}
    </div>
  )
}

function QuickCard({ icon, label, desc, color, onClick, href, external }: {
  icon: React.ReactNode; label: string; desc: string; color: string;
  onClick?: () => void; href?: string; external?: boolean
}) {
  const border: Record<string, string> = {
    indigo: 'hover:border-indigo-200 hover:bg-indigo-50/40',
    blue:   'hover:border-blue-200 hover:bg-blue-50/40',
    purple: 'hover:border-purple-200 hover:bg-purple-50/40',
    gray:   'hover:border-gray-300 hover:bg-gray-50',
  }
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 cursor-pointer transition-all text-left ${
      border[color] || ''
    }`}>
      <div className="mb-2">{icon}</div>
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
        {desc} {external && <ExternalLink size={10} />}
      </div>
    </div>
  )
  if (href) return <a href={href} target={external ? '_blank' : undefined} rel="noreferrer">{inner}</a>
  return <button onClick={onClick} className="text-left w-full">{inner}</button>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-medium text-gray-700 mt-0.5">{value}</div>
    </div>
  )
}
