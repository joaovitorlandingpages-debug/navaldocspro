import { createFileRoute } from '@tanstack/react-router';
import Failure from '@/pages/billing/Failure';

export const Route = createFileRoute('/billing/failure')({
  component: Failure,
});
