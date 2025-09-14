const truthy = (v: string | undefined, def = false) => {
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

export const USE_EMBEDDINGS = truthy(process.env.USE_EMBEDDINGS, true);
export const USE_BM25 = truthy(process.env.USE_BM25, true);
export const USE_LLM = truthy(process.env.USE_LLM, false);
export const USE_CLOUD_LLM = truthy(process.env.USE_CLOUD_LLM, false);
export const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'xenova';
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
export const MAX_PAGES = Number(process.env.MAX_PAGES || 300);

export const SCORE_ALPHA = Number(process.env.SCORE_ALPHA || 0.7);
export const SCORE_BETA = Number(process.env.SCORE_BETA || 0.3);
export const SUBJECT_BOOST = Number(process.env.SUBJECT_BOOST || 1.2);
export const PLANE_BOOST = Number(process.env.PLANE_BOOST || 1.2);
export const PHRASE_BOOST = Number(process.env.PHRASE_BOOST || 1.2);
export const LOW_CONFIDENCE_THRESHOLD = Number(process.env.LOW_CONFIDENCE_THRESHOLD || 0.35);

