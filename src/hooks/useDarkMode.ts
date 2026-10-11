// useDarkMode.ts
// Manages dark/light mode for the admin portal.
import { useState, useEffect, useCallback } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('scr_theme') !== 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'scr_theme') setIsDark(e.newValue !== 'light')
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const toggle = useCallback(() => {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('scr_theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { isDark, toggle }
}