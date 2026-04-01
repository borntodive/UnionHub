#!/usr/bin/env node
// backup-oauth-setup.js — One-time setup: obtain a Google Drive refresh token
// Uses the existing OAuth client (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET from .env)
//
// Run once:
//   node scripts/backup-oauth-setup.js
//
// Then add BACKUP_DRIVE_REFRESH_TOKEN=<token> to your .env

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { google } = require("googleapis");

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
const envFile = path.join(__dirname, "../.env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const clean = line.replace(/\r$/, "").trim();
    if (!clean || clean.startsWith("#")) continue;
    const m = clean.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      let val = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      process.env[m[1]] = val;
    }
  }
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Start a local HTTP server to catch the OAuth callback
// ---------------------------------------------------------------------------
const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  REDIRECT_URI,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive.file"],
  prompt: "consent", // always return refresh_token
});

console.log("\n=== Google Drive OAuth Setup ===\n");
console.log("IMPORTANT: Make sure your Google OAuth client has this");
console.log("redirect URI authorized in Google Cloud Console:");
console.log(`\n  ${REDIRECT_URI}\n`);
console.log(
  "(Credentials → OAuth 2.0 Client IDs → your client → Authorized redirect URIs)\n",
);
console.log("Opening authorization URL — paste it in your browser:\n");
console.log("  " + authUrl + "\n");

// Try to open the browser automatically
try {
  const { execSync } = require("child_process");
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  execSync(`${opener} "${authUrl}"`, { stdio: "ignore" });
} catch (_) {
  // not critical
}

// ---------------------------------------------------------------------------
// Wait for the callback
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth/callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      `<h2>Authorization denied: ${error}</h2><p>You can close this tab.</p>`,
    );
    server.close();
    console.error("Authorization denied:", error);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h2>Missing code parameter.</h2>");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h2>✓ Authorization successful!</h2><p>You can close this tab and check the terminal.</p>",
    );
    server.close();

    if (!tokens.refresh_token) {
      console.error(
        "\nERROR: No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and run again.",
      );
      process.exit(1);
    }

    console.log("\n=== Done! Add this line to your .env ===\n");
    console.log("BACKUP_DRIVE_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("\n========================================\n");
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(`<h2>Error: ${err.message}</h2>`);
    server.close();
    console.error("ERROR exchanging code:", err.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(
    `Waiting for Google to redirect to http://localhost:${PORT} ...\n`,
  );
});
