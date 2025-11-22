import type { CapturedPage, ExtensionSettings } from "./types";

type BgMessage =
  | { type: "POPUP_CAPTURE_PAGE" }
  | { type: "INTERNAL_TEST" };

function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ["backendUrl", "apiKey", "defaultSharingMode"],
      (res) => {
        resolve({
          backendUrl: res.backendUrl || "",
          apiKey: res.apiKey || "",
          defaultSharingMode: res.defaultSharingMode || "private"
        });
      }
    );
  });
}

async function captureActiveTabAndUpload(): Promise<{
  ok: boolean;
  error?: string;
  pageTitle?: string;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "No active tab" };
  }

  const settings = await getSettings();
  if (!settings.backendUrl || !settings.apiKey) {
    return { ok: false, error: "Missing backend URL or API key" };
  }

  const captureResponse = await chrome.tabs.sendMessage(tab.id, {
    type: "CAPTURE_PAGE"
  });

  if (!captureResponse?.ok) {
    return {
      ok: false,
      error: captureResponse?.error || "Content script failed"
    };
  }

  const page: CapturedPage = captureResponse.page;

  const body = {
    title: page.title,
    tags: [],
    sharingMode: settings.defaultSharingMode,
    layoutTemplate: page.layoutTemplate,
    sourceType: "web-page",
    url: page.url,
    blocks: page.blocks,
    meta: page.meta
  };

  const res = await fetch(
    settings.backendUrl.replace(/\\/$/, "") + "/api/uploads/page",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      error: text || `Backend responded with ${res.status}`
    };
  }

  const json = await res.json().catch(() => null);

  chrome.storage.local.set({
    lastCapture: {
      at: Date.now(),
      pageUrl: page.url,
      pageTitle: page.title
    }
  });

  return { ok: true, pageTitle: page.title || json?.page?.title };
}

chrome.runtime.onMessage.addListener(
  (msg: BgMessage, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "POPUP_CAPTURE_PAGE") {
      (async () => {
        try {
          const result = await captureActiveTabAndUpload();
          sendResponse(result);
        } catch (e: any) {
          console.error("POPUP_CAPTURE_PAGE error", e);
          sendResponse({
            ok: false,
            error: e?.message || "Unexpected error"
          });
        }
      })();
      return true;
    }
  }
);
