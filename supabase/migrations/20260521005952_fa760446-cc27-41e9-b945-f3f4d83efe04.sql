-- Insert Memorial Técnico Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Memorial Técnico de Embarcação',
  'Documento técnico detalhando as características construtivas, estruturais e de motorização da embarcação.',
  'technical',
  'MEMORIAL TÉCNICO DE EMBARCAÇÃO

1. IDENTIFICAÇÃO DO PROPRIETÁRIO
Nome: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}
Endereço: {{cliente.endereco}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Tipo/Atividade: {{embarcacao.tipo}} / {{embarcacao.atividade}}
Número de Inscrição: {{embarcacao.inscricao}}

3. CARACTERÍSTICAS TÉCNICAS
Comprimento Total: {{embarcacao.comprimento}} m
Boca: {{embarcacao.boca}} m
Pontal: {{embarcacao.pontal}} m
Arqueação Bruta (AB): {{embarcacao.ab}}
Arqueação Líquida (AL): {{embarcacao.al}}
Material do Casco: {{embarcacao.material}}
Capacidade de Passageiros/Tripulação: {{embarcacao.capacidade}}

4. DESCRIÇÃO ESTRUTURAL
A embarcação possui estrutura construída em {{embarcacao.material}}, utilizando métodos construtivos adequados para sua categoria de navegação. O casco apresenta-se em boas condições de estanqueidade e integridade estrutural.

5. MOTORIZAÇÃO
Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Potência: {{motor.potencia}} HP
Número de Série: {{motor.numero_serie}}
Combustível: {{motor.combustivel}}

6. FINALIDADE E OBSERVAÇÕES TÉCNICAS
O presente memorial técnico destina-se ao processo de {{processo.tipo}} perante a Autoridade Marítima. A embarcação atende aos requisitos técnicos de segurança exigidos para sua classe.

7. RESPONSÁVEL TÉCNICO
Engenheiro: {{engenheiro.nome}}
CREA: {{engenheiro.crea}}
Empresa: {{empresa.nome}} (CNPJ: {{empresa.cnpj}})

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{engenheiro.nome}}
Responsável Técnico

__________________________________________
{{cliente.nome}}
Proprietário',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Memorial Técnico de Embarcação'
ON CONFLICT DO NOTHING;
