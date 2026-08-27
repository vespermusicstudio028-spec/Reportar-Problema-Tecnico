// Utilitários para detecção, formatação e manipulação de comprovantes Pix e arquivos PDF no chat

export interface PixAttachmentPayload {
  fileName: string;
  fileSize: string;
  fileData: string; // Base64 data URL
  caption?: string;
  isPix?: boolean;
}

const PIX_PREFIX = '[PIX_COMPROVANTE:';
const PIX_SUFFIX = ']';

/**
 * Constrói a mensagem codificada contendo o payload do PDF de pagamento Pix
 */
export function buildPixPdfMessage(payload: PixAttachmentPayload): string {
  const jsonStr = JSON.stringify({
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    fileData: payload.fileData,
    caption: payload.caption || 'Comprovante de pagamento via Pix em anexo.',
    isPix: true
  });
  return `${PIX_PREFIX}${jsonStr}${PIX_SUFFIX}`;
}

/**
 * Verifica se uma mensagem contém um comprovante Pix em PDF anexado
 */
export function isPixPdfMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  return message.trim().startsWith(PIX_PREFIX) && message.trim().endsWith(PIX_SUFFIX);
}

/**
 * Decodifica o payload do comprovante Pix a partir da mensagem
 */
export function parsePixPdfMessage(message: string): PixAttachmentPayload | null {
  if (!isPixPdfMessage(message)) return null;
  try {
    const trimmed = message.trim();
    const jsonStr = trimmed.slice(PIX_PREFIX.length, -PIX_SUFFIX.length);
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.fileData && parsed.fileName) {
      return {
        fileName: parsed.fileName,
        fileSize: parsed.fileSize || 'PDF',
        fileData: parsed.fileData,
        caption: parsed.caption || '',
        isPix: parsed.isPix ?? true
      };
    }
    return null;
  } catch (err) {
    console.error('Erro ao decodificar comprovante Pix:', err);
    return null;
  }
}

/**
 * Formata o tamanho de arquivo em KB / MB
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Mensagem de resposta automática imediata do chat ao receber um comprovante Pix
 */
export function getAutomatedPixReceivedMessage(clientName: string = 'Cliente'): string {
  return `🤖 Olá, ${clientName}! 

📄 Recebemos o seu **Comprovante de Pagamento Pix** com sucesso!

⚡ **Status do Pagamento:** Em Análise / Verificação Automática
🔍 Nosso sistema já registrou o seu documento e está validando os dados da transação.

✅ Assim que a compensação for confirmada, seu acesso será liberado/renovado e você receberá a confirmação aqui mesmo no chat.

🍿 *Obrigado pela preferência! — The Best IPTV*`;
}

/**
 * Mensagem padrão de confirmação e reconhecimento de pagamento Pix enviada pelo Admin
 */
export function getAutomatedPixConfirmedMessage(clientName: string = 'Cliente'): string {
  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `🎉 **PAGAMENTO PIX RECONHECIDO E CONFIRMADO!** 🎉

Olá, ${clientName}! Seu pagamento via Pix foi validado e aprovado com sucesso!

🟢 **Status:** APROVADO & LIBERADO
📅 **Data de Confirmação:** ${agora}
🍿 **Acesso:** Liberado / Renovado

Agradecemos pela preferência e desejamos uma excelente programação com a **The Best IPTV**! 📺✨`;
}
