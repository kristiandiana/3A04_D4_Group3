import DemoAccountsPanel from '../components/DemoAccountsPanel.jsx'

export default function ProfilePresentation({ user, onSignOut }) {
  if (!user) {
    return <p className="auth-gate-msg">No active session.</p>
  }

  return (
    <section className="page-shell profile-page">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>{user.name}</h2>
          <p className="muted-copy">{user.email}</p>
        </div>
        <span className="status-pill status-live">{user.role}</span>
      </div>

      <div className="profile-info-card">
        <h3 className="profile-info-card__title">SFWRENG 3A04 — Deliverable 4</h3>
        <ul className="profile-team-list">
          <li>Angad Chhabra</li>
          <li>Jerry Jing</li>
          <li>Danyal Yousuf</li>
          <li>Kristian Diana</li>
        </ul>
      </div>

      <div className="profile-demo-wrap">
        <DemoAccountsPanel id="profile-demo" />
      </div>

      <div className="profile-actions">
        <button type="button" className="secondary-button profile-sign-out" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </section>
  )
}
