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
  ShoppingBag
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
import { isSupportPhotosMessage, parseSupportPhotosMessage } from './PhotoUploadModal';
import { ClientMemoryModal } from './ClientMemoryModal';
import { AdminStoreManagerModal } from './AdminStoreManagerModal';

interface AdminChatPanelProps {
  clientsList?: Array<{ id: string; name: string; code: string; phone?: string; canvasLink?: string }>;
  onRegisterStepBack?: (handler: (() => boolean) | null) => void;
}

const QUICK_REPLIES = [
  { label: 'Olá! Tudo bem? Como posso te ajudar hoje? 😊', message: 'Olá! Tudo bem? Como posso te ajudar hoje? 😊' },
  { label: 'Recebi sua mensagem...', message: 'Recebi sua mensagem. Já estou verificando para você!' },
  { label: 'Sinal atualizado ✅', message: 'Seu sinal/acesso foi atualizado. Poderia testar novamente?' },
  { label: 'Qual aparelho?', message: 'Poderia me informar qual aparelho você está utilizando (TV, TV Box, Celular)?' },
  { label: '🧪 Teste iniciado', message: 'Teste gratuito de 3h iniciado! Feche e abra o aplicativo novamente para atualizar o acesso.' },
  { label: 'Tudo funcionando 🚀', message: 'Tudo pronto e funcionando 100%! Qualquer dúvida estou à disposição. 🚀' },
];

export const AdminChatPanel: React.FC<AdminChatPanelProps> = ({ clientsList = [], onRegisterStepBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedClientCode, setSelectedClientCode] = useState<string | null>(null);
  const [activeServingClientCode, setActiveServingClientCode] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showStoreManager, setShowStoreManager] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedClientCodeRef = useRef<string | null>(null);
  const mobileShowChatRef = useRef(false);

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
        setMessages(data as ChatMessage[]);
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens do chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Escutar novas mensagens em tempo real
    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rolar para o final quando a conversa ativa mudar ou receber nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedClientCode]);

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

    // Ordenar pelas conversas mais recentes
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
  }, [messages, clientsList]);

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

  const selectedClientInfo = clientsList.find((c) => c.code === selectedClientCode);
  const selectedConversation = conversations.find((c) => c.client_code === selectedClientCode);

  const activeClientName =
    selectedClientInfo?.name || selectedConversation?.client_name || `Cliente (${selectedClientCode})`;

  // Enviar resposta do administrador
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || replyText).trim();
    if (!text || !selectedClientCode || isSending) return;

    setIsSending(true);
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
      setReplyText('');
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsSending(false);
    }
  };

  // Confirmar e Reconhecer Pagamento Pix com 1 clique
  const handleConfirmPixPayment = async (clientCode: string, clientName: string) => {
    try {
      const confirmMsg = getAutomatedPixConfirmedMessage(clientName);
      const { error } = await supabase.from('chat_messages').insert({
        client_code: clientCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: confirmMsg,
        read_by_admin: true,
        read_by_client: false
      });

      if (error) throw error;
    } catch (err: any) {
      alert('Erro ao confirmar pagamento Pix: ' + (err.message || 'Erro desconhecido.'));
    }
  };

  // Fila de atendimento e cliente ativo
  const supportQueue = React.useMemo(() => {
    return calculateSupportQueue(messages, activeServingClientCode);
  }, [messages, activeServingClientCode]);

  const currentlyServingCode = activeServingClientCode || (supportQueue.activeClient ? supportQueue.activeClient : selectedClientCode);
  const isServingSelected = selectedClientCode ? selectedClientCode === currentlyServingCode : false;
  const currentQueueItem = selectedClientCode ? supportQueue.queue.find((q) => q.client_code === selectedClientCode) : null;

  // Verificar se o último status deste cliente foi atendimento finalizado
  const isSelectedChatFinished = React.useMemo(() => {
    if (!selectedClientCode || activeMessages.length === 0) return false;
    const lastMsg = activeMessages[activeMessages.length - 1];
    return lastMsg.sender === 'admin' && (
      lastMsg.message.includes('Chat Finalizado') || 
      lastMsg.message.includes('Atendimento Finalizado')
    );
  }, [selectedClientCode, activeMessages]);

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

  // Limpar histórico da conversa selecionada
  const handleDeleteConversation = async () => {
    if (!selectedClientCode) return;
    if (confirm(`Tem certeza que deseja apagar todas as mensagens de ${activeClientName}?`)) {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('client_code', selectedClientCode);

        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.client_code !== selectedClientCode));
        setSelectedClientCode(null);
      } catch (err: any) {
        alert('Erro ao apagar histórico: ' + (err.message || 'Erro desconhecido.'));
      }
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
      {/* Topo do Painel de Chat */}
      <div className="p-4 md:px-6 py-4 bg-[#141824] border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Central de Atendimento ao Cliente
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-400">
              Converse em tempo real com clientes logados nos painéis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStoreManager(true)}
            className="p-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/20 hover:from-amber-600/50 hover:to-orange-600/40 text-amber-300 transition-all text-xs font-bold flex items-center gap-1.5 border border-amber-500/40 active:scale-95 shadow-sm"
            title="Gerenciar produtos, fotos e vídeos da loja"
          >
            <ShoppingBag size={14} className="text-amber-400" />
            <span>Loja & Produtos</span>
          </button>

          <button
            onClick={fetchMessages}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-slate-700/60"
            title="Atualizar mensagens"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Lista de Conversas (Esquerda) e Chat Ativo (Direita) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Coluna da Esquerda: Lista de Conversas */}
        <div className={`${
          mobileShowChat ? 'hidden' : 'flex'
        } sm:flex w-full sm:w-80 md:w-96 border-r border-slate-800/80 bg-[#0d1017]/80 flex-col`}>
          {/* Busca de Conversas */}
          <div className="p-3 border-b border-slate-800/60">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por cliente ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151922] border border-slate-800 text-slate-200 placeholder-slate-500 pl-9 pr-4 py-2 rounded-xl text-xs focus:border-indigo-500 outline-none transition-all"
              />
            </div>
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
                const isServingThis = conv.client_code === currentlyServingCode;
                const isConvFinished = conv.last_sender === 'admin' && (
                  conv.last_message.includes('Chat Finalizado') || 
                  conv.last_message.includes('Atendimento Finalizado')
                );

                return (
                  <button
                    key={conv.client_code}
                    onClick={() => {
                      setSelectedClientCode(conv.client_code);
                      setMobileShowChat(true);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-lg shadow-indigo-600/10'
                        : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
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
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
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
                              ) : (
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
                                      <TrialDataActionsCard data={trialData} isClientSender={!isAdmin} />
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

              {/* Respostas Rápidas */}
              <div className="p-2.5 sm:p-3 bg-[#0d1017] border-t border-slate-800/80 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    Respostas Rápidas:
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Clique para enviar resposta pronta</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {QUICK_REPLIES.map((reply, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(reply.message)}
                      className="text-left text-xs p-2.5 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm bg-[#161a24] hover:bg-indigo-600/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 border border-slate-800 font-medium truncate flex items-center justify-between gap-1"
                      title={reply.message}
                    >
                      <span className="truncate">{reply.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de Envio de Mensagem */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 md:p-4 bg-[#121620] border-t border-slate-800/80 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Responder para ${activeClientName}... (Pressione Enter)`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
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
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Selecione um cliente na lista ao lado para visualizar o histórico de mensagens e responder.
              </p>
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
    </div>
  );
};
