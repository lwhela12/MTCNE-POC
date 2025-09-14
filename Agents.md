# Agents.md

This file is for the **coding agent** that will implement the Montessori Mentor Tool POC.
Keep it simple, follow the referenced docs, and avoid inventing requirements.

---

## 1) Sources of Truth & Precedence

* **docs/PRD.md** — product scope, goals, success metrics.
* **docs/Design.md** — architecture, data model, flows, UX principles.
* **docs/Mock\_UI.ts** — **non‑functional** UI sketch; visual guidance only.

**Precedence if there’s a conflict:** PRD.md → Design.md → this Agents.md → Mock\_UI.ts.
Do **not** contradict the PRD/Design; if unclear, prefer smaller, demonstrable scope.

---

## 2) POC Scope (what to build)

Implement a minimal, end‑to‑end demo that shows:

1. **Observation → Action → Outcome** loop (must tie each observation to a **student/class**).
2. **Ask the Album** search returning **extractive** passages (from a small demo corpus + ingested docs).
3. **Narrative report** generator (from logged observations/outcomes).
4. **Trainer review** queue for low‑confidence queries (no auth required for POC).
5. **Document ingestion** — upload a PDF album or theory doc, extract text, chunk, and include in search.

Out of scope for POC: third‑party integrations, school‑wide admin dashboards, external services.

---

## 3) Repo Layout (suggested)

```
/docs
  ├─ PRD.md
  ├─ Design.md
  └─ Mock_UI.ts        # Non-working visual example only
/src
  ├─ server/           # Minimal mock API (Node/TS, express or fastify)
  │   ├─ index.ts
  │   ├─ routes/
  │   │   ├─ observations.ts
  │   │   ├─ search.ts
  │   │   ├─ reports.ts
  │   │   ├─ trainer.ts
  │   │   └─ ingest.ts
  │   ├─ lib/
  │   │   ├─ retrieval.ts   # keyword/BM25 + simple re-rank
  │   │   └─ ingest.ts      # pdf→text, chunking
  │   └─ data/
  │       ├─ corpus.json    # small demo passages
  │       ├─ chunks.json    # persisted chunks from ingested docs
  │       └─ uploads/       # uploaded PDFs (local disk, POC only)
  ├─ web/              # React + Vite + Tailwind + shadcn/ui
  │   ├─ App.tsx
  │   ├─ components/
  │   ├─ pages/
  │   │   ├─ Home.tsx
  │   │   ├─ AskAlbum.tsx
  │   │   ├─ Reports.tsx
  │   │   ├─ TrainerQueue.tsx
  │   │   └─ Library.tsx     # ingestion UI
  │   └─ lib/
  └─ shared/
      └─ types.ts      # Shared TS interfaces
```

---

## 4) Tech & Conventions

* **TypeScript** everywhere.
* **React + Vite**, Tailwind, shadcn/ui.
* **Node + Express** (or Fastify) for a **mock** API.
* **Retrieval:** Hybrid vectors + BM25 with local‑first defaults. LLMs are allowed for query canonicalization, re‑ranking, and narrative reports. Answers remain strictly extractive with citations.
* **External services:** Optional and opt‑in via env flags. Default is local‑only; no data leaves the machine unless explicitly enabled.
* **Persistence:** Local disk for uploads and JSON stores (and optional embeddings) is allowed for the POC.
* Lint: eslint + prettier; format on save.

---

## 5) Data Contracts (copy into `/src/shared/types.ts`)

