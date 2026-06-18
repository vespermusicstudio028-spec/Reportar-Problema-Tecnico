export default async function handler(req, res) {
  // Configuração de CORS para permitir que o frontend chame a API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Se for uma requisição OPTIONS (Preflight do navegador), apenas retornar OK
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verificar se é requisição POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extrair os dados recebidos do frontend
  const { to, code, name } = req.body;
  
  if (!to || !code) {
    return res.status(400).json({ error: 'Parâmetros ausentes (to, code)' });
  }

  // Carregar as chaves de ambiente configuradas na Vercel
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Credenciais do Twilio não configuradas na Vercel.');
    return res.status(500).json({ error: 'Erro de configuração do servidor de SMS.' });
  }

  // Montar a mensagem do SMS
  const clientName = name ? name : 'Cliente';
  const message = `Olá ${clientName}, seu novo código de acesso da The Best IPTV é: ${code}`;

  // Formatar o telefone para garantir que tenha o código do país (Brasil = +55)
  // Remove tudo que não for número
  let formattedTo = to.replace(/\D/g, '');
  if (!formattedTo.startsWith('55')) {
    formattedTo = '55' + formattedTo;
  }
  formattedTo = '+' + formattedTo;

  // Montar o formulário de envio da API da Twilio
  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', fromNumber);
  params.append('Body', message);

  try {
    // Fazer a requisição HTTP direto para a API REST oficial da Twilio
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      },
      body: params
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na Twilio:', data);
      throw new Error(data.message || 'Erro desconhecido ao enviar SMS.');
    }

    return res.status(200).json({ success: true, messageId: data.sid });
  } catch (error) {
    console.error('Twilio fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
