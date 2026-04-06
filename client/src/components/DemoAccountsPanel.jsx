export default function DemoAccountsPanel({ id = 'demo-accounts' }) {
  return (
    <aside className="demo-accounts-card" aria-labelledby={`${id}-title`}>
      <p id={`${id}-title`} className="demo-accounts-card__label">
        Demo accounts
      </p>
      <p className="demo-accounts-card__hint">For demos and marking — copy into the form.</p>
      <ul className="demo-accounts-list">
        <li>
          <span className="demo-accounts-list__role">Admin</span>
          <div>
            <code>admin@scemas.local</code>
            <span className="demo-accounts-list__sep">·</span>
            <code>Admin123!</code>
          </div>
        </li>
        <li>
          <span className="demo-accounts-list__role">Operator</span>
          <div>
            <code>operator@scemas.local</code>
            <span className="demo-accounts-list__sep">·</span>
            <code>Operator123!</code>
          </div>
        </li>
      </ul>
    </aside>
  )
}
