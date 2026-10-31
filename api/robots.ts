export default function handler(req: any, res: any) {
  const origin = 'https://walkathawa.com';

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
