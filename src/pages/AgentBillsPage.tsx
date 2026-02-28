import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getAgentSettlementBills } from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function AgentBillsPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const bills = getAgentSettlementBills(currentUser.id)
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="ui-title text-[28px] font-semibold">{t('agentBills.title')}</h1>
        <Link to="/matches">
          <Button type="button" variant="neutral">
            {t('agentBills.back')}
          </Button>
        </Link>
      </div>

      {bills.length === 0 ? (
        <Card>
          <p className="ui-muted text-sm">{t('agentBills.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bills.map((bill) => (
            <Card key={bill.match.id} className="space-y-1">
              <p className="ui-title text-sm font-semibold">
                {localizeMatchTitle(bill.match.title, i18n.resolvedLanguage)}
              </p>
              <p className="ui-muted text-xs">
                {new Date(bill.match.startTime).toLocaleString(i18n.resolvedLanguage)}
              </p>
              <p className="ui-muted text-xs">
                {t('agentBills.feeIncome')}: <span className={`ui-number font-semibold ${moneyToneClass(bill.feeIncome)}`}>{formatMoneyU(bill.feeIncome)}</span>
              </p>
              <p className="ui-muted text-xs">
                {t('agentBills.poolIncome')}: <span className={`ui-number font-semibold ${moneyToneClass(bill.poolIncome)}`}>{formatMoneyU(bill.poolIncome)}</span>
              </p>
              <p className={`ui-title ui-number text-sm font-semibold ${moneyToneClass(bill.netIncome)}`}>
                {t('agentBills.netIncome')}: {formatMoneyU(bill.netIncome)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
