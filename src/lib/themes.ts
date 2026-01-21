// Theme color definitions
// These are used as reference for the CSS variables in index.css

export const themes = {
  default: {
    name: 'Default',
    description: 'Clean, professional dark theme',
    colors: {
      bgPrimary: '#1f2937',      // gray-800
      bgSecondary: '#111827',    // gray-900
      bgTertiary: '#374151',     // gray-700
      bgCard: '#1f2937',         // gray-800
      bgHover: '#374151',        // gray-700
      bgOverlay: 'rgba(0, 0, 0, 0.6)',

      textPrimary: '#f9fafb',    // gray-50
      textSecondary: '#d1d5db',  // gray-300
      textMuted: '#9ca3af',      // gray-400

      borderPrimary: '#374151',  // gray-700
      borderSecondary: '#4b5563', // gray-600

      accentPrimary: '#3b82f6',  // blue-500
      accentSecondary: '#8b5cf6', // violet-500
      accentSuccess: '#10b981',  // emerald-500
      accentWarning: '#f59e0b',  // amber-500
      accentDanger: '#ef4444',   // red-500

      glowPrimary: 'rgba(59, 130, 246, 0.4)',
      glowSuccess: 'rgba(16, 185, 129, 0.4)',
      glowDanger: 'rgba(239, 68, 68, 0.4)',
    },
  },

  midnight: {
    name: 'Midnight',
    description: 'Deep blacks for OLED displays',
    colors: {
      bgPrimary: '#0c0c0c',
      bgSecondary: '#000000',
      bgTertiary: '#1a1a1a',
      bgCard: '#0f0f0f',
      bgHover: '#1f1f1f',
      bgOverlay: 'rgba(0, 0, 0, 0.9)',

      textPrimary: '#ffffff',
      textSecondary: '#e0e0e0',
      textMuted: '#888888',

      borderPrimary: '#2a2a2a',
      borderSecondary: '#3a3a3a',

      accentPrimary: '#60a5fa',     // Brighter blue for contrast
      accentSecondary: '#a78bfa',
      accentSuccess: '#34d399',
      accentWarning: '#fbbf24',
      accentDanger: '#f87171',

      glowPrimary: 'rgba(96, 165, 250, 0.4)',
      glowSuccess: 'rgba(52, 211, 153, 0.4)',
      glowDanger: 'rgba(248, 113, 113, 0.4)',
    },
  },

  matrix: {
    name: 'Matrix',
    description: 'Subtle cyberpunk with green accents',
    colors: {
      bgPrimary: '#0a0f0a',
      bgSecondary: '#000000',
      bgTertiary: '#0f1f0f',
      bgCard: '#050d05',
      bgHover: '#102010',
      bgOverlay: 'rgba(0, 0, 0, 0.92)',

      textPrimary: '#c8ffc8',     // Brighter for contrast
      textSecondary: '#90d090',
      textMuted: '#558855',

      borderPrimary: '#1a3a1a',   // More visible borders
      borderSecondary: '#2a5a2a',

      accentPrimary: '#00ff41',   // Phosphor green
      accentSecondary: '#39ff14',
      accentSuccess: '#00ff41',
      accentWarning: '#ffcc00',   // Brighter amber
      accentDanger: '#ff4444',

      glowPrimary: 'rgba(0, 255, 65, 0.35)',
      glowSuccess: 'rgba(0, 255, 65, 0.35)',
      glowDanger: 'rgba(255, 68, 68, 0.4)',
    },
  },

  light: {
    name: 'Light',
    description: 'Bright and clean for daytime use',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f1f5f9',
      bgTertiary: '#e2e8f0',
      bgCard: '#ffffff',
      bgHover: '#f1f5f9',
      bgOverlay: 'rgba(0, 0, 0, 0.5)',

      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',

      borderPrimary: '#cbd5e1',   // More visible borders
      borderSecondary: '#94a3b8',

      accentPrimary: '#2563eb',
      accentSecondary: '#7c3aed',
      accentSuccess: '#059669',
      accentWarning: '#d97706',
      accentDanger: '#dc2626',

      glowPrimary: 'rgba(37, 99, 235, 0.25)',
      glowSuccess: 'rgba(5, 150, 105, 0.25)',
      glowDanger: 'rgba(220, 38, 38, 0.25)',
    },
  },
} as const

export type ThemeColors = typeof themes.default.colors
