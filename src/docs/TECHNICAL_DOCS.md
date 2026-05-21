# NavalDocs Pro - Documentação Técnica Enterprise

## 1. Arquitetura Geral Future-Proof
O NavalDocs Pro utiliza uma arquitetura modular baseada em React (Vite) + Supabase (BaaS). A separação de preocupações é garantida através de:
- **Camada de UI**: Tailwind CSS + Radix UI + Lucide Icons.
- **Gerenciamento de Estado**: React Query para dados do servidor e hooks customizados para estado local.
- **Segurança**: Row Level Security (RLS) no Supabase isolando dados por `company_id`.
- **Roteamento**: TanStack Router para navegação baseada em tipos.

## 2. Fluxo OCR & Inteligência
A extração de dados utiliza um motor OCR avançado integrado via Edge Functions.
1. Upload de documento (Private Storage).
2. Trigger do processamento OCR.
3. Extração semântica de campos navais (Nº de Inscrição, IMO, Validades).
4. Validação cruzada com base técnica.

## 3. Governança Operacional & Backups
- **Versionamento**: Documentos possuem histórico de alterações.
- **Backup**: Logs de backup automático visíveis no Admin.
- **Auditoria**: Audit Trail completo via EnterpriseAuditFeed.
- **Retenção**: Políticas de expiração automatizadas para documentos sensíveis.

## 4. Troubleshooting & Suporte
- **Logs**: Monitoramento centralizado em `/system-monitor`.
- **Alertas**: Notificações automáticas para limites de cota e erros de OCR.
- **Recovery**: Sistema de restauração de desastres via Supabase Backups.

## 5. Sustentabilidade & Escala
O sistema está preparado para escala nacional:
- **Multi-tenancy**: Isolamento total entre empresas.
- **Auto-scaling**: Infraestrutura Supabase escala conforme demanda de storage e CPU.
- **Billing**: Cobrança baseada em planos (Starter, Pro, Enterprise).
