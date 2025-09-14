# Design Document  
**Project:** Montessori Mentor Tool (Proof of Concept)  
**Prepared by:** Lucas Whelan & Aaron Lyles  
**Date:** Sept 2025  

---

## 1. Overview
The Montessori Mentor Tool provides a digital scaffolding for teachers to stay aligned with AMI pedagogy and their training albums. It combines album ingestion/search, an observation–action–outcome loop, and simple reporting features.  

The POC will demonstrate:
- Uploading albums (PDFs) → tool adapts automatically.
- Querying the albums with extractive answers.
- Logging observations, actions, and outcomes.
- Generating reports for teachers, administrators, and parents.
- Trainer curation for unresolved queries.

---

## 2. Architecture

### 2.1 System Components
1. **Frontend (Web App, Mobile-first)**  
   - Observation logging (text/voice).  
   - Ask-the-album search.  
   - Dashboard of observation loops.  
   - Narrative report generation/export.  

2. **Backend Services**  
   - **Document Ingestion Service**: PDF → text extraction → chunking → vector + keyword indexing.  
   - **Retrieval Service**: Hybrid search (semantic vectors + BM25).  
   - **Observation Service**: CRUD for observations, actions, outcomes.  
   - **Trainer Queue Service**: Flags low-confidence queries; stores curated responses.  
   - **Reporting Service**: Narrative generation from logs.  

3. **Data Store**  
   - Postgres: users, logs, metadata.  
   - Vector DB (e.g., Pinecone, Weaviate, or pgvector): album chunks, trainer responses.  
   - Object storage (e.g., S3, local) for raw PDFs.  

4. **LLM Layer**  
   - Used for:  
     - Re-ranking search results.  
     - Summarizing logs into narrative reports.  
   - *Constraint*: All pedagogical answers must be extractive with citations.  

---

### 2.2 Data Flow
1. **Album ingestion**  
   - Teacher uploads PDF → backend extracts text → chunked with headings → stored in vector DB with metadata.  

2. **Observation loop**  
   - Teacher logs observation (voice → speech-to-text or typed).  
   - Observation tagged (age, subject, topic).  
   - Retrieval service queries album + theory.  
   - Teacher selects an action; outcome reminder scheduled.  

3. **Follow-up**  
   - Reminder sent.  
   - Teacher logs outcome → stored in Observation Service.  
   - Dashboard updates with closed loop.  

4. **Trainer curation**  
   - If retrieval confidence < threshold → flagged.  
   - Trainer reviews in queue → attaches reference/explanation.  
   - Promoted replies added to corpus for future use.  

5. **Reporting**  
   - Teacher selects timeframe/student/class.  
   - Logs summarized into narrative using AMI language.  
   - Export as PDF/Word/text.  

---

## 3. Data Model

### User
- `user_id`  
- `role` {guide, trainer}  
- `school_id`  
- `email`

### Album
- `album_id`  
- `user_id`  
- `title`  
- `source_file` (PDF path)  
- `chunks` (indexed text with metadata)

### Observation
- `obs_id`  
- `user_id`  
- `timestamp`  
- `student_id` (optional pseudonym)  
- `age/plane`  
- `tags` (subject, topic, tendency)  
- `text` (raw observation)  

### Action
- `action_id`  
- `obs_id`  
- `album_ref_ids` (links to chunks)  
- `free_text`  
- `timestamp`  

### Outcome
- `outcome_id`  
- `obs_id`  
- `status` {worked, partial, didn’t}  
- `notes`  
- `timestamp`  

### TrainerReply
- `reply_id`  
- `obs_id` (linked observation theme)  
- `text`  
- `source_refs`  
- `status` {canonical, emerging practice}  

---

## 4. User Flows

### 4.1 Guide
1. Uploads album (PDF).  
2. Logs an observation (text/voice).  
3. “Ask the album” → receives 3–5 citations.  
4. Selects action → reminder scheduled.  
5. Logs outcome → dashboard shows loop complete.  
6. Generates narrative report for parents/admin.

### 4.2 Trainer
1. Reviews low-confidence queries.  
2. Adds response with album reference.  
3. Promotes response into shared corpus.  
4. Monitors anonymized trends in observations.

---

## 5. UX Sketches
- **Home:** Buttons → *Log observation*, *Ask the album*, *My follow-ups*, *Generate report*.  
- **Ask the album:** Dropdown filters (level, subject, topic) + free-text observation → list of excerpts with citations.  
- **Observation timeline:** Cards showing obs → action → outcome.  
- **Trainer queue:** Table of flagged queries with reply composer.  

---

## 6. Technical Considerations
- **Chunking:** Use semantic-aware chunking (headings + ~500 tokens).  
- **Retrieval:** Hybrid search with BM25 for keywords + vector embeddings for semantics.  
- **Guardrails:** No generative lesson invention; only album excerpts or trainer content.  
- **Privacy:** Default pseudonyms for students; full names optional by school policy.  
- **Performance:** Aim for sub-3s query responses on 300–600 page demo corpus.  
- **Scalability:** Architecture should scale to multi-album (7–9k pages).  

---

## 7. Pilot Plan
- **Step 1:** Demo with synthetic albums + product-generated documents.  
- **Step 2:** Pilot with 5–10 teachers (one training center, elementary level).  
- **Step 3:** Gather metrics: query resolution rate, follow-up completion, report generation usage.  
- **Step 4:** Refine before full corpus ingestion.  

---

## 8. Risks
- **Dilution risk:** Mitigated by extractive-only answers + trainer review.  
- **Engagement drop-off:** Mitigated by voice logging + teacher-facing dashboards.  
- **IP concerns:** Use synthetic/demo albums until AMI approval.  
- **Context window size:** Use hierarchical retrieval + caching.  

---

## 9. Future Enhancements
- Integration with Transparent Classroom.  
- Offline-first mobile app.  
- Admin reports that translate Montessori terms for non-trained leaders.  
- Research API for University of Hartford & Center for Montessori Studies.  
- Cross-school aggregation for trends/benchmarking.  

---
