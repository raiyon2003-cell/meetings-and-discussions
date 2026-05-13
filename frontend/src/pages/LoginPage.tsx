import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Form = z.infer<typeof schema>;

export function LoginPage() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const [submitting, setSubmitting] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(values: Form) {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      toast.success('Signed in');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-deep-teal p-4 dark:bg-[#051a22]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 20% 0%, rgba(40, 102, 110, 0.45) 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 100% 100%, rgba(52, 78, 65, 0.55) 0%, transparent 50%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,59,76,0.25)_0%,rgba(7,59,76,0.88)_100%)] dark:opacity-95"
        aria-hidden
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 z-[2] h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
        onClick={() => toggleTheme()}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Card className="relative z-[1] w-full max-w-md border-white/10 bg-card/95 shadow-card backdrop-blur-md dark:border-border/40 dark:bg-card/90">
        <CardHeader className="space-y-2 border-b border-border/60 pb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">SegWitz</div>
          <CardTitle className="text-2xl font-bold tracking-tight md:text-[1.65rem]">Meeting &amp; Decision Repository</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            Sign in with your SegWitz Supabase account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full font-semibold shadow-sm" disabled={submitting || loading}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
