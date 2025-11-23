import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "News Capture Extension",
  version: pkg.version,
  description:
    "Capture cleaned news pages (text, images, audio, metadata) into your reading dashboard.",
  permissions: ["storage", "scripting", "tabs", "activeTab"],
  host_permissions: ["<all_urls>"],

  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  action: {
    default_popup: "popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  // CRX will compile these TS entrypoints for you
  background: {
    service_worker: "src/background.ts",
    type: "module"
  },

  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/contentScript.ts"],
      run_at: "document_idle"
    }
  ]
});
