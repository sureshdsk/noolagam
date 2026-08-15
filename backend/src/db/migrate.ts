import { SCHEMA_SQL } from "./schema.js";
import type { Db } from "./types.js";

export async function migrate(db: Db): Promise<void> {
  await db.exec(SCHEMA_SQL);
}
