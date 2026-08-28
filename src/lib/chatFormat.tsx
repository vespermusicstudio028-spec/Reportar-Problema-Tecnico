import React from 'react';

/**
 * Formata o texto das mensagens do chat transformando palavras ou frases
 * entre asteriscos (*texto*) em negrito e com cor chamativa/destaque.
 */
export function renderFormattedChatMessageText(text: string, isSenderSelf: boolean = false): React.ReactNode {
  if (!text) return null;

  // Se não houver asterisco, retorna o texto simples
  if (!text.includes('*')) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  // Quebra mantendo os delimitadores (*conteúdo*)
  const parts = text.split(/(\*[^*]+\*)/g);

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
