import { dataToBytes, type ObjectStore, type PutOptions } from "./types.js";

const encoder = new TextEncoder();
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function s3ConfigFromEnv(env: Record<string, string | undefined>): S3Config | null {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return {
    endpoint: S3_ENDPOINT.replace(/\/+$/, ""),
    region: S3_REGION || "auto",
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  };
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return new Uint8Array(sig);
}

export function awsUriEncode(value: string, encodeSlash = true): string {
  let out = "";
  for (const ch of value) {
    if (/[A-Za-z0-9\-._~]/.test(ch)) {
      out += ch;
    } else if (ch === "/" && !encodeSlash) {
      out += "/";
    } else {
      for (const b of encoder.encode(ch)) {
        out += `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
      }
    }
  }
  return out;
}

export interface SigV4Input {
  method: string;
  canonicalUri: string;
  canonicalQuery: string;
  headers: Record<string, string>;
  payloadHash: string;
}

export interface SigV4Context {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  amzDate: string;
  datestamp: string;
}

function canonicalHeadersOf(headers: Record<string, string>): {
  canonicalHeaders: string;
  signedHeaders: string;
} {
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]!.trim()}\n`).join("");
  return { canonicalHeaders, signedHeaders: names.join(";") };
}

export async function sigv4Authorization(
  input: SigV4Input,
  ctx: SigV4Context,
): Promise<string> {
  const { canonicalHeaders, signedHeaders } = canonicalHeadersOf(input.headers);
  const canonicalRequest = [
    input.method,
    input.canonicalUri,
    input.canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");

  const scope = `${ctx.datestamp}/${ctx.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    ctx.amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(encoder.encode(`AWS4${ctx.secretAccessKey}`), ctx.datestamp);
  const kRegion = await hmac(kDate, ctx.region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  return `AWS4-HMAC-SHA256 Credential=${ctx.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function amzDates(now: Date): { amzDate: string; datestamp: string } {
  const iso = now.toISOString();
  const datestamp = iso.slice(0, 10).replace(/-/g, "");
  const amzDate = `${datestamp}T${iso.slice(11, 19).replace(/:/g, "")}Z`;
  return { amzDate, datestamp };
}

export class S3Store implements ObjectStore {
  constructor(private readonly cfg: S3Config) {}

  private objectUrl(key: string): URL {
    const base = `${this.cfg.endpoint}/${this.cfg.bucket}/${awsUriEncode(key, false)}`;
    return new URL(base);
  }

  private canonicalUri(key: string): string {
    return `/${this.cfg.bucket}/${awsUriEncode(key, false)}`;
  }

  private async request(
    method: "GET" | "PUT" | "HEAD",
    key: string,
    body?: Uint8Array,
    contentType?: string,
  ): Promise<Response> {
    const url = this.objectUrl(key);
    const { amzDate, datestamp } = amzDates(new Date());
    const payloadHash = body ? await sha256Hex(body) : await sha256Hex("");
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (body && contentType) headers["content-type"] = contentType;

    const authorization = await sigv4Authorization(
      {
        method,
        canonicalUri: this.canonicalUri(key),
        canonicalQuery: "",
        headers,
        payloadHash,
      },
      { ...this.cfg, amzDate, datestamp },
    );

    const init: RequestInit = {
      method,
      headers: { ...headers, authorization },
    };
    if (body) init.body = body;
    return fetch(url, init);
  }

  async put(key: string, data: string | Uint8Array, opts?: PutOptions): Promise<void> {
    const body = dataToBytes(data);
    const res = await this.request("PUT", key, body, opts?.contentType);
    if (!res.ok) throw new Error(`S3 PUT ${key} failed: ${res.status} ${await res.text()}`);
  }

  async get(key: string): Promise<Uint8Array | null> {
    const res = await this.request("GET", key);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 GET ${key} failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.request("HEAD", key);
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`S3 HEAD ${key} failed: ${res.status}`);
    return true;
  }

  async presignGet(key: string, ttlSeconds: number): Promise<string> {
    const url = this.objectUrl(key);
    const { amzDate, datestamp } = amzDates(new Date());
    const scope = `${datestamp}/${this.cfg.region}/s3/aws4_request`;
    const query = new Map<string, string>([
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", `${this.cfg.accessKeyId}/${scope}`],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(ttlSeconds)],
      ["X-Amz-SignedHeaders", "host"],
    ]);
    const canonicalQuery = [...query.entries()]
      .map(([k, v]) => `${awsUriEncode(k)}=${awsUriEncode(v)}`)
      .sort()
      .join("&");

    const authorization = await sigv4Authorization(
      {
        method: "GET",
        canonicalUri: this.canonicalUri(key),
        canonicalQuery,
        headers: { host: url.host },
        payloadHash: UNSIGNED_PAYLOAD,
      },
      { ...this.cfg, amzDate, datestamp },
    );
    const signature = /Signature=([0-9a-f]+)$/.exec(authorization)?.[1] ?? "";
    url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
    return url.toString();
  }
}
