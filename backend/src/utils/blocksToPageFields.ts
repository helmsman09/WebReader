import type {
  ContentBlock,
  Paragraph,
  ArticleImageWithCategory
} from "@news-capture/types";

export function deriveFromBlocks(blocks: ContentBlock[]): {
  mainText: string;
  paragraphs: Paragraph[];
  images: ArticleImageWithCategory[];
} {
  const paragraphs: Paragraph[] = [];
  const images: ArticleImageWithCategory[] = [];

  let paraIndex = 0;
  let imgIndex = 0;
  const textPieces: string[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      paragraphs.push({
        index: paraIndex++,
        text: block.text
      });
      textPieces.push(block.text);
    } else if (block.type === "heading") {
      paragraphs.push({
        index: paraIndex++,
        text: block.text
      });
      textPieces.push(block.text);
    } else if (block.type === "image") {
      images.push({
        index: imgIndex++,
        src: block.src,
        alt: block.alt || "",
        width: block.width ?? 0,
        height: block.height ?? 0,
        category: "photo",
        ocrText: undefined
      });
    }
  }

  const mainText = textPieces.join("\n\n");
  return { mainText, paragraphs, images };
}
