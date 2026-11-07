/** Writes schema/race.schema.json from the zod schema in src/lib/model.ts (run: npm run schema). */
import { writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FileSchema } from "../src/lib/model.ts";

export function buildSchema() {
  const schema = zodToJsonSchema(FileSchema, { name: "OtamasingBroadcastFile", $refStrategy: "none", effectStrategy: "input", target: "jsonSchema7" });
  return JSON.stringify(schema, null, 2) + "\n";
}

if (process.argv[1]?.endsWith("build-schema.ts")) {
  writeFileSync(new URL("../schema/race.schema.json", import.meta.url), buildSchema());
  console.log("wrote schema/race.schema.json");
}
