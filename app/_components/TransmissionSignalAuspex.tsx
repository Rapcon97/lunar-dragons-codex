import type { AstropathicEventMetadata } from "../archive-data";
import type { TransmissionAnalysis } from "./relay-transmission";
import { transmissionEventLabels } from "./transmission-event-presentation";

const WARP_FIDELITY_PENALTY: Record<TransmissionAnalysis["warpExposureState"], number> = {
  NEGLIGIBLE: 0,
  MINOR: 2,
  MODERATE: 5,
  ELEVATED: 9,
  SEVERE: 15,
  EXTREMIS: 22,
};

function shortTransmissionId(value: string) {
  return value.length > 18 ? `...${value.slice(-15)}` : value;
}

export function transmissionSignalFidelity(analysis: TransmissionAnalysis) {
  const loss = (analysis.corruptionPercentage * 1.65) + WARP_FIDELITY_PENALTY[analysis.warpExposureState];
  return Math.max(3, Math.min(100, Math.round(100 - loss)));
}

export function transmissionLineageLabel(event?: AstropathicEventMetadata) {
  if (!event?.parentTransmissionId) return "PRIMARY EXLOAD";
  const root = `ROOT ${shortTransmissionId(event.rootTransmissionId)}`;
  if (event.kinds.includes("recovered-fragment") && event.fragment) {
    return `RECOVERED FRAGMENT ${event.fragment.index}/${event.fragment.total} // ${root}`;
  }
  if (event.kinds.includes("duplicate-astropathic-echo")) {
    return `ASTROPATHIC ECHO ${event.ordinal ?? 1} // ${root}`;
  }
  return `DERIVED EXLOAD // ${root}`;
}

function confidenceTone(state: TransmissionAnalysis["triangulationState"]) {
  if (state === "VERIFIED" || state === "CONFIRMED") return "verified";
  if (state === "PROBABLE" || state === "PARTIAL") return "partial";
  return "warning";
}

function warpTone(state: TransmissionAnalysis["warpExposureState"]) {
  if (state === "NEGLIGIBLE" || state === "MINOR") return "verified";
  if (state === "MODERATE" || state === "ELEVATED") return "partial";
  return "warning";
}

export function TransmissionSignalAuspex({
  analysis,
  event,
}: {
  analysis: TransmissionAnalysis;
  event?: AstropathicEventMetadata;
}) {
  const eventLabels = transmissionEventLabels(event);
  const fidelity = transmissionSignalFidelity(analysis);
  const signalState = eventLabels[0] ?? (fidelity >= 90 ? "SIGNAL COHERENT" : fidelity >= 70 ? "SIGNAL DEGRADED" : "SIGNAL COMPROMISED");

  return (
    <details className="transmission-signal-auspex" open>
      <summary>
        <span><i aria-hidden="true" />SIGNAL AUSPEX // RELIQUARIUM {analysis.reliquariumNumber}</span>
        <b data-tone={eventLabels.length || fidelity < 70 ? "warning" : fidelity < 90 ? "partial" : "verified"}>{signalState}</b>
      </summary>
      <div className="transmission-signal-grid">
        <div className="signal-source-fix">
          <small>PROBABLE ORIGIN</small>
          <strong>{analysis.probableOriginLabel}</strong>
          <span>{analysis.originBasis.replaceAll("-", " ").toUpperCase()}</span>
        </div>
        <div>
          <small>TRIANGULATION</small>
          <strong data-tone={confidenceTone(analysis.triangulationState)}>{analysis.triangulationState}</strong>
        </div>
        <div>
          <small>CIPHER AUTHORITY</small>
          <strong>{analysis.clearanceGrade} // {analysis.encryptionProtocol}</strong>
        </div>
        <div>
          <small>RELAY PATH</small>
          <strong>{analysis.relayPathLabel}</strong>
        </div>
        <div>
          <small>WARP EXPOSURE</small>
          <strong data-tone={warpTone(analysis.warpExposureState)}>{analysis.warpExposureState}</strong>
        </div>
        <div>
          <small>SIGNAL LINEAGE</small>
          <strong>{transmissionLineageLabel(event)}</strong>
        </div>
      </div>
      <div className="transmission-signal-fidelity">
        <span><small>SIGNAL FIDELITY</small><b>{fidelity}%</b></span>
        <i aria-hidden="true"><b style={{ width: `${fidelity}%` }} /></i>
        <span><small>GLYPH LOSS</small><b>{analysis.corruptionPercentage.toFixed(2)}% // {analysis.corruptionPattern}</b></span>
      </div>
      {eventLabels.length > 0 && (
        <div className="transmission-signal-events" aria-label={`Transmission anomalies: ${eventLabels.join(", ")}`}>
          <small>ANOMALY REGISTER</small>
          {eventLabels.map((label) => <b key={label}>{label}</b>)}
        </div>
      )}
    </details>
  );
}