```ts
export type OutcomeStatus = 'worked' | 'partial' | 'didnt';

export interface AlbumHit {
  source: string;   // e.g., "Elementary Math Album · p.212"
  excerpt: string;  // short extractive passage
  badge: string;    // e.g., "Album-sourced | AMI" | "Trainer-reviewed"
}

export interface Observation {
  id: string;
  student: string;      // required (pseudonym or class OK)
  subject: string;      // Math | Language | Culture | Grace & Courtesy
  plane: string;        // '0-6' | '6-12' | '12-18'
  observation: string;  // short, objective note
  action?: string;      // chosen next step (may start empty)
  albumHit?: AlbumHit;  // citation for chosen guidance
  outcome?: OutcomeStatus;
  date: string;         // ISO YYYY-MM-DD
}

export interface SearchHit {
  id: string;
  title: string;    // human-friendly heading
  excerpt: string;  // extractive
  source: string;   // citation string
  badge: string;    // authenticity badge
}

export interface IngestedDocument {
  id: string;
  title: string;      // doc title or filename
  filename: string;   // stored filename
  pages: number;
  createdAt: string;  // ISO
}

export interface DocChunk {
  docId: string;
  page: number;
  heading?: string;
  text: string;
  subject?: string;   // optional tags
  plane?: string;
}
```

---

## 6) Mock API (in-memory + local files)

Implement these endpoints with in‑memory stores persisted to JSON under `/src/server/data` and PDFs stored under `/src/server/data/uploads`:

* `POST /api/observations` → create `Observation` (validate `student` required).
* `GET  /api/observations` → list; query by `student`, `subject`, `dateRange`.
* `PATCH /api/observations/:id` → set `action`, `albumHit`, and/or `outcome`.
* `POST /api/search` → returns `SearchHit[]` from **(a)** `corpus.json` and **(b)** ingested `chunks.json`.
  * Use hybrid retrieval: embeddings cosine similarity + BM25 lexical score, with plane/subject filters and small boosts.
  * Return 2–3 hits with citations (include `doc title · p.{page}` for ingested results).
  * If top score < threshold, return a “Needs trainer review” indicator and enqueue context to trainer queue.
* `GET  /api/reports?n=student|class&from=&to=` → narrative string built from observations (tone per PRD).
* `GET  /api/trainer/queue` & `POST /api/trainer/replies` → stubbed list and post.

**Document ingestion**

* `POST /api/ingest` (multipart/form-data: `file`) →

  * save PDF to `data/uploads/`
  * extract text per page (use a lightweight parser such as `pdf-parse`); if a page is mostly non-text, perform OCR fallback (e.g., `tesseract.js`).
  * chunk by page/heading (\~500–800 chars), attach metadata `{docId, page, heading}`
  * if embeddings are enabled, compute and persist an embedding per chunk (local model by default)
  * append chunks to `data/chunks.json` (embedding inline or referenced, implementation detail)
  * return `IngestedDocument` summary
* `GET  /api/documents` → list `IngestedDocument[]`
* (optional) `DELETE /api/documents/:id` → remove JSON chunks; keep the file for audit in POC

> Keep files small for the POC (≤10 MB, ≤300 pages). If larger, reject with 413 and a friendly message.

---

## 7) Retrieval (server `/lib/retrieval.ts`)

* Implement **hybrid retrieval** over `corpus.json` + `chunks.json`:
  * Build/maintain a BM25 index for lexical scoring.
  * Compute/store chunk embeddings when ingestion runs (local model by default; cloud optional).
  * At query time: optionally canonicalize/extract filters (subject/plane) via a lightweight LLM or rules; embed the query; filter by plane/subject; score candidates.
  * Combine scores: `final = α·cosine + β·bm25 + boosts` (start with α=0.7, β=0.3; boost exact phrase matches ×1.2 and subject/plane matches ×1.2–1.5).
  * Take top 3–5, format as `SearchHit` (title from heading or first sentence; `source` includes doc title + page).
* Keep answers strictly extractive. If `final` score of the best hit is below threshold, label as low‑confidence and add to the trainer queue.
* Local‑first: use a local embedding model such as `e5-small` or `all-MiniLM-L6-v2` via `@xenova/transformers`. Cloud embedding providers are supported only when explicitly enabled by env flags.

---

## 8) UI Worklist (minimal)

