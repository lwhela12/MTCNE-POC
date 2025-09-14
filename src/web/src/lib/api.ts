export type OutcomeStatus = 'worked' | 'partial' | 'didnt';

export interface AlbumHit { source: string; excerpt: string; badge: string }
export interface Observation {
  id: string;
  student: string;
  subject: string;
  plane: string;
  observation: string;
  action?: string;
  albumHit?: AlbumHit;
  outcome?: OutcomeStatus;
  date: string;
}

export interface SearchHit { id: string; title: string; excerpt: string; source: string; badge: string }
export interface IngestedDocument { id: string; title: string; filename: string; pages: number; createdAt: string }

export const api = {
  async listObservations(params?: { student?: string; subject?: string; from?: string; to?: string }): Promise<Observation[]> {
    const qs = new URLSearchParams(params as any).toString();
    const r = await fetch('/api/observations' + (qs ? `?${qs}` : ''));
    return r.json();
  },
  async createObservation(body: { student: string; subject: string; plane: string; observation: string; date?: string }): Promise<Observation> {
    const r = await fetch('/api/observations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  },
  async patchObservation(id: string, body: Partial<Observation>): Promise<Observation> {
    const r = await fetch(`/api/observations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  },
  async search(body: { q: string; subject?: string; plane?: string }): Promise<{ hits: SearchHit[]; lowConfidence: boolean }> {
    const r = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const low = r.headers.get('x-low-confidence') === '1';
    const hits = await r.json();
    return { hits, lowConfidence: low };
  },
  async report(params: { n: string; from?: string; to?: string }): Promise<{ narrative: string }> {
    const qs = new URLSearchParams(params as any).toString();
    const r = await fetch('/api/reports?' + qs);
    return r.json();
  },
  async ingest(file: File): Promise<IngestedDocument> {
    const fd = new FormData();
    fd.set('file', file);
    const r = await fetch('/api/ingest', { method: 'POST', body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async listDocuments(): Promise<IngestedDocument[]> {
    const r = await fetch('/api/documents');
    return r.json();
  },
  async listChunks(limit = 5): Promise<any[]> {
    const r = await fetch('/api/ingest/chunks?limit=' + limit);
    return r.json();
  },
  async trainerQueue(): Promise<any[]> {
    const r = await fetch('/api/trainer/queue');
    return r.json();
  },
  async trainerReply(body: { queueId?: string; text: string }): Promise<any> {
    const r = await fetch('/api/trainer/replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  },
};
