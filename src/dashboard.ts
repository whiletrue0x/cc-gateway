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
  }
  header {
    padding: 14px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--panel);
  }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; }
  header .meta { color: var(--muted); font-size: 12px; font-family: var(--mono); }
  main { padding: 20px 24px; max-width: 1400px; margin: 0 auto; }
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
<header>
  <h1>CC Gateway · Request Dashboard</h1>
  <div class="toolbar">
    <span class="meta" id="updated">loading…</span>
    <select id="rangeSel">
      <option value="minute">Last 60 min</option>
      <option value="hour">Last 24 h</option>
    </select>
    <button id="refreshBtn">Refresh</button>
    <form action="/logout" method="post" style="display:inline">
      <button type="submit">Logout</button>
    </form>
  </div>
</header>
<main>
  <div class="grid">
    <div class="row" id="topStats"></div>
    <details class="card" id="aboutCard">
      <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">
        How to use this dashboard
      </summary>
      <div style="margin-top:12px;font-size:13px;line-height:1.6;color:var(--fg)">
        <p style="margin:0 0 10px"><strong>Stats row</strong> — totals across the lifetime of this gateway: total requests, active clients (with traffic), errors, and process uptime.</p>
        <p style="margin:0 0 10px"><strong>Requests over time</strong> — per-client traffic. Toggle <em>Last 60 min</em> / <em>Last 24 h</em> in the top-right.</p>
        <p style="margin:0 0 10px"><strong>Clients</strong> — every entry under <code>auth.tokens</code>. Click <strong>+ Add client</strong> to generate a token, append it to <code>config.yaml</code>, and download a launcher script.</p>
        <p style="margin:0 0 10px"><strong>Recent requests</strong> — last 50 requests with status code and duration. Updates every 5 seconds.</p>
        <p style="margin:0">After downloading <code>cc-&lt;name&gt;</code>, send it to the user. They run:</p>
<pre style="background:var(--panel-2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-family:var(--mono);font-size:12px;overflow-x:auto;margin:8px 0 0">chmod +x cc-&lt;name&gt;
./cc-&lt;name&gt; install      # install as 'ccg' system-wide (optional)
./cc-&lt;name&gt;              # or run directly without installing</pre>
      </div>
    </details>
    <div class="card">
      <h2>Requests over time (per client)</h2>
      <div id="charts" class="grid"></div>
    </div>
    <div class="card">
      <h2>
        Clients
        <button id="addClientBtn" style="float:right;margin-top:-4px">+ Add client</button>
      </h2>
      <div id="clientsConfig" style="margin-bottom:12px"></div>
      <div id="clientsTable"></div>
    </div>
    <div class="card">
      <h2>Recent requests</h2>
      <div id="recentTable"></div>
    </div>
  </div>
</main>

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
      <p class="meta" style="margin:14px 0 0;font-size:12px">
        Prerequisites: claude code installed (<code>npm install -g @anthropic-ai/claude-code</code>).
        On macOS, if Gatekeeper blocks the file: <code>xattr -d com.apple.quarantine cc-&lt;name&gt;</code>.
      </p>
      <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
        <button id="successDone" type="button" class="primary">Done</button>
      </div>
    </div>
  </div>
</div>
<script>
(() => {
  const range = () => document.getElementById('rangeSel').value;

  const fmtNum = (n) => n.toLocaleString();
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
        <td><span class="pill ok">\${s.ok} 2xx</span> <span class="pill warn">\${s.warn} 4xx</span> <span class="pill err">\${s.err} 5xx</span></td>
        <td class="num">\${c.avgDurationMs}ms</td>
        <td class="ago">\${fmtAgo(c.lastSeen)}</td>
      </tr>\`;
    }).join('');
    document.getElementById('clientsTable').innerHTML = \`
      <table>
        <thead><tr>
          <th>Client</th><th class="num">Total</th><th>Status</th><th class="num">Avg</th><th>Last seen</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
  };

  const renderRecent = (data) => {
    if (!data.recent.length) {
      document.getElementById('recentTable').innerHTML = '<div class="empty">No requests yet</div>';
      return;
    }
    const rows = data.recent.map(r => {
      const cls = r.status >= 500 ? 'err' : r.status >= 400 ? 'warn' : 'ok';
      return \`<tr>
        <td class="ago">\${fmtAgo(r.ts)}</td>
        <td>\${r.client}</td>
        <td>\${r.method}</td>
        <td class="path" title="\${r.path}">\${r.path}</td>
        <td><span class="pill \${cls}">\${r.status}</span></td>
        <td class="num">\${r.durationMs}ms</td>
      </tr>\`;
    }).join('');
    document.getElementById('recentTable').innerHTML = \`
      <table>
        <thead><tr>
          <th>When</th><th>Client</th><th>Method</th><th>Path</th><th>Status</th><th class="num">Duration</th>
        </tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
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
      renderCharts(currentData);
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
  const renderClientsConfig = (clients) => {
    const el = document.getElementById('clientsConfig');
    if (!clients.length) {
      el.innerHTML = '<div class="empty">No clients configured</div>';
      return;
    }
    const rows = clients.map(c => \`
      <tr>
        <td><strong>\${c.name}</strong></td>
        <td><code class="config-info">\${c.token_preview}</code></td>
        <td style="text-align:right">
          <button class="danger" data-del-client="\${c.name}">Delete</button>
        </td>
      </tr>\`).join('');
    el.innerHTML = \`
      <table>
        <thead><tr><th>Configured client</th><th>Token</th><th></th></tr></thead>
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
    if (!name) { showError('Name is required'); return; }
    const submitBtn = document.getElementById('cSubmit');
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gateway_addr, scheme }),
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

  document.getElementById('addClientBtn').addEventListener('click', openModal);
  document.getElementById('cCancel').addEventListener('click', closeModal);
  document.getElementById('cSubmit').addEventListener('click', submitClient);
  document.getElementById('successDone').addEventListener('click', closeModal);
  wireCopyButton('copyCmdBtn', 'successCmd');
  wireCopyButton('copyInstallBtn', 'installCmd');
  document.getElementById('addClientModal').addEventListener('click', (e) => {
    if (e.target.id === 'addClientModal') closeModal();
  });

  loadClients();
  refresh();
  setInterval(refresh, 5000);
})();
</script>
</body>
</html>`
}
