import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getCurrentUser } from '../services/authService'
import { getMatchById, getPlayerBetRecords } from '../services/betmeService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { markPendingBetsAsSeen } from '../services/playerNoticeStore'
import { Card } from '../shared/ui/Card'
import { Badge } from '../shared/ui/Badge'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function PlayerMinePage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const records = useMemo(() => getPlayerBetRecords(currentUser.id), [currentUser.id])
  const pendingSignature = useMemo(
    () =>
      records
        .filter((item) => item.status === 'pending')
        .map((item) => item.id)
        .sort()
        .join('|'),
    [records],
  )

  useEffect(() => {
    markPendingBetsAsSeen(currentUser.id)
  }, [currentUser.id, pendingSignature])

  const pending = records.filter((item) => item.status === 'pending')
  const settled = records.filter((item) => item.status !== 'pending')
  const moneyToneClass = (value: number) =>
    value < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'

  return (
    <section className="space-y-4">
      <h1 className="ui-title text-2xl font-semibold">{t('mine.title')}</h1>

      <div className="space-y-3">
        <h2 className="ui-title text-sm font-semibold">{t('mine.pending')}</h2>
        {pending.length === 0 ? (
          <Card>
            <p className="ui-muted text-sm">{t('mine.emptyPending')}</p>
          </Card>
        ) : (
          pending.map((bet) => {
            const match = getMatchById(bet.matchId)
            return (
              <Card key={bet.id} className="space-y-1">
                <p className="ui-title text-sm font-semibold">
                  {match ? localizeMatchTitle(match.title, i18n.resolvedLanguage) : bet.matchId}
                </p>
                <p className="ui-muted text-xs">{t(`match.selection.${bet.selection}`)}</p>
                <p className="ui-muted text-xs">
                  {t('mine.betAmount')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(bet.amount)}</span>
                </p>
                <p className="ui-muted text-xs">
                  {t('mine.betOdds')}: <span className="ui-number">{bet.oddsSnapshot.toFixed(2)}</span>
                </p>
                <p className="ui-muted text-xs">
                  {t('mine.potentialWin')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(bet.netAmount)}</span>
                </p>
                <Badge>{t('mine.pendingStatus')}</Badge>
              </Card>
            )
          })
        )}
      </div>

      <div className="space-y-3">
        <h2 className="ui-title text-sm font-semibold">{t('mine.settled')}</h2>
        {settled.length === 0 ? (
          <Card>
            <p className="ui-muted text-sm">{t('mine.emptySettled')}</p>
          </Card>
        ) : (
          settled.map((bet) => {
            const match = getMatchById(bet.matchId)
            const resultLabel =
              bet.result ? t(`match.selection.${bet.result}`) : t('mine.refundedResult')
            const outcomeKey =
              bet.status === 'won' ? 'mine.win' : bet.status === 'lost' ? 'mine.lose' : 'mine.refund'
            const pnl = bet.status === 'won' ? bet.payoutAmount - bet.amount : bet.status === 'lost' ? -bet.amount : 0
            return (
              <Card key={bet.id} className="space-y-1">
                <p className="ui-title text-sm font-semibold">
                  {match ? localizeMatchTitle(match.title, i18n.resolvedLanguage) : bet.matchId}
                </p>
                <p className="ui-title text-sm font-semibold">{t(`match.selection.${bet.selection}`)}</p>
                <p className="ui-muted text-xs">{t('mine.finalResult')}: {resultLabel}</p>
                <div className="flex items-center gap-2 text-xs">
                  {bet.status === 'won' ? (
                    <CheckCircle2 size={14} className="text-[var(--success)]" />
                  ) : bet.status === 'lost' ? (
                    <XCircle size={14} className="text-[var(--danger)]" />
                  ) : null}
                  <p className="ui-muted">{t(outcomeKey)}</p>
                </div>
                <p className="ui-muted text-xs">
                  {t('mine.pnl')}: {pnl >= 0 ? '+' : ''}
                  <span className={`ui-number font-semibold ${moneyToneClass(pnl)}`}>{formatMoneyU(pnl)}</span>
                </p>
              </Card>
            )
          })
        )}
      </div>
    </section>
  )
}
