'use strict';

const metrics = {
  // Counters
  http_requests_total: 0,
  http_requests_by_method: {},
  http_requests_by_path: {},
  http_requests_by_status: {},
  webhook_requests_total: 0,
  webhook_requests_by_event: {},
  infra_runs_total: 0,
  infra_runs_by_engine: {},
  infra_runs_by_operation: {},
  infra_runs_by_conclusion: {},
  config_runs_total: 0,
  incidents_total: 0,
  incidents_by_severity: {},
  incidents_by_status: {},
  secrets_total: 0,
  policies_total: 0,
  predictions_total: 0,
  drift_events_total: 0,
  remediation_actions_total: 0,
  users_total: 0,
  logins_total: 0,
  auth_failures_total: 0,
  notifications_sent_total: 0,
  notifications_by_channel: {},
  errors_total: 0,
  api_latency_seconds: [], // simple histogram (array of latencies)

  // Gauges (current values)
  active_websocket_connections: 0,
  db_connections_active: 0,

  // Histogram buckets for latency (in seconds)
  latency_buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
};

function inc(metric, labels = {}) {
  if (!metrics[metric]) metrics[metric] = 0;
  metrics[metric]++;

  if (labels.method) {
    metrics.http_requests_by_method[labels.method] = (metrics.http_requests_by_method[labels.method] || 0) + 1;
  }
  if (labels.path) {
    metrics.http_requests_by_path[labels.path] = (metrics.http_requests_by_path[labels.path] || 0) + 1;
  }
  if (labels.status) {
    metrics.http_requests_by_status[labels.status] = (metrics.http_requests_by_status[labels.status] || 0) + 1;
  }
  if (labels.event) {
    metrics.webhook_requests_by_event[labels.event] = (metrics.webhook_requests_by_event[labels.event] || 0) + 1;
  }
  if (labels.engine) {
    metrics.infra_runs_by_engine[labels.engine] = (metrics.infra_runs_by_engine[labels.engine] || 0) + 1;
  }
  if (labels.operation) {
    metrics.infra_runs_by_operation[labels.operation] = (metrics.infra_runs_by_operation[labels.operation] || 0) + 1;
  }
  if (labels.conclusion) {
    metrics.infra_runs_by_conclusion[labels.conclusion] = (metrics.infra_runs_by_conclusion[labels.conclusion] || 0) + 1;
  }
  if (labels.severity) {
    metrics.incidents_by_severity[labels.severity] = (metrics.incidents_by_severity[labels.severity] || 0) + 1;
  }
  if (labels.incident_status) {
    metrics.incidents_by_status[labels.incident_status] = (metrics.incidents_by_status[labels.incident_status] || 0) + 1;
  }
  if (labels.channel) {
    metrics.notifications_by_channel[labels.channel] = (metrics.notifications_by_channel[labels.channel] || 0) + 1;
  }
}

function observeLatency(seconds) {
  metrics.api_latency_seconds.push(seconds);
  // Keep only last 1000 latencies
  if (metrics.api_latency_seconds.length > 1000) {
    metrics.api_latency_seconds = metrics.api_latency_seconds.slice(-1000);
  }
}

function set(metric, value) {
  metrics[metric] = value;
}

