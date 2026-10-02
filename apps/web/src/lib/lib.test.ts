import { describe, expect, it } from "vitest";
import { readCookie } from "./api";
import { formatDate, label, relativeDays } from "./format";
import { toBlocks } from "./messageFormat";

describe("format", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2026-10-01")).toBe("Oct 1, 2026");
    expect(formatDate(null)).toBe("—");
  });
  it("labels enum values", () => {
    expect(label("construction_documents")).toBe("Construction documents");
  });
  it("describes relative days", () => {
    expect(relativeDays(0)).toBe("Today");
    expect(relativeDays(-3)).toBe("3 days overdue");
  });
});

describe("readCookie", () => {
  it("finds a cookie value", () => {
    expect(readCookie("a=1; ava_csrf=abc%3D; b=2", "ava_csrf")).toBe("abc=");
    expect(readCookie("a=1", "ava_csrf")).toBeNull();
  });
});

describe("toBlocks", () => {
  it("parses AVA's structured answers", () => {
    const blocks = toBlocks("PROJECT 25006 — LAS PIEDRAS\n\nStatus: Active\n• Structural: Firm\nPlain text.");
    expect(blocks).toEqual([
      { type: "heading", text: "PROJECT 25006 — LAS PIEDRAS" },
      { type: "spacer" },
      { type: "label", label: "Status", value: "Active" },
      { type: "bullet", text: "Structural: Firm" },
      { type: "text", text: "Plain text." },
    ]);
  });
  it("never produces HTML", () => {
    const blocks = toBlocks("<script>alert(1)</script>");
    expect(blocks[0]).toEqual({ type: "text", text: "<script>alert(1)</script>" });
  });
});
