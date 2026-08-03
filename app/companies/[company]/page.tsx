"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminMode } from "../../_components/AdminMode";
import { SidebarNavigation } from "../../_components/SidebarNavigation";
import { useChapterArchive } from "../../_hooks/useChapterArchive";

const commandRoles = ["Captain", "Lieutenant", "Lieutenant", "Company Ancient", "Apothecary", "Chaplain"];

export default function CompanyOverview() {
  const params = useParams<{ company: string }>();
  const companyIndex = Math.max(0, Math.min(10, Number.parseInt(params.company || "1", 10) - 1));
  const companyNumber = companyIndex + 1;
  const isEleventhCompany = companyNumber === 11;
  const { isAdminMode } = useAdminMode();
  const { data, error, isLoading } = useChapterArchive();
  const [sigilState, setSigilState] = useState<"loading" | "loaded" | "missing">("loading");
  const [sigilVersion, setSigilVersion] = useState(0);
  const [sigilMessage, setSigilMessage] = useState("");
  const [isSigilBusy, setIsSigilBusy] = useState(false);
  const sigilInput = useRef<HTMLInputElement>(null);
  const [pauldronState, setPauldronState] = useState<"loading" | "loaded" | "missing">("loading");
  const [pauldronVersion, setPauldronVersion] = useState(0);
  const [pauldronMessage, setPauldronMessage] = useState("");
  const [isPauldronBusy, setIsPauldronBusy] = useState(false);
  const pauldronInput = useRef<HTMLInputElement>(null);
  const [eleventhUnlocked, setEleventhUnlocked] = useState(!isEleventhCompany);
  const [clearanceCode, setClearanceCode] = useState("");
  const [clearanceError, setClearanceError] = useState("");
  const [previewAsset, setPreviewAsset] = useState<{
    label: string;
    src: string;
  } | null>(null);
  const chapterName = "THE LUNAR DRAGONS";
  const company = data.companies[companyIndex];
  const sigilUrl = `/api/company-sigil?company=${companyNumber}&v=${sigilVersion}`;
  const pauldronUrl = `/api/company-pauldron?company=${companyNumber}&v=${pauldronVersion}`;
  useEffect(() => {
    if (!isEleventhCompany) {
      setEleventhUnlocked(true);
      return;
    }
    setEleventhUnlocked(
      window.sessionStorage.getItem("lunar-dragons-eleventh-clearance") === "granted",
    );
  }, [isEleventhCompany]);
  useEffect(() => {
    if (!previewAsset) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewAsset(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewAsset]);
  const squads = useMemo(() => {
    const squadCount = Math.min(10, Math.max(1, Math.ceil(Math.max(0, company.strength - commandRoles.length) / 10)));
    const lineMembers = Math.max(0, company.strength - commandRoles.length);
    const base = Math.floor(lineMembers / squadCount);
    const remainder = lineMembers % squadCount;
    return Array.from({ length: squadCount }, (_, index) => ({
      number: index + 1,
      members: base + (index < remainder ? 1 : 0),
      leader: "Sergeant name unrecorded",
    }));
  }, [company.strength]);

  function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  }

  async function prepareCompanyImageUpload(
    file: File,
    assetName: "sigil" | "pauldron",
    setStatus: (message: string) => void,
  ) {
    const maxSelectedBytes = 50 * 1024 * 1024;
    const transferTargetBytes = 750 * 1024;

    if (file.size > maxSelectedBytes) {
      throw new Error("Choose an image smaller than 50 MB.");
    }
    if (file.size <= transferTargetBytes) return file;
    if (file.type === "image/gif") {
      throw new Error("Large animated GIFs cannot be optimized. Use PNG, JPG, or WEBP.");
    }

    setStatus(`Optimizing company ${assetName}…`);
    const bitmap = await createImageBitmap(file);
    const maxEdge = 2048;
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the image.");

    let output: Blob | null = null;
    const outputType = file.type === "image/png" ? "image/webp" : "image/jpeg";
    for (let attempt = 0; attempt < 7; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      output = await canvasBlob(canvas, outputType, Math.max(.44, .88 - attempt * .07));
      if (output && output.size <= transferTargetBytes) break;
      scale *= .76;
    }
    bitmap.close();

    if (!output || output.size > transferTargetBytes) {
      throw new Error("The image could not be optimized enough for upload.");
    }
    const extension = outputType === "image/webp" ? "webp" : "jpg";
    return new File([output], `company-${companyNumber}-${assetName}.${extension}`, {
      type: outputType,
    });
  }

  async function uploadSigil(file: File | undefined) {
    if (!file) return;
    setIsSigilBusy(true);
    setSigilMessage("Uploading company sigil…");
    try {
      const preparedFile = await prepareCompanyImageUpload(file, "sigil", setSigilMessage);
      const form = new FormData();
      form.set("company", String(companyNumber));
      form.set("sigil", preparedFile);
      const response = await fetch("/api/company-sigil", { method: "POST", body: form });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : {
            error: response.ok
              ? undefined
              : response.status === 413
                ? "The optimized image is still too large for transfer."
                : `The upload service rejected the image (${response.status}).`,
          };
      if (!response.ok) throw new Error(result.error || "The company sigil could not be uploaded.");
      setSigilState("loading");
      setSigilVersion(Date.now());
      setSigilMessage("Company sigil archived.");
    } catch (uploadError) {
      setSigilMessage(
        uploadError instanceof Error ? uploadError.message : "The company sigil could not be uploaded.",
      );
    } finally {
      setIsSigilBusy(false);
      if (sigilInput.current) sigilInput.current.value = "";
    }
  }

  async function removeSigil() {
    setIsSigilBusy(true);
    setSigilMessage("Removing company sigil…");
    try {
      const response = await fetch(`/api/company-sigil?company=${companyNumber}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The company sigil could not be removed.");
      setSigilState("missing");
      setSigilMessage("Company sigil removed.");
    } catch (removeError) {
      setSigilMessage(
        removeError instanceof Error ? removeError.message : "The company sigil could not be removed.",
      );
    } finally {
      setIsSigilBusy(false);
    }
  }

  async function uploadPauldron(file: File | undefined) {
    if (!file) return;
    setIsPauldronBusy(true);
    setPauldronMessage("Uploading company pauldron…");
    try {
      const preparedFile = await prepareCompanyImageUpload(
        file,
        "pauldron",
        setPauldronMessage,
      );
      const form = new FormData();
      form.set("company", String(companyNumber));
      form.set("pauldron", preparedFile);
      const response = await fetch("/api/company-pauldron", { method: "POST", body: form });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : {
            error: response.ok
              ? undefined
              : response.status === 413
                ? "The optimized image is still too large for transfer."
                : `The upload service rejected the image (${response.status}).`,
          };
      if (!response.ok) {
        throw new Error(result.error || "The company pauldron could not be uploaded.");
      }
      setPauldronState("loading");
      setPauldronVersion(Date.now());
      setPauldronMessage("Company pauldron archived.");
    } catch (uploadError) {
      setPauldronMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "The company pauldron could not be uploaded.",
      );
    } finally {
      setIsPauldronBusy(false);
      if (pauldronInput.current) pauldronInput.current.value = "";
    }
  }

  async function removePauldron() {
    setIsPauldronBusy(true);
    setPauldronMessage("Removing company pauldron…");
    try {
      const response = await fetch(`/api/company-pauldron?company=${companyNumber}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "The company pauldron could not be removed.");
      }
      setPauldronState("missing");
      setPauldronMessage("Company pauldron removed.");
    } catch (removeError) {
      setPauldronMessage(
        removeError instanceof Error
          ? removeError.message
          : "The company pauldron could not be removed.",
      );
    } finally {
      setIsPauldronBusy(false);
    }
  }

  function verifyEleventhClearance() {
    if (clearanceCode.trim().toLocaleLowerCase() !== "the emperor protects") {
      setClearanceError("CLEARANCE PHRASE REJECTED");
      return;
    }
    window.sessionStorage.setItem("lunar-dragons-eleventh-clearance", "granted");
    setEleventhUnlocked(true);
    setClearanceCode("");
    setClearanceError("");
  }

  if (isEleventhCompany && !eleventhUnlocked) {
    return (
      <main className="app-shell">
        <SidebarNavigation activeHref="/companies" />

        <section className="workspace">
          <header className="topbar">
            <div><p className="eyebrow">The Lunar Dragons · COMPANY/██</p><div className="chapter-name detail-chapter-name">{chapterName}</div></div>
            <div className="top-actions"><span className="save-state"><i /> RECORD SEALED</span><Link href="/companies" className="seal-button">BACK TO COMPANIES</Link></div>
          </header>
          <div className="subpage secret-company-detail-page">
            <section className="eleventh-detail-gate panel">
              <span className="eleventh-detail-sigil" aria-hidden="true">XI</span>
              <p className="section-kicker">ORDO OBSCURUS · EYES ONLY</p>
              <h1>COMPANY RECORD REDACTED</h1>
              <p>The requested formation does not exist within the acknowledged order of battle.</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  verifyEleventhClearance();
                }}
              >
                <label htmlFor="eleventh-detail-clearance">SANCTIONED CLEARANCE PHRASE</label>
                <input
                  autoComplete="off"
                  id="eleventh-detail-clearance"
                  onChange={(event) => {
                    setClearanceCode(event.target.value);
                    setClearanceError("");
                  }}
                  spellCheck={false}
                  type="password"
                  value={clearanceCode}
                />
                <button type="submit">UNSEAL XI COMPANY</button>
              </form>
              {clearanceError && <strong className="eleventh-clearance-error" role="status">{clearanceError}</strong>}
            </section>
          </div>
          <footer><span>RECORD XI · EXISTENCE DENIED</span><span>What walks beyond the moon leaves no shadow.</span></footer>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <SidebarNavigation activeHref="/companies" />

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">The Lunar Dragons · COMPANY/{String(companyIndex + 1).padStart(2, "0")}</p><div className="chapter-name detail-chapter-name">{chapterName}</div></div>
          <div className="top-actions"><span className="save-state"><i /> {error ? "Archive unavailable" : isLoading ? "Loading shared roster" : "Shared roster synced"}</span><Link href="/companies" className="seal-button">BACK TO COMPANIES</Link></div>
        </header>

        <div className="subpage company-detail-page">
          <section className="company-detail-hero panel">
            <div className="company-sigil-control">
              <div
                aria-label={sigilState === "loaded" ? `Open a larger preview of ${company.name} company sigil` : undefined}
                className={sigilState === "loaded" ? "company-sigil has-image" : "company-sigil"}
                onClick={() => sigilState === "loaded" && setPreviewAsset({
                  label: `${company.name} · COMPANY SIGIL`,
                  src: sigilUrl,
                })}
                onKeyDown={(event) => {
                  if (sigilState === "loaded" && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setPreviewAsset({
                      label: `${company.name} · COMPANY SIGIL`,
                      src: sigilUrl,
                    });
                  }
                }}
                role={sigilState === "loaded" ? "button" : undefined}
                tabIndex={sigilState === "loaded" ? 0 : undefined}
                title={sigilState === "loaded" ? "Open larger sigil preview" : undefined}
              >
                <img
                  alt={`${company.name} company sigil`}
                  className={sigilState === "loaded" ? "visible" : ""}
                  onError={() => setSigilState("missing")}
                  onLoad={() => setSigilState("loaded")}
                  src={sigilUrl}
                />
                {sigilState !== "loaded" && <span>{companyNumber}</span>}
              </div>
              {isAdminMode && (
                <div className="company-sigil-actions">
                  <label>
                    {isSigilBusy ? "WORKING…" : sigilState === "loaded" ? "REPLACE SIGIL" : "UPLOAD SIGIL"}
                    <input
                      ref={sigilInput}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={isSigilBusy}
                      onChange={(event) => void uploadSigil(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                  {sigilState === "loaded" && (
                    <button disabled={isSigilBusy} onClick={() => void removeSigil()} type="button">
                      REMOVE
                    </button>
                  )}
                </div>
              )}
              {sigilMessage && <small className="company-sigil-status" role="status">{sigilMessage}</small>}
            </div>
            <div><p className="section-kicker">{company.number} Company · {company.role}</p><h1>{company.name}</h1><p>Member overview and internal disposition of the company’s recorded strength.</p></div>
            <div className="detail-strength"><strong>{company.strength}</strong><span>members on record</span></div>
            <div className="company-pauldron-control">
              <div
                aria-label={pauldronState === "loaded" ? `Open a larger preview of ${company.name} company pauldron` : undefined}
                className={pauldronState === "loaded" ? "company-pauldron-frame has-image" : "company-pauldron-frame"}
                onClick={() => pauldronState === "loaded" && setPreviewAsset({
                  label: `${company.name} · COMPANY PAULDRON`,
                  src: pauldronUrl,
                })}
                onKeyDown={(event) => {
                  if (pauldronState === "loaded" && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setPreviewAsset({
                      label: `${company.name} · COMPANY PAULDRON`,
                      src: pauldronUrl,
                    });
                  }
                }}
                role={pauldronState === "loaded" ? "button" : undefined}
                tabIndex={pauldronState === "loaded" ? 0 : undefined}
                title={pauldronState === "loaded" ? "Open larger pauldron preview" : undefined}
              >
                <img
                  alt={`${company.name} company pauldron`}
                  className={pauldronState === "loaded" ? "visible" : ""}
                  onError={() => setPauldronState("missing")}
                  onLoad={() => setPauldronState("loaded")}
                  src={pauldronUrl}
                />
                {pauldronState !== "loaded" && (
                  <span><b>PAULDRON</b><small>UNRECORDED</small></span>
                )}
              </div>
              {isAdminMode && (
                <div className="company-sigil-actions company-pauldron-actions">
                  <label>
                    {isPauldronBusy ? "WORKING…" : pauldronState === "loaded" ? "REPLACE PAULDRON" : "UPLOAD PAULDRON"}
                    <input
                      ref={pauldronInput}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={isPauldronBusy}
                      onChange={(event) => void uploadPauldron(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                  {pauldronState === "loaded" && (
                    <button disabled={isPauldronBusy} onClick={() => void removePauldron()} type="button">
                      REMOVE
                    </button>
                  )}
                </div>
              )}
              {pauldronMessage && <small className="company-sigil-status" role="status">{pauldronMessage}</small>}
            </div>
          </section>

          <section className="member-section">
            <div className="member-section-heading"><div><p className="section-kicker">Command cadre</p><h2>Company Headquarters</h2></div><span>{Math.min(company.strength, commandRoles.length)} billets</span></div>
            <div className="command-grid">
              {commandRoles.slice(0, company.strength).map((role, index) => (
                <article className="member-card panel" key={`${role}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span><div className="member-glyph">✦</div><h3>{role}</h3><p>Name unrecorded</p>
                </article>
              ))}
            </div>
          </section>

          <section className="member-section">
            <div className="member-section-heading"><div><p className="section-kicker">Battleline disposition</p><h2>Squad Roster</h2></div><span>{Math.max(0, company.strength - commandRoles.length)} line members</span></div>
            <div className="squad-grid">
              {squads.map((squad) => (
                <article className="squad-card panel" key={squad.number}>
                  <div className="squad-number">{String(squad.number).padStart(2, "0")}</div>
                  <div><h3>Squad {squad.number}</h3><p>{squad.leader}</p></div>
                  <strong>{squad.members}<small> members</small></strong>
                </article>
              ))}
            </div>
          </section>
        </div>
        {previewAsset && (
          <div
            className="heraldry-preview-backdrop"
            onMouseDown={(event) => event.target === event.currentTarget && setPreviewAsset(null)}
          >
            <section
              aria-labelledby="heraldry-preview-title"
              aria-modal="true"
              className="heraldry-preview-dialog"
              role="dialog"
            >
              <button
                aria-label="Close image preview"
                className="heraldry-preview-close"
                onClick={() => setPreviewAsset(null)}
                type="button"
              >
                ×
              </button>
              <p className="section-kicker">LUNAR DRAGONS · HERALDRY RELIQUARY</p>
              <h2 id="heraldry-preview-title">{previewAsset.label}</h2>
              <div className="heraldry-preview-image">
                <img alt={previewAsset.label} src={previewAsset.src} />
              </div>
              <small>Click outside the image or press Escape to close.</small>
            </section>
          </div>
        )}
        <footer><span>{company.number.toUpperCase()} COMPANY · MEMBER LEDGER</span><span>Every name is a weapon against oblivion.</span></footer>
      </section>
    </main>
  );
}
