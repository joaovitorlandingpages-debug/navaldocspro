import { createFileRoute } from '@tanstack/react-router';
import Subscription from '@/pages/billing/Subscription';

export const Route = createFileRoute('/minha-assinatura')({
  component: Subscription,
});
