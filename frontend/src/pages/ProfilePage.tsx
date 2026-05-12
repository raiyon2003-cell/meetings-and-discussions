import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  full_name: z.string().min(1),
});

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { full_name: profile?.full_name ?? '' },
  });

  const mut = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      await api.patch('/users/me', v);
      const { data } = await api.get<{ user: typeof profile }>('/me');
      return data.user;
    },
    onSuccess: (next) => {
      toast.success('Profile updated');
      if (next) setProfile(next as never);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input {...form.register('full_name')} />
            </div>
            <Button type="submit" disabled={mut.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
