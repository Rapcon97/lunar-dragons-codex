"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const bootLines = [
  ">> LUNAR DRAGONS CHAPTER-ARCHIVE // COGITATOR WAKE",
  ">> NOOSPHERIC HANDSHAKE 0x4C-44-IX // ACCEPTED",
  ">> MACHINE-SPIRIT RESPONSE ............ NOMINAL",
  ">> GENE-SEED LEDGER // SEAL INTACT",
  ">> HERALDRY RELIQUARY // ASSET LINK ESTABLISHED",
  ">> COMPANY MANIFEST // X DATA-VAULTS ANSWER",
  ">> ARMOURY INDEX // RELIC CIPHERS VERIFIED",
  "!! UNAUTHORIZED CANT DETECTED // PURGING",
  ">> PURITY PROTOCOL 11100101 00110111 // COMPLETE",
  ">> CHRONICLE VAULT // MEMORY COILS WARMING",
  ">> ADEPTUS TERRA WARRANT // 008.M42/DR-017 VERIFIED",
  ">> ARGENT VIGIL // NACHMUND VECTOR LOCKED",
  ">> GIFT OF LUNA RELIQUARY // SEAL INTACT",
  ">> SERVO-SKULL SCRIBE 03 // DISPATCHED",
  ">> ASTROPATHIC RELAY // SIGNAL LOCKED",
  ">> VOX MORALIS // EXHORTATION CHANNEL OPEN",
  ">> OATH-CHAIN 0xC7D1 01100110 // BOUND",
  ">> COMPANY STRENGTH RETURNS // RECEIVED",
  ">> BATTLE-BROTHER RECORDS // UNSEALING",
  "!! HERETICAL PATTERN 0x9A // EXCISED",
  ">> RIGHT OF PERMANENT BASTION // GRANTED · UNCLAIMED",
  ">> RITE OF INVOCATION // INCENSE ACCEPTED",
  ">> ARCHIVE AUTHORITY // IDENTITY CONFIRMED",
  ">> LUNAR PHASE CALIBRATION // ASCENDANT",
  ">> DRAGON SIGIL // RECOGNITION 100%",
  ">> KNOWLEDGE IS ARMOUR // MEMORY IS DUTY",
  ">> COMMAND NEXUS // AWAITING HANDSHAKE",
  "++ ACCESS RITE COMPLETE // THE VAULT OPENS ++",
] as const;

const archiveTelemetry = [
  "// ARCHIVE LINK: LUNAR DRAGONS",
  "// THEATRE: NACHMUND GAUNTLET",
  "// CRUSADE: THE ARGENT VIGIL",
  "// AUTHORITY: IMPERIAL REGENT",
  "// DATA-SHARD: 008.M42/DR-017",
  "// VERITY: PURGED + SEALED",
] as const;

const machineTelemetry = [
  "MACHINE-SPIRIT: AWAKE",
  "CHAPTER ICON: VERIFIED",
  "ULTIMA FOUNDING: CONFIRMED",
  "ARGENT VIGIL: ACTIVE",
  "GENE-SEED LEDGER: SEALED",
  "VOX MORALIS: LINKED",
  "DATA INTEGRITY: 100.000%",
  "COMMAND NEXUS: READY",
] as const;

const riteFeed = [
  ">> RITE OF AWAKENING // ARGENT VIGIL LINK ESTABLISHED",
  ">> CHAPTER ICON VERIFIED: DRAGON OF THE MOON",
  ">> ADEPTUS TERRA WARRANT: AUTHENTICATED",
  ">> RECLAIM WHAT HAS BEEN LOST",
  ">> GUARD THE PASSAGE",
] as const;

type BootPhase = "booting" | "awaiting" | "exiting";

let bootCompletedForDocument = false;

