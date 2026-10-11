// v1.1 | 09/23/2026 1:51 AM PDT -- Fix import path (both files in pages/)
// v1.0 | 09/23/2026 -- Thin wrapper for GalleryManagerPanel

import GalleryManagerPanel from './GalleryManagerPanel'
import type { AdminPageProps } from '../adminShared'

export default function GalleryPage(props: AdminPageProps) {
  return <GalleryManagerPanel {...props} />
}
