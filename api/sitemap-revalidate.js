import { invalidateSitemapCache } from './sitemap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  invalidateSitemapCache();
  res.status(200).send(JSON.stringify({ ok: true, revalidated: true }));
}
