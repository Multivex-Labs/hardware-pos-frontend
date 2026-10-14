import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import en from '../i18n/en'
import appEn from '../i18n/app.en'
import appSw from '../i18n/app.sw'
// Ukishaandika src/i18n/sw.js kwa funguo za en.js (Sales, Returns, Audit Log), ongeza:
//   import sw from '../i18n/sw'   kisha   sw: deepMerge(appSw, sw)
// Hakuna component itakayohitaji kubadilika.

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

// high inashinda low kwenye funguo zinazofanana (en.js ya zamani inabaki kama ilivyo)
const deepMerge = (low, high) => {
  const out = { ...low }
  for (const k of Object.keys(high)) out[k] = isObj(out[k]) && isObj(high[k]) ? deepMerge(out[k], high[k]) : high[k]
  return out
}

const dictionaries = { en: deepMerge(appEn, en), sw: appSw }

// Majina ya lugha yanaandikwa kwa lugha yenyewe (hayatafsiriwi)
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
]

const lookup = (dict, path) => {
  let node = dict
  for (const p of path.split('.')) {
    if (node && typeof node === 'object' && p in node) node = node[p]
    else return undefined
  }
  return node
}

const LanguageContext = createContext()

const readLanguage = () => {
  const saved = localStorage.getItem('language')
  return dictionaries[saved] ? saved : 'en'
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(readLanguage)

  const setLanguage = useCallback((code) => {
    if (!dictionaries[code]) return
    setLanguageState(code)
    localStorage.setItem('language', code)
  }, [])

  useEffect(() => { document.documentElement.lang = language }, [language])

  // t('sales.cart') -> 'Cart'
  // t('dash.total', { amount: 'TSh 5,000' }) -> 'Total TSh 5,000'  (vigeu kwenye { })
  // t('sales.onlyAvailable')(5) -> function (zile za en.js za zamani zinaendelea kufanya kazi)
  // Kama neno halipo kwenye lugha iliyochaguliwa, linaanguka kwenda English, kisha path yenyewe.
  const t = useCallback((path, vars) => {
    let node = lookup(dictionaries[language], path)
    if (node === undefined) node = lookup(dictionaries.en, path)
    if (node === undefined) return path
    if (typeof node === 'string' && vars) return node.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m))
    return node
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES, availableLanguages: Object.keys(dictionaries) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
