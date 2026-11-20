/**
 * Script de Envio Automático de Avisos de Vencimento e Pendências de Pagamento
 * Executado diariamente (via GitHub Actions na nuvem e Agendador do Windows).
 * Não requer que o administrador acesse ou abra a página web.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kcarjbybxaeyfechklko.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DO0U-CVM5jIFEZKQ4oTcDw_8-zmbAPA';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

function getDaysUntilExpiration(expiryIso) {
  try {
    const expDate = new Date(expiryIso);
    if (isNaN(expDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(expDate);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

async function runDailyExpiryWarnings() {
  console.log('=====================================================');
  console.log('⏰ INICIANDO ENVIO AUTOMÁTICO DE VENCIMENTOS E PENDÊNCIAS');
  console.log(`📅 Data/Hora de execução: ${new Date().toISOString()}`);
  console.log('=====================================================\n');

  try {
    // 1. Buscar todos os clientes com código ativo e notas
    const cliRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=id,name,code,due_date,status,plan,access_points,notes&code=not.is.null`, {
      headers
    });

    if (!cliRes.ok) {
      throw new Error(`Falha ao buscar clientes: ${cliRes.status} ${await cliRes.text()}`);
    }

    const clients = await cliRes.json();
    console.log(`📋 Total de clientes cadastrados encontrados: ${clients.length}`);

    let sentCount = 0;
    let skippedCount = 0;
    let paidCount = 0;

    for (const client of clients) {
      if (client.status === 'Cancelado' || client.status === 'Inativo' || client.status === 'inactive' || client.status === 'cancelled') {
        continue;
      }

      // Regra fundamental: Se o cliente já foi marcado como PAGO, não envia cobranças nem pendências!
      const isPaid = Boolean(client.notes && client.notes.includes('PAGO_ANTECIPADO'));
      if (isPaid) {
        paidCount++;
        console.log(`🟢 [Já Pago] Cliente: ${client.name} (${client.code}) - Pagamento já confirmado. Avisos suspensos.`);
        continue;
      }

      // Extrair data de vencimento (due_date, expiration_date ou do primeiro ponto de acesso)
      let expiryIso = client.due_date || client.expiration_date;
      if (!expiryIso && client.access_points) {
        try {
          const pts = Array.isArray(client.access_points) ? client.access_points : JSON.parse(client.access_points);
          if (pts?.[0]?.expiresAt && pts[0].expiresAt !== 'VITALÍCIO') {
            expiryIso = pts[0].expiresAt;
          }
        } catch {}
      }

      if (!expiryIso) continue;

      const daysUntil = getDaysUntilExpiration(expiryIso);
      if (daysUntil === null) continue;

      const isTrial = client.plan === 'Teste 3h' || (client.plan && client.plan.toLowerCase().includes('teste'));

      let noticeTag = '';
      let noticePayload = null;

      // 1. Vencimentos futuros e no próprio dia (3 dias, 2 dias, amanhã, hoje)
      if (daysUntil === 0) {
        noticeTag = 'AVISO_VENCIMENTO_HOJE';
        noticePayload = {
          imageUrl: '/vence-hoje.jpg',
          text: 'Bom dia! ☀️ Seu plano vence *HOJE*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 0,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 1) {
        noticeTag = 'AVISO_VENCIMENTO_AMANHA';
        noticePayload = {
          imageUrl: '/vence-amanha.png',
          text: 'Bom dia! ☀️ Seu plano vence *AMANHÃ*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 1,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 2) {
        noticeTag = 'AVISO_VENCIMENTO_2D';
        noticePayload = {
          imageUrl: '/vence-em-2-dias.jpg',
          text: 'Bom dia! ☀️ Seu plano vence em *2 dias*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 2,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 3) {
        noticeTag = 'AVISO_VENCIMENTO_3D';
        noticePayload = {
          imageUrl: '/vence-em-3-dias.jpg',
          text: 'Bom dia! ☀️ Seu plano vence em *3 dias*.\n\nPor favor, realize o seu pagamento para *não perder o sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 3,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } 
      // 2. Pendências de Pagamento (já venceu no passado: dias negativos de -1 a -7)
      else if (daysUntil < 0 && daysUntil >= -7) {
        const diasAtraso = Math.abs(daysUntil);
        if (isTrial) {
          noticeTag = 'AVISO_TESTE_3H_VENCEU';
          noticePayload = {
            imageUrl: '/teste-3h-venceu.jpg',
            text: `Olá, ${client.name}! Seu teste grátis de 3h já venceu. Para continuar assistindo aos melhores canais, filmes e séries, ative seu plano clicando no botão *Renovar* abaixo:`,
            days: -1,
            pixKey: 'thebestiptv10@gmail.com',
            whatsapp: '5521959368651'
          };
        } else {
          noticeTag = 'AVISO_PENDENCIA_PAGAMENTO';
          noticePayload = {
            imageUrl: '/vence-hoje.jpg',
            text: `Olá, ${client.name}! Constatamos uma *pendência de pagamento* do seu plano de streaming (${diasAtraso === 1 ? 'venceu ontem' : `venceu há ${diasAtraso} dias`}).\n\nPara reativar seu sinal imediatamente e continuar assistindo a todos os canais, filmes e séries, realize o pagamento via Pix ou clique em *Renovar* abaixo:`,
            days: daysUntil,
            pixKey: 'thebestiptv10@gmail.com',
            whatsapp: '5521959368651'
          };
        }
      }

      if (!noticeTag || !noticePayload) continue;

      // 2. Verificar se esse aviso já foi enviado nas últimas 20 horas para esse cliente
      const sinceIso = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_messages?client_code=eq.${encodeURIComponent(client.code)}&sender=eq.admin&created_at=gte.${encodeURIComponent(sinceIso)}&select=id,message&order=created_at.desc&limit=5`,
        { headers }
      );

      if (checkRes.ok) {
        const recent = await checkRes.json();
        const alreadySent = recent.some(m => m.message && m.message.includes(`[${noticeTag}]`));
        if (alreadySent) {
          skippedCount++;
          console.log(`⏩ [Já enviado hoje] Cliente: ${client.name} (${client.code}) - ${noticeTag}`);
          continue;
        }
      }

      // 3. Inserir a mensagem no chat com o NOME REAL DO CLIENTE no client_name
      const formattedMessage = `[${noticeTag}]${JSON.stringify(noticePayload)}[/${noticeTag}]`;
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          client_code: client.code,
          client_name: client.name || 'Cliente',
          sender: 'admin',
          message: formattedMessage,
          read_by_admin: true,
          read_by_client: false
        })
      });

      if (insertRes.ok) {
        sentCount++;
        console.log(`✅ [Aviso Enviado] Cliente: ${client.name} (${client.code}) - ${noticeTag} (dias: ${daysUntil})`);
      } else {
        console.error(`❌ [Erro ao Enviar] Cliente: ${client.name} (${client.code}):`, await insertRes.text());
      }
    }

    console.log('\n=====================================================');
    console.log(`🏁 RESULTADO DO PROCESSAMENTO:`);
    console.log(`   - Avisos enviados agora: ${sentCount}`);
    console.log(`   - Clientes já pagos (ignorados): ${paidCount}`);
    console.log(`   - Avisos já disparados nas últimas 20h: ${skippedCount}`);
    console.log('=====================================================');
  } catch (error) {
    console.error('❌ Erro fatal durante a automação de vencimento:', error);
    process.exit(1);
  }
}

runDailyExpiryWarnings();
