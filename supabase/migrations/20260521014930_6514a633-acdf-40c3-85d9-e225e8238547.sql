-- Popular tabela de tipos de processo se estiver vazia ou faltando itens
INSERT INTO public.process_types (name, description, category, estimated_days)
VALUES 
    ('Registro Inicial', 'Primeiro registro da embarcação', 'Nacional', 30),
    ('Transferência de Propriedade', 'Troca de titularidade entre comprador e vendedor', 'Nacional', 15),
    ('Renovação TIE/TIEM', 'Renovação de documento de inscrição', 'Nacional', 10),
    ('Alteração de Motor', 'Regularização de troca de motorização', 'Técnico', 15),
    ('Regularização', 'Regularização geral de características', 'Técnico', 20),
    ('Segunda Via TIE/TIEM', 'Solicitação de 2ª via por perda ou dano', 'Administrativo', 7),
    ('Vistoria Técnica', 'Agendamento e realização de vistoria', 'Técnico', 10),
    ('Licença Rádio/Anatel', 'Licenciamento de estação rádio', 'Telecom', 20)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, 
    category = EXCLUDED.category, 
    estimated_days = EXCLUDED.estimated_days;
