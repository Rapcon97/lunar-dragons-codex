"use client";

import { useEffect, useState } from "react";
import { parsePlanetTypes, type PlanetTypeRecord } from "../planet-types";

let planetTypeRequest: Promise<PlanetTypeRecord[]> | undefined;

function requestPlanetTypes() {
  if (!planetTypeRequest) {
    planetTypeRequest = fetch("/data/lunar-dragons-planet-types.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Planet classification archive unavailable.");
        return response.text();
      })
      .then(parsePlanetTypes);
  }
  return planetTypeRequest;
}

export function usePlanetTypes() {
  const [records, setRecords] = useState<PlanetTypeRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void requestPlanetTypes()
      .then((result) => {
        if (active) setRecords(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Classification archive unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);

  return { records, error, isLoading: !records.length && !error };
}
