import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve(
  process.cwd(),
  "prisma",
  "schema.prisma"
);

let schema = fs.readFileSync(
  schemaPath,
  "utf8"
);

const modelMatch = schema.match(
  /model Warranty \{[\s\S]*?\n\}/
);

if (!modelMatch) {
  throw new Error(
    "No se encontro model Warranty en prisma/schema.prisma."
  );
}

let model = modelMatch[0];

const fields = [
  {
    name: "warrantyType",
    line:
      '  warrantyType    String         @default("Estandar")'
  },
  {
    name: "coverage",
    line:
      '  coverage        String         @default("Cobertura general conforme a condiciones comerciales.")'
  },
  {
    name: "nextAction",
    line:
      '  nextAction      String         @default("Dar seguimiento postventa.")'
  }
];

const present = [];
const missing = [];

for (const field of fields) {
  const exists = new RegExp(
    `\\b${field.name}\\s+String\\b`
  ).test(model);

  if (exists) {
    present.push(field.name);
  } else {
    missing.push(field);
  }
}

console.log(
  `WARRANTY_SCHEMA_PRESENT=${present.map((x) => x).join(",") || "NONE"}`
);

console.log(
  `WARRANTY_SCHEMA_MISSING=${missing.map((x) => x.name).join(",") || "NONE"}`
);

if (missing.length === 0) {
  console.log(
    "WARRANTY_SCHEMA_COMPLETE"
  );
  process.exit(0);
}

const responsiblePattern =
  /^(\s*responsible\s+String\s*)$/m;

if (!responsiblePattern.test(model)) {
  throw new Error(
    "No se encontro el campo responsible dentro de Warranty."
  );
}

const insertion = missing
  .map((field) => field.line)
  .join("\n");

model = model.replace(
  responsiblePattern,
  `$1\n${insertion}`
);

schema = schema.replace(
  modelMatch[0],
  model
);

fs.writeFileSync(
  schemaPath,
  schema,
  "utf8"
);

console.log(
  `WARRANTY_SCHEMA_PATCHED=${missing.map((x) => x.name).join(",")}`
);
