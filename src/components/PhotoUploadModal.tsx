import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImageIcon, Upload, Loader2, Send, Trash2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCode: string;
  clientName: string;
  onPhotosSent: () => void;
}

interface PhotoPreview {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  clientCode,
  clientName,
  onPhotosSent,
}) => {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 10;
  const MAX_SIZE_MB = 8;

  const processFiles = useCallback((files: FileList | File[]) => {
    setErrorMsg('');
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setErrorMsg('Por favor, selecione apenas arquivos de imagem (JPG, PNG, WEBP, etc.).');
      return;
    }

    setPhotos(prev => {
      const remaining = MAX_PHOTOS - prev.length;
      if (remaining <= 0) {
        setErrorMsg(`Limite de ${MAX_PHOTOS} fotos atingido.`);
        return prev;
      }
      const toAdd = imageFiles.slice(0, remaining);
      const oversized = toAdd.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024);
      if (oversized.length > 0) {
        setErrorMsg(`${oversized.length} foto(s) ultrapassam ${MAX_SIZE_MB}MB e foram ignoradas.`);
      }
      const validFiles = toAdd.filter(f => f.size <= MAX_SIZE_MB * 1024 * 1024);
      const newPreviews: PhotoPreview[] = validFiles.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
      }));
      return [...prev, ...newPreviews];
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter(p => p.id !== id);
    });
    setErrorMsg('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (photos.length === 0 || isSending || !clientCode) return;
    setIsSending(true);
    setErrorMsg('');

    try {
      const uploadedUrls: string[] = [];

      for (const photo of photos) {
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, uploading: true } : p));
        const ext = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `chat/${clientCode}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabase.storage
          .from('chat-photos')
          .upload(fileName, photo.file, { contentType: photo.file.type, upsert: false });

        if (error || !data) {
          const base64 = await fileToBase64(photo.file);
          uploadedUrls.push(base64);
        } else {
          const { data: { publicUrl } } = supabase.storage.from('chat-photos').getPublicUrl(data.path);
          uploadedUrls.push(publicUrl);
        }

        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, uploading: false } : p));
      }

      const photoPayload = JSON.stringify({
        type: 'SUPPORT_PHOTOS',
        photos: uploadedUrls,
        caption: caption.trim() || null,
        count: uploadedUrls.length,
      });

      await supabase.from('chat_messages').insert({
        client_code: clientCode,
        client_name: clientName,
        sender: 'client',
        message: `[FOTOS_SUPORTE]${photoPayload}[/FOTOS_SUPORTE]`,
        read_by_admin: false,
        read_by_client: true,
      });

      setSuccessMsg(`Fotos enviadas com sucesso!`);
      setTimeout(() => {
        photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
        setPhotos([]);
        setCaption('');
        setSuccessMsg('');
        onPhotosSent();
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg('Erro ao enviar: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setCaption('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-[#0e1119] rounded-t-3xl sm:rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/60 to-[#0e1119]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30">
                <Camera size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Enviar Fotos ao Suporte</h3>
                <p className="text-xs text-slate-400 mt-0.5">{photos.length}/{MAX_PHOTOS} fotos • max {MAX_SIZE_MB}MB cada</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} disabled={isSending} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-40">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
            {/* Drop zone */}
            {photos.length < MAX_PHOTOS && (
              <div
                className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500/60 hover:bg-slate-800/40 bg-slate-900/40'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                <div className="py-8 flex flex-col items-center gap-3 text-center px-4">
                  <div className={`p-4 rounded-2xl ${isDragging ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                    <ImageIcon size={28} className={isDragging ? 'text-blue-400' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{isDragging ? 'Solte as fotos aqui!' : 'Toque para adicionar fotos'}</p>
                    <p className="text-xs text-slate-500 mt-1">Arraste e solte ou clique • Até {MAX_PHOTOS} fotos</p>
                  </div>
                  <span className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold">
                    <Upload size={13} /> Escolher Fotos
                  </span>
                </div>
              </div>
            )}

            {/* Grid de previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={photo.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    )}
                    {!isSending && (
                      <button type="button" onClick={() => removePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-600/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all shadow-md">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-900/60 hover:bg-slate-800/60 flex items-center justify-center text-slate-500 hover:text-blue-400 transition-all flex-col gap-1">
                    <span className="text-2xl font-light">+</span>
                    <span className="text-[10px]">Mais</span>
                  </button>
                )}
              </div>
            )}

            {photos.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{photos.length} foto(s) prontas</span>
                {!isSending && (
                  <button type="button" onClick={() => { photos.forEach(p => URL.revokeObjectURL(p.previewUrl)); setPhotos([]); }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={12} /> Remover tudo
                  </button>
                )}
              </div>
            )}

            {/* Legenda */}
            {photos.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Descreva o problema (opcional)</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex: O sinal cai sempre que abro o app..." disabled={isSending} rows={2}
                  className="w-full bg-[#151926] border border-slate-700 text-slate-100 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-blue-500 transition-all resize-none placeholder:text-slate-600 disabled:opacity-50" />
              </div>
            )}

            <AnimatePresence>
              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-red-300 text-xs">
                  <AlertCircle size={14} className="shrink-0" /> {errorMsg}
                </motion.div>
              )}
              {successMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs">
                  <CheckCircle2 size={14} className="shrink-0" /> {successMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-2 flex gap-3">
            <button type="button" onClick={handleClose} disabled={isSending}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm transition-all disabled:opacity-40">
              Cancelar
            </button>
            <button type="button" onClick={handleSend} disabled={photos.length === 0 || isSending}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
              {isSending ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : <><Send size={15} /> Enviar {photos.length > 0 ? `${photos.length} foto(s)` : 'Fotos'}</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Helpers de renderização ────────────────────────────────────────────────

export const isSupportPhotosMessage = (msg: string): boolean =>
  msg.includes('[FOTOS_SUPORTE]') && msg.includes('[/FOTOS_SUPORTE]');

export interface SupportPhotosPayload {
  photos: string[];
  caption: string | null;
  count: number;
}

export const parseSupportPhotosMessage = (msg: string): SupportPhotosPayload | null => {
  try {
    const match = msg.match(/\[FOTOS_SUPORTE\]([\s\S]*?)\[\/FOTOS_SUPORTE\]/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};
