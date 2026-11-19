import crypto from 'node:crypto';

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  let publicUrl = (process.env.R2_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }

  const isConfigured = Boolean(
    accountId &&
      accessKeyId &&
      secretAccessKey &&
      bucketName &&
      !accountId.startsWith('YOUR_') &&
      !accessKeyId.startsWith('YOUR_') &&
      !secretAccessKey.startsWith('YOUR_')
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    isConfigured,
  };
}

export async function signedR2Request({
  method,
  objectKey,
  bodyBuffer = Buffer.alloc(0),
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

  const payloadHash = sha256Hex(bodyBuffer);

  const headersToSign = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  if (contentType) {
    headersToSign['content-type'] = contentType;
  }
  if (cacheControl) {
    headersToSign['cache-control'] = cacheControl;
  }

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
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, 'utf8')),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

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
        : bodyBuffer,
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const config = getR2Config();

  // GET /api/r2?key=posts/...
  if (req.method === 'GET') {
    const urlObj = new URL(req.url || '/api/r2', 'http://localhost');
    const key = urlObj.searchParams.get('key') || '';

    if (!key) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send(
        JSON.stringify({
          configured: config.isConfigured,
          bucket: config.bucketName || null,
          publicUrl: config.publicUrl || null,
          hasPublicUrl: Boolean(config.publicUrl),
        })
      );
      return;
    }

    if (!config.isConfigured) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(503).send(
        JSON.stringify({
          error:
            'Cloudflare R2 credentials are not configured in environment variables.',
        })
      );
      return;
    }

    try {
      const r2Resp = await signedR2Request({
        method: 'GET',
        objectKey: key,
        config,
      });

      if (!r2Resp.ok) {
        res.status(r2Resp.status).send('Image not found in R2');
        return;
      }

      const contentType = r2Resp.headers.get('content-type') || 'image/webp';
      const arrayBuf = await r2Resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.status(200).send(buffer);
      return;
    } catch (err) {
      console.error('R2 GET error:', err);
      res.status(500).send('Failed to fetch image from Cloudflare R2');
      return;
    }
  }

  // POST /api/r2 -> Upload file (base64Data) OR transfer external URL (sourceUrl) to Cloudflare R2
  if (req.method === 'POST') {
    if (!config.isConfigured) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(503).send(
        JSON.stringify({
          error:
            'Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not set yet.',
        })
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      let {
        fileName = 'story.webp',
        contentType = 'image/webp',
        base64Data = '',
        sourceUrl = '',
        customKey = '',
      } = body;

      let buffer;

      if (sourceUrl && /^https?:\/\//i.test(String(sourceUrl).trim())) {
        const cleanSourceUrl = String(sourceUrl).trim();
        // If already stored in our R2 public URL, return as-is
        if (config.publicUrl && cleanSourceUrl.startsWith(config.publicUrl)) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.status(200).send(
            JSON.stringify({
              url: cleanSourceUrl,
              key: extractKeyFromUrlOrKey(cleanSourceUrl, config.publicUrl),
            })
          );
          return;
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
        buffer = Buffer.from(arrBuf);
      } else {
        const rawStr = String(base64Data || '');
        if (rawStr.startsWith('data:')) {
          const match = rawStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            contentType = match[1];
            buffer = Buffer.from(match[2], 'base64');
          }
        }
        if (!buffer) {
          const cleanBase64 = rawStr.includes(',')
            ? rawStr.split(',')[1]
            : rawStr;
          if (!cleanBase64) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(400).send(JSON.stringify({ error: 'Missing image data.' }));
            return;
          }
          buffer = Buffer.from(cleanBase64, 'base64');
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

      const uniqueSuffix = crypto.randomBytes(4).toString('hex');
      const objectKey = customKey
        ? String(customKey).replace(/^\/+/, '')
        : `posts/${Date.now()}-${uniqueSuffix}-${safeBaseName}.${ext}`;

      const cacheControl = 'public, max-age=31536000, immutable';
      const r2Resp = await signedR2Request({
        method: 'PUT',
        objectKey,
        bodyBuffer: buffer,
        contentType,
        cacheControl,
        config,
      });

      if (!r2Resp.ok) {
        const errText = await r2Resp.text().catch(() => '');
        console.error('Cloudflare R2 PUT failed:', r2Resp.status, errText);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(502).send(
          JSON.stringify({
            error: `Cloudflare R2 upload failed (HTTP ${r2Resp.status}). Verify your R2 bucket name and API token permissions.`,
          })
        );
        return;
      }

      const imageUrl = config.publicUrl
        ? `${config.publicUrl}/${objectKey}`
        : `https://walkathawa.com/api/r2?key=${encodeURIComponent(objectKey)}`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send(
        JSON.stringify({
          url: imageUrl,
          key: objectKey,
        })
      );
      return;
    } catch (err) {
      console.error('R2 upload error:', err);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(500).send(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to upload image to R2.',
        })
      );
      return;
    }
  }

  // DELETE /api/r2 -> Delete image object from Cloudflare R2
  if (req.method === 'DELETE') {
    if (!config.isConfigured) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res
        .status(200)
        .send(JSON.stringify({ deleted: false, reason: 'R2 not configured' }));
      return;
    }

    try {
      const body = await readJsonBody(req);
      const targetKey = extractKeyFromUrlOrKey(
        body.key || body.url || '',
        config.publicUrl
      );

      if (!targetKey) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res
          .status(200)
          .send(JSON.stringify({ deleted: false, reason: 'Not an R2 object key' }));
        return;
      }

      const r2Resp = await signedR2Request({
        method: 'DELETE',
        objectKey: targetKey,
        config,
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send(
        JSON.stringify({
          deleted: r2Resp.ok || r2Resp.status === 204,
          key: targetKey,
        })
      );
      return;
    } catch (err) {
      console.error('R2 delete error:', err);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(500).send(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to delete image from R2.',
        })
      );
      return;
    }
  }

  res.status(405).send('Method Not Allowed');
}
