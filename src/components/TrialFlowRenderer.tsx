import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Loader2, 
  MessageSquare,
  UploadCloud
} from 'lucide-react';
import { TrialConfig, TrialDevice, TrialSubOption, TrialContentBlock } from '../types/trial';
import { supabase } from '../lib/supabase';

interface Props {
  config: TrialConfig;
  onClose: () => void;
  onOpenChat?: () => void;
  clientCode?: string;
  clientName?: string;
}

export function TrialFlowRenderer({ config, onClose, onOpenChat, clientCode, clientName }: Props) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string | null>(null);
  const [showAppDescription, setShowAppDescription] = useState(false);
  const [macCode, setMacCode] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
  };

  const selectedDevice = config.devices.find(d => d.id === selectedDeviceId);
  const selectedSubOption = selectedDevice?.subOptions?.find(s => s.id === selectedSubOptionId);

  const handleSendToSupport = async (content: TrialContentBlock) => {
    if (isSending) return;
    setIsSending(true);

    try {
      const currentCode = clientCode || localStorage.getItem('tbi_active_client_code') || `VISITANTE_${Date.now().toString().slice(-4)}`;
      const currentName = clientName || localStorage.getItem('tbi_active_client_name') || 'Cliente';

      const appName = content.macAppName || selectedSubOption?.name || content.title || selectedDevice?.name || 'Aplicativo';
      const deviceTitle = selectedDevice?.name || 'Dispositivo';

      let msgText = `🎁 *Solicitação de Teste Grátis de 3h*\n\n📺 *Dispositivo:* ${deviceTitle}\n📲 *Aplicativo:* ${appName}\n🔢 *Código MAC:* ${macCode.trim() || 'Não informado'}\n🔑 *Device Key / Código:* ${deviceKey.trim() || 'Não informado'}`;

      if (imagePreview && attachedImage) {
        const payload = {
          fileName: attachedImage.name,
          fileSize: `${(attachedImage.size / 1024).toFixed(1)} KB`,
          fileData: imagePreview,
          caption: `Foto da tela do ${appName} (Teste Grátis 3h)`
        };
        msgText += `\n\n[PIX_COMPROVANTE:${JSON.stringify(payload)}]`;
      }

      // 1. Salvar mensagem do cliente no chat
      await supabase.from('chat_messages').insert({
        client_code: currentCode,
        client_name: currentName,
        sender: 'client',
        message: msgText,
        read_by_admin: false,
        read_by_client: true
      });

      // 2. Disparar resposta automática imediata do bot
      const autoReply = `🤖 **Olá, ${currentName}!**\n\nRecebemos os dados do seu dispositivo (*${appName}*) para liberação do **Teste Grátis de 3h**! 🎉\n\nNossa equipe de suporte já está gerando sua lista de acesso e em instantes liberará seu login aqui no chat. 📺🍿`;
      await supabase.from('chat_messages').insert({
        client_code: currentCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: autoReply,
        read_by_admin: true,
        read_by_client: false
      });

      // 3. Abrir o chat para o cliente acompanhar
      if (onOpenChat) {
        onOpenChat();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao enviar dados para o suporte:', err);
      alert('Erro ao enviar para o chat: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTextToSupport = async (customText: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const currentCode = clientCode || localStorage.getItem('tbi_active_client_code') || `VISITANTE_${Date.now().toString().slice(-4)}`;
      const currentName = clientName || localStorage.getItem('tbi_active_client_name') || 'Cliente';

      await supabase.from('chat_messages').insert({
        client_code: currentCode,
        client_name: currentName,
        sender: 'client',
        message: `🎁 *Teste Grátis 3h:* ${customText}`,
        read_by_admin: false,
        read_by_client: true
      });

      if (onOpenChat) {
        onOpenChat();
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Google Drive
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return { type: 'iframe', url: `https://drive.google.com/file/d/${match[1]}/preview` };
      }
    }
    
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.includes('youtube.com/watch') 
        ? new URLSearchParams(url.split('?')[1]).get('v')
        : url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return { type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` };
      }
    }

    return { type: 'video', url };
  };

  const renderContentBlock = (content: TrialContentBlock, onBack: () => void, isChangelogOpen?: boolean, toggleChangelog?: () => void) => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          {content.title && (
            <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">{content.title}</h2>
          )}
          
          <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
            {content.subtitle && (
              <p className="font-bold text-lg text-white text-center mb-4">{content.subtitle}</p>
            )}

            {/* Carrossel de Mídias */}
            {(() => {
              const items = content.mediaItems || [];
              if (items.length === 0 && content.mediaUrl && content.mediaType && content.mediaType !== 'none') {
                items.push({ id: 'legacy', url: content.mediaUrl, type: content.mediaType });
              }

              if (items.length === 0) return null;

              const activeItem = items[currentSlide];

              return (
                <div className="w-full mb-6">
                  <div className="w-full rounded-2xl overflow-hidden shadow-lg shadow-black/50 border border-white/10 relative">
                    {activeItem.type === 'image' ? (
                      <img src={activeItem.url} alt="Mídia" className="w-full h-auto object-cover" />
                    ) : (
                      (() => {
                        const embed = getEmbedUrl(activeItem.url);
                        if (!embed) return null;
                        if (embed.type === 'iframe') {
                          return (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe 
                                src={embed.url} 
                                className="absolute top-0 left-0 w-full h-full rounded-xl"
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                        return <video src={embed.url} controls playsInline className="w-full h-auto object-cover rounded-xl" />;
                      })()
                    )}

                    {/* Navegação do Carrossel */}
                    {items.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : items.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-all border border-white/20 z-10"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setCurrentSlide((prev) => (prev < items.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-all border border-white/20 z-10"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
                          {items.map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentSlide ? 'bg-white scale-125' : 'bg-white/40'}`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {content.topAlert && (
              <p className={`font-bold block mb-1 ${content.topAlert.type === 'danger' ? 'text-red-400' : 'text-indigo-400'}`}>
                {content.topAlert.text}
              </p>
            )}

            {content.textBlocks && content.textBlocks.map((p, i) => (
              <p key={i} className="font-medium text-white">{p}</p>
            ))}

            {content.links && content.links.map(link => (
              <div key={link.id} className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-4 text-center">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white font-bold underline hover:text-indigo-400 break-all text-lg"
                >
                  {link.label}
                </a>
              </div>
            ))}

            {content.changelog && (
              <div className="mt-6 mb-4">
                <button
                  onClick={toggleChangelog}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-slate-700/50 flex justify-between items-center"
                >
                  <span>Descrição do Aplicativo</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">v{content.changelog.version}</span>
                </button>

                <AnimatePresence>
                  {isChangelogOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50 text-left text-sm space-y-3 mt-2">
                        <p className="font-bold text-amber-400 text-center">📢 ATUALIZAÇÃO IMPORTANTE</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-300">
                          {content.changelog.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {content.bottomAlert && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-center font-bold">
                {content.bottomAlert.text}
              </div>
            )}

            {content.showMacInput && (
              <div className="bg-slate-800/50 rounded-2xl p-5 mt-6 border border-slate-700/60 space-y-3.5 shadow-xl">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    {content.macAppName ? `Dados do Aplicativo - ${content.macAppName}` : 'Dados do Aplicativo (Opcional)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {content.macAppName ? `Preencha os dados gerados pelo ${content.macAppName} para liberarmos seu teste.` : 'Preencha os dados abaixo ou anexe uma foto da tela do aplicativo para liberar.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Código MAC</label>
                  <input
                    type="text"
                    value={macCode}
                    onChange={(e) => setMacCode(e.target.value)}
                    placeholder="Ex: A1:B2:C3:D4:E5:F6"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Device Key / Código do App</label>
                  <input
                    type="text"
                    value={deviceKey}
                    onChange={(e) => setDeviceKey(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>

                {/* Upload de Foto da Tela do App (Opcional) */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    📸 Foto da Tela do Aplicativo (Opcional)
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-indigo-500/40 bg-slate-900/90 p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{attachedImage?.name || 'foto_tela.jpg'}</p>
                          <p className="text-[10px] text-emerald-400 font-semibold">Foto anexada com sucesso</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0"
                        title="Remover foto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full py-3.5 px-4 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl bg-slate-900/50 hover:bg-indigo-600/5 cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 text-slate-400 hover:text-indigo-300 text-xs">
                        <UploadCloud size={16} className="text-indigo-400" />
                        <span className="font-semibold">Clique para tirar foto ou anexar imagem da TV</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Botão Enviar Dados p/ Suporte */}
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSendToSupport(content)}
                  className="mt-4 flex justify-center items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all w-full shadow-lg shadow-emerald-500/25 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Enviando para o Suporte...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Enviar Dados p/ Suporte</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {content.whatsappText && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => handleSendTextToSupport(content.whatsappText || 'Desejo suporte para ativar meu teste grátis.')}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <MessageSquare size={18} />
                  <span>Falar com Suporte no Chat</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
          >
            VOLTAR
          </button>
        </div>
      </motion.div>
    );
  };

  // 3. Renderizando o conteúdo de uma sub-opção selecionada
  if (selectedDevice && selectedDevice.type === 'suboptions' && selectedSubOption) {
    return renderContentBlock(selectedSubOption.content, () => setSelectedSubOptionId(null));
  }

  // 2. Renderizando as Sub-opções de um Dispositivo
  if (selectedDevice && selectedDevice.type === 'suboptions' && !selectedSubOptionId) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md uppercase mb-2">{selectedDevice.name}</h2>
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-indigo-300 drop-shadow-md uppercase">SELECIONE UMA OPÇÃO</h3>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4 w-full relative z-10">
            {(selectedDevice.subOptions || []).filter(s => s.visible !== false).map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubOptionId(sub.id)}
                className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
              >
                <span className="font-bold text-white text-lg tracking-wide">{sub.name}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedDeviceId(null)}
              className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
            >
              VOLTAR
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Renderizando o conteúdo de um Dispositivo direto (ex: Celular)
  if (selectedDevice && selectedDevice.type === 'content' && selectedDevice.content) {
    return renderContentBlock(selectedDevice.content, () => setSelectedDeviceId(null), showAppDescription, () => setShowAppDescription(!showAppDescription));
  }

  // 1. Renderizando a Lista de Dispositivos Principal
  return (
    <>
      {/* Alerta Global */}
      {config.globalAlert?.enabled && !alertDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0c0e12] border border-slate-700 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative"
          >
            <button 
              onClick={() => setAlertDismissed(true)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center ${config.globalAlert.type === 'danger' ? 'bg-red-500/20 text-red-500' : config.globalAlert.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{config.globalAlert.title}</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{config.globalAlert.text}</p>
            <button 
              onClick={() => setAlertDismissed(true)}
              className="w-full py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md uppercase">QUAL É O SEU DISPOSITIVO PRINCIPAL ?</h2>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4 w-full relative z-10">
            {config.devices.filter(d => d.visible !== false).map(device => (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelectedDeviceId(device.id)}
                className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
              >
                <span className="font-bold text-white text-lg tracking-wide">{device.name}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
            >
              VOLTAR
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
