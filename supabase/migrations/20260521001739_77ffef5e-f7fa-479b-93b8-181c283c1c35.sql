-- Atualizar ou inserir templates reais na biblioteca
INSERT INTO public.document_templates (name, category, base_content, document_type_io, fields_config, description, is_active)
VALUES 
(
  'BCE (Boletim de Cadastro de Embarcação)', 
  'Propriedade e Registro', 
  'BOLETIM DE CADASTRO DE EMBARCAÇÃO (BCE)

À CAPITANIA DOS PORTOS / DELEGACIA / AGÊNCIA EM: ____________________

1. IDENTIFICAÇÃO DO PROPRIETÁRIO
Nome: {{customer_name}}
CPF/CNPJ: {{customer_cpf}}
Endereço: ______________________________________________________

2. DADOS DA EMBARCAÇÃO
Nome da Embarcação: {{vessel_name}}
Inscrição/TIE: {{vessel_id}}
Tipo de Navegação: {{vessel_activity}}
Atividade: {{vessel_type}}

3. CARACTERÍSTICAS TÉCNICAS
Arqueação Bruta (AB): {{vessel_gross_tonnage}}
Comprimento Total: _________________
Material do Casco: __________________

Pelo presente, solicito o registro/averbação dos dados acima descritos conforme normas da DPC.

Local e Data: {{current_date}}

________________________________________________
Assinatura do Proprietário ou Representante Legal',
  'out',
  '{"required_fields": ["customer_name", "vessel_name", "vessel_id"]}',
  'Modelo oficial para cadastro e atualização de dados de embarcações junto à Marinha.',
  true
),
(
  'Memorial Técnico Descritivo', 
  'Engenharia Naval', 
  'MEMORIAL TÉCNICO DESCRITIVO

EMBARCAÇÃO: {{vessel_name}}
PROPRIETÁRIO: {{customer_name}}

1. OBJETIVO
O presente memorial tem por objetivo descrever as características técnicas e condições de segurança da embarcação supracitada, para fins de {{process_type}}.

2. ESPECIFICAÇÕES TÉCNICAS
Tipo: {{vessel_type}}
Arqueação Bruta: {{vessel_gross_tonnage}}
Área de Navegação: {{vessel_activity}}

3. DESCRIÇÃO DO CASCO E ESTRUTURA
O casco é construído em material compatível com as normas técnicas da Marinha do Brasil, apresentando boas condições de estanqueidade e integridade estrutural.

4. SISTEMA DE PROPULSÃO E GOVERNO
Motorização principal devidamente instalada e operada conforme manual do fabricante.

Concluo que a embarcação atende aos requisitos mínimos de segurança para a navegação pretendida.

Responsável Técnico: {{engineer_name}}
CREA: {{engineer_crea}}

{{current_date}}',
  'out',
  '{"required_fields": ["vessel_name", "customer_name", "engineer_name"]}',
  'Documento técnico obrigatório elaborado por engenheiro naval para processos de regularização.',
  true
),
(
  'Termo de Responsabilidade', 
  'Engenharia Naval', 
  'TERMO DE RESPONSABILIDADE E COMPROMISSO

Eu, {{customer_name}}, portador do CPF/CNPJ {{customer_cpf}}, na qualidade de proprietário da embarcação {{vessel_name}}, inscrita sob o nº {{vessel_id}}, declaro para os devidos fins de direito que:

1. Assumo total responsabilidade pela manutenção e operação da embarcação dentro das normas de segurança da autoridade marítima.
2. Comprometo-me a manter a bordo os equipamentos de salvatagem e combate a incêndio em plena validade.
3. Declaro que os dados fornecidos para o processo de {{process_type}} são a expressão da verdade.

Por ser verdade, firmo o presente termo.

{{current_date}}

________________________________________________
{{customer_name}}',
  'out',
  '{"required_fields": ["customer_name", "customer_cpf", "vessel_name"]}',
  'Termo de compromisso legal assinado pelo proprietário da embarcação.',
  true
),
(
  'Procuração Operacional Naval', 
  'Identificação Pessoal', 
  'PROCURAÇÃO AD NEGOTIA

OUTORGANTE: {{customer_name}}, CPF {{customer_cpf}}, residente e domiciliado em ______________________________________________________.

OUTORGADO: {{company_name}}, com sede em ________________________________, neste ato representado por seus consultores navais.

PODERES: Pelo presente instrumento, o outorgante confere ao outorgado poderes especiais para representar seus interesses perante a Marinha do Brasil (Capitanias, Delegacias e Agências), Capitania dos Portos e demais órgãos navais, especialmente para tratar de assuntos relativos à embarcação {{vessel_name}}, podendo assinar requerimentos, termos, averbações e retirar documentos.

Vigência: 12 meses a partir desta data.

{{current_date}}

________________________________________________
{{customer_name}}',
  'out',
  '{"required_fields": ["customer_name", "vessel_name"]}',
  'Modelo de procuração para despachantes e consultores representarem o cliente nos órgãos navais.',
  true
)
ON CONFLICT (name) DO UPDATE 
SET base_content = EXCLUDED.base_content,
    fields_config = EXCLUDED.fields_config,
    description = EXCLUDED.description;