-- Criação das Tabelas
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movie_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS series_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  canvas_link TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  name TEXT,
  issue TEXT,
  device TEXT,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais para filmes e séries
INSERT INTO movie_updates (title) VALUES 
  ('Michael - 2026'), ('Zico O Samurai de Quintino - 2026'), 
  ('Mortal Kombat 2 - 2026'), ('Ate Que Amanheca - 2026'), 
  ('Ate Que Amanheca - 2026 (L)'), ('A Desconhecida - 2026 (L)'), 
  ('A Desconhecida - 2026'), ('Furia no Asfalto - 2025'), 
  ('Furia no Asfalto - 2025 (L)'), ('Maravilhoso Mundo Novo - 2025');

INSERT INTO series_updates (title) VALUES 
  ('O Paraiso das Plus Size Abusos e Mentiras'), ('Rise Again'), 
  ('No Limite da Lei'), ('Viral Hit'), ('Operacao Guerra Verde'), 
  ('Dragon Striker'), ('Noruega O Retorno Que Promete'), 
  ('Confissoes de Assassinos Verdades Perturbadoras'), ('The First Jasmine'), 
  ('Un buen divorcio');

-- Configurar Segurança (Row Level Security)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Todos podem ler e escrever para facilitar o uso do painel sem autenticação complexa por enquanto)
CREATE POLICY "Public Access" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON movie_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON series_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON user_reports FOR ALL USING (true) WITH CHECK (true);

-- Ativar o Realtime para as tabelas
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table movie_updates;
alter publication supabase_realtime add table series_updates;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table user_reports;
