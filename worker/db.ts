import type { Achievement, D1Database, Env, GameSession, StreakState, User } from "./types";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: number;
};

type SessionRow = {
  id: string;
  user_id: string;
  mode: GameSession["mode"];
  score: number;
  shots_fired: number;
  duration_seconds: number;
  played_at: number;
};

type AchievementRow = {
  id: string;
  user_id: string;
  type: string;
  unlocked_at: number;
};

type FeedbackRow = {
  id: string;
  user_email: string;
  feedback_type: string;
  title: string;
  message: string;
  sent_at: number;
  status: string;
};

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_played_date: string | null;
};

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: Number(row.created_at),
  };
}

function mapSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    score: Number(row.score),
    shotsFired: Number(row.shots_fired),
    durationSeconds: Number(row.duration_seconds),
    playedAt: Number(row.played_at),
  };
}

function mapAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    unlockedAt: Number(row.unlocked_at),
  };
}

function mapFeedback(row: FeedbackRow): any {
  return {
    id: row.id,
    userEmail: row.user_email,
    feedbackType: row.feedback_type,
    title: row.title,
    message: row.message,
    sentAt: Number(row.sent_at),
    status: row.status,
  };
}

function toUtcMidnightMillis(isoDate: string): number {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

async function ensureUserExists(db: D1Database, userId: string): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string }>();

  if (existing?.id) {
    return;
  }

  await db
    .prepare("INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)")
    .bind(userId, null, null, Date.now())
    .run();
}

