-- 1. Memorial Técnico
UPDATE document_templates 
SET category = 'ENGENHARIA',
    name = 'Memorial Técnico',
    base_content = '{{empresa.nome}}
CNPJ: {{empresa.cnpj}}

MEMORIAL TÉCNICO

1. IDENTIFICAÇÃO DO PROCESSO
Número: {{processo.numero}}
Tipo: {{processo.tipo}}
Data: {{sistema.data_atual}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}
Material: {{embarcacao.material}}
Comprimento: {{embarcacao.comprimento}} m
Boca: {{embarcacao.boca}} m
Pontal: {{embarcacao.pontal}} m
Capacidade/Lotação: {{embarcacao.capacidade}} pessoas

3. IDENTIFICAÇÃO DA PROPULSÃO
Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Potência: {{motor.potencia}}
Nº de Série: {{motor.serie}}

4. OBJETIVO TÉCNICO
Este memorial tem por objetivo descrever as características técnicas e as condições de segurança da embarcação {{embarcacao.nome}} para fins de registro e regularização junto à Autoridade Marítima.

5. CARACTERÍSTICAS CONSTRUTIVAS
A embarcação apresenta casco construído em {{embarcacao.material}}, com arranjo estrutural adequado à navegação em sua área operacional definida.

6. CARACTERÍSTICAS OPERACIONAIS
Embarcação destinada ao uso {{embarcacao.tipo}}, operando em limites de estabilidade e flutuabilidade previstos em projeto.

7. AVALIAÇÃO TÉCNICA
Após inspeção técnica, constatou-se que a embarcação mantém sua integridade estrutural e os equipamentos de salvatagem e combate a incêndio estão dimensionados corretamente para a lotação de {{embarcacao.capacidade}} pessoas.

8. CONCLUSÃO TÉCNICA
Conclui-se que a embarcação atende aos requisitos técnicos da NORMAM aplicáveis, estando apta para a navegação.

9. RESPONSÁVEL TÉCNICO
Engenheiro: {{engenheiro.nome}}
CREA: {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}

__________________________________________
{{engenheiro.nome}}
Responsável Técnico'
WHERE id = '646ac1b8-a9e1-473b-a5cf-b3063191435b';

-- 2. Memorial Descritivo
UPDATE document_templates 
SET category = 'ENGENHARIA',
    base_content = '{{empresa.nome}}

MEMORIAL DESCRITIVO

1. IDENTIFICAÇÃO DO PROCESSO
Número: {{processo.numero}}
Data: {{sistema.data_atual}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}
Material: {{embarcacao.material}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Fabricante: {{motor.fabricante}}
Potência: {{motor.potencia}}

4. OBJETIVO TÉCNICO
Descrição detalhada das especificações e arranjos da embarcação {{embarcacao.nome}}.

5. CARACTERÍSTICAS CONSTRUTIVAS
Casco em {{embarcacao.material}}. Comprimento de {{embarcacao.comprimento}}m e Boca de {{embarcacao.boca}}m. Estrutura composta por anteparas transversais e longitudinais.

6. CARACTERÍSTICAS OPERACIONAIS
Navegação em área operacional definida para {{embarcacao.tipo}}.

7. AVALIAÇÃO TÉCNICA
A descrição constante neste memorial reflete fielmente as condições físicas e técnicas verificadas na unidade.

8. CONCLUSÃO TÉCNICA
O memorial descritivo apresenta conformidade com as exigências documentais navais.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}}
{{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}'
WHERE id = '17d7bdcc-15de-4b75-a98f-09870f6a8d88';

-- 3. Memorial Técnico Descritivo
UPDATE document_templates 
SET category = 'ENGENHARIA',
    base_content = '{{empresa.nome}}

MEMORIAL TÉCNICO DESCRITIVO

1. IDENTIFICAÇÃO DO PROCESSO
Protocolo: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
{{embarcacao.nome}}
TIE: {{embarcacao.inscricao}}
Dimensões: {{embarcacao.comprimento}}m x {{embarcacao.boca}}m x {{embarcacao.pontal}}m

3. IDENTIFICAÇÃO DA PROPULSÃO
Motor: {{motor.fabricante}} {{motor.modelo}} ({{motor.potencia}})

4. OBJETIVO TÉCNICO
Consolidação das informações técnicas e descritivas para fins de processo de {{processo.tipo}}.

5. CARACTERÍSTICAS CONSTRUTIVAS
Embarcação de casco rígido em {{embarcacao.material}}, apresentando estanqueidade e robustez estrutural.

6. CARACTERÍSTICAS OPERACIONAIS
Lotação máxima de {{embarcacao.capacidade}} pessoas.

7. AVALIAÇÃO TÉCNICA
Análise conjunta das descrições físicas e parâmetros técnicos de projeto.

8. CONCLUSÃO TÉCNICA
A unidade encontra-se em condições operacionais satisfatórias.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}'
WHERE id = '5985c5b4-b28a-4fe1-afb6-c697fc940a13';

