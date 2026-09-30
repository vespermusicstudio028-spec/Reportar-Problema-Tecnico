import React, { useState } from 'react';
import { Clock, RefreshCcw, Copy, Check, MessageCircle, Eye, X, AlertTriangle } from 'lucide-react';

export interface ExpiryNoticePayload {
  imageUrl: string;
  text?: string;
  days?: number;
  pixKey?: string;
  whatsapp?: string;
}

export const isExpiryNotice3DMessage = (msg: string): boolean =>
  (msg.includes('[AVISO_VENCIMENTO_3D]') && msg.includes('[/AVISO_VENCIMENTO_3D]')) ||
  (msg.includes('[AVISO_VENCIMENTO_2D]') && msg.includes('[/AVISO_VENCIMENTO_2D]')) ||
  (msg.includes('[AVISO_VENCIMENTO_AMANHA]') && msg.includes('[/AVISO_VENCIMENTO_AMANHA]')) ||
  (msg.includes('[AVISO_VENCIMENTO_HOJE]') && msg.includes('[/AVISO_VENCIMENTO_HOJE]'));

export const parseExpiryNotice3DMessage = (msg: string): ExpiryNoticePayload | null => {
  try {
    const match = msg.match(/\[AVISO_VENCIMENTO_(?:3D|2D|AMANHA|HOJE)\]([\s\S]*?)\[\/AVISO_VENCIMENTO_(?:3D|2D|AMANHA|HOJE)\]/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

interface ExpiryNoticeCardProps {
  payload: ExpiryNoticePayload;
  isAdmin?: boolean;
  onInitiateRenewal?: () => void;
  onOpenStreamingSite?: () => void;
}

export const ExpiryNoticeCard: React.FC<ExpiryNoticeCardProps> = ({
  payload,
  isAdmin = false,
  onInitiateRenewal,
  onOpenStreamingSite,
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const isToday = payload.days === 0 || (payload.imageUrl && payload.imageUrl.includes('vence-hoje'));
  const isTomorrow = payload.days === 1 || (payload.imageUrl && payload.imageUrl.includes('vence-amanha'));
  const is2Days = payload.days === 2 || (payload.imageUrl && payload.imageUrl.includes('vence-em-2-dias'));
  const pixKey = payload.pixKey || 'thebestiptv10@gmail.com';
  const whatsappNumber = payload.whatsapp || '5521959368651';
  const imageUrl = payload.imageUrl || (
    isToday ? '/vence-hoje.jpg' :
    isTomorrow ? '/vence-amanha.png' :
    is2Days ? '/vence-em-2-dias.jpg' :
    '/vence-em-3-dias.jpg'
  );

  const handleCopyPix = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    });
  };

  const handleRenewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) {
      if (onOpenStreamingSite) {
        onOpenStreamingSite();
      }
    } else {
      if (onInitiateRenewal) {
        onInitiateRenewal();
      }
    }
  };

  return (
    <>
      <div className={`w-full max-w-sm sm:max-w-md my-2 rounded-2xl overflow-hidden border ${
        isToday
          ? 'border-red-500/50 shadow-red-950/40'
          : isTomorrow
          ? 'border-orange-500/50 shadow-orange-950/40'
          : is2Days
          ? 'border-amber-500/50 shadow-amber-950/30'
          : 'border-amber-500/40 shadow-amber-950/30'
      } bg-gradient-to-b from-[#181d2c] via-[#121622] to-[#0c0f17] shadow-2xl text-white select-none`}>
        {/* Cabeçalho do Card */}
        <div className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
          isToday
            ? 'bg-gradient-to-r from-red-600/40 via-rose-600/30 to-red-600/20 border-red-500/30'
            : isTomorrow
            ? 'bg-gradient-to-r from-orange-600/40 via-amber-600/30 to-orange-600/20 border-orange-500/30'
            : is2Days
            ? 'bg-gradient-to-r from-amber-600/40 via-orange-600/30 to-amber-600/20 border-amber-500/35'
            : 'bg-gradient-to-r from-amber-600/40 via-orange-600/30 to-amber-600/20 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
              isToday
                ? 'bg-red-500/30 border-red-400/40 text-red-300'
                : isTomorrow
                ? 'bg-orange-500/30 border-orange-400/40 text-orange-300'
                : is2Days
                ? 'bg-amber-500/30 border-amber-400/40 text-amber-300'
                : 'bg-amber-500/30 border-amber-400/40 text-amber-300'
            }`}>
              {isToday || isTomorrow ? <AlertTriangle size={14} className="animate-pulse" /> : <Clock size={14} className="animate-pulse" />}
            </div>
            <span className={`text-xs font-black tracking-wider uppercase ${
              isToday ? 'text-red-200' : isTomorrow ? 'text-orange-200' : 'text-amber-200'
            }`}>
              Aviso de Vencimento
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wide shadow-sm ${
            isToday
              ? 'bg-gradient-to-r from-red-600 to-rose-600 animate-pulse'
              : isTomorrow
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 animate-pulse font-bold'
              : is2Days
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 font-bold'
              : 'bg-gradient-to-r from-rose-500 to-amber-500'
          }`}>
            {isToday ? '🚨 Vence Hoje' : isTomorrow ? '⚠️ Vence Amanhã' : is2Days ? '⏳ Vence em 2 Dias' : 'Vence em 3 Dias'}
          </span>
        </div>

        {/* Imagem do Flyer de Vencimento */}
        <div className="p-3 bg-black/40 flex justify-center relative group">
          <img
            src={imageUrl}
            alt={isToday ? "Seu plano vence hoje" : isTomorrow ? "Seu plano vence amanhã" : is2Days ? "Seu plano vence em 2 dias" : "Seu plano vence em 3 dias"}
            className={`w-full max-w-[280px] sm:max-w-[310px] rounded-xl border shadow-2xl object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.01] ${
              isToday ? 'border-red-500/40' : isTomorrow ? 'border-orange-500/40' : is2Days ? 'border-amber-500/40' : 'border-amber-500/30'
            }`}
            onClick={() => setShowImageModal(true)}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className={`absolute bottom-5 right-6 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold border flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity ${
              isToday ? 'text-red-200 border-red-500/40' : isTomorrow ? 'text-orange-200 border-orange-500/40' : 'text-amber-200 border-amber-500/40'
            }`}
            title="Clique para ver imagem ampliada"
          >
            <Eye size={12} />
            <span>Ver Ampliado</span>
          </button>
        </div>

        {/* Mensagem de Texto Explicativa */}
        <div className="p-4 space-y-3 bg-[#111520]/80 border-t border-slate-800">
          <div className={`p-3 rounded-xl border space-y-1.5 text-xs text-slate-200 leading-relaxed ${
            isToday
              ? 'bg-red-500/10 border-red-500/25'
              : isTomorrow
              ? 'bg-orange-500/10 border-orange-500/25'
              : is2Days
              ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-amber-500/10 border-amber-500/25'
          }`}>
            <p className={`font-extrabold text-sm flex items-center gap-1.5 ${
              isToday ? 'text-red-400' : isTomorrow ? 'text-orange-400' : 'text-amber-300'
            }`}>
              <span>☀️</span> Bom dia!
            </p>
            {isToday ? (
              <>
                <p>
                  Informamos que o seu plano de streaming <strong className="text-red-300 font-black">vence HOJE</strong>.
                </p>
                <p className="text-red-100/90 font-medium">
                  Por favor, realize o seu pagamento antes do vencimento para <strong className="text-rose-300 font-extrabold underline decoration-rose-500/50">não ficar sem sinal</strong> e continuar assistindo aos canais, filmes e séries sem interrupções!
                </p>
              </>
            ) : isTomorrow ? (
              <>
                <p>
                  Informamos que o seu plano de streaming <strong className="text-orange-300 font-black">vence AMANHÃ</strong>.
                </p>
                <p className="text-orange-100/90 font-medium">
                  Por favor, realize o seu pagamento antes do vencimento para <strong className="text-amber-300 font-extrabold underline decoration-amber-500/50">não ficar sem sinal</strong> e continuar assistindo aos canais, filmes e séries sem interrupções!
                </p>
              </>
            ) : is2Days ? (
              <>
                <p>
                  Informamos que o seu plano de streaming <strong className="text-amber-300 font-black">vence em 2 DIAS</strong>.
                </p>
                <p className="text-amber-100/90 font-medium">
                  Por favor, realize o seu pagamento antes do vencimento para <strong className="text-orange-300 font-extrabold underline decoration-orange-500/50">não ficar sem sinal</strong> e continuar assistindo aos canais, filmes e séries sem interrupções!
                </p>
              </>
            ) : (
              <>
                <p>
                  Informamos que o seu plano de streaming <strong className="text-amber-200 font-black">vence em 3 dias</strong>.
                </p>
                <p className="text-amber-100/90 font-medium">
                  Por favor, realize o seu pagamento para <strong className="text-rose-300 font-extrabold underline decoration-rose-500/50">não perder o sinal</strong> e continuar assistindo aos canais, filmes e séries sem interrupções!
                </p>
              </>
            )}
            <p className="text-slate-300 pt-0.5">
              Para renovar seu acesso, basta clicar no botão <strong className={`font-bold ${isToday ? 'text-red-300' : isTomorrow ? 'text-orange-300' : 'text-amber-300'}`}>Renovar</strong> abaixo:
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-1">
            {/* Botão Principal: Renovar */}
            <button
              type="button"
              onClick={handleRenewClick}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                isToday
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-950/50'
                  : isTomorrow
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 shadow-orange-950/50'
                  : is2Days
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-950/50'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-orange-950/40'
              }`}
            >
              <RefreshCcw size={16} className={isToday ? 'text-white animate-spin-reverse' : 'text-slate-950 animate-spin-reverse'} />
              <span>{isAdmin ? '🔄 Abrir Opções de Renovação' : '🔄 Renovar Meu Acesso Agora'}</span>
            </button>

            {/* Chave Pix Rápida */}
            <div className="p-2.5 rounded-xl bg-[#161b28] border border-slate-700/80 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Chave Pix (E-mail):</p>
                <p className="text-xs font-mono font-bold text-emerald-400 truncate">{pixKey}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyPix}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title="Copiar Chave Pix"
              >
                {copiedPix ? (
                  <>
                    <Check size={13} className="text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar Pix</span>
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                isToday
                  ? 'Olá! Recebi o aviso de que meu plano vence hoje e gostaria de realizar a renovação.'
                  : isTomorrow
                  ? 'Olá! Recebi o aviso de que meu plano vence amanhã e gostaria de realizar a renovação.'
                  : is2Days
                  ? 'Olá! Recebi o aviso de que meu plano vence em 2 dias e gostaria de realizar a renovação.'
                  : 'Olá! Recebi o aviso de que meu plano vence em 3 dias e gostaria de realizar a renovação.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/35 text-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <MessageCircle size={14} className="text-emerald-400" />
              <span>Dúvidas? Chamar no WhatsApp: (21) 95936-8651</span>
            </a>
          </div>
        </div>
      </div>

      {/* Modal / Lightbox para ver imagem em tela cheia */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
            <img
              src={imageUrl}
              alt="Seu plano vence em 3 dias - Ampliado"
              className="max-h-[85vh] w-auto rounded-2xl border border-amber-500/40 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
