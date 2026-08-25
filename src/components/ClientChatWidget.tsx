import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/chat';
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
  Tv
} from 'lucide-react';

interface ClientChatWidgetProps {
  clientCode?: string;
  clientName?: string;
  canvasLink?: string;
  onOpenCodeLogin?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

const CLIENT_TOPICS_LEFT = [
  '🌐 Minha Área Exclusiva',
  'Olá! Preciso de ajuda com meu acesso.',
  'Um canal/filme está travando ou fora do ar.',
  'Gostaria de informações sobre renovação.',
  'Como configurar no meu aparelho?'
];

const CLIENT_TOPICS_RIGHT = [
  'Minha lista de canais não está carregando.',
  'Áudio ou legenda fora de sincronia.',
  'Gostaria de pedir um filme ou série.',
  'Como faço para atualizar meu acesso?',
  'Estou com lentidão ou buffering no app.'
];

export const ClientChatWidget: React.FC<ClientChatWidgetProps> = ({
  clientCode,
  clientName,
  canvasLink,
  onOpenCodeLogin,
  isOpenExternal,
  onCloseExternal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tempCodeInput, setTempCodeInput] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const { error } = await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: clientName || customClientName || 'Cliente',
        sender: 'client',
        message: text,
        read_by_admin: false,
        read_by_client: true
      });

      if (error) throw error;
      setInputText('');
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + (err.message || 'Erro desconhecido.'));
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
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold font-sans ml-0 group-hover:ml-2">
            Chat Suporte
          </span>
        </motion.button>
      )}

      {/* Janela de Chat Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] sm:w-[450px] h-[640px] max-h-[90vh] bg-[#0e121a] border border-slate-800/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans"
          >
            {/* Header da Janela */}
            <div className="p-4 bg-gradient-to-r from-indigo-900/90 via-[#151a28] to-[#0e121a] border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
                    <Headphones size={20} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e121a] animate-pulse"></span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight">
                    Suporte The Best IPTV+
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-emerald-400 font-medium">Administrador Online</span>
                    {activeCode && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/60">
                        {activeCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Chat */}
            {!activeCode ? (
              /* Caso o cliente ainda não tenha inserido o código */
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={30} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">Identifique-se para conversar</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Para falar com o administrador, utilize seu código de cliente ou faça login com seu código de acesso.
                  </p>
                </div>

                <div className="w-full space-y-3 pt-2">
                  {onOpenCodeLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenCodeLogin();
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Key size={15} /> Digitar Meu Código de Acesso
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Interface de Conversa em Tempo Real */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0b0e14]/60">
                  {/* Mensagem de Boas-vindas do Suporte */}
                  <div className="flex items-start gap-2 max-w-[88%]">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-indigo-500/40">
                      ADM
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#171b26] border border-slate-800 text-slate-200 text-xs leading-relaxed rounded-tl-none shadow-md">
                      <p>
                        Olá <strong>{clientName || 'Cliente'}</strong>! 👋 Como posso te ajudar hoje? Digite sua mensagem abaixo que responderei o mais breve possível.
                      </p>
                      <span className="block text-[9px] text-slate-500 text-right mt-1">Atendimento ao Vivo</span>
                    </div>
                  </div>

                  {messages.map((msg) => {
                    const isClient = msg.sender === 'client';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[85%]">
                          {!isClient && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-indigo-500/40">
                              ADM
                            </div>
                          )}

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed break-words ${
                              isClient
                                ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/15'
                                : 'bg-[#1a1f2c] border border-slate-700/80 text-slate-100 rounded-bl-none shadow-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isClient ? 'text-indigo-200/80' : 'text-slate-500'
                              }`}
                            >
                              <span>{formatTime(msg.created_at)}</span>
                              {isClient && (
                                <CheckCheck
                                  size={12}
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

                {/* Sugestões Rápidas de Tópicos (2 Colunas com 5 itens cada) */}
                <div className="p-2.5 bg-[#0f121a] border-t border-slate-800/80 shrink-0">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400" />
                      Atalhos Rápidos:
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">Toque para enviar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-0.5">
                    {/* Fileira Esquerda (5) */}
                    <div className="flex flex-col gap-1.5">
                      {CLIENT_TOPICS_LEFT.map((topic, i) => {
                        const isExclusiva = topic.includes('Minha Área Exclusiva');
                        return (
                          <button
                            key={`left-${i}`}
                            type="button"
                            onClick={() => {
                              if (isExclusiva) {
                                const link = canvasLink || 'https://testetestettt.my.canva.site/sr-carlos';
                                window.open(link, '_blank');
                              } else {
                                handleSendMessage(topic);
                              }
                            }}
                            className={`text-left text-[11px] p-2 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-center justify-between gap-1 ${
                              isExclusiva
                                ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 hover:from-indigo-600/45 hover:to-purple-600/35 text-indigo-200 border border-indigo-500/50 font-bold'
                                : 'bg-[#161a24] hover:bg-indigo-600/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 border border-slate-800/90'
                            }`}
                          >
                            <span className="line-clamp-2">{topic}</span>
                            {isExclusiva && <ExternalLink size={12} className="text-indigo-300 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Fileira Direita (5) */}
                    <div className="flex flex-col gap-1.5">
                      {CLIENT_TOPICS_RIGHT.map((topic, i) => (
                        <button
                          key={`right-${i}`}
                          type="button"
                          onClick={() => handleSendMessage(topic)}
                          className="text-left text-[11px] bg-[#161a24] hover:bg-indigo-600/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 border border-slate-800/90 p-2 rounded-xl transition-all leading-tight active:scale-[0.98] shadow-sm flex items-start"
                        >
                          <span className="line-clamp-2">{topic}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Campo de Envio */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-[#11141e] border-t border-slate-800/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Digite sua mensagem para o administrador..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-[#181d28] border border-slate-700/80 text-white placeholder-slate-500 px-3.5 py-2.5 rounded-2xl text-xs focus:border-indigo-500 outline-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
