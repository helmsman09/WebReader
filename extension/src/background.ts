import type { CapturedPage, ExtensionSettings } from "./types";

type BgMessage =
  | { type: "POPUP_CAPTURE_PAGE" }
  | { type: "INTERNAL_TEST" };

function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ["backendUrl", "apiKey", "defaultSharingMode", "dashboardUrl"],
      (res) => {
        resolve({
          backendUrl: res.backendUrl || "",
          apiKey: res.apiKey || "",
          defaultSharingMode: res.defaultSharingMode || "private",
          dashboardUrl: res.dashboardUrl || ""
        });
      }
    );
  });
}
async function ensureApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["apiKey", "backendUrl"], async (res) => {
      let apiKey = res.apiKey as string | undefined;
      const backendUrl = res.backendUrl || "http://localhost:4000";

      if (apiKey) {
        return resolve(apiKey);
      }

      try {
        const resp = await fetch(`${backendUrl.replace(/\/$/, "")}/api/auth/device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceLabel: "Chrome extension" })
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || "Failed to create device key");
        }

        const data = await resp.json();
        apiKey = data.apiKey;
        chrome.storage.sync.set({ apiKey });
        resolve(apiKey);
      } catch (e) {
        console.error("ensureApiKey error", e);
        reject(e);
      }
    });
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

  const payload = {
    title: page.title,
    tags: [],
    sharingMode: settings.defaultSharingMode,
    layoutTemplate: page.layoutTemplate,
    sourceType: "web-page",
    url: page.url,
    blocks: page.blocks,
    meta: page.meta
  };

  const backendUrl = settings.backendUrl || "http://localhost:4000";
  const apiKey = await ensureApiKey();
  const res = await fetch(
    backendUrl.replace(/\/$/, "") + "/api/uploads/page",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
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

  return {
    ok: true,
    pageTitle: page.title || json?.page?.title,
    pageId: json?.page?._id   // <-- Make sure backend returns this!
   };
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
