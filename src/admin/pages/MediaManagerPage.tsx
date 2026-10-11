// v1.0 | 09/30/2026 9:32 PM PDT -- Init: Media Manager index page
import React from 'react'
import { Image, LayoutGrid } from 'lucide-react'
import { type AdminPageProps, type SectionId } from '../adminShared'

interface MediaManagerPageProps extends AdminPageProps {
  goToSection: (id: SectionId) => void
}

export default function MediaManagerPage({ isDark, goToSection }: MediaManagerPageProps) {
  const card   = isDark
    ? 'bg-gray-900 border-gray-800 hover:border-purple-500/40 hover:bg-gray-800/60'
    : 'bg-white border-stone-200 hover:border-purple-400/40 hover:bg-purple-50/30'
  const text   = isDark ? 'text-white'     : 'text-slate-900'
  const muted  = isDark ? 'text-slate-400' : 'text-slate-500'
  const iconBg = isDark ? 'bg-purple-500/15' : 'bg-purple-100'

  const items: Array<{ id: SectionId; label: string; desc: string; Icon: React.ElementType }> = [
    { id: 'media-library', label: 'Manage Images',   desc: 'Upload, organize and manage all media files and assets for your restaurant.', Icon: Image      },
    { id: 'gallery',       label: 'Gallery Manager', desc: 'Curate your public photo gallery with before and after shots and feature images.', Icon: LayoutGrid },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0c2340 0%,#1a3a5c 55%,#92278f 100%)' }}>
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-white">Media Manager</h2>
          <p className="text-sm text-white/60">Manage your restaurant images and photo gallery</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(({ id, label, desc, Icon }) => (
          <button key={id} onClick={() => goToSection(id)}
            className={`rounded-2xl border p-6 text-left transition-all cursor-pointer group ${card}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg} group-hover:bg-purple-500/20 transition-colors`}>
              <Icon className="w-6 h-6 text-purple-400" />
            </div>
            <p className={`font-bold text-base mb-1 ${text}`}>{label}</p>
            <p className={`text-sm leading-relaxed ${muted}`}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}