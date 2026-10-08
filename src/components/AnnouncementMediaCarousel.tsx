import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react';

// Cache global de URLs pré-carregadas
const preloadedUrls = new Set<string>();

/**
 * Pré-carrega uma imagem em segundo plano no cache do navegador
 */
export const preloadAnnouncementImage = (url: string) => {
  if (!url || typeof window === 'undefined' || preloadedUrls.has(url) || url.startsWith('data:video')) return;
  preloadedUrls.add(url);
  try {
    const img = new Image();
    img.src = url;
  } catch {}
};

/**
 * Pré-carrega uma lista de mídias de informes
 */
export const preloadAnnouncementMediaList = (announcements: Array<{ mediaUrls?: string[]; mediaUrl?: string; mediaType?: string | null }>) => {
  if (!Array.isArray(announcements) || typeof window === 'undefined') return;
  try {
    announcements.forEach((ann) => {
      if (!ann || ann.mediaType === 'video') return;
      const urls = ann.mediaUrls && ann.mediaUrls.length > 0 ? ann.mediaUrls : (ann.mediaUrl ? [ann.mediaUrl] : []);
      urls.forEach((url) => {
        if (typeof url === 'string') {
          preloadAnnouncementImage(url);
        }
      });
    });
  } catch {}
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
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Pré-carrega as imagens seguintes deste carrossel em segundo plano
  useEffect(() => {
    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach((url) => {
        if (typeof url === 'string') {
          preloadAnnouncementImage(url);
        }
      });
    }
  }, [mediaUrls]);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const total = mediaUrls.length;
  const currentUrl = mediaUrls[currentIndex] || mediaUrls[0];
  const isVideo = mediaType === 'video' || (typeof currentUrl === 'string' && currentUrl.startsWith('data:video'));

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  // Se houver apenas 1 mídia: renderização direta e garantida
  if (total === 1) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group bg-black/40">
        {isVideo ? (
          <video src={currentUrl} className={`w-full ${maxHeightClass} object-cover`} controls />
        ) : (
          <div className="relative overflow-hidden cursor-zoom-in" onClick={handleMediaClick}>
            <img 
              src={currentUrl} 
              alt="Anexo do informe" 
              loading="eager"
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

  // Efeito de transição suave do carrossel
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
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
      x: dir > 0 ? -60 : 60,
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
      {/* Área da Foto com Carrossel */}
      <div 
        className="relative overflow-hidden w-full flex items-center justify-center cursor-zoom-in min-h-[160px]"
        onClick={handleMediaClick}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full flex items-center justify-center"
          >
            {isVideo ? (
              <video src={currentUrl} className={`w-full ${maxHeightClass} object-cover`} controls />
            ) : (
              <img 
                src={currentUrl} 
                alt={`Foto ${currentIndex + 1}`} 
                loading="eager"
                className={`w-full ${maxHeightClass} object-cover group-hover:scale-102 transition-transform duration-300 block`}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Badge do Contador de Fotos */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md border border-white/15 z-10">
          <Sparkles size={13} className="text-amber-400" />
          <span>{currentIndex + 1} / {total} fotos</span>
        </div>

        {/* Botão de Dica de Zoom */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/15 z-10 pointer-events-none">
          <Maximize2 size={12} />
          AMPLIAR
        </div>

        {/* Botões de Navegação */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-110 active:scale-95 shadow-xl z-20 cursor-pointer"
          title="Foto Anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-110 active:scale-95 shadow-xl z-20 cursor-pointer"
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
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
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
