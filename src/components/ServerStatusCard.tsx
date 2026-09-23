import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Clock, 
  Wrench, 
  XCircle, 
  AlertTriangle, 
  Search 
} from 'lucide-react';
import { ServerStatusData, SERVER_STATUS_OPTIONS, ServerStatusKey } from '../types/serverStatus';

interface ServerStatusCardProps {
  statusData?: ServerStatusData;
  className?: string;
  isPreview?: boolean;
}

export function ServerStatusCard({ statusData, className = '', isPreview = false }: ServerStatusCardProps) {
  const currentKey: ServerStatusKey = statusData?.statusKey && SERVER_STATUS_OPTIONS[statusData.statusKey]
    ? statusData.statusKey
    : 'operacional';

  const config = SERVER_STATUS_OPTIONS[currentKey];
  const isOperacional = currentKey === 'operacional';
  const displayMessage = statusData?.customMessage?.trim() || config.defaultMessage;
  const estimatedTime = statusData?.estimatedTime?.trim();

  const renderIcon = () => {
    switch (config.iconName) {
      case 'CheckCircle2':
        return <CheckCircle2 size={15} className={config.textColor} />;
      case 'AlertCircle':
        return <AlertCircle size={15} className={config.textColor} />;
      case 'Activity':
        return <Activity size={15} className={config.textColor} />;
      case 'Clock':
        return <Clock size={15} className={config.textColor} />;
      case 'Wrench':
        return <Wrench size={15} className={config.textColor} />;
      case 'XCircle':
        return <XCircle size={15} className={config.textColor} />;
      case 'AlertTriangle':
        return <AlertTriangle size={15} className={config.textColor} />;
      case 'Search':
        return <Search size={15} className={config.textColor} />;
      default:
        return <CheckCircle2 size={15} className={config.textColor} />;
    }
  };

  return (
    <div 
      className={`p-4 bg-[#1a1d24]/90 backdrop-blur-md border rounded-2xl transition-all duration-300 ${
        isOperacional ? 'border-white/5 shadow-lg' : `${config.borderCard} shadow-xl shadow-black/40`
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          Status do Servidor
        </p>
        {isPreview && (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Prévia
          </span>
        )}
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

      {/* Detalhes extras quando não estiver 100% operacional ou se tiver mensagem personalizada */}
      {(!isOperacional || statusData?.customMessage?.trim()) && (
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
