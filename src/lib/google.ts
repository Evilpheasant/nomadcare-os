import "server-only";

export const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"];

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
}

export function redirectUri() {
  return `${process.env.APP_URL!.replace(/\/$/, "")}/api/google/callback`;
}

export function consentUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: "duncan@nomadcare.org",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; scope?: string; id_token?: string; expires_in: number };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
}

export async function accessTokenFrom(refreshToken: string) {
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  return t.access_token;
}

/** Minimal Gmail REST client with retry on rate limits. */
export function gmail(accessToken: string) {
  async function get<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      for (const x of Array.isArray(v) ? v : [v]) qs.append(k, x);
    }
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/${path}${qs.size ? `?${qs}` : ""}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) return res.json() as Promise<T>;
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw new Error(`Gmail ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  }
  return { get };
}

export type GmailHeader = { name: string; value: string };
export type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
};
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPart;
};
export type GmailThread = { id: string; historyId?: string; messages?: GmailMessage[] };
