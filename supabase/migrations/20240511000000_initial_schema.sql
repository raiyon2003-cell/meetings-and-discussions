-- SegWitz Meeting & Decision Repository — initial schema
-- Run in Supabase SQL Editor or via Supabase CLI migrations.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Divisions & departments
-- ---------------------------------------------------------------------------
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (division_id, slug)
);

CREATE INDEX idx_departments_division ON public.departments (division_id);

-- ---------------------------------------------------------------------------
-- Profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department_id UUID REFERENCES public.departments (id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES public.roles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_department ON public.profiles (department_id);
CREATE INDEX idx_profiles_role ON public.profiles (role_id);

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------
CREATE TYPE public.meeting_type AS ENUM (
  'internal_management',
  'client',
  'project',
  'sales',
  'finance',
  'hr',
  'delivery',
  'strategic_planning',
  'issue_resolution'
);

CREATE TYPE public.meeting_status AS ENUM ('draft', 'finalized');

CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  meeting_type public.meeting_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  online_meeting_link TEXT,
  division_id UUID NOT NULL REFERENCES public.divisions (id),
  department_id UUID NOT NULL REFERENCES public.departments (id),
  related_project_client TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles (id),
  agenda TEXT,
  discussion_summary TEXT,
  key_discussion_points TEXT,
  important_notes TEXT,
  concerns_raised TEXT,
  risks_identified TEXT,
  status public.meeting_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  updated_by UUID REFERENCES public.profiles (id),
  finalized_by UUID REFERENCES public.profiles (id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_scheduled ON public.meetings (scheduled_at DESC);
CREATE INDEX idx_meetings_division ON public.meetings (division_id);
CREATE INDEX idx_meetings_department ON public.meetings (department_id);
CREATE INDEX idx_meetings_owner ON public.meetings (owner_id);
CREATE INDEX idx_meetings_status ON public.meetings (status);
CREATE INDEX idx_meetings_title_trgm ON public.meetings USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Meeting attendees
-- ---------------------------------------------------------------------------
CREATE TYPE public.attendee_status AS ENUM ('present', 'absent');

CREATE TABLE public.meeting_attendees (
  meeting_id UUID NOT NULL REFERENCES public.meetings (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.attendee_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX idx_meeting_attendees_user ON public.meeting_attendees (user_id);

-- ---------------------------------------------------------------------------
-- Decisions
-- ---------------------------------------------------------------------------
CREATE TYPE public.decision_status AS ENUM (
  'proposed',
  'approved',
  'rejected',
  'on_hold',
  'reversed',
  'superseded'
);

CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  meeting_id UUID REFERENCES public.meetings (id) ON DELETE SET NULL,
  division_id UUID NOT NULL REFERENCES public.divisions (id),
  department_id UUID NOT NULL REFERENCES public.departments (id),
  related_project_client TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles (id),
  approved_by UUID REFERENCES public.profiles (id),
  date_decided DATE NOT NULL DEFAULT CURRENT_DATE,
  impact_area TEXT,
  remarks TEXT,
  status public.decision_status NOT NULL DEFAULT 'proposed',
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  updated_by UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decisions_meeting ON public.decisions (meeting_id);
CREATE INDEX idx_decisions_status ON public.decisions (status);
CREATE INDEX idx_decisions_department ON public.decisions (department_id);
CREATE INDEX idx_decisions_title_trgm ON public.decisions USING gin (title gin_trgm_ops);

CREATE TABLE public.decision_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions (id) ON DELETE CASCADE,
  from_status public.decision_status,
  to_status public.decision_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles (id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decision_history_decision ON public.decision_status_history (decision_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Action items
-- ---------------------------------------------------------------------------
CREATE TYPE public.action_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE public.action_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'blocked',
  'cancelled'
);

CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.profiles (id),
  due_date DATE NOT NULL,
  priority public.action_priority NOT NULL DEFAULT 'medium',
  status public.action_status NOT NULL DEFAULT 'not_started',
  meeting_id UUID REFERENCES public.meetings (id) ON DELETE SET NULL,
  decision_id UUID REFERENCES public.decisions (id) ON DELETE SET NULL,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  updated_by UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_assigned ON public.action_items (assigned_to);
CREATE INDEX idx_actions_due ON public.action_items (due_date);
CREATE INDEX idx_actions_status ON public.action_items (status);
CREATE INDEX idx_actions_meeting ON public.action_items (meeting_id);
CREATE INDEX idx_actions_decision ON public.action_items (decision_id);

-- ---------------------------------------------------------------------------
-- Attachments (files in Supabase Storage)
-- ---------------------------------------------------------------------------
CREATE TYPE public.attachment_entity AS ENUM ('meeting', 'decision', 'action_item');

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.attachment_entity NOT NULL,
  entity_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_entity ON public.attachments (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Activity / audit log
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entity ON public.activity_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_user ON public.activity_logs (user_id);

-- ---------------------------------------------------------------------------
-- Timestamps trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_divisions_updated BEFORE UPDATE ON public.divisions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_meetings_updated BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_decisions_updated BEFORE UPDATE ON public.decisions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_actions_updated BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user → profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role UUID;
BEGIN
  SELECT id INTO default_role FROM public.roles WHERE slug = 'team_member' LIMIT 1;
  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    default_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Master reference data (must exist before first signup trigger fires)
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (name, slug, description) VALUES
  ('Admin', 'admin', 'Full access'),
  ('Management', 'management', 'Organization-wide visibility'),
  ('Department Head', 'department_head', 'Department scope'),
  ('Project Manager', 'project_manager', 'Project meetings and coordination'),
  ('Team Member', 'team_member', 'Participate and update assigned actions'),
  ('View-only', 'view_only', 'Read-only access')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.divisions (name, slug) VALUES
  ('Business Division', 'business'),
  ('Delivery Division', 'delivery'),
  ('Corporate Services Division', 'corporate_services'),
  ('Leadership / Management', 'leadership_management')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.departments (division_id, name, slug)
SELECT d.id, v.name, v.slug FROM public.divisions d
JOIN (VALUES
  ('business', 'Sales / Business Development', 'sales_bd'),
  ('business', 'Marketing', 'marketing'),
  ('business', 'Account Management', 'account_management'),
  ('delivery', 'Project Management', 'project_management'),
  ('delivery', 'UI/UX / Design', 'uiux_design'),
  ('delivery', 'Frontend Development', 'frontend_dev'),
  ('delivery', 'Backend Development', 'backend_dev'),
  ('delivery', 'Mobile App Development', 'mobile_dev'),
  ('delivery', 'QA / Testing', 'qa_testing'),
  ('delivery', 'DevOps / Deployment', 'devops'),
  ('corporate_services', 'HR', 'hr'),
  ('corporate_services', 'Finance / Accounts', 'finance'),
  ('corporate_services', 'Administration', 'administration'),
  ('corporate_services', 'Internal Operations', 'internal_operations'),
  ('leadership_management', 'Strategic Planning / Governance', 'strategic_planning')
) AS v(division_slug, name, slug) ON d.slug = v.division_slug
ON CONFLICT (division_id, slug) DO NOTHING;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Backend uses service_role (bypasses RLS). Policies protect direct PostgREST access.
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read reference data & own profile
CREATE POLICY "roles_read_authenticated" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "divisions_read_authenticated" ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_read_authenticated" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Storage: signed URLs generated server-side; deny anon.
CREATE POLICY "attachments_storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "attachments_storage_authenticated_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "attachments_storage_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "attachments_storage_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');
