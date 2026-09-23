import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Clock, 
  Wrench, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  ServerStatusData, 
  ServerStatusKey, 
  SERVER_STATUS_OPTIONS, 
  DEFAULT_SERVER_STATUS 
} from '../types/serverStatus';
import { ServerStatusCard } from './ServerStatusCard';

interface AdminServerStatusPanelProps {
  currentStatus: ServerStatusData;
  onSave: (newStatus: ServerStatusData) => Promise<void>;
}

export function AdminServerStatusPanel({ currentStatus, onSave }: AdminServerStatusPanelProps) {
  const [selectedKey, setSelectedKey] = useState<ServerStatusKey>(currentStatus.statusKey || 'operacional');
  const [customMessage, setCustomMessage] = useState<string>(currentStatus.customMessage || '');
  const [estimatedTime, setEstimatedTime] = useState<string>(currentStatus.estimatedTime || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sincroniza se o status atual mudar externamente
  useEffect(() => {
    setSelectedKey(currentStatus.statusKey || 'operacional');
    setCustomMessage(currentStatus.customMessage || '');
    setEstimatedTime(currentStatus.estimatedTime || '');
  }, [currentStatus]);

  const handleSelectStatus = (key: ServerStatusKey) => {
    setSelectedKey(key);
    // Se a mensagem estava vazia ou era a padrão de outro status, atualiza para a padrão do novo status
    const currentDefault = SERVER_STATUS_OPTIONS[selectedKey]?.defaultMessage;
    if (!customMessage.trim() || customMessage.trim() === currentDefault) {
      setCustomMessage(SERVER_STATUS_OPTIONS[key].defaultMessage);
    }
  };

  const handleResetToDefaultMessage = () => {
    setCustomMessage(SERVER_STATUS_OPTIONS[selectedKey].defaultMessage);
  };

  const handleQuickOperacional = () => {
    setSelectedKey('operacional');
    setCustomMessage('');
    setEstimatedTime('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const dataToSave: ServerStatusData = {
        statusKey: selectedKey,
        customMessage: customMessage.trim(),
        estimatedTime: estimatedTime.trim(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(dataToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Erro ao salvar status do servidor:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Objeto temporário para a prévia em tempo real
  const previewData: ServerStatusData = {
    statusKey: selectedKey,
    customMessage: customMessage.trim() || SERVER_STATUS_OPTIONS[selectedKey].defaultMessage,
    estimatedTime: estimatedTime.trim(),
    updatedAt: new Date().toISOString(),
  };

  const currentOption = SERVER_STATUS_OPTIONS[selectedKey];
  const isOperacional = selectedKey === 'operacional';

  return (
    <div className="space-y-8">
      {/* Cabeçalho explicativo */}
      <div className="bg-[#0f131c] p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Status do Servidor
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Ao Vivo
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Altere o estado exibido na tela inicial do site em tempo real para todos os clientes.
            </p>
          </div>
        </div>

        {/* Botão rápido para voltar a 100% Operacional */}
        {!isOperacional && (
          <button
            type="button"
            onClick={handleQuickOperacional}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
            title="Voltar status imediatamente para Operacional"
          >
            <CheckCircle2 size={16} />
            Restaurar para Operacional
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Configuração (7 colunas no desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-[#0f131c] p-6 md:p-8 rounded-3xl border border-slate-800/80 space-y-6 shadow-2xl">
            {/* Escolha do Status */}
            <div className="space-y-3">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                1. Selecione a Situação Atual do Servidor
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(SERVER_STATUS_OPTIONS) as ServerStatusKey[]).map((key) => {
                  const opt = SERVER_STATUS_OPTIONS[key];
                  const isSelected = selectedKey === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectStatus(key)}
                      className={`text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${
                        isSelected 
                          ? `${opt.borderCard} ${opt.bgLightColor} ring-1 ring-white/10 shadow-lg scale-[1.01]` 
                          : 'bg-[#151922] border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${opt.dotColor} ${isSelected ? opt.glowColor : ''}`} />
                        <div className="min-w-0">
                          <p className={`text-xs md:text-sm font-bold truncate ${isSelected ? opt.textColor : 'text-slate-200'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {opt.badge}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 ml-1">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mensagem Pública Exibida aos Usuários */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  2. Mensagem Pública (Opcional ou Personalizada)
                </label>
                <button
                  type="button"
                  onClick={handleResetToDefaultMessage}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                  title="Usar mensagem padrão deste status"
                >
                  <RotateCcw size={12} />
                  Usar mensagem padrão
                </button>
              </div>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={currentOption.defaultMessage}
                className="w-full bg-[#151922] border border-slate-700/80 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Se deixar em branco, será exibida a mensagem padrão automática correspondente ao status.
              </p>
            </div>

            {/* Previsão de Normalização */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                3. Previsão de Normalização (Opcional)
              </label>
              <input
                type="text"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="Ex.: 22:00, ou Em até 30 minutos"
                className="w-full bg-[#151922] border border-slate-700/80 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
              />
              <p className="text-[11px] text-slate-500">
                Aparecerá com um ícone de relógio no card se preenchido.
              </p>
            </div>

            {/* Feedback e Botão Salvar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Salvando Status...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Status</span>
                  </>
                )}
              </button>

              {savedSuccess && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
                  <CheckCircle2 size={16} />
                  <span>Status atualizado com sucesso! Refletido imediatamente na tela inicial.</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Painel Lateral de Prévia ao Vivo (5 colunas no desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0f131c] p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-white font-bold text-sm tracking-wide">
                Prévia da Tela Inicial
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Veja abaixo exatamente como os clientes verão o card no menu lateral e tela inicial:
            </p>

            {/* Componente do Card de Status */}
            <div className="pt-2">
              <ServerStatusCard statusData={previewData} isPreview={true} />
            </div>

            {/* Informações de status selecionado */}
            <div className="bg-[#151922] p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Severidade técnica:</span>
                <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                  currentOption.severity === 'normal' ? 'bg-emerald-500/20 text-emerald-300' :
                  currentOption.severity === 'aviso' ? 'bg-yellow-500/20 text-yellow-300' :
                  currentOption.severity === 'atencao' ? 'bg-orange-500/20 text-orange-300' :
                  currentOption.severity === 'critico' ? 'bg-red-500/20 text-red-300' :
                  'bg-sky-500/20 text-sky-300'
                }`}>
                  {currentOption.severity}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Última alteração salva:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {currentStatus.updatedAt ? new Date(currentStatus.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
