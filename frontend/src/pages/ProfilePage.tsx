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
import { PageHeader } from '@/components/PageHeader';
import { UserCircle } from 'lucide-react';

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
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader title="Profile" description="Your identity in the SegWitz meeting and decision repository." />
      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            Your details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input {...form.register('full_name')} />
            </div>
            <Button type="submit" className="shadow-sm" disabled={mut.isPending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
