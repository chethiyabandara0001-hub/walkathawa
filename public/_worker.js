// Self-contained Cloudflare Pages / Workers Advanced Mode entry point (dist/_worker.js)
// Zero external or relative imports so dist/ is 100% standalone on Cloudflare Pages.

const encoder = new TextEncoder();

async function sha256Hex(bytes) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    typeof message === 'string' ? encoder.encode(message) : message
  );
  return new Uint8Array(sig);
}

async function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const kSecret = encoder.encode(`AWS4${secretAccessKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getR2Config(env = {}) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = String(env.R2_BUCKET_NAME || '').trim();
  let publicUrl = String(env.R2_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }

  const nativeBucketBinding =
    env.R2_BUCKET || env.BUCKET || env.WALKATHAWA || null;

  const isConfigured = Boolean(
    nativeBucketBinding ||
      (accountId &&
        accessKeyId &&
        secretAccessKey &&
        bucketName &&
        !accountId.startsWith('YOUR_') &&
        !accessKeyId.startsWith('YOUR_') &&
        !secretAccessKey.startsWith('YOUR_'))
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    nativeBucketBinding,
    isConfigured,
  };
}

async function signedR2Request({
  method,
  objectKey,
  bodyBytes = new Uint8Array(0),
  contentType = '',
  cacheControl = '',
  config,
}) {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = config;
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const encodedKey = objectKey
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
  const canonicalUri = `/${encodeRfc3986(bucketName)}/${encodedKey}`;
  const canonicalQueryString = '';

  const payloadHash = await sha256Hex(bodyBytes);

  const headersToSign = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  if (contentType) headersToSign['content-type'] = contentType;
  if (cacheControl) headersToSign['cache-control'] = cacheControl;

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${String(headersToSign[k]).trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(encoder.encode(canonicalRequest));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const sigBytes = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders = {
    Authorization: authorizationHeader,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) fetchHeaders['Content-Type'] = contentType;
  if (cacheControl) fetchHeaders['Cache-Control'] = cacheControl;

  const endpointUrl = `https://${host}${canonicalUri}`;

  return fetch(endpointUrl, {
    method,
    headers: fetchHeaders,
    body:
      method === 'GET' || method === 'HEAD' || method === 'DELETE'
        ? undefined
        : bodyBytes,
  });
}

