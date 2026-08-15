import type { Db } from "../db/types.js";
import type { ObjectStore } from "../storage/types.js";
import { parseEpub, type ParsedEpub } from "../epub/parse.js";
import { buildArtifacts } from "./artifacts.js";
import { manifestKeyOf, publishBook, type PublishResult } from "./publish.js";

export interface ProcessEpubOutcome {
  parsed: ParsedEpub;
  publish: PublishResult;
  artifactCount: number;
}

export async function processEpubBook(
  db: Db,
  store: ObjectStore,
  bytes: Uint8Array,
  bookId: string,
): Promise<ProcessEpubOutcome> {
  const parsed = parseEpub(bytes, bookId);
  const artifacts = buildArtifacts(parsed);
  const manifestJson = artifacts.find((f) => f.path === manifestKeyOf(bookId))!
    .data as string;

  const previousBytes = await store.get(manifestKeyOf(bookId));
  const previousManifest = previousBytes
    ? new TextDecoder().decode(previousBytes)
    : null;

  for (const file of artifacts) {
    await store.put(file.path, file.data, {
      contentType: file.path.endsWith(".json") ? "application/json" : undefined,
    });
  }

  return {
    parsed,
    publish: await publishBook(db, parsed, manifestJson, previousManifest),
    artifactCount: artifacts.length,
  };
}
