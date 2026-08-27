import { describe, expect, it } from "vitest";
import { sigv4Authorization } from "../src/storage/s3.js";

const EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("sigv4 (AWS S3 documentation test vector)", () => {
  it("reproduces the documented example signature", async () => {
    const authorization = await sigv4Authorization(
      {
        method: "GET",
        canonicalUri: "/test.txt",
        canonicalQuery: "",
        headers: {
          host: "examplebucket.s3.amazonaws.com",
          range: "bytes=0-9",
          "x-amz-content-sha256": EMPTY_SHA,
          "x-amz-date": "20130524T000000Z",
        },
        payloadHash: EMPTY_SHA,
      },
      {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1",
        amzDate: "20130524T000000Z",
        datestamp: "20130524",
      },
    );
    expect(authorization).toBe(
      "AWS4-HMAC-SHA256 " +
        "Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
        "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
        "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });
});
