-- ====================================================================
-- MIGRATION: 20261016203500_fix_catalog_document_templates_safe.sql
-- Sincronização segura e corretiva de modelos do catálogo oficial NavalDocs Pro.
-- ====================================================================
-- REGRAS ESTRITAS DE SEGURANÇA MULTI-TENANT E INTEGRIDADE:
-- 1. Restaura is_global = false em qualquer registro com company_id IS NOT NULL,
--    caso a migration anterior (20261014193500) tenha sido executada em algum ambiente.
-- 2. NUNCA altera nem sobrescreve registros particulares das empresas (company_id IS NOT NULL).
-- 3. NUNCA transforma modelos particulares em globais.
-- 4. Inclui conteúdo real e completo em base_content para todos os modelos geráveis,
--    com placeholders canônicos compatíveis com a Edge Function e o gerador frontend.
-- 5. Preserva modelos em revisão (ex: decl-perda-extravio) sem publicá-los (draft / is_active = false).
-- 6. Execução 100% idempotente (não duplica linhas e não depende de constraints inexistentes de nome).
-- ====================================================================

DO $$
DECLARE
  v_tpl_id uuid;
BEGIN

  -- A. CORREÇÃO DE SEGURANÇA: Se algum modelo particular de empresa foi tornado global indevidamente, restaura
  UPDATE public.document_templates
     SET is_global = false,
         updated_at = now()
   WHERE company_id IS NOT NULL
     AND is_global = true;

  -- 1. REQUERIMENTO PADRÃO DO INTERESSADO (NORMAM-211/DPC, Anexo 2-E)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('REQ-001', 'req-padrao-cpes', 'REQ_PADRAO', 'REQ_CPES'))
   ORDER BY (code = 'REQ-001') DESC, (code = 'req-padrao-cpes') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Requerimento Padrão do Interessado',
      'REQ-001',
      'esporte_recreio',
      'inscricao_inicial',
      'out',
      true,
      NULL,
      true,
      'published',
      'ativo',
      'Requerimento oficial padronizado pela Autoridade Marítima (NORMAM-211/DPC, Anexo 2-E) para solicitação de serviços de registro, transferência e emissão de TIE/TIEM.',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Nome do Interessado", "required": true},
        {"key": "cliente.cpf", "label": "CPF / CNPJ", "required": true},
        {"key": "cliente.rg", "label": "RG", "required": false},
        {"key": "cliente.endereco", "label": "Endereço Completo", "required": true},
        {"key": "cliente.telefone", "label": "Telefone de Contato", "required": false},
        {"key": "cliente.email", "label": "E-mail", "required": false},
        {"key": "embarcacao.nome", "label": "Nome da Embarcação", "required": true},
        {"key": "embarcacao.inscricao", "label": "Número de Inscrição", "required": false},
        {"key": "embarcacao.tipo", "label": "Tipo de Embarcação", "required": false},
        {"key": "embarcacao.material", "label": "Material do Casco", "required": false},
        {"key": "embarcacao.comprimento", "label": "Comprimento (m)", "required": false},
        {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
        {"key": "motor.potencia", "label": "Potência do Motor (HP)", "required": false},
        {"key": "processo.numero", "label": "Número do Processo", "required": false},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'REQUERIMENTO DO INTERESSADO (NORMAM-211/DPC, ANEXO 2-E)
À CAPITANIA DOS PORTOS / DELEGACIA / AGÊNCIA

1. DADOS DO REQUERENTE
Nome/Razão Social: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}          RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}
Telefone: {{cliente.telefone}}     E-mail: {{cliente.email}}

2. DADOS DA EMBARCAÇÃO
Nome da Embarcação: {{embarcacao.nome}}
Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}          Material do Casco: {{embarcacao.material}}
Comprimento: {{embarcacao.comprimento}} m
Propulsão / Motor: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SOLICITAÇÃO
O requerente acima qualificado vem mui respeitosamente requerer a V. Sa. a realização do serviço de inscrição, regularização ou transferência de propriedade perante a Autoridade Marítima, em estrita observância à Lei nº 9.537/1997 (LESTA) e às normas da NORMAM-211/DPC.

