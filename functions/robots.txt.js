import { buildRobotsTxt } from '../api/robots.js';

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  const body = buildRobotsTxt();

  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Access-Control-Allow-Origin': '*',
  };

  if (method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  return new Response(body, { status: 200, headers });
}
