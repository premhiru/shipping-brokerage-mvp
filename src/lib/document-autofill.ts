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
    .replace(/®/g, "")
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

  const namedMonth = value.match(/\b(0?[1-9]|[12]\d|3[01])[-\s]([A-Za-z]{3,9})[-\s](20\d{2})\b/);
  const monthNumber = namedMonth ? monthNameToNumber(namedMonth[2]) : "";
  if (namedMonth && monthNumber) {
    return `${namedMonth[3]}-${monthNumber}-${namedMonth[1].padStart(2, "0")}`;
  }

  return "";
}

function monthNameToNumber(value: string) {
  const normalized = value.slice(0, 3).toLowerCase();
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  return months[normalized] ?? "";
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

function createSuggestion(
  field: AutofillField,
  value: string,
  sourceFileName: string,
  confidence: AutofillConfidence = "medium",
): AutofillSuggestion | null {
  const label = FIELD_SPECS.find((spec) => spec.field === field)?.label;
  const cleanedValue = cleanValue(value);

  if (!label || !cleanedValue) {
    return null;
  }

  return {
    field,
    label,
    value: cleanedValue,
    sourceFileName,
    confidence,
  };
}

function addSuggestion(
  suggestions: AutofillSuggestion[],
  seenFields: Set<AutofillField>,
  field: AutofillField,
  value: string,
  sourceFileName: string,
  confidence: AutofillConfidence = "medium",
) {
  if (seenFields.has(field)) {
    return;
  }

  const suggestion = createSuggestion(field, value, sourceFileName, confidence);

  if (suggestion) {
    suggestions.push(suggestion);
    seenFields.add(field);
  }
}

function findLineIndex(lines: string[], pattern: RegExp) {
  return lines.findIndex((line) => pattern.test(line));
}

function firstLineAfterHeading(lines: string[], pattern: RegExp) {
  const headingIndex = findLineIndex(lines, pattern);

  if (headingIndex === -1) {
    return "";
  }

  return lines.slice(headingIndex + 1).find((line) => {
    if (/^(export references|phone:|fax:|place of receipt|port of loading|notify party|consignee|forwarding agent)$/i.test(line)) {
      return false;
    }

    return /[A-Za-z]/.test(line);
  }) ?? "";
}

function isLikelyContainerNumber(value: string) {
  return /^[A-Z]{4}\d{7}$/.test(value);
}

function findBillOfLadingNumber(lines: string[], sourceFileName: string) {
  const fileNameMatch = sourceFileName.toUpperCase().match(/\b[A-Z]{2,4}\d{7,}\b/);
  if (fileNameMatch && !isLikelyContainerNumber(fileNameMatch[0])) {
    return fileNameMatch[0];
  }

  for (const line of lines) {
    const candidates = line.toUpperCase().match(/\b[A-Z]{2,4}\d{7,}\b/g) ?? [];
    const billNumber = candidates.find((candidate) => !isLikelyContainerNumber(candidate));

    if (billNumber) {
      return billNumber;
    }
  }

  return "";
}

function splitRepeatedDestination(value: string) {
  const tokens = value.trim().split(/\s+/);

  if (tokens.length >= 2 && tokens.length % 2 === 0) {
    const midpoint = tokens.length / 2;
    const firstHalf = tokens.slice(0, midpoint).join(" ");
    const secondHalf = tokens.slice(midpoint).join(" ");

    if (firstHalf === secondHalf) {
      return [firstHalf, secondHalf] as const;
    }
  }

  const compactMatch = value.match(/^(.+?)\s{2,}(.+)$/);
  if (compactMatch) {
    return [compactMatch[1].trim(), compactMatch[2].trim()] as const;
  }

  return [value.trim(), value.trim()] as const;
}

function extractRouteValues(routeLine: string) {
  const match = routeLine.match(
    /^([A-Z][A-Z .'-]+?,\s*[A-Z][A-Z .'-]+?)\s+([A-Z][A-Z .'-]+?,\s*[A-Z][A-Z .'-]+?)\s+(.+)$/i,
  );

  if (!match) {
    return null;
  }

  const [pod, destination] = splitRepeatedDestination(match[3]);

  return {
    origin: cleanValue(match[1]),
    pol: cleanValue(match[2]),
    pod: cleanValue(pod),
    destination: cleanValue(destination),
  };
}

function findCargoDescription(lines: string[]) {
  const headerIndex = findLineIndex(lines, /description of packages and goods/i);
  const startIndex = headerIndex === -1 ? findLineIndex(lines, /details of cargo/i) : headerIndex;

  if (startIndex === -1) {
    return "";
  }

  for (const line of lines.slice(startIndex + 1)) {
    if (/^(total:|container\s+seals|freight charges)/i.test(line)) {
      return "";
    }

    if (
      /^n\/m\b/i.test(line) ||
      /^package\(s/i.test(line) ||
      /^\)$/i.test(line) ||
      /^\d+\s+package/i.test(line) ||
      /^[\d,.]+\s*(kg|kgs|m3|cbm)\b/i.test(line)
    ) {
      continue;
    }

    if (/[A-Za-z]/.test(line)) {
      return line;
    }
  }

  return "";
}

function hasBillOfLadingSignals(lines: string[], sourceFileName: string) {
  return (
    /bill\s+of\s+lading|b\/l/i.test(sourceFileName) ||
    lines.some((line) =>
      /bill\s+of\s+lading|no\. of original b\/l|shipped on board|container\s+seals|master bill/i.test(line),
    )
  );
}

function addBillOfLadingSuggestions(
  lines: string[],
  suggestions: AutofillSuggestion[],
  seenFields: Set<AutofillField>,
  sourceFileName: string,
) {
  if (!hasBillOfLadingSignals(lines, sourceFileName)) {
    return;
  }

  addSuggestion(suggestions, seenFields, "blNumber", findBillOfLadingNumber(lines, sourceFileName), sourceFileName);
  addSuggestion(
    suggestions,
    seenFields,
    "shipperName",
    firstLineAfterHeading(lines, /shipper\s*\/\s*exporter/i),
    sourceFileName,
  );
  addSuggestion(
    suggestions,
    seenFields,
    "consigneeName",
    firstLineAfterHeading(lines, /^consignee\b/i),
    sourceFileName,
  );
  addSuggestion(
    suggestions,
    seenFields,
    "notifyParty",
    firstLineAfterHeading(lines, /^notify party\b/i),
    sourceFileName,
  );

  const carrierLine = [...lines].reverse().find((line) => /as agent for the carrier/i.test(line));
  addSuggestion(
    suggestions,
    seenFields,
    "carrier",
    carrierLine?.replace(/.*as agent for the carrier\s+/i, "") || lines[0] || "",
    sourceFileName,
  );

  const routeHeaderIndex = findLineIndex(lines, /place of receipt\s+port of loading\s+port of discharge\s+final destination/i);
  const routeValues = routeHeaderIndex === -1 ? null : extractRouteValues(lines[routeHeaderIndex + 1] ?? "");
  if (routeValues) {
    addSuggestion(suggestions, seenFields, "origin", routeValues.origin, sourceFileName);
    addSuggestion(suggestions, seenFields, "pol", routeValues.pol, sourceFileName);
    addSuggestion(suggestions, seenFields, "pod", routeValues.pod, sourceFileName);
    addSuggestion(suggestions, seenFields, "destination", routeValues.destination, sourceFileName);
  }

  addSuggestion(suggestions, seenFields, "cargoDescription", findCargoDescription(lines), sourceFileName);

  const containerLine = lines.find((line) => /\b[A-Z]{4}\d{7}\b/.test(line));
  if (containerLine) {
    const containerNumber = containerLine.match(/\b[A-Z]{4}\d{7}\b/)?.[0] ?? "";
    const containerType = containerLine.match(/\b(20GP|40GP|40HC|40RF|LCL)\b/i)?.[1] ?? "";
    const containerValues = containerLine.match(/\b(20GP|40GP|40HC|40RF|LCL)\b\s+([\d,.]+)\s+([\d,.]+)\s+(\d+)/i);

    addSuggestion(suggestions, seenFields, "containerNumber", containerNumber, sourceFileName);
    addSuggestion(suggestions, seenFields, "containerType", cleanContainerType(containerType), sourceFileName);
    addSuggestion(suggestions, seenFields, "grossWeightKg", containerValues?.[2] ?? "", sourceFileName);
    addSuggestion(suggestions, seenFields, "packageCount", containerValues?.[4] ?? "", sourceFileName);
  }

  const shippedOnBoardIndex = findLineIndex(lines, /no\. of original b\/l\s+shipped on board/i);
  const shippedOnBoardDate = shippedOnBoardIndex === -1 ? "" : cleanIsoDate(lines[shippedOnBoardIndex + 1] ?? "");
  addSuggestion(suggestions, seenFields, "preferredEtd", shippedOnBoardDate, sourceFileName);
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

  addBillOfLadingSuggestions(lines, suggestions, seenFields, sourceFileName);

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

export function isPdfDocument(fileName: string, mimeType: string) {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

export function isExcelDocument(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return (
    ["xls", "xlsx", "xlsm", "xltx", "xltm"].includes(extension ?? "") ||
    [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
      "application/vnd.ms-excel.template.macroEnabled.12",
    ].includes(mimeType)
  );
}
