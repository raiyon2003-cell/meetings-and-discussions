import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import {
  canReadAll,
  roleSlug,
  RoleSlug,
} from '../lib/access.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

function applyMeetingScope(q, profile) {
  if (canReadAll(profile) || roleSlug(profile) === RoleSlug.ADMIN) return q;
  if (
    (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD || roleSlug(profile) === RoleSlug.TEAM_MEMBER) &&
    profile.department_id
  ) {
    return q.eq('department_id', profile.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return q.or(`owner_id.eq.${profile.id},meeting_type.eq.project`);
  }
  return q.eq('owner_id', profile.id);
}

function applyDecisionScope(q, profile) {
  if (canReadAll(profile) || roleSlug(profile) === RoleSlug.ADMIN) return q;
  if (
    (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD || roleSlug(profile) === RoleSlug.TEAM_MEMBER) &&
    profile.department_id
  ) {
    return q.eq('department_id', profile.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) return q;
  return q.eq('owner_id', profile.id);
}

router.get('/summary', async (req, res, next) => {
  try {
    const profile = req.profile;
    const today = new Date().toISOString().slice(0, 10);

    let meetingsBase = supabaseAdmin.from('meetings').select('*', { count: 'exact', head: true });
    meetingsBase = applyMeetingScope(meetingsBase, profile);
    const { count: meetingsTotal } = await meetingsBase;

    let meetingsFinalizedQ = supabaseAdmin
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'finalized');
    meetingsFinalizedQ = applyMeetingScope(meetingsFinalizedQ, profile);
    const { count: meetingsFinalized } = await meetingsFinalizedQ;

    let decisionsBase = supabaseAdmin.from('decisions').select('*', { count: 'exact', head: true });
    decisionsBase = applyDecisionScope(decisionsBase, profile);
    const { count: decisionsTotal } = await decisionsBase;

    let approvedQ = supabaseAdmin.from('decisions').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    approvedQ = applyDecisionScope(approvedQ, profile);
    const { count: decisionsApproved } = await approvedQ;

    let proposedQ = supabaseAdmin.from('decisions').select('*', { count: 'exact', head: true }).eq('status', 'proposed');
    proposedQ = applyDecisionScope(proposedQ, profile);
    const { count: decisionsProposed } = await proposedQ;

    let pendingQ = supabaseAdmin
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['proposed', 'on_hold']);
    pendingQ = applyDecisionScope(pendingQ, profile);
    const { count: decisionsPending } = await pendingQ;

    let overdueQ = supabaseAdmin
      .from('action_items')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', today)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
      overdueQ = overdueQ.eq('assigned_to', profile.id);
    } else if (
      roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD &&
      profile.department_id
    ) {
      const { data: mids } = await supabaseAdmin.from('meetings').select('id').eq('department_id', profile.department_id);
      const { data: dids } = await supabaseAdmin.from('decisions').select('id').eq('department_id', profile.department_id);
      const mIds = (mids || []).map((r) => r.id);
      const dIds = (dids || []).map((r) => r.id);
      const parts = [];
      if (mIds.length) parts.push(`meeting_id.in.(${mIds.join(',')})`);
      if (dIds.length) parts.push(`decision_id.in.(${dIds.join(',')})`);
      if (parts.length) overdueQ = overdueQ.or(parts.join(','));
      else overdueQ = overdueQ.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { count: actionsOverdue } = await overdueQ;

    let recentMeetingsQ = supabaseAdmin.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(8);
    recentMeetingsQ = applyMeetingScope(recentMeetingsQ, profile);
    const { data: recentMeetings, error: e1 } = await recentMeetingsQ;

    let recentDecisionsQ = supabaseAdmin.from('decisions').select('*').order('created_at', { ascending: false }).limit(8);
    recentDecisionsQ = applyDecisionScope(recentDecisionsQ, profile);
    const { data: recentDecisions, error: e2 } = await recentDecisionsQ;

    if (e1 || e2) throw httpError(400, 'Failed to load dashboard lists');

    const { data: chartActions } = await supabaseAdmin.from('action_items').select('assigned_to').limit(800);
    const assigneeIds = [...new Set((chartActions || []).map((r) => r.assigned_to).filter(Boolean))];
    let assigneeProfiles = [];
    if (assigneeIds.length) {
      const r = await supabaseAdmin.from('profiles').select('id, department_id').in('id', assigneeIds);
      assigneeProfiles = r.data || [];
    }
    const deptByUser = Object.fromEntries((assigneeProfiles || []).map((p) => [p.id, p.department_id]));

    const actionsByOwner = {};
    const actionsByDept = {};
    for (const row of chartActions || []) {
      actionsByOwner[row.assigned_to] = (actionsByOwner[row.assigned_to] || 0) + 1;
      const deptId = deptByUser[row.assigned_to];
      if (deptId) actionsByDept[deptId] = (actionsByDept[deptId] || 0) + 1;
    }

    res.json({
      totals: {
        meetings: meetingsTotal ?? 0,
        meetings_finalized: meetingsFinalized ?? 0,
        decisions: decisionsTotal ?? 0,
        decisions_approved: decisionsApproved ?? 0,
        decisions_pending: decisionsPending ?? 0,
        decisions_proposed: decisionsProposed ?? 0,
        actions_overdue: actionsOverdue ?? 0,
      },
      recent_meetings: recentMeetings || [],
      recent_decisions: recentDecisions || [],
      actions_by_owner: actionsByOwner,
      actions_by_department: actionsByDept,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
