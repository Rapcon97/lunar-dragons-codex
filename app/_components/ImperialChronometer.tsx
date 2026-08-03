"use client";

import { useEffect, useMemo, useState } from "react";

const TERRAN_ANCHOR_YEAR = 2026;
const IMPERIAL_ANCHOR_YEAR = 56;
const SHIP_TIME_LABEL = "LUNARIS SHIP-TIME";

function resolveImperialDate(now: Date) {
  const terranYear = now.getUTCFullYear();
  const yearStart = Date.UTC(terranYear, 0, 1);
  const nextYear = Date.UTC(terranYear + 1, 0, 1);
  const elapsed = Math.max(0, Math.min(1, (now.getTime() - yearStart) / (nextYear - yearStart)));
  const yearFraction = Math.min(999, Math.floor(elapsed * 1000) + 1);
  const imperialYear = IMPERIAL_ANCHOR_YEAR + (terranYear - TERRAN_ANCHOR_YEAR);
  const amsterdamClock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
    timeZoneName: "short",
  }).formatToParts(now);
  const terranTime = amsterdamClock
    .filter((part) => part.type !== "timeZoneName")
    .map((part) => part.value)
    .join("")
    .trim();

  return {
    code: `0.${String(yearFraction).padStart(3, "0")}.${String(imperialYear).padStart(3, "0")}.M42`,
    spoken: `Imperial date, check zero, year fraction ${yearFraction}, year ${imperialYear}, millennium forty-two. Terran time ${terranTime}, ${SHIP_TIME_LABEL}`,
    terranTime,
  };
}

export function ImperialChronometer() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const imperialDate = useMemo(() => now ? resolveImperialDate(now) : null, [now]);

  return (
    <aside
      className="imperial-chronometer"
      aria-label={imperialDate?.spoken ?? "Imperial chronometer synchronising"}
      title="Lunaris ship-time translated to the Lunar Dragons campaign epoch: 056.M42 in 2026."
    >
      <span>CHRONO IMPERIALIS</span>
      <strong>{imperialDate?.code ?? "0.---.056.M42"}</strong>
      <small>
        <i aria-hidden="true" />TERRA {imperialDate?.terranTime ?? "--:--:--"}{" "}
        <span className="chronometer-ship-time-full">{SHIP_TIME_LABEL}</span>
        <span className="chronometer-ship-time-short">SHIP-TIME</span>
      </small>
    </aside>
  );
}