export function ArchiveBootSequence({
  displayName,
  isAuthenticated,
  isChapterMaster,
  signInHref,
  skipIntro,
}: {
  displayName: string;
  isAuthenticated: boolean;
  isChapterMaster: boolean;
  signInHref: string;
  skipIntro: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChapterMasterLogin =
    isAuthenticated &&
    isChapterMaster &&
    searchParams.get("authentication") === "chapter-master";
  const skipCompletedBoot =
    isAuthenticated &&
    (bootCompletedForDocument || skipIntro) &&
    !isChapterMasterLogin;
  const [visibleLines, setVisibleLines] = useState(1);
  const [phase, setPhase] = useState<BootPhase>(
    skipCompletedBoot ? "exiting" : isChapterMasterLogin ? "awaiting" : "booting",
  );
  const [isVisible, setIsVisible] = useState(!skipCompletedBoot);
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const authenticationSuccessful =
    isAuthenticated && (isSigningIn || isChapterMasterLogin);
  const usernameInput = useRef<HTMLInputElement>(null);

  const advanceRite = useCallback(() => {
    if (phase === "booting") {
      setPhase("awaiting");
      return;
    }
    if (phase !== "awaiting") return;
    if (authenticationSuccessful) return;
    if (isAuthenticated) {
      setPhase("exiting");
      return;
    }
    usernameInput.current?.focus();
  }, [authenticationSuccessful, isAuthenticated, phase]);

  async function signInGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !passphrase) {
      setAuthMessage("Enter the guest username and passphrase.");
      return;
    }
    setIsSigningIn(true);
    setAuthMessage("Verifying identity seal…");
    try {
      const response = await fetch("/api/guest-auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, passphrase }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Guest authentication failed.");
      setAuthMessage("Identity verified. Opening archive…");
      router.refresh();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Guest authentication failed.");
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    if (!authenticationSuccessful || phase !== "awaiting") return;
    const successTimer = setTimeout(() => {
      setPhase("exiting");
      if (isChapterMasterLogin) {
        window.history.replaceState(window.history.state, "", "/");
      }
    }, isChapterMasterLogin ? 4200 : 3500);
    return () => clearTimeout(successTimer);
  }, [authenticationSuccessful, isChapterMasterLogin, phase]);

  useEffect(() => {
    if (phase !== "booting") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lineTimer: ReturnType<typeof setInterval> | undefined;

    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reduced motion intentionally completes the boot sequence immediately.
      setVisibleLines(bootLines.length);
    } else {
      lineTimer = setInterval(() => {
        setVisibleLines((count) => Math.min(count + 1, bootLines.length));
      }, 145);
    }

    const sealTimer = setTimeout(() => setPhase("awaiting"), reducedMotion ? 500 : 4520);

    return () => {
      if (lineTimer) clearInterval(lineTimer);
      clearTimeout(sealTimer);
    };
  }, [phase]);

  useEffect(() => {
    const dismissOnKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, button, a, form")) return;
      advanceRite();
    };
    window.addEventListener("keydown", dismissOnKey);
    return () => window.removeEventListener("keydown", dismissOnKey);
  }, [advanceRite]);

  useEffect(() => {
    if (phase !== "exiting") return;
    bootCompletedForDocument = true;
    document.cookie = "__Host-lunar_boot=1; Path=/; Secure; SameSite=Lax";
    const removeTimer = setTimeout(() => setIsVisible(false), 680);
    return () => clearTimeout(removeTimer);
  }, [phase]);

  if (!isVisible) return null;

  return (
    <section
      className={`archive-boot-sequence ${phase === "awaiting" ? `seal-awaiting ${isAuthenticated ? "auth-verified" : "auth-required"} ${authenticationSuccessful ? "auth-success" : ""}` : phase === "exiting" ? "exiting" : ""}`}
      aria-label={
        phase === "booting"
          ? "Lunar Dragons archive initialization"
          : isChapterMasterLogin
            ? "Chapter Master authentication successful. Opening the command archive."
          : authenticationSuccessful
            ? "Authentication successful. The archive will open shortly."
          : isAuthenticated
            ? "Identity verified. Click or press Enter to open the archive."
            : "Authentication required. Click or press Enter to log in to the archive."
      }
      aria-live="polite"
      onClick={phase === "awaiting" && isAuthenticated && !authenticationSuccessful ? advanceRite : undefined}
      role={phase === "awaiting" && isAuthenticated && !authenticationSuccessful ? "button" : undefined}
      tabIndex={phase === "awaiting" && isAuthenticated && !authenticationSuccessful ? 0 : undefined}
    >
      <div className="boot-vignette" aria-hidden="true" />
      <header className="boot-header">
        <span>LUNAR DRAGONS // CHAPTER DATA-VAULT</span>
        <span>AUTH · M42.ARCHIVUM</span>
      </header>
      {phase === "booting" ? (
        <div className="boot-terminal">
          {bootLines.slice(0, visibleLines).map((line, index) => (
            <p
              className={line.startsWith("!!") ? "warning" : line.startsWith("++") ? "complete" : ""}
              key={line}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {line}
            </p>
          ))}
          <i className="boot-cursor" aria-hidden="true" />
        </div>
      ) : isChapterMasterLogin ? (
        <div className="chapter-master-auth-screen">
          <div className="chapter-master-auth-frame">
            <div className="chapter-master-emblem" aria-hidden="true">
              <img alt="" draggable={false} src="/lunar-dragons-sigil-depth.png" />
              <span />
              <i />
            </div>
            <div className="chapter-master-welcome">
              <span>COMMAND IDENTITY CONFIRMED</span>
              <p>WELCOME TO THE ARCHIVE</p>
              <h1>CHAPTER MASTER</h1>
              {displayName && <strong>{displayName}</strong>}
              <div className="chapter-master-clearance">
                <span><b>IDENTITY SEAL</b><i>VERIFIED</i></span>
                <span><b>COMMAND AUTHORITY</b><i>ABSOLUTE</i></span>
                <span><b>ARCHIVE PRIVILEGES</b><i>UNRESTRICTED</i></span>
              </div>
              <div className="chapter-master-progress">
                <span>OPENING COMMAND NEXUS</span>
                <b><i /></b>
              </div>
            </div>
          </div>
          <p className="chapter-master-oath">RECLAIM WHAT HAS BEEN LOST · GUARD THE PASSAGE</p>
        </div>
      ) : (
        <div className="boot-seal-stage">
          <div className="boot-seal-grid">
            <aside className="boot-data-panel boot-data-panel-left" aria-hidden="true">
              <span className="boot-data-heading">ARCHIVE LINK / ACTIVE</span>
              <div className="boot-data-lines">
                {archiveTelemetry.map((line) => <p key={line}>{line}</p>)}
              </div>
              <div className="boot-data-meter">
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
              </div>
            </aside>

            <div className="boot-mark-column">
              <div className="boot-mark-stage">
            <div className="boot-mark-signal">
              <div className="boot-mark-composite">
                <img
                  alt="Lunar Dragons crescent moon, dragon, and star chapter emblem"
                  draggable={false}
                  height="1254"
                  src="/lunar-dragons-sigil-depth.png"
                  width="1254"
                />
                <span className="boot-mark-base" aria-hidden="true" />
                <span className="boot-mark-live-static" aria-hidden="true" />
                <span className="boot-mark-echo" aria-hidden="true" />
                <span className="boot-mark-static" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="boot-mark-caption">
            <span>CHAPTER ICON VERIFIED</span>
            <strong>THE LUNAR DRAGONS</strong>
            <small>THE ARGENT VIGIL · ARCHIVE LINK ESTABLISHED</small>
            {authenticationSuccessful && (
              <div className="boot-auth-success" role="status">
                <span>IDENTITY SEAL ACCEPTED</span>
                <strong>AUTHENTICATION SUCCESSFUL</strong>
                <small>ARCHIVE CLEARANCE CONFIRMED · OPENING DATA-VAULT</small>
                <i aria-hidden="true" />
              </div>
            )}
            {!isAuthenticated && (
              <form className="boot-auth-gate" onSubmit={signInGuest}>
                <span>IDENTITY SEAL REQUIRED</span>
                <label>
                  <span>GUEST USERNAME</span>
                  <input
                    ref={usernameInput}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    maxLength={32}
                    spellCheck={false}
                  />
                </label>
                <label>
                  <span>PASSPHRASE</span>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    autoComplete="current-password"
                    maxLength={128}
                  />
                </label>
                <button type="submit" disabled={isSigningIn}>
                  {isSigningIn ? "VERIFYING…" : "LOGIN TO ARCHIVE"}
                </button>
                <a href={signInHref}>USE CHATGPT LOGIN</a>
                <small>Guest sessions are remembered for 30 days on this browser.</small>
                {authMessage && <p role="status">{authMessage}</p>}
              </form>
            )}
          </div>
            </div>

            <aside className="boot-data-panel boot-data-panel-right" aria-hidden="true">
              <span className="boot-data-heading">MACHINE-SPIRIT / WITNESS</span>
              <div className="boot-data-lines">
                {machineTelemetry.map((line) => <p key={line}>{line}</p>)}
              </div>
              <div className="boot-data-meter">
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
              </div>
            </aside>
          </div>

          <div className="boot-rite-feed" aria-hidden="true">
            {riteFeed.map((line) => <span key={line}>{line}</span>)}
            <i />
          </div>
          <p className="boot-seal-motto">
            THE DRAGON DOES NOT SEEK THE LIGHT <b>·</b> IT IS THE LIGHT IN THE VOID
          </p>
        </div>
      )}
      <footer className={phase === "booting" ? "boot-footer" : "boot-footer entry-ready"}>
        {phase === "booting" ? (
          <>
            <div>
              <span>COGITATOR LOAD</span>
              <b><i /></b>
            </div>
            <button type="button" onClick={advanceRite}>ADVANCE RITE</button>
          </>
        ) : (
          <>
            <div>
              <span>
                {isAuthenticated
                  ? "IDENTITY VERIFIED · ACCESS GATE ARMED"
                  : "IDENTITY UNKNOWN · ACCESS GATE LOCKED"}
              </span>
              <b><i /></b>
            </div>
            <span className="boot-entry-prompt">
              {isAuthenticated
                ? isChapterMasterLogin
                  ? "CHAPTER MASTER VERIFIED · COMMAND NEXUS OPENING"
                  : authenticationSuccessful
                    ? "CLEARANCE ACCEPTED · OPENING ARCHIVE"
                    : "PRESS SCREEN OR ENTER TO OPEN ARCHIVE"
                : "ENTER GUEST CREDENTIALS OR USE CHATGPT LOGIN"}
            </span>
          </>
        )}
      </footer>
    </section>
  );
}
