-- ====================================================================
-- MIGRATION: 20261029140000_update_marinha_official_templates.sql
-- ATUALIZAÇÃO INTEGRAL DOS MODELOS CONFORME AS NORMAS DA MARINHA DO BRASIL
-- ====================================================================
-- Alinhamento rigoroso com:
-- 1. NORMAM-211/DPC, Anexo 2-C: Requerimento de Serviços para Regularização de Embarcações
-- 2. NORMAM-211/DPC, Anexo 2-I: Declaração de Residência (Lei nº 7.115/1983)
-- 3. NORMAM-212/DPC, Anexo 2-A: Requerimento para Inscrição / Transferência de Moto Aquática
-- 4. NORMAM-201/DPC, Anexo 2-E: Requerimento para Embarcações Profissionais / Comerciais
-- 5. NORMAM-211/DPC, Anexo 2-H: Declaração de Perda / Extravio de Documento Náutico
-- 6. Procuração Específica para Capitania dos Portos (art. 653 CC c/c NORMAM-211/DPC)
-- ====================================================================

DO $$
BEGIN

  -- 1. REQUERIMENTO PADRÃO DO INTERESSADO (NORMAM-211/DPC, ANEXO 2-C)
  UPDATE public.document_templates
     SET name = 'Requerimento Padrão do Interessado',
         category = 'esporte_recreio',
         description = 'Requerimento oficial padronizado pela Autoridade Marítima (NORMAM-211/DPC, Anexo 2-C) para solicitação de serviços de registro, transferência, 2ª via e emissão de TIE/TIEM.',
         base_content = 'MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
NORMAM-211/DPC - ANEXO 2-C
REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÕES

SR. CAPITÃO DOS PORTOS / DELEGADO / AGENTE

1. DADOS DO REQUERENTE
Nome/Razão Social: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}          RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}
Cidade: {{cliente.cidade}}          UF: {{cliente.estado}}
Telefone: {{cliente.telefone}}     E-mail: {{cliente.email}}

2. DADOS DA EMBARCAÇÃO
Nome da Embarcação: {{embarcacao.nome}}
Número de Inscrição: {{embarcacao.inscricao}}
Tipo/Classificação: {{embarcacao.tipo}}
Material do Casco: {{embarcacao.material}}
Comprimento Total: {{embarcacao.comprimento}} m
Motorização: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SERVIÇO SOLICITADO
O requerente acima qualificado vem respeitosamente requerer a V. Sa. a realização do seguinte serviço para a embarcação em referência:
( X ) Inscrição / Regularização / Transferência de Propriedade
(   ) Transferência de Jurisdição
(   ) Renovação de TIE/TIEM
(   ) Segunda Via de Documento Náutico
(   ) Mudança de Nome da Embarcação
(   ) Alteração de Características / Troca de Motor
(   ) Outros serviços regulamentados pela NORMAM-211/DPC

Declaro, sob as penas da lei, que as informações prestadas e os documentos anexados correspondem fielmente à verdade dos fatos.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Requerente ou Procurador Legal',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'REQ-001';

  -- 2. DECLARAÇÃO DE RESIDÊNCIA (NORMAM-211/DPC, ANEXO 2-I)
  UPDATE public.document_templates
     SET name = 'Declaração de Residência do Proprietário',
         category = 'geral',
         description = 'Declaração oficial de domicílio sob as penas da Lei Federal nº 7.115/1983 e art. 299 do Código Penal para instrução de processos marítimos (NORMAM-211/DPC, Anexo 2-I).',
         base_content = 'MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
NORMAM-211/DPC - ANEXO 2-I
DECLARAÇÃO DE RESIDÊNCIA

SR. CAPITÃO DOS PORTOS / DELEGADO / AGENTE

Eu, {{cliente.nome}}, nacionalidade brasileira, inscrito(a) no CPF sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, telefone {{cliente.telefone}}, e-mail {{cliente.email}},

Na falta de documentos para comprovação de residência, em conformidade com o disposto na Lei nº 7.115, de 29 de agosto de 1983, DECLARO para os devidos fins, sob as penas da Lei, ser residente e domiciliado no seguinte endereço:

Endereço Completo: {{cliente.endereco}}

Declaro ainda estar ciente de que a falsidade da presente declaração pode implicar na sanção penal prevista no Art. 299 do Código Penal, conforme transcrição abaixo:

"Art. 299 - Omitir, em documento público ou particular, declaração que nele deveria constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que deveria ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre o fato juridicamente relevante:
Pena: reclusão de 1 (um) a 5 (cinco) anos e multa, se o documento é público; e reclusão de 1 (um) a 3 (três) anos, se o documento é particular."

