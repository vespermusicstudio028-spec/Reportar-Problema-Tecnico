export interface ClientExpiryNoticeData {
  type: 'trial_expired' | 'trial_active' | 'today' | 'tomorrow' | 'in_2_days' | 'in_3_days';
  title: string;
  badge: string;
  badgeColor: string;
  glowColor: string;
  borderColor: string;
  bgGradient: string;
  description: string;
  expiryFormatted: string;
  daysRemaining: number | null;
  hoursRemaining?: number;
  minutesRemaining?: number;
  pixKey: string;
  whatsappMessage: string;
}

/**
 * Calcula os dados do aviso de vencimento para o cliente na tela inicial:
 * - Testes (ativo ou vencido)
 * - Vence Hoje (0 dias ou vencido recentemente)
 * - Vence Amanhã (1 dia)
 * - Vence em 2 Dias (2 dias)
 * - Vence em 3 Dias (3 dias)
 * Retorna null se não houver cliente ou se faltar mais de 3 dias para o vencimento.
 */
export function computeClientExpiryNotice(client: {
  name?: string;
  code?: string;
  plan?: string;
  expirationDate?: string;
  expiration_date?: string;
} | null | undefined): ClientExpiryNoticeData | null {
  if (!client || !client.code) return null;

  const plan = (client.plan || '').toLowerCase();
  const isTrial = plan === 'teste 3h' || plan.includes('teste');
  const expRaw = client.expirationDate || client.expiration_date;

  const now = new Date();

  // 1. CLIENTES DE TESTE (3 Horas)
  if (isTrial) {
    if (expRaw) {
      const expDate = new Date(expRaw);
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - now.getTime();
        if (diffMs <= 0) {
          // Teste venceu
          return {
            type: 'trial_expired',
            title: 'Seu Teste de 3 Horas Venceu!',
            badge: '⏱️ Teste Vencido',
            badgeColor: 'bg-rose-600/30 text-rose-300 border-rose-500/50',
            glowColor: 'shadow-rose-950/40',
            borderColor: 'border-rose-500/50',
            bgGradient: 'from-rose-950/45 via-[#16121c] to-[#0d1017]',
            description: 'O seu período de avaliação gratuita de 3 horas chegou ao fim. Gostou dos canais, filmes e séries? Contrate seu plano completo agora mesmo e continue assistindo sem interrupções!',
            expiryFormatted: `Venceu em ${expDate.toLocaleDateString('pt-BR')} às ${expDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            daysRemaining: -1,
            pixKey: 'thebestiptv10@gmail.com',
            whatsappMessage: `Olá! Fiz o teste grátis de 3 horas (Código: ${client.code}) e quero contratar o plano completo!`
          };
        } else {
          // Teste ativo (vencendo nas próximas horas)
          const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
          const hours = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          return {
            type: 'trial_active',
            title: 'Seu Teste Grátis de 3 Horas Está Ativo!',
            badge: '⏱️ Teste Ativo (3h)',
            badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
            glowColor: 'shadow-amber-950/35',
            borderColor: 'border-amber-500/50',
            bgGradient: 'from-amber-950/40 via-[#18141c] to-[#0d1017]',
            description: `Seu teste está liberado e expira hoje às ${expDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Aproveite e antecipe sua contratação para manter seu acesso contínuo!`,
            expiryFormatted: `Vence hoje às ${expDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (restam ${hours > 0 ? `${hours}h ` : ''}${mins}min)`,
            daysRemaining: 0,
            hoursRemaining: hours,
            minutesRemaining: mins,
            pixKey: 'thebestiptv10@gmail.com',
            whatsappMessage: `Olá! Estou usando o teste de 3h (Código: ${client.code}) e gostaria de antecipar minha contratação!`
          };
        }
      }
    }
    // Fallback para teste sem data
    return {
      type: 'trial_expired',
      title: 'Seu Teste de 3 Horas Venceu!',
      badge: '⏱️ Teste Vencido',
      badgeColor: 'bg-rose-600/30 text-rose-300 border-rose-500/50',
      glowColor: 'shadow-rose-950/40',
      borderColor: 'border-rose-500/50',
      bgGradient: 'from-rose-950/45 via-[#16121c] to-[#0d1017]',
      description: 'O seu período de avaliação de 3 horas foi finalizado. Contrate o plano completo agora para continuar assistindo com acesso total!',
      expiryFormatted: 'Período de 3h finalizado',
      daysRemaining: -1,
      pixKey: 'thebestiptv10@gmail.com',
      whatsappMessage: `Olá! Fiz o teste de 3h (Código: ${client.code}) e quero contratar o plano completo!`
    };
  }

  // 2. CLIENTES REGULARES COM DATA DE VENCIMENTO
  if (!expRaw) return null;

  const expDate = new Date(expRaw);
  if (isNaN(expDate.getTime())) return null;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate(), 0, 0, 0, 0);
  const diffDays = Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Vence hoje ou já venceu (diffDays <= 0)
    const isPast = diffDays < 0;
    return {
      type: 'today',
      title: isPast ? '🚨 Seu Plano de Streaming Venceu!' : '🚨 Seu Plano de Streaming Vence Hoje!',
      badge: isPast ? '🚨 Vencido' : '🚨 Vence Hoje',
      badgeColor: 'bg-red-600/30 text-red-300 border-red-500/50',
      glowColor: 'shadow-red-950/45',
      borderColor: 'border-red-500/50',
      bgGradient: 'from-red-950/50 via-[#181119] to-[#0d1017]',
      description: isPast
        ? 'Seu plano de streaming já venceu. Para continuar assistindo aos canais, filmes e séries sem bloqueio, envie seu pagamento Pix agora mesmo!'
        : 'Seu plano de streaming vence HOJE! Realize o pagamento pelo Pix abaixo para garantir que o seu sinal continue ativo sem interrupções.',
      expiryFormatted: isPast
        ? `Venceu em ${expDate.toLocaleDateString('pt-BR')}`
        : `Vence hoje, ${expDate.toLocaleDateString('pt-BR')}`,
      daysRemaining: diffDays,
      pixKey: 'thebestiptv10@gmail.com',
      whatsappMessage: `Olá! Meu plano vence hoje (Código: ${client.code}) e quero fazer o pagamento Pix para renovar.`
    };
  }

  if (diffDays === 1) {
    // Vence amanhã
    return {
      type: 'tomorrow',
      title: '⚠️ Seu Plano de Streaming Vence Amanhã!',
      badge: '⚠️ Vence Amanhã',
      badgeColor: 'bg-orange-600/30 text-orange-300 border-orange-500/50',
      glowColor: 'shadow-orange-950/40',
      borderColor: 'border-orange-500/50',
      bgGradient: 'from-orange-950/40 via-[#181318] to-[#0d1017]',
      description: 'Aviso preventivo: seu plano de streaming vence amanhã! Faça a renovação antecipada pelo Pix e garanta que sua programação continue sem nenhuma pausa.',
      expiryFormatted: `Vence amanhã, ${expDate.toLocaleDateString('pt-BR')}`,
      daysRemaining: 1,
      pixKey: 'thebestiptv10@gmail.com',
      whatsappMessage: `Olá! Meu plano vence amanhã (Código: ${client.code}) e quero renovar antecipadamente pelo Pix.`
    };
  }

  if (diffDays === 2) {
    // Vence em 2 dias
    return {
      type: 'in_2_days',
      title: '⏳ Seu Plano Vence em 2 Dias',
      badge: '⏳ Vence em 2 Dias',
      badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
      glowColor: 'shadow-amber-950/35',
      borderColor: 'border-amber-500/50',
      bgGradient: 'from-amber-950/40 via-[#17141b] to-[#0d1017]',
      description: 'Lembrete de vencimento: faltam apenas 2 dias para a renovação da sua assinatura. Aproveite a agilidade do Pix para renovar com praticidade!',
      expiryFormatted: `Vence em ${expDate.toLocaleDateString('pt-BR')} (restam 2 dias)`,
      daysRemaining: 2,
      pixKey: 'thebestiptv10@gmail.com',
      whatsappMessage: `Olá! Recebi o aviso de que meu plano vence em 2 dias (Código: ${client.code}) e quero renovar via Pix.`
    };
  }

  if (diffDays === 3) {
    // Vence em 3 dias
    return {
      type: 'in_3_days',
      title: '⏰ Seu Plano Vence em 3 Dias',
      badge: '⏰ Vence em 3 Dias',
      badgeColor: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50',
      glowColor: 'shadow-yellow-950/30',
      borderColor: 'border-yellow-500/40',
      bgGradient: 'from-yellow-950/35 via-[#16151c] to-[#0d1017]',
      description: 'Informamos que o seu plano de streaming vence em 3 dias. Realize sua renovação com antecedência para manter sua diversão 100% garantida!',
      expiryFormatted: `Vence em ${expDate.toLocaleDateString('pt-BR')} (restam 3 dias)`,
      daysRemaining: 3,
      pixKey: 'thebestiptv10@gmail.com',
      whatsappMessage: `Olá! Recebi o aviso de que meu plano vence em 3 dias (Código: ${client.code}) e gostaria de renovar via Pix.`
    };
  }

  // Mais de 3 dias: não exibe aviso na tela inicial
  return null;
}
