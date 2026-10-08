import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, Copy, Check, MessageCircle, MessageSquare, X, Sparkles } from 'lucide-react';

export interface ClientExpiryNoticeData {
  type: 'trial_expired' | 'trial_active' | 'today' | 'tomorrow' | 'in_2_days' | 'in_3_days';
  title: string;
  badge: string;
  badgeColor: string;
  glowColor: string;
  borderColor: string;
  bgGradient: string;
  flyerUrl?: string;
  flyerAlt?: string;
  description: string;
  expiryFormatted: string;
  daysRemaining: number | null;
  hoursRemaining?: number;
  minutesRemaining?: number;
  pixKey: string;
  whatsappMessage: string;
}

interface ClientHomeExpiryCardProps {
  notice: ClientExpiryNoticeData;
  clientName: string;
  clientCode: string;
  onOpenChat: () => void;
  onClose?: () => void;
}

export const ClientHomeExpiryCard: React.FC<ClientHomeExpiryCardProps> = ({
  notice,
  clientName,
  clientCode,
  onOpenChat,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [copiedPix, setCopiedPix] = useState(false);

  const DURATION_MS = 5000;
  const INTERVAL_MS = 50;

  const isPausedRef = useRef(isPaused);
  const onCloseRef = useRef(onClose);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Timer decrescente de 5 segundos: ao completar, fecha e some da tela inicial
  useEffect(() => {
    setProgress(100);
    const step = (INTERVAL_MS / DURATION_MS) * 100;
    let done = false;

    const timer = setInterval(() => {
      if (done) return;
      if (isPausedRef.current) return;

      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          done = true;
          return 0;
        }
        return next;
      });
    }, INTERVAL_MS);

    const closedWatcher = setInterval(() => {
      if (done) {
        clearInterval(timer);
        clearInterval(closedWatcher);
        setIsVisible(false);
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    }, INTERVAL_MS);

    return () => {
      clearInterval(timer);
      clearInterval(closedWatcher);
    };
  }, []);

  const pixKey = notice.pixKey || 'thebestiptv10@gmail.com';
  const whatsappNumber = '5521959368651';

  const handleCopyPix = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    });
  };

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(notice.whatsappMessage);
    window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const isUrgent = notice.type === 'trial_expired' || notice.type === 'today';
  const secondsLeft = Math.max(1, Math.ceil((progress / 100) * 5));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className={`w-full rounded-3xl border ${notice.borderColor} bg-gradient-to-br ${notice.bgGradient} shadow-2xl ${notice.glowColor} overflow-hidden transition-all duration-300 relative`}
        >
          {/* Barra de Progresso Decrescente de 5 Segundos (some ao zerar) */}
          <div className="w-full h-1.5 bg-black/40 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-75 ${
                isUrgent
                  ? 'bg-gradient-to-r from-rose-500 to-red-500'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Cabeçalho do Card */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isUrgent
                    ? 'bg-rose-500/25 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/40'
                    : 'bg-amber-500/20 border-amber-500/35 text-amber-300 shadow-lg shadow-amber-950/30'
                }`}
              >
                {isUrgent ? (
                  <AlertTriangle size={20} className="animate-pulse" />
                ) : (
                  <Clock size={20} className="animate-pulse" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${notice.badgeColor}`}>
                    {notice.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                    Código: <strong className="text-white">{clientCode}</strong>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/5">
                    <Clock size={11} className={isPaused ? 'text-amber-400' : 'text-slate-400'} />
                    {isPaused ? 'Pausado' : `Some em ${secondsLeft}s`}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight leading-tight">
                  {notice.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-bold text-slate-300 block">{clientName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{notice.expiryFormatted}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar aviso agora"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Corpo: 100% Textual (sem foto), com destaque e ações rápidas */}
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
              {notice.description}
            </p>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs sm:text-sm flex-wrap">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Clock size={15} className="text-indigo-400" /> Data de Validade / Vencimento:
              </span>
              <span className={`font-bold font-mono text-sm ${isUrgent ? 'text-rose-300' : 'text-amber-300'}`}>
                {notice.expiryFormatted}
              </span>
            </div>

            {/* Box da Chave Pix com 1-Clique Copia */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/50 border border-emerald-500/35 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Chave Pix Oficial de Renovação
                </span>
                <span className="text-[11px] text-slate-400">Banco / Nubank</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-black/60 px-3.5 py-2.5 rounded-xl border border-white/10 font-mono text-xs sm:text-sm text-emerald-300 font-bold truncate select-all">
                  {pixKey}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer active:scale-95 ${
                    copiedPix
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 hover:text-white border border-emerald-500/40'
                  }`}
                  title="Copiar chave Pix"
                >
                  {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar Pix'}</span>
                </button>
              </div>
            </div>

            {/* Botões de Ação Imediata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenChat}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 border border-indigo-400/40"
              >
                <MessageSquare size={16} />
                <span>Enviar Comprovante no Chat</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 border border-emerald-400/40"
              >
                <MessageCircle size={16} />
                <span>Falar no WhatsApp Oficial</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Calcula os dados do aviso de vencimento para o cliente atual na tela inicial:
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
