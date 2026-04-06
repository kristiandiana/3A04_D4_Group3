import { useEffect, useState } from 'react'
import AlertDashboardController from './pages/AlertDashboard/AlertDashboardController.jsx'
import LoginController from './pages/Login/LoginController.jsx'
import SignupController from './pages/Signup/SignupController.jsx'
import AdvisoryController from './pages/AdvisoryForm/AdvisoryController.jsx'
import ProfilePresentation from './pages/ProfilePresentation.jsx'
import PublicDisplayController from './pages/PublicDisplay/PublicDisplayController.jsx'
import { clearSession, loadSession, saveSession } from './lib/auth.js'

const PAGE = {
  alerts: 'alerts',
  advisory: 'advisory',
  login: 'login',
  signup: 'signup',
  profile: 'profile',
  publicDisplay: 'publicDisplay',
}

/** Routes that require a session (API rate limiting / auth). */
const AUTH_ONLY_PAGES = [PAGE.advisory, PAGE.publicDisplay, PAGE.alerts, PAGE.profile]

function initialPageForSession(session) {
  const user = session?.user
  if (!user) return PAGE.login
  if (['operator', 'admin'].includes(user.role)) return PAGE.alerts
  return PAGE.profile
}

function App() {
  const [session, setSession] = useState(loadSession)
  const [activePage, setActivePage] = useState(() => initialPageForSession(loadSession()))
  const currentUser = session?.user ?? null
  const isAuthenticated = Boolean(currentUser)
  const canUseOperatorPages = currentUser && ['operator', 'admin'].includes(currentUser.role)

  useEffect(() => {
    if (!isAuthenticated && AUTH_ONLY_PAGES.includes(activePage)) {
      setActivePage(PAGE.login)
    }
  }, [isAuthenticated, activePage])

  function afterAuth(nextSession) {
    saveSession(nextSession)
    setSession(nextSession)
    const user = nextSession?.user
    if (user && ['operator', 'admin'].includes(user.role)) {
      setActivePage(PAGE.alerts)
    } else {
      setActivePage(PAGE.profile)
    }
  }

  function renderActivePage(page) {
    switch (page) {
      case PAGE.alerts:
        if (!isAuthenticated) {
          return null
        }
        return canUseOperatorPages ? (
          <AlertDashboardController isAdmin={currentUser?.role === 'admin'} />
        ) : (
          <p className="auth-gate-msg">Operator or admin login required for the alert dashboard.</p>
        )
      case PAGE.advisory:
        if (!isAuthenticated) return null
        return <AdvisoryController />
      case PAGE.login:
        return (
          <LoginController
            onLoginSuccess={afterAuth}
            onGoToSignup={() => setActivePage(PAGE.signup)}
          />
        )
      case PAGE.signup:
        return (
          <SignupController
            onSignupSuccess={afterAuth}
            onGoToLogin={() => setActivePage(PAGE.login)}
          />
        )
      case PAGE.profile:
        if (!isAuthenticated) return null
        return (
          <ProfilePresentation
            user={currentUser}
            onSignOut={() => {
              clearSession()
              setSession(null)
              setActivePage(PAGE.login)
            }}
          />
        )
      case PAGE.publicDisplay:
        if (!isAuthenticated) return null
        return <PublicDisplayController />
      default:
        return null
    }
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__brand">SCEMAS</span>
          {isAuthenticated ? (
            <nav className="app-header__nav" aria-label="Main">
              {canUseOperatorPages && (
                <button
                  type="button"
                  className={activePage === PAGE.alerts ? 'nav-button--active' : ''}
                  onClick={() => setActivePage(PAGE.alerts)}
                >
                  Alert Dashboard
                </button>
              )}
              <button
                type="button"
                className={activePage === PAGE.advisory ? 'nav-button--active' : ''}
                title="Submit an advisory for review"
                onClick={() => setActivePage(PAGE.advisory)}
              >
                Advisory Form
              </button>
              <button
                type="button"
                className={activePage === PAGE.publicDisplay ? 'nav-button--active' : ''}
                onClick={() => setActivePage(PAGE.publicDisplay)}
              >
                Public Display
              </button>
              <button
                type="button"
                className={activePage === PAGE.profile ? 'nav-button--active' : ''}
                onClick={() => setActivePage(PAGE.profile)}
              >
                Profile
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="app-main">{renderActivePage(activePage)}</main>
    </div>
  )
}

export default App
