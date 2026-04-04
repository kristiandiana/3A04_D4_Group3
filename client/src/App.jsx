import { useState } from 'react'
import AlertDashboardController from './pages/AlertDashboard/AlertDashboardController.jsx'
import LoginController from './pages/Login/LoginController.jsx'
import SignupController from './pages/Signup/SignupController.jsx'
import ProfilePresentation from './pages/ProfilePresentation.jsx'

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
  login: 'login',
  signup: 'signup',
  profile: 'profile',
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [activePage, setActivePage] = useState(PAGE.home)

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
          </>
        )
      case PAGE.alerts:
        return <AlertDashboardController />
      case PAGE.login:
        return <LoginController
          onLoginSuccess = {() => {
            console.log("displaying page after login success");
            setActivePage(PAGE.alerts);
            setIsAuthenticated(true);
          }}
          onGoToSignup = {() => {
            setActivePage(PAGE.signup);
          }}
        />
      case PAGE.signup:
        return <SignupController
          onSignupSuccess = {() => {
            console.log("displaying page after signup success");
            setActivePage(PAGE.alerts);
            setIsAuthenticated(true);
          }}
          onGoToLogin = {() => {
            setActivePage(PAGE.login);
          }}
        />
      case PAGE.profile:
        return <ProfilePresentation/>
      
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
          <button type="button" onClick={() => setActivePage(PAGE.alerts)}>
            Alert Dashboard
          </button>
          {isAuthenticated && (
            <div>
              <button type="button" onClick={() => setActivePage(PAGE.profile)}>
              Profile
              </button>
              <button type="button" onClick={() => { 
                setIsAuthenticated(false)
                setActivePage(PAGE.login)
              }}>
                Sign out
              </button>
            </div>
          )}
          {!isAuthenticated && (
            <button type="button" onClick={() => { 
              setIsAuthenticated(false)
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
