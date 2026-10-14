-- ==============================================================================
-- RESTAURAÇÃO COMPLETA DOS CLIENTES NO PROJETO SUPABASE
-- ==============================================================================

-- 1. Garantir que todas as colunas necessárias existam na tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS app_user_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS app_image TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Limpar dados temporários se houver e inserir todos os 13 clientes originais
INSERT INTO public.clients (
  id, name, code, canvas_link, plan, price, status, expiration_date, active_app, added_at, created_at, updated_at
) VALUES 
  ('cc0d7991-048a-4b24-a652-938e0eca2e72', 'Patrick Admin', 'ADMIN001', 'https://example.com/canvas', 'Admin', 0, 'Ativo', '2099-12-31 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('c7cf4aab-9132-4b7f-bba6-a5216948096e', 'Cliente Teste 1', 'TESTE001', 'https://example.com/canvas', 'Mensal', 29.90, 'Ativo', '2026-11-30 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('40b4802f-98b8-49d7-bddd-7c30ee751510', 'Cliente Teste 2', 'TESTE002', 'https://example.com/canvas', 'Mensal', 29.90, 'Ativo', '2026-11-30 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('ff576f6f-3e53-4443-aa5b-f3af9250c89c', 'João Silva', 'JOAO001', 'https://example.com/canvas', 'Trimestral', 79.90, 'Ativo', '2026-12-31 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('2e5e5b93-1e49-4b58-8783-98bf2afc1708', 'Maria Santos', 'MARIA001', 'https://example.com/canvas', 'Mensal', 29.90, 'Ativo', '2026-11-15 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('308e71f8-7529-48b9-baae-8f04e021b0c1', 'Pedro Oliveira', 'PEDRO001', 'https://example.com/canvas', 'Semestral', 149.90, 'Ativo', '2027-03-31 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('682f9aa0-53ca-4d2d-a115-acba9ed238c5', 'Ana Lima', 'ANA001', 'https://example.com/canvas', 'Mensal', 29.90, 'Inativo', '2026-10-01 00:00:00+00', 'false', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('d5904820-c98d-4215-b4c9-a7c86017bea8', 'Carlos Mendes', 'CARLOS01', 'https://example.com/canvas', 'Anual', 269.90, 'Ativo', '2027-01-31 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('028e4210-655f-4373-b9b2-c113a8cde3f1', 'Fernanda Costa', 'FERN001', 'https://example.com/canvas', 'Mensal', 29.90, 'Ativo', '2026-11-20 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('9d3e4343-8df0-497f-bb7e-d3a7b46a5d06', 'Roberto Souza', 'ROB001', 'https://example.com/canvas', 'Trimestral', 79.90, 'Ativo', '2026-12-15 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('cd95f00a-5a87-4f68-8bf9-84f4bae88bf7', 'Lucia Pereira', 'LUCIA001', 'https://example.com/canvas', 'Mensal', 29.90, 'Ativo', '2026-11-25 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('f38c2b87-fd07-446e-ad6a-6d3428061fa6', 'Marcos Alves', 'MARCOS01', 'https://example.com/canvas', 'Semestral', 149.90, 'Inativo', '2026-09-30 00:00:00+00', 'false', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00'),
  ('76991123-eb51-490f-9c2e-2fc0d94319cf', 'Teste Grátis', 'GRATIS01', 'https://example.com/canvas', 'Gratuito', 0, 'Ativo', '2026-12-31 00:00:00+00', 'true', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00', '2026-10-13 12:33:16+00')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  expiration_date = EXCLUDED.expiration_date,
  active_app = EXCLUDED.active_app;

-- 3. Notificar o schema cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
