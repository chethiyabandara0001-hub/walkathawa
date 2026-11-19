export const SITE_ORIGIN = 'https://walkathawa.com';
export const DEFAULT_INDEXNOW_KEY = '7c9e4b2a1f8d6035e2c4a9b18f3d5a72';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export function getIndexNowKey(env = process.env) {
  return String(env?.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim();
}

export function normalizeIndexNowUrls(urls = []) {
  const unique = new Set();
  for (const raw of Array.isArray(urls) ? urls : [urls]) {
    if (!raw || typeof raw !== 'string') continue;
    try {
      const parsed = new URL(raw, SITE_ORIGIN);
      const cleanPath =
        parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '') || '/';
      if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) continue;
      unique.add(`${SITE_ORIGIN}${cleanPath}`);
    } catch {
      // skip invalid URLs
    }
  }
  return Array.from(unique).slice(0, 100);
}

export async function submitToIndexNow(urls, { key, fetchFn = fetch } = {}) {
  const indexNowKey = String(key || getIndexNowKey()).trim();
  const urlList = normalizeIndexNowUrls(urls);
  if (!indexNowKey || urlList.length === 0) {
    return { ok: false, skipped: true, status: 400, urlCount: 0 };
  }

  const payload = {
    host: 'walkathawa.com',
    key: indexNowKey,
    keyLocation: `${SITE_ORIGIN}/${indexNowKey}.txt`,
    urlList,
  };

  try {
    const resp = await fetchFn(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return {
      ok: resp.ok || resp.status === 200 || resp.status === 202,
      status: resp.status,
      urlCount: urlList.length,
      urlList,
    };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      urlCount: urlList.length,
      error: err instanceof Error ? err.message : 'IndexNow request failed',
    };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res
      .status(405)
      .send(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
  }

  let bodyObj = {};
  if (req.body && typeof req.body === 'object') {
    bodyObj = req.body;
  } else {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw) bodyObj = JSON.parse(raw);
    } catch {
      bodyObj = {};
    }
  }

  const urls = Array.isArray(bodyObj.urls)
    ? bodyObj.urls
    : bodyObj.url
    ? [bodyObj.url]
    : [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/posts`];

  const result = await submitToIndexNow(urls);
  return res.status(result.ok ? 200 : 202).send(JSON.stringify(result));
}
