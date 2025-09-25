// 

// lib/store.ts
import type { GeneratedTest, GradeResult } from './schema';
import fs from 'fs';
import path from 'path';

type Attempt = {
  id: string;
  test: GeneratedTest;
  answers?: any[];
  proctorEvents: Array<{ type: string; ts: number }>;
  graded?: GradeResult;
};

const attempts = new Map<string, Attempt>();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'attempts.json');

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function persist() {
  try {
    ensureDataDir();
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(Array.from(attempts.values()), null, 2),
      'utf8'
    );
  } catch (e) {
    console.error('[store] persist error', e);
  }
}

(function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const arr = JSON.parse(raw) as Attempt[];
    for (const a of arr) attempts.set(a.id, a);
  } catch (e) {
    console.error('[store] load error', e);
  }
})();

export function saveAttempt(a: Attempt) {
  attempts.set(a.id, a);
  persist();
}
export function getAttempt(id: string) {
  return attempts.get(id) || null;
}
export function addProctorEvent(id: string, ev: { type: string; ts: number }) {
  const a = attempts.get(id);
  if (!a) return;
  a.proctorEvents.push(ev);
  persist();
}
export function saveAnswers(id: string, answers: any[]) {
  const a = attempts.get(id);
  if (!a) return;
  a.answers = answers;
  persist();
}
export function saveGrade(id: string, g: GradeResult) {
  const a = attempts.get(id);
  if (!a) return;
  a.graded = g;
  persist();
}
export function newId(prefix = 'attempt-') {
  return prefix + Math.random().toString(36).slice(2, 9);
}
