/*
SignupPresentation.jsx

Contains the UI for the signup page.
*/

import SupportPresentation from '../SupportPresentation.jsx'
import DemoAccountsPanel from '../../components/DemoAccountsPanel.jsx'

export default function SignupPresentation({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  handleSignup,
  error,
  onGoToLogin,
}) {
  return (
    <section className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-layout">
          <div className="auth-card">
            <p className="eyebrow">SCEMAS</p>
            <h2 className="auth-card__title">Create an account</h2>
            <p className="auth-card__lede muted-copy">Sign up to use advisory submission and public display.</p>

            <form className="auth-form" onSubmit={handleSignup}>
              <label className="auth-field">
                <span className="auth-field__label">Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button type="submit" className="action-button auth-form__submit">
                Sign up
              </button>
            </form>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="button" className="auth-link-button" onClick={onGoToLogin}>
              Already have an account? Log in
            </button>
          </div>

          <DemoAccountsPanel id="signup-demo" />
        </div>
      </div>

      <div className="auth-footer">
        <SupportPresentation />
      </div>
    </section>
  )
}
