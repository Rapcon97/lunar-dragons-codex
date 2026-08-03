import type { PlanetTypeRecord } from "../planet-types";
import { planetArchetypeFor, planetThumbnailUrl } from "../planet-types";

export function PlanetThumbnail({
  planetType,
  className = "",
  alt = "",
  eager = false,
}: {
  planetType: Partial<PlanetTypeRecord> | string;
  className?: string;
  alt?: string;
  eager?: boolean;
}) {
  const archetype = planetArchetypeFor(planetType);
  return (
    <span className={`planet-thumbnail ${className}`} data-archetype={archetype}>
      <img src={planetThumbnailUrl(planetType)} alt={alt} loading={eager ? "eager" : "lazy"} />
      <i aria-hidden="true" />
    </span>
  );
}
