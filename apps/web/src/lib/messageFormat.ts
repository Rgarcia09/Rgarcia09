// Turns AVA's plain-text answers into typed blocks for rendering. Content is never
// interpreted as HTML: React escapes every string, so answers cannot inject markup.

export type Block =
  | { type: "heading"; text: string }
  | { type: "label"; label: string; value: string }
  | { type: "bullet"; text: string }
  | { type: "text"; text: string }
  | { type: "spacer" };

const LABEL_RE = /^([A-Z][A-Za-z '()/-]{1,40}):\s*(.*)$/;

function isHeading(line: string): boolean {
  const letters = line.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase() && !line.startsWith("•");
}

export function toBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1]?.type !== "spacer") blocks.push({ type: "spacer" });
      continue;
    }
    if (/^\s*[•\-*]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: line.replace(/^\s*[•\-*]\s+/, "") });
    } else if (isHeading(line)) {
      blocks.push({ type: "heading", text: line });
    } else {
      const m = LABEL_RE.exec(line);
      if (m && m[1] && m[2] !== undefined) blocks.push({ type: "label", label: m[1], value: m[2] });
      else blocks.push({ type: "text", text: line });
    }
  }
  while (blocks.length && blocks[blocks.length - 1]?.type === "spacer") blocks.pop();
  return blocks;
}
