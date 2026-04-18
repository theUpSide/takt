import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Timezone setting - IANA timezone string (e.g., 'America/New_York')
  timezone: string
  // Whether to auto-detect timezone from device
  autoDetectTimezone: boolean
  // Monthly revenue target in dollars, used by the revenue view
  monthlyRevenueTarget: number | null
  // Business info used on invoices
  businessName: string
  businessAddress: string
  businessEmail: string
  // Starting invoice number; invoice view increments from this per engagement
  invoiceNumberPrefix: string

  // Actions
  setTimezone: (timezone: string) => void
  setAutoDetectTimezone: (autoDetect: boolean) => void
  setMonthlyRevenueTarget: (target: number | null) => void
  setBusinessName: (name: string) => void
  setBusinessAddress: (address: string) => void
  setBusinessEmail: (email: string) => void
  setInvoiceNumberPrefix: (prefix: string) => void
  detectTimezone: () => string
}

// Get the device's timezone
function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

// Common timezones for the dropdown
export const commonTimezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'UTC', label: 'UTC' },
]

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      timezone: getDeviceTimezone(),
      autoDetectTimezone: true,
      monthlyRevenueTarget: null,
      businessName: 'Indy-Pendent Solutions',
      businessAddress: '',
      businessEmail: '',
      invoiceNumberPrefix: 'INV',

      setTimezone: (timezone) => {
        set({ timezone, autoDetectTimezone: false })
      },

      setAutoDetectTimezone: (autoDetect) => {
        if (autoDetect) {
          const detected = getDeviceTimezone()
          set({ autoDetectTimezone: true, timezone: detected })
        } else {
          set({ autoDetectTimezone: autoDetect })
        }
      },

      setMonthlyRevenueTarget: (target) => {
        set({ monthlyRevenueTarget: target })
      },

      setBusinessName: (name) => set({ businessName: name }),
      setBusinessAddress: (address) => set({ businessAddress: address }),
      setBusinessEmail: (email) => set({ businessEmail: email }),
      setInvoiceNumberPrefix: (prefix) => set({ invoiceNumberPrefix: prefix }),

      detectTimezone: () => {
        const detected = getDeviceTimezone()
        if (get().autoDetectTimezone) {
          set({ timezone: detected })
        }
        return detected
      },
    }),
    {
      name: 'takt-settings-store',
      onRehydrateStorage: () => (state) => {
        // If auto-detect is enabled, update timezone on load
        if (state?.autoDetectTimezone) {
          const detected = getDeviceTimezone()
          if (detected !== state.timezone) {
            state.timezone = detected
          }
        }
      },
    }
  )
)

// Helper to get current effective timezone
export function getEffectiveTimezone(): string {
  return useSettingsStore.getState().timezone
}
