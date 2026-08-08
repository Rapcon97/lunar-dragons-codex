import type { AstropathicEventMetadata } from "../archive-data";
import type { AstropathicRecordPresentation } from "./astropathic-record";
import type { TransmissionAnalysis } from "./relay-transmission";
import { transmissionEventLabels } from "./transmission-event-presentation";

function shortTransmissionId(value: string) {
  return value.length > 18 ? `...${value.slice(-15)}` : value;
}

export function transmissionSignalFidelity(analysis: TransmissionAnalysis) {
  return analysis.degradation.interpretationConcordance;
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
  record,
}: {
  analysis: TransmissionAnalysis;
  event?: AstropathicEventMetadata;
  record: AstropathicRecordPresentation;
}) {
  const eventLabels = transmissionEventLabels(event);
  const fidelity = transmissionSignalFidelity(analysis);
  const coherenceState = eventLabels[0] ?? analysis.degradation.severity;

  return (
    <details className="transmission-signal-auspex">
      <summary>
        <span><i aria-hidden="true" />ASTROPATHIC AUSPEX // RELIQUARIUM {analysis.reliquariumNumber}</span>
        <b data-tone={eventLabels.length || fidelity < 70 ? "warning" : fidelity < 90 ? "partial" : "verified"}>{coherenceState}</b>
      </summary>
      <div className="transmission-signal-grid">
        <div className="signal-source-fix">
          <small>PROBABLE ORIGIN</small>
          <strong>{analysis.probableOriginLabel}</strong>
          <span>{analysis.originBasis.replaceAll("-", " ").toUpperCase()}</span>
        </div>
        <div>
          <small>PROVENANCE CONCORDANCE</small>
          <strong data-tone={confidenceTone(analysis.triangulationState)}>{analysis.triangulationState}</strong>
        </div>
        <div>
          <small>THOUGHTMARK AUTHORITY</small>
          <strong>{record.thoughtmarkAuthority}</strong>
        </div>
        <div>
          <small>IMPERIAL CLEARANCE</small>
          <strong>{analysis.clearanceGrade}</strong>
        </div>
        <div>
          <small>ENCRYPTION PROTOCOL</small>
          <strong>{analysis.encryptionProtocol}</strong>
        </div>
        <div>
          <small>CHOIR / RELAY PATH</small>
          <strong>{analysis.relayPathLabel}</strong>
        </div>
        <div>
          <small>WARP EXPOSURE</small>
          <strong data-tone={warpTone(analysis.warpExposureState)}>{analysis.warpExposureState}</strong>
        </div>
        <div>
          <small>CHOIR LINEAGE</small>
          <strong>{transmissionLineageLabel(event)}</strong>
        </div>
        <div>
          <small>CHOIR SIGNATURE</small>
          <strong>{record.choirSignature}</strong>
        </div>
        <div>
          <small>SEMANTIC INTEGRITY</small>
          <strong>{analysis.degradation.semanticIntegrity}</strong>
        </div>
        <div>
          <small>MNEMONIC LOSS</small>
          <strong>{analysis.degradation.mnemonicLoss}</strong>
        </div>
        <div>
          <small>EMOTIVE CONTAMINATION</small>
          <strong>{analysis.degradation.emotiveContamination}</strong>
        </div>
        <div>
          <small>ARCHIVAL REDACTION</small>
          <strong>{analysis.degradation.archivalRedaction}</strong>
        </div>
        <div>
          <small>CIPHER STATUS</small>
          <strong>{analysis.degradation.cipherStatus}</strong>
        </div>
      </div>
      <div className="transmission-signal-fidelity">
        <span><small>INTERPRETATION CONCORDANCE</small><b>{fidelity}%</b></span>
        <i aria-hidden="true">
          <b style={{ width: `${fidelity}%` }} />
          <em
            className="transmission-signal-fidelity-marker"
            style={{ left: `clamp(4px, ${fidelity}%, calc(100% - 4px))` }}
          />
        </i>
        <span><small>RECONSTRUCTION CONFIDENCE</small><b>{analysis.degradation.reconstructionConfidence}%</b></span>
      </div>
      {eventLabels.length > 0 && (
        <div className="transmission-signal-events" aria-label={`Transmission anomalies: ${eventLabels.join(", ")}`}>
          <small>ANOMALY REGISTER</small>
          {eventLabels.map((label) => <b key={label}>{label}</b>)}
        </div>
      )}
      <div className="transmission-archive-disposition">
        <small>ARCHIVE / COMMAND DISPOSITION</small>
        <strong>{record.archiveDisposition}</strong>
      </div>
    </details>
  );
}
