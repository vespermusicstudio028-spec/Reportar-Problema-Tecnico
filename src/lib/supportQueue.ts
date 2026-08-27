// Gerenciamento da Fila de Espera do Suporte Técnico The Best IPTV

import { ChatMessage } from '../types/chat';

export interface QueueItem {
  client_code: string;
  client_name: string;
  first_unanswered_time: string;
  position: number; // 1, 2, 3...
  estimatedMinutes: number; // Ex: 4 min por cliente à frente
}

const MINUTES_PER_CLIENT = 4; // Estimativa média de 3 a 5 min por atendimento

/**
 * Calcula a lista ordenada de clientes na fila de espera.
 * Considera clientes que têm mensagens não respondidas pelo admin,
 * excluindo o cliente que está atualmente em atendimento ativo.
 */
export function calculateSupportQueue(
  messages: ChatMessage[],
  activeClientCode: string | null = null
): {
  queue: QueueItem[];
  activeClient: string | null;
} {
  // Mapear a primeira mensagem não respondida de cada cliente
  const clientLastMessages = new Map<string, {
    client_code: string;
    client_name: string;
    firstTime: string;
    lastMsgSender: 'client' | 'admin';
    hasUnread: boolean;
  }>();

  // Agrupar mensagens por cliente
  messages.forEach((msg) => {
    const existing = clientLastMessages.get(msg.client_code);
    if (!existing) {
      clientLastMessages.set(msg.client_code, {
        client_code: msg.client_code,
        client_name: msg.client_name || `Cliente (${msg.client_code})`,
        firstTime: msg.created_at,
        lastMsgSender: msg.sender,
        hasUnread: msg.sender === 'client' && !msg.read_by_admin
      });
    } else {
      existing.client_name = msg.client_name || existing.client_name;
      existing.lastMsgSender = msg.sender;
      if (msg.sender === 'client' && !msg.read_by_admin) {
        existing.hasUnread = true;
      } else if (msg.sender === 'admin') {
        existing.hasUnread = false;
      }
    }
  });

  // Filtrar quem está aguardando atendimento (última mensagem é do cliente ou tem não lidas)
  const waitingClients = Array.from(clientLastMessages.values())
    .filter((c) => c.lastMsgSender === 'client' || c.hasUnread);

  // Ordenar por ordem cronológica (quem chamou primeiro fica na frente)
  waitingClients.sort(
    (a, b) => new Date(a.firstTime).getTime() - new Date(b.firstTime).getTime()
  );

  // Se não houver activeClientCode definido, o primeiro da lista é o ativo
  const currentActive = activeClientCode || (waitingClients.length > 0 ? waitingClients[0].client_code : null);

  // A fila são os demais clientes aguardando
  const queueList: QueueItem[] = [];
  let pos = 1;

  waitingClients.forEach((item) => {
    if (item.client_code !== currentActive) {
      queueList.push({
        client_code: item.client_code,
        client_name: item.client_name,
        first_unanswered_time: item.firstTime,
        position: pos,
        estimatedMinutes: Math.max(3, pos * MINUTES_PER_CLIENT)
      });
      pos++;
    }
  });

  return {
    queue: queueList,
    activeClient: currentActive
  };
}

/**
 * Obtém os dados de posição e tempo estimado de um cliente específico na fila
 */
export function getClientQueueInfo(
  clientCode: string,
  messages: ChatMessage[],
  activeClientCode: string | null = null
): {
  isBeingServed: boolean;
  isInQueue: boolean;
  position: number;
  estimatedMinutes: number;
  totalInQueue: number;
} {
  const { queue, activeClient } = calculateSupportQueue(messages, activeClientCode);

  if (activeClient === clientCode) {
    return {
      isBeingServed: true,
      isInQueue: false,
      position: 0,
      estimatedMinutes: 0,
      totalInQueue: queue.length
    };
  }

  const queueEntry = queue.find((q) => q.client_code === clientCode);
  if (queueEntry) {
    return {
      isBeingServed: false,
      isInQueue: true,
      position: queueEntry.position,
      estimatedMinutes: queueEntry.estimatedMinutes,
      totalInQueue: queue.length
    };
  }

  return {
    isBeingServed: false,
    isInQueue: false,
    position: 0,
    estimatedMinutes: 0,
    totalInQueue: queue.length
  };
}

/**
 * Gera a mensagem automática informando que o cliente está na fila de espera com sua posição e tempo estimado
 */
export function getAutomatedQueueWaitMessage(
  clientName: string = 'Cliente',
  position: number = 1,
  estimatedMinutes: number = 5
): string {
  const tempoTexto = estimatedMinutes === 1 ? '1 minuto' : `${estimatedMinutes} minutos`;

  return `⏳ Olá, ${clientName}! 

No momento, nossa equipe de suporte está realizando um **atendimento exclusivo** com outro cliente.

📍 **Sua Posição na Fila:** ${position}º lugar
⏱️ **Tempo Estimado de Espera:** aproximadamente ${tempoTexto}

Por favor, aguarde alguns instantes aqui no chat. Assim que o atendente finalizar o chamado anterior, você será atendido prioritariamente por ordem de chegada!

*The Best IPTV - Atendimento ao Cliente*`;
}

/**
 * Gera mensagem quando o atendimento é iniciado / chega a vez do cliente
 */
export function getAutomatedTurnReachedMessage(clientName: string = 'Cliente'): string {
  return `🟢 **Olá, ${clientName}! Chegou a sua vez!**

Nosso suporte já finalizou o atendimento anterior e está pronto para te atender com total dedicação.

Como posso te ajudar agora? 😊`;
}

/**
 * Gera mensagem quando o atendimento é finalizado pelo admin
 */
export function getAutomatedFinishAttendanceMessage(clientName: string = 'Cliente'): string {
  return `✅ **Atendimento Finalizado com Sucesso!**

Olá, ${clientName}! Seu chamado de suporte foi encerrado pelo atendente.

Se precisar de qualquer outra ajuda, basta mandar uma nova mensagem aqui no chat a qualquer momento.

Desejamos uma ótima programação com a **The Best IPTV**! 🍿📺`;
}
