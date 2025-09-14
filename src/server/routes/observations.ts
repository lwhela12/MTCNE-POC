import express from 'express';
import { readJson, writeJson } from '../lib/store.js';
import type { Observation } from '../../shared/types.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { student, subject, plane, observation, date } = req.body || {};
  if (!student) return res.status(400).json({ error: 'student required' });
  if (!subject) return res.status(400).json({ error: 'subject required' });
  if (!plane) return res.status(400).json({ error: 'plane required' });
  if (!observation) return res.status(400).json({ error: 'observation required' });

  const items = readJson<Observation[]>('observations.json', []);
  const nowISO = new Date().toISOString().slice(0, 10);
  const item: Observation = {
    id: `obs_${Date.now()}`,
    student,
    subject,
    plane,
    observation,
    date: (typeof date === 'string' && date) || nowISO,
  };
  items.push(item);
  writeJson('observations.json', items);
  res.status(201).json(item);
});

router.get('/', (req, res) => {
  const { student, subject, from, to } = req.query as Record<string, string>;
  const items = readJson<Observation[]>('observations.json', []);
  const filtered = items.filter((o) => {
    if (student && o.student !== student) return false;
    if (subject && o.subject !== subject) return false;
    if (from && o.date < from) return false;
    if (to && o.date > to) return false;
    return true;
  });
  res.json(filtered);
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { action, albumHit, outcome } = req.body || {};
  const items = readJson<Observation[]>('observations.json', []);
  const idx = items.findIndex((o) => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  if (action !== undefined) items[idx].action = action;
  if (albumHit !== undefined) items[idx].albumHit = albumHit;
  if (outcome !== undefined) items[idx].outcome = outcome;
  writeJson('observations.json', items);
  res.json(items[idx]);
});

export default router;
