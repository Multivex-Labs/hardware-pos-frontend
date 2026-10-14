import { useLanguage } from '../context/LanguageContext'
import { Sun, Moon, Check } from 'lucide-react'
import { useTheme, brands } from '../context/ThemeContext'

// Drop-in kwa Settings page (tab ya "Appearance" / "Theme").
// Mfano:  import ThemeSettings from '../components/ThemeSettings'  →  <ThemeSettings />
// Inabadilisha rangi kuu (brand) na Light/Dark. Chaguo linahifadhiwa kwenye browser hii.
const ThemeSettings = () => {
  const { t } = useLanguage()
  const { isDark, toggleTheme, brand, setBrand, brandOptions, colors } = useTheme()
  const { language, setLanguage, languages } = useLanguage()

  const modeBtn = (active) => (active ? 'btn-primary' : 'btn')

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '2px' }}>{t('theme.brandColor')}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {t('theme.brandDesc')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {brandOptions.map(b => {
            const active = brand === b.id
            const c = brands[b.id][isDark ? 'dark' : 'light']
            return (
              <button
                key={b.id}
                className="lift"
                onClick={() => setBrand(b.id)}
                aria-pressed={active}
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: '12px', borderRadius: '8px',
                  background: 'var(--surface)', color: 'var(--text)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{b.label}</span>
                  {active && <Check size={16} strokeWidth={2} color={colors.primary} />}
                </div>
                {/* Preview ndogo: kitufe + menu active + badge */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ background: c.primary, color: c.onPrimary, fontSize: '11px', fontWeight: '500', padding: '4px 10px', borderRadius: '6px' }}>{t('theme.button')}</span>
                  <span style={{ background: c.primarySoft, color: c.primary, fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '6px' }}>{t('theme.active')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="card-title" style={{ marginBottom: '2px' }}>{t('theme.appearance')}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {t('theme.appearanceDesc')}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={modeBtn(!isDark)} onClick={() => isDark && toggleTheme()}><Sun size={16} strokeWidth={1.75} /> {t('theme.light')}</button>
          <button className={modeBtn(isDark)} onClick={() => !isDark && toggleTheme()}><Moon size={16} strokeWidth={1.75} /> {t('theme.dark')}</button>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '2px' }}>{t('theme.language')}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{t('theme.languageDesc')}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {languages.map(l => (
            <button key={l.code} className={language === l.code ? 'btn-primary' : 'btn'} onClick={() => setLanguage(l.code)} aria-pressed={language === l.code}>{l.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ThemeSettings
