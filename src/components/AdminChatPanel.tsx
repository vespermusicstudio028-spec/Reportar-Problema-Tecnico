import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatConversation } from '../types/chat';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  CheckCheck, 
  Clock, 
  Trash2, 
  Sparkles, 
  ExternalLink,
  Phone,
  MessageCircle,
  RefreshCw,
  Info,
  Copy,
  Check,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  Users,
  ImageIcon,
  Brain,
  ShoppingBag,
  Home,
  ArrowDown,
  Smartphone,
  Tv,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { PixPdfCard } from './PixPdfCard';
import { isPixPdfMessage, parsePixPdfMessage, getAutomatedPixConfirmedMessage } from '../lib/pixUtils';
import { 
  calculateSupportQueue, 
  getClientQueueInfo, 
  getAutomatedTurnReachedMessage, 
  getAutomatedFinishAttendanceMessage 
} from '../lib/supportQueue';
import { renderFormattedChatMessageText, extractPaymentLink, PaymentLinkCard } from '../lib/chatFormat';
import { TrialDataActionsCard, extractTrialRequestData } from './TrialDataActionsCard';
import { PhotoUploadModal, isSupportPhotosMessage, parseSupportPhotosMessage } from './PhotoUploadModal';
import { ExpiryNoticeCard, isExpiryNotice3DMessage, parseExpiryNotice3DMessage, ExpiryNoticePayload } from './ExpiryNoticeCard';
import { ClientMemoryModal } from './ClientMemoryModal';
import { AdminStoreManagerModal } from './AdminStoreManagerModal';
import {
  CustomShortcutsManagerModal,
  CustomShortcut,
  COLOR_THEMES,
  loadCustomShortcuts,
  buildCustomShortcutMessage,
  isCustomShortcutMessage,
  parseCustomShortcutMessage,
} from './CustomShortcutsManagerModal';
import {
  checkAndSendAutomaticExpiryNotices,
  autoProcessPaymentReceiptAndRenew,
  isExpiryNoticeMessage
} from '../lib/expiryAutomationService';

interface SlashCommandItem {
  id: string;
  command: string;
  aliases?: string[];
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: string;
  message?: string;
  isSpecialExpiryNotice?: boolean;
  action?: () => void;
}

interface AdminChatPanelProps {
  clientsList?: Array<{
    id: string;
    name: string;
    code: string;
    phone?: string;
    canvasLink?: string;
    activeApp?: string;
    accessPoints?: Array<{
      screenNumber?: number;
      appName?: string;
      authType?: 'mac' | 'login';
      macAddress?: string;
      deviceKey?: string;
      username?: string;
      password?: string;
      expiresAt?: string;
      isLifetime?: boolean;
    }>;
  }>;
  onRegisterStepBack?: (handler: (() => boolean) | null) => void;
  onCloseToHome?: () => void;
  initialClientCode?: string | null;
}

