/**
 * Role-based access helpers for SegWitz Meeting & Decision Repository.
 * backend uses verified profile + role slug from DB.
 */

export const RoleSlug = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  DEPARTMENT_HEAD: 'department_head',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
  VIEW_ONLY: 'view_only',
};

export function roleSlug(profile) {
  return profile?.role?.slug ?? profile?.roles?.slug;
}

export function isAdmin(profile) {
  return roleSlug(profile) === RoleSlug.ADMIN;
}

export function isManagement(profile) {
  return roleSlug(profile) === RoleSlug.MANAGEMENT;
}

export function isViewOnly(profile) {
  return roleSlug(profile) === RoleSlug.VIEW_ONLY;
}

export function canReadAll(profile) {
  const r = roleSlug(profile);
  return [RoleSlug.ADMIN, RoleSlug.MANAGEMENT, RoleSlug.VIEW_ONLY].includes(r);
}

/** Department-scoped roles share a department_id */
export function sameDepartment(profile, departmentId) {
  return profile?.department_id && departmentId && profile.department_id === departmentId;
}

export function canManageUsers(profile) {
  return isAdmin(profile);
}

export function canManageOrgStructure(profile) {
  return isAdmin(profile);
}

export function canCreateMeeting(profile, bodyDepartmentId) {
  if (isAdmin(profile)) return true;
  if (isViewOnly(profile) || isManagement(profile)) return false;
  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    return false;
  }
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    return sameDepartment(profile, bodyDepartmentId);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return true;
  }
  return false;
}

export function canModifyMeeting(profile, meeting) {
  if (!meeting) return false;
  if (isAdmin(profile)) return true;
  if (isViewOnly(profile) || isManagement(profile)) return false;
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    return sameDepartment(profile, meeting.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return meeting.meeting_type === 'project' || meeting.owner_id === profile.id;
  }
  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    return meeting.owner_id === profile.id && sameDepartment(profile, meeting.department_id);
  }
  return false;
}

export function canFinalizeMeeting(profile, meeting) {
  return canModifyMeeting(profile, meeting);
}

export function canCreateDecision(profile, body) {
  if (isAdmin(profile)) return true;
  if (isViewOnly(profile) || isManagement(profile)) return false;
  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) return false;
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    return sameDepartment(profile, body.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return true;
  }
  return false;
}

export function canManageDecision(profile, decision) {
  if (!decision) return false;
  if (isAdmin(profile)) return true;
  if (isViewOnly(profile) || isManagement(profile)) return false;
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    return sameDepartment(profile, decision.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return true;
  }
  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    return decision.owner_id === profile.id || sameDepartment(profile, decision.department_id);
  }
  return false;
}

export function canManageAction(profile, action, meetingsCache, decisionsCache) {
  if (!action) return false;
  if (isAdmin(profile)) return true;
  if (isViewOnly(profile)) return false;
  if (isManagement(profile)) return false;

  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    return action.assigned_to === profile.id;
  }

  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    if (action.meeting_id && meetingsCache?.get(action.meeting_id)) {
      const m = meetingsCache.get(action.meeting_id);
      return sameDepartment(profile, m.department_id);
    }
    if (action.decision_id && decisionsCache?.get(action.decision_id)) {
      const d = decisionsCache.get(action.decision_id);
      return sameDepartment(profile, d.department_id);
    }
    return sameDepartment(profile, profile.department_id);
  }

  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return true;
  }

  return false;
}

export function canReadMeeting(profile, meeting) {
  if (!meeting) return false;
  if (canReadAll(profile)) return true;
  if (canModifyMeeting(profile, meeting)) return true;
  if (sameDepartment(profile, meeting.department_id)) return true;
  return meeting.owner_id === profile.id;
}

export function canReadDecision(profile, decision) {
  if (!decision) return false;
  if (canReadAll(profile)) return true;
  if (canManageDecision(profile, decision)) return true;
  return sameDepartment(profile, decision.department_id);
}

export function canReadAction(profile, action, meeting, decision) {
  if (!action) return false;
  if (canReadAll(profile)) return true;
  if (action.assigned_to === profile.id) return true;
  if (meeting && sameDepartment(profile, meeting.department_id)) return true;
  if (decision && sameDepartment(profile, decision.department_id)) return true;
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) return true;
  if (roleSlug(profile) === RoleSlug.ADMIN) return true;
  return false;
}