-- 4. Memorial Técnico de Embarcação
UPDATE document_templates 
SET category = 'ENGENHARIA',
    base_content = '{{empresa.nome}}

MEMORIAL TÉCNICO DE EMBARCAÇÃO

1. IDENTIFICAÇÃO DO PROCESSO
Processo: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}
Material: {{embarcacao.material}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Série do Motor: {{motor.serie}}

4. OBJETIVO TÉCNICO
Identificação técnica individualizada da embarcação.

5. CARACTERÍSTICAS CONSTRUTIVAS
Detalhes de boca ({{embarcacao.boca}}m) e pontal ({{embarcacao.pontal}}m).

6. CARACTERÍSTICAS OPERACIONAIS
Uso destinado: {{embarcacao.tipo}}.

7. AVALIAÇÃO TÉCNICA
Verificação de conformidade com os dados de inscrição e histórico técnico.

8. CONCLUSÃO TÉCNICA
Documentação técnica validada e compatível.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} ({{engenheiro.crea}})

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}'
WHERE id = '61cfcc73-0fac-43c6-bfaa-0fe6c10b40a8';

-- 5. Memorial de Alteração de Característica (INSERT)
INSERT INTO document_templates (id, name, category, base_content)
VALUES (gen_random_uuid(), 'Memorial de Alteração de Característica', 'ENGENHARIA', '{{empresa.nome}}

MEMORIAL DE ALTERAÇÃO DE CARACTERÍSTICA

1. IDENTIFICAÇÃO DO PROCESSO
Número: {{processo.numero}}
Tipo: Alteração de Característica

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}
Tipo Atual: {{embarcacao.tipo}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Motorização: {{motor.fabricante}} ({{motor.potencia}})

4. OBJETIVO TÉCNICO
Justificar e descrever as alterações estruturais ou funcionais propostas para a embarcação.

5. CARACTERÍSTICAS CONSTRUTIVAS
Descrição da condição ATUAL vs condição PROPOSTA (material, dimensões ou arranjo).

6. CARACTERÍSTICAS OPERACIONAIS
Avaliação do impacto da alteração na navegabilidade e na lotação de {{embarcacao.capacidade}} pessoas.

7. AVALIAÇÃO TÉCNICA
Análise de estabilidade e integridade estrutural após as modificações.

8. CONCLUSÃO TÉCNICA
A alteração de característica solicitada mantém os padrões de segurança exigidos pela NORMAM.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - CREA {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}');

-- 6. Memorial de Alteração de Motor (INSERT)
INSERT INTO document_templates (id, name, category, base_content)
VALUES (gen_random_uuid(), 'Memorial de Alteração de Motor', 'ENGENHARIA', '{{empresa.nome}}

MEMORIAL DE ALTERAÇÃO DE MOTOR

1. IDENTIFICAÇÃO DO PROCESSO
Processo: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}

3. IDENTIFICAÇÃO DA PROPULSÃO (MOTOR PROPOSTO)
Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Potência: {{motor.potencia}}
Série: {{motor.serie}}

4. OBJETIVO TÉCNICO
Análise técnica para substituição/alteração do grupo propulsor.

5. CARACTERÍSTICAS CONSTRUTIVAS
Avaliação do reforço do berço do motor e fixação do novo propulsor.

6. CARACTERÍSTICAS OPERACIONAIS
Comparativo de desempenho e peso entre o motor anterior e o motor proposto.

7. AVALIAÇÃO TÉCNICA
Verificação de compatibilidade da potência de {{motor.potencia}} com as especificações do casco.

8. CONCLUSÃO TÉCNICA
A motorização proposta é compatível e segura para a embarcação em tela.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - CREA {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}');

-- 7. Laudo Técnico Simplificado
UPDATE document_templates 
SET category = 'ENGENHARIA',
    name = 'Laudo Técnico Simplificado',
    base_content = '{{empresa.nome}}

LAUDO TÉCNICO SIMPLIFICADO

1. IDENTIFICAÇÃO DO PROCESSO
Nº: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Embarcação: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}
Comprimento: {{embarcacao.comprimento}}m

