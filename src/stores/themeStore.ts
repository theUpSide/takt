import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'takt' | 'default' | 'midnight' | 'matrix' | 'light'

interface ThemeState {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  cycleTheme: () => void
}

const themeOrder: ThemeName[] = ['takt', 'default', 'midnight', 'matrix', 'light']

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'takt',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      cycleTheme: () => {
        const current = get().theme
        const currentIndex = themeOrder.indexOf(current)
        const nextIndex = (currentIndex + 1) % themeOrder.length
        const nextTheme = themeOrder[nextIndex]
        set({ theme: nextTheme })
        applyTheme(nextTheme)
      },
    }),
    {
      name: 'takt-theme-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

function applyTheme(theme: ThemeName) {
  const root = document.documentElement

  // Remove all theme classes
  root.classList.remove('theme-takt', 'theme-default', 'theme-midnight', 'theme-matrix', 'theme-light')

  // Add new theme class
  root.classList.add(`theme-${theme}`)
}

export const themeLabels: Record<ThemeName, string> = {
  takt: 'Takt',
  default: 'Default',
  midnight: 'Midnight',
  matrix: 'Matrix',
  light: 'Light',
}

export const themeDescriptions: Record<ThemeName, string> = {
  takt: 'Official Takt brand theme',
  default: 'Clean, professional dark theme',
  midnight: 'Deep blacks for OLED displays',
  matrix: 'Subtle cyberpunk with green accents',
  light: 'Bright and clean for daytime use',
}
