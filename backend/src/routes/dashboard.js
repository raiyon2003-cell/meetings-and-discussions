import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { canReadAll, roleSlug, RoleSlug } from '../lib/access.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

const MEETING_LIST_COL = 'id,title,meeting_type,scheduled_at,status,department_id,division_id,owner_id';
const DECISION_LIST_COL = 'id,title,status,date_decided,department_id,division_id,owner_id';

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
    const slug = roleSlug(profile);

    let qMeetTotal = supabaseAdmin.from('meetings').select('id', { count: 'exact', head: true });
    qMeetTotal = applyMeetingScope(qMeetTotal, profile);

    let qMeetFin = supabaseAdmin
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'finalized');
    qMeetFin = applyMeetingScope(qMeetFin, profile);

    let qDecTotal = supabaseAdmin.from('decisions').select('id', { count: 'exact', head: true });
    qDecTotal = applyDecisionScope(qDecTotal, profile);

    let qDecAppr = supabaseAdmin.from('decisions').select('id', { count: 'exact', head: true }).eq('status', 'approved');
    qDecAppr = applyDecisionScope(qDecAppr, profile);

    let qDecProp = supabaseAdmin.from('decisions').select('id', { count: 'exact', head: true }).eq('status', 'proposed');
    qDecProp = applyDecisionScope(qDecProp, profile);

    let qDecPend = supabaseAdmin
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['proposed', 'on_hold']);
    qDecPend = applyDecisionScope(qDecPend, profile);

    let recentMeetingsQ = supabaseAdmin
      .from('meetings')
      .select(MEETING_LIST_COL)
      .order('scheduled_at', { ascending: false })
      .limit(8);
    recentMeetingsQ = applyMeetingScope(recentMeetingsQ, profile);

    let recentDecisionsQ = supabaseAdmin
      .from('decisions')
      .select(DECISION_LIST_COL)
      .order('created_at', { ascending: false })
      .limit(8);
    recentDecisionsQ = applyDecisionScope(recentDecisionsQ, profile);

    const chartActionsQ = supabaseAdmin.from('action_items').select('assigned_to').limit(400);

    const [
      rMeetTotal,
      rMeetFin,
      rDecTotal,
      rDecAppr,
      rDecProp,
      rDecPend,
      rRecentMeet,
      rRecentDec,
      rChart,
    ] = await Promise.all([
      qMeetTotal,
      qMeetFin,
      qDecTotal,
      qDecAppr,
      qDecProp,
      qDecPend,
      recentMeetingsQ,
      recentDecisionsQ,
      chartActionsQ,
    ]);

    if (rRecentMeet.error || rRecentDec.error) throw httpError(400, 'Failed to load dashboard lists');

    const meetingsTotal = rMeetTotal.count ?? 0;
    const meetingsFinalized = rMeetFin.count ?? 0;
    const decisionsTotal = rDecTotal.count ?? 0;
    const decisionsApproved = rDecAppr.count ?? 0;
    const decisionsProposed = rDecProp.count ?? 0;
    const decisionsPending = rDecPend.count ?? 0;
    const recentMeetings = rRecentMeet.data || [];
    const recentDecisions = rRecentDec.data || [];
    const chartActions = rChart.data || [];

    let actionsOverdue = 0;
    if (slug === RoleSlug.TEAM_MEMBER) {
      const { count } = await supabaseAdmin
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled');
      actionsOverdue = count ?? 0;
    } else if (slug === RoleSlug.DEPARTMENT_HEAD && profile.department_id) {
      const [{ data: mids }, { data: dids }] = await Promise.all([
        supabaseAdmin.from('meetings').select('id').eq('department_id', profile.department_id),
        supabaseAdmin.from('decisions').select('id').eq('department_id', profile.department_id),
      ]);
      const mIds = (mids || []).map((r) => r.id);
      const dIds = (dids || []).map((r) => r.id);
      let overdueQ = supabaseAdmin
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled');
      const parts = [];
      if (mIds.length) parts.push(`meeting_id.in.(${mIds.join(',')})`);
      if (dIds.length) parts.push(`decision_id.in.(${dIds.join(',')})`);
      if (parts.length) overdueQ = overdueQ.or(parts.join(','));
      else overdueQ = overdueQ.eq('id', '00000000-0000-0000-0000-000000000000');
      const { count } = await overdueQ;
      actionsOverdue = count ?? 0;
    } else {
      const { count } = await supabaseAdmin
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled');
      actionsOverdue = count ?? 0;
    }

    const assigneeIds = [...new Set(chartActions.map((r) => r.assigned_to).filter(Boolean))];
    let assigneeProfiles = [];
    if (assigneeIds.length) {
      const r = await supabaseAdmin.from('profiles').select('id, department_id').in('id', assigneeIds);
      assigneeProfiles = r.data || [];
    }
    const deptByUser = Object.fromEntries(assigneeProfiles.map((p) => [p.id, p.department_id]));

    const actionsByOwner = {};
    const actionsByDept = {};
    for (const row of chartActions) {
      actionsByOwner[row.assigned_to] = (actionsByOwner[row.assigned_to] || 0) + 1;
      const deptId = deptByUser[row.assigned_to];
      if (deptId) actionsByDept[deptId] = (actionsByDept[deptId] || 0) + 1;
    }

    res.json({
      totals: {
        meetings: meetingsTotal,
        meetings_finalized: meetingsFinalized,
        decisions: decisionsTotal,
        decisions_approved: decisionsApproved,
        decisions_pending: decisionsPending,
        decisions_proposed: decisionsProposed,
        actions_overdue: actionsOverdue,
      },
      recent_meetings: recentMeetings,
      recent_decisions: recentDecisions,
      actions_by_owner: actionsByOwner,
      actions_by_department: actionsByDept,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
