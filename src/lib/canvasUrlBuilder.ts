/**
 * Utilitário para construir e enriquecer links da Área do Cliente (Canva / Página)
 * com os dados cadastrais do cliente, tempo do aplicativo, nome do app e vencimento do sinal.
 */

export interface CanvasClientUrlParams {
  nome?: string;
  codigo?: string;
  app?: string;
  tempo_app?: string;
  vencimento_streaming?: string;
  telefone?: string;
  // Dados do perfil do admin/suporte
  suporte_nome?: string;
  suporte_whatsapp?: string;
}

export function buildCanvasClientUrl(
  baseUrl: string,
  params: CanvasClientUrlParams
): string {
  if (!baseUrl) return '';
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';

  try {
    const hasProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const url = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    if (params.suporte_nome) url.searchParams.set('suporte_nome', params.suporte_nome);
    if (params.suporte_whatsapp) url.searchParams.set('suporte_whatsapp', params.suporte_whatsapp);
    if (params.nome) url.searchParams.set('nome', params.nome);
    if (params.codigo) url.searchParams.set('codigo', params.codigo);
    if (params.app) url.searchParams.set('app', params.app);
    if (params.tempo_app) url.searchParams.set('tempo_app', params.tempo_app);
    if (params.vencimento_streaming) url.searchParams.set('vencimento_streaming', params.vencimento_streaming);
    if (params.telefone) url.searchParams.set('telefone', params.telefone);

    return url.toString();
  } catch {
    // Fallback para URLs que não são parseáveis de forma padrão pelo construtor URL
    const parts = trimmed.split('?');
    const cleanBase = parts[0];
    const q = new URLSearchParams(parts[1] || '');

    if (params.suporte_nome) q.set('suporte_nome', params.suporte_nome);
    if (params.suporte_whatsapp) q.set('suporte_whatsapp', params.suporte_whatsapp);
    if (params.nome) q.set('nome', params.nome);
    if (params.codigo) q.set('codigo', params.codigo);
    if (params.app) q.set('app', params.app);
    if (params.tempo_app) q.set('tempo_app', params.tempo_app);
    if (params.vencimento_streaming) q.set('vencimento_streaming', params.vencimento_streaming);
    if (params.telefone) q.set('telefone', params.telefone);

    const qs = q.toString();
    return qs ? `${cleanBase}?${qs}` : cleanBase;
  }
}
