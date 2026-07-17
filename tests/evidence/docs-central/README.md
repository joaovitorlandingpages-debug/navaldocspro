# Evidências QA — Docs Central (Sprint 4D.5)

Este diretório versiona **apenas** artefatos seguros:

- Screenshots das rotas `/admin/docs-central/health` e `/coverage`
- Estados de erro/retry
- Comparativos desktop / tablet / mobile

**Proibido versionar:**
- JWT, `access_token`, cookies
- Playwright `storageState` autenticado
- Senhas ou secrets
- Dumps de payload contendo dados de tenant

Screenshots são gerados pelas specs em `tests/e2e/documentation-health*.spec.ts`
e devem ser depositados aqui (não em `/tmp`, que é volátil).
