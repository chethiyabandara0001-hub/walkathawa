import { buildSitemapXml } from '../api/sitemap.js';

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  const xml = await buildSitemapXml();

  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=60',
    'Access-Control-Allow-Origin': '*',
  };

  if (method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  return new Response(xml, { status: 200, headers });
}