function extractKeyFromUrlOrKey(input, publicUrl) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (trimmed.startsWith('posts/')) return trimmed;

  try {
    if (trimmed.includes('/api/r2?key=')) {
      const qs = trimmed.split('/api/r2?key=')[1];
      return decodeURIComponent(qs.split('&')[0]);
    }
    if (publicUrl && trimmed.startsWith(publicUrl)) {
      return trimmed.slice(publicUrl.length).replace(/^\/+/, '');
    }
    const parsed = new URL(trimmed);
    const pathClean = parsed.pathname.replace(/^\/+/, '');
    if (pathClean.startsWith('posts/')) {
      return decodeURIComponent(pathClean);
    }
  } catch {
    // ignore URL parse error
  }
  return '';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleR2Request(request, env) {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const config = getR2Config(env);

  if (method === 'GET') {
    const urlObj = new URL(request.url);
    const key = urlObj.searchParams.get('key') || '';

    if (!key) {
      return new Response(
        JSON.stringify({
          configured: config.isConfigured,
          bucket:
            config.bucketName ||
            (config.nativeBucketBinding ? 'bound-r2-bucket' : null),
          publicUrl: config.publicUrl || null,
          hasPublicUrl: Boolean(config.publicUrl),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({
          error:
            'Cloudflare R2 credentials are not configured in Cloudflare Pages environment variables.',
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.get === 'function'
      ) {
        const obj = await config.nativeBucketBinding.get(key);
        if (!obj) {
          return new Response('Image not found in R2', {
            status: 404,
            headers: corsHeaders,
          });
        }
        const headers = new Headers(corsHeaders);
        obj.writeHttpMetadata(headers);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(obj.body, { status: 200, headers });
      }

      const r2Resp = await signedR2Request({
        method: 'GET',
        objectKey: key,
        config,
      });

      if (!r2Resp.ok) {
        return new Response('Image not found in R2', {
          status: r2Resp.status,
          headers: corsHeaders,
        });
      }

      const contentType = r2Resp.headers.get('content-type') || 'image/webp';
      return new Response(r2Resp.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Failed to fetch from R2',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (method === 'POST') {
    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({
          error:
            'Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not set in Cloudflare Pages.',
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      const body = await request.json();
      let {
        fileName = 'story.webp',
        contentType = 'image/webp',
        base64Data = '',
        sourceUrl = '',
        customKey = '',
      } = body;

      let bodyBytes;

      if (sourceUrl && /^https?:\/\//i.test(String(sourceUrl).trim())) {
        const cleanSourceUrl = String(sourceUrl).trim();
        if (config.publicUrl && cleanSourceUrl.startsWith(config.publicUrl)) {
          return new Response(
            JSON.stringify({
              url: cleanSourceUrl,
              key: extractKeyFromUrlOrKey(cleanSourceUrl, config.publicUrl),
            }),
            {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8',
              },
            }
          );
        }

        const remoteResp = await fetch(cleanSourceUrl);
        if (!remoteResp.ok) {
          throw new Error(
            `Failed to fetch remote image from URL (HTTP ${remoteResp.status}).`
          );
        }
        contentType =
          remoteResp.headers.get('content-type')?.split(';')[0].trim() ||
          'image/jpeg';
        const arrBuf = await remoteResp.arrayBuffer();
        bodyBytes = new Uint8Array(arrBuf);
      } else {
        const rawStr = String(base64Data || '');
        if (rawStr.startsWith('data:')) {
          const match = rawStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            contentType = match[1];
            bodyBytes = base64ToUint8Array(match[2]);
          }
        }
        if (!bodyBytes) {
          const cleanBase64 = rawStr.includes(',')
            ? rawStr.split(',')[1]
            : rawStr;
          if (!cleanBase64) {
            return new Response(
              JSON.stringify({ error: 'Missing image data.' }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json; charset=utf-8',
                },
              }
            );
          }
          bodyBytes = base64ToUint8Array(cleanBase64);
        }
      }

      const ext =
        contentType === 'image/jpeg'
          ? 'jpg'
          : contentType === 'image/png'
          ? 'png'
          : contentType === 'image/gif'
          ? 'gif'
          : 'webp';

      const safeBaseName =
        String(fileName)
          .replace(/\.[^/.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'image';

      const randBytes = new Uint8Array(4);
      crypto.getRandomValues(randBytes);
      const uniqueSuffix = Array.from(randBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const objectKey = customKey
        ? String(customKey).replace(/^\/+/, '')
        : `posts/${Date.now()}-${uniqueSuffix}-${safeBaseName}.${ext}`;
      const cacheControl = 'public, max-age=31536000, immutable';

      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.put === 'function'
      ) {
        await config.nativeBucketBinding.put(objectKey, bodyBytes, {
          httpMetadata: {
            contentType,
            cacheControl,
          },
        });
      } else {
        const r2Resp = await signedR2Request({
          method: 'PUT',
          objectKey,
          bodyBytes,
          contentType,
          cacheControl,
          config,
        });

        if (!r2Resp.ok) {
          const errText = await r2Resp.text().catch(() => '');
          return new Response(
            JSON.stringify({
              error: `Cloudflare R2 upload failed (HTTP ${r2Resp.status}). ${errText.slice(
                0,
                200
              )}`,
            }),
            {
              status: 502,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8',
              },
            }
          );
        }
      }

      const imageUrl = config.publicUrl
        ? `${config.publicUrl}/${objectKey}`
        : `https://walkathawa.com/api/r2?key=${encodeURIComponent(objectKey)}`;

      return new Response(
        JSON.stringify({
          url: imageUrl,
          key: objectKey,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to upload image to R2.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  }

  if (method === 'DELETE') {
    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({ deleted: false, reason: 'R2 not configured' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      const body = await request.json();
      const targetKey = extractKeyFromUrlOrKey(
        body.key || body.url || '',
        config.publicUrl
      );

      if (!targetKey) {
        return new Response(
          JSON.stringify({ deleted: false, reason: 'Not an R2 object key' }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.delete === 'function'
      ) {
        await config.nativeBucketBinding.delete(targetKey);
        return new Response(
          JSON.stringify({ deleted: true, key: targetKey }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      const r2Resp = await signedR2Request({
        method: 'DELETE',
        objectKey: targetKey,
        config,
      });

      return new Response(
        JSON.stringify({
          deleted: r2Resp.ok || r2Resp.status === 204,
          key: targetKey,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to delete image from R2.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Cloudflare R2 API endpoint (/api/r2)
    if (pathname === '/api/r2' || pathname.startsWith('/api/r2/')) {
      return handleR2Request(request, env);
    }

    // 2. robots.txt
    if (pathname === '/robots.txt') {
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      };
      if (request.method.toUpperCase() === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }
      return new Response(
        `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: https://walkathawa.com/sitemap.xml\n`,
        { status: 200, headers }
      );
    }

    // 3. Static assets & pre-generated sitemap.xml
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        if (pathname === '/sitemap.xml') {
          const xmlHeaders = new Headers(assetResponse.headers);
          xmlHeaders.set('Content-Type', 'application/xml; charset=utf-8');
          xmlHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=60');
          return new Response(assetResponse.body, {
            status: assetResponse.status,
            headers: xmlHeaders,
          });
        }
        return assetResponse;
      }

      // 4. SPA Fallback: Serve /index.html for frontend routes (/admin, /posts/*, /categories/*, etc.)
      if (
        request.method.toUpperCase() === 'GET' &&
        !pathname.startsWith('/api/') &&
        !pathname.startsWith('/assets/')
      ) {
        const indexUrl = new URL('/index.html', request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
