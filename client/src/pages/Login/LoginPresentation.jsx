/*
LoginPresentation.jsx

Contains the UI for the login page.
*/

import SupportPresentation from '../SupportPresentation.jsx'
import DemoAccountsPanel from '../../components/DemoAccountsPanel.jsx'

export default function LoginPresentation({
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
  error,
  onGoToSignup,
}) {
  return (
    <section className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-layout">
          <div className="auth-card">
            <p className="eyebrow">SCEMAS</p>
            <h2 className="auth-card__title">Log in</h2>
            <p className="auth-card__lede muted-copy">Use your account to access dashboards and forms.</p>

            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button type="submit" className="action-button auth-form__submit">
                Log in
              </button>
            </form>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="button" className="auth-link-button" onClick={onGoToSignup}>
              Don&apos;t have an account? Sign up
            </button>
          </div>

          <DemoAccountsPanel id="login-demo" />
        </div>
      </div>

      <div className="auth-footer">
        <SupportPresentation />
      </div>
    </section>
  )
}
