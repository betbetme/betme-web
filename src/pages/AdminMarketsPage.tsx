import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  getActiveMarketsForAgent,
  getAdminPlatformStats,
  getMatchOperationalSnapshot,
} from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { formatMoneyU } from '../shared/formatters/money'
import { TeamAvatar } from '../shared/ui/TeamAvatar'
import { RiskBadge } from '../shared/ui/RiskBadge'
import { localizeTeamName } from '../shared/i18n/teamNames'
import { Badge } from '../shared/ui/Badge'
import { CountdownText } from '../shared/ui/CountdownText'

export function AdminMarketsPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const [selectedAgentId, setSelectedAgentId] = useState('agent-1')
  const stats = getAdminPlatformStats()
  const options = [
    { id: 'agent-1', label: t('admin.agentFilter.agent01'), disabled: false },
    { id: 'agent-2', label: t('admin.agentFilter.agent02'), disabled: true },
    { id: 'agent-3', label: t('admin.agentFilter.agent03'), disabled: true },
    { id: 'agent-4', label: t('admin.agentFilter.agent04'), disabled: true },
  ]
  const activeMarkets = useMemo(() => {
    if (selectedAgentId !== 'agent-1') return []
    return getActiveMarketsForAgent('agent-1')
  }, [selectedAgentId])
  const teamName = (value: string) => localizeTeamName(value, i18n.resolvedLanguage)

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="ui-title text-[28px] font-semibold">{t('admin.marketsTitle')}</h1>
        <Link to="/admin/simulate">
          <Button type="button" variant="neutral" className="text-xs">
            {t('menu.simulate')}
          </Button>
        </Link>
      </div>
      <p className="ui-muted text-sm">{t('admin.marketsHint')}</p>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-title text-sm font-semibold">{t('admin.platformStats')}</p>
        </div>
        <p className="ui-muted text-xs">
          {t('admin.totalBet')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(stats.totalBetAmount)}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('admin.platformFeeIncome')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(stats.platformFeeIncome)}</span>
        </p>
        <p className="ui-muted text-xs">{t('admin.playerCount')}: <span className="ui-number">{stats.playerCount}</span></p>
        <div className="mt-3">
          <Link to="/admin/bills">
            <Button type="button" variant="neutral" className="w-full text-sm font-semibold">
              {t('admin.billsButton')}
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="ui-title text-sm font-semibold">{t('admin.createTemplate')}</p>
        <p className="ui-muted text-xs">{t('admin.createTemplateDesc')}</p>
        <Link to="/admin/templates" className="block">
          <Button type="button" variant="primary" className="w-full py-3 text-base font-semibold">
            {t('admin.createTemplateButton')}
          </Button>
        </Link>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="ui-title text-sm font-semibold">{t('admin.activeMarketsTitle')}</p>
          <select
            className="ui-input max-w-40"
            value={selectedAgentId}
            onChange={(event) => setSelectedAgentId(event.target.value)}
          >
            {options.map((item) => (
              <option key={item.id} value={item.id} disabled={item.disabled}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {activeMarkets.length === 0 ? (
          <p className="ui-muted text-sm">{t('admin.emptyActiveMarkets')}</p>
        ) : (
          <div className="grid gap-3">
            {activeMarkets.map((market) => {
              const snapshot = getMatchOperationalSnapshot(market.id)
              return (
                <Card key={market.id}>
                  <Link to={`/matches/${market.id}`} className="block space-y-2">
                    <p className="ui-muted text-xs">
                      {new Date(market.startTime).toLocaleString(i18n.resolvedLanguage)}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TeamAvatar teamName={teamName(market.homeTeam)} logoUrl={market.homeLogoUrl} />
                        <p className="ui-title text-sm font-semibold">{teamName(market.homeTeam)}</p>
                      </div>
                      <p className="ui-muted text-xs">vs</p>
                      <div className="flex items-center gap-2">
                        <p className="ui-title text-sm font-semibold">{teamName(market.awayTeam)}</p>
                        <TeamAvatar teamName={teamName(market.awayTeam)} logoUrl={market.awayLogoUrl} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge>{t(`match.statusLabel.${market.status}`)}</Badge>
                      <Badge variant="primary">
                        {t('home.lockCountdown')}: <CountdownText targetTime={market.startTime} />
                      </Badge>
                      <RiskBadge riskLevel={market.riskLevel} label={t(`risk.${market.riskLevel}`)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className="ui-muted">
                        {t('home.totalBet')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(market.totalBetAmount)}</span>
                      </p>
                      <p className="ui-muted">
                        {t('home.profitRange')}:{' '}
                        <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(market.maxProfit)}</span>
                        <span className="ui-number"> / </span>
                        <span className="ui-number font-semibold text-[var(--danger)]">-{formatMoneyU(market.maxRisk)}</span>
                      </p>
                    </div>
                    <p className="ui-muted text-xs">
                      {t('match.fcr')}: <span className="ui-number">{(snapshot.riskControl.fcr * 100).toFixed(1)}%</span>
                    </p>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </Card>

    </section>
  )
}
