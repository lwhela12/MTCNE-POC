import { readJson } from './store.js';
import { bm25Lookup, buildBM25Index } from './bm25.js';
import {
  LOW_CONFIDENCE_THRESHOLD,
  PHRASE_BOOST,
  PLANE_BOOST,
  SCORE_ALPHA,
  SCORE_BETA,
  SUBJECT_BOOST,
  USE_BM25,
  USE_EMBEDDINGS,
} from './config.js';
import type { DocChunk, IngestedDocument, SearchHit } from '../../shared/types.js';
import { cosine, getEmbeddingProvider } from './embeddings.js';
import { getCorpusEmbeddings } from './ensure_corpus_embeddings.js';
import { canonicalizeQuery, rerankCandidates } from './llm.js';
import { MIN_FINAL_SCORE, RERANK_TOPK, USE_LLM, USE_CLOUD_LLM } from './config.js';

type CorpusEntry = {
  id: string;
  title: string;
  text: string;
  source: string;
  subject?: string;
  plane?: string;
};

type Candidate = {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  subject?: string;
  plane?: string;
  bm25?: number;
  cosine?: number;
  score: number;
};

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s\-]/g, ' ').split(/\s+/).filter(Boolean);
}

function phrasePresent(query: string, text: string) {
  const q = query.trim().toLowerCase();
  return q.length > 0 && text.toLowerCase().includes(q);
}

export async function searchHybrid(params: {
  q: string;
  subject?: string;
  plane?: string;
  topK?: number;
}): Promise<{ hits: SearchHit[]; lowConfidence: boolean }> {
  const { q, topK = 3 } = params;
  let subject = params.subject;
  let plane = params.plane;
  const corpus = readJson<CorpusEntry[]>('corpus.json', []);
  const chunks = readJson<DocChunk[]>('chunks.json', []);
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  const corpusEmb = getCorpusEmbeddings();

  // Optional LLM canonicalization to normalize query and extract hints
  let normalizedQ = q;
  let extraKeywords: string[] = [];
  if (USE_LLM && USE_CLOUD_LLM) {
    const can = await canonicalizeQuery({ q, subject, plane });
    if (can) {
      normalizedQ = can.normalizedQuery || q;
      subject = can.subject || subject;
      plane = can.plane || plane;
      extraKeywords = can.keywords || [];
    }
  }

  // Build unified candidates list
  const items: { id: string; title: string; text: string; source: string; subject?: string; plane?: string; embedding?: number[] }[] = [];
  for (const c of corpus) items.push({ id: `corpus-${c.id}`, title: c.title, text: c.text, source: c.source, subject: c.subject, plane: c.plane, embedding: corpusEmb[c.id] });
  const titleByDoc: Record<string, string> = Object.fromEntries(docs.map((d) => [d.id, d.title]));
  let chunkCounter = 0;
  for (const ch of chunks) {
    const title = titleByDoc[ch.docId] || ch.heading || 'Ingested Document';
    const id = `chunk-${ch.docId}-${ch.page}-${chunkCounter++}`;
    const source = `${title} · p.${ch.page}`;
    items.push({ id, title: ch.heading || title, text: ch.text, source, subject: ch.subject, plane: ch.plane, embedding: ch.embedding });
  }

  // Filters
  const filtered = items.filter((it) => {
    if (subject && it.subject && it.subject !== subject) return false;
    if (plane && it.plane && it.plane !== plane) return false;
    return true;
  });

  // BM25 candidates
  let bm25Results: Record<string, number> = {};
  if (USE_BM25) {
    buildBM25Index(filtered.map((f) => ({ id: f.id, text: f.text })));
    const bm25Query = [normalizedQ, ...extraKeywords].join(' ');
    for (const { id, score } of bm25Lookup(bm25Query, 50)) {
      bm25Results[id] = score;
    }
  }

  // Embedding similarity
  let cosineResults: Record<string, number> = {};
  let queryEmbedding: number[] | null = null;
  if (USE_EMBEDDINGS) {
    const provider = await getEmbeddingProvider();
    if (provider) {
      try {
        const [qEmb, nEmb] = await provider.embed([q, normalizedQ]);
        // Average original and normalized
        const avg: number[] = [];
        const L = Math.min(qEmb.length, nEmb.length);
        for (let i = 0; i < L; i++) avg[i] = (qEmb[i] + nEmb[i]) / 2;
        const norm = (v: number[]) => {
          let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1;
          return v.map((x) => x / s);
        };
        queryEmbedding = norm(avg);
        queryEmbedding = qEmb;
        // Compute if missing
        for (const it of filtered) {
          if (!it.embedding) continue;
          const sim = cosine(qEmb, it.embedding);
          cosineResults[it.id] = sim;
        }
      } catch (e) {
        console.warn('[retrieval] embedding failed; continuing without vectors', e);
      }
    }
  }

  // Combine
  const candMap = new Map<string, Candidate>();
  for (const it of filtered) {
    const bm = bm25Results[it.id] || 0;
    const co = cosineResults[it.id] || 0;
    let score = SCORE_ALPHA * co + SCORE_BETA * bm;
    if (subject && it.subject === subject) score *= SUBJECT_BOOST;
    if (plane && it.plane === plane) score *= PLANE_BOOST;
    if (phrasePresent(q, it.text)) score *= PHRASE_BOOST;
    candMap.set(it.id, {
      id: it.id,
      title: it.title,
      excerpt: pickExcerpt(it.text, q),
      source: it.source,
      subject: it.subject,
      plane: it.plane,
      bm25: bm,
      cosine: co,
      score,
    });
  }

  let ranked = [...candMap.values()].sort((a, b) => b.score - a.score);

  // Optional LLM rerank on top-K candidates
  if (USE_LLM && USE_CLOUD_LLM && ranked.length > 1) {
    const subset = ranked.slice(0, Math.min(RERANK_TOPK, ranked.length));
    try {
      const order = await rerankCandidates(normalizedQ, subset.map((c) => ({ id: c.id, title: c.title, excerpt: c.excerpt, source: c.source })));
      if (order && order.length) {
        const pos = new Map(order.map((id, i) => [id, i]));
        subset.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
        // Merge back with the rest, keeping re-ranked subset first
        const rest = ranked.slice(subset.length);
        ranked = [...subset, ...rest];
      }
    } catch (e) {
      console.warn('[retrieval] rerank failed', e);
    }
  }

  // Apply minimum score cutoff to avoid random-feeling results
  ranked = ranked.filter((c) => c.score >= MIN_FINAL_SCORE).slice(0, topK);

  const lowConfidence = ranked.length === 0 || ((ranked[0]?.cosine ?? 0) < LOW_CONFIDENCE_THRESHOLD && (ranked[0]?.bm25 ?? 0) < 0.1);
  const hits: SearchHit[] = ranked.map((c) => ({
    id: c.id,
    title: c.title,
    excerpt: c.excerpt,
    source: c.source,
    badge: c.source.includes('· p.') ? 'Album-sourced | AMI' : 'Trainer-reviewed',
  }));
  return { hits, lowConfidence };
}

function pickExcerpt(text: string, q: string): string {
  const t = text.trim();
  if (t.length <= 500) return t;
  // Try to center around first query token
  const toks = tokenize(q);
  const idx = toks.length ? t.toLowerCase().indexOf(toks[0]) : -1;
  if (idx > -1) {
    const start = Math.max(0, idx - 200);
    return t.slice(start, start + 500);
  }
  return t.slice(0, 500);
}
