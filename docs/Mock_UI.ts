import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, Circle, FileText, Loader2, Mic, Search, Sparkles, Star, Upload, Wand2 } from "lucide-react";

// Types
interface AlbumHit {
  source: string;
  excerpt: string;
  badge: string;
}
interface Observation {
  id: string;
  student: string;
  subject: string;
  observation: string;
  albumHit: AlbumHit;
  action: string;
  outcome: "worked" | "partial" | "didnt";
  date: string;
}

const PALETTE = {
  bg: "bg-[#FAF7F2]", // warm ivory
  green: "text-emerald-700",
  clay: "text-rose-700",
  gold: "text-amber-700",
};

// ---- Types (for dev friendliness) ----
type OutcomeStatus = "worked" | "partial" | "didnt";
interface AlbumHit { source: string; excerpt: string; badge: string; }
interface Observation {
  id: string;
  student: string;
  subject: string;
  observation: string;
  albumHit: AlbumHit;
  action: string;
  outcome: OutcomeStatus;
  date: string; // ISO YYYY-MM-DD
}
interface SearchHit { id: string; title: string; excerpt: string; source: string; badge: string; }

// ---- Mock Data ----
const MOCK_STUDENTS = ["Sparrow (10y)", "Wren (9y)", "Robin (8y)", "Class A (9–11)"];

const MOCK_TIMELINE: Observation[] = [
  {
    id: "obs-1",
    student: "Sparrow (10y)",
    subject: "Math",
    observation:
      "Small bead frame work stalled; child hesitated transitioning from concrete to abstract subtraction.",
    albumHit: {
      source: "Elementary Math Album",
      excerpt:
        "Transition to abstract: Offer a brief recall of concrete material, then invite child to record algorithm independently.",
      badge: "Album-sourced | AMI",
    },
    action: "Re-presented key lesson focusing on recording.",
    outcome: "worked",
    date: "2025-09-10",
  },
];

const MOCK_SEARCH_RESULTS: SearchHit[] = [
  {
    id: "hit-1",
    title: "Transition from Concrete to Abstract (Lower El Math)",
    excerpt:
      "Invite recall of bead frame procedures; transition to notation by isolating the new difficulty. Control of error exists in place value alignment.",
    source: "Elementary Math Album · p.212",
    badge: "Album-sourced | AMI",
  },
  {
    id: "hit-2",
    title: "Observation & Normalization",
    excerpt:
      "Environment management is secondary to correct match between child, key lessons, and freedom within limits. Observe before intervening.",
    source: "Theory Album · Normalization · p.47",
    badge: "Album-sourced | AMI",
  },
  {
    id: "hit-3",
    title: "Grace & Courtesy: Working Quietly",
    excerpt:
      "Present language of requesting quiet; model voice levels; establish community norms with the children present as co-authors.",
    source: "Theory Album · Community · p.120",
    badge: "Trainer-reviewed",
  },
];

const OUTCOME_COLOR: Record<string, string> = {
  worked: "text-emerald-700",
  partial: "text-amber-700",
  didnt: "text-rose-700",
};

// ---- Utility UI ----
function TopBar({ current, onNav }: { current: string; onNav: (k: string) => void }) {
  return (
    <div className={cn("sticky top-0 z-30 border-b", PALETTE.bg)}>
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-600/10 grid place-items-center"><Sparkles className="h-4 w-4 text-amber-700" /></div>
          <div className="font-serif text-xl">Montessori Mentor</div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {[{ k: "home", label: "Home" }, { k: "ask", label: "Ask the Album" }, { k: "reports", label: "Reports" }, { k: "trainer", label: "Trainer Queue" }].map(
            (tab) => (
              <Button key={tab.k} variant={current === tab.k ? "default" : "ghost"} onClick={() => onNav(tab.k)}>
                {tab.label}
              </Button>
            )
          )}
        </div>
        <Avatar className="h-8 w-8"><AvatarFallback>LW</AvatarFallback></Avatar>
      </div>
    </div>
  );
}

