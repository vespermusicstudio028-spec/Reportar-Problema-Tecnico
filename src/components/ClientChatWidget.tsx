import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/chat';
import { getSupportBusinessHoursStatus, getAutomatedAbsenceMessage } from '../lib/businessHours';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  CheckCheck, 
  Headphones, 
  User, 
  Key,
  ChevronDown,
  ExternalLink,
  Tv,
  Clock,
  Info,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Paperclip,
  FileText,
  RefreshCcw,
  Smartphone,
  Radio
} from 'lucide-react';
import { PixPdfCard } from './PixPdfCard';
import { PixUploadModal } from './PixUploadModal';
import { isPixPdfMessage, parsePixPdfMessage, getAutomatedPixReceivedMessage } from '../lib/pixUtils';
import { getClientQueueInfo, getAutomatedQueueWaitMessage } from '../lib/supportQueue';
import { renderFormattedChatMessageText, extractPaymentLink, PaymentLinkCard } from '../lib/chatFormat';

export interface AccessPointScreen {
  screenNumber: number;
  appName?: string;
  appIcon?: string;
  authType?: 'mac' | 'login';
  macAddress?: string;
  deviceKey?: string;
  username?: string;
  password?: string;
  expiresAt?: string;
  isLifetime?: boolean;
}

interface ClientChatWidgetProps {
  clientCode?: string;
  clientName?: string;
  canvasLink?: string;
  clientPlan?: string;
  clientPrice?: number;
  accessPoints?: AccessPointScreen[];
  onOpenCodeLogin?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
  onSelectCanal?: () => void;
  onPedirConteudo?: () => void;
}