Declaro, sob as penas da lei, que as informações prestadas e os documentos anexados correspondem à verdade dos fatos.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Requerente ou Procurador Legal'
    );
  ELSE
    UPDATE public.document_templates
       SET name = 'Requerimento Padrão do Interessado',
           category = 'esporte_recreio',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           validation_status = 'ativo',
           document_type_io = 'out',
           description = 'Requerimento oficial padronizado pela Autoridade Marítima (NORMAM-211/DPC, Anexo 2-E) para solicitação de serviços de registro, transferência e emissão de TIE/TIEM.',
           fields_config = '[
             {"key": "cliente.nome", "label": "Nome do Interessado", "required": true},
             {"key": "cliente.cpf", "label": "CPF / CNPJ", "required": true},
             {"key": "cliente.rg", "label": "RG", "required": false},
             {"key": "cliente.endereco", "label": "Endereço Completo", "required": true},
             {"key": "cliente.telefone", "label": "Telefone de Contato", "required": false},
             {"key": "cliente.email", "label": "E-mail", "required": false},
             {"key": "embarcacao.nome", "label": "Nome da Embarcação", "required": true},
             {"key": "embarcacao.inscricao", "label": "Número de Inscrição", "required": false},
             {"key": "embarcacao.tipo", "label": "Tipo de Embarcação", "required": false},
             {"key": "embarcacao.material", "label": "Material do Casco", "required": false},
             {"key": "embarcacao.comprimento", "label": "Comprimento (m)", "required": false},
             {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
             {"key": "motor.potencia", "label": "Potência do Motor (HP)", "required": false},
             {"key": "processo.numero", "label": "Número do Processo", "required": false},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'REQUERIMENTO DO INTERESSADO (NORMAM-211/DPC, ANEXO 2-E)
À CAPITANIA DOS PORTOS / DELEGACIA / AGÊNCIA

1. DADOS DO REQUERENTE
Nome/Razão Social: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}          RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}
Telefone: {{cliente.telefone}}     E-mail: {{cliente.email}}

2. DADOS DA EMBARCAÇÃO
Nome da Embarcação: {{embarcacao.nome}}
Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}          Material do Casco: {{embarcacao.material}}
Comprimento: {{embarcacao.comprimento}} m
Propulsão / Motor: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SOLICITAÇÃO
O requerente acima qualificado vem mui respeitosamente requerer a V. Sa. a realização do serviço de inscrição, regularização ou transferência de propriedade perante a Autoridade Marítima, em estrita observância à Lei nº 9.537/1997 (LESTA) e às normas da NORMAM-211/DPC.

Declaro, sob as penas da lei, que as informações prestadas e os documentos anexados correspondem à verdade dos fatos.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Requerente ou Procurador Legal',
           code = 'REQ-001',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

  -- 2. PROCURAÇÃO ESPECÍFICA PARA CAPITANIA DOS PORTOS (Código Civil art. 653 c/c NORMAM-211/DPC)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('PROC-NAV', 'proc-representacao-naval', 'PROC_PART_NAVAL', 'PROC_SIMPLES_NAVAL'))
   ORDER BY (code = 'PROC-NAV') DESC, (code = 'proc-representacao-naval') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Procuração Específica para Capitania dos Portos',
      'PROC-NAV',
      'geral',
      'geral',
      'out',
      true,
      NULL,
      true,
      'published',
      'ativo',
      'Instrumento particular de procuração para outorga de poderes de representação náutica perante a Capitania dos Portos, Delegacias e Agências.',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Outorgante (Cliente)", "required": true},
        {"key": "cliente.cpf", "label": "CPF/CNPJ do Outorgante", "required": true},
        {"key": "cliente.rg", "label": "RG do Outorgante", "required": false},
        {"key": "cliente.endereco", "label": "Endereço do Outorgante", "required": true},
        {"key": "procurador.nome", "label": "Outorgado (Procurador)", "required": true},
        {"key": "procurador.cpf", "label": "CPF do Outorgado", "required": true},
        {"key": "procurador.rg", "label": "RG do Outorgado", "required": false},
        {"key": "procurador.endereco", "label": "Endereço do Outorgado", "required": false},
        {"key": "embarcacao.nome", "label": "Embarcação", "required": false},
        {"key": "embarcacao.inscricao", "label": "Inscrição da Embarcação", "required": false},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'PROCURAÇÃO PARTICULAR DE REPRESENTAÇÃO NÁUTICA