export async function createUser(env: Env, email: string, displayName: string): Promise<User> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  await env.DB.prepare(
    "INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, email, displayName, createdAt)
    .run();

  return {
    id,
    email,
    displayName,
    createdAt,
  };
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const row = await env.DB.prepare(
    "SELECT id, email, display_name, created_at FROM users WHERE email = ? LIMIT 1",
  )
    .bind(email)
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function saveGameSession(
  env: Env,
  userId: string,
  session: Omit<GameSession, "id" | "userId"> & { id?: string },
): Promise<void> {
  await ensureUserExists(env.DB, userId);

  await env.DB.prepare(
    [
      "INSERT INTO game_sessions",
      "(id, user_id, mode, score, shots_fired, duration_seconds, played_at)",
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(
      session.id ?? crypto.randomUUID(),
      userId,
      session.mode,
      session.score,
      session.shotsFired,
      session.durationSeconds,
      session.playedAt,
    )
    .run();
}

export async function getSessionsByUser(
  env: Env,
  userId: string,
  limit = 20,
): Promise<GameSession[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

  const result = await env.DB.prepare(
    [
      "SELECT id, user_id, mode, score, shots_fired, duration_seconds, played_at",
      "FROM game_sessions",
      "WHERE user_id = ?",
      "ORDER BY played_at DESC",
      "LIMIT ?",
    ].join(" "),
  )
    .bind(userId, safeLimit)
    .all<SessionRow>();

  return result.results.map(mapSession);
}

export async function unlockAchievement(env: Env, userId: string, type: string): Promise<void> {
  await ensureUserExists(env.DB, userId);

  const existing = await env.DB.prepare(
    "SELECT id FROM achievements WHERE user_id = ? AND type = ? LIMIT 1",
  )
    .bind(userId, type)
    .first<{ id: string }>();

  if (existing?.id) {
    return;
  }

  await env.DB.prepare(
    "INSERT INTO achievements (id, user_id, type, unlocked_at) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), userId, type, Date.now())
    .run();
}

export async function getAchievements(env: Env, userId: string): Promise<Achievement[]> {
  const result = await env.DB.prepare(
    [
      "SELECT id, user_id, type, unlocked_at",
      "FROM achievements",
      "WHERE user_id = ?",
      "ORDER BY unlocked_at DESC",
    ].join(" "),
  )
    .bind(userId)
    .all<AchievementRow>();

  return result.results.map(mapAchievement);
}

export async function updateStreak(
  env: Env,
  userId: string,
  playedDate: string,
): Promise<{ current: number; longest: number }> {
  await ensureUserExists(env.DB, userId);

  const currentRow = await env.DB.prepare(
    "SELECT current_streak, longest_streak, last_played_date FROM streaks WHERE user_id = ?",
  )
    .bind(userId)
    .first<StreakRow>();

  if (!currentRow) {
    await env.DB.prepare(
      [
        "INSERT INTO streaks",
        "(user_id, current_streak, longest_streak, last_played_date)",
        "VALUES (?, ?, ?, ?)",
      ].join(" "),
    )
      .bind(userId, 1, 1, playedDate)
      .run();
    return { current: 1, longest: 1 };
  }

  if (currentRow.last_played_date === playedDate) {
    return {
      current: Number(currentRow.current_streak),
      longest: Number(currentRow.longest_streak),
    };
  }

  const prev = currentRow.last_played_date ? toUtcMidnightMillis(currentRow.last_played_date) : null;
  const next = toUtcMidnightMillis(playedDate);
  const dayDiff = prev === null ? Number.POSITIVE_INFINITY : Math.round((next - prev) / 86_400_000);

  if (dayDiff < 0) {
    return {
      current: Number(currentRow.current_streak),
      longest: Number(currentRow.longest_streak),
    };
  }

  const current = dayDiff === 1 ? Number(currentRow.current_streak) + 1 : 1;
  const longest = Math.max(Number(currentRow.longest_streak), current);

  await env.DB.prepare(
    [
      "UPDATE streaks",
      "SET current_streak = ?, longest_streak = ?, last_played_date = ?",
      "WHERE user_id = ?",
    ].join(" "),
  )
    .bind(current, longest, playedDate, userId)
    .run();

  return { current, longest };
}

export async function getStreakState(env: Env, userId: string): Promise<StreakState> {
  const row = await env.DB.prepare(
    "SELECT current_streak, longest_streak, last_played_date FROM streaks WHERE user_id = ?",
  )
    .bind(userId)
    .first<StreakRow>();

  if (!row) {
    return { current: 0, longest: 0, lastPlayedDate: null };
  }

  return {
    current: Number(row.current_streak),
    longest: Number(row.longest_streak),
    lastPlayedDate: row.last_played_date,
  };
}

export async function saveFeedback(
  env: Env,
  userEmail: string,
  feedbackType: 'bug' | 'feature_request' | 'general',
  title: string,
  message: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const sentAt = Date.now();

  await env.DB.prepare(
    [
      "INSERT INTO feedback",
      "(id, user_email, feedback_type, title, message, sent_at, status)",
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(id, userEmail, feedbackType, title, message, sentAt, 'pending')
    .run();

  return id;
}

export async function updateFeedbackStatus(
  env: Env,
  feedbackId: string,
  status: 'pending' | 'sent' | 'failed',
): Promise<void> {
  await env.DB.prepare(
    "UPDATE feedback SET status = ? WHERE id = ?",
  )
    .bind(status, feedbackId)
    .run();
}

export async function getPendingFeedback(env: Env, limit = 50): Promise<any[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM feedback WHERE status = 'pending' ORDER BY sent_at DESC LIMIT ?",
  )
    .bind(limit)
    .all<FeedbackRow>();

  return (result.results || []).map(mapFeedback);
}

export function dbHelpers(env: Env) {
  return {
    createUser: (email: string, displayName: string) => createUser(env, email, displayName),
    getUserByEmail: (email: string) => getUserByEmail(env, email),
    saveGameSession: (
      userId: string,
      session: Omit<GameSession, "id" | "userId"> & { id?: string },
    ) => saveGameSession(env, userId, session),
    getSessionsByUser: (userId: string, limit = 20) => getSessionsByUser(env, userId, limit),
    unlockAchievement: (userId: string, type: string) => unlockAchievement(env, userId, type),
    getAchievements: (userId: string) => getAchievements(env, userId),
    updateStreak: (userId: string, playedDate: string) => updateStreak(env, userId, playedDate),
    saveFeedback: (userEmail: string, feedbackType: any, title: string, message: string) => 
      saveFeedback(env, userEmail, feedbackType, title, message),
    updateFeedbackStatus: (feedbackId: string, status: any) => 
      updateFeedbackStatus(env, feedbackId, status),
    getPendingFeedback: (limit?: number) => getPendingFeedback(env, limit),
  };
}
