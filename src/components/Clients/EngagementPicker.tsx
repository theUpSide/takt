import { useMemo } from 'react'
import { useEngagementStore } from '@/stores/engagementStore'
import { useClientStore } from '@/stores/clientStore'
import type { Engagement } from '@/types/engagement'

interface Props {
  value: string | null
  onChange: (engagementId: string | null, engagement: Engagement | null) => void
  /** Restrict options to only active engagements. Default true. */
  activeOnly?: boolean
  id?: string
  className?: string
}

/**
 * Shared select for choosing an engagement. Options are grouped by client
 * and labeled "Client Name — Engagement Title". Calls onChange with the
 * engagement object (or null) so callers can auto-fill related fields.
 */
export default function EngagementPicker({
  value,
  onChange,
  activeOnly = true,
  id,
  className,
}: Props) {
  const { engagements } = useEngagementStore()
  const { clients } = useClientStore()

  const grouped = useMemo(() => {
    const filtered = activeOnly
      ? engagements.filter((e) => e.status === 'active')
      : engagements
    const byClient = new Map<string, Engagement[]>()
    for (const e of filtered) {
      const list = byClient.get(e.client_id) ?? []
      list.push(e)
      byClient.set(e.client_id, list)
    }
    // Sort clients by name, engagements by title within each
    return [...byClient.entries()]
      .map(([clientId, es]) => ({
        client: clients.find((c) => c.id === clientId),
        engagements: es.sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .filter((g) => g.client)
      .sort((a, b) =>
        (a.client?.name ?? '').localeCompare(b.client?.name ?? '')
      )
  }, [engagements, clients, activeOnly])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null
    const engagement = id ? engagements.find((x) => x.id === id) ?? null : null
    onChange(id, engagement)
  }

  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={handleChange}
      className={
        className ??
        'w-full rounded-lg border border-theme-border-primary bg-theme-bg-tertiary px-3 py-2.5 text-sm text-theme-text-primary focus:border-theme-accent-primary focus:outline-none focus-glow transition-all-fast'
      }
    >
      <option value="">— None —</option>
      {grouped.map((g) => (
        <optgroup key={g.client!.id} label={g.client!.name}>
          {g.engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