Por ser a expressão da verdade, firmo a presente.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Declarante',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'DEC-RES';

  -- 3. REQUERIMENTO DE MOTO AQUÁTICA (NORMAM-212/DPC, ANEXO 2-A)
  UPDATE public.document_templates
     SET name = 'Requerimento Específico para Moto Aquática (Jet Ski)',
         category = 'moto_aquatica',
         description = 'Formulário oficial para inscrição, transferência ou renovação de moto aquática padronizado pela NORMAM-212/DPC, Anexo 2-A.',
         base_content = 'MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
NORMAM-212/DPC - ANEXO 2-A
REQUERIMENTO PARA INSCRIÇÃO OU TRANSFERÊNCIA DE PROPRIEDADE E/OU JURISDIÇÃO DE MOTO AQUÁTICA OU DO SEU PROPRIETÁRIO

SR. CAPITÃO DOS PORTOS / DELEGADO / AGENTE

1. REQUERENTE
Nome/Razão Social: {{cliente.nome}}
Endereço: {{cliente.endereco}}
Identidade: {{cliente.rg}}          CPF/CNPJ: {{cliente.cpf}}
Telefone: {{cliente.telefone}}     E-mail: {{cliente.email}}

2. EMBARCAÇÃO (MOTO AQUÁTICA)
Inscrição Nº: {{embarcacao.inscricao}}
Nome / Modelo: {{embarcacao.nome}}
Comprimento: {{embarcacao.comprimento}} m          Nº do Casco (HIN/MIC): {{embarcacao.numero_casco}}
Motor / Potência: {{motor.fabricante}} ({{motor.potencia}} HP) - Série: {{motor.serie}}

3. SERVIÇOS SOLICITADOS
Vem requerer a V. Sa.:
( X ) Inscrição
(   ) Transferência de Propriedade
(   ) Transferência de Jurisdição
(   ) Transferência de Propriedade e Jurisdição
(   ) Renovação de TIE
(   ) Segunda Via de TIE
(   ) Alteração de dados cadastrais da embarcação ou do proprietário

TERMO DE CIÊNCIA REGULATÓRIA:
Declaro estar ciente de que a condução de moto aquática em águas sob jurisdição nacional exige habilitação específica na categoria de Motonauta (MTA), nos termos da NORMAM-212/DPC, assumindo integral responsabilidade pelas condições de uso e navegação segura.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Requerente ou Procurador Legal',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'REQ-JET';

  -- 4. REQUERIMENTO PROFISSIONAL / COMERCIAL (NORMAM-201/DPC, ANEXO 2-E)
  UPDATE public.document_templates
     SET name = 'Requerimento de Embarcação Profissional / Comercial',
         category = 'profissional',
         description = 'Requerimento oficial de inscrição, regularização ou transferência de embarcações comerciais não sujeitas a registro no Tribunal Marítimo (NORMAM-201/DPC, Anexo 2-E).',
         base_content = 'MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
NORMAM-201/DPC - ANEXO 2-E
REQUERIMENTO PARA INSCRIÇÃO OU TRANSFERÊNCIA DE PROPRIEDADE E/OU JURISDIÇÃO OU ALTERAÇÃO DE CARACTERÍSTICAS DE EMBARCAÇÃO NÃO SUJEITA A REGISTRO NO TRIBUNAL MARÍTIMO

SR. CAPITÃO DOS PORTOS / DELEGADO / AGENTE

