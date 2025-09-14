import fs from 'fs';

async function loadPdfParse() {
  // Work around pdf-parse index.js self-test by importing the library file directly
  const mod: any = await import('pdf-parse/lib/pdf-parse.js');
  return mod.default || mod;
}

export async function extractPdfPerPage(filePath: string): Promise<{ pages: number; perPageText: string[] }>
{
  const dataBuffer = fs.readFileSync(filePath);
  // Use pagerender hook to preserve per-page text
  const perPage: string[] = [];
  const options = {
    pagerender: (pageData: any) => {
      // Keep text items joined with spaces
      const content = pageData.getTextContent();
      return content.then((text: any) => {
        const strs = text.items.map((it: any) => it.str);
        const pageText = strs.join(' ').replace(/\s+/g, ' ').trim();
        perPage.push(pageText);
        return pageText;
      });
    },
  } as any;
  const pdf = await loadPdfParse();
  const data = await pdf(dataBuffer, options);
  const pages = data.numpages || perPage.length;
  // Ensure perPage aligns with pages count
  if (perPage.length !== pages) {
    // Fallback split by form feed if available
    const full = (data.text || '').split('\f');
    if (full.length === pages) return { pages, perPageText: full.map((s) => s.trim()) };
  }
  return { pages, perPageText: perPage };
}

export function chunkTextByPage(text: string, page: number, opts?: { min?: number; max?: number }): string[] {
  const min = opts?.min ?? 500;
  const max = opts?.max ?? 800;
  const t = text.trim();
  if (!t) return [];
  if (t.length <= max) return [t];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + max, t.length);
    let slice = t.slice(i, end);
    // Try to end at sentence boundary
    const lastDot = slice.lastIndexOf('. ');
    if (lastDot > min) slice = slice.slice(0, lastDot + 1);
    chunks.push(slice.trim());
    i += slice.length;
  }
  return chunks;
}

export function makeChunkId(docId: string, page: number, idx: number) {
  return `chunk_${docId}_p${page}_i${idx}`;
}
