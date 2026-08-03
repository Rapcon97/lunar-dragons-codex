export type PlanetTypeRecord = {
  sort_order: string;
  id: string;
  name: string;
  aliases: string;
  classification_group: string;
  faction: string;
  formal_class_code: string;
  technical_status: string;
  object_type: string;
  description: string;
  notes: string;
  source_url: string;
};

export type PlanetArchetype =
  | "temperate"
  | "hive"
  | "dead"
  | "ocean-ice"
  | "volcanic"
  | "fortress-shrine"
  | "forge"
  | "tomb"
  | "gas-giant"
  | "bio-corrupted";

function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function parsePlanetTypes(source: string): PlanetTypeRecord[] {
  const [headers = [], ...rows] = parseCsvRows(source);
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])) as PlanetTypeRecord)
    .filter((record) => record.id && record.name);
}

export function planetTypeFamily(record: PlanetTypeRecord) {
  return record.classification_group.split(/\s+—\s+/)[0] || "Other";
}

export function planetArchetypeFor(value: Partial<PlanetTypeRecord> | string): PlanetArchetype {
  const source = typeof value === "string"
    ? value.toLowerCase()
    : `${value.id ?? ""} ${value.name ?? ""} ${value.classification_group ?? ""} ${value.faction ?? ""}`.toLowerCase();

  if (/\b(hive|capital|civilised|administratum|scribe|scriptorum|merchant|port)\b/.test(source)) return "hive";
  if (/\b(forge|mechanicus|industrial|munition|armoury|mining|quarry|battery|hell forge|scrap|spoil|salvage|tallow)\b/.test(source)) return "forge";
  if (/\b(necron|tomb world|cache world|artificial world|craftworld)\b/.test(source)) return "tomb";
  if (/\b(tyranid|larder world|bio|organic)\b/.test(source)) return "bio-corrupted";
  if (/\b(gas giant)\b/.test(source)) return "gas-giant";
  if (/\b(fortress|garrison|sentinel|warden|anchor|linchpin|war world|knight|shrine|cardinal|penitent|sepulchre|cemetery|relic|sanctuary|astartes|fief|homeworld|recruiting|defense|bastion|monastery|pilgrim)\b/.test(source)) return "fortress-shrine";
  if (/\b(daemon|chaos|crone|membrane|lava|molten|ork|fallen)\b/.test(source)) return "volcanic";
  if (/\b(dead|waste|abandoned|derelict|husk|rad-soaked|quarantined|ghost|desert|asteroid|planetoid|wreck|shadow|shattered|unclassified)\b/.test(source)) return "dead";
  if (/\b(ice|ocean|moon|frozen|cold)\b/.test(source)) return "ocean-ice";
  return "temperate";
}

export function planetThumbnailUrl(value: Partial<PlanetTypeRecord> | string) {
  return `/planet-thumbnails/${planetArchetypeFor(value)}.png`;
}
