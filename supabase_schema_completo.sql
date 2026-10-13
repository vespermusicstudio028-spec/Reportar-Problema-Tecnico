-- ==============================================================================
-- SCRIPT COMPLETO DE CRIAÇÃO DO BANCO DE DADOS SUPABASE
-- Projeto: Reportar Problema Técnico & Painel de Suporte / Streaming
-- ==============================================================================

-- 1. TABELA: ANNOUNCEMENTS (Informes e Comunicados)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  media_url TEXT,
  media_type TEXT,
  poll_options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA: POLL_VOTES (Votos de Enquetes)
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  client_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code)
);

-- 3. TABELA: ANNOUNCEMENT_VIEWS (Visualizações de Comunicados)
CREATE TABLE IF NOT EXISTS announcement_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code)
);

-- 4. TABELA: ANNOUNCEMENT_REACTIONS (Reações com Emojis)
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code, emoji)
);

-- 5. TABELA: MOVIE_UPDATES (Lançamentos de Filmes)
CREATE TABLE IF NOT EXISTS movie_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA: SERIES_UPDATES (Lançamentos de Séries)
CREATE TABLE IF NOT EXISTS series_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA: CLIENTS (Cadastro de Clientes e Pontos de Acesso)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  canvas_link TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  plan TEXT,
  plan_price NUMERIC,
  due_date TEXT,
  status TEXT DEFAULT 'Ativo',
  active_app TEXT,
  access_points JSONB DEFAULT '[]'::jsonb,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA: USER_REPORTS (Relatórios de Problemas Técnicos)
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  name TEXT,
  issue TEXT,
  device TEXT,
  description TEXT,
  client_code TEXT,
  client_name TEXT,
  status TEXT DEFAULT 'Pendente',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA: CHAT_MESSAGES (Mensagens do Chat em Tempo Real)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL,
  client_name TEXT,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  message TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  read_by_admin BOOLEAN DEFAULT false,
  read_by_client BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_code ON chat_messages(client_code);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 10. TABELA: CONTENT_REQUESTS (Pedidos de Filmes e Séries dos Clientes)
CREATE TABLE IF NOT EXISTS content_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  tmdb_id TEXT,
  poster_url TEXT,
  season TEXT,
  episode TEXT,
  status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABELA: PUSH_SUBSCRIPTIONS (Notificações Push)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  client_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABELA: APP_SETTINGS (Configurações Gerais do Sistema e Loja)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  config_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. TABELA: CLIENT_SUPPORT_MEMORY (Memória de Suporte Inteligente)
CREATE TABLE IF NOT EXISTS client_support_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL UNIQUE,
  client_name TEXT,
  device TEXT,
  active_app TEXT,
  reported_issues JSONB DEFAULT '[]'::jsonb,
  applied_solutions JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. TABELA: CLIENT_SUPPORT_SESSIONS (Sessões de Suporte)
CREATE TABLE IF NOT EXISTS client_support_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL,
  session_notes TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. TABELA: STORE_PRODUCTS (Planos e Produtos da Loja)
CREATE TABLE IF NOT EXISTS store_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  period TEXT DEFAULT '/mês',
  screens TEXT DEFAULT '1 Aparelho',
  badge TEXT,
  badge_color TEXT,
  color_theme TEXT DEFAULT 'blue',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  payment_link TEXT,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. INSERIR DADOS INICIAIS DE FILMES E SÉRIES
INSERT INTO movie_updates (title) VALUES 
  ('Michael - 2026'), ('Zico O Samurai de Quintino - 2026'), 
  ('Mortal Kombat 2 - 2026'), ('Ate Que Amanheca - 2026'), 
  ('Ate Que Amanheca - 2026 (L)'), ('A Desconhecida - 2026 (L)'), 
  ('A Desconhecida - 2026'), ('Furia no Asfalto - 2025'), 
  ('Furia no Asfalto - 2025 (L)'), ('Maravilhoso Mundo Novo - 2025')
ON CONFLICT DO NOTHING;

INSERT INTO series_updates (title) VALUES 
  ('O Paraiso das Plus Size Abusos e Mentiras'), ('Rise Again'), 
  ('No Limite da Lei'), ('Viral Hit'), ('Operacao Guerra Verde'), 
  ('Dragon Striker'), ('Noruega O Retorno Que Promete'), 
  ('Confissoes de Assassinos Verdades Perturbadoras'), ('The First Jasmine'), 
  ('Un buen divorcio')
ON CONFLICT DO NOTHING;

-- 17. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_support_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- 18. POLÍTICAS DE ACESSO PÚBLICO (Leitura e Escrita Livre)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON announcements;
  CREATE POLICY "Public Access" ON announcements FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON poll_votes;
  CREATE POLICY "Public Access" ON poll_votes FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON announcement_views;
  CREATE POLICY "Public Access" ON announcement_views FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON announcement_reactions;
  CREATE POLICY "Public Access" ON announcement_reactions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON movie_updates;
  CREATE POLICY "Public Access" ON movie_updates FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON series_updates;
  CREATE POLICY "Public Access" ON series_updates FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON clients;
  CREATE POLICY "Public Access" ON clients FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON user_reports;
  CREATE POLICY "Public Access" ON user_reports FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON chat_messages;
  CREATE POLICY "Public Access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON content_requests;
  CREATE POLICY "Public Access" ON content_requests FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON push_subscriptions;
  CREATE POLICY "Public Access" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON app_settings;
  CREATE POLICY "Public Access" ON app_settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON client_support_memory;
  CREATE POLICY "Public Access" ON client_support_memory FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON client_support_sessions;
  CREATE POLICY "Public Access" ON client_support_sessions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public Access" ON store_products;
  CREATE POLICY "Public Access" ON store_products FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 19. ATIVAR REALTIME PARA AS TABELAS
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcements; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcement_views; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcement_reactions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE movie_updates; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE series_updates; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE clients; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_reports; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE content_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE app_settings; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_support_memory; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_support_sessions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE store_products; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 20. CRIAR BUCKETS DE STORAGE (Imagens do Chat e Mídias da Loja)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-photos', 'chat-photos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-media', 'store-media', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para upload e download público
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access Storage chat-photos" ON storage.objects;
  CREATE POLICY "Public Access Storage chat-photos" ON storage.objects
    FOR ALL USING (bucket_id = 'chat-photos') WITH CHECK (bucket_id = 'chat-photos');

  DROP POLICY IF EXISTS "Public Access Storage store-media" ON storage.objects;
  CREATE POLICY "Public Access Storage store-media" ON storage.objects
    FOR ALL USING (bucket_id = 'store-media') WITH CHECK (bucket_id = 'store-media');
EXCEPTION WHEN others THEN NULL;
END $$;
