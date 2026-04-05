export default function ProfilePresentation({ user }) {
  if (!user) {
    return <p>No active session.</p>
  }

  return (
    <section className="page-shell">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Authenticated Profile</p>
          <h2>{user.name}</h2>
          <p className="muted-copy">{user.email}</p>
        </div>
        <span className="status-pill status-live">{user.role}</span>
      </div>
    </section>
  )
}
