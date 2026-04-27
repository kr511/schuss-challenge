import type {
  Achievement,
  Env,
  Feedback,
  FeedbackStatus,
  FeedbackType,
  GameMode,
  GameSession,
  StreakState,
  User,
} from "./types";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: number | string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  mode: GameSession["mode"];
  score: number | string;
  shots_fired: number | string;
  duration_seconds: number | string;
  played_at: number | string;
};

type AchievementRow = {
  id: string;
  user_id: string;
  type: string;
  unlocked_at: number | string;
};

type FeedbackRow = {
  id: string;
  user_email: string;
  feedback_type: string;
  title: string;
  message: string;
  sent_at: number | string;
  status: string;
  updated_at: number | string | null;
};

type StreakRow = {
  current_streak: number | string;
  longest_streak: number | string;
  last_played_date: string | null;
};

type ApiProfileRow = {
  user_id: string;
  public_id: string;
  display_name: string | null;
  privacy_settings: "public" | "private";
  best_stats: string | null;
  updated_at: string | null;
};

type ActivityRow = {
  user_id: string;
  discipline: string | null;
  difficulty: string | null;
  timestamp: number | string;
  status: "active" | "idle" | string | null;
};

type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  prefer?: string;
  allowMissingRelation?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  bestScore: number;
  gamesPlayed: number;
};

export type SessionStats = {
  totalGames: number;
  bestScore: number;
};

class SupabaseError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireSupabase(env: Env): { url: string; serviceKey: string } {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceKey = env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !serviceKey) {
    throw new SupabaseError(503, "Supabase configuration is incomplete for this worker", "CONFIG_MISSING");
  }
  return { url, serviceKey };
}

function numberFrom(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  return Number(value);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: numberFrom(row.created_at),
  };
}

function mapSession(row: SessionRow): GameSession {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    score: numberFrom(row.score),
    shotsFired: numberFrom(row.shots_fired),
    durationSeconds: numberFrom(row.duration_seconds),
    playedAt: numberFrom(row.played_at),
  };
}

function mapAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    unlockedAt: numberFrom(row.unlocked_at),
  };
}

function mapFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    userEmail: row.user_email,
    feedbackType: row.feedback_type as FeedbackType,
    title: row.title,
    message: row.message,
    sentAt: numberFrom(row.sent_at),
    status: row.status as FeedbackStatus,
    updatedAt: row.updated_at == null ? null : numberFrom(row.updated_at),
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

function postgrestString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function postgrestIn(values: string[]): string {
  return `in.(${values.map(postgrestString).join(",")})`;
}

async function supabaseRequest<T>(
  env: Env,
  table: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { url, serviceKey } = requireSupabase(env);
  const endpoint = new URL(`${url}/rest/v1/${table}`);

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) endpoint.searchParams.set(key, String(value));
  });

  const headers = new Headers({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.prefer) headers.set("Prefer", options.prefer);

  const response = await fetch(endpoint.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const code = typeof data?.code === "string" ? data.code : undefined;
    if (options.allowMissingRelation && code === "42P01") {
      return [] as T;
    }
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new SupabaseError(response.status, message, code);
  }

  return data as T;
}

async function selectRows<T>(
  env: Env,
  table: string,
  query: Record<string, string | number | boolean | undefined>,
  options: Pick<SupabaseRequestOptions, "allowMissingRelation"> = {},
): Promise<T[]> {
  return supabaseRequest<T[]>(env, table, { query, allowMissingRelation: options.allowMissingRelation });
}

async function insertRow(
  env: Env,
  table: string,
  body: unknown,
  prefer = "return=minimal",
): Promise<void> {
  await supabaseRequest(env, table, {
    method: "POST",
    body,
    prefer,
  });
}

async function upsertRow(
  env: Env,
  table: string,
  body: unknown,
  onConflict: string,
  prefer = "resolution=merge-duplicates,return=minimal",
): Promise<void> {
  await supabaseRequest(env, table, {
    method: "POST",
    query: { on_conflict: onConflict },
    body,
    prefer,
  });
}

async function patchRows(
  env: Env,
  table: string,
  query: Record<string, string | number | boolean | undefined>,
  body: unknown,
): Promise<void> {
  await supabaseRequest(env, table, {
    method: "PATCH",
    query,
    body,
    prefer: "return=minimal",
  });
}

async function ensureUserExists(env: Env, userId: string): Promise<void> {
  await upsertRow(
    env,
    "users",
    {
      id: userId,
      email: null,
      display_name: null,
      created_at: Date.now(),
    },
    "id",
    "resolution=ignore-duplicates,return=minimal",
  );
}

