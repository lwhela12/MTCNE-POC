import { readJson, writeJson } from './store.js';
import { USE_EMBEDDINGS } from './config.js';
import { getEmbeddingProvider } from './embeddings.js';

type CorpusEntry = { id: string; title: string; text: string; source: string; subject?: string; plane?: string };

export async function ensureCorpusEmbeddings(): Promise<void> {
  if (!USE_EMBEDDINGS) return;
  const provider = await getEmbeddingProvider();
  if (!provider) return;
  const corpus = readJson<CorpusEntry[]>('corpus.json', []);
  const map = readJson<Record<string, number[]>>('corpus_embeddings.json', {});
  const missing = corpus.filter((c) => !map[c.id]);
  if (missing.length === 0) return;
  const vectors = await provider.embed(missing.map((c) => c.text));
  missing.forEach((c, i) => (map[c.id] = vectors[i]));
  writeJson('corpus_embeddings.json', map);
}

export function getCorpusEmbeddings(): Record<string, number[]> {
  return readJson<Record<string, number[]>>('corpus_embeddings.json', {});
}

