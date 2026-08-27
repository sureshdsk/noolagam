export interface PutOptions {
  contentType?: string;
}

export interface ObjectStore {
  put(key: string, data: string | Uint8Array, opts?: PutOptions): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
  presignGet(key: string, ttlSeconds: number): Promise<string>;
}

export function dataToBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data;
}
