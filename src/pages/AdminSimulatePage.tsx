import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import {
  getBetSimulationSnapshot,
  getLockedMatchesForAdmin,
  getSimulateEligibleMatches,
  pauseBetSimulation,
  resolveMarketsByAdmin,
  resumeBetSimulation,
  startBetSimulation,
  stopBetSimulation,
} from '../services/betmeService'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Toast } from '../shared/ui/Toast'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'
import type { MatchResult } from '../types/domain'

export function AdminSimulatePage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const canSettle = currentUser.role === 'admin'
  const [selections, setSelections] = useState<Record<string, MatchResult | undefined>>({})
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)
  const lockedMatches = getLockedMatchesForAdmin()
  const activeMatches = getSimulateEligibleMatches()
  const simulation = getBetSimulationSnapshot()
  const [targetMatchId, setTargetMatchId] = useState(activeMatches[0]?.id ?? '')
  const [userCount, setUserCount] = useState(1000)
  const [averageAmount, setAverageAmount] = useState<5 | 10 | 20>(10)
  const [durationSec, setDurationSec] = useState<60 | 120 | 300>(60)
  const [distribution, setDistribution] = useState<'balanced' | 'home_bias' | 'away_bias'>('home_bias')
  const selectedCount = Object.values(selections).filter(Boolean).length
  const isRunning = simulation.status === 'running'
  const isPaused = simulation.status === 'paused'
  const hasSimulationWarning = activeMatches.length === 0
  const simulationInlineHint = hasSimulationWarning
    ? t('admin.simulation.emptyActive')
    : simulation.status === 'idle'
      ? t('admin.simulation.idleHint')
      : t('admin.simulation.normalHint')

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!activeMatches.some((match) => match.id === targetMatchId)) {
      setTargetMatchId(activeMatches[0]?.id ?? '')
    }
  }, [activeMatches, targetMatchId])

  const onStartSimulation = () => {
    if (!targetMatchId) {
      setNotice({ text: t('admin.simulation.matchRequired'), variant: 'error' })
      return
    }
    try {
      startBetSimulation(currentUser.id, {
        matchId: targetMatchId,
        userCount,
        averageAmount,
        durationSec,
        distribution,
      })
      setNotice({ text: t('admin.simulation.started'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.simulation.failed'),
        variant: 'error',
      })
    }
  }

  const onPauseSimulation = () => {
    try {
      pauseBetSimulation(currentUser.id)
      setNotice({ text: t('admin.simulation.paused'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.simulation.failed'),
        variant: 'error',
      })
    }
  }

  const onResumeSimulation = () => {
    try {
      resumeBetSimulation(currentUser.id)
      setNotice({ text: t('admin.simulation.resumed'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.simulation.failed'),
        variant: 'error',
      })
    }
  }

  const onStopSimulation = () => {
    try {
      stopBetSimulation(currentUser.id)
      setNotice({ text: t('admin.simulation.stopped'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.simulation.failed'),
        variant: 'error',
      })
    }
  }

  const onConfirm = () => {
    try {
      const payload = Object.entries(selections)
        .filter(([, result]) => Boolean(result))
        .map(([matchId, result]) => ({ matchId, result: result as MatchResult }))
      resolveMarketsByAdmin(currentUser.id, payload)
      setSelections({})
      setNotice({ text: t('admin.batchResolved'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.batchResolveFailed'),
        variant: 'error',
      })
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="ui-title text-[28px] font-semibold">{t('admin.simulateTitle')}</h1>
        <Link to="/admin/markets">
          <Button type="button" variant="neutral">
            {t('admin.backHome')}
          </Button>
        </Link>
      </div>
      <p className="ui-muted text-sm">{t('admin.simulateHint')}</p>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-title text-sm font-semibold">{t('admin.simulation.title')}</p>
          <p className="ui-muted text-xs">
            {t('admin.simulation.status')}: <span className="ui-number font-semibold">{t(`admin.simulation.statusLabel.${simulation.status}`)}</span>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="ui-muted text-xs">{t('admin.simulation.match')}</span>
            <select
              className="ui-input"
              value={targetMatchId}
              onChange={(event) => setTargetMatchId(event.target.value)}
              disabled={isRunning || isPaused}
            >
              {activeMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {localizeMatchTitle(match.title, i18n.resolvedLanguage)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="ui-muted text-xs">{t('admin.simulation.userCount')}</span>
            <select
              className="ui-input"
              value={String(userCount)}
              onChange={(event) => setUserCount(Number(event.target.value))}
              disabled={isRunning || isPaused}
            >
              <option value="1000">1,000</option>
              <option value="10000">10,000</option>
              <option value="50000">50,000</option>
              <option value="100000">100,000</option>
              <option value="500000">500,000</option>
              <option value="1000000">1,000,000</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="ui-muted text-xs">{t('admin.simulation.averageAmount')}</span>
            <select
              className="ui-input"
              value={String(averageAmount)}
              onChange={(event) => setAverageAmount(Number(event.target.value) as 5 | 10 | 20)}
              disabled={isRunning || isPaused}
            >
              <option value="5">5U</option>
              <option value="10">10U</option>
              <option value="20">20U</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="ui-muted text-xs">{t('admin.simulation.duration')}</span>
            <select
              className="ui-input"
              value={String(durationSec)}
              onChange={(event) => setDurationSec(Number(event.target.value) as 60 | 120 | 300)}
              disabled={isRunning || isPaused}
            >
              <option value="60">{t('admin.simulation.duration1m')}</option>
              <option value="120">{t('admin.simulation.duration2m')}</option>
              <option value="300">{t('admin.simulation.duration5m')}</option>
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="ui-muted text-xs">{t('admin.simulation.distribution')}</span>
            <select
              className="ui-input"
              value={distribution}
              onChange={(event) =>
                setDistribution(event.target.value as 'balanced' | 'home_bias' | 'away_bias')
              }
              disabled={isRunning || isPaused}
            >
              <option value="balanced">{t('admin.simulation.distributionBalanced')}</option>
              <option value="home_bias">{t('admin.simulation.distributionHomeBias')}</option>
              <option value="away_bias">{t('admin.simulation.distributionAwayBias')}</option>
            </select>
          </label>
        </div>
        <p
          className={`min-h-4 text-xs ${hasSimulationWarning ? 'text-[var(--danger)]' : 'ui-muted'}`}
        >
          {simulationInlineHint}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <p className="ui-muted">
            {t('admin.simulation.elapsed')}:{' '}
            <span className="ui-number font-semibold">{simulation.elapsedSec}s</span>
          </p>
          <p className="ui-muted">
            {t('admin.simulation.processedUsers')}:{' '}
            <span className="ui-number font-semibold">{simulation.processedUsers.toLocaleString()}</span>
          </p>
          <p className="ui-muted">
            {t('admin.simulation.placedUsers')}:{' '}
            <span className="ui-number font-semibold text-[var(--success)]">{simulation.placedUsers.toLocaleString()}</span>
          </p>
          <p className="ui-muted">
            {t('admin.simulation.totalStake')}:{' '}
            <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(simulation.totalStake)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={onStartSimulation}
            disabled={!canSettle || activeMatches.length === 0 || isRunning || isPaused}
          >
            {t('admin.simulation.start')}
          </Button>
          <Button type="button" variant="neutral" onClick={onPauseSimulation} disabled={!canSettle || !isRunning}>
            {t('admin.simulation.pause')}
          </Button>
          <Button type="button" variant="neutral" onClick={onResumeSimulation} disabled={!canSettle || !isPaused}>
            {t('admin.simulation.resume')}
          </Button>
          <Button
            type="button"
            variant="neutral"
            onClick={onStopSimulation}
            disabled={!canSettle || (!isRunning && !isPaused)}
          >
            {t('admin.simulation.stop')}
          </Button>
        </div>
      </Card>

      {lockedMatches.length === 0 ? (
        <Card>
          <p className="ui-muted text-sm">{t('admin.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {lockedMatches.map(({ match }) => (
            <Card key={match.id}>
              <div className="space-y-3">
                <div>
                  <p className="ui-title text-base font-medium">
                    {localizeMatchTitle(match.title, i18n.resolvedLanguage)}
                  </p>
                  <p className="ui-muted mt-1 text-xs">
                    {new Date(match.startTime).toLocaleString(i18n.resolvedLanguage)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['home_win', 'draw', 'away_win'] as const).map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={selections[match.id] === item ? 'primary' : 'neutral'}
                      disabled={!canSettle}
                      onClick={() => {
                        setSelections((prev) => {
                          const next = { ...prev }
                          if (next[match.id] === item) {
                            delete next[match.id]
                          } else {
                            next[match.id] = item
                          }
                          return next
                        })
                      }}
                    >
                      {t(`match.selection.${item}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="sticky bottom-20 z-20 border-[color:#8f6bff55]">
        <div className="flex items-center justify-between gap-3">
          <p className="ui-muted text-sm">{t('admin.selectedCount', { count: selectedCount })}</p>
          <Button type="button" variant="primary" disabled={selectedCount === 0 || !canSettle} onClick={onConfirm}>
            <Check size={14} className="mr-1" />
            {t('admin.confirmSettlement')}
          </Button>
        </div>
        {!canSettle ? <p className="mt-2 text-xs text-[#7f73a7]">{t('admin.simulateReadonly')}</p> : null}
      </Card>
    </section>
  )
}
