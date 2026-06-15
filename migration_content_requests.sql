-- Migração: Adicionar suporte a Pedidos de Filmes e Séries

CREATE TABLE IF NOT EXISTS content_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Filme' ou 'Série'
  title TEXT NOT NULL,
  tmdb_id TEXT,
  poster_url TEXT,
  season TEXT,
  episode TEXT,
  status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON content_requests FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE content_requests;
