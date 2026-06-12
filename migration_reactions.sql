-- Migração: Adicionar suporte a Visualizações e Reações em Informes/Eventos

-- 1. Criar tabela de visualizações (views)
CREATE TABLE IF NOT EXISTS announcement_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code)
);

-- 2. Criar tabela de reações
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code, emoji)
);

-- 3. RLS
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON announcement_views FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON announcement_reactions FOR ALL USING (true) WITH CHECK (true);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE announcement_views;
ALTER PUBLICATION supabase_realtime ADD TABLE announcement_reactions;
