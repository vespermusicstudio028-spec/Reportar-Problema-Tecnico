import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Image, Upload, X, Loader2, Sparkles, CheckCircle2, AlertCircle, Share2 } from 'lucide-react';
import { formatFileSize, buildPixPdfMessage } from '../lib/pixUtils';

interface PixUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPixPayload: (messagePayload: string, fileName: string) => Promise<void>;
  /** Arquivo pré-carregado via Web Share Target (PWA compartilhamento Android) */
  preloadedFile?: File | null;
}

/** Tipos de arquivo aceitos como comprovante */
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 12 * 1024 * 1024; // 12MB

function isAcceptedFile(file: File): boolean {
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
  );
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export const PixUploadModal: React.FC<PixUploadModalProps> = ({
  isOpen,
  onClose,
  onSendPixPayload,
  preloadedFile
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>('Comprovante de pagamento via Pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSharedFile, setIsSharedFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega automaticamente o arquivo pré-carregado via share target
  useEffect(() => {
    if (isOpen && preloadedFile) {
      setIsSharedFile(true);
      loadFile(preloadedFile);
    }
  }, [isOpen, preloadedFile]);

  // Limpa preview ao fechar
  useEffect(() => {
    if (!isOpen) {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    }
  }, [isOpen]);

  const loadFile = (file: File) => {
    setErrorMsg('');

    if (!isAcceptedFile(file)) {
      setErrorMsg('Formato não suportado. Use PDF, JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg('O arquivo não pode ultrapassar 12MB.');
      return;
    }

    setSelectedFile(file);

    // Preview de imagem
    if (!isPdfFile(file)) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    } else {
      setImagePreviewUrl('');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSharedFile(false);
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  };

  const handleSend = async () => {
    if (!selectedFile || !fileBase64 || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const payloadString = buildPixPdfMessage({
        fileName: selectedFile.name,
        fileSize: formatFileSize(selectedFile.size),
        fileData: fileBase64,
        caption: caption.trim()
      });

      await onSendPixPayload(payloadString, selectedFile.name);
      handleClose();
    } catch (err: any) {
      setErrorMsg('Erro ao enviar comprovante: ' + (err.message || 'Falha de conexão.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileBase64('');
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl('');
    setCaption('Comprovante de pagamento via Pix');
    setErrorMsg('');
    setIsProcessing(false);
    setIsSharedFile(false);
    onClose();
  };

  if (!isOpen) return null;

  const isImage = selectedFile && !isPdfFile(selectedFile);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg bg-[#101420] border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">Enviar Comprovante Pix</h3>
                <p className="text-xs text-slate-400">Anexe PDF ou foto do comprovante</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Badge "Compartilhado via app" */}
          {isSharedFile && selectedFile && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
              <Share2 size={14} className="shrink-0" />
              <span>Arquivo recebido via compartilhamento Android — pronto para enviar!</span>
            </div>
          )}

          {/* Conteúdo */}
          <div className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!selectedFile ? (
              /* Área de Seleção do Arquivo */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-[#141828]/60 hover:bg-emerald-500/5 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 group-hover:bg-red-500/25 text-red-400 flex items-center justify-center transition-all group-hover:scale-110">
                    <FileText size={24} />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 group-hover:bg-blue-500/25 text-blue-400 flex items-center justify-center transition-all group-hover:scale-110">
                    <Image size={24} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">Clique para escolher o comprovante</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG ou WebP — máx. 12MB</p>
                </div>
                <span className="mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Upload size={12} /> Selecionar Comprovante
                </span>
              </div>
            ) : (
              /* Arquivo Selecionado */
              <div className="rounded-2xl bg-[#141828] border border-slate-700/80 overflow-hidden">
                {/* Preview de Imagem (se for foto) */}
                {isImage && imagePreviewUrl && (
                  <div className="relative w-full max-h-56 overflow-hidden bg-black/40">
                    <img
                      src={imagePreviewUrl}
                      alt="Prévia do comprovante"
                      className="w-full object-contain max-h-56"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141828]/60 pointer-events-none" />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                        isImage
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                          : 'bg-gradient-to-br from-red-600 to-rose-700'
                      }`}>
                        {isImage ? <Image size={22} /> : <FileText size={22} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{selectedFile.name}</h4>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(selectedFile.size)} • {isImage ? 'Imagem Pronta' : 'PDF Pronto'}
                          {isSharedFile && <span className="ml-1 text-indigo-400">• via Android</span>}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileBase64('');
                        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                        setImagePreviewUrl('');
                        setIsSharedFile(false);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                      title="Remover e escolher outro"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Mensagem Opcional
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Ex: Segue comprovante referente à renovação"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Informação */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Ao enviar o comprovante, nosso sistema registrará seu pagamento automaticamente e notificará a equipe para liberação imediata.
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={!selectedFile || !fileBase64 || isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Comprovante...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Enviar Comprovante Pix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
