-- Insert Requerimento de Transferência Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Requerimento de Transferência de Propriedade de Embarcação',
  'Documento oficial para solicitação de transferência de propriedade de embarcação perante a Autoridade Marítima.',
  'official',
  'REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE DE EMBARCAÇÃO

1. IDENTIFICAÇÃO DO COMPRADOR (REQUERENTE):
Nome: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}
RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}

2. IDENTIFICAÇÃO DO VENDEDOR:
Nome: {{vendedor.nome}}
CPF/CNPJ: {{vendedor.cpf}}
RG: {{vendedor.rg}}
Endereço: {{vendedor.endereco}}

3. IDENTIFICAÇÃO DA EMBARCAÇÃO:
Nome: {{embarcacao.nome}}
Número de Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}
Comprimento: {{embarcacao.comprimento}} m

4. DADOS DO MOTOR:
Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Número de Série: {{motor.numero_serie}}
Potência: {{motor.potencia}} HP

5. SOLICITAÇÃO:
O requerente acima identificado solicita à Autoridade Marítima a transferência de propriedade da embarcação descrita, declarando que as informações prestadas e os documentos apresentados correspondem à realidade dos fatos, assumindo total responsabilidade pelas informações constantes neste processo de {{processo.tipo}}.

6. OBSERVAÇÕES:
A transferência ocorre conforme recibo de compra e venda anexo ao processo, datado de {{data_venda}}.

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{cliente.nome}}
Comprador (Requerente)

__________________________________________
{{vendedor.nome}}
Vendedor

EMPRESA / RESPONSÁVEL:
{{empresa.nome}} (CNPJ: {{empresa.cnpj}})',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Requerimento de Transferência de Propriedade de Embarcação'
ON CONFLICT DO NOTHING;
