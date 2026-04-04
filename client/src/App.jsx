import { useState } from 'react'
import AlertDashboardController from './pages/AlertDashboard/AlertDashboardController.jsx'

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
}

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
    default:
      return null
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [activePage, setActivePage] = useState(PAGE.home)

  if (!isAuthenticated) {
    return (
      <main>
        <p>Login / Sign up (placeholder)</p>
        <button type="button" onClick={() => setIsAuthenticated(true)}>
          Sign in (demo)
        </button>
      </main>
    )
  }

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
          <button type="button" onClick={() => setIsAuthenticated(false)}>
            Sign out (demo)
          </button>
        </nav>
      </header>
      <main>{renderActivePage(activePage)}</main>
    </>
  )
}

export default App
