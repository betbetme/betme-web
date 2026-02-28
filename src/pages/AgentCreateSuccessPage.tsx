import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getMatchById } from '../services/betmeService'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Badge } from '../shared/ui/Badge'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function AgentCreateSuccessPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const match = id ? getMatchById(id) : undefined

  if (!match) {
    return <Navigate to="/agent/create" replace />
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-2">
        <p className="ui-title text-lg font-semibold">
          {localizeMatchTitle(match.title, i18n.resolvedLanguage)}
        </p>
        <p className="ui-muted text-sm">
          {new Date(match.startTime).toLocaleString(i18n.resolvedLanguage)}
        </p>
        <Badge>{t(`match.statusLabel.${match.status}`)}</Badge>
      </Card>

      <Card className="space-y-2 text-center">
        <p className="ui-muted text-sm">
          {t('agentCreateSuccess.createdAt')}:{' '}
          {new Date(match.createdAt).toLocaleString(i18n.resolvedLanguage)}
        </p>
        <p className="ui-title text-base font-semibold">{t('agentCreateSuccess.message')}</p>
      </Card>

      <div className="grid gap-2">
        <Link to="/agent/create/new">
          <Button type="button" variant="primary" className="w-full">
            {t('agentCreateSuccess.createAgain')}
          </Button>
        </Link>
        <Link to="/matches">
          <Button type="button" variant="neutral" className="w-full">
            {t('agentCreateSuccess.backHome')}
          </Button>
        </Link>
      </div>
    </section>
  )
}
