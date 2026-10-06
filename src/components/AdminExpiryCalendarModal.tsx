import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  MessageSquare,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Sparkles,
  CalendarCheck,
  ExternalLink,
  ShieldAlert,
  Flame,
  ArrowRight
} from 'lucide-react';

export interface CalendarClientItem {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  plan?: string;
  price?: number;
  expirationDate: string;
  category: 'ja_venceu' | 'hoje' | 'amanha' | '2dias' | '3dias' | 'vao_vencer';
  categoryLabel: string;
  badgeStyle: string;
  dotColor: string;
  diffDays: number;
  formattedDate: string;
  formattedTime: string;
  relativeText: string;
  dateObj: Date;
}

interface AdminExpiryCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{
    id: string;
    name: string;
    code: string;
    phone?: string;
    email?: string;
    plan?: string;
    price?: number;
    expirationDate?: string;
  }>;
  onOpenClientChat?: (clientCode: string) => void;
  onRenewClient?: (clientId: string, days?: number) => void;
}

type TabCategory = 'todos' | 'ja_venceu' | 'hoje' | 'amanha' | '2dias' | '3dias' | 'vao_vencer';

export function AdminExpiryCalendarModal({
  isOpen,
  onClose,
  clients,
  onOpenClientChat,
  onRenewClient
}: AdminExpiryCalendarModalProps) {
  const [activeTab, setActiveTab] = useState<TabCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null); // 'YYYY-MM-DD'
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Data atual local fixa para comparações de início e fim de dia
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  // Processa e categoriza todos os clientes
  const processedClients = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    const day2Start = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const day2End = new Date(todayEnd.getTime() + 2 * 24 * 60 * 60 * 1000);

    const day3Start = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    const day3End = new Date(todayEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

    const items: CalendarClientItem[] = [];

    for (const c of clients) {
      if (!c.expirationDate) continue;
      const exp = new Date(c.expirationDate);
      if (isNaN(exp.getTime())) continue;

      const formattedDate = exp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = exp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Cálculo de diferença em dias
      const diffMs = exp.getTime() - todayStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let category: CalendarClientItem['category'];
      let categoryLabel = '';
      let badgeStyle = '';
      let dotColor = '';
      let relativeText = '';

      if (exp < todayStart) {
        category = 'ja_venceu';
        categoryLabel = 'Já Venceu';
        badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
        dotColor = 'bg-rose-500';
        const pastDays = Math.abs(diffDays);
        relativeText = pastDays === 0 ? 'Venceu hoje de madrugada' : pastDays === 1 ? 'Venceu ontem' : `Venceu há ${pastDays} dias`;
      } else if (exp >= todayStart && exp <= todayEnd) {
        category = 'hoje';
        categoryLabel = 'Vence Hoje';
        badgeStyle = 'bg-red-600/30 text-red-200 border-red-500/60 font-black animate-pulse shadow-sm shadow-red-500/30';
        dotColor = 'bg-red-500 animate-ping';
        relativeText = `Vence HOJE às ${formattedTime}`;
      } else if (exp >= tomorrowStart && exp <= tomorrowEnd) {
        category = 'amanha';
        categoryLabel = 'Vence Amanhã';
        badgeStyle = 'bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold';
        dotColor = 'bg-orange-500';
        relativeText = `Vence amanhã às ${formattedTime}`;
      } else if (exp >= day2Start && exp <= day2End) {
        category = '2dias';
        categoryLabel = 'Vence em 2 dias';
        badgeStyle = 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold';
        dotColor = 'bg-amber-500';
        relativeText = `Vence em 2 dias (${formattedDate})`;
      } else if (exp >= day3Start && exp <= day3End) {
        category = '3dias';
        categoryLabel = 'Vence em 3 dias';
        badgeStyle = 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40 font-semibold';
        dotColor = 'bg-yellow-400';
        relativeText = `Vence em 3 dias (${formattedDate})`;
      } else {
        category = 'vao_vencer';
        categoryLabel = 'Vai Vencer';
        badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium';
        dotColor = 'bg-emerald-500';
        relativeText = `Vence em ${diffDays} dias (${formattedDate})`;
      }

      items.push({
        id: c.id,
        name: c.name,
        code: c.code,
        phone: c.phone,
        email: c.email,
        plan: c.plan,
        price: c.price,
        expirationDate: c.expirationDate,
        category,
        categoryLabel,
        badgeStyle,
        dotColor,
        diffDays,
        formattedDate,
        formattedTime,
        relativeText,
        dateObj: exp
      });
    }

    // Ordenação padrão: os mais urgentes (já vencidos e vencendo hoje) primeiro
    const priorityOrder: Record<CalendarClientItem['category'], number> = {
      hoje: 1,
      ja_venceu: 2,
      amanha: 3,
      '2dias': 4,
      '3dias': 5,
      vao_vencer: 6
    };

    return items.sort((a, b) => {
      const pDiff = priorityOrder[a.category] - priorityOrder[b.category];
      if (pDiff !== 0) return pDiff;
      return a.dateObj.getTime() - b.dateObj.getTime();
    });
  }, [clients]);

  // Contadores por categoria
  const counts = useMemo(() => {
    return {
      todos: processedClients.length,
      ja_venceu: processedClients.filter(c => c.category === 'ja_venceu').length,
      hoje: processedClients.filter(c => c.category === 'hoje').length,
      amanha: processedClients.filter(c => c.category === 'amanha').length,
      '2dias': processedClients.filter(c => c.category === '2dias').length,
      '3dias': processedClients.filter(c => c.category === '3dias').length,
      vao_vencer: processedClients.filter(c => c.category === 'vao_vencer').length,
    };
  }, [processedClients]);

  // Mapa de datas 'YYYY-MM-DD' -> array de clientes para preencher o calendário
  const dateToClientsMap = useMemo(() => {
    const map = new Map<string, CalendarClientItem[]>();
    for (const item of processedClients) {
      const d = item.dateObj;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [processedClients]);

  // Filtra clientes de acordo com aba ativa, busca e seleção de data no calendário
  const filteredClients = useMemo(() => {
    return processedClients.filter(item => {
      // Filtro por data selecionada no calendário (se houver)
      if (selectedCalendarDate) {
        const d = item.dateObj;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key !== selectedCalendarDate) return false;
      } else {
        // Se nenhuma data pontual estiver selecionada, respeita a aba
        if (activeTab !== 'todos' && item.category !== activeTab) {
          return false;
        }
      }

      // Filtro por busca de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesPhone = item.phone ? item.phone.toLowerCase().includes(q) : false;
        const matchesPlan = item.plan ? item.plan.toLowerCase().includes(q) : false;
        return matchesName || matchesCode || matchesPhone || matchesPlan;
      }

      return true;
    });
  }, [processedClients, activeTab, selectedCalendarDate, searchQuery]);

  // Navegação do calendário
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedCalendarDate(todayStr);
  };

  // Matriz de dias para o calendário do mês atual
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      day: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      clientCount: number;
      items: CalendarClientItem[];
    }> = [];

    // Preenche dias do mês anterior
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = dateToClientsMap.get(dateKey) || [];
      days.push({
        day: d,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        clientCount: items.length,
        items
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = dateToClientsMap.get(dateKey) || [];
      days.push({
        day: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        clientCount: items.length,
        items
      });
    }

    // Completa a grade com dias do próximo mês (múltiplo de 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const dateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const items = dateToClientsMap.get(dateKey) || [];
        days.push({
          day: d,
          dateKey,
          isCurrentMonth: false,
          isToday: dateKey === todayStr,
          clientCount: items.length,
          items
        });
      }
    }

    return days;
  }, [currentMonthDate, dateToClientsMap, todayStr]);

  const monthYearLabel = useMemo(() => {
    return currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentMonthDate]);

  // Monta link do WhatsApp com mensagem pronta personalizada
  const getWhatsAppLink = (client: CalendarClientItem) => {
    if (!client.phone) return null;
    const cleanPhone = client.phone.replace(/\D/g, '');
    if (!cleanPhone) return null;

    let message = '';
    const planName = client.plan || 'Sinal de TV e Streaming';

    switch (client.category) {
      case 'ja_venceu':
        message = `Olá, ${client.name}! Tudo bem?\n\nIdentificamos que o seu acesso (${planName}) venceu em ${client.formattedDate}.\n\nGostaria de renovar seu sinal para continuar assistindo todos os canais, filmes e séries sem interrupções?`;
        break;
      case 'hoje':
        message = `Olá, ${client.name}! Tudo bem?\n\nPassando para lembrar que o seu acesso (${planName}) *vence HOJE* (${client.formattedDate} às ${client.formattedTime}).\n\nFale conosco para renovar com tranquilidade e evitar bloqueio no seu sinal!`;
        break;
      case 'amanha':
        message = `Olá, ${client.name}! Tudo bem?\n\nLembrete de renovação: o seu acesso (${planName}) *vence AMANHÃ* (${client.formattedDate}).\n\nPodemos já renovar o seu sinal para você não ficar sem sua programação?`;
        break;
      case '2dias':
      case '3dias':
        message = `Olá, ${client.name}! Tudo bem?\n\nLembramos que o seu acesso (${planName}) vence em ${client.diffDays} dias (${client.formattedDate}).\n\nSe preferir adiantar sua renovação, basta nos responder aqui!`;
        break;
      default:
        message = `Olá, ${client.name}! Tudo bem?\n\nSeu acesso (${planName}) está ativo com vencimento previsto para ${client.formattedDate}.\n\nQualquer dúvida ou suporte que precisar, estamos à disposição!`;
        break;
    }

    return `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0b0e16] border border-slate-800/90 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100 relative my-auto"
        >
          {/* TOPO / HEADER */}
          <div className="px-5 sm:px-7 py-4.5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/40 via-[#0e121d] to-[#0b0e16] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
                <CalendarIcon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Calendário de Vencimentos
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {processedClients.length} cadastrados com data
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Controle completo: clientes vencidos, vencendo hoje, amanhã, em 2 e 3 dias e futuros
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/80 shrink-0 shadow-sm"
              title="Fechar (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* BARRA DE FILTROS / ABAS RÁPIDAS COM CONTADORES */}
          <div className="px-5 sm:px-7 py-3 bg-[#0e121c] border-b border-slate-800/70 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
            {[
              { id: 'todos' as TabCategory, label: 'Todos com Vencimento', count: counts.todos, icon: <CalendarCheck size={14} />, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
              { id: 'ja_venceu' as TabCategory, label: 'Já Venceram', count: counts.ja_venceu, icon: <AlertTriangle size={14} />, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', badge: 'bg-rose-500' },
              { id: 'hoje' as TabCategory, label: 'Vence Hoje', count: counts.hoje, icon: <Flame size={14} />, color: 'bg-red-500/25 text-red-300 border-red-500/50', badge: 'bg-red-500 animate-pulse' },
              { id: 'amanha' as TabCategory, label: 'Vence Amanhã', count: counts.amanha, icon: <Clock size={14} />, color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', badge: 'bg-orange-500' },
              { id: '2dias' as TabCategory, label: 'Vence em 2 dias', count: counts['2dias'], icon: <Clock size={14} />, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', badge: 'bg-amber-500' },
              { id: '3dias' as TabCategory, label: 'Vence em 3 dias', count: counts['3dias'], icon: <Clock size={14} />, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', badge: 'bg-yellow-400' },
              { id: 'vao_vencer' as TabCategory, label: 'Vão Vencer (Futuro)', count: counts.vao_vencer, icon: <CheckCircle2 size={14} />, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', badge: 'bg-emerald-500' },
            ].map(tab => {
              const isActive = activeTab === tab.id && !selectedCalendarDate;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedCalendarDate(null); // limpa data pontual ao clicar em aba
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CORPO PRINCIPAL COM GRID: CALENDÁRIO À ESQUERDA + LISTA À DIREITA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
            {/* COLUNA ESQUERDA: CALENDÁRIO MENSAL INTERATIVO (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-[#101420] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
                {/* Header do Mês e Navegação */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                      title="Mês anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm sm:text-base font-bold text-white capitalize">
                      {monthYearLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                      title="Próximo mês"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Botão de atalho para Hoje */}
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Ir para a data de hoje"
                  >
                    <Sparkles size={13} className="text-indigo-400" />
                    <span>Hoje</span>
                  </button>
                </div>

                {/* Dias da Semana */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, idx) => (
                    <div
                      key={dia}
                      className={`text-[11px] font-bold uppercase py-1 ${
                        idx === 0 || idx === 6 ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Grade dos Dias do Mês */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((item) => {
                    const isSelected = selectedCalendarDate === item.dateKey;
                    const hasClients = item.clientCount > 0;

                    // Cor do indicador baseado nos clientes do dia
                    let indicatorBg = 'bg-indigo-500';
                    if (item.items.some(c => c.category === 'hoje')) {
                      indicatorBg = 'bg-red-500 animate-pulse';
                    } else if (item.items.some(c => c.category === 'ja_venceu')) {
                      indicatorBg = 'bg-rose-500';
                    } else if (item.items.some(c => c.category === 'amanha')) {
                      indicatorBg = 'bg-orange-500';
                    } else if (item.items.some(c => c.category === '2dias' || c.category === '3dias')) {
                      indicatorBg = 'bg-amber-400';
                    } else if (item.items.some(c => c.category === 'vao_vencer')) {
                      indicatorBg = 'bg-emerald-500';
                    }

                    return (
                      <button
                        key={item.dateKey}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCalendarDate(null);
                          } else {
                            setSelectedCalendarDate(item.dateKey);
                          }
                        }}
                        className={`relative min-h-[52px] sm:min-h-[58px] p-1 rounded-xl transition-all duration-200 flex flex-col justify-between items-center text-left border ${
                          isSelected
                            ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400 shadow-lg shadow-indigo-600/30'
                            : item.isToday
                            ? 'bg-indigo-950/80 border-indigo-500/80 ring-2 ring-indigo-500/90 shadow-md shadow-indigo-500/20'
                            : item.isCurrentMonth
                            ? 'bg-[#151a28]/70 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                            : 'bg-slate-900/20 border-slate-900/40 text-slate-600 opacity-40'
                        }`}
                        title={
                          item.isToday
                            ? `Hoje (${item.dateKey}) - ${item.clientCount} cliente(s) vencendo`
                            : `${item.dateKey} - ${item.clientCount} cliente(s) vencendo`
                        }
                      >
                        {/* Marcação no Topo: Badge de HOJE */}
                        <div className="w-full flex items-center justify-between px-1">
                          <span
                            className={`text-xs font-bold leading-none ${
                              item.isToday
                                ? 'text-indigo-300 font-black'
                                : isSelected
                                ? 'text-white font-extrabold'
                                : item.isCurrentMonth
                                ? 'text-slate-200'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.day}
                          </span>

                          {item.isToday && (
                            <span className="text-[9px] font-black uppercase tracking-tight px-1 py-0.2 rounded bg-indigo-500 text-white shadow-sm">
                              Hoje
                            </span>
                          )}
                        </div>

                        {/* Indicador de clientes que vencem neste dia */}
                        {hasClients ? (
                          <div className="w-full flex items-center justify-center mt-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white flex items-center gap-1 shadow-sm ${indicatorBg}`}
                            >
                              <span>{item.clientCount}</span>
                              <span className="hidden sm:inline text-[9px] opacity-90">venc</span>
                            </span>
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* LEGENDA DO CALENDÁRIO */}
                <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-400"></span>
                    <span className="text-indigo-300 font-semibold">📍 Data de Hoje</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Vencido</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>Hoje</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>Amanhã</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Futuro</span>
                  </div>
                </div>
              </div>

              {/* CARD DE RESUMO / ALERTA DO DIA ATUAL */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-[#101420] border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <CalendarCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Hoje é dia {today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {counts.hoje > 0 ? (
                        <span className="text-red-400 font-bold">
                          ⚡ {counts.hoje} cliente(s) vencendo hoje!
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          Nenhum cliente vencendo na data de hoje.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {counts.hoje > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('hoje');
                      setSelectedCalendarDate(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-bold transition-all shrink-0 active:scale-95"
                  >
                    Ver Hoje
                  </button>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: LISTA DE CLIENTES + BUSCA + DETALHES (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col space-y-3.5">
              {/* Barra de Busca e Controle de Filtro de Data */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código, WhatsApp ou plano..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#101420] border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9.5 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Banner de Data Selecionada no Calendário */}
                {selectedCalendarDate && (
                  <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/40 px-3 py-1.5 rounded-xl shrink-0">
                    <span className="text-xs text-indigo-300 font-bold">
                      Filtrando dia:{' '}
                      {new Date(selectedCalendarDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate(null)}
                      className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-indigo-900/50"
                      title="Limpar filtro de data"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Cabeçalho da Lista com contagem */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Exibindo <strong className="text-white">{filteredClients.length}</strong> cliente(s)
                  {activeTab !== 'todos' && !selectedCalendarDate && (
                    <span> na categoria <strong className="text-indigo-400">{activeTab}</strong></span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Horário: horário de Brasília
                </span>
              </div>

              {/* Lista Scrollável de Clientes */}
              <div className="space-y-2.5 overflow-y-auto max-h-[58vh] pr-1 custom-scrollbar">
                {filteredClients.length === 0 ? (
                  <div className="py-12 px-4 rounded-2xl bg-[#101420] border border-slate-800/80 text-center space-y-3">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto opacity-80" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Nenhum cliente encontrado</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {searchQuery
                          ? 'Nenhum resultado corresponde à sua pesquisa de busca.'
                          : selectedCalendarDate
                          ? 'Nenhum cliente vence na data selecionada.'
                          : 'Nenhum cliente nesta categoria de vencimento no momento.'}
                      </p>
                    </div>
                    {(searchQuery || selectedCalendarDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCalendarDate(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const waLink = getWhatsAppLink(client);
                    const isCodeCopied = copiedCode === client.code;

                    return (
                      <div
                        key={client.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-[#111522]/90 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-md"
                      >
                        {/* Informações Principais */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                              {client.name}
                            </span>

                            {/* Código do Cliente com Copiar */}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(client.code)}
                              className="text-[11px] font-mono text-slate-300 bg-slate-800/90 hover:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-700/60 flex items-center gap-1 transition-colors active:scale-95"
                              title="Copiar código do cliente"
                            >
                              {isCodeCopied ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span className="text-emerald-300">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} className="text-slate-400" />
                                  <span>{client.code}</span>
                                </>
                              )}
                            </button>

                            {/* Plano */}
                            {client.plan && (
                              <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                {client.plan}
                              </span>
                            )}
                          </div>

                          {/* Data de Vencimento e Status */}
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className={`px-2 py-0.5 rounded-md border text-[11px] ${client.badgeStyle}`}>
                              {client.categoryLabel}
                            </span>

                            <span className="text-slate-300 font-medium flex items-center gap-1 font-mono text-[11px]">
                              <Clock size={12} className="text-slate-400" />
                              {client.relativeText}
                            </span>

                            {client.phone && (
                              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                                <Phone size={11} className="text-slate-500" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ações Rápidas */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* Botão de WhatsApp */}
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                              title="Cobrar / Lembrar via WhatsApp com mensagem personalizada"
                            >
                              <Phone size={13} className="text-emerald-400" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}

                          {/* Botão de Renovar +30d */}
                          {onRenewClient && (
                            <button
                              type="button"
                              onClick={() => onRenewClient(client.id, 30)}
                              className="px-3 py-2 bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-sm flex items-center gap-1"
                              title={`Renovar ${client.name} por +30 dias`}
                            >
                              <span>+30 dias</span>
                            </button>
                          )}

                          {/* Botão de Abrir Chat Admin */}
                          {onOpenClientChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenClientChat(client.code);
                                onClose();
                              }}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                              title={`Abrir central de atendimento com ${client.name}`}
                            >
                              <MessageSquare size={13} />
                              <span className="hidden sm:inline">Chat</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RODAPÉ DO MODAL */}
          <div className="px-5 sm:px-7 py-3.5 border-t border-slate-800/80 bg-[#0c0f18] flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] sm:text-xs">
                Sincronizado em tempo real com sua base de clientes
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-colors text-xs border border-slate-700/80"
            >
              Fechar Calendário
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