export const AdminChatPanel: React.FC<AdminChatPanelProps> = ({ clientsList = [], onRegisterStepBack, onCloseToHome, initialClientCode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem('tbi_cached_chat_messages');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [selectedClientCode, setSelectedClientCode] = useState<string | null>(initialClientCode || null);
  const [activeServingClientCode, setActiveServingClientCode] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem('tbi_cached_chat_messages');
    } catch { return true; }
  });
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialClientCode));
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [showCustomShortcutsManager, setShowCustomShortcutsManager] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState<CustomShortcut[]>(() => loadCustomShortcuts());
  const [clientToDelete, setClientToDelete] = useState<{ code: string; name: string } | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [holdingClientCode, setHoldingClientCode] = useState<string | null>(null);
  const [isAutoCheckingExpiry, setIsAutoCheckingExpiry] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const ignoreNextClickRef = useRef<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const selectedClientCodeRef = useRef<string | null>(null);
  const mobileShowChatRef = useRef(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Aplicar cliente inicial (vindo de aviso de vencimento ou tela de Clientes) sempre que mudar
  useEffect(() => {
    if (initialClientCode) {
      setSelectedClientCode(initialClientCode);
      setMobileShowChat(true);
    }
  }, [initialClientCode]);

  // Automação: Verificação e envio automático periódico de mensagens de vencimento
  // Os avisos são enviados somente a partir das 08:00h da manhã (forceManual=false respeita essa trava)
  useEffect(() => {
    // 1. Verificação inicial após 4 segundos ao abrir o painel
    const initialTimer = setTimeout(async () => {
      try {
        // forceManual=false → respeita horário 08:00h
        await checkAndSendAutomaticExpiryNotices(false);
      } catch (err) {
        console.error('Erro na verificação inicial de vencimentos:', err);
      }
    }, 4000);

    // 2. Verificação a cada 30 minutos em segundo plano (ainda respeitando o horário de 08:00h)
    const intervalTimer = setInterval(async () => {
      try {
        // forceManual=false → respeita horário 08:00h
        await checkAndSendAutomaticExpiryNotices(false);
      } catch (err) {
        console.error('Erro na verificação periódica de vencimentos:', err);
      }
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    selectedClientCodeRef.current = selectedClientCode;
  }, [selectedClientCode]);

  useEffect(() => {
    mobileShowChatRef.current = mobileShowChat;
  }, [mobileShowChat]);

  useEffect(() => {
    if (onRegisterStepBack) {
      onRegisterStepBack(() => {
        if (selectedClientCodeRef.current !== null || mobileShowChatRef.current) {
          setSelectedClientCode(null);
          setMobileShowChat(false);
          return true; // consumiu o voltar
        }
        return false; // está na lista de conversas raiz
      });
    }
    return () => {
      if (onRegisterStepBack) {
        onRegisterStepBack(null);
      }
    };
  }, [onRegisterStepBack]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  // Buscar todas as mensagens
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages((prev) => {
          if (prev.length === data.length && prev.length > 0) {
            const lastPrev = prev[prev.length - 1];
            const lastData = data[data.length - 1];
            if (
              lastPrev.id === lastData.id &&
              lastPrev.read_by_admin === lastData.read_by_admin &&
              lastPrev.read_by_client === lastData.read_by_client
            ) {
              return prev;
            }
          }
          return data as ChatMessage[];
        });
        try { localStorage.setItem('tbi_cached_chat_messages', JSON.stringify(data)); } catch {}
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens do chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Escutar novas mensagens em tempo real com injeção instantânea (0ms)
    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              // Evitar duplicar mensagem (otimista ou já recebida)
              const existingIdx = prev.findIndex(
                (m) => m.id === newMsg.id || 
                (m.id.startsWith('opt-') && m.sender === newMsg.sender && m.message === newMsg.message && m.client_code === newMsg.client_code)
              );
              let updated: ChatMessage[];
              if (existingIdx !== -1) {
                updated = [...prev];
                updated[existingIdx] = newMsg;
              } else {
                updated = [...prev, newMsg];
              }
              try {
                localStorage.setItem('tbi_cached_chat_messages', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedMsg = payload.new as ChatMessage;
            setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else {
            fetchMessages();
          }
        }
      )
      .subscribe();

    // Polling de segurança ultra rápido a cada 2.5s para garantir atualização contínua
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

    // Marcar mensagens do cliente selecionado como lidas pelo admin
  useEffect(() => {
    if (!selectedClientCode) return;

    const unreadMessages = messages.filter(
      (m) => m.client_code === selectedClientCode && m.sender === 'client' && !m.read_by_admin
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m.id);
      supabase
        .from('chat_messages')
        .update({ read_by_admin: true })
        .in('id', unreadIds)
        .then(({ error }) => {
          if (error) console.error('Erro ao marcar mensagens como lidas:', error);
        });
    }
  }, [selectedClientCode, messages]);

  // Agrupar mensagens por cliente para criar a lista de conversas
  const conversations: ChatConversation[] = React.useMemo(() => {
    const map = new Map<string, ChatConversation>();

    // Primeiro preencher com clientes que enviaram mensagens
    messages.forEach((msg) => {
      const clientInfo = clientsList.find((c) => c.code === msg.client_code);
      const name = msg.client_name || clientInfo?.name || `Cliente (${msg.client_code})`;

      const existing = map.get(msg.client_code);
      const isUnread = msg.sender === 'client' && !msg.read_by_admin;

      if (!existing) {
        map.set(msg.client_code, {
          client_code: msg.client_code,
          client_name: name,
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: isUnread ? 1 : 0,
          last_sender: msg.sender
        });
      } else {
        existing.last_message = msg.message;
        existing.last_message_time = msg.created_at;
        existing.last_sender = msg.sender;
        if (isUnread) {
          existing.unread_count += 1;
        }
      }
    });

    // Se houver um cliente selecionado que ainda não tem mensagens no chat, inclui ele para aparecer na lista
    if (selectedClientCode && !map.has(selectedClientCode)) {
      const clientInfo = clientsList.find((c) => c.code === selectedClientCode);
      const name = clientInfo?.name || `Cliente (${selectedClientCode})`;
      map.set(selectedClientCode, {
        client_code: selectedClientCode,
        client_name: name,
        last_message: 'Nenhuma mensagem ainda. Inicie o atendimento...',
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        last_sender: 'client'
      });
    }

    // Ordenar pelas conversas mais recentes
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
  }, [messages, clientsList, selectedClientCode]);

  // Se nenhuma conversa selecionada e houver conversas, seleciona a primeira automaticamente
  useEffect(() => {
    if (!selectedClientCode && conversations.length > 0) {
      setSelectedClientCode(conversations[0].client_code);
    }
  }, [conversations, selectedClientCode]);

  // Conversas filtradas pela busca
  const filteredConversations = conversations.filter(
    (c) =>
      c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mensagens do cliente selecionado
  const activeMessages = selectedClientCode
    ? messages.filter((m) => m.client_code === selectedClientCode)
    : [];

  // Rolar para o final de forma inteligente:
  // 1. Ao trocar de conversa: rola instantaneamente para o fim (duplo timeout: cache + async do servidor)
  // 2. Quando chega nova mensagem: SÓ rola se o usuário NÃO tiver rolado para cima para ler mensagens antigas
  const prevSelectedClientCodeRef = useRef<string | null>(null);
  const prevActiveMessagesCountRef = useRef<number>(0);

  useEffect(() => {
    const conversationChanged = prevSelectedClientCodeRef.current !== selectedClientCode;
    const countIncreased = activeMessages.length > prevActiveMessagesCountRef.current;

    prevSelectedClientCodeRef.current = selectedClientCode;
    prevActiveMessagesCountRef.current = activeMessages.length;

    if (conversationChanged) {
      // Ao trocar conversa: scroll em dois tempos para garantir DOM e mensagens async carregadas
      userScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 250);
    } else if (countIncreased && !userScrolledUpRef.current) {
      // Nova mensagem chegou enquanto o usuário estava na parte inferior
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, selectedClientCode]);

  const selectedClientInfo = clientsList.find((c) => c.code === selectedClientCode);
  const selectedConversation = conversations.find((c) => c.client_code === selectedClientCode);

  const activeClientName =
    selectedClientInfo?.name || selectedConversation?.client_name || `Cliente (${selectedClientCode})`;

  // Abrir site de renovação/ativação de aplicativo no AtiveApp
  const handleOpenRenovarAppSite = () => {
    // 1. Abrir imediatamente em nova aba
    window.open('https://www.ativeapp.com/index/hplus', '_blank', 'noopener,noreferrer');

    // 2. Extrair dados do cliente selecionado se houver (MAC e App)
    let macAddress = '';
    let appName = '';

    if (selectedClientInfo) {
      if (selectedClientInfo.accessPoints && selectedClientInfo.accessPoints.length > 0) {
        const first = selectedClientInfo.accessPoints[0];
        macAddress = first.macAddress || '';
        appName = first.appName || '';
      } else if (selectedClientInfo.activeApp) {
        appName = selectedClientInfo.activeApp;
      }
    }

    // Se o MAC não estiver no perfil, busca nas mensagens recentes deste cliente
    if (!macAddress && activeMessages.length > 0) {
      for (let i = activeMessages.length - 1; i >= 0; i--) {
        const msgText = activeMessages[i].message;
        const macMatch = msgText.match(/MAC:\s*`?([0-9a-fA-F:.-]{12,17})`?/i) || 
                         msgText.match(/([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/i);
        if (macMatch) {
          macAddress = macMatch[1] || macMatch[0];
          break;
        }
      }
    }

    // Copia o MAC para a área de transferência se existir
    if (macAddress) {
      try {
        navigator.clipboard.writeText(macAddress);
        alert(
          `🌐 Site AtiveApp aberto!\n\n📋 MAC do cliente copiado: ${macAddress}\n📱 Aplicativo: ${appName || 'Aplicativo'}\n\n🔑 Credenciais de Acesso:\n• Login: veraspatrick@gmail.com\n• Senha: #Ppem032212\n\nCole o MAC no campo do site e selecione a Licença Anual!`
        );
        return;
      } catch {}
    }

    alert(
      `🌐 Site AtiveApp aberto!\n\n🔑 Credenciais de Acesso:\n• Login: veraspatrick@gmail.com\n• Senha: #Ppem032212\n\n📌 Link: https://www.ativeapp.com/index/hplus`
    );
  };

  // Abrir painel para renovação de Streaming no painel.fun
  const handleOpenRenovarStreamingSite = () => {
    window.open('https://painel.fun/lock?redirect=%2Fusers', '_blank', 'noopener,noreferrer');

    // Se houver código do cliente, copia para a área de transferência
    if (selectedClientCode) {
      try {
        navigator.clipboard.writeText(selectedClientCode);
      } catch {}
    }
  };

  // Enviar resposta do administrador sem delay (feedback instantâneo)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || replyText).trim();
    if (!text || !selectedClientCode || isSending) return;

    setIsSending(true);
    setReplyText('');

    const optimisticAdminMsg: ChatMessage = {
      id: 'opt-admin-' + Date.now(),
      client_code: selectedClientCode,
      client_name: activeClientName,
      sender: 'admin',
      message: text,
      created_at: new Date().toISOString(),
      read_by_admin: true,
      read_by_client: false
    };
    setMessages((prev) => [...prev, optimisticAdminMsg]);
    // Reset scroll on admin message
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        client_code: selectedClientCode,
        client_name: activeClientName,
        sender: 'admin',
        message: text,
        read_by_admin: true,
        read_by_client: false
      });

      if (error) throw error;
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsSending(false);
    }
  };

  // Atalho: Enviar Aviso de Vencimento em 3 Dias com Imagem e Texto
  const handleSendExpiryNotice3Days = async () => {
    if (!selectedClientCode || isSending) return;
    const payload: ExpiryNoticePayload = {
      imageUrl: '/vence-em-3-dias.jpg',
      text: 'Bom dia! ☀️ Seu plano vence em *3 dias*.\n\nPor favor, realize o seu pagamento para *não perder o sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
      days: 3,
      pixKey: 'thebestiptv10@gmail.com',
      whatsapp: '5521959368651'
    };
    const messageString = `[AVISO_VENCIMENTO_3D]${JSON.stringify(payload)}[/AVISO_VENCIMENTO_3D]`;
    await handleSendMessage(messageString);
  };

  // Atalho: Enviar Aviso de Vencimento HOJE com Imagem Flyer e Texto
  const handleSendExpiryNoticeToday = async () => {
    if (!selectedClientCode || isSending) return;
    const payload: ExpiryNoticePayload = {
      imageUrl: '/vence-hoje.jpg',
      text: 'Bom dia! ☀️ Seu plano vence *HOJE*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
      days: 0,
      pixKey: 'thebestiptv10@gmail.com',
      whatsapp: '5521959368651'
    };
    const messageString = `[AVISO_VENCIMENTO_HOJE]${JSON.stringify(payload)}[/AVISO_VENCIMENTO_HOJE]`;
    await handleSendMessage(messageString);
  };

  // Atalho: Enviar Aviso de Vencimento AMANHÃ com Imagem Flyer e Texto
  const handleSendExpiryNoticeTomorrow = async () => {
    if (!selectedClientCode || isSending) return;
    const payload: ExpiryNoticePayload = {
      imageUrl: '/vence-amanha.png',
      text: 'Bom dia! ☀️ Seu plano vence *AMANHÃ*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
      days: 1,
      pixKey: 'thebestiptv10@gmail.com',
      whatsapp: '5521959368651'
    };
    const messageString = `[AVISO_VENCIMENTO_AMANHA]${JSON.stringify(payload)}[/AVISO_VENCIMENTO_AMANHA]`;
    await handleSendMessage(messageString);
  };

  // Atalho: Enviar Aviso de Vencimento em 2 DIAS com Imagem Flyer e Texto
  const handleSendExpiryNotice2Days = async () => {
    if (!selectedClientCode || isSending) return;
    const payload: ExpiryNoticePayload = {
      imageUrl: '/vence-em-2-dias.jpg',
      text: 'Bom dia! ☀️ Seu plano vence em *2 dias*!\n\nPor favor, realize o seu pagamento antes do vencimento para *não ficar sem sinal*!\nPara renovar seu acesso, basta clicar no botão *Renovar* abaixo:',
      days: 2,
      pixKey: 'thebestiptv10@gmail.com',
      whatsapp: '5521959368651'
    };
    const messageString = `[AVISO_VENCIMENTO_2D]${JSON.stringify(payload)}[/AVISO_VENCIMENTO_2D]`;
    await handleSendMessage(messageString);
  };

  // Atalho: Enviar Aviso de Teste de 3 Horas Vencido com Imagem Flyer e Texto
  const handleSendTestExpiredNotice = async () => {
    if (!selectedClientCode || isSending) return;
    const payload: ExpiryNoticePayload = {
      imageUrl: '/teste-3h-venceu.jpg',
      text: '☀️ Bom dia!\n\n⚠️ *AVISO IMPORTANTE*\nSeu teste de *3 HORAS JÁ VENCEU!*\n\nPara continuar aproveitando todos os nossos canais, filmes e séries, é necessário realizar a contratação do plano.\nQualquer dúvida, estamos à disposição!',
      days: -1,
      pixKey: 'thebestiptv10@gmail.com',
      whatsapp: '5521959368651'
    };
    const messageString = `[AVISO_TESTE_3H_VENCEU]${JSON.stringify(payload)}[/AVISO_TESTE_3H_VENCEU]`;
    await handleSendMessage(messageString);
  };

  // Confirmar e Reconhecer Pagamento Pix com 1 clique sem delay
  const handleConfirmPixPayment = async (clientCode: string, clientName: string) => {
    try {
      const confirmMsg = getAutomatedPixConfirmedMessage(clientName);
      const optimisticMsg: ChatMessage = {
        id: 'opt-pix-conf-' + Date.now(),
        client_code: clientCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: confirmMsg,
        created_at: new Date().toISOString(),
        read_by_admin: true,
        read_by_client: false
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { error } = await supabase.from('chat_messages').insert({
        client_code: clientCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: confirmMsg,
        read_by_admin: true,
        read_by_client: false
      });

      if (error) throw error;

      // Executa a baixa automática e renovação em +30 dias suspendendo cobranças deste ciclo
      try {
        await autoProcessPaymentReceiptAndRenew(clientCode, clientName);
      } catch (renewErr) {
        console.error('Erro na renovação automática via confirmação Pix:', renewErr);
      }
    } catch (err: any) {
      alert('Erro ao confirmar pagamento Pix: ' + (err.message || 'Erro desconhecido.'));
    }
  };

  // Disparo manual pelo botão do cabeçalho da automação de vencimento
  const handleManualRunExpiryCheck = async () => {
    setIsAutoCheckingExpiry(true);
    try {
      // forceManual=true: ignora a trava de 08:00h, admin pode disparar a qualquer hora
      const stats = await checkAndSendAutomaticExpiryNotices(true);
      const totalSent = stats.sentTodayCount + stats.sentTomorrowCount + stats.sent2DaysCount + stats.sent3DaysCount;
      if (totalSent > 0) {
        alert(`⚡ Automação de Vencimento:\n\n${totalSent} aviso(s) enviado(s) aos clientes com sucesso!\n• Vence Hoje: ${stats.sentTodayCount}\n• Vence Amanhã: ${stats.sentTomorrowCount}\n• Vence em 2 Dias: ${stats.sent2DaysCount}\n• Vence em 3 Dias: ${stats.sent3DaysCount}`);
      } else {
        alert('⚡ Automação de Vencimento:\n\nNenhum novo aviso precisou ser enviado no momento.\nTodos os clientes com vencimento próximo já receberam seus avisos ou estão em dia!');
      }
    } catch (e: any) {
      alert('Erro ao executar automação de vencimentos: ' + (e.message || 'Erro desconhecido.'));
    } finally {
      setIsAutoCheckingExpiry(false);
    }
  };

  // ─── Atalhos de Barra "/" no Chat (Slash Commands) ──────────────────────────
  const slashCommands: SlashCommandItem[] = React.useMemo(() => [
    {
      id: 'vence-hoje',
      command: '/hoje',
      aliases: ['/vencehoje', '/vencendo', '/vence-hoje', '/0dias', '/hojeaviso'],
      label: '🚨 Vence Hoje (com Imagem Flyer)',
      description: 'Envia o flyer visual oficial de VENCE HOJE, texto explicativo, chave Pix e botão de renovar',
      badge: 'Vence Hoje',
      badgeColor: 'bg-red-500/25 text-red-300 border border-red-500/50',
      icon: '🚨',
      action: () => handleSendExpiryNoticeToday(),
    },
    {
      id: 'teste-3h-venceu',
      command: '/teste3h',
      aliases: ['/testevenceu', '/3h', '/teste-venceu', '/3hvenceu', '/fimteste'],
      label: '⏱️ Teste de 3h Venceu (com Imagem Flyer)',
      description: 'Envia o flyer visual de TESTE DE 3 HORAS JÁ VENCEU, contratação de plano e chave Pix',
      badge: 'Teste 3h',
      badgeColor: 'bg-rose-500/25 text-rose-300 border border-rose-500/50',
      icon: '⏱️',
      action: () => handleSendTestExpiredNotice(),
    },
    {
      id: 'vence-amanha',
      command: '/amanha',
      aliases: ['/venceamanha', '/amanhã', '/vence-amanha', '/1dia', '/amanhaaviso'],
      label: '⚠️ Vence Amanhã (com Imagem Flyer)',
      description: 'Envia o flyer visual de VENCE AMANHÃ, texto explicativo, chave Pix e botão de renovar',
      badge: 'Vence Amanhã',
      badgeColor: 'bg-orange-500/25 text-orange-300 border border-orange-500/50',
      icon: '⚠️',
      action: () => handleSendExpiryNoticeTomorrow(),
    },
    {
      id: 'vence-2-dias',
      command: '/2dias',
      aliases: ['/vence2dias', '/vence2', '/2dia', '/aviso2dias'],
      label: '⏳ Vence em 2 Dias (com Imagem Flyer)',
      description: 'Envia o flyer visual de VENCE EM 2 DIAS, texto explicativo, chave Pix e botão de renovar',
      badge: 'Vence 2 Dias',
      badgeColor: 'bg-amber-600/25 text-amber-300 border border-amber-600/50',
      icon: '⏳',
      action: () => handleSendExpiryNotice2Days(),
    },
    {
      id: 'vence-3-dias',
      command: '/vence',
      aliases: ['/3dias', '/vencimento', '/aviso', '/expirar', '/flyer'],
      label: '⏰ Vence em 3 Dias (com Imagem Flyer)',
      description: 'Envia o flyer visual completo de 3 dias, texto explicativo, chave Pix e botão de renovar',
      badge: 'Vence 3 Dias',
      badgeColor: 'bg-amber-500/25 text-amber-300 border border-amber-500/50',
      icon: '⏰',
      isSpecialExpiryNotice: true,
    },
    {
      id: 'ola',
      command: '/ola',
      aliases: ['/oi', '/bomdia', '/boatarde', '/boanoite', '/saudacao'],
      label: 'Olá! Tudo bem? Como posso te ajudar hoje? 😊',
      description: 'Saudação cordial inicial de atendimento',
      badge: 'Saudação',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
      icon: '👋',
      message: 'Olá! Tudo bem? Como posso te ajudar hoje? 😊',
    },
    {
      id: 'recebi',
      command: '/recebi',
      aliases: ['/aguarde', '/verificando', '/analise'],
      label: 'Recebi sua mensagem...',
      description: 'Recebi sua mensagem. Já estou verificando para você!',
      badge: 'Aguarde',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      icon: '⏳',
      message: 'Recebi sua mensagem. Já estou verificando para você!',
    },
    {
      id: 'sinal-atualizado',
      command: '/sinal',
      aliases: ['/atualizado', '/liberado', '/teste-novamente'],
      label: 'Sinal atualizado ✅',
      description: 'Seu sinal/acesso foi atualizado. Poderia testar novamente?',
      badge: 'Atualizado',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      icon: '✅',
      message: 'Seu sinal/acesso foi atualizado. Poderia testar novamente?',
    },
    {
      id: 'qual-aparelho',
      command: '/aparelho',
      aliases: ['/dispositivo', '/tv', '/tvbox'],
      label: 'Qual aparelho?',
      description: 'Poderia me informar qual aparelho você está utilizando (TV, TV Box, Celular)?',
      badge: 'Aparelho',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      icon: '📺',
      message: 'Poderia me informar qual aparelho você está utilizando (TV, TV Box, Celular)?',
    },
    {
      id: 'teste-iniciado',
      command: '/teste',
      aliases: ['/3h', '/testegratis', '/liberar-teste'],
      label: '🧪 Teste iniciado',
      description: 'Teste gratuito de 3h iniciado! Feche e abra o aplicativo novamente para atualizar o acesso.',
      badge: 'Teste 3h',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      icon: '🧪',
      message: 'Teste gratuito de 3h iniciado! Feche e abra o aplicativo novamente para atualizar o acesso.',
    },
    {
      id: 'tudo-funcionando',
      command: '/pronto',
      aliases: ['/sucesso', '/ok', '/100%', '/finalizar'],
      label: 'Tudo funcionando 🚀',
      description: 'Tudo pronto e funcionando 100%! Qualquer dúvida estou à disposição. 🚀',
      badge: 'Concluído',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      icon: '🚀',
      message: 'Tudo pronto e funcionando 100%! Qualquer dúvida estou à disposição. 🚀',
    },
    {
      id: 'pix-dados',
      command: '/pix',
      aliases: ['/pagamento', '/chave', '/chavepix'],
      label: '🔑 Enviar Chave Pix (E-mail)',
      description: 'thebestiptv10@gmail.com com orientações para envio do comprovante',
      badge: 'Pagamento',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      icon: '🔑',
      message: '🔑 *Chave Pix (E-mail):* `thebestiptv10@gmail.com`\n\nPor favor, após realizar a transferência, nos envie o comprovante por aqui para agilizarmos a sua liberação! ✅',
    },
    {
      id: 'renovar-app',
      command: '/app',
      aliases: ['/ativeapp', '/licenca'],
      label: '📱 Renovar App no AtiveApp',
      description: 'Abre o site AtiveApp com credenciais e MAC do cliente copiados',
      badge: 'Atalho Web',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      icon: '📱',
      action: handleOpenRenovarAppSite,
    },
    {
      id: 'renovar-streaming',
      command: '/streaming',
      aliases: ['/painel', '/painelfun', '/sinal-painel'],
      label: '📺 Renovar Streaming no Painel.fun',
      description: 'Abre o painel oficial para renovar o sinal de streaming',
      badge: 'Atalho Web',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      icon: '📺',
      action: handleOpenRenovarStreamingSite,
    },
  ], [handleOpenRenovarAppSite, handleOpenRenovarStreamingSite]);

  // Atalhos personalizados convertidos para SlashCommandItem
  const customSlashItems: SlashCommandItem[] = React.useMemo(() =>
    customShortcuts.map((s) => ({
      id: `custom-${s.id}`,
      command: s.command,
      label: `${s.icon} ${s.label}`,
      description: s.description || (s.mediaType !== 'none' ? `Atalho com ${s.mediaType === 'image' ? 'imagem' : 'video'}` : 'Atalho personalizado'),
      badge: s.mediaType === 'image' ? 'Imagem' : s.mediaType === 'video' ? 'Video' : 'Texto',
      badgeColor: COLOR_THEMES[s.colorTheme].badge,
      icon: s.icon,
      action: () => handleSendMessage(buildCustomShortcutMessage(s)),
    })),
  [customShortcuts]);

  const isSlashTriggered = replyText.startsWith('/');
  const slashQuery = isSlashTriggered ? replyText.slice(1).trim().toLowerCase() : '';

  const allSlashCommands = React.useMemo(
    () => [...slashCommands, ...customSlashItems],
    [slashCommands, customSlashItems]
  );

  const filteredSlashCommands = React.useMemo(() => {
    if (!isSlashTriggered) return [];
    if (!slashQuery) return allSlashCommands;
    return allSlashCommands.filter((cmd) => {
      const matchCmd = cmd.command.toLowerCase().includes(slashQuery);
      const matchLabel = cmd.label.toLowerCase().includes(slashQuery);
      const matchDesc = cmd.description.toLowerCase().includes(slashQuery);
      const matchAlias = cmd.aliases?.some((a) => a.toLowerCase().includes(slashQuery));
      return matchCmd || matchLabel || matchDesc || matchAlias;
    });
  }, [isSlashTriggered, slashQuery, allSlashCommands]);

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [slashQuery]);

  const handleExecuteSlashCommand = (cmd: SlashCommandItem) => {
    setReplyText('');
    if (cmd.isSpecialExpiryNotice) {
      handleSendExpiryNotice3Days();
    } else if (cmd.action) {
      cmd.action();
    } else if (cmd.message) {
      handleSendMessage(cmd.message);
    }
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
  };

  // Fila de atendimento e cliente ativo
  const supportQueue = React.useMemo(() => {
    return calculateSupportQueue(messages, activeServingClientCode);
  }, [messages, activeServingClientCode]);

  // Verificar se o último status deste cliente foi atendimento finalizado
  const isSelectedChatFinished = React.useMemo(() => {
    if (!selectedClientCode || activeMessages.length === 0) return false;
    const lastMsg = activeMessages[activeMessages.length - 1];
    return lastMsg.sender === 'admin' && (
      lastMsg.message.includes('Chat Finalizado') || 
      lastMsg.message.includes('Atendimento Finalizado')
    );
  }, [selectedClientCode, activeMessages]);

  // Verificar se a última mensagem deste cliente é um aviso automático de vencimento (não é atendimento ativo)
  const isSelectedExpiryNotice = React.useMemo(() => {
    if (!selectedClientCode || activeMessages.length === 0) return false;
    const lastMsg = activeMessages[activeMessages.length - 1];
    return lastMsg.sender === 'admin' && isExpiryNoticeMessage(lastMsg.message);
  }, [selectedClientCode, activeMessages]);

  // Cliente em atendimento: apenas se o admin clicou explicitamente para atender OU se há cliente ativo na fila de suporte
  const currentlyServingCode = activeServingClientCode || supportQueue.activeClient || null;
  const isServingSelected = Boolean(
    selectedClientCode &&
    currentlyServingCode &&
    selectedClientCode === currentlyServingCode &&
    !isSelectedExpiryNotice &&
    !isSelectedChatFinished
  );
  const currentQueueItem = selectedClientCode ? supportQueue.queue.find((q) => q.client_code === selectedClientCode) : null;

  // Iniciar atendimento para o cliente selecionado
  const handleStartServingThisClient = async () => {
    if (!selectedClientCode) return;
    setActiveServingClientCode(selectedClientCode);
    try {
      const turnMsg = getAutomatedTurnReachedMessage(activeClientName);
      await supabase.from('chat_messages').insert({
        client_code: selectedClientCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: turnMsg,
        read_by_admin: true,
        read_by_client: false
      });
    } catch (err: any) {
      console.error('Erro ao iniciar atendimento:', err);
    }
  };

  // Finalizar atendimento do cliente atual e avançar fila
  const handleFinishAttendance = async () => {
    if (!selectedClientCode) return;
    try {
      // 1. Enviar mensagem de encerramento do chamado para o cliente
      const finishMsg = getAutomatedFinishAttendanceMessage(activeClientName);
      await supabase.from('chat_messages').insert({
        client_code: selectedClientCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: finishMsg,
        read_by_admin: true,
        read_by_client: false
      });

      // 2. Chamar próximo da fila se houver
      const nextInQueue = supportQueue.queue[0];
      if (nextInQueue) {
        setActiveServingClientCode(nextInQueue.client_code);
        setSelectedClientCode(nextInQueue.client_code);

        // Notificar o próximo que a vez dele chegou
        const turnMsg = getAutomatedTurnReachedMessage(nextInQueue.client_name);
        await supabase.from('chat_messages').insert({
          client_code: nextInQueue.client_code,
          client_name: 'Suporte The Best IPTV+',
          sender: 'admin',
          message: turnMsg,
          read_by_admin: true,
          read_by_client: false
        });
      } else {
        setActiveServingClientCode(null);
      }
    } catch (err: any) {
      alert('Erro ao finalizar atendimento: ' + (err.message || 'Erro desconhecido.'));
    }
  };

  // Limpar histórico da conversa selecionada (abre o modal de confirmação com lixeira)
  const handleDeleteConversation = () => {
    if (!selectedClientCode) return;
    setClientToDelete({
      code: selectedClientCode,
      name: activeClientName
    });
  };

  // Excluir toda a conversa do cliente selecionado no banco e cache
  const handleConfirmDeleteConversation = async (clientCode: string) => {
    if (isDeletingConversation) return;
    setIsDeletingConversation(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('client_code', clientCode);

      if (error) throw error;

      setMessages((prev) => {
        const updated = prev.filter((m) => m.client_code !== clientCode);
        try {
          localStorage.setItem('tbi_cached_chat_messages', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (selectedClientCode === clientCode) {
        setSelectedClientCode(null);
        setMobileShowChat(false);
      }

      setClientToDelete(null);
    } catch (err: any) {
      alert('Erro ao excluir histórico de mensagens: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsDeletingConversation(false);
    }
  };

  // Funções de toque prolongado (long-press de 1 segundo) no celular/desktop para abrir lixeira
  const startLongPress = (code: string, name: string, clientX: number, clientY: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    touchStartPosRef.current = { x: clientX, y: clientY };
    ignoreNextClickRef.current = false;
    setHoldingClientCode(code);

    longPressTimerRef.current = setTimeout(() => {
      // 1 segundo completo atingido!
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch {}
      }
      ignoreNextClickRef.current = true;
      setHoldingClientCode(null);
      longPressTimerRef.current = null;
      setClientToDelete({ code, name });
    }, 1000);
  };

  const endLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setHoldingClientCode(null);
    } else {
      setHoldingClientCode(null);
      setTimeout(() => {
        ignoreNextClickRef.current = false;
      }, 400);
    }
    touchStartPosRef.current = null;
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setHoldingClientCode(null);
    touchStartPosRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dist = Math.hypot(touch.clientX - touchStartPosRef.current.x, touch.clientY - touchStartPosRef.current.y);
    if (dist > 8) {
      cancelLongPress();
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

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-[#0f131c] border border-slate-800/80 rounded-none overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Grid Principal: Lista de Conversas (Esquerda) e Chat Ativo (Direita) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Coluna da Esquerda: Lista de Conversas */}
        <div className={`${
          mobileShowChat ? 'hidden' : 'flex'
        } sm:flex w-full sm:w-80 md:w-96 border-r border-slate-800/80 bg-[#0d1017]/80 flex-col`}>
          {/* Busca de Conversas e Ações Rápidas Compactas */}
          <div className="p-2.5 border-b border-slate-800/60 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151922] border border-slate-800 text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              onClick={handleOpenRenovarAppSite}
              className="p-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 hover:text-white border border-emerald-500/40 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              title="Renovar Aplicativo no AtiveApp"
            >
              <Smartphone size={15} />
            </button>

            <button
              onClick={handleOpenRenovarStreamingSite}
              className="p-2 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/40 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              title="Renovar Streaming no Painel.fun"
            >
              <Tv size={15} />
            </button>

            <button
              onClick={() => setShowStoreManager(true)}
              className="p-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/30 transition-all shrink-0"
              title="Loja & Produtos"
            >
              <ShoppingBag size={15} />
            </button>

            {/* Botão de Automação de Cobranças e Vencimentos */}
            <button
              type="button"
              onClick={handleManualRunExpiryCheck}
              disabled={isAutoCheckingExpiry}
              className={`p-2 rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer border ${
                isAutoCheckingExpiry
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white border-indigo-500/40'
              }`}
              title={
                isAutoCheckingExpiry
                  ? "Verificando e enviando avisos aos clientes..."
                  : "⚡ Automação de Vencimentos: Ativa (Clique para verificar e enviar agora)"
              }
            >
              <Zap size={15} className={isAutoCheckingExpiry ? "animate-spin text-rose-300" : "text-indigo-300"} />
            </button>

            <button
              onClick={fetchMessages}
              className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all shrink-0"
              title="Atualizar mensagens"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {onCloseToHome && (
              <button
                onClick={onCloseToHome}
                className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all shrink-0"
                title="Voltar para tela inicial"
              >
                <Home size={15} />
              </button>
            )}
          </div>

          {/* Lista de Clientes com Conversa */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={18} className="animate-spin text-indigo-400" />
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {searchQuery ? 'Nenhum cliente encontrado.' : 'Nenhuma mensagem recebida ainda.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.client_code === selectedClientCode;
                const queueItem = supportQueue.queue.find((q) => q.client_code === conv.client_code);
                const isConvExpiryNotice = conv.last_sender === 'admin' && isExpiryNoticeMessage(conv.last_message);
                const isServingThis = conv.client_code === currentlyServingCode && !isConvExpiryNotice;
                const isConvFinished = conv.last_sender === 'admin' && (
                  conv.last_message.includes('Chat Finalizado') || 
                  conv.last_message.includes('Atendimento Finalizado')
                );

                return (
                  <button
                    key={conv.client_code}
                    onClick={(e) => {
                      if (ignoreNextClickRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        ignoreNextClickRef.current = false;
                        return;
                      }
                      setSelectedClientCode(conv.client_code);
                      setMobileShowChat(true);
                    }}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      if (t) {
                        startLongPress(conv.client_code, conv.client_name, t.clientX, t.clientY);
                      }
                    }}
                    onTouchEnd={endLongPress}
                    onTouchMove={handleTouchMove}
                    onTouchCancel={cancelLongPress}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        startLongPress(conv.client_code, conv.client_name, e.clientX, e.clientY);
                      }
                    }}
                    onMouseUp={endLongPress}
                    onMouseLeave={cancelLongPress}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 relative select-none touch-manipulation cursor-pointer ${
                      holdingClientCode === conv.client_code
                        ? 'scale-[0.98] ring-2 ring-red-500/80 bg-red-950/40 shadow-lg shadow-red-900/30'
                        : isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-lg shadow-indigo-600/10'
                        : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    {/* Indicador de segurar para abrir lixeira */}
                    {holdingClientCode === conv.client_code && (
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-900/50 animate-pulse z-10">
                        <Trash2 size={11} className="animate-bounce" />
                        <span>Segure 1s...</span>
                      </div>
                    )}
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {conv.client_name.charAt(0).toUpperCase()}
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Detalhes */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {conv.client_name}
                          </h4>
                          {isConvFinished ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                              🔒 Finalizado
                            </span>
                          ) : isConvExpiryNotice ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 flex items-center gap-1">
                              📢 Aviso Enviado
                            </span>
                          ) : isServingThis ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Atendendo
                            </span>
                          ) : queueItem ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Fila #{queueItem.position} (~{queueItem.estimatedMinutes}m)
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                          {formatTime(conv.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-indigo-300 rounded border border-slate-700/60">
                          {conv.client_code}
                        </span>
                        <p className="text-xs text-slate-400 truncate flex-1">
                          {conv.last_sender === 'admin' && (
                            <span className="text-indigo-400 font-medium">Você: </span>
                          )}
                          {conv.last_message.includes('[PIX_COMPROVANTE:')
                            ? '📄 [Comprovante Pix Enviado]'
                            : conv.last_message.includes('[FOTOS_SUPORTE]')
                            ? '📷 [Fotos Enviadas]'
                            : conv.last_message.includes('[AVISO_TESTE_3H_VENCEU]')
                            ? '⏱️ [Aviso: Teste 3h Venceu]'
                            : conv.last_message.includes('[AVISO_VENCIMENTO_HOJE]')
                            ? '🚨 [Aviso: Vence Hoje]'
                            : conv.last_message.includes('[AVISO_VENCIMENTO_AMANHA]')
                            ? '⚠️ [Aviso: Vence Amanhã]'
                            : conv.last_message.includes('[AVISO_VENCIMENTO_2D]')
                            ? '⏳ [Aviso: Vence em 2 Dias]'
                            : conv.last_message.includes('[AVISO_VENCIMENTO_3D]')
                            ? '⏰ [Aviso: Vence em 3 Dias]'
                            : conv.last_message.includes('[ATALHO_CUSTOM]')
                            ? (() => {
                                const p = parseCustomShortcutMessage(conv.last_message);
                                return p ? `${p.icon} [${p.label}]` : '⚡ [Atalho Personalizado]';
                              })()
                            : conv.last_message}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna da Direita: Janela de Atendimento do Cliente */}
        <div className={`${
          mobileShowChat ? 'flex' : 'hidden'
        } sm:flex flex-1 flex-col bg-[#0b0e14] overflow-hidden`}>
          {selectedClientCode ? (
            <>
              {/* Header do Chat Ativo */}
              <div className="p-3.5 md:px-6 bg-[#121620] border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Botão Voltar — só aparece no mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileShowChat(false);
                      setSelectedClientCode(null);
                    }}
                    className="sm:hidden p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60 shrink-0"
                    title="Voltar para lista"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                    {activeClientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm md:text-base">{activeClientName}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                        Código: {selectedClientCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {selectedClientInfo?.phone && (
                        <a
                          href={`https://wa.me/${selectedClientInfo.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          <Phone size={12} /> {selectedClientInfo.phone}
                        </a>
                      )}
                      {selectedClientInfo?.canvasLink && (
                        <a
                          href={selectedClientInfo.canvasLink}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} /> Painel Canva
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenRenovarAppSite}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 border border-emerald-400/40 cursor-pointer"
                    title="Abrir site AtiveApp para renovar aplicativo deste cliente"
                  >
                    <Smartphone size={14} className="text-emerald-100" />
                    <span>Renovar App ↗</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenRenovarStreamingSite}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-950/40 active:scale-95 border border-blue-400/40 cursor-pointer"
                    title="Abrir Painel.fun para renovar streaming deste cliente"
                  >
                    <Tv size={14} className="text-blue-100" />
                    <span>Renovar Streaming ↗</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMemoryModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-900/20 active:scale-95"
                    title="Ver e Gerenciar Memória do Cliente"
                  >
                    <Brain size={15} className="text-purple-300" />
                    <span className="hidden sm:inline">Memória</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/20"
                    title="Apagar conversa deste cliente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Barra de Status da Fila e Atendimento do Cliente Selecionado */}
              <div className="bg-[#0f131d] border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
                {isSelectedChatFinished ? (
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    <span>🔒 <strong>Chat Finalizado:</strong> Este atendimento foi concluído</span>
                  </div>
                ) : isSelectedExpiryNotice ? (
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                    <span>📢 <strong>Aviso de Vencimento:</strong> Mensagem automática enviada ao cliente</span>
                  </div>
                ) : isServingSelected ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>🟢 <strong>Em Atendimento Ativo:</strong> Você está conversando com este cliente</span>
                  </div>
                ) : currentQueueItem ? (
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span>⏳ <strong>Aguardando na Fila:</strong> {currentQueueItem.position}º lugar (~{currentQueueItem.estimatedMinutes} min de espera)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={14} className="text-slate-500" />
                    <span>Atendimento Disponível</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {isSelectedChatFinished ? (
                    <button
                      type="button"
                      onClick={handleStartServingThisClient}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <UserCheck size={14} /> Iniciar Novo Atendimento
                    </button>
                  ) : isServingSelected ? (
                    <button
                      type="button"
                      onClick={handleFinishAttendance}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      <CheckCircle2 size={14} /> Finalizar Atendimento & Chamar Próximo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartServingThisClient}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <UserCheck size={14} /> Iniciar Atendimento Agora
                    </button>
                  )}
                </div>
              </div>

              {/* Corpo das Mensagens */}
              <div className="flex-1 relative flex flex-col overflow-hidden">
                <div
                  ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
                onScroll={() => {
                  const el = messagesContainerRef.current;
                  if (!el) return;
                  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  const isUp = distanceFromBottom > 50;
                  userScrolledUpRef.current = isUp;
                  setShowScrollBottomBtn(isUp);
                }}
              >
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                    <MessageSquare size={36} className="text-slate-600 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-medium">Inicie o atendimento com este cliente</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Envie uma mensagem abaixo ou use uma resposta rápida.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg, index) => {
                    const isAdmin = msg.sender === 'admin';
                    const showDateHeader =
                      index === 0 ||
                      formatDate(msg.created_at) !== formatDate(activeMessages[index - 1].created_at);

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateHeader && (
                          <div className="text-center my-3">
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                            {!isAdmin && (
                              <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                                {activeClientName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div
                              className={`group p-3.5 rounded-2xl text-sm leading-relaxed relative ${
                                isAdmin
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-lg shadow-indigo-600/15'
                                  : msg.message.includes('Comprovante de Pagamento Pix') || msg.message.includes('PAGAMENTO PIX')
                                  ? 'bg-[#182120] border border-emerald-500/40 text-slate-100 rounded-bl-none shadow-md'
                                  : 'bg-[#1a1f2c] border border-slate-700/80 text-slate-100 rounded-bl-none shadow-md'
                              }`}
                            >
                              {isSupportPhotosMessage(msg.message) ? (
                                (() => {
                                  const payload = parseSupportPhotosMessage(msg.message);
                                  if (!payload) return null;
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 mb-2">
                                        <ImageIcon size={14} className="text-blue-400" />
                                        <span className="text-xs font-bold text-blue-200">{payload.count} foto(s) enviada(s) pelo cliente</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {payload.photos.map((url, i) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                            className="block rounded-lg overflow-hidden border border-white/10 hover:opacity-85 transition-opacity">
                                            <img src={url} alt={`Foto ${i + 1}`} className="w-full aspect-square object-cover" loading="lazy" />
                                          </a>
                                        ))}
                                      </div>
                                      {payload.caption && (
                                        <p className="text-xs mt-1.5 text-slate-300 italic">{payload.caption}</p>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : isPixPdfMessage(msg.message) ? (
                                <PixPdfCard
                                  payload={parsePixPdfMessage(msg.message)!}
                                  isAdmin={true}
                                  onConfirmPixPayment={() => handleConfirmPixPayment(msg.client_code, activeClientName)}
                                  isClientSender={!isAdmin}
                                />
                              ) : isExpiryNotice3DMessage(msg.message) ? (
                                <ExpiryNoticeCard
                                  payload={parseExpiryNotice3DMessage(msg.message)!}
                                  isAdmin={true}
                                  onOpenStreamingSite={handleOpenRenovarStreamingSite}
                                />
                                ) : isCustomShortcutMessage(msg.message) ? (() => {
                                  const payload = parseCustomShortcutMessage(msg.message);
                                  if (!payload) return null;
                                  const theme = COLOR_THEMES[payload.colorTheme] || COLOR_THEMES.purple;
                                  const isYouTube = payload.mediaUrl.includes('youtube.com') || payload.mediaUrl.includes('youtu.be');
                                  const getYouTubeId = (url: string) => {
                                    const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
                                    return m ? m[1] : null;
                                  };
                                  return (
                                    <div className="w-full rounded-2xl overflow-hidden border border-slate-600/40 bg-gradient-to-b from-[#181d2c] to-[#0c0f17] shadow-lg text-white">
                                      <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">{payload.icon}</span>
                                          <span className="text-xs font-bold text-slate-200 truncate max-w-[160px]">{payload.label}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}>{payload.command}</span>
                                      </div>
                                      {payload.mediaType === 'image' && payload.mediaUrl && (
                                        <a href={payload.mediaUrl} target="_blank" rel="noopener noreferrer" className="bg-black/50 flex justify-center p-2 block hover:opacity-90 transition-opacity">
                                          <img src={payload.mediaUrl} alt={payload.label} className="max-h-64 w-auto rounded-xl border border-white/10 object-contain" />
                                        </a>
                                      )}
                                      {payload.mediaType === 'video' && payload.mediaUrl && (
                                        <div className="bg-black/50 p-2">
                                          {isYouTube ? (
                                            <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                                              <iframe src={`https://www.youtube.com/embed/${getYouTubeId(payload.mediaUrl)}`} className="w-full h-full" allowFullScreen />
                                            </div>
                                          ) : (
                                            <video src={payload.mediaUrl} controls className="w-full rounded-xl border border-white/10 max-h-56" />
                                          )}
                                        </div>
                                      )}
                                      {payload.message && (
                                        <div className="px-3 py-2.5 text-xs text-slate-300 leading-relaxed bg-[#111520]/70 border-t border-slate-800 whitespace-pre-wrap">{payload.message}</div>
                                      )}
                                    </div>
                                  );
                                })() : (
                                <div className="break-words pr-6">
                                  {renderFormattedChatMessageText(msg.message, isAdmin)}

                                  {/* Card de Pagamento Mercado Pago */}
                                  {(() => {
                                    const payData = extractPaymentLink(msg.message);
                                    return payData ? (
                                      <PaymentLinkCard
                                        url={payData.url}
                                        label={payData.label}
                                        value={payData.value}
                                      />
                                    ) : null;
                                  })()}

                                  {/* Card de Ações Rápidas de Cópia (Teste Grátis / Dados do App / MAC / Key) */}
                                  {(() => {
                                    const trialData = extractTrialRequestData(
                                      msg.message, 
                                      activeClientName, 
                                      msg.client_code, 
                                      selectedClientInfo?.phone
                                    );
                                    return trialData && trialData.isTrialOrPointRequest ? (
                                      <TrialDataActionsCard data={trialData} isClientSender={!isAdmin} clientCode={selectedClientCode || undefined} clientName={activeClientName} />
                                    ) : null;
                                  })()}
                                </div>
                              )}

                              {/* Botão de Copiar */}
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.message)}
                                title="Copiar mensagem"
                                className={`absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                                  isAdmin
                                    ? 'bg-white/20 hover:bg-white/30 text-white/80 hover:text-white'
                                    : 'bg-slate-700/70 hover:bg-slate-600/80 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {copiedMsgId === msg.id
                                  ? <Check size={12} className="text-emerald-400" />
                                  : <Copy size={12} />}
                              </button>

                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                  isAdmin ? 'text-indigo-200/80' : 'text-slate-500'
                                }`}
                              >
                                <span>{formatTime(msg.created_at)}</span>
                                {isAdmin && (
                                  <CheckCheck
                                    size={13}
                                    className={msg.read_by_client ? 'text-emerald-300' : 'text-indigo-200/80'}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
                </div>
                {showScrollBottomBtn && (
                  <button
                    type="button"
                    onClick={() => {
                      userScrolledUpRef.current = false;
                      setShowScrollBottomBtn(false);
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="absolute bottom-4 right-6 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-full shadow-lg backdrop-blur border border-indigo-400/30 flex items-center gap-1.5 transition-all z-20 cursor-pointer shadow-indigo-600/20 active:scale-95"
                  >
                    <ArrowDown size={14} /> Mensagens recentes
                  </button>
                )}
              </div>

              {/* Campo de Envio de Mensagem */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isSlashTriggered && filteredSlashCommands.length > 0) {
                    const selected = filteredSlashCommands[slashSelectedIndex];
                    if (selected) {
                      handleExecuteSlashCommand(selected);
                      return;
                    }
                  }
                  handleSendMessage();
                }}
                className="p-3 md:p-4 bg-[#121620] border-t border-slate-800/80 flex items-center gap-2 relative"
              >
                {/* Menu Popover de Atalhos "/" (Slash Commands) */}
                {isSlashTriggered && (
                  <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-2 bg-[#0c101a]/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden z-50 flex flex-col max-h-72 sm:max-h-80 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {/* Header do Menu */}
                    <div className="px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border-b border-indigo-500/30 flex items-center justify-between text-xs shrink-0">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-xs font-mono font-black text-indigo-200">
                          /
                        </span>
                        <span>Atalhos Rápidos de Atendimento</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="hidden sm:inline">↑↓ navegar • Enter enviar • Tab preencher • Esc fechar</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px] font-bold border border-slate-700/60">
                          {filteredSlashCommands.length} {filteredSlashCommands.length === 1 ? 'atalho' : 'atalhos'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReplyText(''); setShowCustomShortcutsManager(true); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 text-[11px] font-bold transition-all"
                          title="Criar e gerenciar atalhos personalizados"
                        >
                          + Gerenciar
                        </button>
                      </div>
                    </div>

                    {/* Lista Rolável de Comandos */}
                    {filteredSlashCommands.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhum atalho encontrado para <code className="text-amber-300 font-mono">/{slashQuery}</code>. Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Esc</kbd> para fechar.
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                        {filteredSlashCommands.map((cmd, idx) => {
                          const isSelected = idx === slashSelectedIndex;
                          return (
                            <div
                              key={cmd.id}
                              onClick={() => handleExecuteSlashCommand(cmd)}
                              onMouseEnter={() => setSlashSelectedIndex(idx)}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/30 border border-indigo-500/60 text-white shadow-md shadow-indigo-600/10'
                                  : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="text-base shrink-0">{cmd.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-indigo-300 text-[11px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                                      {cmd.command}
                                    </span>
                                    <span className="font-semibold text-white truncate">{cmd.label}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{cmd.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {cmd.badge && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                                      cmd.badgeColor || 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                    }`}
                                  >
                                    {cmd.badge}
                                  </span>
                                )}
                                {cmd.message && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyText(cmd.message || '');
                                      chatInputRef.current?.focus();
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                                    title="Inserir texto no campo para editar antes de enviar"
                                  >
                                    <span className="text-[10px]">✏️</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder={`Responder para ${activeClientName}... (digite / para atalhos)`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (isSlashTriggered && filteredSlashCommands.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSlashSelectedIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const selected = filteredSlashCommands[slashSelectedIndex];
                        if (selected) {
                          handleExecuteSlashCommand(selected);
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setReplyText('');
                      } else if (e.key === 'Tab') {
                        e.preventDefault();
                        const selected = filteredSlashCommands[slashSelectedIndex];
                        if (selected) {
                          if (selected.message) {
                            setReplyText(selected.message);
                          } else {
                            handleExecuteSlashCommand(selected);
                          }
                        }
                      }
                    }
                  }}
                  className="flex-1 bg-[#181d28] border border-slate-700/80 text-white placeholder-slate-500 px-4 py-3 rounded-2xl text-sm focus:border-indigo-500 outline-none transition-all shadow-inner"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0 active:scale-95"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                <MessageSquare size={28} className="text-slate-600" />
              </div>
              <h3 className="text-base font-bold text-slate-300">Nenhuma conversa selecionada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
                Selecione um cliente na lista ao lado para visualizar o histórico de mensagens e responder.
              </p>
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={handleOpenRenovarAppSite}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 active:scale-95 border border-emerald-400/40 cursor-pointer"
                >
                  <Smartphone size={16} />
                  <span>Renovar Aplicativo (AtiveApp) ↗</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRenovarStreamingSite}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-950/40 transition-all flex items-center gap-2 active:scale-95 border border-blue-400/40 cursor-pointer"
                >
                  <Tv size={16} />
                  <span>Renovar Streaming (Painel.fun) ↗</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Memória Individual do Cliente */}
      {selectedClientCode && (
        <ClientMemoryModal
          isOpen={showMemoryModal}
          onClose={() => setShowMemoryModal(false)}
          clientCode={selectedClientCode}
          clientName={activeClientName}
        />
      )}

      {/* Modal de Gerenciamento da Loja de Vendas */}
      <AdminStoreManagerModal
        isOpen={showStoreManager}
        onClose={() => setShowStoreManager(false)}
      />

      {/* Modal de Confirmação de Exclusão da Conversa (Lixeira ao segurar 1s ou clicar no ícone) */}
      {clientToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeletingConversation) setClientToDelete(null);
          }}
        >
          <div 
            className="bg-[#121620] border border-red-500/40 rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl shadow-red-950/60 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Efeito luminoso de alerta no topo */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Ícone da Lixeira em Destaque */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-900/30 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-900/40">
              <Trash2 size={32} className="animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              Excluir Toda a Conversa?
            </h3>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-slate-200">
                {clientToDelete.name}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">
                {clientToDelete.code}
              </span>
            </div>

            {/* Caixa de aviso de ação irreversível */}
            <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3.5 mb-5 text-left flex items-start gap-3 w-full">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200/90 leading-relaxed">
                Tem certeza de que deseja apagar o histórico completo desta conversa? 
                <strong className="block text-red-300 mt-1">Todas as mensagens, comprovantes e fotos trocadas com este cliente serão excluídos permanentemente.</strong>
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                disabled={isDeletingConversation}
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeletingConversation}
                onClick={() => handleConfirmDeleteConversation(clientToDelete.code)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingConversation ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Sim, Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Atalhos Personalizados */}
      <CustomShortcutsManagerModal
        isOpen={showCustomShortcutsManager}
        onClose={() => setShowCustomShortcutsManager(false)}
        onShortcutsChanged={(updated) => setCustomShortcuts(updated)}
      />
    </div>
  );
};