function getMetrics() {
  const lines = [];

  // Helper to escape Prometheus label values
  const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  // Helper for counter
  const counter = (name, help, value, labels = {}) => {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${esc(v)}"`)
      .join(',');
    const labelPrefix = labelStr ? `{${labelStr}}` : '';
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name}${labelPrefix} ${value}`);
    lines.push('');
  };

  // Helper for gauge
  const gauge = (name, help, value) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
    lines.push('');
  };

  // Helper for histogram
  const histogram = (name, help, values, buckets) => {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    const leCounts = {};
    buckets.forEach((b) => {
      leCounts[b] = sorted.filter((v) => v <= b).length;
    });

    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} histogram`);

    Object.entries(leCounts).forEach(([le, cnt]) => {
      lines.push(`${name}_bucket{le="${le}"} ${cnt}`);
    });
    lines.push(`${name}_bucket{le="+Inf"} ${count}`);
    lines.push(`${name}_count ${count}`);
    lines.push(`${name}_sum ${sum}`);
    lines.push('');
  };

  // Counters
  counter('ops_sentinel_http_requests_total', 'Total HTTP requests', metrics.http_requests_total);
  Object.entries(metrics.http_requests_by_method).forEach(([method, v]) =>
    counter('ops_sentinel_http_requests_by_method_total', 'HTTP requests by method', v, { method }));
  Object.entries(metrics.http_requests_by_path).forEach(([path, v]) =>
    counter('ops_sentinel_http_requests_by_path_total', 'HTTP requests by path', v, { path }));
  Object.entries(metrics.http_requests_by_status).forEach(([status, v]) =>
    counter('ops_sentinel_http_requests_by_status_total', 'HTTP requests by status', v, { status }));
  counter('ops_sentinel_webhook_requests_total', 'Total webhook requests', metrics.webhook_requests_total);
  Object.entries(metrics.webhook_requests_by_event).forEach(([event, v]) =>
    counter('ops_sentinel_webhook_requests_by_event_total', 'Webhook requests by event', v, { event }));
  counter('ops_sentinel_infra_runs_total', 'Total infrastructure runs', metrics.infra_runs_total);
  Object.entries(metrics.infra_runs_by_engine).forEach(([engine, v]) =>
    counter('ops_sentinel_infra_runs_by_engine_total', 'Infra runs by engine', v, { engine }));
  Object.entries(metrics.infra_runs_by_operation).forEach(([op, v]) =>
    counter('ops_sentinel_infra_runs_by_operation_total', 'Infra runs by operation', v, { operation }));
  Object.entries(metrics.infra_runs_by_conclusion).forEach(([conclusion, v]) =>
    counter('ops_sentinel_infra_runs_by_conclusion_total', 'Infra runs by conclusion', v, { conclusion }));
  counter('ops_sentinel_config_runs_total', 'Total configuration runs', metrics.config_runs_total);
  counter('ops_sentinel_incidents_total', 'Total incidents', metrics.incidents_total);
  Object.entries(metrics.incidents_by_severity).forEach(([sev, v]) =>
    counter('ops_sentinel_incidents_by_severity_total', 'Incidents by severity', v, { severity: sev }));
  Object.entries(metrics.incidents_by_status).forEach(([st, v]) =>
    counter('ops_sentinel_incidents_by_status_total', 'Incidents by status', v, { status: st }));
  counter('ops_sentinel_secrets_total', 'Total secrets', metrics.secrets_total);
  counter('ops_sentinel_policies_total', 'Total policies', metrics.policies_total);
  counter('ops_sentinel_predictions_total', 'Total predictions', metrics.predictions_total);
  counter('ops_sentinel_drift_events_total', 'Total drift events', metrics.drift_events_total);
  counter('ops_sentinel_remediation_actions_total', 'Total remediation actions', metrics.remediation_actions_total);
  counter('ops_sentinel_users_total', 'Total users', metrics.users_total);
  counter('ops_sentinel_logins_total', 'Total logins', metrics.logins_total);
  counter('ops_sentinel_auth_failures_total', 'Total auth failures', metrics.auth_failures_total);
  counter('ops_sentinel_notifications_sent_total', 'Total notifications sent', metrics.notifications_sent_total);
  Object.entries(metrics.notifications_by_channel).forEach(([ch, v]) =>
    counter('ops_sentinel_notifications_by_channel_total', 'Notifications by channel', v, { channel: ch }));
  counter('ops_sentinel_errors_total', 'Total errors', metrics.errors_total);

  // Gauges
  gauge('ops_sentinel_active_websocket_connections', 'Active WebSocket connections', metrics.active_websocket_connections);
  gauge('ops_sentinel_db_connections_active', 'Active DB connections', metrics.db_connections_active);

  // Histogram
  histogram('ops_sentinel_api_latency_seconds', 'API latency in seconds', metrics.api_latency_seconds, metrics.latency_buckets);

  return lines.join('\n') + '\n';
}

module.exports = { metrics, inc, observeLatency, set, getMetrics };
