-- Tabela para armazenar subscriptions de Push Notification
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  client_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode se inscrever (INSERT)
CREATE POLICY "allow_insert_subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Apenas service_role pode ler/deletar (usado pela Edge Function)
CREATE POLICY "allow_service_role_all" ON push_subscriptions
  FOR ALL USING (true);
