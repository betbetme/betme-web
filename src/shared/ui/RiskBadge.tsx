import { Badge } from './Badge'

type RiskLevel = 'low' | 'medium' | 'high' | 'paused'

interface RiskBadgeProps {
  riskLevel: RiskLevel
  label: string
}

export function RiskBadge({ riskLevel, label }: RiskBadgeProps) {
  const variant =
    riskLevel === 'low'
      ? 'success'
      : riskLevel === 'medium'
        ? 'primary'
        : riskLevel === 'high'
          ? 'danger'
          : 'default'

  return <Badge variant={variant}>{label}</Badge>
}
