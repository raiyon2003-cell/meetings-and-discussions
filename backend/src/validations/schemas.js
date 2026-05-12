import { z } from 'zod';

export const meetingTypeEnum = z.enum([
  'internal_management',
  'client',
  'project',
  'sales',
  'finance',
  'hr',
  'delivery',
  'strategic_planning',
  'issue_resolution',
]);

export const meetingStatusEnum = z.enum(['draft', 'finalized']);

export const decisionStatusEnum = z.enum([
  'proposed',
  'approved',
  'rejected',
  'on_hold',
  'reversed',
  'superseded',
]);

export const actionPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const actionStatusEnum = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'blocked',
  'cancelled',
]);

export const uuidString = z.string().uuid();

export const meetingCreateSchema = z.object({
  title: z.string().min(1),
  meeting_type: meetingTypeEnum,
  scheduled_at: z.string().min(1),
  location: z.string().optional().nullable(),
  online_meeting_link: z.string().url().optional().nullable().or(z.literal('')),
  division_id: uuidString,
  department_id: uuidString,
  related_project_client: z.string().optional().nullable(),
  owner_id: uuidString,
  agenda: z.string().optional().nullable(),
  discussion_summary: z.string().optional().nullable(),
  key_discussion_points: z.string().optional().nullable(),
  important_notes: z.string().optional().nullable(),
  concerns_raised: z.string().optional().nullable(),
  risks_identified: z.string().optional().nullable(),
  status: meetingStatusEnum.optional(),
});

export const meetingUpdateSchema = meetingCreateSchema.partial();

export const attendeeSchema = z.object({
  user_id: uuidString,
  status: z.enum(['present', 'absent']).optional(),
  notes: z.string().optional().nullable(),
});

export const decisionCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  meeting_id: uuidString.optional().nullable(),
  division_id: uuidString,
  department_id: uuidString,
  related_project_client: z.string().optional().nullable(),
  owner_id: uuidString,
  approved_by: uuidString.optional().nullable(),
  date_decided: z.string().optional(),
  impact_area: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: decisionStatusEnum.optional(),
});

export const decisionUpdateSchema = decisionCreateSchema.partial();

export const decisionStatusSchema = z.object({
  status: decisionStatusEnum,
  notes: z.string().optional().nullable(),
});

export const actionCreateSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    assigned_to: uuidString,
    due_date: z.string(),
    priority: actionPriorityEnum.optional(),
    status: actionStatusEnum.optional(),
    meeting_id: uuidString.optional().nullable(),
    decision_id: uuidString.optional().nullable(),
    completion_notes: z.string().optional().nullable(),
  })
  .refine((d) => Boolean(d.meeting_id || d.decision_id), {
    message: 'Either meeting_id or decision_id is required',
    path: ['meeting_id'],
  });

/** PATCH payloads — cannot use .partial() on refined schemas in Zod 4 */
export const actionUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  assigned_to: uuidString.optional(),
  due_date: z.string().optional(),
  priority: actionPriorityEnum.optional(),
  status: actionStatusEnum.optional(),
  meeting_id: uuidString.optional().nullable(),
  decision_id: uuidString.optional().nullable(),
  completion_notes: z.string().optional().nullable(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  department_id: uuidString.optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal('')),
});

export const userAdminUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  department_id: uuidString.optional().nullable(),
  role_id: uuidString.optional(),
});
