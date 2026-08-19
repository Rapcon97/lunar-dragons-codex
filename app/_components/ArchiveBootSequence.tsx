"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const awakeningLines = [
  ">> RITE OF AWAKENING // INVOCATION ACCEPTED",
  ">> LUNARIS ARCHIVE CORE // MACHINE-SPIRIT ANSWERS",
  ">> CHAPTER IDENT // DRAGON OF THE MOON VERIFIED",
  ">> ADEPTUS TERRA WARRANT // 008.M42/DR-017 SEALED",
  ">> ARGENT VIGIL RECORDS // ANNALIS COILS READY",
  ">> IDENTITY GATE // AWAITING COMMAND HANDSHAKE",
  "++ ARCHIVE APERTURE OPEN ++",
] as const;

type BootPhase = "awakening" | "gate" | "verified" | "chapter-master" | "exiting";

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceReplay = searchParams.get("awakening") === "replay";
  const isChapterMasterLogin =
    isAuthenticated &&
    isChapterMaster &&
    searchParams.get("authentication") === "chapter-master";
  const skipCompletedBoot =
    isAuthenticated &&
    (bootCompletedForDocument || skipIntro) &&
    !forceReplay &&
    !isChapterMasterLogin;

  const [phase, setPhase] = useState<BootPhase>(() => {
    if (skipCompletedBoot) return "exiting";
    if (forceReplay) return "awakening";
    if (isChapterMasterLogin) return "chapter-master";
    if (isAuthenticated) return "verified";
    return "awakening";
  });
  const [isVisible, setIsVisible] = useState(!skipCompletedBoot);
  const [visibleLines, setVisibleLines] = useState(1);
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const usernameInput = useRef<HTMLInputElement>(null);

  const finishAwakening = useCallback(() => {
    setVisibleLines(awakeningLines.length);
    setPhase(isAuthenticated ? "verified" : "gate");
  }, [isAuthenticated]);

  const finishVerification = useCallback(() => {
    setPhase("exiting");
  }, []);

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
      setPhase("verified");
      router.refresh();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Guest authentication failed.");
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    if (phase !== "awakening") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const immediateTimer = window.setTimeout(finishAwakening, 0);
      return () => window.clearTimeout(immediateTimer);
    }

    const lineTimer = window.setInterval(() => {
      setVisibleLines((count) => Math.min(count + 1, awakeningLines.length));
    }, 320);
    const completionTimer = window.setTimeout(finishAwakening, 2900);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(completionTimer);
    };
  }, [finishAwakening, phase]);

  useEffect(() => {
    if (phase !== "verified" && phase !== "chapter-master") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion
      ? 80
      : phase === "chapter-master"
        ? 2100
        : isSigningIn
          ? 1500
          : 700;
    const verificationTimer = window.setTimeout(finishVerification, duration);
    return () => window.clearTimeout(verificationTimer);
  }, [finishVerification, isSigningIn, phase]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, button, a, form")) return;
      if (phase === "awakening") finishAwakening();
      if (phase === "verified" || phase === "chapter-master") finishVerification();
      if (phase === "gate") usernameInput.current?.focus();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [finishAwakening, finishVerification, phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    bootCompletedForDocument = true;
    document.cookie = "__Host-lunar_boot=1; Path=/; Secure; SameSite=Lax";

    if (forceReplay || isChapterMasterLogin) {
      window.history.replaceState(window.history.state, "", pathname || "/");
    }

    const removeTimer = window.setTimeout(() => setIsVisible(false), 480);
    return () => window.clearTimeout(removeTimer);
  }, [forceReplay, isChapterMasterLogin, pathname, phase]);

  if (!isVisible) return null;

  const identityTitle = phase === "chapter-master"
    ? "CHAPTER MASTER"
    : "IDENTITY VERIFIED";
  const identityStatus = phase === "chapter-master"
    ? "COMMAND AUTHORITY ACCEPTED"
    : "ARCHIVE CLEARANCE ACCEPTED";

  return (
    <section
      className={`archive-boot-sequence awakening-v2 phase-${phase}`}
      aria-label={
        phase === "awakening"
          ? "Lunar Dragons archive awakening rite"
          : phase === "gate"
            ? "Authentication required to enter the Lunar Dragons archive"
            : `${identityTitle}. Opening the Lunar Dragons archive.`
      }
      aria-live="polite"
    >
      <div className="awakening-vignette" aria-hidden="true" />
      <header className="awakening-header">
        <span>LUNARIS // ANNALIS DATA-VAULT</span>
        <span>RITE 008.M42/DR-017</span>
      </header>

      {phase === "awakening" ? (
        <main className="awakening-terminal">
          <div className="awakening-terminal-heading">
            <span>ARCHIVE CONSECRATION</span>
            <strong>COGITATOR WAKE</strong>
          </div>
          <div className="awakening-lines" aria-label={awakeningLines.join(". ")}>
            {awakeningLines.slice(0, visibleLines).map((line, index) => (
              <p className={line.startsWith("++") ? "complete" : ""} key={line} aria-hidden="true">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {line}
              </p>
            ))}
            <i aria-hidden="true" />
          </div>
        </main>
      ) : (
        <main className="awakening-access-core">
          <div className="awakening-seal" aria-hidden="true">
            <i />
            <img alt="" draggable={false} src="/lunar-dragons-sigil-depth.png" />
            <span />
          </div>

          <div className="awakening-access-copy">
            <span>{phase === "gate" ? "IDENTITY GATE" : identityStatus}</span>
            <h1>{phase === "gate" ? "ENTER THE ARCHIVE" : identityTitle}</h1>
            {phase !== "gate" && displayName && <strong>{displayName}</strong>}
            <p>
              {phase === "gate"
                ? "Present an authorised identity seal to access the Lunar Dragons annals."
                : phase === "chapter-master"
                  ? "The command nexus recognises its Chapter Master."
                  : "The data-vault has recognised your retained credentials."}
            </p>

            {phase === "gate" ? (
              <form className="awakening-auth-form" onSubmit={signInGuest}>
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
                <div>
                  <button type="submit" disabled={isSigningIn}>
                    {isSigningIn ? "VERIFYING…" : "ENTER AS GUEST"}
                  </button>
                  <a href={signInHref}>SIGN IN WITH CHATGPT</a>
                </div>
                {authMessage && <p role="status">{authMessage}</p>}
              </form>
            ) : (
              <div className="awakening-verification-progress" aria-hidden="true">
                <span>OPENING {phase === "chapter-master" ? "COMMAND NEXUS" : "ARCHIVE APERTURE"}</span>
                <i><b /></i>
              </div>
            )}
          </div>
        </main>
      )}

      <footer className="awakening-footer">
        <span>RECLAIM WHAT HAS BEEN LOST <b>·</b> GUARD THE PASSAGE</span>
        {phase === "awakening" && (
          <button type="button" onClick={finishAwakening}>SKIP AWAKENING</button>
        )}
        {phase === "gate" && <span>ENTER / SPACE · FOCUS IDENTITY GATE</span>}
        {(phase === "verified" || phase === "chapter-master") && (
          <span>ENTER / SPACE · OPEN IMMEDIATELY</span>
        )}
      </footer>
    </section>
  );
}
