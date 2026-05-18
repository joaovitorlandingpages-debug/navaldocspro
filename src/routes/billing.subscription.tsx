import { createFileRoute } from '@tanstack/react-router';
import Subscription from '@/pages/billing/Subscription';

export const Route = createFileRoute('/billing/subscription')({
  component: Subscription,
});
