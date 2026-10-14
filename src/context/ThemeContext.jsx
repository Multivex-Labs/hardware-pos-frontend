import { createContext, useContext, useState, useLayoutEffect, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — Multivex POS
// Keys za zamani (bg, surface, surface2, surface3, border, borderLight, text,
// textMuted, textSubtle, inputBg, tableHead, shadow, shadowLg) zimebaki → pages
// zote zilizopo zinafuata theme bila edit.
// Rangi zina maana: green = sawa/imelipwa, orange = tahadhari, red = hatari/futa.
// Rangi KUU (brand) inabadilika kwa theme: charcoal / burgundy / teal.
// ─────────────────────────────────────────────────────────────

const lightBase = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surface2: '#F9FAFB',
  surface3: '#F2F4F7',
  border: '#E4E7EC',
  borderLight: '#EAECF0',
  inputBg: '#FFFFFF',
  tableHead: '#F9FAFB',
  text: '#1D2939',
  textMuted: '#667085',
  textSubtle: '#98A2B3',
  success: '#15803D',
  successSoft: '#E8F5EC',
  warning: '#B45309',
  warningSoft: '#FEF4E6',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  shadow: '0 1px 2px rgba(16,24,40,0.05)',
  shadowLg: '0 4px 12px rgba(16,24,40,0.10)',
}

const darkBase = {
  bg: '#0F1419',
  surface: '#161B22',
  surface2: '#1B2129',
  surface3: '#212830',
  border: '#2D343D',
  borderLight: '#252C34',
  inputBg: '#1B2129',
  tableHead: '#1B2129',
  text: '#D5DDE5',
  textMuted: '#8B96A3',
  textSubtle: '#5F6B78',
  success: '#3FB06A',
  successSoft: '#14301F',
  warning: '#D99A3D',
  warningSoft: '#33260F',
  danger: '#EF6A5E',
  dangerSoft: '#3A1A17',
  shadow: '0 1px 2px rgba(0,0,0,0.3)',
  shadowLg: '0 4px 12px rgba(0,0,0,0.45)',
}

// Brand themes — kila moja ina light na dark. Tenant mpya = ongeza entry hapa tu.
export const brands = {
  charcoal: {
    label: 'Charcoal',
    light: { primary: '#2D3139', primaryHover: '#15181D', primarySoft: '#E6E9ED', onPrimary: '#FFFFFF', glow1: '#8B9BB4', glow2: '#C8B79E' },
    dark:  { primary: '#E6EAEE', primaryHover: '#FFFFFF', primarySoft: '#262C34', onPrimary: '#14181D', glow1: '#4B5E7C', glow2: '#6E5C48' },
  },
  burgundy: {
    label: 'Burgundy',
    light: { primary: '#7F1D3A', primaryHover: '#651631', primarySoft: '#F8ECEF', onPrimary: '#FFFFFF', glow1: '#C25A7E', glow2: '#E3A867' },
    dark:  { primary: '#B03A61', primaryHover: '#C4507A', primarySoft: '#3A1B27', onPrimary: '#FFFFFF', glow1: '#8E2F52', glow2: '#9A6A33' },
  },
  teal: {
    label: 'Deep teal',
    light: { primary: '#0F766E', primaryHover: '#0B5F58', primarySoft: '#E6F4F2', onPrimary: '#FFFFFF', glow1: '#2FA79B', glow2: '#6FA8DC' },
    dark:  { primary: '#1F8F85', primaryHover: '#2BA89C', primarySoft: '#12302D', onPrimary: '#FFFFFF', glow1: '#1B7068', glow2: '#3D6C99' },
  },
}

const buildColors = (isDark, brand) => ({
  ...(isDark ? darkBase : lightBase),
  ...brands[brand][isDark ? 'dark' : 'light'],
})

// Zinabaki exported kwa compatibility (charcoal default)
export const lightColors = buildColors(false, 'charcoal')
export const darkColors = buildColors(true, 'charcoal')

// surface2 → --surface-2, textMuted → --text-muted, shadowLg → --shadow-lg
const toCssVar = (key) => '--' + key.replace(/([A-Z0-9])/g, (m) => '-' + m.toLowerCase())

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('pos-theme') === 'dark')
  const [brand, setBrandState] = useState(() => {
    const saved = localStorage.getItem('pos-brand')
    return brands[saved] ? saved : 'charcoal'
  })

  const colors = useMemo(() => buildColors(isDark, brand), [isDark, brand])

  const brandOptions = useMemo(
    () => Object.entries(brands).map(([id, b]) => ({ id, label: b.label, swatch: b.light.primary })),
    []
  )

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('pos-theme', next ? 'dark' : 'light')
  }

  const setBrand = (id) => {
    if (!brands[id]) return
    setBrandState(id)
    localStorage.setItem('pos-brand', id)
  }

  // useLayoutEffect = vars zinawekwa kabla ya paint → hakuna flash ya rangi nyingine
  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    root.setAttribute('data-brand', brand)
    Object.entries(colors).forEach(([key, value]) => root.style.setProperty(toCssVar(key), value))
  }, [isDark, brand, colors])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, brand, setBrand, brandOptions }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