* **Home / Timeline**: list Observation cards (obs → albumHit → action → outcome). Quick filter by student.
* **Log Observation** (modal): fields = `student` (select), `plane`, `subject`, `observation`. On save → POST.
* **Ask the Album**: textarea + plane/subject filters → `POST /api/search`. Each result card has **Apply** → PATCH latest relevant Observation with `albumHit` + set `action` text.
* **Follow-up**: button group on the card to set `outcome` = worked/partial/didnt.
* **Reports**: pick student/class + date range → GET narrative → show + export (txt or simple HTML→PDF if trivial).
* **Trainer Queue**: static list from API; reply form posts but only updates in-memory store.
* **Library (ingestion)**: upload PDF → see parse progress → list documents with page counts; show the last 5 ingested chunks as a smoke test.

Use **docs/Mock\_UI.ts** for look & feel only; do not import it.

---

## 9) Guardrails (must keep authenticity)

* **Extractive answers only**: UI must display the exact excerpt `albumHit.excerpt` and its `source`.
* If no suitable hit, show **“Needs trainer review”** and push an item to the trainer queue.
* Default privacy: student names may be pseudonyms; never required.
* **LLM usage**: Allowed for query canonicalization, re‑ranking, and narrative reports. Not allowed to invent pedagogy or paraphrase excerpts.
* **IP caution**: uploads are for demo; treat them as confidential. Do not transmit outside the local dev environment unless `USE_CLOUD_LLM=true` and a provider is configured.

---

## 10) Definition of Done (POC)

* Can create observations tied to a student/class.
* Can upload a PDF, ingest it, and include resulting chunks in search (with embeddings computed when enabled).
* Search returns citations that clearly reference **doc title + page** (for ingested) or **corpus source** (for demo passages). Hybrid retrieval (vectors+BM25) works when enabled; BM25‑only mode remains as a fallback.
* Can attach album excerpts to an observation and mark outcomes.
* Can generate a simple narrative report.
* Trainer queue visible; replies saved in-memory.
* Runs locally with `npm run dev` (server + web) and no external services.

---

## 11) Run & Scripts (suggested)

* `npm run dev` — concurrently start web (Vite) and server (nodemon).
* `npm run build` — build web; compile server.
* `npm run lint` — eslint + prettier.

Add these deps on the **server**:
- Required: `multer` (upload), `pdf-parse` (text extraction), a small BM25/TF‑IDF lib (e.g., `wink-bm25-text-search` or `elasticlunr`).
- Optional local: `@xenova/transformers` (embeddings), `tesseract.js` (OCR fallback).
- Optional cloud: provider SDKs (e.g., `openai`) if using cloud embeddings/LLMs.

Environment flags (put in `.env` and document in `.env.example`):
- `USE_EMBEDDINGS=true|false` (default true)
- `USE_BM25=true|false` (default true)
- `USE_LLM=true|false` (default false)
- `USE_CLOUD_LLM=true|false` (default false)
- `EMBEDDING_PROVIDER=xenova|openai` (default xenova)
- `EMBEDDING_MODEL=e5-small|all-MiniLM-L6-v2|text-embedding-3-small`
- `OPENAI_API_KEY=` (only if cloud enabled)
- `MAX_UPLOAD_MB=10`, `MAX_PAGES=300`
- `SERVER_PORT=`, `WEB_PORT=` (optional)

---

## 12) Notes

* Keep code small and readable. Prefer fewer features that actually work.
* Do not move or rename files in `/docs`. If you add new endpoints or types, **reference** the docs; don’t restate them here.

---

### Appendix: PDF Parsing Strategy (for POC)

1) Default path (recommended): text‑first via `pdf-parse` per page → heading heuristics → chunk to ~500–800 chars with `{docId, page, heading}`. If a page has too little extractable text, run OCR via `tesseract.js` and mark chunks as OCR‑sourced for transparency.

2) Optional LLM structuring: when `USE_LLM=true`, an LLM may organize extracted text into headings/sections or generate tags (subject/plane). The raw text used for excerpts must remain verbatim; no paraphrasing.

3) Image‑to‑LLM JSON mode (not default): sending page images to a cloud LLM to obtain JSON structure is allowed only when `USE_CLOUD_LLM=true`. This increases cost/latency and IP exposure; prefer (1) + (2) for the POC.
