// Self-contained Cloudflare Pages Function for /robots.txt (zero external dependencies)

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /?s=

Sitemap: https://walkathawa.com/sitemap.xml
`;

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
