import { USE_LLM, USE_CLOUD_LLM, LLM_MODEL } from './config.js';

export type CanonicalizeResult = {
  normalizedQuery: string;
  subject?: string;
  plane?: string;
  keywords?: string[];
};

type ReRankCandidate = { id: string; title: string; excerpt: string; source: string };

let openaiClient: any | null = null;

async function getOpenAI() {
  if (!USE_LLM || !USE_CLOUD_LLM) return null;
  if (openaiClient) return openaiClient;
  try {
    const { OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openaiClient;
  } catch (e) {
    console.warn('[llm] OpenAI not available:', e);
    return null;
  }
}

export async function canonicalizeQuery(input: { q: string; subject?: string; plane?: string }): Promise<CanonicalizeResult | null> {
  if (!USE_LLM || !USE_CLOUD_LLM) return null;
  const client = await getOpenAI();
  if (!client) return null;
  const prompt = `You help normalize teacher queries for a Montessori album RAG system.
Output strict JSON with keys: normalized_query, subject, plane, keywords.
Allowed subjects: Math, Language, Culture, Grace & Courtesy.
Allowed planes: 0-6, 6-12, 12-18.
If unsure, omit the field. Do not add commentary.`;
  const user = {
    q: input.q,
    subject_hint: input.subject || null,
    plane_hint: input.plane || null,
  };
  try {
    const resp = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(user) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' } as any,
    });
    const content = resp.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const out: CanonicalizeResult = {
      normalizedQuery: parsed.normalized_query || input.q,
      subject: parsed.subject || input.subject,
      plane: parsed.plane || input.plane,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : undefined,
    };
    return out;
  } catch (e) {
    console.warn('[llm] canonicalize failed', e);
    return null;
  }
}

export async function rerankCandidates(q: string, cands: ReRankCandidate[]): Promise<string[] | null> {
  if (!USE_LLM || !USE_CLOUD_LLM) return null;
  const client = await getOpenAI();
  if (!client) return null;
  const prompt = `Re-rank the following candidate excerpts by relevance to the query.
Return a strict JSON array of candidate ids in best-to-worst order. No commentary.`;
  const user = {
    query: q,
    candidates: cands.map((c) => ({ id: c.id, title: c.title, source: c.source, excerpt: c.excerpt })),
  };
  try {
    const resp = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(user) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' } as any,
    });
    const txt = resp.choices[0]?.message?.content || '[]';
    // Accept either { order: [ids] } or [ids]
    let ids: string[] | null = null;
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) ids = parsed as string[];
      else if (parsed && Array.isArray(parsed.order)) ids = parsed.order as string[];
    } catch {
      // Try to salvage via regex for JSON array
      const m = txt.match(/\[(.|\n|\r)*\]/);
      if (m) {
        try { ids = JSON.parse(m[0]); } catch {}
      }
    }
    return ids;
  } catch (e) {
    console.warn('[llm] rerank failed', e);
    return null;
  }
}

export async function generateGuidance(input: {
  query: string;
  hits: { id: string; title: string; excerpt: string; source: string }[];
}): Promise<{
  answer: string;
  recommendations: { id: string; title: string; source: string }[];
  citations: { id: string; title: string; source: string; quote: string }[];
} | null> {
  if (!USE_LLM || !USE_CLOUD_LLM) return null;
  const client = await getOpenAI();
  if (!client) return null;
  const prompt = `You are helping a Montessori guide. Generate a brief, grounded response using ONLY the provided excerpts.
Rules:
- Do NOT invent any pedagogy; you may quote directly and paraphrase minimally.
- Include at least ONE direct quote from the excerpts, marked with quotes, and cite its source.
- Keep the response concise (2–4 sentences), using Montessori language where appropriate.
- Also return a list of cited sources used (with the exact quote) and recommended further reading.
Output strict JSON with keys:
{
  "answer": string,
  "citations": [{"id": string, "title": string, "source": string, "quote": string}],
  "recommendations": [{"id": string, "title": string, "source": string}]
}`;
  const user = {
    query: input.query,
    candidates: input.hits.map((h) => ({ id: h.id, title: h.title, source: h.source, excerpt: h.excerpt })),
  };
  try {
    const resp = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(user) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' } as any,
    });
    const content = resp.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed.answer !== 'string') return null;
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.map((r: any) => ({ id: String(r.id), title: String(r.title || ''), source: String(r.source || '') })) : [];
    const cites = Array.isArray(parsed.citations) ? parsed.citations.map((c: any) => ({ id: String(c.id), title: String(c.title || ''), source: String(c.source || ''), quote: String(c.quote || '') })) : [];
    return { answer: parsed.answer, recommendations: recs, citations: cites };
  } catch (e) {
    console.warn('[llm] guidance failed', e);
    return null;
  }
}
