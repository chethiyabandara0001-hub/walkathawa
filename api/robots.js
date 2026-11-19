export function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /?s=

# Allow user-triggered AI search & browsing agents
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Agent
Allow: /

User-agent: MistralAI-User
Allow: /

User-agent: Kimi-User
Allow: /

User-agent: meta-externalfetcher
Allow: /

User-agent: FirecrawlAgent
Allow: /

# Disallow autonomous AI training crawlers & PerplexityBot
User-agent: PerplexityBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://walkathawa.com/sitemap.xml
`;
}

export default function handler(req, res) {
  const body = buildRobotsTxt();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(body);
}
