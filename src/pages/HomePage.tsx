import { Link, useOutletContext } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, CircleDot } from 'lucide-react'
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
  const previousOddsRef = useRef<Record<string, { homeWin: number; draw: number; awayWin: number }>>({})
  const [oddsTrendByMatchId, setOddsTrendByMatchId] = useState<
    Record<string, { home_win: 'up' | 'down' | 'flat'; draw: 'up' | 'down' | 'flat'; away_win: 'up' | 'down' | 'flat' }>
  >({})

  const matches = getVisibleMatches(currentUser.id)
  const snapshotByMatchId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getMatchOperationalSnapshot>>()
    matches.forEach((match) => map.set(match.id, getMatchOperationalSnapshot(match.id)))
    return map
  }, [matches])
  const selectedByMatch = new Map<string, BetSelection>()
  getBetSlipItems().forEach((item) => {
    if (!selectedByMatch.has(item.matchId)) {
      selectedByMatch.set(item.matchId, item.selection)
    }
  })
  const activeAgentMarkets = getActiveMarketsForAgent(currentUser.id)
  const agentStats = getAgentCreateStats(currentUser.id)
  const playerVisibleMatches = matches.filter((match) =>
    ['open', 'locked'].includes(match.status),
  )
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
  const gateVariant = {
    normal: 'success',
    skewed: 'primary',
    danger: 'danger',
    extreme: 'danger',
  } as const

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (currentUser.role !== 'player') {
      return
    }
    const previousOdds = previousOddsRef.current
    const nextOdds: Record<string, { homeWin: number; draw: number; awayWin: number }> = {}

    setOddsTrendByMatchId((prevTrend) => {
      let nextTrend = prevTrend
      for (const match of playerVisibleMatches) {
        const currentOdds = {
          homeWin: match.odds.homeWin,
          draw: match.odds.draw,
          awayWin: match.odds.awayWin,
        }
        nextOdds[match.id] = currentOdds
        const prevOdds = previousOdds[match.id]
        if (!prevOdds) {
          continue
        }

        const currentTrend = prevTrend[match.id] ?? {
          home_win: 'flat' as const,
          draw: 'flat' as const,
          away_win: 'flat' as const,
        }
        const computedTrend = {
          home_win:
            currentOdds.homeWin > prevOdds.homeWin
              ? 'up'
              : currentOdds.homeWin < prevOdds.homeWin
                ? 'down'
                : currentTrend.home_win,
          draw:
            currentOdds.draw > prevOdds.draw
              ? 'up'
              : currentOdds.draw < prevOdds.draw
                ? 'down'
                : currentTrend.draw,
          away_win:
            currentOdds.awayWin > prevOdds.awayWin
              ? 'up'
              : currentOdds.awayWin < prevOdds.awayWin
                ? 'down'
                : currentTrend.away_win,
        }

        if (
          computedTrend.home_win !== currentTrend.home_win ||
          computedTrend.draw !== currentTrend.draw ||
          computedTrend.away_win !== currentTrend.away_win
        ) {
          if (nextTrend === prevTrend) {
            nextTrend = { ...prevTrend }
          }
          nextTrend[match.id] = computedTrend
        }
      }

      previousOddsRef.current = nextOdds
      return nextTrend
    })
  }, [currentUser.role, playerVisibleMatches])

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

  const getOddsTrend = (matchId: string, selection: BetSelection) => {
    const trend = oddsTrendByMatchId[matchId]
    if (!trend) return 'flat' as const
    return trend[selection]
  }

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
              {activeAgentMarkets.slice(0, visibleCount).map((market) => {
                const risk = snapshotByMatchId.get(market.id)?.riskControl
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
                      {risk ? (
                        <Badge variant={gateVariant[risk.gate]}>
                          {t(`match.gateLabel.${risk.gate}`)}
                        </Badge>
                      ) : null}
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
                    {risk ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p className="ui-muted">
                          {t('match.fcr')}: <span className="ui-number">{(risk.fcr * 100).toFixed(1)}%</span>
                        </p>
                        <p className="ui-muted">
                          {t('match.exposureRatio')}: <span className="ui-number font-semibold text-[var(--danger)]">{(risk.exposureRatio * 100).toFixed(1)}%</span>
                        </p>
                      </div>
                    ) : null}
                  </Link>
                </Card>
                )
              })}
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
      <Card className="flex h-28 items-center justify-center">
        <p className="ui-muted text-sm">{t('home.adSlotHint')}</p>
      </Card>
      <div className="grid gap-3">
        {playerVisibleMatches.length === 0 ? (
          <Card>
            <p className="ui-muted text-sm">{t('home.emptyMatches')}</p>
          </Card>
        ) : (
          playerVisibleMatches.map((match) => (
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
                  variant={selectedByMatch.get(match.id) === 'home_win' ? 'selected' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'home_win')}
                  disabled={match.status !== 'open'}
                  className="h-20 flex-col py-2 text-base"
                >
                  {match.status !== 'open' ? (
                    <span className="text-xs font-normal text-[var(--text-muted)]">⏸ {t('home.pausedLabel')}</span>
                  ) : (
                    <>
                      <span className="text-xs">{`${teamName(snapshotByMatchId.get(match.id)?.teams.homeTeam ?? '')}${t('home.winSuffix')}`}</span>
                      <span
                        className={`ui-number inline-flex items-center gap-1 text-base font-semibold ${
                          getOddsTrend(match.id, 'home_win') === 'up'
                            ? 'text-[var(--success)]'
                            : getOddsTrend(match.id, 'home_win') === 'down'
                              ? 'text-[var(--danger)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {getOddsTrend(match.id, 'home_win') === 'up' ? <ArrowUp size={12} /> : null}
                        {getOddsTrend(match.id, 'home_win') === 'down' ? <ArrowDown size={12} /> : null}
                        {match.odds.homeWin.toFixed(2)}
                      </span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant={selectedByMatch.get(match.id) === 'draw' ? 'selected' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'draw')}
                  disabled={match.status !== 'open'}
                  className="h-20 flex-col py-2 text-base"
                >
                  {match.status !== 'open' ? (
                    <span className="text-xs font-normal text-[var(--text-muted)]">⏸ {t('home.pausedLabel')}</span>
                  ) : (
                    <>
                      <span className="text-xs">{t('match.selection.draw')}</span>
                      <span
                        className={`ui-number inline-flex items-center gap-1 text-base font-semibold ${
                          getOddsTrend(match.id, 'draw') === 'up'
                            ? 'text-[var(--success)]'
                            : getOddsTrend(match.id, 'draw') === 'down'
                              ? 'text-[var(--danger)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {getOddsTrend(match.id, 'draw') === 'up' ? <ArrowUp size={12} /> : null}
                        {getOddsTrend(match.id, 'draw') === 'down' ? <ArrowDown size={12} /> : null}
                        {match.odds.draw.toFixed(2)}
                      </span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant={selectedByMatch.get(match.id) === 'away_win' ? 'selected' : 'neutral'}
                  onClick={() => onPlayerSelection(match.id, match.marketId, 'away_win')}
                  disabled={match.status !== 'open'}
                  className="h-20 flex-col py-2 text-base"
                >
                  {match.status !== 'open' ? (
                    <span className="text-xs font-normal text-[var(--text-muted)]">⏸ {t('home.pausedLabel')}</span>
                  ) : (
                    <>
                      <span className="text-xs">{`${teamName(snapshotByMatchId.get(match.id)?.teams.awayTeam ?? '')}${t('home.winSuffix')}`}</span>
                      <span
                        className={`ui-number inline-flex items-center gap-1 text-base font-semibold ${
                          getOddsTrend(match.id, 'away_win') === 'up'
                            ? 'text-[var(--success)]'
                            : getOddsTrend(match.id, 'away_win') === 'down'
                              ? 'text-[var(--danger)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {getOddsTrend(match.id, 'away_win') === 'up' ? <ArrowUp size={12} /> : null}
                        {getOddsTrend(match.id, 'away_win') === 'down' ? <ArrowDown size={12} /> : null}
                        {match.odds.awayWin.toFixed(2)}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}
