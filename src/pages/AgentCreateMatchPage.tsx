import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  activatePlatformMarket,
  getVisibleMatches,
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
  const nowMs = Date.now()
  const expiredTemplateIds = new Set(
    templates
      .filter((item) => new Date(item.matchInfo.startTime).getTime() <= nowMs)
      .map((item) => item.id),
  )
  const activatedTemplateIds = new Set(
    getVisibleMatches(currentUser.id)
      .filter((item) => ['draft', 'open', 'locked'].includes(item.status))
      .map((item) => item.templateId),
  )
  const selectableTemplates = templates.filter(
    (item) => !activatedTemplateIds.has(item.id) && !expiredTemplateIds.has(item.id),
  )
  const [notice, setNotice] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)
  const [templateId, setTemplateId] = useState(selectableTemplates[0]?.id ?? '')

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId),
    [templates, templateId],
  )
  const templateBlocked = selectedTemplate
    ? activatedTemplateIds.has(selectedTemplate.id) || expiredTemplateIds.has(selectedTemplate.id)
    : false
  const teamName = (value: string) => localizeTeamName(value, i18n.resolvedLanguage)

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!selectableTemplates.some((item) => item.id === templateId)) {
      setTemplateId(selectableTemplates[0]?.id ?? '')
    }
  }, [selectableTemplates, templateId])

  const createAction = () => {
    if (!templateId) {
      setNotice({ text: t('agentCreateForm.requiredMatch'), variant: 'error' })
      return
    }
    if (templateBlocked) {
      setNotice({
        text: selectedTemplate && expiredTemplateIds.has(selectedTemplate.id)
          ? t('agentCreateForm.expiredTemplateWarning')
          : t('agentCreateForm.alreadyActivated'),
        variant: 'error',
      })
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
    <section className="space-y-5">
      <h1 className="ui-title text-[28px] font-semibold">{t('agentCreateForm.title')}</h1>
      {notice ? <Toast variant={notice.variant}>{notice.text}</Toast> : null}

      <Card className="space-y-3">
        <label className="space-y-1">
          <span className="ui-muted text-xs">{t('agentCreateForm.match')}</span>
          <SelectInput value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={activatedTemplateIds.has(item.id) || expiredTemplateIds.has(item.id)}
              >
                {teamName(item.matchInfo.homeTeam)} vs {teamName(item.matchInfo.awayTeam)}
                {activatedTemplateIds.has(item.id) ? ` ${t('agentCreateForm.activatedLabel')}` : ''}
                {expiredTemplateIds.has(item.id) ? ` ${t('agentCreateForm.expiredLabel')}` : ''}
              </option>
            ))}
          </SelectInput>
          {selectableTemplates.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--danger)]">{t('agentCreateForm.noTemplateAvailable')}</p>
          ) : null}
          {selectedTemplate && expiredTemplateIds.has(selectedTemplate.id) ? (
            <p className="mt-1 text-xs text-[var(--danger)]">{t('agentCreateForm.expiredTemplateWarning')}</p>
          ) : null}
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
              {t('agentCreateForm.feeSplitMode')}: <span className="ui-number">{selectedTemplate.feeSplitMode}</span>
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.feeRate')}: <span className="ui-number">{(selectedTemplate.feeRate * 100).toFixed(2)}%</span>
            </p>
            <p className="ui-muted text-xs">
              {t('agentCreateForm.poolRequirement')}: <span className="ui-number font-semibold text-[var(--danger)]">{formatMoneyU(selectedTemplate.poolRequirement)}</span>
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
        <Button type="button" variant="neutral" onClick={() => navigate('/matches')} className="flex-1">
          {t('agentCreateForm.backHome')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={createAction}
          disabled={!selectedTemplate || templateBlocked}
          className="flex-1 text-base"
        >
          {t('agentCreateForm.submit')}
        </Button>
      </div>
    </section>
  )
}
