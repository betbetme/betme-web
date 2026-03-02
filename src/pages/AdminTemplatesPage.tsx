import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  createPlatformMarket,
  getAdminActivatedMarkets,
  getAdminCreatedTemplates,
  getPreMatchInfos,
  removePlatformMarket,
} from '../services/betmeService'
import { getCurrentUser } from '../services/authService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Toast } from '../shared/ui/Toast'
import { localizeMatchTitle } from '../shared/i18n/teamNames'

export function AdminTemplatesPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const currentUser = getCurrentUser()
  const preMatches = getPreMatchInfos()
  const nowMs = Date.now()
  const expiredPreMatchIds = new Set(
    preMatches
      .filter((item) => new Date(item.startTime).getTime() <= nowMs)
      .map((item) => item.id),
  )
  const selectablePreMatches = preMatches.filter((item) => !expiredPreMatchIds.has(item.id))
  const [preMatchInfoId, setPreMatchInfoId] = useState(selectablePreMatches[0]?.id ?? '')
  const [feeSplitMode, setFeeSplitMode] = useState<'55' | '46' | '37'>('55')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [poolRequirement, setPoolRequirement] = useState<500 | 1000 | 2000>(500)
  const [feeRate, setFeeRate] = useState<2 | 4 | 6>(2)
  const createdTemplates = getAdminCreatedTemplates()
  const activatedMarkets = getAdminActivatedMarkets()
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)
  const displayTitle = (title: string) => localizeMatchTitle(title, i18n.resolvedLanguage)

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!selectablePreMatches.some((item) => item.id === preMatchInfoId)) {
      setPreMatchInfoId(selectablePreMatches[0]?.id ?? '')
    }
  }, [preMatchInfoId, selectablePreMatches])

  const createTemplateAction = () => {
    const selectedPreMatch = preMatches.find((item) => item.id === preMatchInfoId)
    if (!selectedPreMatch || expiredPreMatchIds.has(selectedPreMatch.id)) {
      setNotice({ text: t('admin.templateExpiredWarning'), variant: 'error' })
      return
    }
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

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="ui-title text-[28px] font-semibold">{t('admin.templatesTitle')}</h1>
        <Link to="/admin/markets">
          <Button type="button" variant="neutral">
            {t('admin.backHome')}
          </Button>
        </Link>
      </div>
      <p className="ui-muted text-sm">{t('admin.templatesHint')}</p>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-4">
        <p className="ui-title text-sm font-semibold">{t('admin.createTemplate')}</p>
        <select
          className="ui-input"
          value={preMatchInfoId}
          onChange={(event) => setPreMatchInfoId(event.target.value)}
        >
          {preMatches.map((item) => (
            <option key={item.id} value={item.id} disabled={expiredPreMatchIds.has(item.id)}>
              {displayTitle(`${item.homeTeam} vs ${item.awayTeam}`)}
              {expiredPreMatchIds.has(item.id) ? ` ${t('admin.templateExpiredOption')}` : ''}
            </option>
          ))}
        </select>
        {preMatchInfoId && expiredPreMatchIds.has(preMatchInfoId) ? (
          <p className="text-xs text-[var(--danger)]">{t('admin.templateExpiredWarning')}</p>
        ) : null}
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
          disabled={!preMatchInfoId || expiredPreMatchIds.has(preMatchInfoId)}
          className="w-full py-3 text-base font-semibold"
        >
          {t('admin.createTemplateButton')}
        </Button>
      </Card>

      <Card className="space-y-2">
        <p className="ui-title text-sm font-semibold">{t('admin.templateTabs.created')}</p>
        {createdTemplates.length === 0 ? (
          <p className="ui-muted text-sm">{t('admin.emptyTemplates')}</p>
        ) : (
          createdTemplates.map((item) => {
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
        )}
      </Card>
    </section>
  )
}
