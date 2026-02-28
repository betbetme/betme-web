import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import {
  createPlatformMarket,
  getAdminActivatedMarkets,
  getAdminPlatformStats,
  getAdminCreatedTemplates,
  getAdminSettledMarketRecords,
  getLockedMatchesForAdmin,
  getPreMatchInfos,
  removePlatformMarket,
  resolveMarketsByAdmin,
} from '../services/betmeService'
import { getCurrentUser } from '../services/authService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Toast } from '../shared/ui/Toast'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeMatchTitle } from '../shared/i18n/teamNames'
import type { MatchResult } from '../types/domain'

export function AdminMarketsPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const [selections, setSelections] = useState<Record<string, MatchResult | undefined>>({})
  const [templateTab, setTemplateTab] = useState<'created' | 'activated' | 'settled'>('created')
  const preMatches = getPreMatchInfos()
  const [preMatchInfoId, setPreMatchInfoId] = useState(preMatches[0]?.id ?? '')
  const [feeSplitMode, setFeeSplitMode] = useState<'55' | '46' | '37'>('55')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [poolRequirement, setPoolRequirement] = useState<500 | 1000 | 2000>(500)
  const [feeRate, setFeeRate] = useState<2 | 4 | 6>(2)
  const stats = getAdminPlatformStats()
  const createdTemplates = getAdminCreatedTemplates()
  const activatedMarkets = getAdminActivatedMarkets()
  const settledRecords = getAdminSettledMarketRecords()
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  const lockedMatches = getLockedMatchesForAdmin()
  const selectedCount = Object.values(selections).filter(Boolean).length
  const displayTitle = (title: string) => localizeMatchTitle(title, i18n.resolvedLanguage)

  const createTemplateAction = () => {
    try {
      createPlatformMarket(currentUser.id, {
        preMatchInfoId,
        lockTime: 10,
        feeSplitMode,
        feeRate,
        riskLevel,
        poolRequirement,
      })
      setNotice({ text: t('admin.templateCreated'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.templateCreateFailed'),
        variant: 'error',
      })
    }
  }

  const removeTemplateAction = (templateId: string) => {
    try {
      removePlatformMarket(currentUser.id, templateId)
      setNotice({ text: t('admin.templateRemoved'), variant: 'success' })
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('admin.templateRemoveFailed'),
        variant: 'error',
      })
    }
  }

  const confirmAction = () => {
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
      <h1 className="ui-title text-[28px] font-semibold">{t('admin.marketsTitle')}</h1>
      <p className="ui-muted text-sm">{t('admin.marketsHint')}</p>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-2">
        <p className="ui-title text-sm font-semibold">{t('admin.platformStats')}</p>
        <p className="ui-muted text-xs">
          {t('admin.totalBet')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(stats.totalBetAmount)}</span>
        </p>
        <p className="ui-muted text-xs">
          {t('admin.platformFeeIncome')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(stats.platformFeeIncome)}</span>
        </p>
        <p className="ui-muted text-xs">{t('admin.playerCount')}: <span className="ui-number">{stats.playerCount}</span></p>
      </Card>

      <Card className="space-y-4">
        <p className="ui-title text-sm font-semibold">{t('admin.createTemplate')}</p>
        <select
          className="ui-input"
          value={preMatchInfoId}
          onChange={(event) => setPreMatchInfoId(event.target.value)}
        >
          {preMatches.map((item) => (
            <option key={item.id} value={item.id}>
              {displayTitle(`${item.homeTeam} vs ${item.awayTeam}`)}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="ui-input"
            value={feeSplitMode}
            onChange={(event) => setFeeSplitMode(event.target.value as '55' | '46' | '37')}
          >
            <option value="55">{t('admin.feeSplitOption', { mode: '55' })}</option>
            <option value="46">{t('admin.feeSplitOption', { mode: '46' })}</option>
            <option value="37">{t('admin.feeSplitOption', { mode: '37' })}</option>
          </select>
          <select
            className="ui-input"
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">{t('admin.riskLevelOption', { level: t('risk.low') })}</option>
            <option value="medium">{t('admin.riskLevelOption', { level: t('risk.medium') })}</option>
            <option value="high">{t('admin.riskLevelOption', { level: t('risk.high') })}</option>
          </select>
          <select
            className="ui-input"
            value={String(poolRequirement)}
            onChange={(event) => setPoolRequirement(Number(event.target.value) as 500 | 1000 | 2000)}
          >
            <option value="500">{t('admin.poolOption', { value: 500 })}</option>
            <option value="1000">{t('admin.poolOption', { value: 1000 })}</option>
            <option value="2000">{t('admin.poolOption', { value: 2000 })}</option>
          </select>
          <select
            className="ui-input"
            value={String(feeRate)}
            onChange={(event) => setFeeRate(Number(event.target.value) as 2 | 4 | 6)}
          >
            <option value="2">{t('admin.feeRateOption', { value: 2 })}</option>
            <option value="4">{t('admin.feeRateOption', { value: 4 })}</option>
            <option value="6">{t('admin.feeRateOption', { value: 6 })}</option>
          </select>
        </div>
        <Button
          type="button"
          onClick={createTemplateAction}
          variant="primary"
          className="w-full py-3 text-base font-semibold"
        >
          {t('admin.createTemplateButton')}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex gap-2 rounded-xl bg-[color:var(--surface-muted)] p-1">
          {(['created', 'activated', 'settled'] as const).map((tab) => (
            <Button
              key={tab}
              type="button"
              variant="neutral"
              onClick={() => setTemplateTab(tab)}
              className={`flex-1 border-[color:var(--border)] ${templateTab === tab ? 'text-white' : 'text-[#bdaee0]'}`}
            >
              {t(`admin.templateTabs.${tab}`)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {templateTab === 'created'
            ? createdTemplates.map((item) => {
                const isActivated = activatedMarkets.some((record) => record.match.templateId === item.id)
                return (
                  <div key={item.id} className="rounded-lg border border-[color:var(--border)] p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="ui-title text-sm">
                          {displayTitle(`${item.matchInfo.homeTeam} vs ${item.matchInfo.awayTeam}`)}
                        </p>
                        <p className="ui-muted text-xs">
                          {new Date(item.matchInfo.startTime).toLocaleString(i18n.resolvedLanguage)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="neutral"
                        className="h-8 min-h-8 w-8 border-[color:var(--border)] p-0 text-[var(--text-muted)]"
                        disabled={isActivated}
                        onClick={() => removeTemplateAction(item.id)}
                        aria-label={t('admin.removeTemplate')}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })
            : null}
          {templateTab === 'activated'
            ? lockedMatches.length === 0
              ? (
                  <Card>
                    <p className="ui-muted text-sm">{t('admin.empty')}</p>
                  </Card>
                )
              : lockedMatches.map(({ match }) => (
                  <Card key={match.id}>
                    <div className="space-y-3">
                      <div>
                        <p className="ui-title text-base font-medium">{displayTitle(match.title)}</p>
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
                ))
            : null}
          {templateTab === 'settled'
            ? settledRecords.map((item) => (
                <div key={item.match.id} className="rounded-lg border border-[color:var(--border)] p-2">
                  <p className="ui-title text-sm">{displayTitle(item.match.title)}</p>
                  <p className="ui-muted text-xs">
                    {new Date(item.match.startTime).toLocaleString(i18n.resolvedLanguage)}
                  </p>
                  <p className="ui-muted text-xs">
                    {t('admin.platformFeeIncome')}: <span className="ui-number font-semibold text-[var(--success)]">{formatMoneyU(item.platformFeeIncome)}</span>
                  </p>
                  <p className="ui-muted text-xs">
                    {t('admin.settledCount')}: <span className="ui-number">{item.settledCount}</span>
                  </p>
                </div>
              ))
            : null}
        </div>
      </Card>
      {templateTab === 'activated' ? (
        <Card className="sticky bottom-20 z-20 border-[color:#8f6bff55]">
          <div className="flex items-center justify-between gap-3">
            <p className="ui-muted text-sm">{t('admin.selectedCount', { count: selectedCount })}</p>
            <Button
              type="button"
              variant="primary"
              disabled={selectedCount === 0}
              onClick={confirmAction}
            >
              <Check size={14} className="mr-1" />
              {t('admin.confirmSettlement')}
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  )
}
