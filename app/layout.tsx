import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminModeProvider } from "./_components/AdminMode";
import { ArchiveBootSequence } from "./_components/ArchiveBootSequence";
import { ChapterArchiveProvider } from "./_hooks/useChapterArchive";
import { getArchiveViewer } from "./archive-auth";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Lunar Dragons — Chapter Archive",
  description: "The command archive of the Lunar Dragons, an Ultima Founding Chapter prosecuting the Argent Vigil around the Nachmund Gauntlet.",
  metadataBase: new URL("https://chapter-archive.rapcon.chatgpt.site"),
  openGraph: {
    title: "The Lunar Dragons — Chapter Archive",
    description: "Reclaim what has been lost. Guard the passage. The Lunar Dragons prosecute the Argent Vigil.",
    images: ["/og-lunar-dragons.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Lunar Dragons — Chapter Archive",
    description: "The Lunar Dragons · Ultima Founding · The Argent Vigil.",
    images: ["/og-lunar-dragons.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getArchiveViewer();
  const bootAlreadyCompleted = (await cookies()).get("__Host-lunar_boot")?.value === "1";
  const signInHref = chatGPTSignInPath("/?authentication=chapter-master");
  const signOutHref =
    viewer?.kind === "guest"
      ? "/api/guest-auth/session?action=logout"
      : chatGPTSignOutPath("/");

  return (
    <html lang="en">
      <body>
        <ArchiveBootSequence
          displayName={viewer?.displayName ?? ""}
          isAuthenticated={Boolean(viewer)}
          isChapterMaster={Boolean(viewer?.canAdmin)}
          signInHref={signInHref}
          skipIntro={bootAlreadyCompleted}
        />
        <div className="cartography-transition-overlay" aria-hidden="true">
          <div className="cartography-transition-grid" />
          <div className="cartography-cog-frame"><i /><span /></div>
          <div className="cartography-transition-copy">
            <p>NOOSPHERIC CARTOGRAPHY LINK</p>
            <strong>DESCENDING CARTOGRAPHY STRATUM</strong>
            <small>RECALIBRATING COORDINATES · AUTHORITY VERIFIED</small>
            <div>
              <b>» LOCAL AXIS LOCKED</b>
              <b>» ORBITAL TELEMETRY RESOLVED</b>
              <b>» OPENING DEEP-ARCHIVE APERTURE</b>
            </div>
            <div className="cartography-load-status">
              <header>
                <span>COGITATOR LOAD</span>
                <small data-cartography-eta>LINK WINDOW: 03.00S</small>
              </header>
              <i><b /></i>
              <em><small>000</small><small>DATA-STRATUM TRANSFER</small><small>100</small></em>
            </div>
            <div className="cartography-terminal-stream" aria-hidden="true">
              <span>ARCHIVE_GATE::HANDSHAKE REQUESTED</span>
              <span>AUTHORITY_SEAL::LUNAR_DRAGONS ACCEPTED</span>
              <span>CRYPT_KEY::<i data-cartography-key>7A4C91D2</i> DECODED</span>
              <span>INDEX_COGITATOR::SEEKING CARTOGRAPHIC RECORD</span>
              <span>NOOSPHERIC_PACKET::INTEGRITY 100.000%</span>
              <span>ARCHIVE_GATE::ACCESS GRANTED</span>
            </div>
          </div>
          <div className="cartography-depth-meter"><i /></div>
        </div>
        {viewer ? (
          <AdminModeProvider
            canAdmin={viewer.canAdmin}
            displayName={viewer.displayName}
            signOutHref={signOutHref}
            viewerKind={viewer.kind}
          >
            <ChapterArchiveProvider>
              {children}
            </ChapterArchiveProvider>
          </AdminModeProvider>
        ) : null}
      </body>
    </html>
  );
}
