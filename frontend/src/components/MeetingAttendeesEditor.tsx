import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type AttendeeRow = {
  user_id: string;
  status: 'present' | 'absent';
};

type UserOption = { id: string; full_name: string };

type MeetingAttendeesEditorProps = {
  users: UserOption[];
  value: AttendeeRow[];
  onChange: (rows: AttendeeRow[]) => void;
  disabled?: boolean;
};

export function MeetingAttendeesEditor({ users, value, onChange, disabled }: MeetingAttendeesEditorProps) {
  const selectedIds = new Set(value.map((r) => r.user_id));
  const available = users.filter((u) => !selectedIds.has(u.id));

  function addUser(userId: string) {
    if (!userId || selectedIds.has(userId)) return;
    onChange([...value, { user_id: userId, status: 'present' }]);
  }

  function removeUser(userId: string) {
    onChange(value.filter((r) => r.user_id !== userId));
  }

  function setStatus(userId: string, status: 'present' | 'absent') {
    onChange(value.map((r) => (r.user_id === userId ? { ...r, status } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="add-attendee">Add participant</Label>
          <select
            id="add-attendee"
            className="select-native"
            defaultValue=""
            disabled={disabled || !available.length}
            onChange={(e) => {
              const uid = e.target.value;
              if (uid) {
                addUser(uid);
                e.target.value = '';
              }
            }}
          >
            <option value="">{available.length ? 'Select user…' : 'All users added'}</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={disabled || !available.length}
          onClick={() => {
            if (available[0]) addUser(available[0].id);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Quick add
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          No participants yet. Add team members who attended or were invited.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/50">
          {value.map((row) => {
            const user = users.find((u) => u.id === row.user_id);
            return (
              <li key={row.user_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-foreground">{user?.full_name ?? row.user_id}</span>
                <div className="flex items-center gap-2">
                  <select
                    className="select-native h-9 w-full min-w-[120px] sm:w-auto"
                    value={row.status}
                    disabled={disabled}
                    onChange={(e) => setStatus(row.user_id, e.target.value as 'present' | 'absent')}
                    aria-label={`Status for ${user?.full_name ?? 'participant'}`}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    onClick={() => removeUser(row.user_id)}
                    aria-label={`Remove ${user?.full_name ?? 'participant'}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}