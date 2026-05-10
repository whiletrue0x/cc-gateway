export function renderLogin(error?: string): string {
  const errBlock = error
    ? `<div class="error">${escapeHtml(error)}</div>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CC Gateway — Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #0b0d10; color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .box {
    background: #14181d; border: 1px solid #232a33; border-radius: 10px;
    padding: 32px; width: 360px; max-width: 90vw;
  }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p.sub { color: #8b949e; font-size: 13px; margin: 0 0 22px; }
  label { display: block; font-size: 12px; color: #8b949e; margin: 14px 0 4px; text-transform: uppercase; letter-spacing: .04em; }
  input {
    width: 100%; padding: 10px 12px; box-sizing: border-box;
    background: #0b0d10; color: #e6edf3;
    border: 1px solid #232a33; border-radius: 6px;
    font-size: 14px; font-family: inherit;
  }
  input:focus { outline: none; border-color: #58a6ff; }
  button {
    margin-top: 22px; width: 100%; padding: 10px;
    background: #1f6feb; color: white; border: 0; border-radius: 6px;
    font-size: 14px; font-weight: 500; cursor: pointer;
  }
  button:hover { background: #388bfd; }
  .error { background: rgba(248,81,73,.1); border: 1px solid rgba(248,81,73,.3); color: #f85149; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
</style>
</head>
<body>
  <form class="box" method="post" action="/login">
    <h1>CC Gateway</h1>
    <p class="sub">Sign in to access the dashboard</p>
    ${errBlock}
    <label for="username">Username</label>
    <input id="username" name="username" autocomplete="username" autofocus required />
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CC Gateway — Dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root {
    --bg: #0b0d10;
    --panel: #14181d;
    --panel-2: #1b2027;
    --border: #232a33;
    --fg: #e6edf3;
    --muted: #8b949e;
    --accent: #58a6ff;
    --ok: #3fb950;
    --warn: #d29922;
    --err: #f85149;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--fg);
    font-size: 14px;
    display: flex; min-height: 100vh;
  }
  aside.sidebar {
    width: 220px; flex-shrink: 0;
    background: var(--panel); border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    position: sticky; top: 0; height: 100vh;
  }
  aside.sidebar .brand {
    padding: 18px 20px; border-bottom: 1px solid var(--border);
    font-weight: 600; font-size: 14px;
  }
  aside.sidebar .brand .sub {
    display: block; color: var(--muted); font-size: 11px;
    font-weight: 400; margin-top: 2px; letter-spacing: .02em;
  }
  aside.sidebar nav {
    flex: 1; overflow-y: auto; padding: 12px 8px;
    display: flex; flex-direction: column; gap: 2px;
  }
  aside.sidebar nav a {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 6px;
    color: var(--fg); text-decoration: none; font-size: 13px;
    opacity: .8;
  }
  aside.sidebar nav a:hover { background: var(--panel-2); opacity: 1; }
  aside.sidebar nav a.active { background: var(--panel-2); opacity: 1; color: var(--accent); }
  aside.sidebar nav a .icon { font-family: var(--mono); width: 16px; text-align: center; opacity: .7; }
  aside.sidebar .sidebar-footer {
    padding: 12px 16px; border-top: 1px solid var(--border);
    font-size: 11px; color: var(--muted); display: flex;
    flex-direction: column; gap: 8px;
  }
  aside.sidebar .sidebar-footer form { display: block; }
  aside.sidebar .sidebar-footer form button { width: 100%; }
  .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  header {
    padding: 14px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--panel); position: sticky; top: 0; z-index: 10;
  }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; }
  header .meta { color: var(--muted); font-size: 12px; font-family: var(--mono); }
  main { padding: 20px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
  @media (max-width: 800px) {
    body { flex-direction: column; }
    aside.sidebar { width: 100%; height: auto; position: static; }
    aside.sidebar nav { flex-direction: row; flex-wrap: wrap; padding: 8px; }
    aside.sidebar nav a { padding: 6px 10px; }
    aside.sidebar .sidebar-footer { display: none; }
  }
  .grid { display: grid; gap: 16px; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 12px; }
  .card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px;
  }
  .card h2 {
    margin: 0 0 12px; font-size: 12px; letter-spacing: .04em;
    text-transform: uppercase; color: var(--muted); font-weight: 600;
  }
  .stat .value { font-size: 26px; font-weight: 600; font-family: var(--mono); }
  .stat .label { font-size: 11px; color: var(--muted); text-transform: uppercase; margin-top: 4px; letter-spacing: .03em; }
  table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  tr:last-child td { border-bottom: none; }
  .scroll-y {
    max-height: 480px; overflow-y: auto;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--panel); color: var(--fg);
    color-scheme: dark;
    scrollbar-color: #2c333d var(--panel);
    scrollbar-width: thin;
  }
  .scroll-y::-webkit-scrollbar { width: 10px; }
  .scroll-y::-webkit-scrollbar-track { background: var(--panel); }
  .scroll-y::-webkit-scrollbar-thumb { background: #2c333d; border-radius: 6px; border: 2px solid var(--panel); }
  .scroll-y::-webkit-scrollbar-thumb:hover { background: #3a4250; }
  .scroll-y table { font-size: 13px; background: var(--panel); }
  .scroll-y thead th {
    position: sticky; top: 0;
    background: var(--panel-2); color: var(--muted);
    z-index: 1; box-shadow: 0 1px 0 var(--border);
  }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-family: var(--mono); }
  .pill.ok { background: rgba(63,185,80,.15); color: var(--ok); }
  .pill.warn { background: rgba(210,153,34,.15); color: var(--warn); }
  .pill.err { background: rgba(248,81,73,.15); color: var(--err); }
  .chart { display: flex; align-items: flex-end; gap: 1px; height: 70px; padding-top: 4px; }
  .bar { flex: 1; background: var(--accent); opacity: .85; border-radius: 1px 1px 0 0; min-height: 1px; }
  .bar:hover { opacity: 1; }
  .ago { color: var(--muted); }
  .path { color: var(--fg); opacity: .9; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg { color: var(--fg); opacity: .85; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .msg.empty { color: var(--muted); font-style: italic; }
  .limit-bar {
    display: inline-block; width: 70px; height: 5px;
    background: var(--panel-2); border-radius: 3px; overflow: hidden;
    vertical-align: middle; margin-left: 6px;
  }
  .limit-bar > span { display: block; height: 100%; background: var(--ok); }
  .limit-bar > span.warn { background: var(--warn); }
  .limit-bar > span.err { background: var(--err); }
  .toolbar { display: flex; align-items: center; gap: 12px; }
  select, button {
    background: var(--panel-2); color: var(--fg);
    border: 1px solid var(--border); border-radius: 6px;
    padding: 6px 10px; font-size: 13px; font-family: inherit;
    cursor: pointer;
  }
  button:hover, select:hover { border-color: var(--accent); }
  .empty { color: var(--muted); padding: 24px; text-align: center; font-style: italic; }
  button.primary { background: #1f6feb; border-color: #1f6feb; color: white; }
  button.primary:hover { background: #388bfd; border-color: #388bfd; }
  button.danger { background: transparent; color: var(--err); border-color: rgba(248,81,73,.4); }
  button.danger:hover { background: rgba(248,81,73,.1); border-color: var(--err); }
  .modal {
    position: fixed; inset: 0; background: rgba(0,0,0,.6);
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .modal-box {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 24px; width: 420px; max-width: 92vw;
  }
  .modal-box h3 { margin: 0 0 4px; }
  .modal-box label { display: block; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin: 14px 0 4px; }
  .modal-box input, .modal-box select {
    width: 100%; padding: 8px 10px; box-sizing: border-box;
    background: var(--bg); color: var(--fg);
    border: 1px solid var(--border); border-radius: 6px;
    font-size: 14px; font-family: inherit;
  }
  .modal-box input:focus, .modal-box select:focus { outline: none; border-color: var(--accent); }
  .error { background: rgba(248,81,73,.1); border: 1px solid rgba(248,81,73,.3); color: var(--err); padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .config-info { background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .snippet-block { position: relative; }
  .snippet-block pre {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 12px; font-family: var(--mono); font-size: 12px;
    color: var(--fg); margin: 0; overflow-x: auto; white-space: pre;
  }
  .copy-btn {
    position: absolute; top: 6px; right: 6px;
    padding: 4px 10px; font-size: 11px;
    background: var(--panel-2); color: var(--fg);
    border: 1px solid var(--border); border-radius: 4px; cursor: pointer;
  }
  .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
  .copy-btn.copied { color: var(--ok); border-color: var(--ok); }
</style>
</head>
<body>
<aside class="sidebar">
  <div class="brand">
    CC Gateway
    <span class="sub">Request Dashboard</span>
  </div>
  <nav id="sideNav">
    <a href="#topStats" class="active"><span class="icon">▦</span>Overview</a>
    <a href="#periods"><span class="icon">$</span>Cost &amp; periods</a>
    <a href="#charts"><span class="icon">∿</span>Traffic</a>
    <a href="#models"><span class="icon">◇</span>By model</a>
    <a href="#clients"><span class="icon">◎</span>Clients</a>
    <a href="#recent"><span class="icon">»</span>Recent requests</a>
    <a href="#about"><span class="icon">?</span>How to use</a>
  </nav>
  <div class="sidebar-footer">
    <span class="meta" id="updated">loading…</span>
    <form action="/logout" method="post"><button type="submit">Logout</button></form>
  </div>
</aside>
<div class="content">
<header>
  <h1 id="pageTitle">Overview</h1>
  <div class="toolbar">
    <select id="rangeSel">
      <option value="minute">Last 60 min</option>
      <option value="hour">Last 24 h</option>
    </select>
    <button id="refreshBtn">Refresh</button>
  </div>
</header>
<main>
  <div class="grid">
    <div class="row" id="topStats"></div>
    <section id="periods" class="card">
      <h2>Cost &amp; usage by period</h2>
      <div id="periodTable"></div>
    </section>
    <section id="charts-section" class="card">
      <h2>Requests over time (per client)</h2>
      <div id="charts" class="grid"></div>
    </section>
    <section id="models" class="card">
      <h2>By model</h2>
      <div id="modelsTable"></div>
    </section>
    <section id="clients" class="card">
      <h2>
        Clients
        <button id="addClientBtn" style="float:right;margin-top:-4px">+ Add client</button>
      </h2>
      <div id="clientsConfig" style="margin-bottom:12px"></div>
      <div id="clientsTable"></div>
    </section>
    <section id="recent" class="card">
      <h2>
        Recent requests
        <span id="pauseHint" class="meta" style="float:right;font-weight:400;text-transform:none;letter-spacing:0;font-size:12px;color:var(--muted)"></span>
      </h2>
      <div id="recentTable"></div>
    </section>
    <details id="about" class="card">
      <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">
        How to use this dashboard
      </summary>
      <div style="margin-top:12px;font-size:13px;line-height:1.6;color:var(--fg)">
        <p style="margin:0 0 10px"><strong>Stats row</strong> — totals across the gateway's full history (persisted in SQLite): requests, accumulated cost (USD list price), tokens, active clients, errors, uptime.</p>
        <p style="margin:0 0 10px"><strong>Cost &amp; usage by period</strong> — same totals split by Today / Last 7d / Last 30d / All time so you can track spend trend.</p>
        <p style="margin:0 0 10px"><strong>Requests over time</strong> — per-client traffic. Toggle <em>Last 60 min</em> / <em>Last 24 h</em>.</p>
        <p style="margin:0 0 10px"><strong>By model</strong> — per-model totals: calls, input/output/cache tokens, and cost. Cost uses Anthropic public list prices.</p>
        <p style="margin:0 0 10px"><strong>Clients</strong> — every entry under <code>auth.tokens</code>, with their lifetime calls / tokens / cost. Click <strong>+ Add client</strong> to generate a token, append it to <code>config.yaml</code>, and download a launcher script.</p>
        <p style="margin:0 0 10px"><strong>Recent requests</strong> — last 50 requests with model, tokens, cost, and duration. New rows stream in at the top; updates pause while you're hovering so the view doesn't jump.</p>
        <p style="margin:0">After downloading <code>cc-&lt;name&gt;</code>, send it to the user. They run:</p>
<pre style="background:var(--panel-2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-family:var(--mono);font-size:12px;overflow-x:auto;margin:8px 0 0">chmod +x cc-&lt;name&gt;
./cc-&lt;name&gt; install      # install as 'ccg' system-wide (optional)
./cc-&lt;name&gt;              # or run directly without installing</pre>
      </div>
    </details>
  </div>
</main>
</div>

<div id="addClientModal" class="modal" style="display:none">
  <div class="modal-box">
    <div id="modalForm">
      <h3>Add client</h3>
      <p class="meta" style="margin:0 0 16px">Generates a token, appends it to <code>config.yaml</code>, and downloads a launcher script.</p>
      <label>Client name</label>
      <input id="cName" placeholder="e.g. vuluu2k" autocomplete="off" />
      <label>Gateway address</label>
      <input id="cAddr" placeholder="ccg.example.com" autocomplete="off" />
      <label>Scheme</label>
      <select id="cScheme">
        <option value="https">https</option>
        <option value="http">http</option>
      </select>
      <label>Cost limit (USD) — optional, 0 = unlimited</label>
      <input id="cLimit" type="number" min="0" step="0.01" placeholder="0" autocomplete="off" />
      <label>Limit window</label>
      <select id="cLimitPeriod">
        <option value="lifetime">Lifetime</option>
        <option value="monthly">Monthly (UTC)</option>
        <option value="daily">Daily (UTC)</option>
      </select>
      <div id="cError" class="error" style="display:none;margin-top:12px"></div>
      <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
        <button id="cCancel" type="button">Cancel</button>
        <button id="cSubmit" type="button" class="primary">Create &amp; download</button>
      </div>
    </div>

    <div id="modalSuccess" style="display:none">
      <h3>Client created · <span id="successName"></span></h3>
      <p class="meta" style="margin:0 0 16px">File <code id="successFile"></code> has been downloaded. Send it to the user and ask them to run:</p>
      <div class="snippet-block">
        <pre id="successCmd"></pre>
        <button id="copyCmdBtn" type="button" class="copy-btn">Copy</button>
      </div>
      <p class="meta" style="margin:14px 0 8px">Or to install system-wide as <code>ccg</code>:</p>
      <div class="snippet-block">
        <pre id="installCmd"></pre>
        <button id="copyInstallBtn" type="button" class="copy-btn">Copy</button>
      </div>
      <p class="meta" style="margin:14px 0 8px">On macOS, if Gatekeeper blocks the file:</p>
      <div class="snippet-block">
        <pre id="xattrCmd"></pre>
        <button id="copyXattrBtn" type="button" class="copy-btn">Copy</button>
      </div>
      <p class="meta" style="margin:14px 0 0;font-size:12px">
        Prerequisites: claude code installed (<code>npm install -g @anthropic-ai/claude-code</code>).
      </p>
      <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
        <button id="successDone" type="button" class="primary">Done</button>
      </div>
    </div>
  </div>
</div>

<div id="limitModal" class="modal" style="display:none">
  <div class="modal-box">
    <h3>Set cost limit · <span id="limitName"></span></h3>
    <p class="meta" style="margin:0 0 16px">Block this client from <code>/v1/messages</code> when the window's cost reaches the limit. Other endpoints (free) keep working.</p>
    <label>Cost limit (USD) — 0 / empty = unlimited</label>
    <input id="lLimit" type="number" min="0" step="0.01" placeholder="0" autocomplete="off" />
    <label>Window</label>
    <select id="lPeriod">
      <option value="lifetime">Lifetime</option>
      <option value="monthly">Monthly (UTC)</option>
      <option value="daily">Daily (UTC)</option>
    </select>
    <div id="lError" class="error" style="display:none;margin-top:12px"></div>
    <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
      <button id="lCancel" type="button">Cancel</button>
      <button id="lSubmit" type="button" class="primary">Save</button>
    </div>
  </div>
</div>
<script>
(() => {
  const range = () => document.getElementById('rangeSel').value;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fmtNum = (n) => (n || 0).toLocaleString();
  const fmtTokens = (n) => {
    n = n || 0;
    if (n < 1000) return String(n);
    if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\\.0$/, '') + 'k';
    return (n / 1_000_000).toFixed(2).replace(/\\.00$/, '') + 'M';
  };
  const fmtCost = (n) => {
    n = n || 0;
    if (n === 0) return '$0';
    if (n < 0.01) return '$' + n.toFixed(4);
    if (n < 100) return '$' + n.toFixed(2);
    return '$' + Math.round(n).toLocaleString();
  };
  const shortModel = (m) => {
    if (!m) return '—';
    return m.replace(/^claude-/, '').replace(/-\\d{8}$/, '');
  };
  const fmtAgo = (ts) => {
    const d = Math.max(0, Date.now() - ts);
    if (d < 1000) return 'just now';
    if (d < 60_000) return Math.floor(d / 1000) + 's ago';
    if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    return Math.floor(d / 86_400_000) + 'd ago';
  };
  const fmtUptime = (ms) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    return m + 'm';
  };
  const statusClass = (status) => {
    const ok = (status['2xx'] || 0) + (status['3xx'] || 0);
    const warn = status['4xx'] || 0;
    const err = status['5xx'] || 0;
    return { ok, warn, err };
  };

  const renderTopStats = (data) => {
    const t = data.totals;
    const errRate = t.total ? ((t.errors / t.total) * 100).toFixed(1) : '0.0';
    const html = [
      ['Total requests', fmtNum(t.total)],
      ['Total cost', fmtCost(t.costUsd)],
      ['Input tokens', fmtTokens(t.inputTokens)],
      ['Output tokens', fmtTokens(t.outputTokens)],
      ['Cache read', fmtTokens(t.cacheReadTokens)],
      ['Cache write', fmtTokens(t.cacheCreationTokens)],
      ['Active clients', fmtNum(data.clients.length)],
      ['Errors', fmtNum(t.errors) + ' (' + errRate + '%)'],
      ['Uptime', fmtUptime(data.uptimeMs)],
    ].map(([label, value]) => \`
      <div class="card stat">
        <div class="value">\${value}</div>
        <div class="label">\${label}</div>
      </div>\`).join('');
    document.getElementById('topStats').innerHTML = html;
  };

  const renderPeriods = (data) => {
    const t = data.totals;
    const periods = (data.periods || []).concat([{
      key: 'all', label: 'All time',
      total: t.total,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      cacheReadTokens: t.cacheReadTokens,
      cacheCreationTokens: t.cacheCreationTokens,
      costUsd: t.costUsd,
    }]);
    const rows = periods.map(p => \`<tr>
      <td><strong>\${p.label}</strong></td>
      <td class="num">\${fmtNum(p.total)}</td>
      <td class="num" title="\${fmtNum(p.inputTokens)} tokens">\${fmtTokens(p.inputTokens)}</td>
      <td class="num" title="\${fmtNum(p.outputTokens)} tokens">\${fmtTokens(p.outputTokens)}</td>
      <td class="num" title="cache read \${fmtNum(p.cacheReadTokens)} · cache write \${fmtNum(p.cacheCreationTokens)}">\${fmtTokens((p.cacheReadTokens || 0) + (p.cacheCreationTokens || 0))}</td>
      <td class="num"><strong>\${fmtCost(p.costUsd)}</strong></td>
    </tr>\`).join('');
    document.getElementById('periodTable').innerHTML = \`
      <table>
        <thead><tr>
          <th>Period</th>
          <th class="num">Calls</th>
          <th class="num">Input</th>
          <th class="num">Output</th>
          <th class="num">Cache</th>
          <th class="num">Cost</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
  };

  const renderModels = (data) => {
    const el = document.getElementById('modelsTable');
    if (!data.models || !data.models.length) {
      el.innerHTML = '<div class="empty">No model usage recorded yet</div>';
      return;
    }
    const rows = data.models.map(m => {
      const totalTokens = (m.inputTokens || 0) + (m.outputTokens || 0);
      return \`<tr>
        <td><strong>\${shortModel(m.model)}</strong></td>
        <td class="num">\${fmtNum(m.total)}</td>
        <td class="num">\${fmtTokens(m.inputTokens)}</td>
        <td class="num">\${fmtTokens(m.outputTokens)}</td>
        <td class="num">\${fmtTokens(m.cacheReadTokens)}</td>
        <td class="num">\${fmtTokens(m.cacheCreationTokens)}</td>
        <td class="num"><strong>\${fmtCost(m.costUsd)}</strong></td>
      </tr>\`;
    }).join('');
    el.innerHTML = \`
      <table>
        <thead><tr>
          <th>Model</th>
          <th class="num">Calls</th>
          <th class="num">Input</th>
          <th class="num">Output</th>
          <th class="num">Cache read</th>
          <th class="num">Cache write</th>
          <th class="num">Cost</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
  };

  const renderCharts = (data) => {
    const series = range() === 'hour' ? data.hourSeries : data.minuteSeries;
    const unit = range() === 'hour' ? 'h' : 'm';
    const clients = Object.keys(series);
    if (!clients.length) {
      document.getElementById('charts').innerHTML = '<div class="empty">No traffic yet</div>';
      return;
    }
    const max = Math.max(1, ...clients.flatMap(c => series[c].map(b => b.count)));
    document.getElementById('charts').innerHTML = clients.map(c => {
      const points = series[c];
      const total = points.reduce((s, p) => s + p.count, 0);
      const bars = points.map(p => {
        const h = Math.round((p.count / max) * 100);
        return \`<div class="bar" style="height:\${Math.max(1, h)}%" title="\${new Date(p.ts).toLocaleString()} — \${p.count} req"></div>\`;
      }).join('');
      return \`
        <div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <strong>\${c}</strong>
            <span class="meta">\${total} req · last \${points.length}\${unit}</span>
          </div>
          <div class="chart">\${bars}</div>
        </div>\`;
    }).join('');
  };

  const renderClients = (data) => {
    if (!data.clients.length) {
      document.getElementById('clientsTable').innerHTML = '<div class="empty">No clients have called yet</div>';
      return;
    }
    const rows = data.clients.map(c => {
      const s = statusClass(c.byStatus);
      return \`<tr>
        <td><strong>\${c.name}</strong></td>
        <td class="num">\${fmtNum(c.total)}</td>
        <td class="num" title="\${fmtNum(c.inputTokens)} tokens">\${fmtTokens(c.inputTokens)}</td>
        <td class="num" title="\${fmtNum(c.outputTokens)} tokens">\${fmtTokens(c.outputTokens)}</td>
        <td class="num" title="cache read \${fmtNum(c.cacheReadTokens)} · cache write \${fmtNum(c.cacheCreationTokens)}">\${fmtTokens((c.cacheReadTokens || 0) + (c.cacheCreationTokens || 0))}</td>
        <td class="num"><strong>\${fmtCost(c.costUsd)}</strong></td>
        <td><span class="pill ok">\${s.ok}</span> <span class="pill warn">\${s.warn}</span> <span class="pill err">\${s.err}</span></td>
        <td class="num">\${c.avgDurationMs}ms</td>
        <td class="ago">\${fmtAgo(c.lastSeen)}</td>
      </tr>\`;
    }).join('');
    document.getElementById('clientsTable').innerHTML = \`
      <table>
        <thead><tr>
          <th>Client</th>
          <th class="num">Calls</th>
          <th class="num" title="Input tokens">Input</th>
          <th class="num" title="Output tokens">Output</th>
          <th class="num" title="Cache read + cache write tokens">Cache</th>
          <th class="num">Cost</th>
          <th>2xx / 4xx / 5xx</th>
          <th class="num">Avg</th>
          <th>Last seen</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
  };

  const RECENT_TABLE_HTML = \`
    <div class="scroll-y" id="recentScroll">
      <table>
        <thead><tr>
          <th>When</th>
          <th>Client</th>
          <th>Model</th>
          <th>Message</th>
          <th>Path</th>
          <th>Status</th>
          <th class="num">Duration</th>
          <th class="num">Input</th>
          <th class="num">Output</th>
          <th class="num">Cache</th>
          <th class="num">Cost</th>
        </tr></thead>
        <tbody id="recentBody"></tbody>
      </table>
    </div>\`;

  const buildRecentRow = (r) => {
    const cls = r.status >= 500 ? 'err' : r.status >= 400 ? 'warn' : 'ok';
    const hasUsage = (r.inputTokens || r.outputTokens || r.cacheReadTokens || r.cacheCreationTokens);
    const msg = r.userMessage || '';
    const msgCell = msg
      ? \`<td class="msg" title="\${esc(msg)}">\${esc(msg)}</td>\`
      : '<td class="msg empty">—</td>';
    const tr = document.createElement('tr');
    tr.dataset.ts = String(r.ts);
    tr.innerHTML = \`
      <td class="ago" data-ts="\${r.ts}">\${fmtAgo(r.ts)}</td>
      <td>\${esc(r.client)}</td>
      <td><span class="meta">\${esc(shortModel(r.model))}</span></td>
      \${msgCell}
      <td class="path" title="\${esc(r.method + ' ' + r.path)}">\${esc(r.path)}</td>
      <td><span class="pill \${cls}">\${r.status}</span></td>
      <td class="num">\${r.durationMs}ms</td>
      <td class="num" title="\${fmtNum(r.inputTokens)} input tokens">\${hasUsage ? fmtTokens(r.inputTokens) : '—'}</td>
      <td class="num" title="\${fmtNum(r.outputTokens)} output tokens">\${hasUsage ? fmtTokens(r.outputTokens) : '—'}</td>
      <td class="num" title="cache read \${fmtNum(r.cacheReadTokens)} · cache write \${fmtNum(r.cacheCreationTokens)}">\${hasUsage ? fmtTokens((r.cacheReadTokens || 0) + (r.cacheCreationTokens || 0)) : '—'}</td>
      <td class="num">\${r.costUsd ? fmtCost(r.costUsd) : '—'}</td>\`;
    return tr;
  };

  const RECENT_KEEP = 50;
  let pendingRecent = [];        // queued rows while paused (deduped by ts)
  let recentPaused = false;      // user is hovering the table

  // Refresh just the relative-time cells without touching the rest of the row,
  // so an idle viewer sees "1m ago" tick to "2m ago" without the whole table
  // re-rendering and losing their scroll/selection.
  const tickAgoCells = () => {
    const body = document.getElementById('recentBody');
    if (!body) return;
    body.querySelectorAll('td.ago[data-ts]').forEach(td => {
      const ts = Number(td.getAttribute('data-ts'));
      if (Number.isFinite(ts)) td.textContent = fmtAgo(ts);
    });
  };

  const flushPendingRecent = () => {
    const body = document.getElementById('recentBody');
    const scroll = document.getElementById('recentScroll');
    if (!body || !pendingRecent.length) {
      updatePauseHint();
      return;
    }
    // Chat-style: newest at the bottom. Stick to bottom only if the user was
    // already there; if they scrolled UP to inspect older rows, leave their
    // viewport alone (appending at the bottom doesn't shift content above).
    const wasAtBottom = !scroll
      || (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight) < 32;
    // Append oldest-first so the newest ends up at the bottom.
    pendingRecent.sort((a, b) => a.ts - b.ts);
    for (const r of pendingRecent) {
      body.appendChild(buildRecentRow(r));
    }
    pendingRecent = [];
    while (body.children.length > RECENT_KEEP) {
      body.removeChild(body.firstChild);
    }
    if (scroll && wasAtBottom) {
      scroll.scrollTop = scroll.scrollHeight;
    }
    updatePauseHint();
  };

  const updatePauseHint = () => {
    const hint = document.getElementById('pauseHint');
    if (!hint) return;
    if (recentPaused && pendingRecent.length) {
      hint.textContent = \`paused · \${pendingRecent.length} new (move cursor away to apply)\`;
    } else if (recentPaused) {
      hint.textContent = 'paused while hovering';
    } else {
      hint.textContent = '';
    }
  };

  const renderRecent = (data) => {
    const host = document.getElementById('recentTable');
    if (!data.recent.length) {
      host.innerHTML = '<div class="empty">No requests yet</div>';
      pendingRecent = [];
      return;
    }

    let body = document.getElementById('recentBody');
    if (!body) {
      host.innerHTML = RECENT_TABLE_HTML;
      body = document.getElementById('recentBody');
      // Initial paint: server returns newest-first, but we want chat-style
      // (newest at the bottom), so reverse before appending.
      const ordered = data.recent.slice().reverse();
      for (const r of ordered) body.appendChild(buildRecentRow(r));

      // Pause refresh while the user is interacting so the table stops moving
      // under their cursor. Resume + flush when they leave.
      const scroll = document.getElementById('recentScroll');
      scroll.addEventListener('mouseenter', () => { recentPaused = true; updatePauseHint(); });
      scroll.addEventListener('mouseleave', () => { recentPaused = false; flushPendingRecent(); });
      // Start anchored at the bottom so the latest request is in view.
      scroll.scrollTop = scroll.scrollHeight;
      return;
    }

    // Diff against what's already in the DOM. ts is monotonic per-request and
    // unique enough at our request rate to use as a row key.
    const known = new Set(
      Array.from(body.children).map(tr => tr.dataset.ts),
    );
    for (const r of pendingRecent) known.add(String(r.ts));
    const fresh = data.recent.filter(r => !known.has(String(r.ts)));
    if (!fresh.length) {
      tickAgoCells();
      updatePauseHint();
      return;
    }

    pendingRecent.push(...fresh);
    if (recentPaused) {
      // Hold back — let the user finish reading. Hint shows the backlog.
      tickAgoCells();
      updatePauseHint();
    } else {
      flushPendingRecent();
      tickAgoCells();
    }
  };

  let currentData = null;

  const refresh = async () => {
    try {
      const res = await fetch('/_metrics', { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) {
        location.href = '/login';
        return;
      }
      if (!res.ok) {
        document.getElementById('updated').textContent = 'error: ' + res.status;
        return;
      }
      currentData = await res.json();
      renderTopStats(currentData);
      renderPeriods(currentData);
      renderCharts(currentData);
      renderModels(currentData);
      renderClients(currentData);
      renderRecent(currentData);
      document.getElementById('updated').textContent = 'updated ' + new Date().toLocaleTimeString();
    } catch (e) {
      document.getElementById('updated').textContent = 'fetch error';
    }
  };

  document.getElementById('refreshBtn').addEventListener('click', refresh);
  document.getElementById('rangeSel').addEventListener('change', () => {
    if (currentData) renderCharts(currentData);
  });

  // ── Clients management ──
  const renderLimitCell = (c) => {
    if (!c.cost_limit_usd) {
      return '<span class="meta">unlimited</span>';
    }
    const used = c.cost_used_usd || 0;
    const pct = Math.min(100, Math.round((used / c.cost_limit_usd) * 100));
    const cls = pct >= 100 ? 'err' : pct >= 80 ? 'warn' : '';
    const period = c.cost_limit_period || 'lifetime';
    return \`<span title="\${esc(period)} window">\${fmtCost(used)} / \${fmtCost(c.cost_limit_usd)} (\${pct}%)</span>\` +
      \`<span class="limit-bar"><span class="\${cls}" style="width:\${pct}%"></span></span>\`;
  };

  const renderClientsConfig = (clients) => {
    const el = document.getElementById('clientsConfig');
    if (!clients.length) {
      el.innerHTML = '<div class="empty">No clients configured</div>';
      return;
    }
    const rows = clients.map(c => \`
      <tr>
        <td><strong>\${esc(c.name)}</strong></td>
        <td><code class="config-info">\${esc(c.token_preview)}</code></td>
        <td>\${renderLimitCell(c)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button data-edit-limit="\${esc(c.name)}"
                  data-limit="\${c.cost_limit_usd || ''}"
                  data-period="\${esc(c.cost_limit_period || 'lifetime')}">Set limit</button>
          <button class="danger" data-del-client="\${esc(c.name)}">Delete</button>
        </td>
      </tr>\`).join('');
    el.innerHTML = \`
      <table>
        <thead><tr><th>Configured client</th><th>Token</th><th>Cost limit</th><th></th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
    el.querySelectorAll('[data-del-client]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-del-client');
        if (!confirm('Delete client "' + name + '"? This revokes its token immediately.')) return;
        const res = await fetch('/api/clients/' + encodeURIComponent(name), {
          method: 'DELETE', credentials: 'same-origin',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Failed: ' + (err.error || res.status));
          return;
        }
        loadClients();
      });
    });
    el.querySelectorAll('[data-edit-limit]').forEach(btn => {
      btn.addEventListener('click', () => {
        openLimitModal(
          btn.getAttribute('data-edit-limit'),
          btn.getAttribute('data-limit'),
          btn.getAttribute('data-period') || 'lifetime',
        );
      });
    });
  };

  const loadClients = async () => {
    const res = await fetch('/api/clients', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    renderClientsConfig(data.clients || []);
  };

  const showError = (msg) => {
    const el = document.getElementById('cError');
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else { el.style.display = 'none'; }
  };

  const openModal = () => {
    document.getElementById('cName').value = '';
    document.getElementById('cAddr').value = location.host;
    document.getElementById('cScheme').value = location.protocol === 'http:' ? 'http' : 'https';
    document.getElementById('cLimit').value = '';
    document.getElementById('cLimitPeriod').value = 'lifetime';
    showError(null);
    document.getElementById('modalForm').style.display = 'block';
    document.getElementById('modalSuccess').style.display = 'none';
    document.getElementById('addClientModal').style.display = 'flex';
    setTimeout(() => document.getElementById('cName').focus(), 0);
  };
  const closeModal = () => { document.getElementById('addClientModal').style.display = 'none'; };

  const showSuccess = (name) => {
    document.getElementById('modalForm').style.display = 'none';
    const sucEl = document.getElementById('modalSuccess');
    sucEl.style.display = 'block';
    document.getElementById('successName').textContent = name;
    document.getElementById('successFile').textContent = 'cc-' + name;
    document.getElementById('successCmd').textContent =
      'chmod +x cc-' + name + ' && ./cc-' + name;
    document.getElementById('installCmd').textContent =
      'chmod +x cc-' + name + ' && ./cc-' + name + ' install';
    document.getElementById('xattrCmd').textContent =
      'xattr -d com.apple.quarantine cc-' + name;
  };

  const wireCopyButton = (btnId, sourceId) => {
    document.getElementById(btnId).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const text = document.getElementById(sourceId).textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      } catch {
        // fallback: select text
        const range = document.createRange();
        range.selectNodeContents(document.getElementById(sourceId));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  };

  const submitClient = async () => {
    const name = document.getElementById('cName').value.trim();
    const gateway_addr = document.getElementById('cAddr').value.trim();
    const scheme = document.getElementById('cScheme').value;
    const limitRaw = document.getElementById('cLimit').value.trim();
    const cost_limit_usd = limitRaw === '' ? null : Number(limitRaw);
    const cost_limit_period = document.getElementById('cLimitPeriod').value;
    if (!name) { showError('Name is required'); return; }
    if (cost_limit_usd !== null && (!Number.isFinite(cost_limit_usd) || cost_limit_usd < 0)) {
      showError('Cost limit must be a non-negative number'); return;
    }
    const submitBtn = document.getElementById('cSubmit');
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gateway_addr, scheme, cost_limit_usd, cost_limit_period }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showError(err.error || 'Request failed: ' + res.status);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cc-' + name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess(name);
      loadClients();
    } finally {
      submitBtn.disabled = false;
    }
  };

  // ── Set-limit modal ──
  const showLimitError = (msg) => {
    const el = document.getElementById('lError');
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else { el.style.display = 'none'; }
  };
  const openLimitModal = (name, currentLimit, currentPeriod) => {
    document.getElementById('limitName').textContent = name;
    document.getElementById('lLimit').value = currentLimit && Number(currentLimit) > 0 ? currentLimit : '';
    document.getElementById('lPeriod').value = currentPeriod || 'lifetime';
    showLimitError(null);
    document.getElementById('limitModal').style.display = 'flex';
    document.getElementById('limitModal').setAttribute('data-name', name);
    setTimeout(() => document.getElementById('lLimit').focus(), 0);
  };
  const closeLimitModal = () => { document.getElementById('limitModal').style.display = 'none'; };
  const submitLimit = async () => {
    const name = document.getElementById('limitModal').getAttribute('data-name');
    const raw = document.getElementById('lLimit').value.trim();
    const cost_limit_usd = raw === '' ? null : Number(raw);
    const cost_limit_period = document.getElementById('lPeriod').value;
    if (cost_limit_usd !== null && (!Number.isFinite(cost_limit_usd) || cost_limit_usd < 0)) {
      showLimitError('Cost limit must be a non-negative number'); return;
    }
    const btn = document.getElementById('lSubmit');
    btn.disabled = true;
    try {
      const res = await fetch('/api/clients/' + encodeURIComponent(name), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_limit_usd, cost_limit_period }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showLimitError(err.error || 'Request failed: ' + res.status);
        return;
      }
      closeLimitModal();
      loadClients();
    } finally {
      btn.disabled = false;
    }
  };
  document.getElementById('lCancel').addEventListener('click', closeLimitModal);
  document.getElementById('lSubmit').addEventListener('click', submitLimit);
  document.getElementById('limitModal').addEventListener('click', (e) => {
    if (e.target.id === 'limitModal') closeLimitModal();
  });

  document.getElementById('addClientBtn').addEventListener('click', openModal);
  document.getElementById('cCancel').addEventListener('click', closeModal);
  document.getElementById('cSubmit').addEventListener('click', submitClient);
  document.getElementById('successDone').addEventListener('click', closeModal);
  wireCopyButton('copyCmdBtn', 'successCmd');
  wireCopyButton('copyInstallBtn', 'installCmd');
  wireCopyButton('copyXattrBtn', 'xattrCmd');
  document.getElementById('addClientModal').addEventListener('click', (e) => {
    if (e.target.id === 'addClientModal') closeModal();
  });

  // Sidebar nav: highlight the section currently in view and keep page title
  // in sync. Uses IntersectionObserver — much cheaper than scroll listeners.
  const sectionToTitle = {
    'topStats': 'Overview',
    'periods': 'Cost & periods',
    'charts-section': 'Traffic',
    'models': 'By model',
    'clients': 'Clients',
    'recent': 'Recent requests',
    'about': 'How to use',
  };
  const navLinks = Array.from(document.querySelectorAll('#sideNav a'));
  const setActive = (id) => {
    for (const a of navLinks) {
      const target = a.getAttribute('href').slice(1);
      const matchTarget = target === 'charts' ? 'charts-section' : target;
      a.classList.toggle('active', matchTarget === id);
    }
    const title = document.getElementById('pageTitle');
    if (title && sectionToTitle[id]) title.textContent = sectionToTitle[id];
  };
  const observed = ['topStats', 'periods', 'charts-section', 'models', 'clients', 'recent', 'about']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        visible.set(e.target.id, e.intersectionRatio);
      }
      let bestId = null, bestRatio = 0;
      for (const [id, ratio] of visible) {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
      }
      if (bestId) setActive(bestId);
    }, { rootMargin: '-80px 0px -50% 0px', threshold: [0, 0.1, 0.5, 1] });
    for (const el of observed) io.observe(el);
  }

  loadClients();
  refresh();
  setInterval(refresh, 5000);
  setInterval(tickAgoCells, 15000);
})();
</script>
</body>
</html>`
}
