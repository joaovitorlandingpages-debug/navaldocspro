import { createFileRoute } from '@tanstack/react-router';
import Plans from '@/pages/billing/Plans';

export const Route = createFileRoute('/plans')({
  component: Plans,
});
