import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
export const dataDir = path.resolve(here, '..', 'data');

export function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const uploads = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
  for (const f of ['corpus.json', 'corpus_embeddings.json', 'chunks.json', 'documents.json', 'observations.json', 'trainer.json', 'trainer_replies.json']) {
    const p = path.join(dataDir, f);
    if (!fs.existsSync(p)) {
      const init = f === 'corpus.json' ? [] : f === 'corpus_embeddings.json' ? {} : [];
      fs.writeFileSync(p, JSON.stringify(init, null, 2));
    }
  }
}

export function readJson<T>(filename: string, fallback: T): T {
  const file = path.join(dataDir, filename);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(filename: string, data: T) {
  const file = path.join(dataDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
