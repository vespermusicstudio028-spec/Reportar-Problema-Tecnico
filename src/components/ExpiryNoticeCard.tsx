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
  msg.includes('[AVISO_VENCIMENTO_3D]') && msg.includes('[/AVISO_VENCIMENTO_3D]');

export const parseExpiryNotice3DMessage = (msg: string): ExpiryNoticePayload | null => {
  try {
    const match = msg.match(/\[AVISO_VENCIMENTO_3D\]([\s\S]*?)\[\/AVISO_VENCIMENTO_3D\]/);
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

  const pixKey = payload.pixKey || 'thebestiptv10@gmail.com';
  const whatsappNumber = payload.whatsapp || '5521959368651';
  const imageUrl = payload.imageUrl || '/vence-em-3-dias.jpg';

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
      <div className="w-full max-w-sm sm:max-w-md my-2 rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-b from-[#181d2c] via-[#121622] to-[#0c0f17] shadow-2xl shadow-amber-950/30 text-white select-none">
        {/* Cabeçalho do Card */}
        <div className="bg-gradient-to-r from-amber-600/40 via-orange-600/30 to-amber-600/20 px-3.5 py-2.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Clock size={14} className="animate-pulse" />
            </div>
            <span className="text-xs font-black tracking-wider text-amber-200 uppercase">
              Aviso de Vencimento
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wide shadow-sm">
            Vence em 3 Dias
          </span>
        </div>

        {/* Imagem do Flyer de Vencimento */}
        <div className="p-3 bg-black/40 flex justify-center relative group">
          <img
            src={imageUrl}
            alt="Seu plano vence em 3 dias"
            className="w-full max-w-[280px] sm:max-w-[310px] rounded-xl border border-amber-500/30 shadow-2xl object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
            onClick={() => setShowImageModal(true)}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-5 right-6 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-200 border border-amber-500/40 flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity"
            title="Clique para ver imagem ampliada"
          >
            <Eye size={12} />
            <span>Ver Ampliado</span>
          </button>
        </div>

        {/* Mensagem de Texto Explicativa */}
        <div className="p-4 space-y-3 bg-[#111520]/80 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-xs text-slate-200 leading-relaxed">
            <p className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
              <span>☀️</span> Bom dia!
            </p>
            <p>
              Informamos que o seu plano de streaming <strong className="text-amber-200 font-black">vence em 3 dias</strong>.
            </p>
            <p className="text-amber-100/90 font-medium">
              Por favor, realize o seu pagamento para <strong className="text-rose-300 font-extrabold underline decoration-rose-500/50">não perder o sinal</strong> e continuar assistindo aos canais, filmes e séries sem interrupções!
            </p>
            <p className="text-slate-300 pt-0.5">
              Para renovar seu acesso, basta clicar no botão <strong className="text-amber-300 font-bold">Renovar</strong> abaixo:
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-1">
            {/* Botão Principal: Renovar */}
            <button
              type="button"
              onClick={handleRenewClick}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RefreshCcw size={16} className="text-slate-950 animate-spin-reverse" />
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
                'Olá! Recebi o aviso de que meu plano vence em 3 dias e gostaria de realizar a renovação.'
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