OUTORGANTE:
{{cliente.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, residente e domiciliado(a) em {{cliente.endereco}}.

OUTORGADO:
{{procurador.nome}}, inscrito(a) no CPF sob o nº {{procurador.cpf}}, portador(a) do RG nº {{procurador.rg}}, com endereço profissional em {{procurador.endereco}}.

PODERES:
Pelo presente instrumento particular de procuração, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) como seu(sua) bastante procurador(a), conferindo-lhe amplos poderes para representá-lo(a) perante a Capitania dos Portos, Delegacias e Agências da Marinha do Brasil, podendo requerer, protocolar, instruir e dar andamento a processos de inscrição, registro, transferência de propriedade, vistorias, renovação ou 2ª via de TIE/TIEM/CHA e emissão de licenças da embarcação {{embarcacao.nome}} (Inscrição: {{embarcacao.inscricao}}), juntar e desentranhar documentos, prestar declarações, assinar termos, receber notificações e praticar todos os atos necessários ao fiel cumprimento deste mandato.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Outorgante'
    );
  ELSE
    UPDATE public.document_templates
       SET name = 'Procuração Específica para Capitania dos Portos',
           category = 'geral',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           validation_status = 'ativo',
           document_type_io = 'out',
           description = 'Instrumento particular de procuração para outorga de poderes de representação náutica perante a Capitania dos Portos, Delegacias e Agências.',
           fields_config = '[
             {"key": "cliente.nome", "label": "Outorgante (Cliente)", "required": true},
             {"key": "cliente.cpf", "label": "CPF/CNPJ do Outorgante", "required": true},
             {"key": "cliente.rg", "label": "RG do Outorgante", "required": false},
             {"key": "cliente.endereco", "label": "Endereço do Outorgante", "required": true},
             {"key": "procurador.nome", "label": "Outorgado (Procurador)", "required": true},
             {"key": "procurador.cpf", "label": "CPF do Outorgado", "required": true},
             {"key": "procurador.rg", "label": "RG do Outorgado", "required": false},
             {"key": "procurador.endereco", "label": "Endereço do Outorgado", "required": false},
             {"key": "embarcacao.nome", "label": "Embarcação", "required": false},
             {"key": "embarcacao.inscricao", "label": "Inscrição da Embarcação", "required": false},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'PROCURAÇÃO PARTICULAR DE REPRESENTAÇÃO NÁUTICA

OUTORGANTE:
{{cliente.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, residente e domiciliado(a) em {{cliente.endereco}}.

OUTORGADO:
{{procurador.nome}}, inscrito(a) no CPF sob o nº {{procurador.cpf}}, portador(a) do RG nº {{procurador.rg}}, com endereço profissional em {{procurador.endereco}}.

PODERES:
Pelo presente instrumento particular de procuração, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) como seu(sua) bastante procurador(a), conferindo-lhe amplos poderes para representá-lo(a) perante a Capitania dos Portos, Delegacias e Agências da Marinha do Brasil, podendo requerer, protocolar, instruir e dar andamento a processos de inscrição, registro, transferência de propriedade, vistorias, renovação ou 2ª via de TIE/TIEM/CHA e emissão de licenças da embarcação {{embarcacao.nome}} (Inscrição: {{embarcacao.inscricao}}), juntar e desentranhar documentos, prestar declarações, assinar termos, receber notificações e praticar todos os atos necessários ao fiel cumprimento deste mandato.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Outorgante',
           code = 'PROC-NAV',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

  -- 3. DECLARAÇÃO DE RESIDÊNCIA DO PROPRIETÁRIO (Lei Federal nº 7.115/1983 c/c NORMAM-211/DPC)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('DEC-RES', 'decl-residencia-naval', 'DECL_RES_NAVAL'))
   ORDER BY (code = 'DEC-RES') DESC, (code = 'decl-residencia-naval') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Declaração de Residência do Proprietário',
      'DEC-RES',
      'geral',
      'geral',
      'out',
      true,
      NULL,
      true,
      'published',
      'ativo',
      'Declaração de domicílio firmada sob as penas da Lei Federal nº 7.115/1983 para instrução de processos marítimos na falta de comprovante recente.',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Nome do Declarante", "required": true},
        {"key": "cliente.cpf", "label": "CPF", "required": true},
        {"key": "cliente.rg", "label": "RG", "required": false},
        {"key": "cliente.endereco", "label": "Endereço Residencial", "required": true},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'DECLARAÇÃO DE RESIDÊNCIA

