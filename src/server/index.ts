import express from 'express';
import path from 'path';
import observationsRouter from './routes/observations.js';
import searchRouter from './routes/search.js';
import reportsRouter from './routes/reports.js';
import trainerRouter from './routes/trainer.js';
import ingestRouter from './routes/ingest.js';
import { ensureDataFiles } from './lib/store.js';
import { ensureCorpusEmbeddings } from './lib/ensure_corpus_embeddings.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Ensure data directory & files exist
ensureDataFiles();
await ensureCorpusEmbeddings();

// API routes
app.use('/api/observations', observationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/trainer', trainerRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/documents', ingestRouter);

// Static for uploaded PDFs (POC only)
app.use('/uploads', express.static(path.resolve(path.dirname(new URL(import.meta.url).pathname), 'data', 'uploads')));

const PORT = Number(process.env.SERVER_PORT || 3001);
app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
