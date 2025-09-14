import express from 'express';
import { searchHybrid } from '../lib/retrieval.js';
import { readJson, writeJson } from '../lib/store.js';
import type { TrainerQueueItem } from '../../shared/types.js';
import type { DocChunk, IngestedDocument } from '../../shared/types.js';
import path from 'path';
import { generateGuidance } from '../lib/llm.js';
import { LLM_MODEL, USE_LLM, USE_CLOUD_LLM } from '../lib/config.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { q, subject, plane } = req.body || {};
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q required' });
  try {
    const result: any = await searchHybrid({ q, subject, plane, topK: 3 });
    const { hits, lowConfidence, meta } = result;
    if (lowConfidence || hits.length === 0) {
      const queue = readJson<TrainerQueueItem[]>('trainer.json', []);
      queue.push({ id: `tq_${Date.now()}`, query: q, subject, plane, createdAt: new Date().toISOString(), status: 'open' });
      writeJson('trainer.json', queue);
    }
    if (lowConfidence) res.setHeader('x-low-confidence', '1');
    // LLM debug headers for visibility in devtools
    const used: string[] = [];
    if (meta?.canonicalizeUsed) used.push('canonicalize');
    if (meta?.rerankUsed) used.push('rerank');
    if (used.length) {
      res.setHeader('x-llm', used.join(','));
      const parts: string[] = [];
      if (meta?.canonicalizeMs) parts.push(`canon=${meta.canonicalizeMs}ms`);
      if (meta?.rerankMs) parts.push(`rerank=${meta.rerankMs}ms`);
      if (parts.length) res.setHeader('x-llm-ms', parts.join(','));
    }
    return res.json(hits);
  } catch (e: any) {
    return res.status(500).json({ error: 'search_failed', detail: String(e?.message || e) });
  }
});

// LLM-grounded guidance + search hits
router.post('/answer', async (req, res) => {
  const { q, subject, plane } = req.body || {};
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q required' });
  try {
    const result: any = await searchHybrid({ q, subject, plane, topK: 3 });
    const { hits, lowConfidence, meta } = result;
    let answer: any = null;
    if (USE_LLM && USE_CLOUD_LLM && hits.length) {
      const t0 = Date.now();
      const g = await generateGuidance({ query: q, hits: hits.slice(0, 3).map((h: any) => ({ id: h.id, title: h.title, excerpt: h.excerpt, source: h.source })) });
      if (g) {
        answer = g;
        res.setHeader('x-llm', ((res.getHeader('x-llm') as string) || '').split(',').filter(Boolean).concat('answer').join(','));
        res.setHeader('x-llm-ms', ((res.getHeader('x-llm-ms') as string) || '').split(',').filter(Boolean).concat(`answer=${Date.now() - t0}ms`).join(','));
      }
    }
    if (lowConfidence || hits.length === 0) {
      const queue = readJson<TrainerQueueItem[]>('trainer.json', []);
      queue.push({ id: `tq_${Date.now()}`, query: q, subject, plane, createdAt: new Date().toISOString(), status: 'open' });
      writeJson('trainer.json', queue);
      res.setHeader('x-low-confidence', '1');
    }
    return res.json({ hits, answer });
  } catch (e: any) {
    return res.status(500).json({ error: 'answer_failed', detail: String(e?.message || e) });
  }
});

// Fetch full text/details for a search hit id
// - corpus-* → returns full passage text
// - chunk_* → returns full chunk text + pdfUrl to open the original file at the page
router.get('/item/:id', (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (id.startsWith('corpus-')) {
    const corpus = readJson<any[]>('corpus.json', []);
    const baseId = id.slice('corpus-'.length);
    const c = corpus.find((x) => x.id === baseId);
    if (!c) return res.status(404).json({ error: 'not_found' });
    return res.json({ id, title: c.title, text: c.text, source: c.source, badge: 'Album-sourced | AMI' });
  }
  if (id.startsWith('chunk_') || id.startsWith('chunk-')) {
    const chunks = readJson<DocChunk[]>('chunks.json', []);
    const docs = readJson<IngestedDocument[]>('documents.json', []);
    let ch = chunks.find((x) => x.id === id);
    if (!ch && id.startsWith('chunk-')) {
      // Fallback legacy pattern: chunk-{docId}-{page}
      const parts = id.split('-');
      const docId = parts[1];
      const page = Number(parts[2]);
      ch = chunks.find((x) => x.docId === docId && x.page === page);
    }
    if (!ch) return res.status(404).json({ error: 'not_found' });
    const doc = docs.find((d) => d.id === ch!.docId);
    const pdfUrl = doc ? `/uploads/${path.basename(doc.filename)}#page=${ch.page}` : undefined;
    const title = doc?.title || ch.heading || 'Ingested Document';
    const source = `${title} · p.${ch.page}`;
    return res.json({ id, title, text: ch.text, source, badge: 'Album-sourced | AMI', pdfUrl, docId: ch.docId, page: ch.page });
  }
  return res.status(400).json({ error: 'unsupported_id' });
});

// Catch-all variant to handle encoded ids with unexpected characters
router.get('/item/*', (req, res) => {
  const id = req.params[0];
  if (!id) return res.status(400).json({ error: 'id required' });
  // Delegate to param route by reusing the handler via redirect
  return res.redirect(307, `/api/search/item/${encodeURIComponent(id)}`);
});

export default router;
