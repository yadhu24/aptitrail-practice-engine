// SPDX-License-Identifier: AGPL-3.0-only
export interface Choice { id: string; text?: string; }
export interface QuestionBase {
  id: string; area: string; family: string; pool: string; testletId?: string;
  prompt?: string; hint?: string; steps?: string[]; pitfall?: string;
  [key: string]: unknown;
}
export interface ChoiceQuestion extends QuestionBase {
  schema: "choice"; choices: Choice[]; answer: string;
}
export interface FramesQuestion extends QuestionBase {
  schema: "frames"; choices: [Choice[], Choice[]]; answer: [string, string];
}
export interface ValuesQuestion extends QuestionBase {
  schema: "values"; targets: string[]; answer: Record<string, number>;
}
export type Question = ChoiceQuestion | FramesQuestion | ValuesQuestion;
export type Answer = string | string[] | Record<string, number | string> | null;
export interface Attempt {
  ids: string[]; answers?: Record<string, Answer>;
  helped?: string[]; confidence?: Record<string, string | null>;
}
export interface ScoreRow {
  id: string; area: string; family: string;
  status: "correct" | "wrong" | "unanswered"; helped: boolean; confidence: string | null;
}
export interface ScoreResult {
  total: number; correct: number; wrong: number; unanswered: number;
  percentage: number; unaided: number; rows: ScoreRow[];
}
export interface HistoryEntry { finished: number; result?: { rows: ScoreRow[] }; }
export interface SelectOptions {
  area?: string; mode?: "practice" | "free" | "revision" | "due";
  history?: HistoryEntry[]; rng?: () => number; now?: number;
}
export function validateBank<T extends Question>(bank: T[]): T[];
export function validAnswer(q: Question, answer: unknown): boolean;
export function isCorrect(q: Question, answer: unknown): boolean;
export function score(attempt: Attempt, bank: Question[]): ScoreResult;
export function strip<T extends Question>(q: T): Omit<T,
  "answer" | "hint" | "steps" | "pitfall" | "completion" | "model" |
  "rule" | "optionReasons" | "solutionHash">;
export function select(bank: Question[], seen: Record<string, number>, options?: SelectOptions): string[];
export function selectBookmarks(bank: Question[], bookmarked: string[]): string[];
export function revisionSchedule(history: HistoryEntry[], now?: number): Record<string, { stage: number; due: number }>;
