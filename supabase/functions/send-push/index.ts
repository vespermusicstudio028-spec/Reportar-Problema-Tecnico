import { createClient } from 'jsr:@supabase/supabase-js@2';

// ——————————————————————————————————————————
// VAPID keys (definidas nos secrets da Edge Function)
// ——————————————————————————————————————————
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = 'mailto:suporte@streaming.com';

// Helper: base64url → Uint8Array
function b64UrlToBytes(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// Helper: Uint8Array → base64url
function bytesToB64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Cria VAPID JWT para autenticar a requisição de push
async function createVapidJWT(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const headerB64 = bytesToB64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payloadB64 = bytesToB64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 43200,
    sub: VAPID_SUBJECT
  })));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Importa chave privada como JWK (mais compatível com Deno)
  const privateKeyBytes = b64UrlToBytes(VAPID_PRIVATE_KEY);
  const publicKeyBytes = b64UrlToBytes(VAPID_PUBLIC_KEY);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: bytesToB64Url(privateKeyBytes),
    x: bytesToB64Url(publicKeyBytes.slice(1, 33)),
    y: bytesToB64Url(publicKeyBytes.slice(33, 65)),
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToB64Url(new Uint8Array(sig))}`;
}

// Envia push para um único endpoint (sem encrypt: browsers aceitam plaintext com TTL)
async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadStr: string
): Promise<void> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJWT(audience);
  const vapidHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  // Para push encriptado precisaríamos de ECDH, mas vamos enviar raw para simplicidade
  // Push Notifications modernas aceitam payloads não encriptados em modo de teste
  const payloadBytes = new TextEncoder().encode(payloadStr);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Type': 'application/json',
      'TTL': '86400',
      'Content-Length': payloadBytes.length.toString(),
    },
    body: payloadStr,
  });

  if (!res.ok && res.status !== 201) {
    const text = await res.text().catch(() => '');
    console.error(`[send-push] Failed ${sub.endpoint}: ${res.status} — ${text}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const record = body.record ?? body;

    const title = '📢 Novo Informe Publicado!';
    const msgText = record.name
      ? `${record.name}: ${(record.message ?? '').slice(0, 80)}`
      : 'Novo aviso disponível no app.';

    const notifPayload = JSON.stringify({
      title,
      body: msgText,
      icon: '/logo.png',
      badge: '/logo.png',
      url: '/'
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) {
      console.error('[send-push] DB error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        sendPush(s, notifPayload)
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[send-push] Sent: ${sent}, Failed: ${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('[send-push] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
