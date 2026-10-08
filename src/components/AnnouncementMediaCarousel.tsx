import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react';

// Cache global em memória de imagens de informes já pré-carregadas e decodificadas na GPU
const preloadedAnnouncementImages = new Set<string>();

/**
 * Pré-carrega e decodifica imediatamente uma imagem na memória/GPU com zero delay.
 */
export const preloadAnnouncementImage = (url: string) => {
  if (!url || typeof window === 'undefined' || preloadedAnnouncementImages.has(url) || url.startsWith('data:video')) return;
  preloadedAnnouncementImages.add(url);
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.loading = 'eager';
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
  } catch {}
};

/**
 * Pré-carrega de forma prioritária todas as imagens de uma lista de informes com zero delay.
 */
export const preloadAnnouncementMediaList = (announcements: Array<{ mediaUrls?: string[]; mediaUrl?: string; mediaType?: string | null }>) => {
  if (!Array.isArray(announcements) || typeof window === 'undefined') return;
  announcements.forEach((ann) => {
    if (ann.mediaType === 'video') return;
    const urls = ann.mediaUrls && ann.mediaUrls.length > 0 ? ann.mediaUrls : (ann.mediaUrl ? [ann.mediaUrl] : []);
    urls.forEach((url) => {
      preloadAnnouncementImage(url);
    });
  });
};

interface AnnouncementMediaCarouselProps {
  mediaUrls: string[];
  mediaType?: 'image' | 'video' | null;
  onImageClick?: (url: string, allUrls: string[], index: number) => void;
  onRegisterView?: () => void;
  maxHeightClass?: string;
}

export const AnnouncementMediaCarousel: React.FC<AnnouncementMediaCarouselProps> = ({
  mediaUrls,
  mediaType = 'image',
  onImageClick,
  onRegisterView,
  maxHeightClass = 'max-h-60'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Pré-carrega e decodifica todas as mídias da lista de imediato (zero delay)
  useEffect(() => {
    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach((url) => {
        preloadAnnouncementImage(url);
      });
    }
  }, [mediaUrls]);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const total = mediaUrls.length;
  const currentUrl = mediaUrls[currentIndex] || mediaUrls[0];
  const isVideo = mediaType === 'video' || currentUrl.startsWith('data:video');

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasInteracted(true);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasInteracted(true);
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    setTouchStart(null);
  };

  const handleMediaClick = () => {
    if (onRegisterView) onRegisterView();
    if (!isVideo && onImageClick) {
      onImageClick(currentUrl, mediaUrls, currentIndex);
    }
  };

  // Se houver apenas 1 mídia: renderização imediata com zero delay e sem animações que atrasem a visualização
  if (total === 1) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group bg-[#0d1017] min-h-[160px] sm:min-h-[200px] flex items-center justify-center">
        {isVideo ? (
          <video src={currentUrl} className={`w-full ${maxHeightClass} object-cover`} controls />
        ) : (
          <div className="relative overflow-hidden cursor-zoom-in w-full h-full" onClick={handleMediaClick}>
            <img 
              src={currentUrl} 
              alt="Anexo" 
              loading="eager"
              decoding="sync"
              // @ts-ignore
              fetchPriority="high"
              className={`w-full ${maxHeightClass} object-cover group-hover:scale-105 transition-transform duration-300 block`}
            />
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 size={12} />
              CLIQUE PARA AMPLIAR
            </div>
          </div>
        )}
      </div>
    );
  }

  // Efeito de transição suave apenas após interação (ao mudar de foto)
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.15 }
      }
    })
  };

  return (
    <div 
      data-no-swipe="true"
      className="mt-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group bg-[#0d1017] select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Área da Foto com Exibição Instantânea no 1º frame e Transição ao navegar */}
      <div 
        className="relative overflow-hidden w-full flex items-center justify-center cursor-zoom-in min-h-[160px] sm:min-h-[200px]"
        onClick={handleMediaClick}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={hasInteracted ? slideVariants : undefined}
            initial={hasInteracted ? 'enter' : false}
            animate="center"
            exit={hasInteracted ? 'exit' : undefined}
            className="w-full flex items-center justify-center"
          >
            {isVideo ? (
              <video src={currentUrl} className={`w-full ${maxHeightClass} object-cover`} controls />
            ) : (
              <img 
                src={currentUrl} 
                alt={`Foto ${currentIndex + 1}`} 
                loading="eager"
                decoding="sync"
                // @ts-ignore
                fetchPriority="high"
                className={`w-full ${maxHeightClass} object-cover group-hover:scale-102 transition-transform duration-300 block`}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Badge do Contador de Fotos (ex: 1 / 5) */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md border border-white/15 z-10">
          <Sparkles size={13} className="text-amber-400" />
          <span>{currentIndex + 1} / {total} fotos</span>
        </div>

        {/* Botão de Dica de Zoom */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/15 z-10 pointer-events-none">
          <Maximize2 size={12} />
          AMPLIAR
        </div>

        {/* Botões de Navegação Anterior / Próximo */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-110 active:scale-95 shadow-xl z-20"
          title="Foto Anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-110 active:scale-95 shadow-xl z-20"
          title="Próxima Foto"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Barra Inferior com Indicadores (Dots) */}
      <div className="p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-1.5 flex-wrap max-h-14 overflow-y-auto custom-scrollbar">
        {mediaUrls.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHasInteracted(true);
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? 'w-6 h-2 bg-gradient-to-r from-amber-400 to-indigo-400 shadow-sm'
                : 'w-2 h-2 bg-white/40 hover:bg-white/70'
            }`}
            title={`Ir para foto ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
