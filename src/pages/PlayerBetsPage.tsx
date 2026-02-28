import { useEffect, useSyncExternalStore, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getBetAmountOptions, getMatchById, placeBetsAtomic } from '../services/betmeService'
import { getCurrentUser } from '../services/authService'
import {
  areBetSlipItemsReady,
  clearBetSlip,
  getBetSlipVersion,
  getBetSlipItems,
  getBetSlipTotalAmount,
  removeBetSlipItem,
  setBetSlipAmount,
  subscribeBetSlip,
} from '../services/betSlipStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Toast } from '../shared/ui/Toast'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function PlayerBetsPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeBetSlip, getBetSlipVersion)
  const currentUser = getCurrentUser()
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  const slips = getBetSlipItems()
  const betAmounts = getBetAmountOptions()
  const totalAmount = getBetSlipTotalAmount()
  const ready = areBetSlipItemsReady()
  const invalidStatusExists = slips.some((item) => getMatchById(item.matchId)?.status !== 'open')
  const disabled =
    slips.length === 0 ||
    !ready ||
    invalidStatusExists ||
    totalAmount > currentUser.balance ||
    currentUser.role !== 'player'
  const disabledReason =
    slips.length === 0
      ? t('playerBets.reason.empty')
      : !ready
        ? t('playerBets.reason.amountMissing')
        : invalidStatusExists
          ? t('playerBets.reason.marketNotOpen')
          : totalAmount > currentUser.balance
            ? t('playerBets.reason.insufficientBalance')
            : currentUser.role !== 'player'
              ? t('playerBets.reason.onlyPlayer')
              : null

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const onConfirm = () => {
    try {
      const latest = getBetSlipItems()
      placeBetsAtomic(currentUser.id, latest)
      clearBetSlip()
      setNotice({ text: t('message.betPlaced'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.betFailed'),
        variant: 'error',
      })
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="ui-title text-[28px] font-semibold">{t('playerBets.title')}</h1>
      <p className="ui-muted text-sm">{t('playerBets.hint')}</p>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      {slips.length === 0 ? (
        <Card>
          <p className="ui-muted text-sm">{t('playerBets.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {slips.map((item) => {
            const match = getMatchById(item.matchId)
            if (!match) {
              return null
            }
            const isOpen = match.status === 'open'

            return (
              <Card key={item.matchId} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ui-title text-sm font-semibold">
                      {localizeMatchTitle(match.title, i18n.resolvedLanguage)}
                    </p>
                    <p className="ui-muted text-xs">
                      {t('playerBets.selection')} {t(`match.selection.${item.selection}`)}
                    </p>
                    <p className="ui-muted text-xs">
                      {t('playerBets.odds')}:{' '}
                      <span className="ui-number">{(item.selection === 'home_win'
                        ? match.odds.homeWin
                        : item.selection === 'draw'
                          ? match.odds.draw
                          : match.odds.awayWin
                      ).toFixed(2)}</span>
                    </p>
                    <p className="ui-muted text-xs">
                      {t('playerBets.potentialWin')}:{' '}
                      <span className="ui-number font-semibold text-[var(--success)]">{item.amount
                        ? formatMoneyU(
                            item.amount *
                              (item.selection === 'home_win'
                                ? match.odds.homeWin
                                : item.selection === 'draw'
                                  ? match.odds.draw
                                  : match.odds.awayWin),
                          )
                        : '-'}</span>
                    </p>
                    {!isOpen ? (
                      <p className="mt-1 text-xs text-[var(--danger)]">
                        {t('playerBets.lockedWarning')}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="neutral"
                    className="h-8 min-h-8 w-8 border-[color:var(--border)] p-0 text-[var(--text-muted)]"
                    onClick={() => removeBetSlipItem(item.matchId)}
                    aria-label={t('playerBets.remove')}
                  >
                    <X size={14} />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {betAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={item.amount === amount ? 'primary' : 'neutral'}
                      onClick={() => setBetSlipAmount(item.matchId, amount)}
                      disabled={!isOpen}
                      className="min-w-20"
                    >
                      {amount}U
                    </Button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="sticky bottom-20 z-20 space-y-3">
        <p className="ui-muted text-sm">
          {t('playerBets.total')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(totalAmount)}</span>
        </p>
        <p className="ui-muted text-sm">
          {t('app.balance')}: <span className="ui-number">{formatMoneyU(currentUser.balance)}</span>
        </p>
        {disabledReason ? <p className="text-xs text-[var(--danger)]">{disabledReason}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="neutral" onClick={() => clearBetSlip()} className="flex-1">
            {t('playerBets.clear')}
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} disabled={disabled} className="flex-1 text-base">
            {t('playerBets.confirm')}
          </Button>
        </div>
      </Card>
    </section>
  )
}
