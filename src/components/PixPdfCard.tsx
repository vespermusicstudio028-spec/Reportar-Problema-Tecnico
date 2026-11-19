import React, { useState } from 'react';
import { FileText, Image, Download, Eye, CheckCircle2, X, Sparkles, ExternalLink } from 'lucide-react';
import { PixAttachmentPayload } from '../lib/pixUtils';

interface PixPdfCardProps {
  payload: PixAttachmentPayload;
  isAdmin?: boolean;
  onConfirmPixPayment?: () => void;
  isClientSender?: boolean;
}

/** Verifica se o arquivo é uma imagem (JPG, PNG, WebP) pelo nome ou base64 */
function isImagePayload(payload: PixAttachmentPayload): boolean {
  const name = (payload.fileName || '').toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) return true;
  const data = payload.fileData || '';
  return data.startsWith('data:image/');
}

export const PixPdfCard: React.FC<PixPdfCardProps> = ({
  payload,
  isAdmin = false,
  onConfirmPixPayment,
  isClientSender = true
}) => {
  const [showViewer, setShowViewer] = useState(false);
  const isImage = isImagePayload(payload);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.href = payload.fileData;
      link.download = payload.fileName || (isImage ? 'comprovante_pix.jpg' : 'comprovante_pix.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar comprovante:', err);
      window.open(payload.fileData, '_blank');
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImage) {
      window.open(payload.fileData, '_blank');
      return;
    }
    try {
      const pdfWindow = window.open('');
      if (pdfWindow) {
        pdfWindow.document.write(
          `<iframe width='100%' height='100%' style='border:none;margin:0;padding:0;position:absolute;top:0;left:0;right:0;bottom:0;' src='${payload.fileData}'></iframe>`
        );
        pdfWindow.document.title = payload.fileName || 'Comprovante Pix';
      } else {
        window.open(payload.fileData, '_blank');
      }
    } catch {
      window.open(payload.fileData, '_blank');
    }
  };

  return (
    <div className="w-full max-w-md my-1.5 select-none">
      {/* Card do Comprovante */}
      <div className={`rounded-2xl bg-gradient-to-br from-[#121622] to-[#181d2e] border shadow-xl transition-all overflow-hidden ${
        isImage ? 'border-blue-500/30 hover:border-blue-500/50' : 'border-red-500/30 hover:border-red-500/50'
      }`}>

        {/* Preview de Imagem (se for foto do comprovante) */}
        {isImage && (
          <div
            className="relative w-full max-h-56 overflow-hidden bg-black/40 cursor-pointer"
            onClick={() => setShowViewer(true)}
          >
            <img
              src={payload.fileData}
              alt={payload.fileName || 'Comprovante'}
              className="w-full object-contain max-h-56 hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#181d2e]/70 pointer-events-none" />
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
              <Eye size={11} /> Toque para ampliar
            </div>
          </div>
        )}

        <div className="p-3.5">
          {/* Cabeçalho do Anexo */}
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${
              isImage
                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-600/30'
                : 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/30'
            }`}>
              {isImage ? <Image size={24} className="stroke-[2.2]" /> : <FileText size={24} className="stroke-[2.2]" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles size={11} className="text-emerald-400" /> Comprovante Pix
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                  {payload.fileSize}
                </span>
                {isImage && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    📷 Foto
                  </span>
                )}
              </div>

              <h4 className="text-white font-bold text-xs sm:text-sm mt-1 truncate" title={payload.fileName}>
                {payload.fileName}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isImage ? 'Foto do comprovante de pagamento via Pix' : 'Documento PDF de pagamento via Pix'}
              </p>
            </div>
          </div>

          {/* Legenda Opcional do Cliente */}
          {payload.caption && (
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-xs text-slate-300 italic">
              "{payload.caption}"
            </div>
          )}

          {/* Botões de Ação */}
          <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
            <button
              type="button"
              onClick={() => setShowViewer(true)}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] border ${
                isImage
                  ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-blue-200 border-blue-500/30'
                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border-red-500/30'
              }`}
            >
              <Eye size={14} /> Visualizar
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <Download size={14} /> Baixar
            </button>
          </div>

          {/* Ação Especial Exclusiva do Administrador */}
          {isAdmin && onConfirmPixPayment && (
            <div className="mt-3 pt-2.5 border-t border-slate-700/60">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmPixPayment();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              >
                <CheckCircle2 size={15} />
                Reconhecer & Confirmar Pagamento Pix
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Visualização em Tela Cheia */}
      {showViewer && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowViewer(false)}
        >
          <div
            className="relative w-full max-w-4xl h-[88vh] bg-[#121622] border border-slate-700/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Visualizador */}
            <div className="p-3.5 px-4 bg-[#181d2c] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {isImage ? <Image size={20} className="text-blue-400 shrink-0" /> : <FileText size={20} className="text-red-400 shrink-0" />}
                <span className="font-bold text-white text-sm truncate">{payload.fileName}</span>
                <span className="text-[11px] text-slate-400 shrink-0">({payload.fileSize})</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Baixar"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewer(false)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo: imagem ou PDF */}
            <div className="flex-1 w-full bg-slate-900 overflow-auto flex items-center justify-center">
              {isImage ? (
                <img
                  src={payload.fileData}
                  alt={payload.fileName || 'Comprovante'}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <iframe
                  src={payload.fileData}
                  title={payload.fileName}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
