import MenuManagerPanel from '../MenuManagerPanel'
import type { AdminPageProps } from '../adminShared'

export default function MenuManagerPage({ config, isDark, t }: AdminPageProps) {
  return <MenuManagerPanel config={config} isDark={isDark} t={t} />
}
