import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataToBytes, type ObjectStore, type PutOptions } from "../storage/types.js";

export class FsStore implements ObjectStore {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    return `${this.root.replace(/\/+$/, "")}/${key}`;
  }

  async put(key: string, data: string | Uint8Array, opts?: PutOptions): Promise<void> {
    void opts;
    const target = this.resolve(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, dataToBytes(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.resolve(key)));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  async presignGet(key: string): Promise<string> {
    void key;
    throw new Error("presignGet not supported by FsStore (local dev adapter)");
  }
}
