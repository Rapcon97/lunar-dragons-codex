import type { AstropathicEventKind, AstropathicEventMetadata } from "../archive-data";

const EVENT_LABELS: Partial<Record<AstropathicEventKind, string>> = {
  "delayed-arrival": "DELAYED EXLOAD",
  "out-of-order-arrival": "SEQUENCE ANOMALY",
  "failed-relay-node": "RELAY FAILURE",
  "contradictory-timestamp": "CHRONO-CONTRADICTION",
  "future-dated": "FUTURE-DATED SOURCE CLAIM",
  "duplicate-astropathic-echo": "ASTROPATHIC ECHO",
};

type EventPresentationSource = {
  receivedAt?: string;
  event?: AstropathicEventMetadata;
};

function terminalTimestamp(value: string | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNRECOVERED";
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", "Z");
}

export function transmissionEventLabels(event?: AstropathicEventMetadata) {
  if (!event) return [];
  return event.kinds.flatMap((kind) => {
    if (kind === "partial-transmission" && event.fragment) {
      return ["PARTIAL TRANSMISSION", `FRAGMENT ${romanNumeral(event.fragment.index)}/${romanNumeral(event.fragment.total)}`];
    }
    if (kind === "recovered-fragment" && event.fragment) {
      return [`RECOVERED FRAGMENT ${romanNumeral(event.fragment.index)}/${romanNumeral(event.fragment.total)}`];
    }
    return EVENT_LABELS[kind] ? [EVENT_LABELS[kind]!] : [];
  });
}

/** Shared protected event readout for Command and dedicated Relay streams. */
export function transmissionEventAnalysisLines(source: EventPresentationSource, rootReliquariumNumber?: string) {
  const event = source.event;
  if (!event) return [];
  const kinds = new Set(event.kinds);
  const lines: string[] = [];

  if (kinds.has("delayed-arrival")) {
    lines.push("> Delivery condition: DELAYED EXLOAD");
    lines.push(`> Nominal receipt: ${terminalTimestamp(event.nominalReceivedAt)}`);
    lines.push(`> Actual receipt: ${terminalTimestamp(source.receivedAt)}`);
  }
  if (kinds.has("out-of-order-arrival")) lines.push("> Sequence integrity: OUT-OF-ORDER ARRIVAL");
  if (kinds.has("failed-relay-node")) lines.push("> Relay-node condition: FAILED // NODE IDENT UNRECOVERED");
  if (kinds.has("contradictory-timestamp")) {
    lines.push(`> Claimed data-stamp: ${terminalTimestamp(event.claimedAt)}`);
    lines.push(`> Conflicting data-stamp: ${terminalTimestamp(event.conflictingClaimedAt)}`);
  }
  if (kinds.has("future-dated")) {
    lines.push(`> Claimed data-stamp: ${terminalTimestamp(event.claimedAt)} // FUTURE-DATED SOURCE CLAIM`);
  }
  if (kinds.has("partial-transmission") && event.fragment) {
    lines.push("> Exload integrity: PARTIAL TRANSMISSION");
    lines.push(`> Fragment register: ${romanNumeral(event.fragment.index)}/${romanNumeral(event.fragment.total)}`);
  }
  if (kinds.has("recovered-fragment") && event.fragment) {
    lines.push(`> Exload integrity: RECOVERED FRAGMENT ${romanNumeral(event.fragment.index)}/${romanNumeral(event.fragment.total)}`);
    if (rootReliquariumNumber) lines.push(`> ROOT TRANSMISSION: ${rootReliquariumNumber}`);
  }
  if (kinds.has("duplicate-astropathic-echo")) {
    lines.push("> Empyric condition: ASTROPATHIC ECHO // REPEATED THOUGHT-FORM");
    if (rootReliquariumNumber) lines.push(`> ROOT TRANSMISSION: ${rootReliquariumNumber}`);
  }
  return lines;
}

function romanNumeral(value: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][value - 1] ?? String(value);
}
