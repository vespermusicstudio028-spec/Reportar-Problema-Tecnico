import React from 'react';

/**
 * Formata o texto das mensagens do chat transformando palavras ou frases
 * entre asteriscos (*texto*) em negrito e com cor chamativa/destaque.
 */
export function renderFormattedChatMessageText(text: string, isSenderSelf: boolean = false): React.ReactNode {
  if (!text) return null;

  // Remover marcador de pagamento da renderização de texto (será renderizado separado)
  const cleanText = text.replace(/\[PAYMENT_LINK:[^\]]+\]/g, '').trim();

  // Se não houver asterisco, retorna o texto simples
  if (!cleanText.includes('*')) {
    return <span className="whitespace-pre-wrap">{cleanText}</span>;
  }

  // Quebra mantendo os delimitadores (*conteúdo*)
  const parts = cleanText.split(/(\*[^*]+\*)/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          const innerContent = part.slice(1, -1);
          return (
            <strong
              key={index}
              className={`font-black tracking-wide ${
                isSenderSelf
                  ? 'text-amber-200 font-extrabold bg-amber-400/15 px-1 py-0.5 rounded-md border border-amber-300/30'
                  : 'text-amber-300 font-extrabold bg-amber-500/15 px-1 py-0.5 rounded-md border border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              }`}
            >
              {innerContent}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Detecta e extrai o link de pagamento de uma mensagem.
 * Formato: [PAYMENT_LINK:url:label:value]
 */
export function extractPaymentLink(text: string): { url: string; label: string; value: string } | null {
  // Novo formato seguro com delimitador '|||'
  const match = text.match(/\[PAYMENT_LINK:(.+?)\|\|\|(.+?)\|\|\|([^\]]+)\]/);
  if (match) {
    return {
      url: match[1].trim(),
      label: match[2].trim(),
      value: match[3].trim(),
    };
  }

  // Compatibilidade caso haja mensagens legadas no banco
  const matchOld = text.match(/\[PAYMENT_LINK:(https:\/\/[^:\s\]]+):?([^:]*):?([^\]]*)\]/i);
  if (matchOld) {
    return {
      url: matchOld[1].trim(),
      label: matchOld[2]?.trim() || 'Pagar via Mercado Pago',
      value: matchOld[3]?.trim() || '',
    };
  }

  return null;
}

/**
 * Card visual de pagamento via Mercado Pago para o chat.
 */
export function PaymentLinkCard({ url, label, value }: { url: string; label: string; value: string }) {
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-emerald-500/40 shadow-lg shadow-emerald-900/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700/40 to-teal-700/30 px-4 py-2.5 flex items-center gap-2 border-b border-emerald-500/30">
        <span className="text-lg">💳</span>
        <div>
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Mercado Pago</p>
          <p className="text-[10px] text-emerald-400/70">Pagamento rápido e seguro</p>
        </div>
      </div>
      {/* Body */}
      <div className="bg-[#0d1a14]/80 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-300 font-medium leading-snug">{label}</p>
          {value && value !== 'Ver valor no link' && (
            <p className="text-lg font-black text-emerald-300 mt-0.5">{value}</p>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/30 transition-all active:scale-95 flex items-center gap-1.5"
        >
          Pagar agora →
        </a>
      </div>
    </div>
  );
}
