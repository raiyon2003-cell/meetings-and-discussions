export const MEETING_TYPES = [
  { value: 'internal_management', label: 'Internal Management Meeting' },
  { value: 'client', label: 'Client Meeting' },
  { value: 'project', label: 'Project Meeting' },
  { value: 'sales', label: 'Sales Meeting' },
  { value: 'finance', label: 'Finance Meeting' },
  { value: 'hr', label: 'HR Meeting' },
  { value: 'delivery', label: 'Delivery Meeting' },
  { value: 'strategic_planning', label: 'Strategic Planning Meeting' },
  { value: 'issue_resolution', label: 'Issue Resolution Meeting' },
] as const;

export const MEETING_STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'finalized', label: 'Finalized' },
] as const;

export const DECISION_STATUS = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'superseded', label: 'Superseded' },
] as const;

export const ACTION_PRIORITY = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

export const ACTION_STATUS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export function labelFrom<T extends readonly { value: string; label: string }[]>(
  list: T,
  value: string | undefined,
) {
  return list.find((x) => x.value === value)?.label ?? value ?? '—';
}
