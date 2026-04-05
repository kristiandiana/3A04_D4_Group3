import { useState } from 'react'
import AlertDashboardController from './pages/AlertDashboard/AlertDashboardController.jsx'
import LoginController from './pages/Login/LoginController.jsx'
import SignupController from './pages/Signup/SignupController.jsx'
import AdvisoryController from './pages/AdvisoryForm/AdvisoryController.jsx'
import ProfilePresentation from './pages/ProfilePresentation.jsx'
import PublicDisplayController from './pages/PublicDisplay/PublicDisplayController.jsx'
import { clearSession, loadSession, saveSession } from './lib/auth.js'

// Teammates: add a page
// 1. Create src/pages/YourPage/YourPageController.jsx (and siblings).
// 2. import YourPageController from './pages/YourPage/YourPageController.jsx'
// 3. Add a nav button: setActivePage('yourPage')
// 4. Add a case in renderActivePage() for 'yourPage' → <YourPageController />
//
// Optional later: Vite import.meta.glob() can bulk-import at build time (avoid */ in block comments).
// https://vite.dev/guide/features.html#glob-import
// You still map folder → label and which file is the entry controller.

const PAGE = {
  home: 'home',
  alerts: 'alerts',
  advisory: 'advisory',
  login: 'login',
  signup: 'signup',
  profile: 'profile',
  publicDisplay: 'publicDisplay',
}

function App() {
  const [session, setSession] = useState(loadSession)
  const [activePage, setActivePage] = useState(PAGE.home)
  const currentUser = session?.user ?? null
  const isAuthenticated = Boolean(currentUser)
  const canUseOperatorPages = currentUser && ['operator', 'admin'].includes(currentUser.role)

  function renderActivePage(activePage) {
    switch (activePage) {
      case PAGE.home:
        return (
          <>
            <p>SFWRENG 3A04 Deliverable 4</p>
            <ul>
              <li>Angad Chhabra</li>
              <li>Jerry Jing</li>
              <li>Danyal Yousuf</li>
              <li>Kristian Diana</li>
            </ul>
            <p>Default admin: <code>admin@scemas.local</code> / <code>Admin123!</code></p>
            <p>Default operator: <code>operator@scemas.local</code> / <code>Operator123!</code></p>
          </>
        )
      case PAGE.alerts:
        return canUseOperatorPages ? (
          <AlertDashboardController />
        ) : (
          <p>Operator login required to view the alert dashboard.</p>
        )
      case PAGE.advisory:
        return <AdvisoryController />
      case PAGE.login:
        return <LoginController
          onLoginSuccess = {(nextSession) => {
            saveSession(nextSession)
            setSession(nextSession)
            setActivePage(PAGE.alerts);
          }}
          onGoToSignup = {() => {
            setActivePage(PAGE.signup);
          }}
        />
      case PAGE.signup:
        return <SignupController
          onSignupSuccess = {(nextSession) => {
            saveSession(nextSession)
            setSession(nextSession)
            setActivePage(PAGE.alerts);
          }}
          onGoToLogin = {() => {
            setActivePage(PAGE.login);
          }}
        />
      case PAGE.profile:
        return <ProfilePresentation user={currentUser} />
      case PAGE.publicDisplay:
        return <PublicDisplayController />
      
      default:
        return null
    }
  }

  // if (!isAuthenticated) {
  //   return (
  //     <main>
  //       <p>Login / Sign up (placeholder)</p>
  //       <button type="button" onClick={() => setIsAuthenticated(true)}>
  //         Sign in (demo)
  //       </button>
  //     </main>
  //   )
  // }

  return (
    <>
      <header>
        <nav>
          <button type="button" onClick={() => setActivePage(PAGE.home)}>
            Home
          </button>
          {canUseOperatorPages && (
            <button type="button" onClick={() => setActivePage(PAGE.alerts)}>
              Alert Dashboard
            </button>
          )}
          <button type="button" onClick={() => setActivePage(PAGE.advisory)}>
            Submit Advisory Form
          </button>
          <button type="button" onClick={() => setActivePage(PAGE.publicDisplay)}>
            Public Display
          </button>
          {isAuthenticated && (
            <div>
              <button type="button" onClick={() => setActivePage(PAGE.profile)}>
              Profile
              </button>
              <button type="button" onClick={() => { 
                clearSession()
                setSession(null)
                setActivePage(PAGE.login)
              }}>
                Sign out
              </button>
            </div>
          )}
          {!isAuthenticated && (
            <button type="button" onClick={() => { 
              setActivePage(PAGE.login)
            }}>
              Log In
            </button>
          )}
        </nav>
      </header>
      <main>{renderActivePage(activePage)}</main>
    </>
  )
}

export default App
