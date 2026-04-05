/** Mirrors seeded rules in server/app.py — used when GET /admin/rules is missing. */
export const STUB_ALERT_RULES = [
  {
    rule_id: 1,
    zone_id: 'zone-north',
    metric_type: 'aqi',
    threshold: 100,
    comparator: '>',
    severity: 'warning',
    enabled: true,
  },
  {
    rule_id: 2,
    zone_id: 'zone-central',
    metric_type: 'noise',
    threshold: 80,
    comparator: '>',
    severity: 'warning',
    enabled: true,
  },
  {
    rule_id: 3,
    zone_id: 'zone-north',
    metric_type: 'temperature',
    threshold: 35,
    comparator: '>',
    severity: 'critical',
    enabled: true,
  },
  {
    rule_id: 4,
    zone_id: 'zone-central',
    metric_type: 'aqi',
    threshold: 120,
    comparator: '>',
    severity: 'critical',
    enabled: true,
  },
]

export const STUB_AUDIT = [
  {
    event_type: 'STUB',
    actor: 'demo',
    details: 'No /admin/audit yet — placeholder row',
    timestamp: new Date().toISOString(),
  },
]

export const STUB_ADVISORIES = []
