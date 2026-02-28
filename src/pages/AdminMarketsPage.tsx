import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
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
    <section className="space-y-4">
      <h1 className="ui-title text-2xl font-semibold">{t('admin.marketsTitle')}</h1>
      <p className="ui-muted text-sm">{t('admin.marketsHint')}</p>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-2">
        <p className="ui-title text-sm font-semibold">{t('admin.platformStats')}</p>
        <p className="ui-muted text-xs">{t('admin.totalBet')}: {stats.totalBetAmount.toFixed(2)}U</p>
        <p className="ui-muted text-xs">
          {t('admin.platformFeeIncome')}: {stats.platformFeeIncome.toFixed(2)}U
        </p>
        <p className="ui-muted text-xs">{t('admin.playerCount')}: {stats.playerCount}</p>
      </Card>

      <Card className="space-y-3">
        <p className="ui-title text-sm font-semibold">{t('admin.createTemplate')}</p>
        <select
          className="ui-input"
          value={preMatchInfoId}
          onChange={(event) => setPreMatchInfoId(event.target.value)}
        >
          {preMatches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.homeTeam} vs {item.awayTeam}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="ui-input"
            value={feeSplitMode}
            onChange={(event) => setFeeSplitMode(event.target.value as '55' | '46' | '37')}
          >
            <option value="55">55</option>
            <option value="46">46</option>
            <option value="37">37</option>
          </select>
          <select
            className="ui-input"
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <select
            className="ui-input"
            value={String(poolRequirement)}
            onChange={(event) => setPoolRequirement(Number(event.target.value) as 500 | 1000 | 2000)}
          >
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="2000">2000</option>
          </select>
          <select
            className="ui-input"
            value={String(feeRate)}
            onChange={(event) => setFeeRate(Number(event.target.value) as 2 | 4 | 6)}
          >
            <option value="2">2%</option>
            <option value="4">4%</option>
            <option value="6">6%</option>
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
        <div className="flex gap-2">
          {(['created', 'activated', 'settled'] as const).map((tab) => (
            <Button
              key={tab}
              type="button"
              variant={templateTab === tab ? 'primary' : 'neutral'}
              onClick={() => setTemplateTab(tab)}
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
                  <div key={item.id} className="rounded-lg border border-slate-700 p-2">
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
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        disabled={isActivated}
                        onClick={() => removeTemplateAction(item.id)}
                      >
                        {t('admin.removeTemplate')}
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
                <div key={item.match.id} className="rounded-lg border border-slate-700 p-2">
                  <p className="ui-title text-sm">{displayTitle(item.match.title)}</p>
                  <p className="ui-muted text-xs">
                    {new Date(item.match.startTime).toLocaleString(i18n.resolvedLanguage)}
                  </p>
                  <p className="ui-muted text-xs">
                    {t('admin.platformFeeIncome')}: {item.platformFeeIncome.toFixed(2)}U
                  </p>
                  <p className="ui-muted text-xs">
                    {t('admin.settledCount')}: {item.settledCount}
                  </p>
                </div>
              ))
            : null}
        </div>
      </Card>
      {templateTab === 'activated' ? (
        <Card className="sticky bottom-20 z-20 border-blue-500/30">
          <div className="flex items-center justify-between gap-3">
            <p className="ui-muted text-sm">{t('admin.selectedCount', { count: selectedCount })}</p>
            <Button
              type="button"
              variant="success"
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
