import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Tv,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Film,
  Smartphone,
  CreditCard,
  MessageCircle,
  Clock,
  Layers,
  Star,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Play,
  Image as ImageIcon,
  Maximize2,
  Loader2
} from 'lucide-react';
import { StoreProduct } from '../types/store';
import { fetchStoreProducts, formatVideoEmbedUrl } from '../lib/storeService';

interface StoreSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCode?: string;
  clientName?: string;
  isAdmin?: boolean;
  onSelectPlanForChat?: (planName: string, price: string) => void;
  onAddPoint?: () => void;
  onOpenComprovante?: () => void;
}

export const StoreSalesModal: React.FC<StoreSalesModalProps> = ({
  isOpen,
  onClose,
  clientCode,
  clientName,
  isAdmin = false,
  onSelectPlanForChat,
  onAddPoint,
  onOpenComprovante,
}) => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoModal, setActivePhotoModal] = useState<{ images: string[]; activeIndex: number; title: string } | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStoreProducts();
    }
  }, [isOpen]);

  const loadStoreProducts = async () => {
    setLoading(true);
    const data = await fetchStoreProducts(true);
    setProducts(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleChoosePlan = (plan: StoreProduct) => {
    if (plan.payment_link && plan.payment_link.trim()) {
      window.open(plan.payment_link.trim(), '_blank', 'noopener,noreferrer');
    } else if (onSelectPlanForChat) {
      onSelectPlanForChat(plan.name, plan.price);
      onClose();
    }
  };

  const handleAskInChat = (plan: StoreProduct) => {
    if (onSelectPlanForChat) {
      onSelectPlanForChat(plan.name, plan.price);
    }
    onClose();
  };

  const getThemeClasses = (color: string, isPopular?: boolean) => {
    if (isPopular) {
      return {
        cardBorder: 'border-purple-500/70 shadow-2xl shadow-purple-500/20 bg-gradient-to-b from-[#1a162e] to-[#0f111c]',
        badgeGradient: 'from-amber-500 via-orange-500 to-purple-600',
        btnBg: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30'
      };
    }
    switch (color) {
      case 'emerald':
        return {
          cardBorder: 'border-emerald-500/40 hover:border-emerald-500/70 bg-[#101918]',
          badgeGradient: 'from-emerald-500 to-teal-500',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
        };
      case 'amber':
        return {
          cardBorder: 'border-amber-500/40 hover:border-amber-500/70 bg-[#181610]',
          badgeGradient: 'from-amber-500 to-yellow-500',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
        };
      case 'blue':
      default:
        return {
          cardBorder: 'border-blue-500/40 hover:border-blue-500/70 bg-[#0f1422]',
          badgeGradient: 'from-blue-500 to-cyan-500',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
        };
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-[#0c101a] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header Superior com Destaque */}
          <div className="relative px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#131929] to-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 p-0.5 shadow-lg shadow-orange-500/20">
                <div className="w-full h-full bg-[#0c101a] rounded-[14px] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Loja & Planos de Vendas
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Sparkles size={11} /> Ofertas Oficiais
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha o plano ideal para sua casa com liberação imediata e sem fidelidade
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
                title="Fechar Loja"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Banner de Vantagens Rápidas */}
          <div className="bg-[#111624] border-b border-slate-800/80 px-4 py-2.5 sm:px-6 overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center justify-between gap-4 text-xs min-w-max text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Zap size={14} /> Liberação Rápida após Pagamento
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <ShieldCheck size={14} /> Servidor Antitrava 99.9% Online
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <Film size={14} /> +100 Mil Conteúdos 4K / Full HD
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Clock size={14} /> Suporte no Chat & WhatsApp
              </div>
            </div>
          </div>

          {/* Conteúdo Principal Rolável */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-amber-500" />
                <span className="text-sm">Carregando catálogo da loja...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <ShoppingBag size={40} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nossos planos estão sendo atualizados no momento.</p>
                <p className="text-xs text-slate-500">Por favor, entre em contato direto pelo suporte no chat abaixo!</p>
              </div>
            ) : (
              /* Grid dos Produtos Dinâmicos */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {products.map((plan) => {
                  const theme = getThemeClasses(plan.color_theme, plan.is_popular);

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-3xl border p-5 sm:p-6 transition-all flex flex-col justify-between ${theme.cardBorder}`}
                    >
                      {/* Badge Destaque no Topo */}
                      {plan.badge && (
                        <div className="absolute -top-3 right-5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r ${plan.badge_color || theme.badgeGradient} text-white shadow-lg`}>
                            <Star size={10} className="fill-white" />
                            {plan.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* Título e Telas */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                              {plan.name}
                            </h3>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                              <Tv size={13} className="text-slate-400" />
                              {plan.screens}
                            </span>
                          </div>
                        </div>

                        {/* Preço */}
                        <div className="my-3 pb-3 border-b border-slate-800/80 flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {plan.price}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {plan.period}
                          </span>
                        </div>

                        {/* Galeria de Fotos (Até 5 Fotos) */}
                        {plan.images && plan.images.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-semibold">
                              <span className="flex items-center gap-1">
                                <ImageIcon size={12} className="text-blue-400" />
                                Fotos do Produto ({plan.images.length})
                              </span>
                              <span className="text-slate-500">Clique para ampliar</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {plan.images.map((imgUrl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActivePhotoModal({ images: plan.images, activeIndex: i, title: plan.name })}
                                  className="group relative aspect-square rounded-xl overflow-hidden border border-slate-700/80 hover:border-amber-400 transition-all active:scale-95 shadow-sm"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Foto ${i + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 size={13} className="text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botão de Vídeo Demonstrativo */}
                        {plan.video_url && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => setActiveVideoModal({ url: plan.video_url!, title: plan.name })}
                              className="w-full py-2.5 px-3.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 shadow-md"
                            >
                              <Play size={14} className="fill-purple-300 text-purple-300" />
                              <span>Assistir Vídeo Demonstrativo do Produto</span>
                            </button>
                          </div>
                        )}

                        {/* Descrição Detalhada */}
                        {plan.description && (
                          <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-black/20 p-3 rounded-xl border border-slate-800/60">
                            {plan.description}
                          </p>
                        )}

                        {/* Lista de Benefícios */}
                        {plan.features && plan.features.length > 0 && (
                          <ul className="space-y-2 mb-5">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Botões de Ação do Card */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleChoosePlan(plan)}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${theme.btnBg}`}
                        >
                          <CreditCard size={15} />
                          <span>Comprar / Assinar Agora</span>
                          <ExternalLink size={13} className="opacity-70" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAskInChat(plan)}
                          className="w-full py-2 px-3 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <MessageCircle size={13} />
                          <span>Tirar dúvidas deste plano no Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Caixa Informativa sobre Formas de Pagamento & Comprovante */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#131929] to-slate-900/90 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Formas de Pagamento Seguras
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aceitamos <strong className="text-emerald-400">Pix</strong> com liberação instantânea, Cartão de Crédito e Mercado Pago.
                  </p>
                </div>
              </div>

              {onOpenComprovante && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenComprovante();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <span>Já pagou? Enviar Comprovante</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Rodapé Informativo */}
          <div className="px-5 py-3.5 sm:px-6 bg-[#090d14] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="text-[11px] sm:text-xs">
              {clientName ? `Logado como: ${clientName}` : 'Atendimento direto com suporte'}
              {clientCode ? ` (${clientCode})` : ''}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Voltar ao Chat
            </button>
          </div>
        </motion.div>
      </div>

      {/* Modal de Zoom de Fotos do Produto */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="font-bold text-sm">{activePhotoModal.title} — Foto {activePhotoModal.activeIndex + 1} de {activePhotoModal.images.length}</span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative w-full aspect-video sm:aspect-[4/3] max-h-[75vh] flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-slate-800">
              <img
                src={activePhotoModal.images[activePhotoModal.activeIndex]}
                alt=""
                className="max-h-full max-w-full object-contain"
              />

              {activePhotoModal.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhotoModal(prev => prev ? {
                      ...prev,
                      activeIndex: (prev.activeIndex - 1 + prev.images.length) % prev.images.length
                    } : null)}
                    className="absolute left-3 p-2.5 rounded-full bg-black/70 hover:bg-black text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePhotoModal(prev => prev ? {
                      ...prev,
                      activeIndex: (prev.activeIndex + 1) % prev.images.length
                    } : null)}
                    className="absolute right-3 p-2.5 rounded-full bg-black/70 hover:bg-black text-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {activePhotoModal.images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {activePhotoModal.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoModal(prev => prev ? { ...prev, activeIndex: i } : null)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      activePhotoModal.activeIndex === i ? 'border-amber-400 scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Vídeo do Produto */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Play size={14} className="fill-purple-400 text-purple-400" />
                Vídeo: {activeVideoModal.title}
              </span>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black">
              {(() => {
                const vInfo = formatVideoEmbedUrl(activeVideoModal.url);
                if (vInfo.type === 'youtube' || vInfo.type === 'vimeo') {
                  return (
                    <iframe
                      src={vInfo.embedUrl}
                      title={activeVideoModal.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <video
                    src={activeVideoModal.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
