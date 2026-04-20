import { z, ZodError } from "zod";
import {
  getAchievements,
  getAllFeedback,
  getSessionsByUser,
  getStreakState,
  saveGameSession,
  unlockAchievement,
  updateStreak,
  saveFeedback,
  updateFeedbackStatus,
  updateProfile,
  getProfile,
  searchProfiles,
  setActivity,
  getLiveActivity,
} from "./db";
import type { D1Database, Env, EnvWithDB, Feedback, FeedbackStatus, GameMode } from "./types";

type ApiErrorShape = {
  error: true;
  code: string;
  message: string;
};

const modeSchema = z.enum(["standard", "challenge", "bot_fight", "timed"]);
const periodSchema = z.enum(["daily", "weekly", "monthly", "all"]);

const sessionInputSchema = z.object({
  mode: modeSchema,
  score: z.number().int().min(0),
  shotsFired: z.number().int().min(1),
  durationSeconds: z.number().int().min(0),
  playedAt: z.number().int().positive().optional(),
  playedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const sessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const achievementInputSchema = z.object({
  type: z.string().trim().min(1).max(120),
});

const feedbackInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  feedbackType: z.enum(["bug", "feature_request", "general"]),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
});

const feedbackStatusSchema = z.enum(["pending", "sent", "failed", "done", "archived"]);

const feedbackPatchSchema = z.object({
  status: feedbackStatusSchema,
});

// UUID v4 shape used by crypto.randomUUID()
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  privacySettings: z.enum(["public", "private"]).default("private"),
  bestStats: z.record(z.unknown()).optional(),
  friendCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "friendCode must be 6 alphanumeric characters")
    .optional(),
});

const friendsSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(32),
});

const activityInputSchema = z.object({
  discipline: z.string().trim().min(1).max(50),
  difficulty: z.string().trim().min(1).max(50),
});

// Hard cap to prevent memory-DoS via oversized JSON payloads.
const MAX_BODY_BYTES = 1_048_576; // 1 MiB

const leaderboardQuerySchema = z.object({
  mode: modeSchema.default("standard"),
  period: periodSchema.default("weekly"),
});

class ApiHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ALLOWED_ORIGINS: readonly string[] = [
  "https://schuss-challenge.eliaskummel.workers.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

function pickAllowedOrigin(request: Request, env: Env): string {
  const origin = request.headers.get("Origin");
  if (!origin) return "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow any localhost origin while dev auth is enabled so `wrangler dev`
  // works from arbitrary ports without config churn.
  if (env.ALLOW_INSECURE_DEV_AUTH === "true" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return "";
}

function corsHeaders(origin: string, methods = "GET,POST,OPTIONS"): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-headers": "content-type,authorization,x-dev-user-id",
    "access-control-allow-methods": methods,
    "vary": "Origin",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function json(data: unknown, status = 200, allowOrigin = ""): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(allowOrigin),
    },
  });
}

