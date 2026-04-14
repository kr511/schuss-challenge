export type GameMode = "standard" | "challenge" | "bot_fight" | "timed";

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: number;
}

export interface GameSession {
  id: string;
  userId: string;
  mode: GameMode;
  score: number;
  shotsFired: number;
  durationSeconds: number;
  playedAt: number;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  unlockedAt: number;
}

export interface StreakState {
  current: number;
  longest: number;
  lastPlayedDate: string | null;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Feedback {
  id: string;
  userEmail: string;
  feedbackType: 'bug' | 'feature_request' | 'general';
  title: string;
  message: string;
  sentAt: number;
  status: 'pending' | 'sent' | 'failed';
}

export interface Env {
  DB?: D1Database;
  ALLOW_INSECURE_DEV_AUTH?: string;
  SENDGRID_API_KEY?: string;
  ADMIN_EMAIL?: string;
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}
