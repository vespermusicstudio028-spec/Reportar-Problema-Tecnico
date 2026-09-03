import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  X, 
  Tv, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  History, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { ClientSupportMemory, ClientSupportSession } from '../types/clientMemory';
import { 
  getOrCreateClientMemory, 
  getClientSupportSessions, 
  updateClientMemory, 
  resetClientMemoryHistory 
} from '../lib/clientMemoryService';

interface ClientMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCode: string;
  clientName: string;
}

export const ClientMemoryModal: React.FC<ClientMemoryModalProps> = ({
  isOpen,
  onClose,
  clientCode,
  clientName
}) => {
  const [memory, setMemory] = useState<ClientSupportMemory | null>(null);
  const [sessions, setSessions] = useState<ClientSupportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'historico'>('perfil');

  // Formulário de edição
  const [editDevice, setEditDevice] = useState('');
  const [editApp, setEditApp] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = async () => {
    if (!clientCode) return;
    setIsLoading(true);
    try {
      const [memData, sessData] = await Promise.all([
        getOrCreateClientMemory(clientCode, clientName),
        getClientSupportSessions(clientCode)
      ]);
      setMemory(memData);
      setSessions(sessData);
      if (memData) {
        setEditDevice(memData.device || '');
        setEditApp(memData.active_app || '');
        setEditPlan(memData.plan || '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados de memória:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, clientCode]);

  const handleSaveEdit = async () => {
    if (!clientCode || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateClientMemory(clientCode, {
        device: editDevice.trim(),
        active_app: editApp.trim(),
        plan: editPlan.trim()
      });
      if (updated) {
        setMemory(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
        setIsEditing(false);
      }
    } catch (err) {
      alert('Erro ao atualizar memória: ' + err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetHistory = async () => {
    const confirm = window.confirm(
      `Tem certeza que deseja limpar o histórico de memória e atendimentos do cliente ${clientName} (${clientCode})? Esta ação não pode ser desfeita.`
    );
    if (!confirm) return;

    const ok = await resetClientMemoryHistory(clientCode);
    if (ok) {
      await loadData();
      alert('Histórico de memória reiniciado com sucesso!');
    } else {
      alert('Erro ao reiniciar histórico.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0b0e14] border border-indigo-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header do Modal */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/80 via-[#111624] to-[#0b0e14] border-b border-indigo-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
                <Brain size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Memória Individual do Cliente</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                    {clientCode}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contexto persistente, histórico de problemas e regras personalizadas de IA
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-[#0d1017]">
            <button
              type="button"
              onClick={() => setActiveTab('perfil')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'perfil'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={14} /> Perfil & Memória Ativa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'historico'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={14} /> Histórico de Atendimentos ({sessions.length})
            </button>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-200 text-xs sm:text-sm">
            {isLoading ? (
              <div className="text-center py-12 space-y-3">
                <Brain size={36} className="text-indigo-400 animate-spin mx-auto" />
                <p className="text-slate-400">Recuperando registros neurais do cliente...</p>
              </div>
            ) : activeTab === 'perfil' ? (
              <div className="space-y-5">
                {/* Resumo Inteligente do Último Atendimento */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Sparkles size={14} className="text-amber-400" /> Resumo do Último Atendimento
                    </span>
                    {memory?.last_service_date && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {new Date(memory.last_service_date).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs sm:text-sm italic">
                    "{memory?.last_service_summary || 'Nenhum resumo gerado ainda. O cliente está pronto para atendimento.'}"
                  </p>
                  {memory?.last_topic && (
                    <div className="pt-2 border-t border-indigo-500/20 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Último Assunto:</span>
                      <span className="text-[11px] font-bold text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                        {memory.last_topic}
                      </span>
                    </div>
                  )}
                </div>

                {/* Grid de Informações Chave */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dispositivo e App */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <Tv size={14} className="text-sky-400" /> Aparelho & Aplicativo
                    </div>
                    <p className="font-bold text-white text-sm">
                      {memory?.device || 'Não identificado'}
                    </p>
                    <p className="text-xs text-sky-300">
                      App: {memory?.active_app || 'Não registrado'}
                    </p>
                  </div>

                  {/* Plano e Pagamento */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-400" /> Plano & Assinatura
                    </div>
                    <p className="font-bold text-white text-sm">
                      {memory?.plan || 'Mensal'}
                    </p>
                    <p className="text-xs text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Status: {memory?.payment_status || 'Em dia'}
                    </p>
                  </div>

                  {/* Status do Teste */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-400" /> Teste Grátis de 3h
                    </div>
                    <p className="font-bold text-white text-sm capitalize">
                      {memory?.trial_status === 'ativo'
                        ? '🟢 Ativo'
                        : memory?.trial_status === 'expirado'
                        ? '🔴 Já Utilizou'
                        : memory?.trial_status === 'convertido'
                        ? '🌟 Assinante'
                        : '⚪ Nunca usou'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Atendimentos: {memory?.total_services_count || 0}
                    </p>
                  </div>
                </div>

                {/* Formulário de Edição Rápida */}
                {isEditing ? (
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 space-y-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <Edit3 size={14} className="text-indigo-400" /> Corrigir Memória do Cliente
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Dispositivo:</label>
                        <input
                          type="text"
                          value={editDevice}
                          onChange={(e) => setEditDevice(e.target.value)}
                          placeholder="Ex: TV Box, Smart TV Samsung"
                          className="w-full bg-[#151924] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Aplicativo Ativo:</label>
                        <input
                          type="text"
                          value={editApp}
                          onChange={(e) => setEditApp(e.target.value)}
                          placeholder="Ex: XCIPTV, IPTV Smarters"
                          className="w-full bg-[#151924] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Plano:</label>
                        <input
                          type="text"
                          value={editPlan}
                          onChange={(e) => setEditPlan(e.target.value)}
                          placeholder="Ex: Mensal 1 Tela, 2 Telas"
                          className="w-full bg-[#151924] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <Save size={13} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Editar Dados da Memória
                    </button>
                    {savedSuccess && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
                        <Check size={14} /> Memória atualizada com sucesso!
                      </span>
                    )}
                  </div>
                )}

                {/* Histórico de Problemas Registrados */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" /> Problemas Relatados no Histórico
                  </h4>
                  {memory?.reported_issues && memory.reported_issues.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {memory.reported_issues.map((iss, idx) => (
                        <div
                          key={iss.id || idx}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="font-bold text-slate-200">{iss.issue}</p>
                            {iss.notes && <p className="text-[11px] text-slate-400 mt-0.5">{iss.notes}</p>}
                            {iss.device && (
                              <span className="inline-block text-[10px] text-sky-400 mt-1 font-mono">
                                Aparelho: {iss.device}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(iss.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nenhum problema técnico registrado anteriormente.</p>
                  )}
                </div>

                {/* Soluções Já Fornecidas (Anti-Repetição) */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" /> Soluções Fornecidas (Memória Anti-Repetição)
                  </h4>
                  {memory?.applied_solutions && memory.applied_solutions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {memory.applied_solutions.map((sol, idx) => (
                        <div
                          key={sol.id || idx}
                          className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="font-bold text-emerald-200">{sol.solution}</p>
                            {sol.issueRelated && (
                              <p className="text-[11px] text-slate-400 mt-0.5">Relacionado a: {sol.issueRelated}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(sol.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nenhuma solução anterior registrada.</p>
                  )}
                </div>
              </div>
            ) : (
              /* Aba: Histórico Completo de Sessões */
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 space-y-2 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    <History size={32} className="text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs font-medium">Nenhuma sessão arquivada para este cliente.</p>
                  </div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">{sess.topic}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sess.status === 'resolvido'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : sess.status === 'encaminhado'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {sess.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(sess.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {sess.summary && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-[#0b0e14] p-2.5 rounded-xl border border-slate-800/80">
                          {sess.summary}
                        </p>
                      )}
                      {(sess.detected_device || sess.applied_solution) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          {sess.detected_device && (
                            <span>Aparelho: <strong className="text-slate-300">{sess.detected_device}</strong></span>
                          )}
                          {sess.applied_solution && (
                            <span>Solução: <strong className="text-emerald-300">{sess.applied_solution}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer com Ações */}
          <div className="px-6 py-4 bg-[#0d1017] border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleResetHistory}
              className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Reiniciar Histórico de Memória
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
