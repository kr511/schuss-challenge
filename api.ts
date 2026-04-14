import { z, ZodError } from "zod";
import {
  getAchievements,
  getSessionsByUser,
  getStreakState,
  saveGameSession,
  unlockAchievement,
  updateStreak,
  saveFeedback,
  updateFeedbackStatus,
} from "./db";
import type { D1Database, Env, GameMode } from "./types";

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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization,x-dev-user-id",
      "access-control-allow-methods": "GET,POST,OPTIONS",
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

async function handlePostSession(request: Request, env: Env, userId: string): Promise<Response> {
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

async function handleGetSessions(url: URL, env: Env, userId: string): Promise<Response> {
  const query = parseQuery(url, sessionsQuerySchema);
  const sessions = await getSessionsByUser(env, userId, query.limit);
  return json({ sessions });
}

async function handleGetStats(env: Env, userId: string): Promise<Response> {
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

async function handlePostAchievement(request: Request, env: Env, userId: string): Promise<Response> {
  const payload = await parseJson(request, achievementInputSchema);
  await unlockAchievement(env, userId, payload.type);
  return json({ ok: true, type: payload.type }, 201);
}

async function handleGetAchievements(env: Env, userId: string): Promise<Response> {
  const achievements = await getAchievements(env, userId);
  return json({ achievements });
}

async function handleGetLeaderboard(url: URL, env: Env): Promise<Response> {
  const { mode, period } = parseQuery(url, leaderboardQuerySchema);
  const start = getPeriodStartMillis(period);
  const whereClauses = ["gs.mode = ?"];
  const bindings: unknown[] = [mode];

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
    mode,
    period,
    leaderboard,
  });
}

async function handlePostFeedback(request: Request, env: Env): Promise<Response> {
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

async function handleGetFeedbacks(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT * FROM feedback ORDER BY sent_at DESC"
  ).all<Feedback>();

  return json({
    ok: true,
    feedbacks: result.results || [],
  });
}

async function handlePatchFeedback(request: Request, env: Env, feedbackId: string): Promise<Response> {
  const payload = await request.json();
  
  if (payload.status && ['pending', 'done', 'archived'].includes(payload.status)) {
    await env.DB.prepare(
      "UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?"
    ).bind(payload.status, Date.now(), feedbackId).run();

    return json({
      ok: true,
      message: "Feedback status updated",
    });
  }

  return json({ error: true, message: "Invalid status" }, 400);
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type,authorization,x-dev-user-id",
        "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
        "access-control-max-age": "86400",
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (!hasDatabase(env)) {
      return serviceUnavailableError('D1 binding "DB" is not configured for this worker');
    }

    if (path === "/api/leaderboard" && request.method === "GET") {
      return await handleGetLeaderboard(url, env);
    }

    // Feedback endpoint doesn't need authentication
    if (path === "/api/feedback" && request.method === "POST") {
      return await handlePostFeedback(request, env);
    }

    // Admin endpoint to get all feedbacks
    if (path === "/api/admin/feedbacks" && request.method === "GET") {
      return await handleGetFeedbacks(env);
    }

    // Admin endpoint to update feedback status
    if (path.startsWith("/api/admin/feedbacks/") && request.method === "PATCH") {
      const feedbackId = path.split("/").pop();
      return await handlePatchFeedback(request, env, feedbackId);
    }

    const userId = getAuthenticatedUserId(request, env, url);
    if (!userId) {
      return authError(
        env.ALLOW_INSECURE_DEV_AUTH === "true"
          ? "Missing x-dev-user-id for local development"
          : "User-scoped API routes are disabled until secure authentication is configured",
      );
    }

    if (path === "/api/sessions" && request.method === "POST") {
      return await handlePostSession(request, env, userId);
    }
    if (path === "/api/sessions" && request.method === "GET") {
      return await handleGetSessions(url, env, userId);
    }
    if (path === "/api/stats" && request.method === "GET") {
      return await handleGetStats(env, userId);
    }
    if (path === "/api/achievements" && request.method === "POST") {
      return await handlePostAchievement(request, env, userId);
    }
    if (path === "/api/achievements" && request.method === "GET") {
      return await handleGetAchievements(env, userId);
    }

    return json({ error: true, code: "NOT_FOUND", message: "Route not found" }, 404);
  } catch (err) {
    if (err instanceof ApiHttpError) {
      if (err.code === "VALIDATION_ERROR") {
        return validationError(err.message);
      }
      return json({ error: true, code: err.code, message: err.message }, err.status);
    }
    return json(
      {
        error: true,
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred",
      },
      500,
    );
  }
}

export type { GameMode };