function SectionHeading({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div>
        <h2 className="font-serif text-2xl">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ---- Screens ----
function HomeScreen({ onOpenLog, timeline, onGoAsk, onGoReport }: { onOpenLog: () => void; timeline: Observation[]; onGoAsk: () => void; onGoReport: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading title="Welcome back" description="Keep observing, stay in your albums." icon={<Wand2 className="h-6 w-6 text-emerald-700" />} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={onOpenLog}><Mic className="mr-2 h-4 w-4" /> Log Observation</Button>
            <Button variant="secondary" onClick={onGoAsk}><Search className="mr-2 h-4 w-4" /> Ask the Album</Button>
            <Button variant="outline" onClick={onGoReport}><FileText className="mr-2 h-4 w-4" /> Generate Report</Button>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">Observation Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="flex flex-col gap-4">
                {timeline.map((t) => (<ObservationCard key={t.id} data={t} />))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ObservationCard({ data }: { data: Observation }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{data.student}</Badge>
            <Badge>{data.subject}</Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" /> {data.date}
          </div>
        </div>
        <CardTitle className="mt-2 text-base font-normal italic">{data.observation}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-white p-3 border">
          <div className="text-xs text-muted-foreground mb-1">{data.albumHit.source}</div>
          <p>“{data.albumHit.excerpt}”</p>
          <Badge variant="outline">{data.albumHit.badge}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm"><span className="font-medium">Action:</span> {data.action}</div>
          <div className="flex items-center gap-2">
            {data.outcome === "worked" && <CheckCircle2 className={cn("h-5 w-5", OUTCOME_COLOR[data.outcome])} />}
            {data.outcome !== "worked" && <Circle className={cn("h-5 w-5", OUTCOME_COLOR[data.outcome])} />}
            <span className={cn("text-sm font-medium", OUTCOME_COLOR[data.outcome])}>{data.outcome}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified Ask Album for POC
function AskAlbumScreen({ onApply, currentStudent }: { onApply: (hit: any) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(MOCK_SEARCH_RESULTS);

  const doSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setResults(MOCK_SEARCH_RESULTS.filter((r) => r.title.toLowerCase().includes(query.toLowerCase())));
      setLoading(false);
    }, 400);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading title="Ask the Album" description="Surface aligned passages." icon={<Search className="h-6 w-6 text-rose-700" />} />
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          {currentStudent && (
            <div className="mb-2 text-sm text-muted-foreground">
              Working with: <span className="font-medium">{currentStudent}</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea placeholder="Describe observation..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={doSearch} disabled={loading}>{loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}</Button>
          <Separator />
          {results.map((r) => (
            <Card key={r.id}>
              <CardHeader><CardTitle>{r.title}</CardTitle><CardDescription>{r.source}</CardDescription></CardHeader>
              <CardContent>
                <p>{r.excerpt}</p>
                <Button size="sm" onClick={() => onApply(r)}>Apply this</Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Log Observation ----
function LogObservationDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: (obs: Observation) => void }) {
  const [text, setText] = useState("");
  const [plane, setPlane] = useState("6-12");
  const [subject, setSubject] = useState("Math");
  const [student, setStudent] = useState(MOCK_STUDENTS[0]);

  const save = () => {
    if (!text.trim()) return;
    onSaved({
      id: `obs-${Math.random().toString(36).slice(2, 7)}`,
      student,
      subject,
      observation: text,
      albumHit: { source: "Theory Album", excerpt: "Observe first; match work to the child’s need.", badge: "Album-sourced | AMI" },
      action: "Pending",
      outcome: "partial",
      date: new Date().toISOString().slice(0, 10),
    });
    onOpenChange(false);
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Observation</DialogTitle>
          <DialogDescription>Capture a quick note.</DialogDescription>
        </DialogHeader>
        <Label>Observation</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} />
        <Label>Student</Label>
        <Select value={student} onValueChange={setStudent}>
          <SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger>
          <SelectContent>{MOCK_STUDENTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
        </Select>
        <Label>Subject</Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Math">Math</SelectItem>
            <SelectItem value="Language">Language</SelectItem>
            <SelectItem value="Culture">Culture</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}><Mic className="h-4 w-4 mr-2" /> Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Root App ----
export default function App() {
  const [tab, setTab] = useState("home");
  const [timeline, setTimeline] = useState<Observation[]>(MOCK_TIMELINE);
  const [openLog, setOpenLog] = useState(false);
  const [lastStudent, setLastStudent] = useState<string | null>(MOCK_STUDENTS[0]);

  const handleApply = (hit: any) => {
    setTimeline((prev) => [
      {
        id: `obs-${Math.random().toString(36).slice(2, 7)}`,
        student: lastStudent || "Class A (9–11)",
        subject: "Math",
        observation: "Follow-up with aligned album guidance.",
        albumHit: { source: hit.source, excerpt: hit.excerpt, badge: hit.badge },
        action: `Applied: ${hit.title}`,
        outcome: "worked",
        date: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  };

  return (
    <div className={cn("min-h-screen", PALETTE.bg)}>
      <TopBar current={tab} onNav={setTab} />
      {tab === "home" && <HomeScreen onOpenLog={() => setOpenLog(true)} timeline={timeline} onGoAsk={() => setTab("ask")} onGoReport={() => setTab("reports")} />}
      {tab === "ask" && <AskAlbumScreen onApply={handleApply} />}
      {tab === "reports" && <div className="p-8">Reports placeholder</div>}
      {tab === "trainer" && <div className="p-8">Trainer queue placeholder</div>}

      <LogObservationDialog open={openLog} onOpenChange={setOpenLog} onSaved={(obs) => { setTimeline((prev) => [obs, ...prev]); setLastStudent(obs.student); }} />
    </div>
  );
}
