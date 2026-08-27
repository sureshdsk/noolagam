export interface JwtClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  [key: string]: unknown;
}

export type SigningJwk = {
  kty: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  kid?: string;
  use?: string;
  alg?: string;
  key_ops?: string[];
  ext?: boolean;
  [key: string]: unknown;
};

export interface VerifyOptions {
  jwks: Record<string, unknown>[];
  issuer?: string;
  audience?: string;
  now?: number;
}

function b64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64UrlToJson<T>(input: string): T {
  return JSON.parse(new TextDecoder().decode(b64UrlToBytes(input))) as T;
}

function b64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function findKey(
  jwks: Record<string, unknown>[],
  kid: string | undefined,
): Record<string, unknown> | null {
  const keys = jwks.filter((k) => k.kty === "RSA" && (k.use === undefined || k.use === "sig"));
  if (kid === undefined) {
    return keys[0] ?? null;
  }
  return keys.find((k) => k.kid === kid) ?? null;
}

export async function verifyRs256(
  token: string,
  opts: VerifyOptions,
): Promise<JwtClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  let header: { alg?: string; kid?: string };
  let claims: JwtClaims;
  try {
    header = b64UrlToJson<{ alg?: string; kid?: string }>(headerPart);
    claims = b64UrlToJson<JwtClaims>(payloadPart);
  } catch {
    return null;
  }
  if (header.alg !== "RS256") return null;

  const jwk = findKey(opts.jwks, header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk as unknown as SigningJwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64UrlToBytes(signaturePart) as unknown as ArrayBuffer,
    data as unknown as ArrayBuffer,
  );
  if (!valid) return null;

  const now = opts.now ?? Date.now() / 1000;
  if (claims.exp !== undefined && claims.exp <= now) return null;
  if (opts.issuer !== undefined && claims.iss !== opts.issuer) return null;
  if (opts.audience !== undefined) {
    const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!auds.includes(opts.audience)) return null;
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) return null;

  return claims;
}

export async function signRs256ForTesting(
  signingJwk: SigningJwk,
  header: Record<string, unknown>,
  claims: Record<string, unknown>,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    signingJwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const headerPart = b64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadPart = b64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${headerPart}.${payloadPart}`) as unknown as ArrayBuffer,
  );
  return `${headerPart}.${payloadPart}.${b64UrlEncode(new Uint8Array(signature))}`;
}

export class JwksClient {
  private keys: Record<string, unknown>[] | null = null;
  private fetchedAt = 0;

  constructor(
    private readonly url: string,
    private readonly ttlMs = 5 * 60_000,
  ) {}

  async getKeys(): Promise<Record<string, unknown>[]> {
    if (this.keys && Date.now() - this.fetchedAt < this.ttlMs) return this.keys;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const body = (await res.json()) as { keys?: Record<string, unknown>[] };
    this.keys = body.keys ?? [];
    this.fetchedAt = Date.now();
    return this.keys;
  }
}
