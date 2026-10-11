// WaitlistPage.tsx -- wraps WaitlistPanel
// v1.0 | 09/09/2026

import WaitlistPanel from '../WaitlistPanel'
import type { AdminPageProps } from '../adminShared'

export default function WaitlistPage({ config, isDark, t }: AdminPageProps) {
  return <WaitlistPanel config={config} isDark={isDark} />
}
