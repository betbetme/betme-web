import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getAgentCreateStats } from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { formatMoneyU } from '../shared/formatters/money'

export function AgentCreatePage() {
  const { t } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const stats = getAgentCreateStats(currentUser.id)
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'

  return (
    <section className="space-y-5">
      <h1 className="ui-title text-[28px] font-semibold">{t('agentCreate.title')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="ui-muted text-xs">{t('agentCreate.netProfit')}</p>
          <p className={`ui-title ui-number mt-1 text-[28px] font-semibold leading-none ${moneyToneClass(stats.netProfit)}`}>{formatMoneyU(stats.netProfit)}</p>
        </Card>
        <Card>
          <p className="ui-muted text-xs">{t('agentCreate.feeIncome')}</p>
          <p className={`ui-title ui-number mt-1 text-[28px] font-semibold leading-none ${moneyToneClass(stats.feeIncome)}`}>{formatMoneyU(stats.feeIncome)}</p>
        </Card>
        <Card>
          <p className="ui-muted text-xs">{t('agentCreate.poolProfit')}</p>
          <p className={`ui-title ui-number mt-1 text-[28px] font-semibold leading-none ${moneyToneClass(stats.poolProfit)}`}>{formatMoneyU(stats.poolProfit)}</p>
        </Card>
        <Card>
          <p className="ui-muted text-xs">{t('agentCreate.poolLoss')}</p>
          <p className="ui-title ui-number mt-1 text-[28px] font-semibold leading-none text-[var(--danger)]">{formatMoneyU(stats.poolLoss)}</p>
        </Card>
      </div>
      <Card>
        <p className="ui-muted text-xs">{t('agentCreate.activeMatches')}</p>
        <p className="ui-title ui-number mt-1 text-[28px] font-semibold leading-none">{stats.activeMatches}</p>
      </Card>
      <Card className="flex justify-center">
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/agent/create/new">
            <Button variant="primary">{t('agentCreate.goCreate')}</Button>
          </Link>
          <Link to="/agent/bills">
            <Button variant="neutral">{t('agentCreate.goBills')}</Button>
          </Link>
        </div>
      </Card>
    </section>
  )
}