export async function createUser(env: Env, email: string, displayName: string): Promise<User> {
  const user: UserRow = {
    id: crypto.randomUUID(),
    email,
    display_name: displayName,
    created_at: Date.now(),
  };

  await insertRow(env, "users", user);
  return mapUser(user);
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const rows = await selectRows<UserRow>(env, "users", {
    select: "id,email,display_name,created_at",
    email: `eq.${email}`,
    limit: 1,
  });

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function saveGameSession(
  env: Env,
  userId: string,
  session: Omit<GameSession, "id" | "userId"> & { id?: string },
): Promise<void> {
  await ensureUserExists(env, userId);

  await insertRow(env, "game_sessions", {
    id: session.id ?? crypto.randomUUID(),
    user_id: userId,
    mode: session.mode,
    score: session.score,
    shots_fired: session.shotsFired,
    duration_seconds: session.durationSeconds,
    played_at: session.playedAt,
  });
}

export async function getSessionsByUser(
  env: Env,
  userId: string,
  limit = 20,
): Promise<GameSession[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await selectRows<SessionRow>(env, "game_sessions", {
    select: "id,user_id,mode,score,shots_fired,duration_seconds,played_at",
    user_id: `eq.${userId}`,
    order: "played_at.desc",
    limit: safeLimit,
  });

  return rows.map(mapSession);
}

export async function getUserSessionStats(env: Env, userId: string): Promise<SessionStats> {
  const rows = await selectRows<Pick<SessionRow, "score">>(env, "game_sessions", {
    select: "score",
    user_id: `eq.${userId}`,
  }, { allowMissingRelation: true });

  return {
    totalGames: rows.length,
    bestScore: rows.reduce((best, row) => Math.max(best, numberFrom(row.score)), 0),
  };
}

export async function unlockAchievement(env: Env, userId: string, type: string): Promise<void> {
  await ensureUserExists(env, userId);

  await upsertRow(
    env,
    "achievements",
    {
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      unlocked_at: Date.now(),
    },
    "user_id,type",
    "resolution=ignore-duplicates,return=minimal",
  );
}

export async function getAchievements(env: Env, userId: string): Promise<Achievement[]> {
  const rows = await selectRows<AchievementRow>(env, "achievements", {
    select: "id,user_id,type,unlocked_at",
    user_id: `eq.${userId}`,
    order: "unlocked_at.desc",
  });

  return rows.map(mapAchievement);
}

export async function updateStreak(
  env: Env,
  userId: string,
  playedDate: string,
): Promise<{ current: number; longest: number }> {
  await ensureUserExists(env, userId);

  const rows = await selectRows<StreakRow>(env, "streaks", {
    select: "current_streak,longest_streak,last_played_date",
    user_id: `eq.${userId}`,
    limit: 1,
  });
  const currentRow = rows[0];

  if (!currentRow) {
    await insertRow(env, "streaks", {
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_played_date: playedDate,
    });
    return { current: 1, longest: 1 };
  }

  const existingCurrent = numberFrom(currentRow.current_streak);
  const existingLongest = numberFrom(currentRow.longest_streak);

  if (currentRow.last_played_date === playedDate) {
    return {
      current: existingCurrent,
      longest: existingLongest,
    };
  }

  const prev = currentRow.last_played_date ? toUtcMidnightMillis(currentRow.last_played_date) : null;
  const next = toUtcMidnightMillis(playedDate);
  const dayDiff = prev === null ? Number.POSITIVE_INFINITY : Math.round((next - prev) / 86_400_000);

  if (dayDiff < 0) {
    return {
      current: existingCurrent,
      longest: existingLongest,
    };
  }

  const current = dayDiff === 1 ? existingCurrent + 1 : 1;
  const longest = Math.max(existingLongest, current);

  await patchRows(env, "streaks", { user_id: `eq.${userId}` }, {
    current_streak: current,
    longest_streak: longest,
    last_played_date: playedDate,
  });

  return { current, longest };
}

export async function getStreakState(env: Env, userId: string): Promise<StreakState> {
  const rows = await selectRows<StreakRow>(env, "streaks", {
    select: "current_streak,longest_streak,last_played_date",
    user_id: `eq.${userId}`,
    limit: 1,
  }, { allowMissingRelation: true });
  const row = rows[0];

  if (!row) {
    return { current: 0, longest: 0, lastPlayedDate: null };
  }

  return {
    current: numberFrom(row.current_streak),
    longest: numberFrom(row.longest_streak),
    lastPlayedDate: row.last_played_date,
  };
}

export async function saveFeedback(
  env: Env,
  userEmail: string,
  feedbackType: FeedbackType,
  title: string,
  message: string,
): Promise<string> {
  const id = crypto.randomUUID();

  await insertRow(env, "feedback", {
    id,
    user_email: userEmail,
    feedback_type: feedbackType,
    title,
    message,
    sent_at: Date.now(),
    status: "pending",
  });

  return id;
}

export async function getFeedbackById(env: Env, feedbackId: string): Promise<Feedback | null> {
  const rows = await selectRows<FeedbackRow>(env, "feedback", {
    select: "id,user_email,feedback_type,title,message,sent_at,status,updated_at",
    id: `eq.${feedbackId}`,
    limit: 1,
  });

  return rows[0] ? mapFeedback(rows[0]) : null;
}

export async function updateFeedbackStatus(
  env: Env,
  feedbackId: string,
  status: FeedbackStatus,
): Promise<void> {
  await patchRows(env, "feedback", { id: `eq.${feedbackId}` }, {
    status,
    updated_at: Date.now(),
  });
}

export async function getAllFeedback(env: Env): Promise<Feedback[]> {
  const rows = await selectRows<FeedbackRow>(env, "feedback", {
    select: "id,user_email,feedback_type,title,message,sent_at,status,updated_at",
    order: "sent_at.desc",
  });

  return rows.map(mapFeedback);
}

export async function getPendingFeedback(env: Env, limit = 50): Promise<Feedback[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = await selectRows<FeedbackRow>(env, "feedback", {
    select: "id,user_email,feedback_type,title,message,sent_at,status,updated_at",
    status: "eq.pending",
    order: "sent_at.desc",
    limit: safeLimit,
  });

  return rows.map(mapFeedback);
}

export async function getLeaderboard(
  env: Env,
  mode: GameMode,
  startMillis: number | null,
): Promise<LeaderboardEntry[]> {
  const query: Record<string, string | number> = {
    select: "user_id,score",
    mode: `eq.${mode}`,
    order: "score.desc",
    limit: 5000,
  };
  if (startMillis !== null) query.played_at = `gte.${startMillis}`;

  const sessions = await selectRows<Pick<SessionRow, "user_id" | "score">>(
    env,
    "game_sessions",
    query,
    { allowMissingRelation: true },
  );

  const byUser = new Map<string, { userId: string; bestScore: number; gamesPlayed: number }>();
  sessions.forEach((session) => {
    const score = numberFrom(session.score);
    const current = byUser.get(session.user_id);
    if (!current) {
      byUser.set(session.user_id, {
        userId: session.user_id,
        bestScore: score,
        gamesPlayed: 1,
      });
      return;
    }
    current.bestScore = Math.max(current.bestScore, score);
    current.gamesPlayed += 1;
  });

  const userIds = Array.from(byUser.keys());
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await selectRows<Pick<UserRow, "id" | "display_name">>(
      env,
      "users",
      {
        select: "id,display_name",
        id: postgrestIn(userIds),
      },
      { allowMissingRelation: true },
    );
    users.forEach((user) => {
      if (user.display_name) names.set(user.id, user.display_name);
    });
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.bestScore - a.bestScore || b.gamesPlayed - a.gamesPlayed)
    .slice(0, 20)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      displayName: names.get(entry.userId) ?? entry.userId,
      bestScore: entry.bestScore,
      gamesPlayed: entry.gamesPlayed,
    }));
}

