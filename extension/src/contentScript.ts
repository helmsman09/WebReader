import { Block, CapturedPage, CapturedMeta } from "./types";

function isProbablyAd(el: Element): boolean {
  const cls = (el.className || "").toString().toLowerCase();
  const id = (el.id || "").toString().toLowerCase();
  const text = el.textContent?.toLowerCase() || "";

  const adWords = [
    "ad-",
    "ads-",
    "advert",
    "sponsor",
    "promoted",
    "outbrain",
    "taboola"
  ];

  if (adWords.some((w) => cls.includes(w) || id.includes(w))) return true;
  if (el.tagName === "ASIDE") return true;
  if (el.tagName === "NAV") return true;
  if (el.tagName === "FOOTER") return true;
  if (el.tagName === "FORM") return true;

  if (text.length < 60 && /sponsored|advertisement|ad:/i.test(text)) {
    return true;
  }
  return false;
}

function getMainContainer(): HTMLElement {
  const article = document.querySelector("article");
  if (article instanceof HTMLElement) return article;

  const main = document.querySelector("main");
  if (main instanceof HTMLElement) return main;

  const candidates = Array.from(
    document.querySelectorAll("div, section")
  ) as HTMLElement[];

  let best: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of candidates) {
    const text = el.innerText || "";
    const len = text.length;
    if (len < 500) continue;
    let score = len;
    const cls = el.className.toString().toLowerCase();
    if (cls.includes("article") || cls.includes("content")) score *= 1.2;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best || (document.body as HTMLElement);
}

function walkAndCollectBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  let blockIdCounter = 1;

  function nextId(prefix: string) {
    return `${prefix}${blockIdCounter++}`;
  }

  function visit(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (isProbablyAd(el)) return;

      const tag = el.tagName;

      if (/^H[1-3]$/.test(tag)) {
        const level = parseInt(tag[1], 10) as 1 | 2 | 3;
        const text = el.innerText.trim();
        if (text) {
          blocks.push({
            type: "heading",
            id: nextId("h"),
            text,
            level
          });
        }
        return;
      }

      if (tag === "P") {
        const text = el.innerText.trim();
        if (text) {
          blocks.push({
            type: "paragraph",
            id: nextId("p"),
            text
          });
        }
        return;
      }

      if (tag === "IMG") {
        const img = el as HTMLImageElement;
        const src = img.src;
        if (src) {
          blocks.push({
            type: "image",
            id: nextId("img"),
            src,
            alt: img.alt || "",
            width: img.naturalWidth || img.width || undefined,
            height: img.naturalHeight || img.height || undefined
          });
        }
        return;
      }

      if (tag === "AUDIO") {
        const audio = el as HTMLAudioElement;
        const src = audio.src;
        if (src) {
          blocks.push({
            type: "audio",
            id: nextId("a"),
            src,
            title: audio.title || audio.getAttribute("aria-label") || undefined
          });
        }
        return;
      }

      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(tag)) {
        return;
      }

      if (["UL", "OL"].includes(tag)) {
        const text = el.innerText.trim();
        if (text) {
          blocks.push({
            type: "paragraph",
            id: nextId("p"),
            text
          });
        }
        return;
      }

      for (const child of Array.from(el.childNodes)) {
        visit(child);
      }
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text.length > 40) {
        blocks.push({
          type: "paragraph",
          id: nextId("p"),
          text
        });
      }
    }
  }

  visit(root);
  return blocks;
}

function getMetaContent(selector: string): string | undefined {
  const el = document.querySelector(selector) as HTMLMetaElement | null;
  const raw = el?.getAttribute("content")?.trim();
  return raw || undefined;
}

function collectMeta(): CapturedMeta {
  const ogTitle = getMetaContent('meta[property="og:title"]');
  const ogDescription = getMetaContent('meta[property="og:description"]');
  const ogImage = getMetaContent('meta[property="og:image"]');

  const twitterTitle = getMetaContent('meta[name="twitter:title"]');
  const twitterDescription = getMetaContent('meta[name="twitter:description"]');
  const twitterImage = getMetaContent(
    'meta[name="twitter:image"], meta[name="twitter:image:src"]'
  );

  const metaDescription = getMetaContent('meta[name="description"]');

  const siteNameMeta =
    getMetaContent('meta[property="og:site_name"]') ||
    getMetaContent('meta[name="application-name"]');

  const siteName =
    siteNameMeta ||
    (window.location.hostname || "").replace(/^www\\./, "") ||
    undefined;

  return {
    ogTitle,
    ogDescription,
    ogImage,
    twitterTitle,
    twitterDescription,
    twitterImage,
    metaDescription,
    siteName
  };
}

function collectPageData(): CapturedPage {
  const container = getMainContainer();
  const blocks = walkAndCollectBlocks(container);
  const meta = collectMeta();

  return {
    url: window.location.href,
    title: document.title || meta.ogTitle || meta.twitterTitle || "",
    layoutTemplate: "image-flow",
    blocks,
    meta
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "CAPTURE_PAGE") {
    try {
      const page = collectPageData();
      sendResponse({ ok: true, page });
    } catch (e: any) {
      console.error("collectPageData error", e);
      sendResponse({ ok: false, error: e?.message || "Failed to collect page" });
    }
  }
  return true;
});