3. IDENTIFICAÇÃO DA PROPULSÃO
Potência: {{motor.potencia}}

4. OBJETIVO TÉCNICO
Emissão de laudo simplificado para embarcações de pequeno porte ou trâmite administrativo específico.

5. CARACTERÍSTICAS CONSTRUTIVAS
Verificação visual da estrutura do casco e acessórios.

6. CARACTERÍSTICAS OPERACIONAIS
Condições de flutuação e manobrabilidade básica.

7. AVALIAÇÃO TÉCNICA
Inspeção simplificada dos itens de segurança obrigatórios.

8. CONCLUSÃO TÉCNICA
Embarcação apta para o serviço proposto, conforme critérios técnicos vigentes.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} ({{engenheiro.crea}})

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}'
WHERE id = '3a781c1a-a0e9-45e1-8ee1-34a3667b08fd';

-- 8. Relatório Técnico de Embarcação (INSERT)
INSERT INTO document_templates (id, name, category, base_content)
VALUES (gen_random_uuid(), 'Relatório Técnico de Embarcação', 'ENGENHARIA', '{{empresa.nome}}

RELATÓRIO TÉCNICO DE EMBARCAÇÃO

1. IDENTIFICAÇÃO DO PROCESSO
Protocolo: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Fabricante: {{motor.fabricante}}

4. OBJETIVO TÉCNICO
Relatar detalhadamente as condições encontradas durante a perícia/inspeção da embarcação.

5. CARACTERÍSTICAS CONSTRUTIVAS
Descrição técnica do estado de conservação do casco e superestrutura.

6. CARACTERÍSTICAS OPERACIONAIS
Histórico operacional e área de navegação ({{embarcacao.tipo}}).

7. AVALIAÇÃO TÉCNICA
Listagem de conformidades e observações técnicas relevantes.

8. CONCLUSÃO TÉCNICA
Parecer consolidado sobre o status técnico da unidade.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}');

-- 9. Parecer Técnico Naval (INSERT)
INSERT INTO document_templates (id, name, category, base_content)
VALUES (gen_random_uuid(), 'Parecer Técnico Naval', 'ENGENHARIA', '{{empresa.nome}}

PARECER TÉCNICO NAVAL

1. IDENTIFICAÇÃO DO PROCESSO
Número: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Embarcação: {{embarcacao.nome}}
Tipo: {{embarcacao.tipo}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Motor: {{motor.fabricante}}

4. OBJETIVO TÉCNICO
Fundamentação técnica sobre consulta ou divergência em processo naval.

5. CARACTERÍSTICAS CONSTRUTIVAS
Análise das normas técnicas aplicáveis à construção da unidade.

6. CARACTERÍSTICAS OPERACIONAIS
Análise das restrições e capacidades operacionais.

7. AVALIAÇÃO TÉCNICA
Argumentação técnica fundamentada na NORMAM e engenharia naval.

8. CONCLUSÃO TÉCNICA
Recomendação técnica final e parecer conclusivo.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - CREA {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}');

-- 10. Relatório de Vistoria Técnica
UPDATE document_templates 
SET category = 'ENGENHARIA',
    name = 'Relatório de Vistoria Técnica',
    base_content = '{{empresa.nome}}

RELATÓRIO DE VISTORIA TÉCNICA

1. IDENTIFICAÇÃO DO PROCESSO
Número: {{processo.numero}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO
Nome: {{embarcacao.nome}}
Inscrição: {{embarcacao.inscricao}}

3. IDENTIFICAÇÃO DA PROPULSÃO
Série: {{motor.serie}}

4. OBJETIVO TÉCNICO
Registro formal das constatações realizadas durante vistoria técnica presencial.

5. CARACTERÍSTICAS CONSTRUTIVAS
Estado das anteparas, convés, fundo e costado.

6. CARACTERÍSTICAS OPERACIONAIS
Verificação dos equipamentos de auxílio à navegação e rádio.

7. AVALIAÇÃO TÉCNICA
Checklist de conformidade com itens de segurança e salvatagem.

8. CONCLUSÃO TÉCNICA
A embarcação apresenta-se ( )APTA ( )INAPTA para navegação, ressalvadas as pendências listadas.

9. RESPONSÁVEL TÉCNICO
{{engenheiro.nome}} - {{engenheiro.crea}}

10. ASSINATURA
{{sistema.local}}, {{sistema.data_atual}}'
WHERE id = '8aa60dea-0062-4f25-b71f-c04229f7b155';