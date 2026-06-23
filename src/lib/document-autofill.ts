export type AutofillField =
  | "carrier"
  | "bookingNumber"
  | "shipperName"
  | "consigneeName"
  | "notifyParty"
  | "cargoDescription"
  | "itemType"
  | "hsCode"
  | "packageCount"
  | "lengthCm"
  | "widthCm"
  | "heightCm"
  | "grossWeightKg"
  | "netWeightKg"
  | "incoterm"
  | "origin"
  | "destination"
  | "containerType"
  | "pol"
  | "pod"
  | "preferredEtd"
  | "preferredEta"
  | "blNumber"
  | "containerNumber";

export type AutofillConfidence = "high" | "medium";

export type AutofillSuggestion = {
  field: AutofillField;
  label: string;
  value: string;
  sourceFileName: string;
  confidence: AutofillConfidence;
};

type FieldSpec = {
  field: AutofillField;
  label: string;
  labels: string[];
  transform?: (value: string) => string;
};

const FIELD_SPECS: FieldSpec[] = [
  {
    field: "carrier",
    label: "Carrier / shipping line",
    labels: ["carrier", "shipping line", "vessel operator", "ocean carrier"],
  },
  {
    field: "bookingNumber",
    label: "Booking number",
    labels: ["booking number", "booking no", "booking ref", "booking reference"],
  },
  {
    field: "shipperName",
    label: "Shipper name",
    labels: ["shipper", "shipper name", "exporter", "seller"],
  },
  {
    field: "consigneeName",
    label: "Consignee name",
    labels: ["consignee", "consignee name", "buyer", "importer"],
  },
  {
    field: "notifyParty",
    label: "Notify party",
    labels: ["notify party", "notify", "notify name"],
  },
  {
    field: "cargoDescription",
    label: "Cargo description",
    labels: ["cargo description", "description of goods", "goods description", "commodity description"],
  },
  {
    field: "itemType",
    label: "Item type",
    labels: ["item type", "commodity", "cargo type", "product type"],
  },
  {
    field: "hsCode",
    label: "HS code",
    labels: ["hs code", "h.s. code", "tariff code", "commodity code"],
    transform: cleanHsCode,
  },
  {
    field: "packageCount",
    label: "Package count",
    labels: ["package count", "packages", "number of packages", "quantity", "qty"],
    transform: cleanInteger,
  },
  {
    field: "lengthCm",
    label: "Length (cm)",
    labels: ["length cm", "length", "l cm"],
    transform: cleanNumber,
  },
  {
    field: "widthCm",
    label: "Width (cm)",
    labels: ["width cm", "width", "w cm"],
    transform: cleanNumber,
  },
  {
    field: "heightCm",
    label: "Height (cm)",
    labels: ["height cm", "height", "h cm"],
    transform: cleanNumber,
  },
  {
    field: "grossWeightKg",
    label: "Gross weight (kg)",
    labels: ["gross weight kg", "gross weight", "gross wt", "gw"],
    transform: cleanNumber,
  },
  {
    field: "netWeightKg",
    label: "Net weight (kg)",
    labels: ["net weight kg", "net weight", "net wt", "nw"],
    transform: cleanNumber,
  },
  {
    field: "incoterm",
    label: "Incoterm",
    labels: ["incoterm", "trade term", "terms"],
    transform: cleanIncoterm,
  },
  {
    field: "origin",
    label: "Origin",
    labels: ["origin", "place of receipt", "from"],
  },
  {
    field: "destination",
    label: "Destination",
    labels: ["destination", "final destination", "place of delivery", "to"],
  },
  {
    field: "containerType",
    label: "Container type",
    labels: ["container type", "equipment type", "equipment"],
    transform: cleanContainerType,
  },
  {
    field: "pol",
    label: "POL",
    labels: ["pol", "port of loading", "load port"],
  },
  {
    field: "pod",
    label: "POD",
    labels: ["pod", "port of discharge", "discharge port"],
  },
  {
    field: "preferredEtd",
    label: "Preferred ETD",
    labels: ["preferred etd", "etd", "estimated departure", "departure date"],
    transform: cleanIsoDate,
  },
  {
    field: "preferredEta",
    label: "Preferred ETA",
    labels: ["preferred eta", "eta", "estimated arrival", "arrival date"],
    transform: cleanIsoDate,
  },
  {
    field: "blNumber",
    label: "B/L number",
    labels: ["b/l number", "bl number", "bill of lading number", "bill of lading no"],
  },
  {
    field: "containerNumber",
    label: "Container number",
    labels: ["container number", "container no", "cntr number", "container"],
  },
];

