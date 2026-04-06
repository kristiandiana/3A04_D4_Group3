import { useMemo, useState } from "react";
import AdminThresholdBar from "./AdminThresholdBar.jsx";
import OperatorAlertsMap from "./OperatorAlertsMap.jsx";

function formatZone(zoneId) {
  return zoneId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString();
}

function classifyAuditEvent(eventType) {
  const value = String(eventType || "").toUpperCase();
  if (value.startsWith("USER_")) return "User";
  if (value.startsWith("ALERT_")) return "Alert";
  if (value.startsWith("RULE_")) return "Rule";
  if (value.startsWith("ADVISORY_")) return "Advisory";
  if (value.startsWith("MQTT_")) return "System";
  return "Other";
}

function metricRowTime(row) {
  const t = row?.timestamp ? new Date(row.timestamp).getTime() : NaN;
  if (!Number.isNaN(t)) return t;
  const w = row?.window_start ? new Date(row.window_start).getTime() : NaN;
  return Number.isNaN(w) ? 0 : w;
}

function latestMetricAverage(metrics, zoneId, metricType) {
  const z = String(zoneId ?? "").trim();
  const m = String(metricType ?? "")
    .trim()
    .toLowerCase();
  const rows = (metrics || []).filter(
    (row) =>
      String(row.zone_id ?? "").trim() === z &&
      String(row.metric_type ?? "")
        .trim()
        .toLowerCase() === m,
  );
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => metricRowTime(b) - metricRowTime(a));
  const v = sorted[0]?.average;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function DashboardWorkspaceSwitch({ value, onChange }) {
  return (
    <div className="dashboard-workspace-bar">
      <span
        className="dashboard-workspace-bar__label"
        id="workspace-switch-label"
      >
        Workspace
      </span>
      <div
        className={`workspace-segmented ${value === "admin" ? "workspace-segmented--admin" : ""}`}
        role="group"
        aria-labelledby="workspace-switch-label"
      >
        <span className="workspace-segmented__thumb" aria-hidden />
        <button
          type="button"
          className={`workspace-segmented__btn ${value === "operator" ? "workspace-segmented__btn--active" : ""}`}
          onClick={() => onChange("operator")}
          aria-pressed={value === "operator"}
        >
          Operator console
        </button>
        <button
          type="button"
          className={`workspace-segmented__btn ${value === "admin" ? "workspace-segmented__btn--active" : ""}`}
          onClick={() => onChange("admin")}
          aria-pressed={value === "admin"}
        >
          Administrator console
        </button>
      </div>
    </div>
  );
}

function OperatorAlertCard({
  alert,
  actingAlertId,
  onAcknowledge,
  onResolve,
  readOnly = false,
}) {
  return (
    <article className={`alert-card severity-${alert.severity}`}>
      <div className="alert-card-header">
        <div>
          <p className="eyebrow">
            {formatZone(alert.zone_id)} · {alert.metric_type.toUpperCase()}
          </p>
          <h3>{alert.message}</h3>
        </div>
        <div className="pill-row">
          <span className={`status-pill status-${alert.status}`}>
            {alert.status}
          </span>
          <span className={`status-pill severity-${alert.severity}`}>
            {alert.severity}
          </span>
        </div>
      </div>

      <div className="alert-metadata">
        <span>Current {alert.current_value}</span>
        <span>Threshold {alert.threshold}</span>
        <span>Created {formatTimestamp(alert.created_at)}</span>
      </div>

      {!readOnly && (
        <div className="button-row">
          <button
            type="button"
            className="action-button"
            onClick={() => onAcknowledge(alert.alert_id)}
            disabled={
              alert.status !== "active" || actingAlertId === alert.alert_id
            }
          >
            {actingAlertId === alert.alert_id && alert.status === "active"
              ? "Saving…"
              : "Acknowledge"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onResolve(alert.alert_id)}
            disabled={
              alert.status === "resolved" || actingAlertId === alert.alert_id
            }
          >
            {actingAlertId === alert.alert_id && alert.status !== "resolved"
              ? "Saving…"
              : "Resolve"}
          </button>
        </div>
      )}
    </article>
  );
}

