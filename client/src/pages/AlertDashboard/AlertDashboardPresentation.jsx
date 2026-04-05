import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DASHBOARD_MODE } from './AlertDashboardAbstraction.js'
import AlertDashboardMap from './AlertDashboardMap.jsx'

export default function AlertDashboardPresentation({
  snapshot,
  setDashboardMode,
  onRefresh,
  onAcknowledge,
  onResolve,
  onStartSim,
  onStopSim,
  onAddRule,
}) {
  const [ruleForm, setRuleForm] = useState({
    zone_id: 'zone-north',
    metric_type: 'aqi',
    threshold: 100,
    comparator: '>',
    severity: 'warning',
    enabled: true,
  })

  const mode = snapshot.dashboardMode
  const stubNote = Object.keys(snapshot.stubFlags || {}).filter((k) => snapshot.stubFlags[k])
  const chartRows = (snapshot.metrics || []).slice(-12).map((m, i) => ({
    name: `${m.zone_id?.slice(0, 8) || 'z'}-${m.metric_type?.slice(0, 6) || 'm'}-${i}`,
    average: typeof m.average === 'number' ? m.average : Number(m.average) || 0,
  }))

  async function submitRule(e) {
    e.preventDefault()
    await onAddRule({
      zone_id: ruleForm.zone_id,
      metric_type: ruleForm.metric_type,
      threshold: Number(ruleForm.threshold),
      comparator: ruleForm.comparator,
      severity: ruleForm.severity,
      enabled: ruleForm.enabled,
    })
  }

  return (
    <section>
      <h2>Alert Dashboard</h2>
      <p>
        {/* Demo only: simulates operator/admin/public views — not enforced by the server. */}
        <strong>View (demo)</strong>: simulates what each role would see; not server RBAC.
      </p>

      <div>
        <button
          type="button"
          onClick={() => setDashboardMode(DASHBOARD_MODE.public)}
          disabled={mode === DASHBOARD_MODE.public}
        >
          Public readout
        </button>{' '}
        <button
          type="button"
          onClick={() => setDashboardMode(DASHBOARD_MODE.operator)}
          disabled={mode === DASHBOARD_MODE.operator}
        >
          City operator
        </button>{' '}
        <button
          type="button"
          onClick={() => setDashboardMode(DASHBOARD_MODE.admin)}
          disabled={mode === DASHBOARD_MODE.admin}
        >
          Administrator
        </button>{' '}
        <button type="button" onClick={onRefresh}>
          Refresh data
        </button>
      </div>

      <div>
        <h3>Simulation</h3>
        <button type="button" onClick={onStartSim}>
          Start simulation
        </button>{' '}
        <button type="button" onClick={onStopSim}>
          Stop simulation
        </button>
      </div>

      {snapshot.loading ? <p>Loading…</p> : null}
      {snapshot.error ? <p role="alert">{snapshot.error}</p> : null}
      {stubNote.length > 0 ? (
        <p>Stub fallback for: {stubNote.join(', ')}</p>
      ) : null}
      {snapshot.lastUpdatedAt ? (
        <p>
          System health (stub): last data refresh{' '}
          {new Date(snapshot.lastUpdatedAt).toLocaleString()}
        </p>
      ) : null}

      {mode === DASHBOARD_MODE.public && (
        <div>
          <h3>Public metrics (read-only)</h3>
          <pre>{JSON.stringify(snapshot.metrics, null, 2)}</pre>
          <h3>Active alerts</h3>
          <pre>{JSON.stringify(snapshot.alerts, null, 2)}</pre>
        </div>
      )}

      {mode === DASHBOARD_MODE.operator && (
        <div>
          <h3>Alerts</h3>
          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Zone</th>
                <th>Metric</th>
                <th>Value</th>
                <th>Threshold</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot.alerts || []).map((a) => (
                <tr key={a.alert_id}>
                  <td>{a.alert_id}</td>
                  <td>{a.zone_id}</td>
                  <td>{a.metric_type}</td>
                  <td>{a.current_value}</td>
                  <td>{a.threshold}</td>
                  <td>{a.severity}</td>
                  <td>{a.status}</td>
                  <td>{a.created_at}</td>
                  <td>
                    <button type="button" onClick={() => onAcknowledge(a.alert_id)}>
                      Ack
                    </button>{' '}
                    <button type="button" onClick={() => onResolve(a.alert_id)}>
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Metrics chart (recent aggregates)</h3>
          {chartRows.length === 0 ? (
            <p>No metrics yet.</p>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3>Map (GTA)</h3>
          <AlertDashboardMap alerts={snapshot.alerts || []} />
        </div>
      )}

      {mode === DASHBOARD_MODE.admin && (
        <div>
          <h3>Alert rules</h3>
          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Zone</th>
                <th>Metric</th>
                <th>Threshold</th>
                <th>Compare</th>
                <th>Severity</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot.rules || []).map((r) => (
                <tr key={r.rule_id}>
                  <td>{r.rule_id}</td>
                  <td>{r.zone_id}</td>
                  <td>{r.metric_type}</td>
                  <td>{r.threshold}</td>
                  <td>{r.comparator}</td>
                  <td>{r.severity}</td>
                  <td>{r.enabled ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>Add rule</h4>
          <form onSubmit={submitRule}>
            <label>
              zone_id{' '}
              <input
                value={ruleForm.zone_id}
                onChange={(e) => setRuleForm({ ...ruleForm, zone_id: e.target.value })}
              />
            </label>{' '}
            <label>
              metric_type{' '}
              <input
                value={ruleForm.metric_type}
                onChange={(e) => setRuleForm({ ...ruleForm, metric_type: e.target.value })}
              />
            </label>{' '}
            <label>
              threshold{' '}
              <input
                type="number"
                value={ruleForm.threshold}
                onChange={(e) => setRuleForm({ ...ruleForm, threshold: e.target.value })}
              />
            </label>{' '}
            <label>
              comparator{' '}
              <select
                value={ruleForm.comparator}
                onChange={(e) => setRuleForm({ ...ruleForm, comparator: e.target.value })}
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
            </label>{' '}
            <label>
              severity{' '}
              <select
                value={ruleForm.severity}
                onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
              >
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>
            </label>{' '}
            <label>
              <input
                type="checkbox"
                checked={ruleForm.enabled}
                onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.checked })}
              />{' '}
              enabled
            </label>{' '}
            <button type="submit">Add rule</button>
          </form>

          <h3>Audit log</h3>
          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot.audit || []).map((row, i) => (
                <tr key={i}>
                  <td>{row.timestamp}</td>
                  <td>{row.event_type}</td>
                  <td>{row.actor}</td>
                  <td>{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Advisories</h3>
          <pre>{JSON.stringify(snapshot.advisories, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