const MAX_VALUE_LENGTH = 160;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanValue(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[#:\-\s]+/, "")
    .replace(/[;|]+$/, "")
    .trim()
    .slice(0, MAX_VALUE_LENGTH);
}

function cleanNumber(value: string) {
  const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match?.[0] ?? "";
}

function cleanInteger(value: string) {
  const match = value.replace(/,/g, "").match(/\d+/);
  return match?.[0] ?? "";
}

function cleanHsCode(value: string) {
  const match = value.match(/\d{4}(?:[.\-\s]?\d{2}){0,2}/);
  return match?.[0]?.replace(/\s+/g, "") ?? cleanValue(value);
}

function cleanIncoterm(value: string) {
  const match = value.toUpperCase().match(/\b(FOB|CIF|CFR|DAP|EXW|DDP)\b/);
  return match?.[1] ?? "";
}

function cleanContainerType(value: string) {
  const upper = value.toUpperCase();
  const match = upper.match(/\b(20GP|40GP|40HC|40RF|LCL)\b/);
  if (match) {
    return match[1];
  }

  if (/\b40\b.*\bHIGH CUBE\b|\b40\b.*\bHQ\b/.test(upper)) {
    return "40HC";
  }

  if (/\bREEFER\b|\bREFRIGERATED\b/.test(upper)) {
    return "40RF";
  }

  return "";
}

function cleanIsoDate(value: string) {
  const iso = value.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const dayFirst = value.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (dayFirst) {
    return `${dayFirst[3]}-${dayFirst[2].padStart(2, "0")}-${dayFirst[1].padStart(2, "0")}`;
  }

  return "";
}

function readLabeledValue(lines: string[], spec: FieldSpec) {
  const labelPattern = spec.labels.map(escapeRegExp).join("|");
  const directPattern = new RegExp(`^(?:${labelPattern})\\s*(?:name|no\\.|number|ref\\.)?\\s*[:\\-]\\s*(.+)$`, "i");
  const inlinePattern = new RegExp(`\\b(?:${labelPattern})\\b\\s*(?:name|no\\.|number|ref\\.)?\\s*[:\\-]\\s*([^|;]+)`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const directMatch = line.match(directPattern);
    const inlineMatch = line.match(inlinePattern);
    const rawValue = directMatch?.[1] ?? inlineMatch?.[1];

    if (rawValue) {
      return cleanValue(rawValue);
    }

    if (new RegExp(`^(?:${labelPattern})$`, "i").test(line)) {
      const nextLine = lines[index + 1];
      if (nextLine && !nextLine.includes(":")) {
        return cleanValue(nextLine);
      }
    }
  }

  return "";
}

export function extractShipmentFieldsFromText(text: string, sourceFileName: string): AutofillSuggestion[] {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const suggestions: AutofillSuggestion[] = [];
  const seenFields = new Set<AutofillField>();

  for (const spec of FIELD_SPECS) {
    if (seenFields.has(spec.field)) {
      continue;
    }

    const rawValue = readLabeledValue(lines, spec);
    const value = spec.transform ? spec.transform(rawValue) : rawValue;

    if (!value) {
      continue;
    }

    suggestions.push({
      field: spec.field,
      label: spec.label,
      value,
      sourceFileName,
      confidence: "high",
    });
    seenFields.add(spec.field);
  }

  return suggestions;
}

export function isTextExtractableDocument(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return (
    mimeType.startsWith("text/") ||
    ["csv", "json", "md", "txt", "tsv"].includes(extension ?? "") ||
    ["application/json", "application/csv"].includes(mimeType)
  );
}
