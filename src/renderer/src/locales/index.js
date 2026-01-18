import { createI18n } from 'vue-i18n'
import pl from './pl.json'
import en from './en.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'pl',
  fallbackLocale: 'pl',
  messages: {
    pl,
    en
  },
  missingWarn: false,
  fallbackWarn: false
})

export default i18n
