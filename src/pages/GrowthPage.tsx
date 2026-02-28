import { useTranslation } from 'react-i18next'
import { getCurrentUser } from '../services/authService'
import { Card } from '../shared/ui/Card'
import { Badge } from '../shared/ui/Badge'

export function GrowthPage() {
  const { t } = useTranslation()
  const currentUser = getCurrentUser()
  const isAgent = currentUser.role === 'agent'

  return (
    <section className="space-y-4">
      <h1 className="ui-title text-2xl font-semibold">{t('growth.title')}</h1>
      <Card className="space-y-2">
        <p className="ui-title text-sm font-semibold">{t('growth.pointsTitle')}</p>
        <div className="flex items-center justify-between">
          <p className="ui-title text-lg font-semibold">10000</p>
          <Badge variant="primary">LV01</Badge>
        </div>
        <p className="ui-muted text-xs">
          {isAgent ? t('growth.agentShare') : t('growth.playerBenefits')}
        </p>
        <p className="ui-muted text-xs">{isAgent ? t('growth.agentHint') : t('growth.playerHint')}</p>
      </Card>

      <Card className="space-y-2 opacity-70">
        <div className="flex items-center justify-between">
          <p className="ui-title text-sm font-semibold">
            {isAgent ? t('growth.inviteAgentTitle') : t('growth.inviteFriendTitle')}
          </p>
          <Badge>{t('growth.comingSoon')}</Badge>
        </div>
        <p className="ui-muted text-sm">
          {isAgent ? t('growth.inviteAgentHint') : t('growth.inviteFriendHint')}
        </p>
      </Card>

      <Card
        className="space-y-2 opacity-70"
        title={t('growth.comingSoonTooltip')}
      >
        <p className="ui-title text-sm font-semibold">{t('growth.benefitsTitle')}</p>
        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
          <li>{isAgent ? t('growth.benefit.agent1') : t('growth.benefit.player1')}</li>
          <li>{isAgent ? t('growth.benefit.agent2') : t('growth.benefit.player2')}</li>
          <li>{isAgent ? t('growth.benefit.agent3') : t('growth.benefit.player3')}</li>
        </ul>
      </Card>
    </section>
  )
}
