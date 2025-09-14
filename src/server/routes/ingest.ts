import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractPdfPerPage, chunkTextByPage, makeChunkId } from '../lib/ingest.js';
import { MAX_PAGES, MAX_UPLOAD_MB, USE_EMBEDDINGS } from '../lib/config.js';
import { readJson, writeJson, dataDir } from '../lib/store.js';
import type { DocChunk, IngestedDocument } from '../../shared/types.js';
import { getEmbeddingProvider } from '../lib/embeddings.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(dataDir, 'uploads')),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      fs.unlinkSync(req.file.path);
      return res.status(415).json({ error: 'unsupported_media_type', detail: 'PDF required' });
    }

    const { pages, perPageText } = await extractPdfPerPage(req.file.path);
    if (pages > MAX_PAGES) {
      fs.unlinkSync(req.file.path);
      return res.status(413).json({ error: 'too_large', detail: `Max ${MAX_PAGES} pages` });
    }

    const docs = readJson<IngestedDocument[]>('documents.json', []);
    const docId = `doc_${Date.now()}`;
    const doc: IngestedDocument = {
      id: docId,
      title: req.file.originalname.replace(/\.pdf$/i, ''),
      filename: path.basename(req.file.path),
      pages,
      createdAt: new Date().toISOString(),
    };
    docs.push(doc);
    writeJson('documents.json', docs);

    // Chunk pages
    const chunks = readJson<DocChunk[]>('chunks.json', []);
    const newChunks: DocChunk[] = [];
    for (let p = 0; p < perPageText.length; p++) {
      const pageNum = p + 1;
      const pageText = perPageText[p] || '';
      const pieces = chunkTextByPage(pageText, pageNum);
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        newChunks.push({ id: makeChunkId(docId, pageNum, i), docId, page: pageNum, text: piece });
      }
    }

    // Embeddings (optional)
    if (USE_EMBEDDINGS) {
      const provider = await getEmbeddingProvider();
      if (provider) {
        const vectors = await provider.embed(newChunks.map((c) => c.text));
        newChunks.forEach((c, i) => (c.embedding = vectors[i]));
      }
    }

    writeJson('chunks.json', chunks.concat(newChunks));
    res.status(201).json(doc);
  } catch (e: any) {
    return res.status(500).json({ error: 'ingest_failed', detail: String(e?.message || e) });
  }
});

router.get('/documents', (req, res) => {
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  res.json(docs);
});

router.delete('/documents/:id', (req, res) => {
  const { id } = req.params;
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  const before = docs.length;
  const next = docs.filter((d) => d.id !== id);
  if (next.length === before) return res.status(404).json({ error: 'not_found' });
  writeJson('documents.json', next);
  // Remove chunks but keep file for audit
  const chunks = readJson<DocChunk[]>('chunks.json', []);
  writeJson('chunks.json', chunks.filter((c) => c.docId !== id));
  res.json({ ok: true });
});

router.get('/chunks', (req, res) => {
  const limit = Number((req.query.limit as string) || 5);
  const chunks = readJson<DocChunk[]>('chunks.json', []);
  res.json(chunks.slice(-limit));
});

// Also support mounting at /api/documents
router.get('/', (req, res) => {
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  res.json(docs);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const docs = readJson<IngestedDocument[]>('documents.json', []);
  const before = docs.length;
  const next = docs.filter((d) => d.id !== id);
  if (next.length === before) return res.status(404).json({ error: 'not_found' });
  writeJson('documents.json', next);
  const chunks = readJson<DocChunk[]>('chunks.json', []);
  writeJson('chunks.json', chunks.filter((c) => c.docId !== id));
  res.json({ ok: true });
});

export default router;