function FeedControlCluster({
  eyebrow,
  title,
  lastUpdatedAt,
  simulationRunning,
  loading,
  onSimulationToggle,
  onRefresh,
}) {
  return (
    <div className="panel-header admin-console-panel">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted-copy">
          Last refresh{" "}
          {lastUpdatedAt
            ? new Date(lastUpdatedAt).toLocaleTimeString()
            : "pending"}
        </p>
      </div>
      <div className="button-row">
        <span
          className={`status-pill ${simulationRunning ? "status-live" : "status-idle"}`}
        >
          {simulationRunning ? "Feed running" : "Feed stopped"}
        </span>
        <button
          type="button"
          className="action-button"
          onClick={() => onSimulationToggle(!simulationRunning)}
        >
          {simulationRunning ? "Stop feed" : "Start feed"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}

export default function AlertDashboardPresentation({
  title,
  isAdmin,
  rules,
  metrics,
  alerts,
  resolvedAlerts,
  auditLogs,
  mapMetrics,
  loading,
  error,
  lastUpdatedAt,
  actingAlertId,
  simulationRunning,
  simulationTransport,
  mqttStatus,
  onRefresh,
  onAcknowledge,
  onResolve,
  onSimulationToggle,
  onTransportChange,
  onAddRule,
  onDeleteRule,
}) {
  const [ruleForm, setRuleForm] = useState({
    zone_id: "zone-north",
    metric_type: "aqi",
    threshold: 100,
    comparator: ">",
    severity: "warning",
    enabled: true,
  });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleFormError, setRuleFormError] = useState("");
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  /** Admin-only: which long section is visible (reduces scrolling). */
  const [adminWorkspace, setAdminWorkspace] = useState("operator");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [auditSortOrder, setAuditSortOrder] = useState("latest");
  const [alertViewMode, setAlertViewMode] = useState("active");
  const [alertZoneFilter, setAlertZoneFilter] = useState("");
  const [alertMetricFilter, setAlertMetricFilter] = useState("");

  const showAdminWorkspace = Boolean(isAdmin && adminWorkspace === "admin");
  const showOperatorWorkspace = !isAdmin || adminWorkspace === "operator";

  const visibleAlerts =
    alertViewMode === "history" ? resolvedAlerts || [] : alerts || [];

  const zoneFilterOptions = useMemo(() => {
    const s = new Set();
    visibleAlerts.forEach((a) => s.add(a.zone_id));
    return [...s].sort();
  }, [visibleAlerts]);

  const metricFilterOptions = useMemo(() => {
    const s = new Set();
    visibleAlerts.forEach((a) => s.add(a.metric_type));
    return [...s].sort();
  }, [visibleAlerts]);

  const filteredAlerts = useMemo(() => {
    return visibleAlerts.filter((a) => {
      if (alertZoneFilter && a.zone_id !== alertZoneFilter) return false;
      if (alertMetricFilter && a.metric_type !== alertMetricFilter)
        return false;
      return true;
    });
  }, [visibleAlerts, alertZoneFilter, alertMetricFilter]);

  const criticalCount = filteredAlerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const acknowledgedCount = filteredAlerts.filter(
    (alert) => alert.status === "acknowledged",
  ).length;

  const auditTypeOptions = useMemo(() => {
    const types = new Set((auditLogs || []).map((log) => classifyAuditEvent(log.event_type)));
    return ["all", ...[...types].sort((a, b) => a.localeCompare(b))];
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const filtered = (auditLogs || []).filter((log) => {
      if (auditTypeFilter === "all") return true;
      return classifyAuditEvent(log.event_type) === auditTypeFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
      return auditSortOrder === "earliest" ? aTime - bTime : bTime - aTime;
    });

    return sorted;
  }, [auditLogs, auditTypeFilter, auditSortOrder]);

  async function submitRule(e) {
    e.preventDefault();
    setRuleFormError("");
    setRuleSaving(true);
    try {
      await onAddRule({
        zone_id: ruleForm.zone_id.trim(),
        metric_type: ruleForm.metric_type.trim().toLowerCase(),
        threshold: Number(ruleForm.threshold),
        comparator: ruleForm.comparator,
        severity: ruleForm.severity,
        enabled: ruleForm.enabled,
      });
    } catch (err) {
      setRuleFormError(err?.message || "Could not create rule");
    } finally {
      setRuleSaving(false);
    }
  }

  async function handleDeleteClick(ruleId) {
    if (!window.confirm(`Delete rule #${ruleId}? This cannot be undone.`)) {
      return;
    }
    setRuleFormError("");
    setDeletingRuleId(ruleId);
    try {
      await onDeleteRule(ruleId);
    } catch (err) {
      setRuleFormError(err?.message || "Could not delete rule");
    } finally {
      setDeletingRuleId(null);
    }
  }

  return (
    <section className="page-shell alert-dashboard-page">
      {isAdmin && (
        <div className="toolbar-card dashboard-workspace-card">
          <DashboardWorkspaceSwitch
            value={adminWorkspace}
            onChange={setAdminWorkspace}
          />
          <p className="muted-copy dashboard-workspace-card__hint">
            Switch views — feed and data stay in sync; only the layout changes.
          </p>
        </div>
      )}

      {error ? <p className="error-banner">{error}</p> : null}

      {showAdminWorkspace && (
        <FeedControlCluster
          eyebrow="Administrator console"
          title="System feed & refresh"
          lastUpdatedAt={lastUpdatedAt}
          simulationRunning={simulationRunning}
          loading={loading}
          onSimulationToggle={onSimulationToggle}
          onRefresh={onRefresh}
        />
      )}

      {showAdminWorkspace && (
        <div className="toolbar-card admin-rules-card">
          <div className="admin-rules-card__header">
            <h3 className="admin-rules-card__heading">Alert rules</h3>
            <p className="muted-copy admin-rules-card__sub">
              Loaded from <code>/admin/rules</code>. New rules apply on the next
              evaluation cycle.
            </p>
          </div>

          <div className="admin-rules-table-wrap">
            <table className="admin-rules-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Zone</th>
                  <th>Metric</th>
                  <th>Threshold</th>
                  <th>Compare</th>
                  <th>Severity</th>
                  <th>Enabled</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rules || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-rules-table__empty">
                      No rules yet — add one below.
                    </td>
                  </tr>
                ) : (
                  (rules || []).map((r) => (
                    <tr key={r.rule_id}>
                      <td>{r.rule_id}</td>
                      <td>{r.zone_id}</td>
                      <td>{r.metric_type}</td>
                      <td>{r.threshold}</td>
                      <td>{r.comparator}</td>
                      <td>{r.severity}</td>
                      <td>{r.enabled ? "Yes" : "No"}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button admin-rules-table__delete"
                          onClick={() => handleDeleteClick(r.rule_id)}
                          disabled={deletingRuleId != null}
                        >
                          {deletingRuleId === r.rule_id
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-rule-form-section">
            <h4 className="admin-rule-form__title">Create rule</h4>
            <form className="admin-rule-form" onSubmit={submitRule}>
              <label className="admin-rule-field">
                <span>Zone</span>
                <input
                  value={ruleForm.zone_id}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, zone_id: e.target.value })
                  }
                />
              </label>
              <label className="admin-rule-field">
                <span>Metric</span>
                <input
                  value={ruleForm.metric_type}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, metric_type: e.target.value })
                  }
                />
              </label>
              <label className="admin-rule-field">
                <span>Threshold</span>
                <input
                  type="number"
                  step="any"
                  value={ruleForm.threshold}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, threshold: e.target.value })
                  }
                />
              </label>
              <label className="admin-rule-field">
                <span>Comparator</span>
                <select
                  value={ruleForm.comparator}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, comparator: e.target.value })
                  }
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>
              </label>
              <label className="admin-rule-field">
                <span>Severity</span>
                <select
                  value={ruleForm.severity}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, severity: e.target.value })
                  }
                >
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="admin-rule-field admin-rule-field--check">
                <input
                  type="checkbox"
                  checked={ruleForm.enabled}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, enabled: e.target.checked })
                  }
                />
                <span>Enabled</span>
              </label>
              <div className="admin-rule-form__actions">
                <button
                  type="submit"
                  className="action-button"
                  disabled={ruleSaving}
                >
                  {ruleSaving ? "Saving…" : "Create rule"}
                </button>
              </div>
            </form>
            {ruleFormError ? (
              <p className="auth-error admin-rule-form__error">
                {ruleFormError}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {showAdminWorkspace && (rules || []).length > 0 && (
        <div className="toolbar-card admin-histogram-card">
          <h3 className="admin-histogram-card__heading">
            Levels vs thresholds
          </h3>
          <p className="muted-copy admin-histogram-card__sub">
            Green = within threshold (no alert). Red = violation side. Marker =
            latest 5‑minute aggregate per zone/metric (
            <code>/admin/metrics/latest</code>).
          </p>
          <div className="admin-histogram-list">
            {(rules || []).map((rule) => (
              <AdminThresholdBar
                key={rule.rule_id}
                rule={rule}
                latestAverage={latestMetricAverage(
                  metrics,
                  rule.zone_id,
                  rule.metric_type,
                )}
              />
            ))}
          </div>
        </div>
      )}

      {showAdminWorkspace && (
        <div className="toolbar-card admin-audit-card">
          <div className="admin-audit-card__head">
            <div>
              <h3 className="admin-audit-card__heading">Audit log</h3>
              <p className="muted-copy admin-audit-card__sub">
                Latest events from <code>/admin/audit</code>.
              </p>
            </div>
            <label className="select-field admin-audit-card__filter">
              <span>Type</span>
              <select
                value={auditTypeFilter}
                onChange={(e) => setAuditTypeFilter(e.target.value)}
              >
                {auditTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All" : type}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-field admin-audit-card__filter">
              <span>Sort</span>
              <select
                value={auditSortOrder}
                onChange={(e) => setAuditSortOrder(e.target.value)}
              >
                <option value="latest">Latest first</option>
                <option value="earliest">Earliest first</option>
              </select>
            </label>
          </div>

          <div className="admin-audit-list-scroll">
            {(auditLogs || []).length === 0 ? (
              <article className="empty-card">
                <h3>No audit events yet</h3>
                <p>Events appear here as users and alerts interact with the system.</p>
              </article>
            ) : filteredAuditLogs.length === 0 ? (
              <p className="muted-copy admin-audit-none-matching">
                No audit events match this type.
              </p>
            ) : (
              filteredAuditLogs.map((log, idx) => (
                <article key={`${log.timestamp}-${log.event_type}-${idx}`} className="admin-audit-item">
                  <div className="admin-audit-item__top">
                    <span className="status-pill">{classifyAuditEvent(log.event_type)}</span>
                    <code>{log.event_type}</code>
                  </div>
                  <p className="admin-audit-item__details">{log.details || "No details"}</p>
                  <p className="muted-copy admin-audit-item__meta">
                    {formatTimestamp(log.timestamp)} · {log.actor || "system"}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {showOperatorWorkspace && (
        <>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Operator console</p>
              <h2>{title}</h2>
              <p className="muted-copy">
                Last refresh{" "}
                {lastUpdatedAt
                  ? new Date(lastUpdatedAt).toLocaleTimeString()
                  : "pending"}
              </p>
            </div>
            <div className="button-row">
              <span
                className={`status-pill ${simulationRunning ? "status-live" : "status-idle"}`}
              >
                {simulationRunning ? "Feed running" : "Feed stopped"}
              </span>
              <button
                type="button"
                className="action-button"
                onClick={() => onSimulationToggle(!simulationRunning)}
              >
                {simulationRunning ? "Stop feed" : "Start feed"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh alerts"}
              </button>
            </div>
          </div>

          <div className="toolbar-card">
            <label className="select-field">
              <span>Ingestion transport</span>
              <select
                value={simulationTransport}
                onChange={(event) => onTransportChange(event.target.value)}
              >
                <option value="direct">Direct</option>
                <option value="mqtt">MQTT</option>
              </select>
            </label>

            <article className="stat-card compact">
              <span className="stat-label">MQTT subscriber</span>
              <strong>{mqttStatus?.connected ? "Connected" : "Offline"}</strong>
              <span className="muted-copy">
                {mqttStatus?.enabled
                  ? mqttStatus.topic
                  : "Disabled in app config"}
              </span>
            </article>
          </div>

          <div className="stat-grid">
            <article className="stat-card">
              <span className="stat-label">Visible Alerts</span>
              <strong>{visibleAlerts.length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Critical</span>
              <strong>{criticalCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Acknowledged</span>
              <strong>{acknowledgedCount}</strong>
            </article>
          </div>

          <div className="toolbar-card operator-alerts-map-panel">
            <div className="operator-alerts-panel__head">
              <h3 className="operator-alerts-panel__title">Alerts</h3>
              <p className="muted-copy operator-alerts-panel__lede">
                Use filters or click a zone on the map. The list scrolls (about
                three cards tall); the map is below.
              </p>
            </div>

            <div className="operator-alert-filters">
              <label className="select-field">
                <span>View</span>
                <select
                  value={alertViewMode}
                  onChange={(e) => {
                    setAlertViewMode(e.target.value);
                    setAlertZoneFilter("");
                    setAlertMetricFilter("");
                  }}
                >
                  <option value="active">Active</option>
                  <option value="history">History (resolved)</option>
                </select>
              </label>
              <label className="select-field">
                <span>Zone</span>
                <select
                  value={alertZoneFilter}
                  onChange={(e) => setAlertZoneFilter(e.target.value)}
                >
                  <option value="">All zones</option>
                  {zoneFilterOptions.map((z) => (
                    <option key={z} value={z}>
                      {formatZone(z)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="select-field">
                <span>Metric type</span>
                <select
                  value={alertMetricFilter}
                  onChange={(e) => setAlertMetricFilter(e.target.value)}
                >
                  <option value="">All metrics</option>
                  {metricFilterOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              {(alertZoneFilter || alertMetricFilter) && (
                <button
                  type="button"
                  className="secondary-button operator-alert-filters__clear"
                  onClick={() => {
                    setAlertZoneFilter("");
                    setAlertMetricFilter("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <p className="muted-copy operator-alerts-count">
              {filteredAlerts.length === visibleAlerts.length
                ? `${visibleAlerts.length} alert${visibleAlerts.length === 1 ? "" : "s"}`
                : `Showing ${filteredAlerts.length} of ${visibleAlerts.length} alerts`}
            </p>

            <div className="operator-alert-list-scroll">
              {visibleAlerts.length === 0 && (
                <article className="empty-card">
                  {alertViewMode === "history" ? (
                    <>
                      <h3>No resolved alerts yet</h3>
                      <p>Resolve alerts from the active view to build history.</p>
                    </>
                  ) : (
                    <>
                      <h3>No active alerts</h3>
                      <p>
                        Start the simulator or wait for a threshold violation to
                        see live alert traffic.
                      </p>
                    </>
                  )}
                </article>
              )}
              {visibleAlerts.length > 0 && filteredAlerts.length === 0 && (
                <p className="muted-copy operator-alerts-none-matching">
                  No alerts match these filters.
                </p>
              )}
              {filteredAlerts.map((alert) => (
                <OperatorAlertCard
                  key={alert.alert_id}
                  alert={alert}
                  actingAlertId={actingAlertId}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  readOnly={alertViewMode === "history"}
                />
              ))}
            </div>

            <div className="operator-map-section">
              <h4 className="operator-map-section__title">Zone map</h4>
              <p className="muted-copy operator-map-section__lede">
                Click a zone to filter the list to that zone. Open a pin to see
                all alerts for that zone (metric filter still applies).
              </p>
              <p className="muted-copy operator-map-section__lede">
                Demo sensor health: GOOD (6/6 sensors active).
              </p>
              <OperatorAlertsMap
                filteredAlerts={filteredAlerts}
                allAlerts={visibleAlerts}
                metricRows={mapMetrics}
                metricTypeFilter={alertMetricFilter}
                selectedZoneId={alertZoneFilter}
                onSelectZone={(zoneId) => setAlertZoneFilter(zoneId)}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
