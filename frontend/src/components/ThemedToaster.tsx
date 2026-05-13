import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" closeButton theme={theme} />;
}
