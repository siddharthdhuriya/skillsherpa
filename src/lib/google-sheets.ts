import "server-only";

// Minimal Google Sheets API client using a service account, hand-rolled
// against Node's built-in crypto rather than pulling in the `googleapis` or
// `google-auth-library` packages — the OAuth2 JWT-bearer flow is a handful
// of well-documented steps and doesn't warrant a heavy dependency for two
// REST calls (read values, write values back).
//
// Required env vars:
//   GOOGLE_SHEET_ID               — from the sheet's URL
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  — from the service account JSON key
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — from the same JSON key ("private_key")
//
// The sheet must be shared with the service account's email as Editor
// (write access is needed to report slug/status/last-synced back).

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEET_RANGE = "A1:Z1000"; // generous bound; header row + up to ~1000 courses

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel env vars can't contain literal newlines cleanly; the key is
  // typically pasted with "\n" escape sequences, so unescape them here.
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error("Google service account credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Reads the sheet's header row + data rows and returns them as objects
 * keyed by header name (lowercased, spaces -> underscores — same
 * transform the CSV importer uses), mirroring what csvRowSchema expects.
 */
export async function readSheetRows(): Promise<Record<string, unknown>[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not configured.");
  const token = await getAccessToken();

  const res = await fetch(
    `${SHEETS_API}/${sheetId}/values/${SHEET_RANGE}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Could not read the sheet: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { values?: unknown[][] };
  const values = data.values ?? [];
  if (values.length === 0) return [];

  const headers = values[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_"));
  return values.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((key, i) => {
      obj[key] = row[i] ?? "";
    });
    return obj;
  });
}

export interface SheetWriteBack {
  /** 0-indexed data row (row 0 = first row under the header). */
  rowIndex: number;
  slug: string;
  status: string;
  lastSynced: string;
}

/**
 * Writes slug/status/last_synced back into the sheet. Requires those three
 * columns to exist in the header row; silently skips any that don't so a
 * differently-laid-out sheet doesn't hard-fail the whole sync.
 */
export async function writeBackToSheet(updates: SheetWriteBack[]): Promise<void> {
  if (updates.length === 0) return;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not configured.");
  const token = await getAccessToken();

  const headerRes = await fetch(`${SHEETS_API}/${sheetId}/values/A1:Z1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!headerRes.ok) {
    throw new Error(`Could not read the header row: ${headerRes.status} ${await headerRes.text()}`);
  }
  const headerData = (await headerRes.json()) as { values?: unknown[][] };
  const headers = (headerData.values?.[0] ?? []).map((h) =>
    String(h).trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const colIndex = (name: string) => headers.indexOf(name);
  const colLetter = (index: number) => {
    let n = index;
    let s = "";
    do {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  };

  const slugCol = colIndex("slug");
  const statusCol = colIndex("status");
  const syncedCol = colIndex("last_synced");

  const data = updates.flatMap(({ rowIndex, slug, status, lastSynced }) => {
    const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexing
    const cells: { range: string; values: unknown[][] }[] = [];
    if (slugCol >= 0) cells.push({ range: `${colLetter(slugCol)}${sheetRow}`, values: [[slug]] });
    if (statusCol >= 0) cells.push({ range: `${colLetter(statusCol)}${sheetRow}`, values: [[status]] });
    if (syncedCol >= 0) cells.push({ range: `${colLetter(syncedCol)}${sheetRow}`, values: [[lastSynced]] });
    return cells;
  });
  if (data.length === 0) return; // sheet has none of the three columns; nothing to write

  const res = await fetch(`${SHEETS_API}/${sheetId}/values:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
  if (!res.ok) {
    throw new Error(`Could not write back to the sheet: ${res.status} ${await res.text()}`);
  }
}
