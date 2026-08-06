const CACHE_KEY = 'futures:v1';
const FRESH_FOR_MS = 15 * 60 * 1000;
const MOEX_ENDPOINT = 'https://iss.moex.com/iss/engines/futures/markets/forts/boards/RFUD/securities.json';
const COLUMNS = ['SECID', 'SHORTNAME', 'LASTTRADEDATE', 'MINSTEP', 'STEPPRICE', 'INITIALMARGIN', 'PREVSETTLEPRICE', 'ASSETCODE'];

const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function jsonResponse(payload, status = 200, state = 'fresh') {
  return new Response(JSON.stringify({ ...payload, status: state }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Aristocks-Data': state,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function fetchPage(start) {
  const url = new URL(MOEX_ENDPOINT);
  url.searchParams.set('iss.meta', 'off');
  url.searchParams.set('iss.only', 'securities,securities.cursor');
  url.searchParams.set('securities.columns', COLUMNS.join(','));
  url.searchParams.set('securities.start', String(start));
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Aristocks futures calculator/2.0' },
    cf: { cacheEverything: true, cacheTtl: 300 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`MOEX returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.securities?.columns || !Array.isArray(payload.securities.data)) {
    throw new Error('MOEX response has no securities table');
  }
  return payload;
}

function rowsToObjects(block) {
  const positions = Object.fromEntries(block.columns.map((column, index) => [column, index]));
  return block.data.map(row => Object.fromEntries(COLUMNS.map(column => [column, row[positions[column]]])));
}

function cursorInfo(payload, firstPageSize) {
  const cursor = payload['securities.cursor'];
  if (!cursor?.columns || !cursor.data?.[0]) return { total: firstPageSize, pageSize: firstPageSize };
  const positions = Object.fromEntries(cursor.columns.map((column, index) => [column, index]));
  return {
    total: asNumber(cursor.data[0][positions.TOTAL]) || firstPageSize,
    pageSize: asNumber(cursor.data[0][positions.PAGESIZE]) || firstPageSize,
  };
}

async function loadAllRows() {
  const first = await fetchPage(0);
  const firstRows = rowsToObjects(first.securities);
  if (!firstRows.length) throw new Error('MOEX returned an empty contract list');
  const { total, pageSize } = cursorInfo(first, firstRows.length);
  const starts = [];
  for (let start = pageSize; start < total; start += pageSize) starts.push(start);
  const remaining = await Promise.all(starts.map(fetchPage));
  return firstRows.concat(remaining.flatMap(payload => rowsToObjects(payload.securities)));
}

function normalize(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map();
  for (const row of rows) {
    const contract = {
      secid: String(row.SECID || '').trim(),
      name: String(row.SHORTNAME || row.SECID || '').trim(),
      assetCode: String(row.ASSETCODE || '').trim(),
      expiry: String(row.LASTTRADEDATE || '').slice(0, 10),
      minStep: asNumber(row.MINSTEP),
      stepPrice: asNumber(row.STEPPRICE),
      margin: asNumber(row.INITIALMARGIN),
      price: asNumber(row.PREVSETTLEPRICE),
    };
    if (!contract.secid || !contract.expiry || contract.expiry < today) continue;
    if (contract.minStep <= 0 || contract.stepPrice <= 0 || contract.margin <= 0) continue;
    unique.set(contract.secid, contract);
  }
  return [...unique.values()].sort((a, b) => a.expiry.localeCompare(b.expiry, 'ru') || a.secid.localeCompare(b.secid, 'ru'));
}

async function refreshData(env) {
  const contracts = normalize(await loadAllRows());
  if (contracts.length < 20) throw new Error(`Only ${contracts.length} valid contracts received`);
  const document = {
    source: 'MOEX ISS',
    updatedAt: new Date().toISOString(),
    count: contracts.length,
    contracts,
  };
  await env.FUTURES_CACHE.put(CACHE_KEY, JSON.stringify(document));
  return document;
}

async function futuresResponse(env, ctx) {
  const cached = await env.FUTURES_CACHE.get(CACHE_KEY, 'json');
  if (!cached) {
    try {
      return jsonResponse(await refreshData(env));
    } catch (error) {
      return jsonResponse({ error: 'Futures data is temporarily unavailable' }, 503, 'unavailable');
    }
  }

  const updatedAt = new Date(cached.updatedAt).getTime();
  const fresh = Number.isFinite(updatedAt) && Date.now() - updatedAt < FRESH_FOR_MS;
  if (!fresh) ctx.waitUntil(refreshData(env).catch(error => console.error('MOEX refresh failed', error)));
  return jsonResponse(cached, 200, fresh ? 'fresh' : 'refreshing');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/futures') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      }
      const response = await futuresResponse(env, ctx);
      return request.method === 'HEAD'
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }
    if (url.pathname.startsWith('/api/')) return jsonResponse({ error: 'Not found' }, 404, 'unavailable');
    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshData(env).catch(error => console.error('Scheduled MOEX refresh failed', error)));
  },
};
