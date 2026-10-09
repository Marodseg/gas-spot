import { useEffect, useState } from 'react'
import { usePreferences } from '../stores/preferences'

export function useTheme(): { dark: boolean } {
  const theme = usePreferences((state) => state.theme)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const dark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1110' : '#f4f2ee')
  }, [dark])

  return { dark }
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
