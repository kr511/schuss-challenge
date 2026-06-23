-- Adds updated_at column to feedback so PATCH /api/admin/feedbacks/:id can
-- record when an admin changed the status (pending / sent / failed / done / archived).
ALTER TABLE feedback ADD COLUMN updated_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_feedback_updated_at ON feedback(updated_at);