export const ClientChatWidget: React.FC<ClientChatWidgetProps> = ({
  clientCode,
  clientName,
  canvasLink,
  clientPlan,
  clientPrice,
  accessPoints,
  onOpenCodeLogin,
  isOpenExternal,
  onCloseExternal,
  onSelectCanal,
  onPedirConteudo
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tempCodeInput, setTempCodeInput] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);
  const [showPixUploadModal, setShowPixUploadModal] = useState(false);
  const [businessStatus, setBusinessStatus] = useState(getSupportBusinessHoursStatus());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Atualizar status do horário periodicamente a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setBusinessStatus(getSupportBusinessHoursStatus());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar estado externo se fornecido
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const activeCode = clientCode || localStorage.getItem('iptv_access_code_v1') || '';

  // Buscar mensagens do cliente ativo
  const fetchMessages = async () => {
    if (!activeCode) {
      setMessages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_code', activeCode)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data as ChatMessage[]);
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens do chat do cliente:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!activeCode) return;

    // Escutar novas mensagens em tempo real para o código deste cliente
    const channel = supabase
      .channel(`client-chat-${activeCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_code=eq.${activeCode}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCode]);

  // Rolar para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Marcar mensagens do admin como lidas pelo cliente quando o chat está aberto
  useEffect(() => {
    if (!isOpen || !activeCode) return;

    const unreadMessages = messages.filter((m) => m.sender === 'admin' && !m.read_by_client);
    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m.id);
      supabase
        .from('chat_messages')
        .update({ read_by_client: true })
        .in('id', unreadIds)
        .then(({ error }) => {
          if (error) console.error('Erro ao marcar mensagens como lidas pelo cliente:', error);
        });
    }
  }, [isOpen, messages, activeCode]);

  // Contagem de mensagens não lidas enviadas pelo admin
  const unreadCount = messages.filter((m) => m.sender === 'admin' && !m.read_by_client).length;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeCode || isSending) return;

    setIsSending(true);
    try {
      const currentClientDisplayName = clientName || customClientName || 'Cliente';
      const { error } = await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: currentClientDisplayName,
        sender: 'client',
        message: text,
        read_by_admin: false,
        read_by_client: true
      });

      if (error) throw error;
      setInputText('');

      // Verificar se estamos fora do horário de atendimento para disparar a resposta automática de ausência
      const currentStatus = getSupportBusinessHoursStatus();
      if (!currentStatus.isOnline) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const alreadySentAbsence = messages.some(
          (m) =>
            m.sender === 'admin' &&
            m.message.includes('fora do horário de funcionamento') &&
            new Date(m.created_at).getTime() > oneHourAgo
        );

        if (!alreadySentAbsence) {
          setTimeout(async () => {
            try {
              await supabase.from('chat_messages').insert({
                client_code: activeCode,
                client_name: 'Suporte The Best IPTV+',
                sender: 'admin',
                message: getAutomatedAbsenceMessage(currentClientDisplayName),
                read_by_admin: true,
                read_by_client: false
              });
            } catch (autoErr) {
              console.error('Erro ao disparar mensagem de ausência automática:', autoErr);
            }
          }, 800);
        }
      } else {
        // Se estiver online, verificar se há outros clientes sendo atendidos para enviar mensagem de fila de espera
        try {
          const { data: recentMsgs } = await supabase
            .from('chat_messages')
            .select('*')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });

          if (recentMsgs && recentMsgs.length > 0) {
            const queueInfo = getClientQueueInfo(activeCode, recentMsgs as ChatMessage[]);
            if (queueInfo.isInQueue && queueInfo.position > 0) {
              const twentyMinAgo = Date.now() - 20 * 60 * 1000;
              const alreadySentQueue = messages.some(
                (m) =>
                  m.sender === 'admin' &&
                  m.message.includes('Sua Posição na Fila:') &&
                  new Date(m.created_at).getTime() > twentyMinAgo
              );

              if (!alreadySentQueue) {
                setTimeout(async () => {
                  try {
                    await supabase.from('chat_messages').insert({
                      client_code: activeCode,
                      client_name: 'Suporte The Best IPTV+',
                      sender: 'admin',
                      message: getAutomatedQueueWaitMessage(
                        currentClientDisplayName,
                        queueInfo.position,
                        queueInfo.estimatedMinutes
                      ),
                      read_by_admin: true,
                      read_by_client: false
                    });
                  } catch (qErr) {
                    console.error('Erro ao enviar mensagem de fila de espera:', qErr);
                  }
                }, 800);
              }
            }
          }
        } catch (queueCheckErr) {
          console.error('Erro ao verificar fila de espera:', queueCheckErr);
        }
      }
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPixAttachment = async (payloadString: string, fileName: string) => {
    if (!activeCode) return;
    const currentClientDisplayName = clientName || customClientName || 'Cliente';

    // 1. Enviar mensagem com o anexo do comprovante Pix como cliente
    const { error } = await supabase.from('chat_messages').insert({
      client_code: activeCode,
      client_name: currentClientDisplayName,
      sender: 'client',
      message: payloadString,
      read_by_admin: false,
      read_by_client: true
    });

    if (error) throw error;

    // 2. Disparar imediatamente a resposta automática do bot confirmando o recebimento do Pix
    setTimeout(async () => {
      try {
        await supabase.from('chat_messages').insert({
          client_code: activeCode,
          client_name: 'Suporte The Best IPTV+',
          sender: 'admin',
          message: getAutomatedPixReceivedMessage(currentClientDisplayName),
          read_by_admin: true,
          read_by_client: false
        });
      } catch (autoErr) {
        console.error('Erro ao enviar confirmação automática de Pix:', autoErr);
      }
    }, 600);
  };

  // Iniciar fluxo de renovação pelo botão de atalho rápido
  const handleInitiateRenewal = async () => {
    if (!activeCode || isSending) return;
    setIsSending(true);
    try {
      const currentClientDisplayName = clientName || customClientName || 'Cliente';
      const screensCount = (accessPoints && accessPoints.length > 0) ? accessPoints.length : 1;

      // 1. Enviar mensagem do cliente solicitando renovação
      const clientMsg = screensCount > 1
        ? `🔄 Gostaria de renovar os meus *${screensCount} pontos (telas)*.`
        : '🔄 Gostaria de fazer uma renovação.';

      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: currentClientDisplayName,
        sender: 'client',
        message: clientMsg,
        read_by_admin: false,
        read_by_client: true
      });

      // 2. Disparar resposta automática do bot com as opções
      setTimeout(async () => {
        try {
          await supabase.from('chat_messages').insert({
            client_code: activeCode,
            client_name: 'Suporte The Best IPTV+',
            sender: 'admin',
            message: '🤖 *Central de Renovações:*\nQual renovação você deseja realizar?\n\n👉 Selecione uma das opções abaixo:',
            read_by_admin: true,
            read_by_client: false
          });
        } catch (botErr) {
          console.error('Erro ao enviar opções de renovação:', botErr);
        }
      }, 500);
    } catch (err) {
      console.error('Erro ao iniciar renovação:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Selecionar opção de renovação (Sinal ou Aplicativo)
  const handleSelectRenewalOption = async (option: 'sinal' | 'app') => {
    if (!activeCode || isSending) return;
    setIsSending(true);
    try {
      const currentClientDisplayName = clientName || customClientName || 'Cliente';
      const isSinal = option === 'sinal';

      // Buscar pontos de acesso atualizados do cliente se necessário
      let currentScreens = accessPoints;
      if (!currentScreens || currentScreens.length === 0) {
        try {
          const { data: cliData } = await supabase
            .from('clients')
            .select('access_points, plan, price')
            .eq('code', activeCode)
            .maybeSingle();

          if (cliData?.access_points) {
            currentScreens = Array.isArray(cliData.access_points) 
              ? cliData.access_points 
              : JSON.parse(cliData.access_points);
          }
        } catch (e) {
          console.error('Erro ao buscar telas do cliente:', e);
        }
      }

      const validScreens: AccessPointScreen[] = (currentScreens && currentScreens.length > 0)
        ? (currentScreens as AccessPointScreen[])
        : [{
            screenNumber: 1,
            appName: 'NEW HYBRID',
            authType: 'mac' as const,
            macAddress: '',
            deviceKey: '',
            username: '',
            password: '',
            expiresAt: '',
            isLifetime: false
          }];

      const screensCount = validScreens.length;

      const clientMsg = isSinal
        ? (screensCount > 1 
            ? `📡 *Renovação:* Gostaria de renovar o *Sinal do Streaming* para os meus *${screensCount} pontos (telas)*.`
            : '📡 *Renovação:* Gostaria de renovar o *Sinal do Streaming* (Lista de Canais, Filmes e Séries).')
        : '📱 *Renovação:* Gostaria de renovar a licença/ativação do *Aplicativo*.';

      // 1. Enviar escolha do cliente
      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: currentClientDisplayName,
        sender: 'client',
        message: clientMsg,
        read_by_admin: false,
        read_by_client: true
      });

      // 2. Determinar link de pagamento com base no plano do cliente
      let payLink = '';
      let payLabel = '';
      let payValue = '';

      if (isSinal) {
        // Usar o plano cadastrado pelo admin
        if (clientPrice === 70) {
          payLink = 'https://mpago.la/1ZESpNJ';
          payLabel = 'Pagar R$ 70,00 via Mercado Pago';
          payValue = 'R$ 70,00';
        } else if (clientPrice === 35) {
          payLink = 'https://mpago.la/2UJjaQb';
          payLabel = 'Pagar R$ 35,00 via Mercado Pago';
          payValue = 'R$ 35,00';
        } else {
          // Padrão: R$ 40,00
          payLink = 'https://mpago.la/1FqmoD4';
          payLabel = 'Pagar R$ 40,00 via Mercado Pago';
          payValue = clientPrice ? `R$ ${Number(clientPrice).toFixed(2).replace('.', ',')}` : 'R$ 40,00';
        }
      } else {
        // Renovação do Aplicativo
        payLink = 'https://mpago.la/31zU6D3';
        payLabel = 'Pagar Renovação do Aplicativo';
        payValue = 'Ver valor no link';
      }

      const paymentMarker = `[PAYMENT_LINK:${payLink}|||${payLabel}|||${payValue}]`;

      // 3. Montar resumo detalhado das telas / pontos de acesso
      let screensInfoText = '';
      if (screensCount === 1) {
        const s = validScreens[0];
        const authDetails = s.authType === 'login'
          ? (s.username ? `\n• *Usuário:* ${s.username}${s.password ? ` | *Senha:* ${s.password}` : ''}` : '')
          : (s.macAddress ? `\n• *Endereço MAC:* \`${s.macAddress}\`` : '');
        const keyDetails = s.deviceKey ? `\n• *Device Key:* ${s.deviceKey}` : '';
        const expDetails = s.isLifetime 
          ? '\n• *Validade do Ponto:* Vitalício 🌟' 
          : (s.expiresAt ? `\n• *Expira em:* ${new Date(s.expiresAt).toLocaleDateString('pt-BR')}` : '');

        screensInfoText = `📱 *Informações do seu Ponto de Acesso (1 Tela):*\n• *Aplicativo:* ${s.appName || 'NEW HYBRID'}${authDetails}${keyDetails}${expDetails}`;
      } else {
        const screensList = validScreens.map((s: AccessPointScreen) => {
          const authDetails = s.authType === 'login'
            ? (s.username ? ` | Usuário: ${s.username}${s.password ? ` (Senha: ${s.password})` : ''}` : '')
            : (s.macAddress ? ` | MAC: \`${s.macAddress}\`` : '');
          const keyDetails = s.deviceKey ? ` | Key: ${s.deviceKey}` : '';
          const expDetails = s.isLifetime 
            ? ' | Vitalício 🌟' 
            : (s.expiresAt ? ` | Exp: ${new Date(s.expiresAt).toLocaleDateString('pt-BR')}` : '');
          return `🔹 *Tela ${s.screenNumber}:* ${s.appName || 'NEW HYBRID'}${authDetails}${keyDetails}${expDetails}`;
        }).join('\n');

        screensInfoText = `📱 *Informações dos seus Pontos de Acesso (${screensCount} Telas):*\n${screensList}`;
      }

      // 4. Resposta do bot com informações completas e link de pagamento
      setTimeout(async () => {
        try {
          const botConfirm = isSinal
            ? `✅ Certo! Sua solicitação de renovação do *Sinal do Streaming* (${screensCount > 1 ? `*${screensCount} Telas/Pontos*` : '*1 Tela/Ponto*'}) foi registrada. O administrador já foi notificado!\n\n${screensInfoText}\n\n💳 *Forma de Pagamento — Mercado Pago:*\nClique no botão abaixo para realizar o pagamento de forma rápida e segura:\n\n${paymentMarker}\n\n📎 Após o pagamento, anexe o comprovante usando o botão de clipe.`
            : `✅ Certo! Sua solicitação de renovação do *Aplicativo* foi registrada. O administrador já foi notificado!\n\n💳 *Forma de Pagamento — Mercado Pago:*\nClique no botão abaixo para pagar a renovação do aplicativo:\n\n${paymentMarker}\n\n📎 Após o pagamento, envie uma foto ou o código/MAC do seu aplicativo.`;

          await supabase.from('chat_messages').insert({
            client_code: activeCode,
            client_name: 'Suporte The Best IPTV+',
            sender: 'admin',
            message: botConfirm,
            read_by_admin: true,
            read_by_client: false
          });
        } catch (botErr) {
          console.error('Erro ao enviar confirmação de renovação:', botErr);
        }
      }, 600);
    } catch (err) {
      console.error('Erro ao selecionar opção de renovação:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseExternal) {
      onCloseExternal();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Status da fila para este cliente
  const queueStatus = React.useMemo(() => {
    if (!activeCode || messages.length === 0) return { isBeingServed: false, isInQueue: false, position: 0, estimatedMinutes: 0 };
    return getClientQueueInfo(activeCode, messages);
  }, [activeCode, messages]);

  // Verificar se o chat atual está finalizado
  const isChatFinished = React.useMemo(() => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.sender === 'admin' && (
      lastMsg.message.includes('Chat Finalizado') || 
      lastMsg.message.includes('Atendimento Finalizado')
    );
  }, [messages]);

  return (
    <>
      {/* Botão Flutuante no Canto Inferior Direito */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3.5 md:p-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-600/50 border border-white/20 flex items-center justify-center group"
          title="Falar com o Suporte / Administrador"
        >
          <div className="relative">
            <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 px-1 bg-red-500 text-[11px] font-bold text-white rounded-full flex items-center justify-center animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
            {/* Ponto indicador de status de atendimento */}
            <span 
              className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-[#0e121a] ${
                businessStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
              title={businessStatus.statusText}
            />
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold font-sans ml-0 group-hover:ml-2">
            Chat Suporte
          </span>
        </motion.button>
      )}

      {/* Janela de Chat em TELA CHEIA Completa Sem Bordas */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#090c13] rounded-none border-none shadow-none flex flex-col overflow-hidden text-slate-100 font-sans"
          >
            {/* Header da Janela em Tela Cheia */}
            <div className="w-full bg-gradient-to-r from-indigo-950 via-[#121622] to-[#090c13] border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex flex-col gap-2 shrink-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center"
                    title="Voltar / Fechar Chat"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
                      <Headphones size={22} />
                    </div>
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#090c13] ${
                        businessStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    ></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2 leading-tight">
                      Suporte The Best IPTV+
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                        businessStatus.isOnline ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${businessStatus.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                        {businessStatus.statusText}
                      </span>
                      {activeCode && (
                        <span className="text-xs font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                          Código: {activeCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão de Informações de Horários */}
                  <button
                    type="button"
                    onClick={() => setShowScheduleInfo(!showScheduleInfo)}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all border ${
                      showScheduleInfo 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' 
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                    }`}
                    title="Ver Horários de Funcionamento"
                  >
                    <Clock size={15} />
                    <span className="hidden sm:inline">Horários</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 md:px-3.5 md:py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 flex items-center gap-1.5 transition-all text-xs font-bold"
                    title="Fechar Chat"
                  >
                    <X size={18} />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
              </div>

              {/* Barra Resumo de Horários no Topo */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock size={14} className={businessStatus.isOnline ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-slate-400 font-medium">Expediente:</span>
                  <span className="text-slate-100 font-semibold">Segunda a Sexta: 09:00 às 21:00 | Sábado: 09:00 às 12:00</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleInfo(!showScheduleInfo)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium ml-2 shrink-0"
                >
                  {showScheduleInfo ? 'Ocultar quadro' : 'Ver quadro completo'}
                </button>
              </div>

              {/* Painel Expansível de Detalhes dos Horários */}
              <AnimatePresence>
                {showScheduleInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-[#111522] border border-indigo-500/30 rounded-2xl text-xs space-y-2.5 text-slate-200 shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <span className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-400" />
                          Quadro Oficial de Horários de Atendimento:
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          businessStatus.isOnline 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {businessStatus.isOnline ? '🟢 Aberto Agora' : '🟡 Ausente Agora'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col gap-1">
                          <span className="text-slate-400 font-medium">Segunda a Sexta</span>
                          <span className="font-bold text-white text-sm">09:00 às 21:00</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col gap-1">
                          <span className="text-slate-400 font-medium">Sábado</span>
                          <span className="font-bold text-white text-sm">09:00 às 12:00 (Meio-dia)</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 flex flex-col gap-1">
                          <span className="text-amber-400 font-medium">Domingo / Feriados</span>
                          <span className="font-bold text-amber-300 text-sm">Fechado</span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5">
                        <Info size={14} className="text-indigo-400 shrink-0" />
                        <span>
                          {businessStatus.isOnline 
                            ? 'Nossa equipe está online para responder suas dúvidas e solicitações.' 
                            : `Suporte ausente no momento. Retorno previsto: ${businessStatus.nextOpenText}. Todas as mensagens enviadas agora ficam salvas no sistema e são respondidas assim que iniciamos.`
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Banner de Fila de Espera em Tempo Real */}
            {businessStatus.isOnline && queueStatus.isInQueue && !isChatFinished && (
              <div className="bg-gradient-to-r from-amber-950/80 via-orange-950/70 to-amber-950/80 border-b border-amber-500/40 px-4 md:px-8 py-2.5 flex items-center justify-between gap-3 text-amber-200 text-xs shrink-0 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="font-bold text-amber-300">Fila de Espera: </span>
                    <span className="font-semibold text-white">Você está em {queueStatus.position}º lugar</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 shrink-0 font-bold">
                  ⏱️ Tempo estimado: ~{queueStatus.estimatedMinutes} min
                </span>
              </div>
            )}

            {/* Banner de Chat Finalizado */}
            {isChatFinished && (
              <div className="bg-[#101420] border-b border-slate-700/60 px-4 md:px-8 py-2 flex items-center justify-between gap-3 text-slate-300 text-xs shrink-0 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>🔒 <strong>Chat Finalizado:</strong> Atendimento concluído. Se precisar de mais ajuda, basta enviar uma nova mensagem!</span>
                </div>
              </div>
            )}

            {/* Conteúdo do Chat em Tela Cheia */}
            {!activeCode ? (
              /* Caso o cliente ainda não tenha inserido o código */
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={38} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-white text-xl">Identifique-se para conversar</h4>
                  <p className="text-sm text-slate-400">
                    Para falar com o administrador, faça login com seu código de acesso ou utilize seu código de cliente.
                  </p>
                </div>

                <div className="w-full space-y-3 pt-3">
                  {onOpenCodeLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenCodeLogin();
                      }}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Key size={17} /> Digitar Meu Código de Acesso
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Interface de Conversa em Tempo Real */
              <div className="flex-1 flex flex-col overflow-hidden max-w-5xl w-full mx-auto">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[#080b11]/80">
                  {/* Aviso de Suporte Ausente (caso esteja fora do horário) */}
                  {!businessStatus.isOnline && (
                    <div className="p-3.5 md:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs md:text-sm flex items-start gap-3 shadow-lg">
                      <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-300">
                          Suporte Ausente no Momento
                        </p>
                        <p className="text-amber-200/90 leading-relaxed text-xs md:text-sm">
                          Nosso atendimento funciona de <strong>Segunda a Sexta (09:00 às 21:00)</strong> e aos <strong>Sábados (09:00 às 12:00)</strong>.
                          Você pode enviar sua mensagem agora mesmo e responderemos assim que retornarmos ({businessStatus.nextOpenText})!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mensagem de Boas-vindas do Suporte */}
                  <div className="flex items-start gap-2.5 max-w-[90%] md:max-w-[75%]">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 border border-indigo-500/40">
                      ADM
                    </div>
                    <div className="p-4 rounded-2xl bg-[#151926] border border-slate-800 text-slate-200 text-xs md:text-sm leading-relaxed rounded-tl-none shadow-md">
                      <p>
                        Olá <strong>{clientName || 'Cliente'}</strong>! 👋 {businessStatus.isOnline ? 'Como posso te ajudar hoje? Digite sua mensagem abaixo que responderei o mais breve possível.' : 'Nosso atendimento funciona de Seg a Sex (09h às 21h) e Sábado (09h às 12h). Deixe sua mensagem abaixo que responderemos assim que iniciarmos o expediente!'}
                      </p>
                      <span className="block text-[10px] text-slate-500 text-right mt-1.5">
                        {businessStatus.isOnline ? 'Atendimento ao Vivo' : 'Atendimento Offline'}
                      </span>
                    </div>
                  </div>

                  {messages.map((msg) => {
                    const isClient = msg.sender === 'client';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[90%] md:max-w-[75%]`}>
                          {!isClient && (
                            <div className="w-8 h-8 rounded-full bg-indigo-600/40 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 border border-indigo-500/40">
                              ADM
                            </div>
                          )}

                          <div
                            className={`p-3.5 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed break-words ${
                              isClient
                                ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/15'
                                : msg.message.includes('🤖') || msg.message.includes('fora do horário') || msg.message.includes('Comprovante de Pagamento Pix') || msg.message.includes('PAGAMENTO PIX')
                                ? 'bg-[#1b1e2c] border border-emerald-500/30 text-slate-100 rounded-bl-none shadow-md'
                                : 'bg-[#171b28] border border-slate-700/80 text-slate-100 rounded-bl-none shadow-md'
                            }`}
                          >
                            {isPixPdfMessage(msg.message) ? (
                              <PixPdfCard
                                payload={parsePixPdfMessage(msg.message)!}
                                isClientSender={isClient}
                              />
                            ) : (
                              <>
                                <div className="break-words">
                                  {renderFormattedChatMessageText(msg.message, isClient)}
                                </div>

                                {/* Card de Pagamento Mercado Pago */}
                                {!isClient && (() => {
                                  const payData = extractPaymentLink(msg.message);
                                  return payData ? (
                                    <PaymentLinkCard
                                      url={payData.url}
                                      label={payData.label}
                                      value={payData.value}
                                    />
                                  ) : null;
                                })()}
                                
                                {/* Opções interativas de Renovação */}
                                {!isClient && msg.message.includes('Central de Renovações') && (
                                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectRenewalOption('sinal')}
                                      disabled={isSending}
                                      className="w-full p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-blue-600/35 to-indigo-600/25 hover:from-blue-600/50 hover:to-indigo-600/40 border border-blue-500/50 text-left transition-all active:scale-[0.98] flex items-center justify-between gap-2 text-white group shadow-md"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
                                          <Radio size={16} />
                                        </div>
                                        <div>
                                          <span className="font-bold text-xs sm:text-sm block text-blue-200 group-hover:text-white">📡 Sinal do Streaming</span>
                                          <span className="text-[10px] sm:text-xs text-blue-300/80">Canais, Filmes e Séries</span>
                                        </div>
                                      </div>
                                      <span className="text-xs font-bold text-blue-300 group-hover:translate-x-1 transition-transform">Escolher →</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSelectRenewalOption('app')}
                                      disabled={isSending}
                                      className="w-full p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-emerald-600/35 to-teal-600/25 hover:from-emerald-600/50 hover:to-teal-600/40 border border-emerald-500/50 text-left transition-all active:scale-[0.98] flex items-center justify-between gap-2 text-white group shadow-md"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                                          <Smartphone size={16} />
                                        </div>
                                        <div>
                                          <span className="font-bold text-xs sm:text-sm block text-emerald-200 group-hover:text-white">📱 Aplicativo</span>
                                          <span className="text-[10px] sm:text-xs text-emerald-300/80">Ativação / Licença do App</span>
                                        </div>
                                      </div>
                                      <span className="text-xs font-bold text-emerald-300 group-hover:translate-x-1 transition-transform">Escolher →</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                                isClient ? 'text-indigo-200/80' : 'text-slate-500'
                              }`}
                            >
                              <span>{formatTime(msg.created_at)}</span>
                              {isClient && (
                                <CheckCheck
                                  size={13}
                                  className={msg.read_by_admin ? 'text-emerald-300' : 'text-indigo-200/80'}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Sugestões Rápidas de Tópicos (Responsivas) */}
                <div className="p-3 bg-[#0d1017] border-t border-slate-800/80 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      Atalhos Rápidos:
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Clique para enviar rapidamente</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Atalho 1: Renovar */}
                    <button
                      type="button"
                      onClick={handleInitiateRenewal}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1.5 bg-gradient-to-r from-amber-600/35 to-orange-600/25 hover:from-amber-600/50 hover:to-orange-600/40 text-amber-200 border border-amber-500/60 font-bold"
                      title="Solicitar renovação de sinal ou aplicativo"
                    >
                      <span className="truncate">
                        {accessPoints && accessPoints.length > 1
                          ? `🔄 Renovar os ${accessPoints.length} pontos`
                          : '🔄 Renovar'}
                      </span>
                      <RefreshCcw size={13} className="text-amber-300 shrink-0" />
                    </button>

                    {/* Atalho 2: Minha Área Exclusiva */}
                    <button
                      type="button"
                      onClick={() => {
                        const link = canvasLink || 'https://testetestettt.my.canva.site/sr-carlos';
                        window.open(link, '_blank');
                      }}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1.5 bg-gradient-to-r from-indigo-600/30 to-purple-600/20 hover:from-indigo-600/45 hover:to-purple-600/35 text-indigo-200 border border-indigo-500/50 font-bold"
                    >
                      <span className="truncate">🌐 Minha Área</span>
                      <ExternalLink size={13} className="text-indigo-300 shrink-0" />
                    </button>

                    {/* Atalho 3: O conteúdo não está carregando */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectCanal) {
                          onSelectCanal();
                          setIsOpen(false);
                        } else {
                          handleSendMessage('O conteúdo não está carregando.');
                        }
                      }}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1.5 bg-gradient-to-r from-sky-600/30 to-indigo-600/20 hover:from-sky-600/45 hover:to-indigo-600/35 text-sky-200 border border-sky-500/50 font-bold"
                    >
                      <span className="truncate">📺 Não carrega</span>
                      <Tv size={13} className="text-sky-300 shrink-0" />
                    </button>

                    {/* Atalho 4: Pedir Conteúdos */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onPedirConteudo) {
                          onPedirConteudo();
                          setIsOpen(false);
                        } else {
                          handleSendMessage('Gostaria de pedir um filme ou série.');
                        }
                      }}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1.5 bg-gradient-to-r from-pink-600/30 to-purple-600/20 hover:from-pink-600/45 hover:to-purple-600/35 text-pink-200 border border-pink-500/50 font-bold"
                    >
                      <span className="truncate">🎬 Pedir Conteúdo</span>
                    </button>

                    {/* Atalho 5: Enviar Comprovante Pix (PDF) */}
                    <button
                      type="button"
                      onClick={() => setShowPixUploadModal(true)}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/20 hover:from-emerald-600/45 hover:to-teal-600/35 text-emerald-200 border border-emerald-500/50 font-bold col-span-2 sm:col-span-1"
                    >
                      <span className="truncate">📄 Comprovante Pix</span>
                      <FileText size={13} className="text-emerald-300 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Campo de Envio com Botão de Anexo */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 md:p-4 bg-[#0a0d14] border-t border-slate-800/80 flex items-center gap-2 md:gap-2.5"
                >
                  {/* Botão de Anexar Comprovante PDF / Pix */}
                  <button
                    type="button"
                    onClick={() => setShowPixUploadModal(true)}
                    className="p-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/10"
                    title="Anexar Comprovante Pix (PDF)"
                  >
                    <Paperclip size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={businessStatus.isOnline ? "Digite sua mensagem para o suporte..." : "Suporte ausente. Deixe sua mensagem aqui..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-[#151926] border border-slate-700/80 text-white placeholder-slate-500 px-4 py-3 rounded-2xl text-xs md:text-sm focus:border-indigo-500 outline-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-3 md:px-5 md:py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 text-xs md:text-sm"
                  >
                    <Send size={16} />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Anexo de Comprovante Pix PDF */}
      <PixUploadModal
        isOpen={showPixUploadModal}
        onClose={() => setShowPixUploadModal(false)}
        onSendPixPayload={handleSendPixAttachment}
      />
    </>
  );
};
