import { Link, useOutletContext } from 'react-router-dom'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleDot } from 'lucide-react'
import {
  getActiveMarketsForAgent,
  getAgentCreateStats,
  getMatchOperationalSnapshot,
  getVisibleMatches,
} from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import {
  getBetSlipVersion,
  getBetSlipItems,
  subscribeBetSlip,
  upsertBetSlipSelection,
} from '../services/betSlipStore'
import type { BetSelection } from '../types/domain'
import type { LayoutContextValue } from '../shared/layouts/layoutContext'
import { Card } from '../shared/ui/Card'
import { Badge } from '../shared/ui/Badge'
import { Button } from '../shared/ui/Button'
import { TeamAvatar } from '../shared/ui/TeamAvatar'
import { RiskBadge } from '../shared/ui/RiskBadge'
import { Toast } from '../shared/ui/Toast'
import { CountdownText } from '../shared/ui/CountdownText'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeTeamName } from '../shared/i18n/teamNames'

export function HomePage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  useSyncExternalStore(subscribeBetSlip, getBetSlipVersion)
  const { currentUser } = useOutletContext<LayoutContextValue>()
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const matches = useMemo(() => getVisibleMatches(currentUser.id), [currentUser.id])
  const snapshotByMatchId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getMatchOperationalSnapshot>>()
    matches.forEach((match) => map.set(match.id, getMatchOperationalSnapshot(match.id)))
    return map
  }, [matches])
  const selectedByMatch = new Map<string, BetSelection>()
  getBetSlipItems().forEach((item) => selectedByMatch.set(item.matchId, item.selection))
  const activeAgentMarkets = useMemo(
    () => getActiveMarketsForAgent(currentUser.id),
    [currentUser.id],
  )
  const agentStats = useMemo(() => getAgentCreateStats(currentUser.id), [currentUser.id])
  const openPlayerMatches = useMemo(
    () => matches.filter((match) => match.status === 'open'),
    [matches],
  )
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const onPlayerSelection = (matchId: string, marketId: string, selection: BetSelection) => {
    try {
      upsertBetSlipSelection({ matchId, marketId, selection })
      setNotice({ text: t('message.betSlipUpdated'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.betFailed'),
        variant: 'error',
      })
    }
  }
  const teamName = (value: string) => localizeTeamName(value, i18n.resolvedLanguage)

  if (currentUser.role === 'agent') {
    return (
      <section className="space-y-5">
        {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}
        <h1 className="ui-title text-[28px] font-semibold">{t('home.title')}</h1>

        <Card>
          <h2 className="ui-title text-sm font-semibold">{t('home.summaryTitle')}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="ui-muted text-xs">
              {t('agentCreate.netProfit')}: <span className={`ui-number font-semibold ${moneyToneClass(agentStats.netProfit)}`}>{formatMoneyU(agentStats.netProfit)}</span>
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreate.feeIncome')}: <span className={`ui-number font-semibold ${moneyToneClass(agentStats.feeIncome)}`}>{formatMoneyU(agentStats.feeIncome)}</span>
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreate.poolProfit')}: <span className={`ui-number font-semibold ${moneyToneClass(agentStats.poolProfit)}`}>{formatMoneyU(agentStats.poolProfit)}</span>
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreate.poolLoss')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(agentStats.poolLoss)}</span>
            </p>
            <p className="ui-muted text-xs">{t('agentCreate.activeMatches')}: <span className="ui-number">{agentStats.activeMatches}</span></p>
          </div>
          <div className="mt-3">
            <Link to="/agent/bills">
              <Button type="button" variant="neutral" className="w-full text-sm font-semibold">
                {t('agentCreate.goBills')}
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="ui-title text-sm font-semibold">{t('home.createMatchTitle')}</h2>
          <p className="ui-muted mt-1 text-xs">{t('home.createMatchHint')}</p>
          <div className="mt-3">
            <Link to="/agent/create/new">
              <Button type="button" variant="primary" className="w-full py-3 text-base">
                {t('home.create')}
              </Button>
            </Link>
          </div>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CircleDot size={16} className="text-[var(--primary)]" />
            <h2 className="ui-title text-base font-semibold">{t('home.activeMarkets')}</h2>
          </div>
          {activeAgentMarkets.length === 0 ? (
            <Card>
              <p className="ui-muted text-sm">{t('home.emptyMatches')}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {activeAgentMarkets.slice(0, visibleCount).map((market) => (
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
                  </Link>
                </Card>
              ))}
            </div>
          )}
          {activeAgentMarkets.length > 10 ? (
            <Button
              type="button"
              variant="neutral"
              onClick={() =>
                setVisibleCount((prev) =>
                  prev >= activeAgentMarkets.length ? 10 : Math.min(prev + 10, activeAgentMarkets.length),
                )
              }
            >
              {visibleCount >= activeAgentMarkets.length ? t('home.showLess') : t('home.showMore')}
            </Button>
          ) : null}
        </section>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <h1 className="ui-title text-[28px] font-semibold">{t('home.title')}</h1>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}
      <div className="grid gap-3">
        {openPlayerMatches.length === 0 ? (
          <Card>
            <p className="ui-muted text-sm">{t('home.emptyMatches')}</p>
          </Card>
        ) : (
          openPlayerMatches.map((match) => (
            <Card key={match.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TeamAvatar
                    teamName={teamName(snapshotByMatchId.get(match.id)?.teams.homeTeam ?? match.title)}
                    logoUrl={snapshotByMatchId.get(match.id)?.logos.homeLogoUrl}
                  />
                  <p className="ui-title text-sm font-semibold">
                    {teamName(snapshotByMatchId.get(match.id)?.teams.homeTeam ?? match.title)}
                  </p>
                </div>
                <p className="ui-muted text-xs">vs</p>
                <div className="flex items-center gap-2">
                  <p className="ui-title text-sm font-semibold">
                    {teamName(snapshotByMatchId.get(match.id)?.teams.awayTeam ?? '')}
                  </p>
                  <TeamAvatar
                    teamName={teamName(snapshotByMatchId.get(match.id)?.teams.awayTeam ?? match.title)}
                    logoUrl={snapshotByMatchId.get(match.id)?.logos.awayLogoUrl}
                  />
                </div>
              </div>
              <p className="ui-muted mt-1 text-sm">
                {new Date(match.startTime).toLocaleString(i18n.resolvedLanguage)}
              </p>
              <div className="mt-2">
                <Badge>{t(`match.statusLabel.${match.status}`)}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant={selectedByMatch.get(match.id) === 'home_win' ? 'primary' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'home_win')}
                  className="h-20 flex-col py-2 text-base"
                >
                  <span>{`${teamName(snapshotByMatchId.get(match.id)?.teams.homeTeam ?? '')}${t('home.winSuffix')}`}</span>
                  <span className="ui-number text-xs opacity-80">
                    {t('home.oddsLabel')}: {match.odds.homeWin.toFixed(2)}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={selectedByMatch.get(match.id) === 'draw' ? 'primary' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'draw')}
                  className="h-20 flex-col py-2 text-base"
                >
                  <span>{t('match.selection.draw')}</span>
                  <span className="ui-number text-xs opacity-80">
                    {t('home.oddsLabel')}: {match.odds.draw.toFixed(2)}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={selectedByMatch.get(match.id) === 'away_win' ? 'primary' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'away_win')}
                  className="h-20 flex-col py-2 text-base"
                >
                  <span>{`${teamName(snapshotByMatchId.get(match.id)?.teams.awayTeam ?? '')}${t('home.winSuffix')}`}</span>
                  <span className="ui-number text-xs opacity-80">
                    {t('home.oddsLabel')}: {match.odds.awayWin.toFixed(2)}
                  </span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}
