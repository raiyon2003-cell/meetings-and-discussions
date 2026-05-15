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
import { Calendar, Gavel, Moon, Sun } from 'lucide-react';
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:flex-row">
      <div
        className="relative hidden min-h-0 flex-1 flex-col justify-between border-r border-white/10 bg-brand-deep-teal p-10 text-white lg:flex lg:max-w-[46%] xl:max-w-[42%]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              'radial-gradient(ellipse 100% 70% at 0% 0%, rgba(40, 102, 110, 0.5) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 80%, rgba(52, 78, 65, 0.5) 0%, transparent 50%), linear-gradient(180deg, rgba(7,59,76,0.2) 0%, rgba(7,59,76,0.92) 100%)',
          }}
          aria-hidden
        />
        <div className="relative z-[1] space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-platinum/90">SegWitz</div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Meeting &amp; decision repository
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/75">
            Capture meetings, decisions, and follow-ups in one place. Built for teams that need clarity and auditability.
          </p>
        </div>
        <ul className="relative z-[1] mt-12 space-y-4 text-sm text-white/80">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5">
              <Calendar className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="font-semibold text-white">Structured meetings</span>
              <span className="mt-0.5 block text-[13px] text-white/65">Agendas, notes, and outcomes in a consistent flow.</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5">
              <Gavel className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="font-semibold text-white">Traceable decisions</span>
              <span className="mt-0.5 block text-[13px] text-white/65">Link decisions to meetings and owners without losing context.</span>
            </span>
          </li>
        </ul>
        <p className="relative z-[1] text-xs text-white/45">© SegWitz</p>
      </div>

      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center bg-gradient-to-b from-muted/30 via-background to-background p-4 dark:from-background dark:via-background dark:to-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 80% 0%, hsl(var(--primary) / 0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 0% 100%, hsl(var(--accent) / 0.08) 0%, transparent 45%)',
          }}
          aria-hidden
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-[2] h-10 w-10 rounded-full border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur-sm hover:bg-muted dark:bg-card/60"
          onClick={() => toggleTheme()}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="relative z-[1] w-full max-w-md py-8 lg:py-0">
          <div className="mb-6 text-center lg:hidden">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">SegWitz</div>
            <p className="mt-2 text-sm text-muted-foreground">Meeting &amp; decision repository</p>
          </div>

          <Card className="border-border/60 bg-card/95 shadow-card backdrop-blur-md dark:border-border/50 dark:bg-card/90">
            <CardHeader className="space-y-2 border-b border-border/60 pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight md:text-[1.65rem]">Sign in</CardTitle>
              <CardDescription className="text-[15px] leading-relaxed">
                Use your SegWitz Supabase account credentials.
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
                <Button type="submit" className="w-full font-semibold shadow-sm" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
                {loading ? (
                  <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                    Checking existing session…
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
