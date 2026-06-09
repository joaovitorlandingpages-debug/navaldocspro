-- 1. Declaração de Responsabilidade
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}
CNPJ: {{empresa.cnpj}}

DECLARAÇÃO DE RESPONSABILIDADE

Eu, {{cliente.nome}}, portador do CPF nº {{cliente.cpf}} e RG nº {{cliente.rg}}, residente em {{cliente.endereco}}, {{cliente.cidade}}-{{cliente.estado}}, declaro para os devidos fins de direito e sob as penas da lei, ser o responsável legal e técnico pelas informações prestadas junto à Marinha do Brasil referentes à embarcação {{embarcacao.nome}}, inscrita sob o nº {{embarcacao.inscricao}}.

Assumo integral responsabilidade civil e administrativa por qualquer divergência constatada, comprometendo-me a manter os dados atualizados perante a autoridade marítima.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante

Autenticidade: {{sistema.hash}}'
WHERE id = '80cdb7fb-ec07-4999-84e9-812de79def48';

-- 2. Declaração de Responsabilidade para Processo Naval
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}
CNPJ: {{empresa.cnpj}}

DECLARAÇÃO DE RESPONSABILIDADE PARA PROCESSO NAVAL

Pela presente, {{cliente.nome}}, inscrito no CPF sob nº {{cliente.cpf}}, declara plena responsabilidade pelo processo administrativo nº {{processo.numero}}, referente à embarcação {{embarcacao.nome}}.

Declaro estar ciente das normas estabelecidas na NORMAM e que todas as informações e documentos anexados são verídicos, sob pena de sanções previstas no Código Penal Brasileiro e normas da Autoridade Marítima.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante

Hash de Segurança: {{sistema.hash}}'
WHERE id = 'dc6ebe24-51ed-43c0-bf93-3728ac256931';

-- 3. Declaração de Responsabilidade sobre Documentos e Informações Apresentadas
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}
CNPJ: {{empresa.cnpj}}

DECLARAÇÃO DE VERACIDADE DOCUMENTAL

Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, RG {{cliente.rg}}, declaro sob as penas da lei que todos os documentos físicos e digitais apresentados no presente processo de {{processo.tipo}} são cópias fiéis dos originais ou documentos autênticos.

Declaro ainda que as informações inseridas no sistema referentes à embarcação {{embarcacao.nome}} ({{embarcacao.inscricao}}) condizem com a realidade fática da mesma.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante'
WHERE id = '78ccad11-63ab-40f1-aba3-22656333fc14';

-- 4. Declaração de Residência
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE RESIDÊNCIA

Eu, {{cliente.nome}}, portador do CPF nº {{cliente.cpf}}, declaro para fins de comprovação junto à Capitania dos Portos / Delegacia / Agência, que resido habitualmente no endereço: {{cliente.endereco}}, na cidade de {{cliente.cidade}}-{{cliente.estado}}.

Declaro estar ciente de que a falsidade da presente declaração me sujeitará às penalidades previstas no Artigo 299 do Código Penal (Falsidade Ideológica).

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante'
WHERE id = '073f0074-6b6e-4429-8c53-65acbcb36c2b';

-- 5. Declaração de Uso e Finalidade da Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE USO E FINALIDADE

O abaixo assinado, {{cliente.nome}}, proprietário da embarcação {{embarcacao.nome}}, inscrita no CPF sob nº {{cliente.cpf}}, declara que a referida embarcação possui a seguinte finalidade de uso: {{embarcacao.tipo}}.

Declaro que a embarcação será utilizada estritamente dentro dos limites de sua categoria, respeitando as normas de segurança da navegação e salvaguarda da vida humana no mar, não sendo utilizada para fins comerciais a menos que devidamente autorizada.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Proprietário'
WHERE id = 'b24a8704-4b7f-43fc-8608-983eed3a53d6';

-- 6. Declaração de Procedência e Propriedade da Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE PROCEDÊNCIA E PROPRIEDADE

Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, declaro ser o legítimo proprietário da embarcação denominada {{embarcacao.nome}}, com as seguintes características:
- Inscrição/TIE: {{embarcacao.inscricao}}
- Material: {{embarcacao.material}}
- Comprimento: {{embarcacao.comprimento}}m

Declaro que a embarcação é de procedência lícita, livre de ônus ou gravames, e que assumo total responsabilidade pela sua posse perante a Autoridade Marítima.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Proprietário'
WHERE id = '61d33d9b-efdc-4086-bebc-82df995d45aa';

-- 7. Declaração de Material e Construção da Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE MATERIAL E CONSTRUÇÃO

Pela presente, declara-se que a embarcação {{embarcacao.nome}}, de propriedade de {{cliente.nome}}, foi construída utilizando o material predominante: {{embarcacao.material}}.

Características Técnicas:
- Comprimento Total: {{embarcacao.comprimento}} m
- Boca: {{embarcacao.boca}} m
- Pontal: {{embarcacao.pontal}} m

