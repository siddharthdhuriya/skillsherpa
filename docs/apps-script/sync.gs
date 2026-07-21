/**
 * SkillSherpa course sheet sync.
 *
 * Paste this whole file into the sheet's Apps Script editor
 * (Extensions -> Apps Script), replace SYNC_URL below with your real
 * domain, store the shared secret in Script Properties (see setup notes at
 * the bottom), then run `setupTriggers` once to schedule twice-daily runs.
 *
 * This script reads every data row, POSTs it to the app, and writes the
 * returned slug/status/last_synced back into this sheet — no Google Cloud
 * service account or API key needed; it runs under your own Google account,
 * which already owns this sheet.
 */

const SYNC_URL = "https://skillsherpa.in/api/cron/sync-sheet";
const REFRESH_RATINGS_URL = "https://skillsherpa.in/api/cron/refresh-ratings";

function syncCourseSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // header only, nothing to sync

  const rawHeaders = data[0];
  const headers = rawHeaders.map((h) =>
    String(h).trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const dataRows = data.slice(1);

  const rows = dataRows.map((row) => {
    const obj = {};
    headers.forEach((key, i) => {
      obj[key] = row[i] === undefined || row[i] === null ? "" : row[i];
    });
    return obj;
  });

  const secret = PropertiesService.getScriptProperties().getProperty("CRON_SECRET");
  if (!secret) {
    throw new Error(
      "CRON_SECRET is not set. Project Settings -> Script Properties -> add CRON_SECRET.",
    );
  }

  const response = UrlFetchApp.fetch(SYNC_URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());
  if (status >= 400 || !body.ok) {
    throw new Error("Sync failed (" + status + "): " + (body.error || response.getContentText()));
  }

  // Write slug/status/last_synced back, matching columns by header name so
  // it doesn't matter what order the columns are in.
  const slugCol = headers.indexOf("slug");
  const statusCol = headers.indexOf("status");
  const syncedCol = headers.indexOf("last_synced");
  const now = new Date().toISOString();

  body.results.forEach((result) => {
    const sheetRow = result.row + 1; // +1 for the header row
    if (slugCol >= 0 && result.slug) {
      sheet.getRange(sheetRow, slugCol + 1).setValue(result.slug);
    }
    if (statusCol >= 0) {
      const statusText =
        result.status === "failed" ? "Error: " + result.error : result.status;
      sheet.getRange(sheetRow, statusCol + 1).setValue(statusText);
    }
    if (syncedCol >= 0) {
      sheet.getRange(sheetRow, syncedCol + 1).setValue(now);
    }
  });

  Logger.log(
    "Synced " + body.processed + " rows: " + JSON.stringify(body.summary),
  );
}

/**
 * Re-fetches rating/review_count for every active course from its own
 * enrollment link and updates the catalog. Doesn't touch this sheet at all
 * (nothing to write back here) — it's a separate scheduled job that happens
 * to reuse the same script project, secret, and CRON_SECRET-gated auth as
 * syncCourseSheet.
 */
function refreshCourseRatings() {
  const secret = PropertiesService.getScriptProperties().getProperty("CRON_SECRET");
  if (!secret) {
    throw new Error(
      "CRON_SECRET is not set. Project Settings -> Script Properties -> add CRON_SECRET.",
    );
  }

  const response = UrlFetchApp.fetch(REFRESH_RATINGS_URL, {
    method: "post",
    headers: { Authorization: "Bearer " + secret },
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());
  if (status >= 400 || !body.ok) {
    throw new Error("Ratings refresh failed (" + status + "): " + (body.error || response.getContentText()));
  }

  Logger.log(
    "Refreshed ratings for " + body.processed + " courses: " +
      body.updated + " updated, " + body.unchanged + " unchanged, " + body.failed + " failed.",
  );
}

/**
 * Run this ONCE from the editor (select it in the function dropdown, click
 * Run) to schedule syncCourseSheet at ~8:00 and ~20:00, and
 * refreshCourseRatings every 2 days at ~6:00, all in the script's timezone
 * (Project Settings -> General -> Time zone controls which zone "atHour"
 * uses). Re-running it is safe — it clears any triggers this script already
 * owns before creating fresh ones, so it won't pile up duplicates if you run
 * it more than once.
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncCourseSheet").timeBased().atHour(8).everyDays(1).create();
  ScriptApp.newTrigger("syncCourseSheet").timeBased().atHour(20).everyDays(1).create();
  ScriptApp.newTrigger("refreshCourseRatings").timeBased().atHour(6).everyDays(2).create();
  Logger.log("Triggers created: sync daily around 8:00 and 20:00, ratings refresh every 2 days around 6:00.");
}

/**
 * SETUP NOTES
 * 1. Extensions -> Apps Script, delete the placeholder code, paste this file.
 * 2. Update SYNC_URL and REFRESH_RATINGS_URL above if your domain differs.
 * 3. Project Settings (gear icon) -> Script Properties -> Add script property
 *    -> name: CRON_SECRET, value: <the same secret configured in Vercel>.
 * 4. Function dropdown (top toolbar) -> select `setupTriggers` -> Run.
 *    The first run asks you to authorize the script (it needs permission to
 *    read/write this sheet and make external requests) — review and allow.
 * 5. To test immediately instead of waiting for the schedule: select
 *    `syncCourseSheet` or `refreshCourseRatings` in the dropdown and click
 *    Run.
 * 6. View -> Logs (or Ctrl+Enter after a run) shows what happened.
 */