Eu, {{cliente.nome}}, nacionalidade brasileira, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob o nº {{cliente.cpf}}, DECLARO para os devidos fins de direito, em especial para instrução de processo náutico perante a Autoridade Marítima (Capitania dos Portos / Delegacia / Agência), sob as penas da Lei Federal nº 7.115, de 29 de agosto de 1983 e do art. 299 do Código Penal (Falsidade Ideológica), que resido e sou domiciliado(a) no seguinte endereço:

Endereço Completo: {{cliente.endereco}}

Por ser a expressão da verdade, firmo a presente declaração.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Declarante'
    );
  ELSE
    UPDATE public.document_templates
       SET name = 'Declaração de Residência do Proprietário',
           category = 'geral',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           validation_status = 'ativo',
           document_type_io = 'out',
           description = 'Declaração de domicílio firmada sob as penas da Lei Federal nº 7.115/1983 para instrução de processos marítimos na falta de comprovante recente.',
           fields_config = '[
             {"key": "cliente.nome", "label": "Nome do Declarante", "required": true},
             {"key": "cliente.cpf", "label": "CPF", "required": true},
             {"key": "cliente.rg", "label": "RG", "required": false},
             {"key": "cliente.endereco", "label": "Endereço Residencial", "required": true},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'DECLARAÇÃO DE RESIDÊNCIA

Eu, {{cliente.nome}}, nacionalidade brasileira, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob o nº {{cliente.cpf}}, DECLARO para os devidos fins de direito, em especial para instrução de processo náutico perante a Autoridade Marítima (Capitania dos Portos / Delegacia / Agência), sob as penas da Lei Federal nº 7.115, de 29 de agosto de 1983 e do art. 299 do Código Penal (Falsidade Ideológica), que resido e sou domiciliado(a) no seguinte endereço:

Endereço Completo: {{cliente.endereco}}

Por ser a expressão da verdade, firmo a presente declaração.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Declarante',
           code = 'DEC-RES',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

  -- 4. REQUERIMENTO ESPECÍFICO PARA MOTO AQUÁTICA (JET SKI) (NORMAM-212/DPC, Anexo 3-B)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('REQ-JET', 'req-moto-aquatica', 'REQ_INSCR'))
   ORDER BY (code = 'REQ-JET') DESC, (code = 'req-moto-aquatica') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Requerimento Específico para Moto Aquática (Jet Ski)',
      'REQ-JET',
      'moto_aquatica',
      'inscricao_moto_aquatica',
      'out',
      true,
      NULL,
      true,
      'published',
      'ativo',
      'Formulário oficial de inscrição, transferência ou renovação de moto aquática padronizado pela NORMAM-212/DPC, Anexo 3-B.',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Proprietário", "required": true},
        {"key": "cliente.cpf", "label": "CPF/CNPJ", "required": true},
        {"key": "cliente.rg", "label": "RG", "required": false},
        {"key": "cliente.endereco", "label": "Endereço", "required": true},
        {"key": "embarcacao.nome", "label": "Identificação / Modelo", "required": true},
        {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
        {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
        {"key": "motor.potencia", "label": "Potência (HP)", "required": false},
        {"key": "motor.serie", "label": "Nº de Série do Motor", "required": false},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'REQUERIMENTO DE INSCRIÇÃO / TRANSFERÊNCIA DE MOTO AQUÁTICA
(NORMAM-212/DPC, ANEXO 3-B)

1. DADOS DO PROPRIETÁRIO
Nome/Razão Social: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}          RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}

