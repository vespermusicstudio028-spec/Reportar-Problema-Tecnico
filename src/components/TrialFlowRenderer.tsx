import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrialConfig, TrialDevice, TrialSubOption, TrialContentBlock } from '../types/trial';

interface Props {
  config: TrialConfig;
  onClose: () => void;
}

export function TrialFlowRenderer({ config, onClose }: Props) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string | null>(null);
  const [showAppDescription, setShowAppDescription] = useState(false);
  const [macCode, setMacCode] = useState('');
  const [deviceKey, setDeviceKey] = useState('');

  const selectedDevice = config.devices.find(d => d.id === selectedDeviceId);
  const selectedSubOption = selectedDevice?.subOptions?.find(s => s.id === selectedSubOptionId);

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

            {content.mediaType === 'image' && content.mediaUrl && (
              <div className="w-full rounded-2xl overflow-hidden mb-6 shadow-lg shadow-black/50 border border-white/10">
                <img src={content.mediaUrl} alt="Mídia" className="w-full h-auto object-cover" />
              </div>
            )}
            
            {content.mediaType === 'video' && content.mediaUrl && (
              <div className="w-full rounded-2xl overflow-hidden mb-6 shadow-lg shadow-black/50 border border-white/10">
                {(() => {
                  const embed = getEmbedUrl(content.mediaUrl);
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
                })()}
              </div>
            )}

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
              <div className="bg-slate-800/50 rounded-xl p-4 mt-6 border border-slate-700/50 space-y-3">
                <h3 className="font-bold text-white text-sm uppercase text-center">Dados do Aplicativo (Opcional)</h3>
                <p className="text-xs text-slate-400 mb-2 text-center">Se o aplicativo pedir, preencha abaixo para liberar.</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Código MAC</label>
                  <input
                    type="text"
                    value={macCode}
                    onChange={(e) => setMacCode(e.target.value)}
                    placeholder="Ex: a1:b2:c3:d4:e5:f6"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Device Key / Código do App</label>
                  <input
                    type="text"
                    value={deviceKey}
                    onChange={(e) => setDeviceKey(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>
                
                <a 
                  href={`https://wa.me/5521959368651?text=${encodeURIComponent(`Olá, baixei o aplicativo e aqui estão os meus dados para liberação:\n\n*MAC:* ${macCode || 'Não informado'}\n*Código (Key):* ${deviceKey || 'Não informado'}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full"
                >
                  Enviar Dados p/ WhatsApp
                </a>
              </div>
            )}

            {content.whatsappText && (
              <div className="mt-4 text-center">
                <a 
                  href={`https://wa.me/5521959368651?text=${encodeURIComponent(content.whatsappText)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  Suporte pelo WhatsApp
                </a>
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
            {selectedDevice.subOptions?.map(sub => (
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
          {config.devices.map(device => (
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
  );
}
