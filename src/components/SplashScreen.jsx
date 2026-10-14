// Splash / loading screen ya kitaalamu — logo ya biashara ndani ya pete inayozunguka.
// Matumizi:  if (loading) return <SplashScreen />
// Inatumia jina na logo vilivyohifadhiwa (localStorage) na rangi ya theme iliyochaguliwa.
const SplashScreen = () => {
  const name = localStorage.getItem('businessName') || ''
  const logo = localStorage.getItem('logoUrl') || ''
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'POS'

  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-mark">
        <svg className="splash-ring" viewBox="0 0 96 96" aria-hidden="true">
          <circle className="track" cx="48" cy="48" r="44" />
          <circle className="arc" cx="48" cy="48" r="44" />
        </svg>
        <div className="splash-logo">
          {logo ? <img src={logo} alt="" /> : <span>{initials}</span>}
        </div>
      </div>
      {name && <div className="splash-name">{name}</div>}
      <div className="splash-bar" aria-hidden="true" />
      <span className="sr-only">Loading</span>
      <div className="splash-foot">Powered by Multivex Labs</div>
    </div>
  )
}

export default SplashScreen
