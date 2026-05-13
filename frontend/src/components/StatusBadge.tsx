import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import { labelFrom, DECISION_STATUS, ACTION_STATUS, MEETING_STATUS, ACTION_PRIORITY } from '@/constants/enums';

type Kind = 'meeting' | 'decision' | 'action' | 'priority';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

function meetingVariant(status: string): BadgeVariant {
  if (status === 'finalized') return 'success';
  if (status === 'draft') return 'secondary';
  return 'outline';
}

function decisionVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved':
      return 'success';
    case 'proposed':
      return 'warning';
    case 'rejected':
      return 'destructive';
    case 'on_hold':
      return 'secondary';
    case 'reversed':
    case 'superseded':
      return 'neutral';
    default:
      return 'outline';
  }
}

function actionVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'blocked':
      return 'destructive';
    case 'cancelled':
      return 'neutral';
    case 'not_started':
    default:
      return 'secondary';
  }
}

function priorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'default';
    case 'low':
    default:
      return 'secondary';
  }
}

const lists = {
  meeting: MEETING_STATUS,
  decision: DECISION_STATUS,
  action: ACTION_STATUS,
  priority: ACTION_PRIORITY,
} as const;

export function StatusBadge({ kind, value }: { kind: Kind; value: string | undefined }) {
  const list = lists[kind];
  const label = labelFrom(list, value);
  let variant: BadgeVariant = 'outline';
  if (kind === 'meeting') variant = meetingVariant(value ?? '');
  else if (kind === 'decision') variant = decisionVariant(value ?? '');
  else if (kind === 'action') variant = actionVariant(value ?? '');
  else if (kind === 'priority') variant = priorityVariant(value ?? '');

  return (
    <Badge variant={variant} className="font-medium tabular-nums">
      {label}
    </Badge>
  );
}
