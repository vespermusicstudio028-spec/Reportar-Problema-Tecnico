/**
 * Utilitários centralizados para detecção, normalização e embutimento (embed) de vídeos
 * Suporta YouTube (vídeos normais, Shorts, canais, embeds, youtu.be), Google Drive,
 * Vimeo, Loom, Dailymotion, arquivos diretos (MP4, WebM, MOV) e links encurtados.
 */

export interface VideoEmbedInfo {
  type: 'youtube' | 'vimeo' | 'drive' | 'loom' | 'dailymotion' | 'direct' | 'other';
  embedUrl: string;
  rawUrl: string;
  directUrl?: string;
  isIframe: boolean;
  canEmbed: boolean;
  serviceName: string;
}

/**
 * Garante que a URL comece com http:// ou https:// para evitar erros de rotas relativas
 */
export function ensureAbsoluteUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|\/\/|data:|blob:|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Verifica se a URL informada aponta para um serviço de vídeo ou arquivo de vídeo
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim().toLowerCase();
  if (!u) return false;

  // YouTube
  if (u.includes('youtube.com') || u.includes('youtu.be')) return true;
  // Google Drive
  if (u.includes('drive.google.com')) return true;
  // Vimeo
  if (u.includes('vimeo.com')) return true;
  // Loom
  if (u.includes('loom.com/share') || u.includes('loom.com/embed')) return true;
  // Dailymotion
  if (u.includes('dailymotion.com') || u.includes('dai.ly')) return true;
  // Extensões de vídeo direto
  if (/\.(mp4|webm|ogg|mov|m4v|m3u8|mkv)(\?.*)?$/i.test(u)) return true;
  // Supabase Storage ou CDNs com pasta de vídeo
  if (u.includes('/storage/v1/object/public/store-media') && (u.includes('.mp4') || u.includes('.mov') || u.includes('.webm'))) return true;

  return false;
}

/**
 * Converte qualquer URL de vídeo suportada em uma URL pronta para reprodução em <iframe> ou <video>
 */
export function getVideoEmbedInfo(url?: string | null): VideoEmbedInfo {
  const absoluteUrl = ensureAbsoluteUrl(url);
  if (!absoluteUrl) {
    return {
      type: 'other',
      embedUrl: '',
      rawUrl: '',
      isIframe: false,
      canEmbed: false,
      serviceName: 'Desconhecido'
    };
  }

  // 1. YouTube (vídeos comuns, shorts, live, embed, youtu.be)
  const ytMatch = absoluteUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`,
      rawUrl: absoluteUrl,
      isIframe: true,
      canEmbed: true,
      serviceName: 'YouTube'
    };
  }

  // 2. Google Drive (file/d/ID, open?id=ID, uc?id=ID)
  const driveMatch = absoluteUrl.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?id=([a-zA-Z0-9_-]+))/i);
  const driveId = driveMatch ? (driveMatch[1] || driveMatch[2] || driveMatch[3]) : null;
  if (driveId) {
    return {
      type: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      rawUrl: absoluteUrl,
      isIframe: true,
      canEmbed: true,
      serviceName: 'Google Drive'
    };
  }

  // 3. Vimeo
  const vimeoMatch = absoluteUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`,
      rawUrl: absoluteUrl,
      isIframe: true,
      canEmbed: true,
      serviceName: 'Vimeo'
    };
  }

  // 4. Loom
  const loomMatch = absoluteUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1`,
      rawUrl: absoluteUrl,
      isIframe: true,
      canEmbed: true,
      serviceName: 'Loom'
    };
  }

  // 5. Dailymotion
  const dmMatch = absoluteUrl.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return {
      type: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`,
      rawUrl: absoluteUrl,
      isIframe: true,
      canEmbed: true,
      serviceName: 'Dailymotion'
    };
  }

  // 6. Arquivo direto de vídeo (MP4, WebM, MOV, etc.)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(absoluteUrl)) {
    return {
      type: 'direct',
      embedUrl: absoluteUrl,
      directUrl: absoluteUrl,
      rawUrl: absoluteUrl,
      isIframe: false,
      canEmbed: true,
      serviceName: 'Vídeo Direto'
    };
  }

  // 7. Encurtadores ou links externos genéricos (ex: abre.ai, bit.ly)
  return {
    type: 'other',
    embedUrl: absoluteUrl,
    directUrl: absoluteUrl,
    rawUrl: absoluteUrl,
    isIframe: false,
    canEmbed: false,
    serviceName: 'Vídeo Externo'
  };
}

/**
 * Detecta se o dispositivo atual é móvel (celular ou tablet)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua) || (window.innerWidth <= 768);
}

/**
 * Trava a orientação da tela do celular na horizontal (landscape).
 * Executa imediatamente na ação de toque do usuário para atender aos requisitos de segurança do navegador.
 */
export async function lockOrientationLandscape(element?: HTMLElement | null): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const target = element || document.documentElement;

    // 1. Tentar Fullscreen (a API Screen Orientation exige fullscreen na maioria dos navegadores mobile)
    if (target.requestFullscreen && !document.fullscreenElement) {
      await target.requestFullscreen().catch(() => {});
    } else if ((target as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
      await (target as any).webkitRequestFullscreen().catch(() => {});
    }

    // 2. Travar orientação em landscape / paisagem
    const screenAny = window.screen as any;
    if (screenAny && screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
      await screenAny.orientation.lock('landscape').catch(() => {});
      return true;
    } else if (screenAny && typeof screenAny.lockOrientation === 'function') {
      screenAny.lockOrientation('landscape');
      return true;
    } else if (screenAny && typeof screenAny.mozLockOrientation === 'function') {
      screenAny.mozLockOrientation('landscape');
      return true;
    } else if (screenAny && typeof screenAny.msLockOrientation === 'function') {
      screenAny.msLockOrientation('landscape');
      return true;
    }
  } catch (err) {
    console.warn('Orientação paisagem não suportada pelo navegador ou travada pelo sistema:', err);
  }
  return false;
}

/**
 * Destrava a orientação e restaura a tela normal (vertical / auto)
 */
export function unlockOrientation(): void {
  if (typeof window === 'undefined') return;
  try {
    const screenAny = window.screen as any;
    if (screenAny && screenAny.orientation && typeof screenAny.orientation.unlock === 'function') {
      screenAny.orientation.unlock();
    } else if (screenAny && typeof screenAny.unlockOrientation === 'function') {
      screenAny.unlockOrientation();
    }

    // Sair de tela cheia se ainda estiver ativo
    const docAny = document as any;
    if (docAny.fullscreenElement && docAny.exitFullscreen) {
      docAny.exitFullscreen().catch(() => {});
    } else if (docAny.webkitFullscreenElement && docAny.webkitExitFullscreen) {
      docAny.webkitExitFullscreen().catch(() => {});
    }
  } catch (err) {}
}

