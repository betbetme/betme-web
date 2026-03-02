import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  cancelMatch,
  getMatchById,
  getMatchOperationalSnapshot,
  updateMarketStatus,
} from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
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

export function MatchDetailPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const { id } = useParams()
  const { currentUser } = useOutletContext<LayoutContextValue>()
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  const match = id ? getMatchById(id) : undefined
  const snapshot = match ? getMatchOperationalSnapshot(match.id) : null

  if (!match || !snapshot) {
    return (
      <Card className="max-w-xl">
        <p className="ui-muted text-sm">{t('match.notFound')}</p>
        <Link to="/matches" className="mt-4 inline-block text-sm text-[var(--primary)]">
          {t('nav.backToMatches')}
        </Link>
      </Card>
    )
  }

  const showPlayerHint =
    currentUser.role === 'player' &&
    currentUser.parentId === match.agentId &&
    match.status === 'open'
  const isMatchOwnerAgent =
    currentUser.role === 'agent' && currentUser.id === match.agentId
  const teamName = (value: string) => localizeTeamName(value, i18n.resolvedLanguage)
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
  const gateVariant = {
    normal: 'success',
    skewed: 'primary',
    danger: 'danger',
    extreme: 'danger',
  } as const

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const cancelAction = () => {
    try {
      cancelMatch(currentUser.id, match.id)
      setNotice({ text: t('message.cancelled'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.cancelFailed'),
        variant: 'error',
      })
    }
  }

  const pauseAction = () => {
    try {
      updateMarketStatus(currentUser.id, match.id, 'locked')
      setNotice({ text: t('message.matchPaused'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.statusMoveFailed'),
        variant: 'error',
      })
    }
  }

  const resumeAction = () => {
    try {
      updateMarketStatus(currentUser.id, match.id, 'open')
      setNotice({ text: t('message.matchResumed'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.statusMoveFailed'),
        variant: 'error',
      })
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl rounded-2xl p-6">
      <header className="mb-4">
        <Link to="/matches" className="text-sm text-[var(--primary)]">
          {t('nav.backToMatches')}
        </Link>
      </header>

      <section className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <TeamAvatar teamName={teamName(snapshot.teams.homeTeam)} logoUrl={snapshot.logos.homeLogoUrl} />
            <p className="ui-title text-sm font-semibold">{teamName(snapshot.teams.homeTeam)}</p>
          </div>
          <div>
            <p className="ui-muted text-xs">
              {new Date(match.startTime).toLocaleString(i18n.resolvedLanguage)}
            </p>
            <p className="ui-muted mt-1 text-xs">
              {t('match.lockCountdown')}: <CountdownText targetTime={match.startTime} />
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <p className="ui-title text-sm font-semibold">{teamName(snapshot.teams.awayTeam)}</p>
            <TeamAvatar teamName={teamName(snapshot.teams.awayTeam)} logoUrl={snapshot.logos.awayLogoUrl} />
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
          <div
            className="h-full rounded-full bg-[color:var(--success)]"
            style={{
              width: `${Math.max(
                100 - (snapshot.lockCountdown.remainingMinutes / 1440) * 100,
                0,
              )}%`,
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge>{t(`match.statusLabel.${match.status}`)}</Badge>
          <RiskBadge riskLevel={snapshot.riskLevel} label={t(`risk.${snapshot.riskLevel}`)} />
        </div>
      </section>

      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <section className="mt-4 space-y-2 rounded-xl border border-[color:var(--border)] p-4">
        <h2 className="ui-title text-sm font-semibold">{t('match.riskAndPool')}</h2>
        <p className="ui-muted text-xs">
          {t('match.maxRisk')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(snapshot.maxRisk)}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.releasedPool')}: <span className="ui-number">{formatMoneyU(snapshot.releasedPool)}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.totalPool')}: <span className="ui-number">{formatMoneyU(snapshot.poolTotal)}</span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
          <div
            className="h-full rounded-full bg-[color:var(--success)]"
            style={{ width: `${snapshot.releasedRatio * 100}%` }}
          />
        </div>
      </section>

      <section className="mt-4 space-y-2 rounded-xl border border-[color:var(--border)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="ui-title text-sm font-semibold">{t('match.riskMonitor')}</h2>
          <Badge variant={gateVariant[snapshot.riskControl.gate]}>
            {t(`match.gateLabel.${snapshot.riskControl.gate}`)}
          </Badge>
        </div>
        <p className="ui-muted text-xs">
          {t('match.fcr')}: <span className="ui-number">{(snapshot.riskControl.fcr * 100).toFixed(2)}%</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.topSideBetRatio')}: <span className="ui-number">{(snapshot.riskControl.topSideBetRatio * 100).toFixed(2)}%</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.exposureRatio')}: <span className="ui-number font-semibold text-[var(--danger)]">{(snapshot.riskControl.exposureRatio * 100).toFixed(2)}%</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.exposureAmount')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(snapshot.riskControl.exposureAmount)}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.releasedStage')}: <span className="ui-number">{snapshot.riskControl.releasedStage}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('match.rFactor')}: <span className="ui-number">{snapshot.riskControl.rFactor.toFixed(2)}</span>
        </p>
        <p
          className={`min-h-4 text-xs ${
            snapshot.riskControl.haltedByRisk ? 'text-[var(--danger)]' : 'ui-muted'
          }`}
        >
          {snapshot.riskControl.haltedByRisk
            ? t('match.haltedByRisk')
            : t('match.normalOperating')}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--border)] p-4">
        <div>
          <p className="ui-muted text-xs">{t('match.totalAmount')}</p>
          <p className="ui-title ui-number text-sm font-semibold">{formatMoneyU(snapshot.totalBetAmount)}</p>
        </div>
        <div>
          <p className="ui-muted text-xs">{t('match.feeIncome')}</p>
          <p className={`ui-title ui-number text-sm font-semibold ${moneyToneClass(snapshot.feeIncome)}`}>{formatMoneyU(snapshot.feeIncome)}</p>
        </div>
      </section>

      <section className="mt-4 space-y-3 rounded-xl border border-[color:var(--border)] p-4">
        <h2 className="ui-title text-sm font-semibold">{t('match.distribution')}</h2>
        {snapshot.outcomeProjection.map((item) => {
          const percent = item.percent.toFixed(2)
          return (
            <article key={item.key} className="space-y-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="ui-title text-sm font-medium">{t(`match.selection.${item.key}`)}</p>
                  <p className="ui-muted text-xs">
                    {item.users} {t('match.users')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="ui-title ui-number text-sm font-semibold">{formatMoneyU(item.amount)}</p>
                  <p className="text-xs text-[var(--primary)]">{percent}%</p>
                </div>
              </div>
              <p className="ui-muted text-xs">
                {t('match.projectedRevenue')}: <span className={`ui-number font-semibold ${moneyToneClass(item.projectedRevenue)}`}>{formatMoneyU(item.projectedRevenue)}</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[color:var(--primary)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          )
        })}
      </section>

      {showPlayerHint ? (
        <section className="mt-6 space-y-3 rounded-xl border border-[color:var(--border)] p-4">
          <h2 className="ui-title text-sm font-semibold">{t('match.placeBet')}</h2>
          <p className="ui-muted text-sm">{t('match.betHint')}</p>
          <Link to="/matches" className="text-sm text-[var(--primary)]">
            {t('match.goSelect')}
          </Link>
        </section>
      ) : null}

      {isMatchOwnerAgent ? (
        <section className="mt-6 space-y-3 rounded-xl border border-[color:var(--border)] p-4">
          <h2 className="ui-title text-sm font-semibold">{t('match.agentControls')}</h2>
          {match.status === 'open' ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={pauseAction} variant="neutral">
                {t('match.pauseMatch')}
              </Button>
              <Button type="button" onClick={cancelAction} variant="neutral">
                {t('match.cancelMatch')}
              </Button>
            </div>
          ) : null}
          {match.status === 'locked' ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={resumeAction} variant="neutral">
                {t('match.resumeMatch')}
              </Button>
              <Button type="button" onClick={cancelAction} variant="neutral">
                {t('match.cancelMatch')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      
    </Card>
  )
}