Declaro que os materiais utilizados na construção/reforma atendem aos requisitos de flutuabilidade e estabilidade previstos para sua classe.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Proprietário / Responsável'
WHERE id = '5f37b05d-8b7a-4c1c-8261-dfa998366c24';

-- 8. Declaração de Construção Própria de Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE CONSTRUÇÃO PRÓPRIA (ARTESANAL)

Eu, {{cliente.nome}}, portador do CPF nº {{cliente.cpf}}, declaro para fins de registro inicial que a embarcação denominada {{embarcacao.nome}} foi construída por meios próprios (artesanalmente), sem o auxílio de estaleiro profissional ou engenheiro naval para projeto inicial (conforme limites da NORMAM).

Material: {{embarcacao.material}}
Dimensões: {{embarcacao.comprimento}}m x {{embarcacao.boca}}m

Assumo total responsabilidade pela integridade estrutural e segurança da navegação da referida unidade.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Construtor/Proprietário'
WHERE id = 'f0e1bbbb-ec7a-4a21-93a2-3865b67160a3';

-- 9. Declaração de Capacidade e Lotação da Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE CAPACIDADE E LOTAÇÃO

Declaro que a embarcação {{embarcacao.nome}}, de propriedade de {{cliente.nome}}, possui capacidade máxima de carga e lotação de passageiros conforme abaixo:

Lotação Máxima: {{embarcacao.capacidade}} pessoas

Comprometo-me a respeitar rigorosamente os limites de lotação estabelecidos no TIE/TIEM, garantindo a existência de coletes salva-vidas em quantidade suficiente para todos os embarcados.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Proprietário'
WHERE id = '4528ac85-be6e-4f27-9936-4a525a9175bd';

-- 10. Declaração de Navegação e Área Operacional
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE NAVEGAÇÃO E ÁREA OPERACIONAL

Eu, {{cliente.nome}}, proprietário da embarcação {{embarcacao.nome}}, declaro que a referida unidade opera predominantemente em ÁREA DE NAVEGAÇÃO INTERIOR / COSTEIRA, respeitando os limites de distância da costa e condições climáticas estabelecidos pela Marinha do Brasil.

Tipo de Navegação: {{embarcacao.tipo}}
Inscrição: {{embarcacao.inscricao}}

Declaro estar ciente das restrições de navegação aplicáveis à minha habilitação e categoria da embarcação.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante'
WHERE id = '38a3b8ab-45ff-4b26-985c-d9bd05c0033b';

-- 11. Declaração de Potência e Motorização
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE POTÊNCIA E MOTORIZAÇÃO

Declaro, para fins de regularização de motorização da embarcação {{embarcacao.nome}}, que a mesma encontra-se propelida pelo seguinte motor:

Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Potência: {{motor.potencia}}
Nº de Série: {{motor.serie}}

Declaro que o motor acima identificado é de procedência lícita e está instalado de acordo com as especificações do fabricante e do casco.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Proprietário'
WHERE id = '15a79735-12a8-4e16-ac40-2ed974f089ca';

-- 12. Declaração de Conformidade da Embarcação
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE CONFORMIDADE

Pela presente, {{cliente.nome}} declara que a embarcação {{embarcacao.nome}} ({{embarcacao.inscricao}}) encontra-se em total conformidade com os requisitos de segurança da Autoridade Marítima (NORMAM).

Foram verificados:
- Itens de salvatagem (coletes, boias)
- Extintores de incêndio (dentro da validade)
- Luzes de navegação
- Equipamentos de comunicação

Declaro a embarcação apta para navegar com segurança.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Responsável'
WHERE id = '7bd6b82a-298d-40b4-b648-de2571c12751';

-- 13. Declaração de Extravio ou Perda de Documento
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE EXTRAVIO / PERDA DE DOCUMENTO

Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, declaro para fins de solicitação de SEGUNDA VIA perante a Marinha do Brasil, que o documento original da embarcação {{embarcacao.nome}} ({{embarcacao.inscricao}}) foi objeto de EXTRAVIO / PERDA / ROUBO.

Tipo de documento extraviado: TIE / TIEM / PRPM

Comprometo-me a devolver o documento antigo à Capitania caso o mesmo seja localizado, sob pena de responsabilidade legal.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante'
WHERE id = '4208cf0a-0b13-4ba1-b600-06ab46eeb103';

-- 14. Declaração de Propriedade – Embarcação Antiga
UPDATE document_templates 
SET category = 'DECLARACAO',
    base_content = '{{empresa.nome}}

DECLARAÇÃO DE PROPRIEDADE – EMBARCAÇÃO SEM REGISTRO ANTERIOR

Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, declaro sob as penas da lei que possuo a posse e propriedade mansa e pacífica da embarcação {{embarcacao.nome}} há mais de 5 (cinco) anos, não havendo registro anterior conhecido junto à Marinha do Brasil.

Características:
Material: {{embarcacao.material}}
Comprimento: {{embarcacao.comprimento}}m

Assumo total responsabilidade pela procedência da referida embarcação.

{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{cliente.nome}}
Declarante'
WHERE id = '5d139f49-0e2f-49e1-9b56-3e47bac467d2';