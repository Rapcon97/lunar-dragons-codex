import type { AstropathicEventKind, AstropathicEventMetadata } from "../archive-data";

const EVENT_LABELS: Partial<Record<AstropathicEventKind, string>> = {
  "delayed-arrival": "DELAYED EXLOAD",
  "out-of-order-arrival": "SEQUENCE ANOMALY",
  "failed-relay-node": "RELAY FAILURE",
  "contradictory-timestamp": "CHRONO-CONTRADICTION",
  "future-dated": "FUTURE-DATED SOURCE CLAIM",
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
  return event.kinds.flatMap((kind) => EVENT_LABELS[kind] ? [EVENT_LABELS[kind]!] : []);
}

/** Shared protected event readout for Command and dedicated Relay streams. */
export function transmissionEventAnalysisLines(source: EventPresentationSource) {
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
  return lines;
}

