export type Meeting = {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string;
  location?: string | null;
  online_meeting_link?: string | null;
  division_id: string;
  department_id: string;
  related_project_client?: string | null;
  owner_id: string;
  agenda?: string | null;
  discussion_summary?: string | null;
  key_discussion_points?: string | null;
  important_notes?: string | null;
  concerns_raised?: string | null;
  risks_identified?: string | null;
  status: 'draft' | 'finalized';
  created_by: string;
  updated_by?: string | null;
  finalized_by?: string | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Decision = {
  id: string;
  title: string;
  description: string;
  meeting_id?: string | null;
  division_id: string;
  department_id: string;
  related_project_client?: string | null;
  owner_id: string;
  approved_by?: string | null;
  date_decided: string;
  impact_area?: string | null;
  remarks?: string | null;
  status: string;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionItem = {
  id: string;
  title: string;
  description?: string | null;
  assigned_to: string;
  due_date: string;
  priority: string;
  status: string;
  meeting_id?: string | null;
  decision_id?: string | null;
  completion_notes?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};
