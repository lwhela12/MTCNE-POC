import { EMBEDDING_MODEL, EMBEDDING_PROVIDER, USE_EMBEDDINGS } from './config.js';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  name: string;
}

export async function getEmbeddingProvider(): Promise<EmbeddingProvider | null> {
  if (!USE_EMBEDDINGS) return null;
  if (EMBEDDING_PROVIDER === 'xenova') {
    try {
      // Dynamic import to avoid hard dependency when disabled
      const { pipeline } = await import('@xenova/transformers');
      const pipe: any = await pipeline('feature-extraction', EMBEDDING_MODEL);
      const provider: EmbeddingProvider = {
        name: 'xenova',
        async embed(texts: string[]) {
          const outs: number[][] = [];
          for (const t of texts) {
            const output: any = await pipe(t, { pooling: 'mean', normalize: true });
            const arr = Array.from(output.data as Float32Array);
            outs.push(arr);
          }
          return outs;
        },
      };
      return provider;
    } catch (e) {
      console.warn('[embeddings] xenova provider unavailable:', e);
      return null;
    }
  }
  if (EMBEDDING_PROVIDER === 'openai') {
    try {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const provider: EmbeddingProvider = {
        name: 'openai',
        async embed(texts: string[]) {
          const res = await client.embeddings.create({
            model: EMBEDDING_MODEL || 'text-embedding-3-small',
            input: texts,
          });
          return res.data.map((d: any) => d.embedding as number[]);
        },
      };
      return provider;
    } catch (e) {
      console.warn('[embeddings] openai provider unavailable:', e);
      return null;
    }
  }
  return null;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

