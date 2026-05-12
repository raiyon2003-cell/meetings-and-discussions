-- Optional performance indexes for SegWitz Meeting & Decision Repository
-- Run in Supabase SQL Editor after initial_schema (safe to re-run: IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_meetings_dept_scheduled
  ON public.meetings (department_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_owner_scheduled
  ON public.meetings (owner_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_decisions_dept_created
  ON public.decisions (department_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decisions_status_created
  ON public.decisions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_actions_due_status
  ON public.action_items (due_date, status);

CREATE INDEX IF NOT EXISTS idx_actions_assigned_due
  ON public.action_items (assigned_to, due_date);
