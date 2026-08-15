import { SCHEMA_SQL } from "./schema.js";

export interface ExecTarget {
  exec(sql: string): unknown;
}

export async function migrate(target: ExecTarget): Promise<void> {
  await target.exec(SCHEMA_SQL);
}
