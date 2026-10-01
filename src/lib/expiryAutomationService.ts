import { supabase } from './supabase';
import { ExpiryNoticePayload } from '../components/ExpiryNoticeCard';
import { isPixPdfMessage } from './pixUtils';
import { isSupportPhotosMessage } from '../components/PhotoUploadModal';

export interface ExpiryAutomationStats {
  checkedCount: number;
  sentTodayCount: number;
  sentTomorrowCount: number;
  sent2DaysCount: number;
  sent3DaysCount: number;
  renewedCount: number;
  lastRunAt: string | null;
}

const STORAGE_LAST_RUN = 'tbi_expiry_automation_last_run';
const STORAGE_SENT_LOG = 'tbi_expiry_sent_log'; // cache: `${clientCode}_${noticeType}_${dateStr}`

function getSentLog(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_SENT_LOG);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markNoticeAsSentInLog(clientCode: string, noticeType: string, dateStr: string) {
  try {
    const log = getSentLog();
    const key = `${clientCode}_${noticeType}_${dateStr}`;
    log[key] = new Date().toISOString();
    // Limitar o tamanho do log guardando apenas últimos 500 registros
    const entries = Object.entries(log);
    if (entries.length > 500) {
      const trimmed = Object.fromEntries(entries.slice(-300));
      localStorage.setItem(STORAGE_SENT_LOG, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_SENT_LOG, JSON.stringify(log));
    }
  } catch {}
}

function isNoticeAlreadySentInLog(clientCode: string, noticeType: string, dateStr: string): boolean {
  try {
    const log = getSentLog();
    const key = `${clientCode}_${noticeType}_${dateStr}`;
    return Boolean(log[key]);
  } catch {
    return false;
  }
}

/**
 * Calcula a diferença em dias inteiros entre a data atual e a data de vencimento.
 * Ex: se vence hoje => 0
 *     se vence amanhã => 1
 *     se vence depois de amanhã => 2
 *     se vence em 3 dias => 3
 */
export function getDaysUntilExpiration(expiryIso: string): number | null {
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

/**
 * Determina se uma mensagem é um aviso de vencimento disparado pela automação ou por atalhos.
 */
export function isExpiryNoticeMessage(message?: string): boolean {
  if (!message || typeof message !== 'string') return false;
  return (
    message.includes('[AVISO_VENCIMENTO_3D]') ||
    message.includes('[AVISO_VENCIMENTO_2D]') ||
    message.includes('[AVISO_VENCIMENTO_AMANHA]') ||
    message.includes('[AVISO_VENCIMENTO_HOJE]') ||
    message.includes('[AVISO_TESTE_3H_VENCEU]')
  );
}

/**
 * Determina se a mensagem enviada pelo cliente é um comprovante de pagamento.
 */
export function isPaymentReceiptMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;

  // 1. PDF de comprovante Pix oficial
  if (isPixPdfMessage(message)) return true;

  // 2. Fotos enviadas via suporte com legenda de comprovante
  if (isSupportPhotosMessage(message)) {
    const lower = message.toLowerCase();
    if (
      lower.includes('comprovante') ||
      lower.includes('pix') ||
      lower.includes('pago') ||
      lower.includes('pagamento') ||
      lower.includes('paguei')
    ) {
      return true;
    }
  }

  // 3. Texto do cliente indicando claramente que enviou ou realizou o pagamento
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (
    lower.includes('segue o comprovante') ||
    lower.includes('segue comprovante') ||
    lower.includes('ta aqui o comprovante') ||
    lower.includes('esta aqui o comprovante') ||
    lower.includes('ja paguei') ||
    lower.includes('acabei de pagar') ||
    lower.includes('pix feito') ||
    lower.includes('pagamento efetuado') ||
    lower.includes('ja fiz o pix') ||
    lower.includes('fiz o pix') ||
    lower.includes('comprovante em anexo')
  ) {
    return true;
  }

  return false;
}

/**
 * Lê e processa o comprovante de pagamento:
 * 1. Renova o vencimento do cliente no Supabase em +30 dias.
 * 2. Atualiza os access_points.
 * 3. Envia mensagem de confirmação no chat.
 * 4. Interrompe as cobranças do ciclo atual até o próximo vencimento.
 */