2. CARACTERÍSTICAS DA MOTO AQUÁTICA
Identificação / Marca / Modelo: {{embarcacao.nome}}
Inscrição Atual (se houver): {{embarcacao.inscricao}}
Motor: {{motor.fabricante}} | Potência: {{motor.potencia}} HP | Série: {{motor.serie}}

3. TERMO DE CIÊNCIA REGULATÓRIA
Declaro ter pleno conhecimento de que a condução de moto aquática em águas sob jurisdição nacional exige habilitação específica na categoria de Motonauta (MTA), nos termos da NORMAM-212/DPC, responsabilizando-me pelas condições de uso e navegação segura.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Proprietário / Requerente'
    );
  ELSE
    UPDATE public.document_templates
       SET name = 'Requerimento Específico para Moto Aquática (Jet Ski)',
           category = 'moto_aquatica',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           validation_status = 'ativo',
           document_type_io = 'out',
           description = 'Formulário oficial de inscrição, transferência ou renovação de moto aquática padronizado pela NORMAM-212/DPC, Anexo 3-B.',
           fields_config = '[
             {"key": "cliente.nome", "label": "Proprietário", "required": true},
             {"key": "cliente.cpf", "label": "CPF/CNPJ", "required": true},
             {"key": "cliente.rg", "label": "RG", "required": false},
             {"key": "cliente.endereco", "label": "Endereço", "required": true},
             {"key": "embarcacao.nome", "label": "Identificação / Modelo", "required": true},
             {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
             {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
             {"key": "motor.potencia", "label": "Potência (HP)", "required": false},
             {"key": "motor.serie", "label": "Nº de Série do Motor", "required": false},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'REQUERIMENTO DE INSCRIÇÃO / TRANSFERÊNCIA DE MOTO AQUÁTICA
(NORMAM-212/DPC, ANEXO 3-B)

1. DADOS DO PROPRIETÁRIO
Nome/Razão Social: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}          RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}

2. CARACTERÍSTICAS DA MOTO AQUÁTICA
Identificação / Marca / Modelo: {{embarcacao.nome}}
Inscrição Atual (se houver): {{embarcacao.inscricao}}
Motor: {{motor.fabricante}} | Potência: {{motor.potencia}} HP | Série: {{motor.serie}}

