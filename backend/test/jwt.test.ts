import { describe, expect, it } from "vitest";
import { signRs256ForTesting, verifyRs256, type SigningJwk } from "../src/http/auth.js";

async function generateRsaJwk(): Promise<{
  publicJwk: Record<string, unknown>;
  privateJwk: SigningJwk;
}> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as Record<
    string,
    unknown
  >;
  const privateJwk = (await crypto.subtle.exportKey(
    "jwk",
    pair.privateKey,
  )) as unknown as SigningJwk;
  return { publicJwk: publicJwk as Record<string, unknown>, privateJwk };
}

describe("verifyRs256", () => {
  it("accepts a valid token and returns claims", async () => {
    const { publicJwk, privateJwk } = await generateRsaJwk();
    const token = await signRs256ForTesting(
      privateJwk,
      { alg: "RS256", kid: "key-1", typ: "JWT" },
      { sub: "user_123", iss: "https://clerk.test", exp: Math.floor(Date.now() / 1000) + 600 },
    );
    const claims = await verifyRs256(token, {
      jwks: [{ ...publicJwk, kid: "key-1", use: "sig" }],
      issuer: "https://clerk.test",
    });
    expect(claims?.sub).toBe("user_123");
  });

  it("rejects expired tokens", async () => {
    const { publicJwk, privateJwk } = await generateRsaJwk();
    const token = await signRs256ForTesting(
      privateJwk,
      { alg: "RS256" },
      { sub: "user_123", exp: Math.floor(Date.now() / 1000) - 10 },
    );
    expect(
      await verifyRs256(token, { jwks: [publicJwk] }),
    ).toBeNull();
  });

  it("rejects wrong issuer", async () => {
    const { publicJwk, privateJwk } = await generateRsaJwk();
    const token = await signRs256ForTesting(
      privateJwk,
      { alg: "RS256" },
      { sub: "user_123", iss: "https://evil.test", exp: Math.floor(Date.now() / 1000) + 600 },
    );
    expect(
      await verifyRs256(token, { jwks: [publicJwk], issuer: "https://clerk.test" }),
    ).toBeNull();
  });

  it("rejects a signature made with a different key", async () => {
    const signer = await generateRsaJwk();
    const other = await generateRsaJwk();
    const token = await signRs256ForTesting(
      signer.privateJwk,
      { alg: "RS256" },
      { sub: "user_123", exp: Math.floor(Date.now() / 1000) + 600 },
    );
    expect(await verifyRs256(token, { jwks: [other.publicJwk] })).toBeNull();
  });

  it("rejects garbage tokens", async () => {
    expect(await verifyRs256("not-a-jwt", { jwks: [] })).toBeNull();
  });
});
