-- Add columns for adaptive weakness detection and manual prioritization
ALTER TABLE competency_progress
ADD COLUMN priority integer DEFAULT 0,
ADD COLUMN weakness_indicators jsonb DEFAULT '{}'::jsonb,
ADD COLUMN struggles_count integer DEFAULT 0,
ADD COLUMN last_struggle_at timestamp with time zone;

-- Add index for efficient priority-based queries
CREATE INDEX idx_competency_progress_priority ON competency_progress(user_id, priority DESC, struggles_count DESC);

-- Add comment explaining the new columns
COMMENT ON COLUMN competency_progress.priority IS 'Manual priority set by user (higher = more important)';
COMMENT ON COLUMN competency_progress.weakness_indicators IS 'JSON object tracking AI-detected weakness signals (hesitation, errors, explicit statements)';
COMMENT ON COLUMN competency_progress.struggles_count IS 'Counter for how often the student struggled with this competency';
COMMENT ON COLUMN competency_progress.last_struggle_at IS 'Timestamp of last detected struggle';