3. TERMO DE CIÊNCIA REGULATÓRIA
Declaro ter pleno conhecimento de que a condução de moto aquática em águas sob jurisdição nacional exige habilitação específica na categoria de Motonauta (MTA), nos termos da NORMAM-212/DPC, responsabilizando-me pelas condições de uso e navegação segura.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Proprietário / Requerente',
           code = 'REQ-JET',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

  -- 5. REQUERIMENTO DE EMBARCAÇÃO PROFISSIONAL / COMERCIAL (NORMAM-201/DPC, Anexo 2-A)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('REQ-PROF', 'req-comercial-prof', 'REQ_COM_PROF'))
   ORDER BY (code = 'REQ-PROF') DESC, (code = 'req-comercial-prof') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Requerimento de Embarcação Profissional / Comercial',
      'REQ-PROF',
      'profissional',
      'inscricao_comercial',
      'out',
      true,
      NULL,
      true,
      'published',
      'ativo',
      'Requerimento de inscrição ou vistoria para embarcações de pesca, passageiros ou transporte comercial de carga (NORMAM-201/DPC).',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Armador / Proprietário", "required": true},
        {"key": "cliente.cpf", "label": "CNPJ / CPF", "required": true},
        {"key": "cliente.endereco", "label": "Endereço Comercial", "required": true},
        {"key": "embarcacao.nome", "label": "Nome da Embarcação", "required": true},
        {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
        {"key": "embarcacao.tipo", "label": "Atividade / Tipo", "required": false},
        {"key": "embarcacao.comprimento", "label": "Comprimento (m)", "required": false},
        {"key": "embarcacao.boca", "label": "Boca (m)", "required": false},
        {"key": "embarcacao.pontal", "label": "Pontal (m)", "required": false},
        {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
        {"key": "motor.potencia", "label": "Potência (HP)", "required": false},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'REQUERIMENTO DE EMBARCAÇÃO PROFISSIONAL / COMERCIAL
(NORMAM-201/DPC)

1. QUALIFICAÇÃO DO ARMADOR / PROPRIETÁRIO
Razão Social / Nome: {{cliente.nome}}
CNPJ / CPF: {{cliente.cpf}}
Endereço da Sede / Domicílio: {{cliente.endereco}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO COMERCIAL
Nome da Embarcação: {{embarcacao.nome}}
Inscrição / Registro: {{embarcacao.inscricao}}
Atividade Operacional: {{embarcacao.tipo}}
Dimensões Principais: Comprimento: {{embarcacao.comprimento}} m | Boca: {{embarcacao.boca}} m | Pontal: {{embarcacao.pontal}} m
Propulsão: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SOLICITAÇÃO TÉCNICO-ADMINISTRATIVA
Vem respeitosamente requerer a V. Sa. a realização dos atos administrativos cabíveis de inscrição, vistoria inicial ou perícia para fins de emissão ou renovação dos documentos estatutários da embarcação, nos termos da Lei de Segurança do Tráfego Aquaviário (Lei 9.537/1997) e NORMAM-201/DPC.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Armador / Representante Legal'
    );
  ELSE
    UPDATE public.document_templates
       SET name = 'Requerimento de Embarcação Profissional / Comercial',
           category = 'profissional',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           validation_status = 'ativo',
           document_type_io = 'out',
           description = 'Requerimento de inscrição ou vistoria para embarcações de pesca, passageiros ou transporte comercial de carga (NORMAM-201/DPC).',
           fields_config = '[
             {"key": "cliente.nome", "label": "Armador / Proprietário", "required": true},
             {"key": "cliente.cpf", "label": "CNPJ / CPF", "required": true},
             {"key": "cliente.endereco", "label": "Endereço Comercial", "required": true},
             {"key": "embarcacao.nome", "label": "Nome da Embarcação", "required": true},
             {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
             {"key": "embarcacao.tipo", "label": "Atividade / Tipo", "required": false},
             {"key": "embarcacao.comprimento", "label": "Comprimento (m)", "required": false},
             {"key": "embarcacao.boca", "label": "Boca (m)", "required": false},
             {"key": "embarcacao.pontal", "label": "Pontal (m)", "required": false},
             {"key": "motor.fabricante", "label": "Fabricante do Motor", "required": false},
             {"key": "motor.potencia", "label": "Potência (HP)", "required": false},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'REQUERIMENTO DE EMBARCAÇÃO PROFISSIONAL / COMERCIAL
(NORMAM-201/DPC)

1. QUALIFICAÇÃO DO ARMADOR / PROPRIETÁRIO
Razão Social / Nome: {{cliente.nome}}
CNPJ / CPF: {{cliente.cpf}}
Endereço da Sede / Domicílio: {{cliente.endereco}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO COMERCIAL
Nome da Embarcação: {{embarcacao.nome}}
Inscrição / Registro: {{embarcacao.inscricao}}
Atividade Operacional: {{embarcacao.tipo}}
Dimensões Principais: Comprimento: {{embarcacao.comprimento}} m | Boca: {{embarcacao.boca}} m | Pontal: {{embarcacao.pontal}} m
Propulsão: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SOLICITAÇÃO TÉCNICO-ADMINISTRATIVA
Vem respeitosamente requerer a V. Sa. a realização dos atos administrativos cabíveis de inscrição, vistoria inicial ou perícia para fins de emissão ou renovação dos documentos estatutários da embarcação, nos termos da Lei de Segurança do Tráfego Aquaviário (Lei 9.537/1997) e NORMAM-201/DPC.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Armador / Representante Legal',
           code = 'REQ-PROF',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

  -- 6. DECLARAÇÃO DE PERDA / EXTRAVIO DE DOCUMENTO NÁUTICO (PRESERVADO EM REVISÃO - NÃO PUBLICAR)
  v_tpl_id := NULL;
  SELECT id INTO v_tpl_id
    FROM public.document_templates
   WHERE company_id IS NULL
     AND (code IN ('DEC-PERD', 'decl-perda-extravio', 'DECL_EXTRAVIO'))
   ORDER BY (code = 'DEC-PERD') DESC, (code = 'decl-perda-extravio') DESC
   LIMIT 1;

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.document_templates (
      name,
      code,
      category,
      process_type,
      document_type_io,
      is_global,
      company_id,
      is_active,
      lifecycle_status,
      validation_status,
      description,
      regional_scope,
      version,
      fields_config,
      base_content
    ) VALUES (
      'Declaração de Perda / Extravio de Documento Náutico',
      'DEC-PERD',
      'geral',
      'segunda_via',
      'out',
      true,
      NULL,
      false, -- Inativo para geração automática enquanto em revisão
      'draft', -- Status draft: NÃO PUBLICADO
      'em_revisao',
      'Declaração formal condicional para casos exclusivos de perda ou extravio de TIE/TIEM ou ATP. Em conferência pela equipe NavalDocs.',
      'Nacional',
      1,
      '[
        {"key": "cliente.nome", "label": "Declarante", "required": true},
        {"key": "cliente.cpf", "label": "CPF", "required": true},
        {"key": "cliente.rg", "label": "RG", "required": false},
        {"key": "embarcacao.nome", "label": "Embarcação", "required": true},
        {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
        {"key": "sistema.local", "label": "Cidade/UF", "required": false},
        {"key": "sistema.data_atual", "label": "Data", "required": false}
      ]'::jsonb,
      'DECLARAÇÃO DE EXTRAVIO / PERDA DE DOCUMENTO NÁUTICO
(NORMAM-211/DPC, ANEXO 2-E)

Eu, {{cliente.nome}}, inscrito(a) no CPF sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, na qualidade de legítimo proprietário/responsável pela embarcação {{embarcacao.nome}}, inscrita sob o nº {{embarcacao.inscricao}}, venho mui respeitosamente DECLARAR, para os devidos fins de expedição de 2ª via de documento náutico perante a Autoridade Marítima, sob as penas do art. 299 do Código Penal (Falsidade Ideológica), que houve o extravio acidental do documento original, declarando que o evento não decorreu de fato criminoso conexo conhecido.

Comprometo-me a inutilizar ou entregar à Capitania dos Portos o documento anterior caso seja encontrado.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Declarante'
    );
  ELSE
    -- Garante que modelos em revisão NÃO sejam alterados para 'published' nem 'is_active = true'
    UPDATE public.document_templates
       SET name = 'Declaração de Perda / Extravio de Documento Náutico',
           category = 'geral',
           is_global = true,
           is_active = false,
           lifecycle_status = 'draft',
           validation_status = 'em_revisao',
           description = 'Declaração formal condicional para casos exclusivos de perda ou extravio de TIE/TIEM ou ATP. Em conferência pela equipe NavalDocs.',
           fields_config = '[
             {"key": "cliente.nome", "label": "Declarante", "required": true},
             {"key": "cliente.cpf", "label": "CPF", "required": true},
             {"key": "cliente.rg", "label": "RG", "required": false},
             {"key": "embarcacao.nome", "label": "Embarcação", "required": true},
             {"key": "embarcacao.inscricao", "label": "Inscrição", "required": false},
             {"key": "sistema.local", "label": "Cidade/UF", "required": false},
             {"key": "sistema.data_atual", "label": "Data", "required": false}
           ]'::jsonb,
           base_content = 'DECLARAÇÃO DE EXTRAVIO / PERDA DE DOCUMENTO NÁUTICO
(NORMAM-211/DPC, ANEXO 2-E)

Eu, {{cliente.nome}}, inscrito(a) no CPF sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, na qualidade de legítimo proprietário/responsável pela embarcação {{embarcacao.nome}}, inscrita sob o nº {{embarcacao.inscricao}}, venho mui respeitosamente DECLARAR, para os devidos fins de expedição de 2ª via de documento náutico perante a Autoridade Marítima, sob as penas do art. 299 do Código Penal (Falsidade Ideológica), que houve o extravio acidental do documento original, declarando que o evento não decorreu de fato criminoso conexo conhecido.

Comprometo-me a inutilizar ou entregar à Capitania dos Portos o documento anterior caso seja encontrado.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Declarante',
           code = 'DEC-PERD',
           updated_at = now()
     WHERE id = v_tpl_id;
  END IF;

END $$;
