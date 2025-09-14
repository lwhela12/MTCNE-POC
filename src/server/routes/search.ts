import express from 'express';
import { searchHybrid } from '../lib/retrieval.js';
import { readJson, writeJson } from '../lib/store.js';
import type { TrainerQueueItem } from '../../shared/types.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { q, subject, plane } = req.body || {};
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q required' });
  try {
    const { hits, lowConfidence } = await searchHybrid({ q, subject, plane, topK: 3 });
    if (lowConfidence || hits.length === 0) {
      const queue = readJson<TrainerQueueItem[]>('trainer.json', []);
      queue.push({ id: `tq_${Date.now()}`, query: q, subject, plane, createdAt: new Date().toISOString(), status: 'open' });
      writeJson('trainer.json', queue);
    }
    return res.json(hits);
  } catch (e: any) {
    return res.status(500).json({ error: 'search_failed', detail: String(e?.message || e) });
  }
});

export default router;
