import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getAdminSettledMarketRecords } from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function AdminBillsPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const settledRecords = getAdminSettledMarketRecords()

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="ui-title text-[28px] font-semibold">{t('admin.billsTitle')}</h1>
        <Link to="/admin/markets">
          <Button type="button" variant="neutral">
            {t('admin.backHome')}
          </Button>
        </Link>
      </div>
      {settledRecords.length === 0 ? (
        <Card>
          <p className="ui-muted text-sm">{t('admin.emptyBills')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {settledRecords.map((item) => (
            <div key={item.match.id} className="rounded-lg border border-[color:var(--border)] p-2">
              <p className="ui-title text-sm">{localizeMatchTitle(item.match.title, i18n.resolvedLanguage)}</p>
              <p className="ui-muted text-xs">
                {new Date(item.match.startTime).toLocaleString(i18n.resolvedLanguage)}
              </p>
              <p className="ui-muted text-xs">
                {t('admin.feeShareIncome', { ratio: item.platformSplitPercent })}:{' '}
                <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(item.platformFeeIncome)}</span>
              </p>
              <p className="ui-muted text-xs">
                {t('admin.poolShareIncome', { ratio: item.platformSplitPercent })}:{' '}
                <span className={`ui-number font-semibold ${item.platformPoolIncome < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                  {formatMoneyU(item.platformPoolIncome)}
                </span>
              </p>
              <p className="ui-muted text-xs">
                {t('admin.totalIncome')}:{' '}
                <span className={`ui-number font-semibold ${item.totalIncome < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                  {formatMoneyU(item.totalIncome)}
                </span>
              </p>
              <p className="ui-muted text-xs">
                {t('admin.settledCount')}: <span className="ui-number">{item.settledCount}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
