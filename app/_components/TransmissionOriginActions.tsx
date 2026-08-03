"use client";

import type { AstropathicMessage, SectorIntel } from "../archive-data";
import { CartographyTransitionLink } from "./CartographyTransitionLink";
import { resolveTransmissionOrigin } from "./transmission-origin";

export function TransmissionOriginActions({
  intel,
  source,
}: {
  intel: SectorIntel;
  source: AstropathicMessage;
}) {
  const resolution = resolveTransmissionOrigin(intel, source.transmission);

  if (resolution.kind !== "exact") {
    return (
      <aside
        aria-label="Cartographic origin status"
        className={`transmission-origin-actions unavailable ${resolution.kind}`}
        data-origin-resolution={resolution.kind}
      >
        <span>&gt; {resolution.reason}</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`Cartographic origin actions for ${resolution.label}`}
      className="transmission-origin-actions exact"
      data-origin-id={resolution.canonicalId}
      data-origin-resolution="exact"
    >
      <div>
        <span>&gt; CARTOGRAPHIC FIX CONFIRMED</span>
        <strong>{resolution.label}</strong>
        {resolution.bodyIndex !== undefined && <small>PARENT SYSTEM · {resolution.parentSystemLabel}</small>}
      </div>
      <nav aria-label="Transmission origin navigation">
        <CartographyTransitionLink href={resolution.mapHref}>PLOT ORIGIN</CartographyTransitionLink>
        <CartographyTransitionLink href={resolution.recordHref}>OPEN ORIGIN RECORD</CartographyTransitionLink>
      </nav>
    </aside>
  );
}
