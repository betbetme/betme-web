import { useTranslation } from 'react-i18next'
import { SelectInput } from '../ui/Field'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      {t('language.label')}
      <SelectInput
        value={i18n.resolvedLanguage}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value)
        }}
        className="py-1.5"
      >
        <option value="zh-TW">{t('language.zhTW')}</option>
        <option value="en">{t('language.en')}</option>
      </SelectInput>
    </label>
  )
}
