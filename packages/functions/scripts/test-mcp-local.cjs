/**
 * Local validation harness for the hand-rolled MCP transport.
 * Mounts ONLY the compiled mcp router on a bare Express app (no firebase-admin
 * init) and drives the JSON-RPC handshake over HTTP. Throwaway dev tool — not
 * part of the deploy. Run after `npm run build`:  node scripts/test-mcp-local.cjs
 *
 * Stays Firebase-free by design: the protocol path (initialize/tools/list/ping)
 * needs no auth, and tool calls short-circuit BEFORE any Firestore access
 * (unauthenticated → auth error; unknown tool → not-found). The live quota +
 * pipeline paths are validated against the emulator/deploy in Phase 5.
 */
process.env.JK_MCP_DEV_AUTH = '1'; // enable the dev-auth bypass for the unknown-tool check

const express = require('express');
const http = require('http');
const mcpRouter = require('../lib/api/mcp').default;

const app = express();
app.use(express.json());
app.use('/api/mcp', mcpRouter);

const server = app.listen(0, async () => {
  const port = server.address().port;
  let failures = 0;

  function rpc(payload, headers = {}) {
    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      const req = http.request(
        { host: '127.0.0.1', port, path: '/api/mcp', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } },
        (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
        },
      );
      req.write(data);
      req.end();
    });
  }

  function check(label, cond, detail) {
    const mark = cond ? 'PASS' : 'FAIL';
    if (!cond) failures++;
    console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
  }

  console.log('MCP transport local validation\n');

  const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  check('initialize → 200', init.status === 200, `status ${init.status}`);
  check('initialize echoes protocolVersion', init.body?.result?.protocolVersion === '2025-06-18');
  check('initialize advertises tools capability', !!init.body?.result?.capabilities?.tools);
  check('initialize serverInfo.name', init.body?.result?.serverInfo?.name === 'jackpotkeywords');

  const initialized = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  check('initialized notification → 202 no body', initialized.status === 202 && initialized.body === null);

  const list = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const names = (list.body?.result?.tools || []).map((t) => t.name);
  check('tools/list → 200 (no auth needed for discovery)', list.status === 200);
  check('exposes exactly recommend + usage_status', names.length === 2
    && names.includes('jackpotkeywords_recommend') && names.includes('jackpotkeywords_usage_status'),
    `got [${names.join(', ')}]`);
  check('does NOT expose premium tools', !names.some((n) => /deep|aeo|audit/.test(n)));

  // No auth header → tools/call must be rejected with 401 (triggers OAuth
  // discovery via WWW-Authenticate), BEFORE touching Firestore.
  const noAuth = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'jackpotkeywords_recommend', arguments: { description: 'test' } } });
  check('tools/call unauthenticated → 401 unauthorized',
    noAuth.status === 401 && noAuth.body?.error === 'unauthorized',
    `status ${noAuth.status}`);

  // Authed (dev bypass) but unknown tool → not-found, also Firestore-free.
  const unknown = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } },
    { 'x-dev-customer-id': 'test-customer' });
  check('tools/call unknown tool → "Unknown tool" isError',
    unknown.body?.result?.isError === true && /unknown tool/i.test(unknown.body?.result?.content?.[0]?.text || ''),
    JSON.stringify(unknown.body?.result?.content?.[0]?.text));

  const badMethod = await rpc({ jsonrpc: '2.0', id: 5, method: 'does/not/exist' });
  check('unknown method → -32601', badMethod.body?.error?.code === -32601);

  const ping = await rpc({ jsonrpc: '2.0', id: 6, method: 'ping' });
  check('ping → 200 empty result', ping.status === 200 && ping.body?.result && Object.keys(ping.body.result).length === 0);

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
});
