import { createFileRoute } from '@tanstack/react-router';
import FrontendErrors from '@/pages/admin/FrontendErrors';

export const Route = createFileRoute('/admin/frontend-errors')({
  component: FrontendErrors,
});
