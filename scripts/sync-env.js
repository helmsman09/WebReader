// scripts/sync-env.js
//
// Syncs root BACKEND_URL into:
//   - dashboard/.env     (VITE_BACKEND_URL=...)
//   - mobile/.env        (EXPO_PUBLIC_BACKEND_URL=...)

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const rootDir = path.join(__dirname, "..");
const rootEnvPath = path.join(rootDir, ".env");

if (!fs.existsSync(rootEnvPath)) {
  console.error("❌ Root .env not found at", rootEnvPath);
  console.error("   Create it from .env.example with BACKEND_URL=...");
  process.exit(1);
}

const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath, "utf8"));
const backendUrl = rootEnv.BACKEND_URL;

if (!backendUrl) {
  console.error("❌ BACKEND_URL is missing in root .env");
  process.exit(1);
}

if (!/^https?:\/\//.test(backendUrl)) {
  console.error("❌ BACKEND_URL must include protocol, e.g. http:// or https://");
  console.error("   Current value:", backendUrl);
  process.exit(1);
}

// Dashboard .env (Vite)
const dashboardEnvPath = path.join(rootDir, "dashboard", ".env");
const dashboardEnvContent = `VITE_BACKEND_URL=${backendUrl}\n`;
fs.writeFileSync(dashboardEnvPath, dashboardEnvContent);
console.log("✅ Wrote", dashboardEnvPath);

// Mobile .env (Expo)
const mobileEnvPath = path.join(rootDir, "mobile", ".env");
const mobileEnvContent = `EXPO_PUBLIC_BACKEND_URL=${backendUrl}\n`;
fs.writeFileSync(mobileEnvPath, mobileEnvContent);
console.log("✅ Wrote", mobileEnvPath);

// Extension .env (Vite)
const extensionEnvPath = path.join(rootDir, "extension", ".env");
const extensionEnvContent = `VITE_BACKEND_URL=${backendUrl}\n`;
fs.writeFileSync(extensionEnvPath, extensionEnvContent);
console.log("✅ Wrote", extensionEnvPath);

console.log("✨ Env sync complete. BACKEND_URL =", backendUrl);
