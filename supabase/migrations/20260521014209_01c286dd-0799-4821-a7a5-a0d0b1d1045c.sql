-- Insert Standard Process Types
INSERT INTO public.process_types (name, description, category, estimated_days)
VALUES 
    ('Registro Inicial', 'Processo para o primeiro registro da embarcação na Autoridade Marítima.', 'Nacional', 30),
    ('Transferência de Propriedade', 'Processo para transferência de titularidade entre comprador e vendedor.', 'Nacional', 15),
    ('Renovação de TIE/TIEM', 'Processo para renovação do documento de inscrição da embarcação.', 'Nacional', 10),
    ('Alteração de Motor', 'Processo para regularização de troca ou alteração de motorização.', 'Técnico', 15),
    ('Regularização Técnica', 'Processo para regularização de características técnicas da embarcação.', 'Técnico', 20),
    ('Segunda Via de Documentos', 'Solicitação de segunda via por extravio, perda ou dano.', 'Administrativo', 7),
    ('Vistoria Técnica', 'Agendamento e realização de vistoria para fins de segurança ou regularização.', 'Técnico', 10),
    ('Licença Rádio / ANATEL', 'Cadastramento ou renovação de licença de estação rádio.', 'Telecom', 20)
ON CONFLICT (name) DO NOTHING;

-- Link mandatory documents to these types using 'template_id'
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, order_index)
SELECT pt.id, dt.id, true, 1
FROM public.process_types pt
JOIN public.document_templates dt ON (
    (pt.name = 'Registro Inicial' AND dt.name = 'Requerimento de Registro Inicial de Embarcação') OR
    (pt.name = 'Transferência de Propriedade' AND dt.name = 'Requerimento de Transferência de Propriedade de Embarcação') OR
    (pt.name = 'Alteração de Motor' AND dt.name = 'Requerimento de Alteração de Motor') OR
    (pt.name = 'Vistoria Técnica' AND dt.name = 'Requerimento de Vistoria Técnica') OR
    (pt.name = 'Regularização Técnica' AND dt.name = 'Requerimento de Regularização de Embarcação') OR
    (pt.name = 'Segunda Via de Documentos' AND dt.name = 'Requerimento de Segunda Via TIE/TIEM') OR
    (pt.name = 'Licença Rádio / ANATEL' AND dt.name = 'Requerimento de Licença Rádio / ANATEL')
)
ON CONFLICT DO NOTHING;

-- Log the fix
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('PROCESS_TYPES_FIXED', 'Tipos de processo e requisitos configurados corretamente.', 'process_wizard', '{"fixed_at": "2026-05-21"}');