1. IDENTIFICAÇÃO DO REQUERENTE
Razão Social / Nome: {{cliente.nome}}
CNPJ / CPF: {{cliente.cpf}}          RG / Órgão: {{cliente.rg}}
Endereço: {{cliente.endereco}}
Telefone: {{cliente.telefone}}     E-mail: {{cliente.email}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome da Embarcação: {{embarcacao.nome}}
Inscrição Atual (se houver): {{embarcacao.inscricao}}
Atividade Operacional: {{embarcacao.tipo}}
Dimensões Principais: Comprimento: {{embarcacao.comprimento}} m | Boca: {{embarcacao.boca}} m | Pontal: {{embarcacao.pontal}} m
Arqueação Bruta (AB): {{embarcacao.arqueacao_bruta}} | Arqueação Líquida (AL): {{embarcacao.arqueacao_liquida}}
Propulsão: {{motor.fabricante}} (Potência: {{motor.potencia}} HP)

3. SERVIÇOS REQUERIDOS
Vem respeitosamente requerer a V. Sa.:
( X ) Inscrição de Embarcação Comercial
(   ) Transferência de Propriedade e/ou Jurisdição
(   ) Licença de Construção / Alteração / Reclassificação
(   ) Vistoria Inicial / Periódica / Renovação de CSN
(   ) Alteração de Características Estruturais ou Mecânicas

Declaro, sob as penas da lei e em conformidade com a Lei de Segurança do Tráfego Aquaviário (Lei nº 9.537/1997 - LESTA), que as informações e documentos acostados a este processo são autênticos.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Armador / Requerente ou Procurador Legal',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'REQ-PROF';

  -- 5. DECLARAÇÃO DE PERDA / EXTRAVIO DE TIE (NORMAM-211/DPC, ANEXO 2-H)
  UPDATE public.document_templates
     SET name = 'Declaração de Perda / Extravio de Documento Náutico',
         category = 'geral',
         description = 'Declaração formal condicional para emissão de 2ª via física em casos de perda, extravio, furto ou roubo de TIE/TIEM físico antigo (NORMAM-211/DPC, Anexo 2-H).',
         base_content = 'MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
NORMAM-211/DPC - ANEXO 2-H
DECLARAÇÃO DE PERDA / EXTRAVIO DE DOCUMENTO NÁUTICO

SR. CAPITÃO DOS PORTOS / DELEGADO / AGENTE

Eu, {{cliente.nome}}, nacionalidade brasileira, inscrito(a) no CPF sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, residente e domiciliado(a) em {{cliente.endereco}}, na qualidade de legítimo proprietário/responsável pela embarcação {{embarcacao.nome}}, inscrita sob o nº {{embarcacao.inscricao}},

Venho mui respeitosamente DECLARAR a V. Sa., para fins de expedição de 2ª via de documento náutico perante a Autoridade Marítima, sob as penas do Art. 299 do Código Penal (Falsidade Ideológica), que houve o extravio/perda involuntária do documento original de inscrição/registro da embarcação em referência.

Comprometo-me formalmente a inutilizar ou entregar à Capitania dos Portos / Delegacia / Agência o documento anterior caso seja posteriormente localizado.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Assinatura do Declarante',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'DEC-PERD';

  -- 6. PROCURAÇÃO ESPECÍFICA PARA CAPITANIA DOS PORTOS (CÓDIGO CIVIL ART. 653 c/c NORMAM-211/DPC)
  UPDATE public.document_templates
     SET name = 'Procuração Específica para Capitania dos Portos',
         category = 'geral',
         description = 'Instrumento particular de mandato outorgando poderes específicos perante a Marinha do Brasil, Capitanias dos Portos, Delegacias e Agências.',
         base_content = 'PROCURAÇÃO PARTICULAR DE REPRESENTAÇÃO NÁUTICA
(Código Civil Brasileiro, Lei Federal nº 10.406/2002, art. 653 c/c NORMAM-211/DPC)

OUTORGANTE:
{{cliente.nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente.cpf}}, portador(a) do RG nº {{cliente.rg}}, residente e domiciliado(a) em {{cliente.endereco}}.

OUTORGADO:
{{procurador.nome}}, inscrito(a) no CPF sob o nº {{procurador.cpf}}, portador(a) do RG nº {{procurador.rg}}, com endereço profissional em {{procurador.endereco}}.

PODERES:
Pelo presente instrumento particular de mandato, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) como seu(sua) bastante procurador(a), conferindo-lhe poderes especiais e expressos para representá-lo(a) perante a Marinha do Brasil, Diretoria de Portos e Costas (DPC), Capitanias dos Portos, Delegacias e Agências (CP/DL/AG), Tribunal Marítimo e órgãos ambientais correlatos, podendo requerer, protocolar, instruir e dar andamento a processos administrativos de inscrição, registro, transferência de propriedade e/ou jurisdição, vistorias técnicas, renovação ou 2ª via de TIE/TIEM/CHA e emissão de certidões referentes à embarcação {{embarcacao.nome}} (Inscrição: {{embarcacao.inscricao}}), podendo juntar e desentranhar documentos, prestar declarações sob as penas da lei, assinar requerimentos, receber notificações, guias e documentos oficiais, e praticar todos os demais atos indispensáveis ao fiel cumprimento deste mandato.

{{sistema.local}}, {{sistema.data_atual}}

_______________________________________________________
{{cliente.nome}}
Outorgante',
         updated_at = now()
   WHERE company_id IS NULL
     AND code = 'PROC-NAV';

END $$;
