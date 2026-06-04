import { createFileRoute } from '@tanstack/react-router';
import ProductionReadiness from '@/pages/admin/ProductionReadiness';

export const Route = createFileRoute('/admin/production-readiness')({
  component: ProductionReadiness,
});
