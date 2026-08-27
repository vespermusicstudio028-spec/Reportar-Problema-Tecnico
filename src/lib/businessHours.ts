export interface BusinessHoursStatus {
  isOnline: boolean;
  statusText: string;
  badgeColor: string;
  nextOpenText: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayHours: string;
  fullScheduleText: string;
}

/**
 * Retorna o status de funcionamento do suporte com base no horário de Brasília (UTC-3).
 * Horários:
 * - Segunda a Sexta: 09:00 às 21:00
 * - Sábado: 09:00 às 12:00 (Meio-dia)
 * - Domingo: Fechado / Ausente
 */
export function getSupportBusinessHoursStatus(): BusinessHoursStatus {
  const now = new Date();
  
  // Converter para o fuso de Brasília (America/Sao_Paulo)
  const brazilDateString = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const brazilDate = new Date(brazilDateString);
  
  const day = brazilDate.getDay(); // 0: Domingo, 1: Segunda, ..., 6: Sábado
  const hour = brazilDate.getHours();
  const minute = brazilDate.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const weekdayOpen = 9 * 60;   // 09:00 = 540 minutos
  const weekdayClose = 21 * 60; // 21:00 = 1260 minutos

  const satOpen = 9 * 60;       // 09:00 = 540 minutos
  const satClose = 12 * 60;     // 12:00 = 720 minutos

  let isOnline = false;
  let nextOpenText = 'Segunda-feira às 09:00';

  if (day >= 1 && day <= 5) {
    // Segunda a Sexta
    if (currentMinutes >= weekdayOpen && currentMinutes < weekdayClose) {
      isOnline = true;
    } else if (currentMinutes < weekdayOpen) {
      nextOpenText = 'Hoje às 09:00';
    } else {
      // Após as 21:00
      nextOpenText = day === 5 ? 'Amanhã (Sábado) às 09:00' : 'Amanhã às 09:00';
    }
  } else if (day === 6) {
    // Sábado
    if (currentMinutes >= satOpen && currentMinutes < satClose) {
      isOnline = true;
    } else if (currentMinutes < satOpen) {
      nextOpenText = 'Hoje às 09:00';
    } else {
      nextOpenText = 'Segunda-feira às 09:00';
    }
  } else {
    // Domingo
    nextOpenText = 'Segunda-feira às 09:00';
  }

  return {
    isOnline,
    statusText: isOnline ? 'Suporte Online' : 'Suporte Ausente (Fora do Horário)',
    badgeColor: isOnline ? 'emerald' : 'amber',
    nextOpenText,
    weekdayHours: 'Segunda a Sexta: 09:00 às 21:00',
    saturdayHours: 'Sábado: 09:00 às 12:00 (Meio-dia)',
    sundayHours: 'Domingos e Feriados: Fechado',
    fullScheduleText: 'Seg a Sex: 09:00 às 21:00 | Sáb: 09:00 às 12:00'
  };
}

/**
 * Mensagem padrão enviada automaticamente ao cliente quando o suporte estiver ausente.
 */
export function getAutomatedAbsenceMessage(clientName?: string): string {
  const nameGreeting = clientName ? `Olá, ${clientName}!` : 'Olá!';
  const status = getSupportBusinessHoursStatus();

  return `🤖 ${nameGreeting} Recebemos sua mensagem com sucesso!

⚠️ No momento nossa equipe de atendimento está **ausente** (fora do horário de funcionamento).

⏰ **Nosso Horário de Atendimento:**
• 🗓️ **Segunda a Sexta:** 09:00 às 21:00
• 🗓️ **Sábado:** 09:00 às 12:00 (Meio-dia)
• 🗓️ **Domingo:** Fechado

📌 Sua mensagem já está salva em nosso sistema. Responderemos assim que iniciarmos o expediente (${status.nextOpenText}).

💡 *Se o seu caso for urgente, deixe aqui registrado o aparelho que está usando e a descrição detalhada do problema.*`;
}
