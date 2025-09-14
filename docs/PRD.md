# Product Requirements Document (PRD)  
**Project:** Montessori Mentor Tool (Proof of Concept)  
**Prepared by:** Lucas Whelan 
**Date:** Sept 2025  

---

## 1. Problem Statement
Montessori guides leave training with rich albums (7–9k pages of reference material) but quickly feel isolated in classrooms. Without easy ways to surface pedagogy-aligned answers, they drift toward outside resources, diluting Montessori authenticity. New teachers especially need timely mentorship, reminders of theory, and tools to record and reflect on their observations.

---

## 2. Goals
- **Accessibility:** Make album content instantly searchable and contextually relevant.  
- **Authenticity:** Keep guides within AMI pedagogy and albums.  
- **Mentorship at scale:** Replicate the experience of having trainers “at your side.”  
- **Reflection:** Support the Montessori “scientist loop” (observe → act → reflect → adjust).  
- **Demonstrability:** Provide a compelling POC without requiring access to full proprietary albums.

---

## 3. Users & Roles
- **Primary Users:** Montessori guides (teachers)  
- **Secondary Users:** Trainers (content curators, reviewers)  
- **Future Users:** Administrators (reports), Parents (narratives)  

---

## 4. POC Scope (MVP Features)

### 4.1 Album Upload & Adaptation
- Teacher uploads their album (PDF).  
- System ingests, chunks, and indexes text.  
- Queries answered with **extractive citations** from that album.  
- Demo version includes “synthetic” albums created by the product team.

### 4.2 Observation → Action → Outcome Loop
- **Observation logging:** Quick entry via text/voice.  
- **Surface guidance:** Tool suggests relevant album excerpts + theory passages.  
- **Action selection:** Teacher notes what they tried.  
- **Outcome logging:** Timed nudge to record what happened.  
- **Dashboard:** Timeline view of observations, actions, and outcomes.

### 4.3 Narrative Reports
- Generate qualitative summaries from logged observations/outcomes.  
- Language aligned with Montessori pedagogy (prepared environment, human tendencies, etc.).  
- Export as PDF for parent/admin conferences.

### 4.4 Trainer Curation (Phase 1-lite)
- When no good excerpt is found, system flags “Trainer Review.”  
- Trainers can add responses + tag them for future retrieval.

---

## 5. Out of Scope (POC)
- Full corpus ingestion (all albums, ~7–9k pages).  
- Third-party integrations (e.g., Transparent Classroom).  
- Robust admin dashboards.  
- Cross-school aggregation of anonymized data.  

---

## 6. Functional Requirements
1. **Album ingestion**: Accept PDF, convert to text, segment by heading/section.  
2. **Search & retrieval**: Hybrid semantic + keyword search; return 3–5 passages with citations.  
3. **Observation log**: Timestamped entries; attach to student/class context (names optional).  
4. **Follow-up nudge**: Configurable reminders (e.g., 24 hrs, 7 days).  
5. **Dashboard**: List view of observation loops; filter by student, subject, outcome.  
6. **Narrative report**: Summarize logs into coherent story; downloadable PDF.  
7. **Trainer review queue**: Flag low-confidence queries; allow trainers to reply.  

---

## 7. Non-Functional Requirements
- **Authenticity guardrails:** Answers always trace back to album/pedagogy.  
- **Privacy:** Default anonymization of student identifiers.  
- **Simplicity:** Mobile-first UI, voice input support.  
- **Scalability:** Architecture designed for future multi-school rollout.  
- **Performance:** Query response time < 3 seconds for pilot corpus.  

---

## 8. Success Metrics
- ≥80% of teacher queries resolved by album citations.  
- ≥60% of follow-up nudges completed.  
- ≥70% of pilot teachers generate a narrative report at least once.  
- Qualitative feedback: Teachers report “felt like I was back in training center.”  

---

## 9. Risks & Mitigations
- **Dilution of pedagogy:** Use extractive search only; trainer curation for new content.  
- **Low teacher engagement in outcome logging:** Use voice dictation + visible dashboards to make it useful for the teacher.  
- **Privacy concerns:** Student names optional, not required.  
- **Corpus complexity (7–9k pages):** Start with curated subset; expand later.  

---

## 10. Timeline (Pilot)
- **Weeks 0–1:** Ingest synthetic album + build search pipeline.  
- **Weeks 2–3:** Observation/action/outcome loop.  
- **Week 4:** Narrative report generation.  
- **Weeks 5–6:** Pilot with 5–10 teachers; collect feedback.  
- **Week 7:** Stakeholder demo + decision on expansion.  
