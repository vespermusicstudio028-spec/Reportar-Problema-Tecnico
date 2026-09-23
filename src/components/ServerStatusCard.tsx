import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Clock, 
  Wrench, 
  XCircle, 
  AlertTriangle, 
  Search,
  ChevronRight
} from 'lucide-react';
import { ServerStatusData, SERVER_STATUS_OPTIONS, ServerStatusKey } from '../types/serverStatus';

interface ServerStatusCardProps {
  statusData?: ServerStatusData;
  className?: string;
  isPreview?: boolean;
  isAdmin?: boolean;
  onClick?: () => void;
}

export function ServerStatusCard({ 
  statusData, 
  className = '', 
  isPreview = false,
  isAdmin = false,
  onClick
}: ServerStatusCardProps) {
  const currentKey: ServerStatusKey = statusData?.statusKey && SERVER_STATUS_OPTIONS[statusData.statusKey]
    ? statusData.statusKey
    : 'operacional';

  const config = SERVER_STATUS_OPTIONS[currentKey];
  const isOperacional = currentKey === 'operacional';
  const displayMessage = statusData?.customMessage?.trim() || config.defaultMessage;
  const estimatedTime = statusData?.estimatedTime?.trim();
  const isClickable = Boolean(isAdmin && onClick);

  return (
    <div 
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      title={isClickable ? 'Clique para gerenciar o Status do Servidor no Painel Admin' : undefined}
      className={`p-4 bg-[#1a1d24]/90 backdrop-blur-md border rounded-2xl transition-all duration-300 ${
        isClickable ? 'cursor-pointer group hover:border-indigo-500/50 hover:bg-[#1f232d] hover:scale-[1.01] active:scale-[0.98]' : ''
      } ${
        isOperacional ? 'border-white/5 shadow-lg' : `${config.borderCard} shadow-xl shadow-black/40`
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <p className={`text-[11px] text-slate-400 font-bold uppercase tracking-wider ${isClickable ? 'group-hover:text-indigo-300 transition-colors' : ''}`}>
            Status do Servidor
          </p>
          {isAdmin && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin
            </span>
          )}
        </div>

        {isPreview ? (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Prévia
          </span>
        ) : isClickable ? (
          <span className="text-[10px] text-slate-500 group-hover:text-indigo-300 font-medium flex items-center gap-0.5 transition-colors">
            Gerenciar <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <div className={`w-2.5 h-2.5 ${config.dotColor} rounded-full animate-pulse ${config.glowColor}`} />
          {!isOperacional && (
            <div className={`absolute w-4 h-4 ${config.dotColor} opacity-30 rounded-full animate-ping`} />
          )}
        </div>
        <span className={`text-sm font-bold ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* Mensagem e detalhes exibidos para todos os status (incluindo Operacional) */}
      {(displayMessage || estimatedTime) && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {displayMessage && (
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {displayMessage}
            </p>
          )}

          {estimatedTime && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20 w-fit">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>Previsão de normalização: <strong className="text-amber-200">{estimatedTime}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
