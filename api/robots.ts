export default function handler(req: any, res: any) {
  const rawProto = req.headers?.['x-forwarded-proto'] || 'https';
  const proto = String(rawProto).split(',')[0].trim() || 'https';
  const rawHost =
    req.headers?.['x-forwarded-host'] ||
    req.headers?.host ||
    'walkathawa.vercel.app';
  const host = String(rawHost).split(',')[0].trim();
  const origin = `${proto}://${host}`;

  const body = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${origin}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(body);
}