export async function autoProcessPaymentReceiptAndRenew(
  clientCode: string,
  clientName: string = 'Cliente'
): Promise<{ success: boolean; newExpiryDate?: string; error?: string }> {
  try {
    if (!clientCode) return { success: false, error: 'Código de cliente inválido' };

    // 1. Buscar dados atuais do cliente
    const { data: client, error: fetchErr } = await supabase
      .from('clients')
      .select('id, name, expiration_date, access_points, plan, price')
      .eq('code', clientCode)
      .maybeSingle();

    if (fetchErr || !client) {
      console.error('Cliente não encontrado para renovação automática:', fetchErr);
      return { success: false, error: fetchErr?.message || 'Cliente não encontrado' };
    }

    const now = new Date();
    let baseDate = now;

    // Se o cliente ainda tem dias restantes antes de vencer, somamos 30 dias a partir da data de vencimento
    // para não perder os dias já pagos. Se já venceu, somamos a partir de hoje.
    if (client.expiration_date) {
      const currentExp = new Date(client.expiration_date);
      if (!isNaN(currentExp.getTime()) && currentExp > now) {
        baseDate = currentExp;
      }
    }

    const nextDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nextDateISO = nextDate.toISOString();
    const formattedNextDate = nextDate.toLocaleDateString('pt-BR');

    // Atualizar também o array de access_points se existir
    let updatedPoints = client.access_points;
    if (updatedPoints) {
      try {
        const pointsArray = Array.isArray(updatedPoints) ? updatedPoints : JSON.parse(updatedPoints);
        updatedPoints = pointsArray.map((p: any) => ({
          ...p,
          expiresAt: nextDateISO
        }));
      } catch {}
    }

    // 2. Atualizar no Supabase
    const { error: updateErr } = await supabase
      .from('clients')
      .update({
        expiration_date: nextDateISO,
        access_points: updatedPoints,
        status: 'active'
      })
      .eq('id', client.id);

    if (updateErr) {
      console.error('Erro ao atualizar data de vencimento do cliente:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // 3. Enviar mensagem de confirmação de pagamento e quitação do ciclo no chat
    const confirmMessage = `🎉 **COMPROVANTE DE PAGAMENTO RECONHECIDO!** 🎉

Olá, ${client.name || clientName}! Seu comprovante de pagamento foi validado e baixado em nosso sistema com sucesso!

🟢 **Status do Pagamento:** APROVADO & CONFIRMADO
📅 **Novo Vencimento:** ${formattedNextDate}
🚫 **Avisos de Cobrança:** Suspensos para este ciclo!
🍿 **Acesso aos Canais, Filmes e Séries:** Garantido e 100% Liberado.

Muito obrigado pela pontualidade e preferência! Nosso sistema voltará a enviar lembretes com antecedência apenas no seu próximo vencimento. Desejamos uma excelente programação com a **The Best IPTV**! 📺✨`;

    await supabase.from('chat_messages').insert({
      client_code: clientCode,
      client_name: 'Suporte The Best IPTV+',
      sender: 'admin',
      message: confirmMessage,
      read_by_admin: true,
      read_by_client: false
    });

    return { success: true, newExpiryDate: nextDateISO };
  } catch (err: any) {
    console.error('Erro inesperado em autoProcessPaymentReceiptAndRenew:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Horário oficial programado para envio dos avisos de vencimento: 08:00 horas da manhã.
 */
export const SCHEDULED_EXPIRY_HOUR = 8;

/**
 * Verifica se o horário atual atingiu ou ultrapassou o horário programado de envio (08:00 da manhã).
 * Permite o envio a partir das 08:00 até o final do dia.
 */
export function isScheduledNoticeTimeReached(targetHour: number = SCHEDULED_EXPIRY_HOUR): boolean {
  const now = new Date();
  return now.getHours() >= targetHour;
}

/**
 * Varre todos os clientes ativos e envia automaticamente o aviso de vencimento correto
 * de acordo com a quantidade de dias restantes (3 dias, 2 dias, amanhã ou hoje).
 * Os envios ocorrem sempre a partir das 08:00 horas da manhã.
 * Evita repetições no mesmo ciclo de vencimento.
 * 
 * @param forceManual Se true, ignora a trava de 08:00h e executa o envio imediatamente (ex: disparo manual pelo admin).
 */
export async function checkAndSendAutomaticExpiryNotices(
  forceManual: boolean = false
): Promise<ExpiryAutomationStats> {
  const stats: ExpiryAutomationStats = {
    checkedCount: 0,
    sentTodayCount: 0,
    sentTomorrowCount: 0,
    sent2DaysCount: 0,
    sent3DaysCount: 0,
    renewedCount: 0,
    lastRunAt: new Date().toISOString()
  };

  // Trava de horário: Envio automático somente a partir das 08:00 da manhã
  if (!forceManual && !isScheduledNoticeTimeReached(SCHEDULED_EXPIRY_HOUR)) {
    const now = new Date();
    const currentHourStr = String(now.getHours()).padStart(2, '0');
    const currentMinStr = String(now.getMinutes()).padStart(2, '0');
    console.log(`⏰ [Automação Vencimento] Aguardando o horário oficial das 08:00 horas da manhã. Horário atual: ${currentHourStr}:${currentMinStr}.`);
    return stats;
  }

  try {
    // 1. Buscar todos os clientes com código e data de vencimento
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, code, expiration_date, status, plan, access_points')
      .not('code', 'is', null);

    if (error || !clients) {
      console.error('Erro ao buscar clientes para automação de vencimento:', error);
      return stats;
    }

    stats.checkedCount = clients.length;
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const client of clients) {
      if (!client.code || client.status === 'inactive' || client.status === 'cancelled') {
        continue;
      }

      // Determinar a data de expiração efetiva
      let expiryIso = client.expiration_date;
      if (!expiryIso && client.access_points) {
        try {
          const pts = Array.isArray(client.access_points) ? client.access_points : JSON.parse(client.access_points);
          if (pts?.[0]?.expiresAt) {
            expiryIso = pts[0].expiresAt;
          }
        } catch {}
      }

      if (!expiryIso) continue;

      const daysUntil = getDaysUntilExpiration(expiryIso);
      if (daysUntil === null || daysUntil < 0 || daysUntil > 3) {
        // Fora do período de aviso (3, 2, 1 ou 0 dias)
        continue;
      }

      // Identificar o tipo de aviso correspondente aos dias restantes
      let noticeTag = '';
      let noticePayload: ExpiryNoticePayload;

      if (daysUntil === 0) {
        // VENCE HOJE
        noticeTag = 'AVISO_VENCIMENTO_HOJE';
        noticePayload = {
          imageUrl: '/vence-hoje.jpg',
          text: 'Bom dia! ☀️ Seu plano vence *HOJE*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 0,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 1) {
        // VENCE AMANHÃ
        noticeTag = 'AVISO_VENCIMENTO_AMANHA';
        noticePayload = {
          imageUrl: '/vence-amanha.png',
          text: 'Bom dia! ☀️ Seu plano vence *AMANHÃ*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 1,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 2) {
        // VENCE EM 2 DIAS
        noticeTag = 'AVISO_VENCIMENTO_2D';
        noticePayload = {
          imageUrl: '/vence-em-2-dias.jpg',
          text: 'Bom dia! ☀️ Seu plano vence em *2 dias*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 2,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else if (daysUntil === 3) {
        // VENCE EM 3 DIAS
        noticeTag = 'AVISO_VENCIMENTO_3D';
        noticePayload = {
          imageUrl: '/vence-em-3-dias.jpg',
          text: 'Bom dia! ☀️ Seu plano vence em *3 dias*.\n\nPor favor, realize o seu pagamento para *não perder o sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
          days: 3,
          pixKey: 'thebestiptv10@gmail.com',
          whatsapp: '5521959368651'
        };
      } else {
        continue;
      }

      // 2. Verificar se o aviso para hoje já foi enviado (primeiro checa cache local)
      if (isNoticeAlreadySentInLog(client.code, noticeTag, todayStr)) {
        continue;
      }

      // 3. Checar no banco de dados se esse aviso já foi enviado hoje para esse cliente
      const { data: recentMsgs } = await supabase
        .from('chat_messages')
        .select('id, message, created_at')
        .eq('client_code', client.code)
        .eq('sender', 'admin')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const alreadySentInDb = recentMsgs?.some(m => m.message.includes(`[${noticeTag}]`));
      if (alreadySentInDb) {
        markNoticeAsSentInLog(client.code, noticeTag, todayStr);
        continue;
      }

      // 4. Enviar mensagem de aviso com flyer e botões para o cliente
      const formattedMessage = `[${noticeTag}]${JSON.stringify(noticePayload)}[/${noticeTag}]`;

      const { error: insertErr } = await supabase.from('chat_messages').insert({
        client_code: client.code,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: formattedMessage,
        read_by_admin: true,
        read_by_client: false
      });

      if (!insertErr) {
        markNoticeAsSentInLog(client.code, noticeTag, todayStr);
        if (daysUntil === 0) stats.sentTodayCount++;
        else if (daysUntil === 1) stats.sentTomorrowCount++;
        else if (daysUntil === 2) stats.sent2DaysCount++;
        else if (daysUntil === 3) stats.sent3DaysCount++;
      }
    }

    try {
      localStorage.setItem(STORAGE_LAST_RUN, JSON.stringify(stats));
    } catch {}

    return stats;
  } catch (err) {
    console.error('Erro inesperado em checkAndSendAutomaticExpiryNotices:', err);
    return stats;
  }
}
