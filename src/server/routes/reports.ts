import express from 'express';
import { readJson } from '../lib/store.js';
import type { Observation } from '../../shared/types.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { n, from, to } = req.query as Record<string, string>;
  if (!n) return res.status(400).json({ error: 'n required: student|class' });
  const items = readJson<Observation[]>('observations.json', []);
  const filtered = items.filter((o) => {
    if (from && o.date < from) return false;
    if (to && o.date > to) return false;
    // n can be a student name or class label; we match prefix
    return o.student.toLowerCase().includes(n.toLowerCase());
  });

  const narrative = buildNarrative(n, filtered);
  res.json({ narrative });
});

function buildNarrative(name: string, obs: Observation[]): string {
  if (obs.length === 0) return `No observations found for ${name} in the selected period.`;
  const lines: string[] = [];
  lines.push(`${name} — Narrative Summary`);
  lines.push('');
  const bySubject: Record<string, Observation[]> = {};
  for (const o of obs) {
    bySubject[o.subject] ||= [];
    bySubject[o.subject].push(o);
  }
  for (const [subject, list] of Object.entries(bySubject)) {
    lines.push(`Subject: ${subject}`);
    for (const o of list) {
      const outcome = o.outcome ? `Outcome: ${o.outcome}.` : '';
      const action = o.action ? `Action: ${o.action}.` : '';
      const cite = o.albumHit ? ` Reference: ${o.albumHit.source}.` : '';
      lines.push(`- ${o.date} • Observation: ${o.observation}. ${action} ${outcome}${cite}`.trim());
    }
    lines.push('');
  }
  lines.push('This report reflects Montessori principles of observation, prepared environment, and freedom within limits, focusing on the child’s development and independence.');
  return lines.join('\n');
}

export default router;