function formatValidationError(err: ZodError): string {
  return err.issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "body"}: ${issue.message}`)
    .join("; ");
}

function validationError(message: string): Response {
  const payload: ApiErrorShape = {
    error: true,
    code: "VALIDATION_ERROR",
    message,
  };
  return json(payload, 400);
}

function authError(message = "Secure user authentication is not configured"): Response {
  const payload: ApiErrorShape = {
    error: true,
    code: "AUTH_REQUIRED",
    message,
  };
  return json(payload, 401);
}

function serviceUnavailableError(message: string): Response {
  const payload: ApiErrorShape = {
    error: true,
    code: "SERVICE_UNAVAILABLE",
    message,
  };
  return json(payload, 503);
}

function hasDatabase(env: Env): env is Env & { DB: D1Database } {
  return !!env.DB;
}

function isLocalDevelopmentRequest(url: URL): boolean {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
}

function getAuthenticatedUserId(request: Request, env: Env, url: URL): string | null {
  const devUserId = request.headers.get("x-dev-user-id")?.trim() ?? "";

  if (
    env.ALLOW_INSECURE_DEV_AUTH === "true"
    && isLocalDevelopmentRequest(url)
    && devUserId.length > 0
  ) {
    return devUserId;
  }

  return null;
}

function getAdminUserIds(env: Env): Set<string> {
  const raw = env.ADMIN_USER_IDS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw.split(",").map((id) => id.trim()).filter((id) => id.length > 0),
  );
}

function isAdminUser(userId: string, env: Env): boolean {
  return getAdminUserIds(env).has(userId);
}

function withCors(response: Response, origin: string): Response {
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  const existingVary = headers.get("vary");
  headers.set("vary", existingVary && !/\borigin\b/i.test(existingVary) ? `${existingVary}, Origin` : "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}


function toIsoDateUTC(epochMillis: number): string {
  return new Date(epochMillis).toISOString().slice(0, 10);
}

function getPeriodStartMillis(period: z.infer<typeof periodSchema>): number | null {
  const now = Date.now();
  switch (period) {
    case "daily":
      return now - 1 * 86_400_000;
    case "weekly":
      return now - 7 * 86_400_000;
    case "monthly":
      return now - 30 * 86_400_000;
    case "all":
      return null;
  }
}

async function parseJson<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  const lenHeader = request.headers.get("content-length");
  if (lenHeader !== null) {
    const len = Number(lenHeader);
    if (!Number.isFinite(len) || len < 0) {
      throw new ApiHttpError(400, "INVALID_CONTENT_LENGTH", "Invalid Content-Length header");
    }
    if (len > MAX_BODY_BYTES) {
      throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 1 MiB limit");
    }
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", formatValidationError(parsed.error));
  }
  return parsed.data;
}

function parseQuery<T>(url: URL, schema: z.ZodSchema<T>): T {
  const queryObject = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(queryObject);
  if (!parsed.success) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", formatValidationError(parsed.error));
  }
  return parsed.data;
}

async function handlePostSession(request: Request, env: EnvWithDB, userId: string): Promise<Response> {
  const payload = await parseJson(request, sessionInputSchema);
  const playedAt = payload.playedAt ?? Date.now();
  const playedDate = payload.playedDate ?? toIsoDateUTC(playedAt);

  await saveGameSession(env, userId, {
    mode: payload.mode,
    score: payload.score,
    shotsFired: payload.shotsFired,
    durationSeconds: payload.durationSeconds,
    playedAt,
  });

  const streak = await updateStreak(env, userId, playedDate);

  return json(
    {
      ok: true,
      session: {
        userId,
        mode: payload.mode,
        score: payload.score,
        shotsFired: payload.shotsFired,
        durationSeconds: payload.durationSeconds,
        playedAt,
      },
      streak,
    },
    201,
  );
}

async function handleGetSessions(url: URL, env: EnvWithDB, userId: string): Promise<Response> {
  const query = parseQuery(url, sessionsQuerySchema);
  const sessions = await getSessionsByUser(env, userId, query.limit);
  return json({ sessions });
}

async function handleGetStats(env: EnvWithDB, userId: string): Promise<Response> {
  const agg = await env.DB.prepare(
    "SELECT COUNT(*) AS total_games, COALESCE(MAX(score), 0) AS best_score FROM game_sessions WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ total_games: number | string; best_score: number | string }>();

  const streak = await getStreakState(env, userId);

  return json({
    totalGames: Number(agg?.total_games ?? 0),
    bestScore: Number(agg?.best_score ?? 0),
    currentStreak: streak.current,
    longestStreak: streak.longest,
  });
}

async function handlePostAchievement(request: Request, env: EnvWithDB, userId: string): Promise<Response> {
  const payload = await parseJson(request, achievementInputSchema);
  await unlockAchievement(env, userId, payload.type);
  return json({ ok: true, type: payload.type }, 201);
}

async function handleGetAchievements(env: EnvWithDB, userId: string): Promise<Response> {
  const achievements = await getAchievements(env, userId);
  return json({ achievements });
}

async function handleGetLeaderboard(url: URL, env: EnvWithDB): Promise<Response> {
  const { mode, period } = parseQuery(url, leaderboardQuerySchema);
  // period is optional in the inferred type because Zod defaults widen; narrow explicitly.
  const resolvedPeriod = period ?? "weekly";
  const resolvedMode = mode ?? "standard";
  const start = getPeriodStartMillis(resolvedPeriod);
  const whereClauses = ["gs.mode = ?"];
  const bindings: unknown[] = [resolvedMode];

  if (start !== null) {
    whereClauses.push("gs.played_at >= ?");
    bindings.push(start);
  }

  const sql = [
    "SELECT",
    "  gs.user_id AS user_id,",
    "  COALESCE(u.display_name, gs.user_id) AS display_name,",
    "  MAX(gs.score) AS best_score,",
    "  COUNT(*) AS games_played",
    "FROM game_sessions gs",
    "LEFT JOIN users u ON u.id = gs.user_id",
    `WHERE ${whereClauses.join(" AND ")}`,
    "GROUP BY gs.user_id, u.display_name",
    "ORDER BY best_score DESC, games_played DESC",
    "LIMIT 20",
  ].join(" ");

  const result = await env.DB.prepare(sql)
    .bind(...bindings)
    .all<{
      user_id: string;
      display_name: string;
      best_score: number | string;
      games_played: number | string;
    }>();

  const leaderboard = result.results.map((row, idx) => ({
    rank: idx + 1,
    userId: row.user_id,
    displayName: row.display_name,
    bestScore: Number(row.best_score),
    gamesPlayed: Number(row.games_played),
  }));

  return json({
    mode: resolvedMode,
    period: resolvedPeriod,
    leaderboard,
  });
}

async function handlePostFeedback(request: Request, env: EnvWithDB): Promise<Response> {
  const payload = await parseJson(request, feedbackInputSchema);

  // Save feedback to database
  const feedbackId = await saveFeedback(
    env,
    payload.email,
    payload.feedbackType,
    payload.title,
    payload.message,
  );

  // Feedback saved successfully
  await updateFeedbackStatus(env, feedbackId, "pending");
  return json({
    ok: true,
    feedbackId,
    message: "Feedback erfolgreich eingereicht. Vielen Dank!",
  }, 201);
}

async function handleGetFeedbacks(env: EnvWithDB): Promise<Response> {
  const feedbacks: Feedback[] = await getAllFeedback(env);
  return json({
    ok: true,
    feedbacks,
  });
}

async function handlePatchFeedback(request: Request, env: EnvWithDB, feedbackId: string): Promise<Response> {
  if (!UUID_REGEX.test(feedbackId)) {
    throw new ApiHttpError(400, "INVALID_ID", "Feedback id must be a UUID");
  }

  const payload = await parseJson(request, feedbackPatchSchema);
  const status: FeedbackStatus = payload.status;

  const existing = await env.DB.prepare(
    "SELECT id FROM feedback WHERE id = ? LIMIT 1",
  ).bind(feedbackId).first<{ id: string }>();

  if (!existing?.id) {
    throw new ApiHttpError(404, "NOT_FOUND", "Feedback not found");
  }

  await updateFeedbackStatus(env, feedbackId, status);

  return json({
    ok: true,
    feedbackId,
    status,
    message: "Feedback status updated",
  });
}

async function handleGetProfile(url: URL, env: EnvWithDB): Promise<Response> {
  const publicId = url.pathname.split("/").pop() || "";
  const profile = await getProfile(env, publicId);
  return profile ? json(profile) : json({ error: "Profile not found" }, 404);
}

async function handlePostProfile(request: Request, env: EnvWithDB, userId: string): Promise<Response> {
  const payload = await parseJson(request, profileInputSchema);
  const bestStats = payload.bestStats ? JSON.stringify(payload.bestStats) : null;
  const friendCode = payload.friendCode ?? null;
  await updateProfile(env, userId, payload.displayName, payload.privacySettings, bestStats, friendCode);
  return json({ ok: true });
}

async function handleFriendsSearch(url: URL, env: EnvWithDB): Promise<Response> {
  let query: { q: string };
  try {
    query = parseQuery(url, friendsSearchQuerySchema);
  } catch (err) {
    if (err instanceof ApiHttpError && err.code === "VALIDATION_ERROR") {
      // Treat too-short / missing input as an empty result rather than 400,
      // because the client sends every keystroke.
      return json({ results: [] });
    }
    throw err;
  }
  const rows = await searchProfiles(env, query.q, 20);
  return json({
    results: rows.map((row) => ({
      user_id: row.user_id,
      public_id: row.public_id,
      display_name: row.display_name,
      friend_code: row.friend_code,
    })),
  });
}

async function handleSetActivity(request: Request, env: EnvWithDB, userId: string): Promise<Response> {
  const payload = await parseJson(request, activityInputSchema);
  await setActivity(env, userId, payload.discipline, payload.difficulty, 'active');
  return json({ ok: true });
}

async function handleGetLiveActivity(env: EnvWithDB): Promise<Response> {
  const activity = await getLiveActivity(env);
  return json({ activity });
}


export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const origin = pickAllowedOrigin(request, env);


  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin, "GET,POST,PATCH,OPTIONS"),
        "access-control-max-age": "86400",
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (!hasDatabase(env)) {
      return withCors(serviceUnavailableError('D1 binding "DB" is not configured for this worker'), origin);
    }

    if (path === "/api/leaderboard" && request.method === "GET") {
      return withCors(await handleGetLeaderboard(url, env), origin);
    }

    // Feedback submission does not require authentication
    if (path === "/api/feedback" && request.method === "POST") {
      return withCors(await handlePostFeedback(request, env), origin);
    }

    // Public live activity feed (no auth required)
    if (path === "/api/activity/live" && request.method === "GET") {
      return withCors(await handleGetLiveActivity(env), origin);
    }

    // Public profile lookup (no auth required)
    if (path.startsWith("/api/profile/") && request.method === "GET") {
      return withCors(await handleGetProfile(url, env), origin);
    }

    // Public friends search (no auth required so the "Freunde"-page works
    // for logged-out debug sessions; server returns only public fields).
    if (path === "/api/friends/search" && request.method === "GET") {
      return withCors(await handleFriendsSearch(url, env), origin);
    }

    const userId = getAuthenticatedUserId(request, env, url);
    if (!userId) {
      return withCors(
        authError(
          env.ALLOW_INSECURE_DEV_AUTH === "true"
            ? "Missing x-dev-user-id for local development"
            : "User-scoped API routes are disabled until secure authentication is configured",
        ),
        origin,
      );
    }

    // Admin endpoints require both authentication AND allow-list membership.
    if (path.startsWith("/api/admin/")) {
      if (!isAdminUser(userId, env)) {
        return withCors(
          json({ error: true, code: "FORBIDDEN", message: "Admin privileges required" }, 403),
          origin,
        );
      }

      if (path === "/api/admin/feedbacks" && request.method === "GET") {
        return withCors(await handleGetFeedbacks(env), origin);
      }

      if (path.startsWith("/api/admin/feedbacks/") && request.method === "PATCH") {
        const feedbackId = path.split("/").pop() ?? "";
        return withCors(await handlePatchFeedback(request, env, feedbackId), origin);
      }

      return withCors(
        json({ error: true, code: "NOT_FOUND", message: "Admin route not found" }, 404),
        origin,
      );
    }

    // Authenticated profile + activity routes
    if (path === "/api/profile" && request.method === "POST") {
      return withCors(await handlePostProfile(request, env, userId), origin);
    }
    if (path === "/api/activity/start" && request.method === "POST") {
      return withCors(await handleSetActivity(request, env, userId), origin);
    }

    if (path === "/api/sessions" && request.method === "POST") {
      return withCors(await handlePostSession(request, env, userId), origin);
    }
    if (path === "/api/sessions" && request.method === "GET") {
      return withCors(await handleGetSessions(url, env, userId), origin);
    }
    if (path === "/api/stats" && request.method === "GET") {
      return withCors(await handleGetStats(env, userId), origin);
    }
    if (path === "/api/achievements" && request.method === "POST") {
      return withCors(await handlePostAchievement(request, env, userId), origin);
    }
    if (path === "/api/achievements" && request.method === "GET") {
      return withCors(await handleGetAchievements(env, userId), origin);
    }

    return withCors(json({ error: true, code: "NOT_FOUND", message: "Route not found" }, 404), origin);
  } catch (err) {
    if (err instanceof ApiHttpError) {
      if (err.code === "VALIDATION_ERROR") {
        return withCors(validationError(err.message), origin);
      }
      return withCors(json({ error: true, code: err.code, message: err.message }, err.status), origin);
    }
    return withCors(
      json(
        {
          error: true,
          code: "INTERNAL_ERROR",
          message: "An unexpected server error occurred",
        },
        500,
      ),
      origin,
    );
  }
}

export type { GameMode };
