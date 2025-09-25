// // lib/schema.ts

// export type Level = 'junior' | 'mid' | 'senior' | 'architect';

// /* ---------- Question types ---------- */
// export type MCQSingle = {
//   id: string;
//   kind?: 'mcq-single';   // allow both kind or type
//   type?: 'mcq-single';
//   prompt: string;
//   options: string[];
//   correct: number;       // index
//   tags?: string[];
//   difficulty?: number;
// };

// export type MCQMulti = {
//   id: string;
//   kind?: 'mcq-multi';
//   type?: 'mcq-multi';
//   prompt: string;
//   options: string[];
//   correct: number[];     // indices
//   tags?: string[];
//   difficulty?: number;
// };

// export type FreeResponse = {
//   id: string;
//   kind?: 'free-response';
//   type?: 'free-response';
//   prompt: string;
//   rubric?: string[];     // rubric bullet points
//   maxPoints?: number;
//   tags?: string[];
//   difficulty?: number;
// };

// export type Question = MCQSingle | MCQMulti | FreeResponse;

// export type Policy = {
//   passingScore: number;                    // 0..100
//   weights: { mcq: number; fr: number };    // e.g. {mcq:0.6, fr:0.4}
//   timeLimitSec: number;                    // seconds
// };

// export type GeneratedTest = {
//   level?: Level;
//   questions: Question[];
//   policy: Partial<Policy>;
// };

// export type AttemptPayload = {
//   attemptId: string;
//   questions: Question[];
//   policy: Partial<Policy>;
//   level?: Level;
// };

// /* ---------- Answer types (NEW) ---------- */
// export type AnswerSingle = {
//   id: string;
//   type: 'mcq-single';
//   choice: number | null;
// };

// export type AnswerMulti = {
//   id: string;
//   type: 'mcq-multi';
//   choices: number[];     // selected indices
// };

// export type AnswerFR = {
//   id: string;
//   type: 'free-response' | 'fr'; // accept both spellings
//   text: string;
// };

// export type Answer = AnswerSingle | AnswerMulti | AnswerFR;

// /** Map form sent by the client:
//  *  - mcq-single: number | null
//  *  - mcq-multi : number[]
//  *  - free-response: string
//  */
// export type AnswerMap = Record<string, number | null | number[] | string>;
// // export type Answer = AnswerSingle | AnswerMulti | AnswerFR;

// /* ---------- Grading result ---------- */
// export type GradeResult = {
//   score: number;                 // 0..100 weighted
//   passed: boolean;
//   breakdown?: {
//     mcq?: number;                // weighted contribution (0..100)
//     fr?: number;                 // weighted contribution (0..100)
//     mcqScore?: number;           // raw MCQ percent
//     frScore?: number;            // raw FR percent
//     mcqDetail?: Array<{ id: string; correct: boolean }>;
//     frDetail?: Array<{ id: string; aiScore: number; notes: string }>;
//   };
//   rubricFlags?: string[];
//   comments?: string;
// };


// lib/schema.ts

export type Level = 'junior' | 'mid' | 'senior' | 'architect';

/* ---------- Question types ---------- */
export type MCQSingle = {
  id: string;
  kind: 'mcq-single';
  prompt: string;
  options: string[];
  correct: number;       // index
  tags?: string[];
  difficulty?: number;
};

export type MCQMulti = {
  id: string;
  kind: 'mcq-multi';
  prompt: string;
  options: string[];
  correct: number[];     // indices
  tags?: string[];
  difficulty?: number;
};

export type FreeResponse = {
  id: string;
  kind: 'free-response';
  prompt: string;
  rubric?: string[];     // rubric bullet points
  maxPoints?: number;
  tags?: string[];
  difficulty?: number;
};

export type Question = MCQSingle | MCQMulti | FreeResponse;

export type Policy = {
  passingScore: number;                     // 0..100
  weights: { mcq: number; fr: number };     // sum ≈ 1
  timeLimitSec: number;                     // seconds
};

export type GeneratedTest = {
  level?: Level;
  questions: Question[];
  policy: Partial<Policy>;
};

export type AttemptPayload = {
  attemptId: string;
  questions: Question[];
  policy: Partial<Policy>;
  level?: Level;
};

/* ---------- Client answer map (used by Exam page) ---------- */
export type AnswerMap = Record<
  string,
  number | null | number[] | string
>;

/* ---------- Canonical answers used by grader ---------- */
export type AnswerSingle = {
  id: string;
  type: 'mcq-single';
  choice: number | null;
};

export type AnswerMulti = {
  id: string;
  type: 'mcq-multi';
  choices: number[];
};

export type AnswerFR = {
  id: string;
  type: 'free-response';
  text: string;
};

export type Answer = AnswerSingle | AnswerMulti | AnswerFR;

/* ---------- Grading result ---------- */
export type GradeResult = {
  score: number;                 // 0..100 weighted
  passed: boolean;
  breakdown?: {
    mcq?: number;
    fr?: number;
    mcqScore?: number;           // raw
    frScore?: number;            // raw
    mcqDetail?: Array<{ id: string; correct: boolean }>;
    frDetail?: Array<{ id: string; aiScore: number; notes: string }>;
  };
  rubricFlags?: string[];
  comments?: string;
};
