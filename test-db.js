const supabaseUrl = 'https://kwmautkzxgwxdfwbfuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bWF1dGt6eGd3eGRmd2JmdWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDIzMjMsImV4cCI6MjA4NjgxODMyM30.haCDn--0_h3bHSXC4bBxQh6KD5XLiEVIY-r6_oB2MS8';

async function testAppQueries() {
  console.log("--- TESTANDO TODAS AS QUERIES DO APP ---");

  // 1. Clients
  const cliRes = await fetch(`${supabaseUrl}/rest/v1/clients?select=*&order=added_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const clients = await cliRes.json();
  console.log("Clients Status:", cliRes.status, "Response:", clients);

  // 2. Announcements
  const annRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=*&order=created_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log("Announcements Status:", annRes.status);

  // 3. User Reports
  const repRes = await fetch(`${supabaseUrl}/rest/v1/user_reports?select=*&order=timestamp.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log("User Reports Status:", repRes.status);

  // 4. Movie Updates
  const movRes = await fetch(`${supabaseUrl}/rest/v1/movie_updates?select=*&order=created_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log("Movie Updates Status:", movRes.status);

  // 5. Content Requests
  const reqRes = await fetch(`${supabaseUrl}/rest/v1/content_requests?select=*&order=created_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log("Content Requests Status:", reqRes.status);

  // 6. Chat Messages
  const chatRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages?select=*&order=created_at.desc&limit=5`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log("Chat Messages Status:", chatRes.status);
  const chatMsgs = await chatRes.json();
  console.log("Total recentes de chat encontrados:", Array.isArray(chatMsgs) ? chatMsgs.length : chatMsgs);
}

testAppQueries();