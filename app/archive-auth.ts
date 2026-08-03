import { cookies } from "next/headers";
import {
  guestSessionMaxAge,
  readGuestSessionToken,
} from "../storage/guest-accounts";
import { isArchiveAdmin } from "./admin-config";
import { getChatGPTUser } from "./chatgpt-auth";

export const guestSessionCookieName = "__Host-lunar_guest";

export type ArchiveViewer =
  | {
      kind: "chatgpt";
      displayName: string;
      email: string;
      canAdmin: boolean;
    }
  | {
      kind: "guest";
      displayName: string;
      username: string;
      canAdmin: false;
    };

export async function getArchiveViewer(): Promise<ArchiveViewer | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return {
      kind: "chatgpt",
      displayName: chatGPTUser.displayName,
      email: chatGPTUser.email,
      canAdmin: isArchiveAdmin(chatGPTUser.email),
    };
  }

  const token = (await cookies()).get(guestSessionCookieName)?.value;
  if (!token) return null;
  const guest = await readGuestSessionToken(token);
  return guest
    ? {
        kind: "guest",
        displayName: guest.displayName,
        username: guest.username,
        canAdmin: false,
      }
    : null;
}

export async function getArchiveAdmin() {
  const user = await getChatGPTUser();
  return user && isArchiveAdmin(user.email) ? user : null;
}

export function guestSessionCookie(token: string) {
  return `${guestSessionCookieName}=${token}; Path=/; Max-Age=${guestSessionMaxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearGuestSessionCookie() {
  return `${guestSessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!origin) {
    return fetchSite === "same-origin";
  }

  const allowedOrigins = new Set([new URL(request.url).origin]);
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) {
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto") ??
      (new URL(request.url).protocol === "http:" ? "http" : "https");
    allowedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }

  return allowedOrigins.has(origin);
}
