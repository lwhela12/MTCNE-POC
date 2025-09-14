export type OutcomeStatus = 'worked' | 'partial' | 'didnt';

export interface AlbumHit {
  source: string; // e.g., "Elementary Math Album · p.212"
  excerpt: string; // short extractive passage
  badge: string; // e.g., "Album-sourced | AMI" | "Trainer-reviewed"
}

export interface Observation {
  id: string;
  student: string; // required (pseudonym or class OK)
  subject: string; // Math | Language | Culture | Grace & Courtesy
  plane: string; // '0-6' | '6-12' | '12-18'
  observation: string; // short, objective note
  action?: string; // chosen next step (may start empty)
  albumHit?: AlbumHit; // citation for chosen guidance
  outcome?: OutcomeStatus;
  date: string; // ISO YYYY-MM-DD
}

export interface SearchHit {
  id: string;
  title: string; // human-friendly heading
  excerpt: string; // extractive
  source: string; // citation string
  badge: string; // authenticity badge
}

export interface IngestedDocument {
  id: string;
  title: string; // doc title or filename
  filename: string; // stored filename
  pages: number;
  createdAt: string; // ISO
}

export interface DocChunk {
  id?: string;
  docId: string;
  page: number;
  heading?: string;
  text: string;
  subject?: string; // optional tags
  plane?: string;
  // Optional embedding if enabled
  embedding?: number[];
}

// Internal server-side types
export interface TrainerQueueItem {
  id: string;
  query: string;
  subject?: string;
  plane?: string;
  createdAt: string; // ISO
  status: 'open' | 'resolved';
}

export interface TrainerReply {
  id: string;
  queueId?: string;
  text: string;
  createdAt: string; // ISO
}
