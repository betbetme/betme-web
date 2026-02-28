import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  activatePlatformMarket,
  getPlatformMarkets,
} from '../services/betmeService'
import { getCurrentUser } from '../services/authService'
import { getStoreVersion, subscribeStore } from '../services/dataStore'
import { Card } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { SelectInput } from '../shared/ui/Field'
import { Toast } from '../shared/ui/Toast'
import { formatMoneyU } from '../shared/formatters/money'
import { localizeTeamName } from '../shared/i18n/teamNames'

export function AgentCreateMatchPage() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeStore, getStoreVersion)
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const templates = getPlatformMarkets().filter((item) => item.status === 'template')
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId),
    [templates, templateId],
  )
  const teamName = (value: string) => localizeTeamName(value, i18n.resolvedLanguage)

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reset = () => {
    setTemplateId(templates[0]?.id ?? '')
    setNotice(null)
  }

  const createAction = () => {
    if (!templateId) {
      setNotice({ text: t('agentCreateForm.requiredMatch'), variant: 'error' })
      return
    }
    try {
      const match = activatePlatformMarket(currentUser.id, templateId)
      navigate(`/agent/create/success/${match.id}`)
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t('message.createFailed'),
        variant: 'error',
      })
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="ui-title text-2xl font-semibold">{t('agentCreateForm.title')}</h1>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-3">
        <label className="space-y-1">
          <span className="ui-muted text-xs">{t('agentCreateForm.match')}</span>
          <SelectInput value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {teamName(item.matchInfo.homeTeam)} vs {teamName(item.matchInfo.awayTeam)}
              </option>
            ))}
          </SelectInput>
        </label>
      </Card>

      <Card className="space-y-2">
        <p className="ui-title text-sm font-semibold">{t('agentCreateForm.preview')}</p>
        {selectedTemplate ? (
          <>
            <p className="ui-title text-sm">
              {teamName(selectedTemplate.matchInfo.homeTeam)} vs{' '}
              {teamName(selectedTemplate.matchInfo.awayTeam)}
            </p>
            <p className="ui-muted text-xs">
              {new Date(selectedTemplate.matchInfo.startTime).toLocaleString(i18n.resolvedLanguage)}
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.feeSplitMode')}: {selectedTemplate.feeSplitMode}
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.feeRate')}: {(selectedTemplate.feeRate * 100).toFixed(2)}%
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.poolRequirement')}: {formatMoneyU(selectedTemplate.poolRequirement)}
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.previewRisk', {
                value: formatMoneyU(selectedTemplate.poolRequirement),
              })}
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.riskLevel')}: {t(`risk.${selectedTemplate.riskLevel}`)}
            </p>
          </>
        ) : (
          <p className="ui-muted text-xs">{t('agentCreateForm.requiredMatch')}</p>
        )}
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="neutral" onClick={reset}>
          {t('agentCreateForm.reset')}
        </Button>
        <Button type="button" variant="primary" onClick={createAction} disabled={!selectedTemplate}>
          {t('agentCreateForm.submit')}
        </Button>
      </div>
    </section>
  )
}
