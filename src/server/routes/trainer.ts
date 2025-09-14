import express from 'express';
import { readJson, writeJson } from '../lib/store.js';
import type { TrainerQueueItem, TrainerReply } from '../../shared/types.js';

const router = express.Router();

router.get('/queue', (req, res) => {
  const queue = readJson<TrainerQueueItem[]>('trainer.json', []);
  res.json(queue);
});

router.post('/replies', (req, res) => {
  const { queueId, text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  const replies = readJson<TrainerReply[]>('trainer_replies.json', []);
  const reply: TrainerReply = { id: `tr_${Date.now()}`, queueId, text, createdAt: new Date().toISOString() };
  replies.push(reply);
  writeJson('trainer_replies.json', replies);
  if (queueId) {
    const queue = readJson<TrainerQueueItem[]>('trainer.json', []);
    const idx = queue.findIndex((q) => q.id === queueId);
    if (idx > -1) {
      queue[idx].status = 'resolved';
      writeJson('trainer.json', queue);
    }
  }
  res.status(201).json(reply);
});

export default router;
