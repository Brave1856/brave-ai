export type Files = Record<string, string>;

const BLOCK = /```[^\n`]*?path=([^\s`]+)[^\n]*\n([\s\S]*?)(?:```|$)/g;

/** Apply every file block in the assistant text onto the files map. */
export function applyFileBlocks(base: Files, text: string): Files {
  const next = { ...base };
  for (const match of text.matchAll(BLOCK)) {
    const path = match[1]!.replace(/^\.?\//, "");
    const content = match[2]!.replace(/\n$/, "");
    if (content.trim() === "__DELETE__") delete next[path];
    else next[path] = content;
  }
  return next;
}

/** Text without code blocks, for chat display. */
export function proseOnly(text: string): string {
  return text.replace(BLOCK, (_m, p: string) => `\n\`✎ ${p}\`\n`).trim();
}

/** Build a single self-contained HTML doc for an iframe preview. */
export function buildPreview(files: Files): string {
  const html = files["index.html"];
  if (!html) {
    return `<html><body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0a0a0a;color:#888">No preview yet — ask the builder to make something.</body></html>`;
  }
  return html
    .replace(/<link([^>]*?)href=["']([^"':]+\.css)["']([^>]*)>/g, (m, _a, href: string) => {
      const css = files[href.replace(/^\.?\//, "")];
      return css != null ? `<style>${css}</style>` : m;
    })
    .replace(
      /<script([^>]*?)src=["']([^"':]+\.m?js)["']([^>]*)><\/script>/g,
      (m, a: string, src: string, b: string) => {
        const js = files[src.replace(/^\.?\//, "")];
        return js != null ? `<script${a}${b}>${js.replace(/<\/script>/g, "<\\/script>")}</script>` : m;
      },
    );
}

export async function downloadZip(name: string, files: Files) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name) || "app"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
