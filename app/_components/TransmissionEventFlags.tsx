import type { AstropathicEventMetadata } from "../archive-data";
import { transmissionEventLabels } from "./transmission-event-presentation";

export function TransmissionEventFlags({ event }: { event?: AstropathicEventMetadata }) {
  const labels = transmissionEventLabels(event);
  if (!labels.length) return null;

  return (
    <span className="transmission-event-flags" aria-label={`Transmission conditions: ${labels.join(", ")}`}>
      {labels.map((label) => <b key={label}>{label}</b>)}
    </span>
  );
}
