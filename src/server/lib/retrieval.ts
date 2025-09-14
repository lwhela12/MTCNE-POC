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
  const { q, subject, plane, topK = 3 } = params;
  const corpus = readJson<CorpusEntry[]>('corpus.json', []);
  const chunks = readJson<DocChunk[]>('chunks.json', []);
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  const corpusEmb = getCorpusEmbeddings();

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
    for (const { id, score } of bm25Lookup(q, 50)) {
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
        const [qEmb] = await provider.embed([q]);
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

  const ranked = [...candMap.values()].sort((a, b) => b.score - a.score).slice(0, topK);
  const lowConfidence = (ranked[0]?.cosine ?? 0) < LOW_CONFIDENCE_THRESHOLD && (ranked[0]?.bm25 ?? 0) < 0.1;
  const hits: SearchHit[] = ranked.map((c, i) => ({
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
