import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

const LANGUAGE_KEY = 'betme.language'
const fallbackLng = 'zh-TW'

function detectLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY)
  if (saved === 'zh-TW' || saved === 'en') {
    return saved
  }
  return fallbackLng
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng,
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem(LANGUAGE_KEY, language)
})

export default i18n
