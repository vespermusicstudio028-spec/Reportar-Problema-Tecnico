-- Migração: Adicionar suporte a Enquetes
-- Execute este SQL no SQL Editor do Supabase (https://supabase.com/dashboard)

-- 1. Adicionar coluna poll_options à tabela announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS poll_options JSONB;

-- 2. Criar tabela de votos
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  client_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, client_code)
);

-- 3. RLS
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON poll_votes FOR ALL USING (true) WITH CHECK (true);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
