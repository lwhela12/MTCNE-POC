import React, { useEffect, useMemo, useState } from 'react';
import { api, Observation, SearchHit } from './lib/api';

type Tab = 'home' | 'ask' | 'reports' | 'trainer' | 'library';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  return (
    <div className="min-h-screen p-4">
      <TopBar current={tab} onNav={setTab} />
      <div className="mx-auto max-w-6xl mt-4">
        {tab === 'home' && <Home />}
        {tab === 'ask' && <AskAlbum />}
        {tab === 'reports' && <Reports />}
        {tab === 'trainer' && <Trainer />}
        {tab === 'library' && <Library />}
      </div>
    </div>
  );
}

function TopBar({ current, onNav }: { current: Tab; onNav: (t: Tab) => void }) {
  const tabs: [Tab, string][] = [
    ['home', 'Home'],
    ['ask', 'Ask the Album'],
    ['reports', 'Reports'],
    ['trainer', 'Trainer Queue'],
    ['library', 'Library'],
  ];
  return (
    <div className="sticky top-0 z-10 bg-[var(--bg)] border-b">
      <div className="mx-auto max-w-6xl flex items-center gap-2 p-3">
        <div className="font-serif text-xl mr-4">Montessori Mentor</div>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => onNav(k)} className={`btn ${current === k ? 'bg-gray-100' : ''}`}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const [obs, setObs] = useState<Observation[]>([]);
  const [form, setForm] = useState({ student: '', plane: '6-12', subject: 'Math', observation: '' });

  useEffect(() => {
    api.listObservations().then(setObs);
  }, []);

  const submit = async () => {
    if (!form.student || !form.observation) return;
    const created = await api.createObservation(form);
    setObs((prev) => [created, ...prev]);
    setForm({ ...form, observation: '' });
  };

  const setOutcome = async (id: string, outcome: 'worked' | 'partial' | 'didnt') => {
    const updated = await api.patchObservation(id, { outcome });
    setObs((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Home / Timeline</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-medium mb-2">Log Observation</h3>
          <div className="grid gap-2">
            <input className="input" placeholder="Student or Class" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} />
            <select className="select" value={form.plane} onChange={(e) => setForm({ ...form, plane: e.target.value })}>
              <option>0-6</option>
              <option>6-12</option>
              <option>12-18</option>
            </select>
            <select className="select" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option>Math</option>
              <option>Language</option>
              <option>Culture</option>
              <option>Grace & Courtesy</option>
            </select>
            <textarea className="textarea" placeholder="Observation" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
            <button className="btn btn-primary" onClick={submit}>Save</button>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-medium mb-2">Observation Timeline</h3>
          {obs.map((o) => (
            <div key={o.id} className="border rounded-md p-3 mb-3">
              <div className="flex justify-between text-sm">
                <div>
                  <strong>{o.student}</strong> · {o.subject} · {o.date}
                </div>
                <div className="space-x-2">
                  {(['worked', 'partial', 'didnt'] as const).map((k) => (
                    <button key={k} onClick={() => setOutcome(o.id, k)} className="btn text-xs">{k}</button>
                  ))}
                </div>
              </div>
              <div className="italic mt-1">{o.observation}</div>
              {o.albumHit && (
                <div className="mt-2 bg-gray-50 rounded-md p-2">
                  <div className="text-xs text-gray-600">{o.albumHit.source}</div>
                  <div>“{o.albumHit.excerpt}”</div>
                  <div className="text-xs text-gray-600">{o.albumHit.badge}</div>
                </div>
              )}
              {o.action && <div className="mt-2">Action: {o.action}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AskAlbum() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [plane, setPlane] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const latestObservation = useMemo(() => observations[0], [observations]);

  useEffect(() => {
    api.listObservations().then(setObservations);
  }, []);

  const search = async () => {
    const hits = await api.search({ q, subject: subject || undefined, plane: plane || undefined });
    setResults(hits);
  };

  const applyToLatest = async (hit: SearchHit) => {
    if (!latestObservation) return alert('Log an observation first');
    const action = `Applied: ${hit.title}`;
    const albumHit = { source: hit.source, excerpt: hit.excerpt, badge: hit.badge };
    const updated = await api.patchObservation(latestObservation.id, { action, albumHit });
    setObservations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    alert('Applied to latest observation');
  };

  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Ask the Album</h2>
      <div className="grid gap-3 max-w-3xl">
        <textarea className="textarea" placeholder="Describe observation..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Subject (any)</option>
            <option>Math</option>
            <option>Language</option>
            <option>Culture</option>
            <option>Grace & Courtesy</option>
          </select>
          <select className="select" value={plane} onChange={(e) => setPlane(e.target.value)}>
            <option value="">Plane (any)</option>
            <option>0-6</option>
            <option>6-12</option>
            <option>12-18</option>
          </select>
          <button className="btn btn-primary" onClick={search}>Search</button>
        </div>
        <div>
          {results.map((r) => (
            <div key={r.id} className="border rounded-md p-3 mb-3 bg-white">
              <div><strong>{r.title}</strong></div>
              <div className="text-xs text-gray-600">{r.source} · {r.badge}</div>
              <div className="mt-1">{r.excerpt}</div>
              <button className="btn mt-2" onClick={() => applyToLatest(r)}>Apply to latest observation</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [narrative, setNarrative] = useState('');

  const run = async () => {
    if (!name) return;
    const r = await api.report({ n: name, from: from || undefined, to: to || undefined });
    setNarrative(r.narrative);
  };

  const download = () => {
    const blob = new Blob([narrative], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, '_')}_report.txt`;
    a.click();
  };

  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Reports</h2>
      <div className="flex gap-2 mb-3">
        <input className="input" placeholder="Student or Class" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn btn-primary" onClick={run}>Generate</button>
        {narrative && <button className="btn" onClick={download}>Download .txt</button>}
      </div>
      <pre className="whitespace-pre-wrap card p-4">{narrative}</pre>
    </div>
  );
}

function Trainer() {
  const [queue, setQueue] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [selected, setSelected] = useState<string>('');
  useEffect(() => {
    api.trainerQueue().then(setQueue);
  }, []);
  const send = async () => {
    if (!reply) return;
    await api.trainerReply({ queueId: selected || undefined, text: reply });
    setReply('');
    setSelected('');
    setQueue(await api.trainerQueue());
  };
  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Trainer Queue</h2>
      <div>
        {queue.map((q) => (
          <div key={q.id} className="border rounded-md p-3 mb-3 bg-white">
            <div><strong>{q.query}</strong> {q.subject ? `· ${q.subject}` : ''} {q.plane ? `· ${q.plane}` : ''}</div>
            <div className="text-xs text-gray-600">{q.createdAt} · {q.status}</div>
            <label className="mt-1 inline-flex items-center gap-2">
              <input type="radio" name="sel" checked={selected === q.id} onChange={() => setSelected(q.id)} /> Reply to this
            </label>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea className="textarea" placeholder="Reply text" value={reply} onChange={(e) => setReply(e.target.value)} />
        <button className="btn btn-primary" onClick={send}>Send Reply</button>
      </div>
    </div>
  );
}

function Library() {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [chunks, setChunks] = useState<any[]>([]);
  const refresh = async () => {
    setDocs(await api.listDocuments());
    setChunks(await api.listChunks(5));
  };
  useEffect(() => { refresh(); }, []);
  const upload = async () => {
    if (!file) return;
    try {
      await api.ingest(file);
      setFile(null);
      await refresh();
    } catch (e) {
      alert('Upload failed: ' + (e as any).message);
    }
  };
  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Library (Ingestion)</h2>
      <div className="flex gap-2 items-center mb-3">
        <input className="file:mr-3 file:btn file:btn-primary" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" onClick={upload} disabled={!file}>Upload</button>
      </div>
      <h3 className="font-medium">Documents</h3>
      <ul className="list-disc pl-5 mb-3">
        {docs.map((d) => (
          <li key={d.id}>{d.title} · {d.pages} pages · {new Date(d.createdAt).toLocaleString()}</li>
        ))}
      </ul>
      <h3 className="font-medium">Last 5 Chunks</h3>
      <ul className="list-disc pl-5">
        {chunks.map((c, i) => (
          <li key={i}>p.{c.page}: {c.text.slice(0, 120)}{c.text.length > 120 ? '…' : ''}</li>
        ))}
      </ul>
    </div>
  );
}
