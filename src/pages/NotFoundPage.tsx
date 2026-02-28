import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../shared/ui/Card'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <Card className="rounded-2xl p-8 text-center">
      <h1 className="ui-title text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="ui-muted mt-2 text-sm">
        {t('notFound.description')}
      </p>
      <Link to="/matches" className="ui-btn-primary mt-6 inline-flex">
        {t('nav.backToMatches')}
      </Link>
    </Card>
  )
}
