import { dataToBytes, type ObjectStore, type PutOptions } from "./types.js";

export class MemoryStore implements ObjectStore {
  private readonly files = new Map<string, Uint8Array>();
  private readonly types = new Map<string, string>();

  async put(key: string, data: string | Uint8Array, opts?: PutOptions): Promise<void> {
    this.files.set(key, dataToBytes(data));
    if (opts?.contentType) this.types.set(key, opts.contentType);
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.files.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  async presignGet(key: string): Promise<string> {
    void key;
    throw new Error("presignGet not supported by MemoryStore");
  }

  keys(): string[] {
    return [...this.files.keys()];
  }
}
