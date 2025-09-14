export interface BM25Doc {
  id: string;
  text: string;
}

type Index = {
  postings: Map<string, Map<string, number>>;
  dl: Map<string, number>;
  df: Map<string, number>;
  N: number;
  avgdl: number;
};

let index: Index | null = null;

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s\-]/g, ' ').split(/\s+/).filter(Boolean);
}

export function buildBM25Index(docs: BM25Doc[]) {
  const postings = new Map<string, Map<string, number>>();
  const dl = new Map<string, number>();
  for (const d of docs) {
    const toks = tokenize(d.text);
    dl.set(d.id, toks.length);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, f] of tf) {
      let m = postings.get(t);
      if (!m) postings.set(t, (m = new Map()));
      m.set(d.id, f);
    }
  }
  const df = new Map<string, number>();
  for (const [t, m] of postings.entries()) df.set(t, m.size);
  const N = docs.length;
  const avgdl = [...dl.values()].reduce((a, b) => a + b, 0) / Math.max(1, N);
  index = { postings, dl, df, N, avgdl };
}

export function bm25Lookup(query: string, limit = 50, k1 = 1.5, b = 0.75): { id: string; score: number }[] {
  if (!index) return [];
  const terms = new Set(tokenize(query));
  const scores = new Map<string, number>();
  for (const t of terms) {
    const n = index.df.get(t) || 0;
    if (!n) continue;
    const idf = Math.log((index.N - n + 0.5) / (n + 0.5) + 1);
    const plist = index.postings.get(t);
    if (!plist) continue;
    for (const [docId, tf] of plist.entries()) {
      const dl = index.dl.get(docId) || 0;
      const denom = tf + k1 * (1 - b + b * (dl / (index.avgdl || 1)));
      const add = idf * ((tf * (k1 + 1)) / Math.max(denom, 1e-6));
      scores.set(docId, (scores.get(docId) || 0) + add);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, score]) => ({ id, score }));
}