export async function updateProfile(
  env: Env,
  userId: string,
  displayName: string,
  privacySettings: "public" | "private" = "private",
  bestStats: string | null,
): Promise<void> {
  await ensureUserExists(env, userId);

  const existing = await selectRows<Pick<ApiProfileRow, "public_id">>(
    env,
    "api_profiles",
    {
      select: "public_id",
      user_id: `eq.${userId}`,
      limit: 1,
    },
    { allowMissingRelation: true },
  );

  await upsertRow(env, "api_profiles", {
    user_id: userId,
    public_id: existing[0]?.public_id ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    display_name: displayName,
    privacy_settings: privacySettings,
    best_stats: bestStats,
    updated_at: new Date().toISOString(),
  }, "user_id");
}

export async function getProfile(env: Env, publicId: string): Promise<ApiProfileRow | null> {
  const rows = await selectRows<ApiProfileRow>(
    env,
    "api_profiles",
    {
      select: "*",
      public_id: `eq.${publicId}`,
      privacy_settings: "eq.public",
      limit: 1,
    },
    { allowMissingRelation: true },
  );

  return rows[0] ?? null;
}

export async function setActivity(
  env: Env,
  userId: string,
  discipline: string,
  difficulty: string,
  status: "active" | "idle",
): Promise<void> {
  await ensureUserExists(env, userId);

  await upsertRow(env, "activity_log", {
    user_id: userId,
    discipline,
    difficulty,
    timestamp: Date.now(),
    status,
  }, "user_id");
}

export async function getLiveActivity(env: Env): Promise<ActivityRow[]> {
  return selectRows<ActivityRow>(
    env,
    "activity_log",
    {
      select: "*",
      status: "eq.active",
      timestamp: `gt.${Date.now() - 60_000}`,
    },
    { allowMissingRelation: true },
  );
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
    saveFeedback: (userEmail: string, feedbackType: FeedbackType, title: string, message: string) =>
      saveFeedback(env, userEmail, feedbackType, title, message),
    updateFeedbackStatus: (feedbackId: string, status: FeedbackStatus) =>
      updateFeedbackStatus(env, feedbackId, status),
    getPendingFeedback: (limit?: number) => getPendingFeedback(env, limit),
  };
}
