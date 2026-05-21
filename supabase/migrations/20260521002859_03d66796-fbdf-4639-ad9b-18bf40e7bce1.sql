-- Atualizar o template BCE com o conteúdo completo e estruturado
UPDATE public.document_templates
SET base_content = 'BOLETIM DE CADASTRO DE EMBARCAÇÃO (BCE)
MARINHA DO BRASIL
DIRETORIA DE PORTOS E COSTAS

IDENTIFICAÇÃO DO PROCESSO: {{processo.numero}}
DATA DE EMISSÃO: {{data_atual}}

1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
Nome Completo: {{cliente.nome}}
CPF / CNPJ: {{cliente.cpf}}
Endereço: {{cliente.endereco}}
E-mail: {{cliente.email}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição / TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}
Material do Casco: {{embarcacao.material_casco}}
Ano de Construção: {{embarcacao.ano_construcao}}
Estaleiro: {{embarcacao.estaleiro}}

3. DIMENSÕES E CARACTERÍSTICAS TÉCNICAS
Comprimento Total: {{embarcacao.comprimento}} m
Boca: {{embarcacao.boca}} m
Pontal: {{embarcacao.pontal}} m
Arqueação Bruta (AB): {{embarcacao.ab}}
Arqueação Líquida (AL): {{embarcacao.al}}

4. PROPULSÃO / MOTORIZAÇÃO
Fabricante do Motor: {{motor.fabricante}}
Potência: {{motor.potencia}} HP
Número de Série: {{motor.numero_serie}}
Combustível: {{motor.combustivel}}

5. DECLARAÇÃO
Declaro, sob as penas da lei, que as informações acima descritas são a expressão da verdade e que a embarcação acima identificada cumpre com todos os requisitos de segurança previstos nas Normas da Autoridade Marítima (NORMAM).

Local e Data: {{cliente.cidade}}, {{data_atual}}

________________________________________________
{{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}
REQUERENTE / OUTORGANTE

________________________________________________
{{engenheiro.nome}}
{{engenheiro.crea}}
RESPONSÁVEL TÉCNICO',
fields_config = '[
  {"field_key": "cliente.nome", "field_label": "Nome do Cliente", "is_required": true},
  {"field_key": "cliente.cpf", "field_label": "CPF/CNPJ", "is_required": true},
  {"field_key": "embarcacao.nome", "field_label": "Nome da Embarcação", "is_required": true},
  {"field_key": "embarcacao.inscricao", "field_label": "Inscrição/TIE", "is_required": true},
  {"field_key": "motor.numero_serie", "field_label": "Série do Motor", "is_required": true}
]',
ocr_enabled = true,
document_type_io = 'out'
WHERE name ILIKE '%BCE%';