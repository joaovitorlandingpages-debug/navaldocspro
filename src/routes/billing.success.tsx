import { createFileRoute } from '@tanstack/react-router';
import Success from '@/pages/billing/Success';

export const Route = createFileRoute('/billing/success')({
  component: Success,
});
