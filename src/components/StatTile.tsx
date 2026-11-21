import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

export function StatTile({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-3.5">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-faint">{hint}</p> : null}
    </Card>
  )
}
