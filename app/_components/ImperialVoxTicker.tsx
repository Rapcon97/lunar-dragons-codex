"use client";

import { useEffect, useState } from "react";
import { defaultVoxQuotes } from "../archive-data";

const systemTraffic = [
  "SERVO-SKULL RELAY · NOMINAL",
  "ASTROPATHIC CANT · SIGNAL LOCKED",
  "DATA-VAULT QUERY 0x4C44 · RESOLVED",
  "INCENSE LIT · MACHINE-SPIRIT PLACID",
  "HERETICAL PATTERN · PURGED",
] as const;

export function ImperialVoxTicker({ quotes = defaultVoxQuotes }: { quotes?: string[] }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const transmissions = quotes.length ? quotes : defaultVoxQuotes;
  const quoteCount = transmissions.length;
  const currentQuote = transmissions[quoteIndex % quoteCount] ?? defaultVoxQuotes[0];

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * quoteCount));
    const interval = window.setInterval(() => {
      setQuoteIndex((current) => {
        if (quoteCount < 2) return 0;
        const offset = 1 + Math.floor(Math.random() * (quoteCount - 1));
        return (current + offset) % quoteCount;
      });
    }, 10000);
    return () => window.clearInterval(interval);
  }, [quoteCount]);

  return (
    <aside className="vox-screen" aria-label="Imperial motivational transmission" aria-live="polite">
      <div className="vox-primary-line">
        <span className="vox-prompt">scribe@lunaris:/vox-moralis#</span>
        <span className="vox-status" aria-hidden="true">»» RECEIVE</span>
        <div className="vox-window">
          <p
            className={currentQuote.length > 100 ? "vox-message long" : "vox-message"}
            key={quoteIndex}
          >
            <span className="vox-transmission-copy">{currentQuote}</span>
            {currentQuote.length > 100 && (
              <>
                <i aria-hidden="true">◆</i>
                <span className="vox-transmission-copy" aria-hidden="true">{currentQuote}</span>
              </>
            )}
          </p>
        </div>
        <span className="vox-signal">VOX-CANT · CH {String(quoteIndex % quoteCount + 1).padStart(2, "0")}</span>
        <span className="servo-skull" role="img" aria-label="Servo-skull relay">
          <span className="servo-skull-rig" aria-hidden="true">
            <span className="servo-antenna" />
            <span className="servo-cranium">
              <i className="servo-optic" />
              <i className="servo-eye" />
              <b className="servo-jaw" />
            </span>
            <span className="servo-cable" />
          </span>
        </span>
      </div>
      <div className="vox-traffic-line" aria-hidden="true">
        <div className="vox-traffic-track">
          {[0, 1].map((copy) => (
            <span className="vox-traffic-group" key={copy}>
              {systemTraffic.map((message) => <i key={`${copy}-${message}`}>{message}</i>)}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
