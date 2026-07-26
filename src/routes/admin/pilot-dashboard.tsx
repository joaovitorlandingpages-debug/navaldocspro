import { createFileRoute } from '@tanstack/react-router';
import PilotDashboard from '@/pages/admin/PilotDashboard';

export const Route = createFileRoute('/admin/pilot-dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard Operacional do Piloto · NavalDocs Pro' },
      {
        name: 'description',
        content:
          'Painel operacional da Release Candidate 1.0.0-RC1: empresas piloto, operações, taxa de sucesso, erros por módulo e incidentes.',
      },
      { property: 'og:title', content: 'Dashboard Operacional do Piloto · NavalDocs Pro' },
      {
        property: 'og:description',
        content:
          'Monitoramento do piloto controlado do NavalDocs Pro: métricas, erros por módulo e incidentes.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: PilotDashboard,
});
