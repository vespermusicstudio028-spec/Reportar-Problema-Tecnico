import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

export interface ExpiringClientItem {
  id: string;
  name: string;
  code: string;
  phone?: string;
  expirationDate: string;
  category: 'hoje' | 'amanha' | '2dias' | '3dias';
  categoryLabel: string;
  badgeStyle: string;
  formattedDate: string;
  formattedTime: string;
}

interface AdminExpiryAlertModalProps {
  clients: Array<{
    id: string;
    name: string;
    code: string;
    phone?: string;
    expirationDate?: string;
    plan?: string;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onOpenClientChat?: (clientCode: string) => void;
  onRenewClient?: (clientId: string, days?: number) => void;
}

export function AdminExpiryAlertModal({
  clients,
  isOpen,
  onClose,
  onOpenClientChat,
  onRenewClient
}: AdminExpiryAlertModalProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const DURATION_MS = 5000;
  const INTERVAL_MS = 50;

  // Filtra e classifica os clientes por vencimento estritamente dentro dos períodos: Hoje, Amanhã, 2 dias e 3 dias
  const expiringClients: ExpiringClientItem[] = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    const day2Start = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const day2End = new Date(todayEnd.getTime() + 2 * 24 * 60 * 60 * 1000);

    const day3Start = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    const day3End = new Date(todayEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

    const list: ExpiringClientItem[] = [];

    for (const c of clients) {
      if (!c.expirationDate) continue;
      const exp = new Date(c.expirationDate);
      if (isNaN(exp.getTime())) continue;

      // Só inclui se estiver estritamente dentro dos períodos: de hoje até no máximo 3 dias
      // Clientes vencidos em dias anteriores (passado) ou além de 3 dias NÃO entram
      if (exp < todayStart || exp > day3End) continue;

      const formattedDate = exp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const formattedTime = exp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const isTrial = c.plan === 'Teste 3h' || (c.plan && c.plan.toLowerCase().includes('teste'));

      if (exp >= todayStart && exp <= todayEnd) {
        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          phone: c.phone,
          expirationDate: c.expirationDate,
          category: 'hoje',
          categoryLabel: isTrial ? 'Vence Hoje (Teste 3h)' : 'Vence Hoje',
          badgeStyle: 'bg-rose-600/30 text-rose-200 border-rose-500/50 font-extrabold animate-pulse',
          formattedDate,
          formattedTime,
        });
      } else if (exp >= tomorrowStart && exp <= tomorrowEnd) {
        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          phone: c.phone,
          expirationDate: c.expirationDate,
          category: 'amanha',
          categoryLabel: 'Vence Amanhã',
          badgeStyle: 'bg-orange-500/25 text-orange-200 border-orange-500/40 font-bold',
          formattedDate,
          formattedTime,
        });
      } else if (exp >= day2Start && exp <= day2End) {
        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          phone: c.phone,
          expirationDate: c.expirationDate,
          category: '2dias',
          categoryLabel: 'Vence em 2 dias',
          badgeStyle: 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold',
          formattedDate,
          formattedTime,
        });
      } else if (exp >= day3Start && exp <= day3End) {
        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          phone: c.phone,
          expirationDate: c.expirationDate,
          category: '3dias',
          categoryLabel: 'Vence em 3 dias',
          badgeStyle: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40 font-semibold',
          formattedDate,
          formattedTime,
        });
      }
    }

    const priority: Record<string, number> = { hoje: 1, amanha: 2, '2dias': 3, '3dias': 4 };
    return list.sort((a, b) => priority[a.category] - priority[b.category]);
  }, [clients]);

  // Timer decrescente de 5 segundos
  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const step = (INTERVAL_MS / DURATION_MS) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - step;
        });
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, onClose]);

  // Se não estiver aberto ou não houver nenhum cliente vencendo nesses períodos específicos, não exibe nada
  if (!isOpen || expiringClients.length === 0) return null;

  const countHoje = expiringClients.filter(c => c.category === 'hoje').length;
  const countAmanha = expiringClients.filter(c => c.category === 'amanha').length;
  const count2Dias = expiringClients.filter(c => c.category === '2dias').length;
  const count3Dias = expiringClients.filter(c => c.category === '3dias').length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[120] w-[calc(100%-2rem)] sm:w-[460px] max-w-lg bg-[#0e121a]/95 backdrop-blur-2xl border border-amber-500/40 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-950/20 via-slate-900/40 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Aviso de Vencimentos
                {expiringClients.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    {expiringClients.length} cliente(s)
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Sinais de streaming com vencimento iminente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700 shrink-0"
            title="Fechar aviso (X)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumo Rápido de Prazos */}
        {expiringClients.length > 0 && (
          <div className="px-4 py-2.5 bg-[#141824] border-b border-slate-800/60 flex items-center gap-2 flex-wrap text-[11px]">
            {countHoje > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                Hoje: {countHoje}
              </span>
            )}
            {countAmanha > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold">
                Amanhã: {countAmanha}
              </span>
            )}
            {count2Dias > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                Em 2 dias: {count2Dias}
              </span>
            )}
            {count3Dias > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold">
                Em 3 dias: {count3Dias}
              </span>
            )}
          </div>
        )}

        {/* Lista de Clientes */}
        <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2">
          {expiringClients.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Todos os clientes em dia!</p>
              <p className="text-xs text-slate-400">
                Nenhum sinal vence hoje, amanhã ou nos próximos 3 dias.
              </p>
            </div>
          ) : (
            expiringClients.map((item) => (
              <div
                key={item.id}
                className="p-2.5 sm:p-3 rounded-2xl bg-[#141924]/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${item.badgeStyle}`}>
                      {item.categoryLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      {item.formattedDate} às {item.formattedTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onRenewClient && (
                    <button
                      type="button"
                      onClick={() => onRenewClient(item.id, 30)}
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-sm flex items-center gap-1"
                      title={`Renovar sinal de ${item.name} por +30 dias`}
                    >
                      <span>+30</span>
                    </button>
                  )}

                  {onOpenClientChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenClientChat(item.code);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                      title={`Abrir chat com ${item.name}`}
                    >
                      <MessageSquare size={13} />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé com Barra de Progresso de 5s */}
        <div className="h-1.5 w-full bg-slate-800/60 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
