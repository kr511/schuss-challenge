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
  discipline: string;
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

export type FeedbackType = 'bug' | 'feature_request' | 'general';
export type FeedbackStatus = 'pending' | 'sent' | 'failed' | 'done' | 'archived';

export interface Feedback {
  id: string;
  userEmail: string;
  feedbackType: FeedbackType;
  title: string;
  message: string;
  sentAt: number;
  status: FeedbackStatus;
  updatedAt: number | null;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  SUPABASE_JWT_SECRET?: string;
  ALLOW_INSECURE_DEV_AUTH?: string;
  ALLOWED_ORIGINS_CSV?: string;
  SENDGRID_API_KEY?: string;
  ADMIN_EMAIL?: string;
  /** Comma-separated list of user IDs that are allowed to hit /api/admin/* routes. */
  ADMIN_USER_IDS?: string;
  /** Cloudflare KV namespace for rate limiting. Bind via wrangler.jsonc kv_namespaces. */
  RATE_LIMIT_KV?: KVNamespace;
  /** VAPID keys for Web Push (wrangler secret put). */
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_SUBJECT?: string;
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}
