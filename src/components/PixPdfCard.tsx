import React, { useState } from 'react';
import { FileText, Download, Eye, CheckCircle2, ShieldCheck, X, Sparkles, ExternalLink } from 'lucide-react';
import { PixAttachmentPayload } from '../lib/pixUtils';

interface PixPdfCardProps {
  payload: PixAttachmentPayload;
  isAdmin?: boolean;
  onConfirmPixPayment?: () => void;
  isClientSender?: boolean;
}

export const PixPdfCard: React.FC<PixPdfCardProps> = ({
  payload,
  isAdmin = false,
  onConfirmPixPayment,
  isClientSender = true
}) => {
  const [showViewer, setShowViewer] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.href = payload.fileData;
      link.download = payload.fileName || 'comprovante_pix.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      window.open(payload.fileData, '_blank');
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      {/* Card do Documento PDF */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#121622] to-[#181d2e] border border-red-500/30 hover:border-red-500/50 shadow-xl transition-all">
        {/* Cabeçalho do Anexo */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <FileText size={24} className="stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-400" /> Comprovante Pix
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                {payload.fileSize}
              </span>
            </div>

            <h4 className="text-white font-bold text-xs sm:text-sm mt-1 truncate" title={payload.fileName}>
              {payload.fileName}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Documento PDF de pagamento via Pix
            </p>
          </div>
        </div>

        {/* Legenda Opcional do Cliente */}
        {payload.caption && (
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-xs text-slate-300 italic">
            "{payload.caption}"
          </div>
        )}

        {/* Botões de Ação do PDF */}
        <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
          <button
            type="button"
            onClick={() => setShowViewer(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold transition-all active:scale-[0.98]"
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

      {/* Modal de Visualização de PDF em Tela Cheia */}
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
                <FileText size={20} className="text-red-400 shrink-0" />
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
                  title="Baixar PDF"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewer(false)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white transition-colors"
                  title="Fechar (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Iframe com o Conteúdo do PDF */}
            <div className="flex-1 w-full bg-slate-900 overflow-hidden relative">
              <iframe
                src={payload.fileData}
                title={payload.fileName}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
