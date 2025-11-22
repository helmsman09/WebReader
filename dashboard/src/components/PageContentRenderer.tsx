import React from "react";
import type { Page } from "../types";
import type { ContentBlock, PageTemplate } from "@news-capture/types";

type Props = {
  page: Page;
};

export const PageContentRenderer: React.FC<Props> = ({ page }) => {
  const template: PageTemplate =
    (page.layoutTemplate as PageTemplate) || "text-only";
  const blocks: ContentBlock[] = (page.blocks || []) as any;

  if (!blocks || blocks.length === 0) {
    return <FallbackTextRenderer page={page} />;
  }

  switch (template) {
    case "image-top-text":
      return <ImageTopTextLayout blocks={blocks} />;
    case "image-flow":
      return <ImageFlowLayout blocks={blocks} />;
    case "audio-only":
      return <AudioOnlyLayout blocks={blocks} />;
    case "text-only":
    default:
      return <TextOnlyLayout blocks={blocks} />;
  }
};

const ImageTopTextLayout: React.FC<{ blocks: ContentBlock[] }> = ({
  blocks
}) => {
  const heroIndex = blocks.findIndex((b) => b.type === "image");
  const heroBlock =
    heroIndex >= 0
      ? (blocks[heroIndex] as Extract<ContentBlock, { type: "image" }>)
      : null;
  const restBlocks =
    heroIndex >= 0
      ? [...blocks.slice(0, heroIndex), ...blocks.slice(heroIndex + 1)]
      : blocks;

  return (
    <div>
      {heroBlock && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #ddd"
          }}
        >
          <img
            src={heroBlock.src}
            alt={heroBlock.alt || ""}
            style={{
              width: "100%",
              display: "block",
              maxHeight: 380,
              objectFit: "cover"
            }}
          />
          {heroBlock.caption && (
            <div
              style={{
                padding: 8,
                fontSize: 12,
                color: "#555",
                background: "#fafafa"
              }}
            >
              {heroBlock.caption}
            </div>
          )}
        </div>
      )}
      <div style={{ lineHeight: 1.6 }}>
        {restBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} variant="flow" />
        ))}
      </div>
    </div>
  );
};

const ImageFlowLayout: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  return (
    <div style={{ lineHeight: 1.6 }}>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} variant="flow" />
      ))}
    </div>
  );
};

const TextOnlyLayout: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  const textBlocks = blocks.filter(
    (b) => b.type === "paragraph" || b.type === "heading"
  );
  if (textBlocks.length === 0) {
    return <div style={{ fontSize: 13, color: "#777" }}>(No text content)</div>;
  }
  return (
    <div style={{ lineHeight: 1.6 }}>
      {textBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} variant="text-only" />
      ))}
    </div>
  );
};

const AudioOnlyLayout: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  const audioBlocks = blocks.filter((b) => b.type === "audio") as Extract<
    ContentBlock,
    { type: "audio" }
  >[];

  return (
    <div>
      {audioBlocks.length === 0 && (
        <div style={{ fontSize: 13, color: "#777" }}>(No audio provided)</div>
      )}

      {audioBlocks.map((b) => (
        <div
          key={b.id}
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fafafa"
          }}
        >
          {b.title && (
            <div
              style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
            >
              {b.title}
            </div>
          )}
          <audio controls src={b.src} style={{ width: "100%" }} />
        </div>
      ))}
    </div>
  );
};

type BlockRendererProps = {
  block: ContentBlock;
  variant: "flow" | "text-only";
};

const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  variant
}) => {
  if (block.type === "heading") {
    const fontSize = block.level === 1 ? 20 : block.level === 2 ? 17 : 15;
    const marginTop = block.level === 1 ? 18 : 14;
    return (
      <div
        style={{
          fontSize,
          fontWeight: 600,
          marginTop,
          marginBottom: 6
        }}
      >
        {block.text}
      </div>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        style={{
          margin: "8px 0",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap"
        }}
      >
        {block.text}
      </p>
    );
  }

  if (block.type === "image") {
    if (variant === "text-only") {
      return null;
    }
    return (
      <figure
        style={{
          margin: "14px 0",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #eee",
          background: "#fafafa"
        }}
      >
        <img
          src={block.src}
          alt={block.alt || ""}
          style={{
            width: "100%",
            display: "block",
            maxHeight: 360,
            objectFit: "contain"
          }}
        />
        {block.caption && (
          <figcaption
            style={{
              padding: 6,
              fontSize: 12,
              color: "#666",
              borderTop: "1px solid #eee",
              background: "#fdfdfd"
            }}
          >
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === "audio") {
    return (
      <div
        style={{
          margin: "12px 0",
          padding: 8,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa"
        }}
      >
        {block.title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 4
            }}
          >
            {block.title}
          </div>
        )}
        <audio controls src={block.src} style={{ width: "100%" }} />
      </div>
    );
  }

  return null;
};

const FallbackTextRenderer: React.FC<{ page: Page }> = ({ page }) => {
  if (page.paragraphs && page.paragraphs.length > 0) {
    return (
      <div style={{ lineHeight: 1.6 }}>
        {page.paragraphs.map((p) => (
          <p
            key={p.index}
            style={{
              margin: "8px 0",
              fontSize: 13,
              whiteSpace: "pre-wrap"
            }}
          >
            {p.text}
          </p>
        ))}
      </div>
    );
  }
  if (page.mainText) {
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.6
        }}
      >
        {page.mainText}
      </div>
    );
  }
  return <div style={{ fontSize: 13, color: "#777" }}>(No content)</div>;
};
