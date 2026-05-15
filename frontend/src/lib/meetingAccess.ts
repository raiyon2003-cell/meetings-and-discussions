import type { Profile } from '@/store/authStore';
import type { Meeting } from '@/types/models';

const RoleSlug = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  DEPARTMENT_HEAD: 'department_head',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
  VIEW_ONLY: 'view_only',
} as const;

function roleSlug(profile: Profile | null | undefined): string | undefined {
  return profile?.role?.slug;
}

function sameDepartment(profile: Profile | null | undefined, departmentId: string | undefined | null) {
  return Boolean(profile?.department_id && departmentId && profile.department_id === departmentId);
}

/** Mirrors backend `canModifyMeeting` — use for showing Edit actions only. */
export function canModifyMeeting(profile: Profile | null | undefined, meeting: Pick<Meeting, 'department_id' | 'owner_id' | 'meeting_type'> | null | undefined): boolean {
  if (!meeting || !profile) return false;
  const slug = roleSlug(profile);
  if (slug === RoleSlug.ADMIN) return true;
  if (slug === RoleSlug.VIEW_ONLY || slug === RoleSlug.MANAGEMENT) return false;
  if (slug === RoleSlug.DEPARTMENT_HEAD) return sameDepartment(profile, meeting.department_id);
  if (slug === RoleSlug.PROJECT_MANAGER) {
    return meeting.meeting_type === 'project' || meeting.owner_id === profile.id;
  }
  if (slug === RoleSlug.TEAM_MEMBER) {
    return meeting.owner_id === profile.id && sameDepartment(profile, meeting.department_id);
  }
  return false;
}

export function canCreateMeeting(profile: Profile | null | undefined): boolean {
  const slug = roleSlug(profile);
  if (!slug) return false;
  if (slug === RoleSlug.VIEW_ONLY || slug === RoleSlug.MANAGEMENT || slug === RoleSlug.TEAM_MEMBER) return false;
  return true;
}
