import React, { useState, useRef, useEffect } from 'react';
import { Reorder } from 'motion/react';
import { TrialConfig, defaultTrialConfig, TrialDevice, TrialSubOption, TrialContentBlock, TrialLink, TrialMedia } from '../types/trial';
import { Save, Plus, Trash2, Edit2, ChevronLeft, Link as LinkIcon, ArrowRight, UploadCloud, X, ImageIcon, Video, Loader2, Eye, EyeOff, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  config: TrialConfig;
  onSave: (config: TrialConfig) => Promise<void>;
  onRegisterStepBack?: (handler: (() => boolean) | null) => void;
}

type ViewLevel = 'list' | 'device' | 'suboption';

export function TrialAdminPanel({ config, onSave, onRegisterStepBack }: Props) {
  const getSafeConfig = (cfg?: TrialConfig): TrialConfig => {
    if (cfg && Array.isArray(cfg.devices) && cfg.devices.length > 0) {
      return JSON.parse(JSON.stringify(cfg));
    }
    return JSON.parse(JSON.stringify(defaultTrialConfig));
  };

  const [localConfig, setLocalConfig] = useState<TrialConfig>(() => getSafeConfig(config));
  const [view, setView] = useState<ViewLevel>('list');
  const [deviceIdx, setDeviceIdx] = useState<number>(0);
  const [subIdx, setSubIdx] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza localConfig caso a prop config seja carregada após a montagem
  useEffect(() => {
    if (config && Array.isArray(config.devices) && config.devices.length > 0) {
      setLocalConfig(getSafeConfig(config));
    }
  }, [config]);

  const viewRef = useRef<ViewLevel>('list');
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (onRegisterStepBack) {
      onRegisterStepBack(() => {
        if (viewRef.current === 'suboption') {
          setView('device');
          return true; // consumiu o voltar
        }
        if (viewRef.current === 'device') {
          setView('list');
          return true; // consumiu o voltar
        }
        return false; // está na lista raiz do CMS
      });
    }
    return () => {
      if (onRegisterStepBack) {
        onRegisterStepBack(null);
      }
    };
  }, [onRegisterStepBack]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localConfig);
    setIsSaving(false);
    alert('✅ Configurações salvas com sucesso!');
  };

  const updateDevice = (index: number, updatedDevice: TrialDevice) => {
    const newDevices = [...(localConfig.devices || [])];
    newDevices[index] = updatedDevice;
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const updateSubOption = (devIdx: number, sIdx: number, updatedSub: TrialSubOption) => {
    const newDevices = [...(localConfig.devices || [])];
    const newSubs = [...(newDevices[devIdx]?.subOptions || [])];
    newSubs[sIdx] = updatedSub;
    newDevices[devIdx] = { ...newDevices[devIdx], subOptions: newSubs };
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const addDevice = () => {
    const currentDevices = localConfig.devices || [];
    const newDevice: TrialDevice = {
      id: `dev_${Date.now()}`,
      name: 'Novo Dispositivo',
      type: 'content',
      content: { title: 'NOVO DISPOSITIVO', textBlocks: [] }
    };
    const newDevices = [...currentDevices, newDevice];
    setLocalConfig({ ...localConfig, devices: newDevices });
    setDeviceIdx(newDevices.length - 1);
    setView('device');
  };

  const deleteDevice = (index: number) => {
    if (!confirm('Tem certeza que deseja excluir este dispositivo?')) return;
    const currentDevices = localConfig.devices || [];
    const newDevices = [...currentDevices];
    newDevices.splice(index, 1);
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const addSubOption = (devIdx: number) => {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[devIdx];
    if (!device) return;
    const newSub: TrialSubOption = {
      id: `sub_${Date.now()}`,
      name: 'Nova Opção',
      content: { title: 'NOVA OPÇÃO', textBlocks: [] }
    };
    const newSubs = [...(device.subOptions || []), newSub];
    updateDevice(devIdx, { ...device, subOptions: newSubs });
    setSubIdx(newSubs.length - 1);
    setView('suboption');
  };

  const deleteSubOption = (devIdx: number, sIdx: number) => {
    if (!confirm('Excluir esta sub-opção?')) return;
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[devIdx];
    if (!device) return;
    const newSubs = [...(device.subOptions || [])];
    newSubs.splice(sIdx, 1);
    updateDevice(devIdx, { ...device, subOptions: newSubs });
  };

  const duplicateDevice = (index: number) => {
    const currentDevices = localConfig.devices || [];
    const original = currentDevices[index];
    if (!original) return;
    const clone: TrialDevice = JSON.parse(JSON.stringify(original));
    clone.id = `dev_${Date.now()}`;
    clone.name = `${clone.name} (Cópia)`;
    const newDevices = [...currentDevices];
    newDevices.splice(index + 1, 0, clone);
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const toggleDeviceVisibility = (index: number) => {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[index];
    if (!device) return;
    updateDevice(index, { ...device, visible: device.visible === false ? true : false });
  };

  const duplicateSubOption = (devIdx: number, sIdx: number) => {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[devIdx];
    if (!device) return;
    const newSubs = [...(device.subOptions || [])];
    const original = newSubs[sIdx];
    if (!original) return;
    const clone: TrialSubOption = JSON.parse(JSON.stringify(original));
    clone.id = `sub_${Date.now()}`;
    clone.name = `${clone.name} (Cópia)`;
    newSubs.splice(sIdx + 1, 0, clone);
    updateDevice(devIdx, { ...device, subOptions: newSubs });
  };

  const toggleSubOptionVisibility = (devIdx: number, sIdx: number) => {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[devIdx];
    if (!device) return;
    const newSubs = [...(device.subOptions || [])];
    if (!newSubs[sIdx]) return;
    newSubs[sIdx] = { ...newSubs[sIdx], visible: newSubs[sIdx].visible === false ? true : false };
    updateDevice(devIdx, { ...device, subOptions: newSubs });
  };

  // ─── CONTENT EDITOR ─────────────────────────────────────────────────────────
  const ContentEditor = ({
    content,
    onChange
  }: {
    content: TrialContentBlock | undefined;
    onChange: (c: TrialContentBlock) => void;
  }) => {
    const c = content || {};

    const setField = (patch: Partial<TrialContentBlock>) => onChange({ ...c, ...patch });

    const removeMedia = () => {
      setField({ mediaUrl: undefined, mediaType: 'none' });
    };

    return (
      <div className="space-y-5">
        {/* Título e Subtítulo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Título</label>
            <input
              type="text"
              value={c.title || ''}
              onChange={e => setField({ title: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: SMARTV SAMSUNG"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Subtítulo</label>
            <input
              type="text"
              value={c.subtitle || ''}
              onChange={e => setField({ subtitle: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Texto Principal */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
            Parágrafos de Texto <span className="font-normal normal-case text-slate-500">(um por linha)</span>
          </label>
          <textarea
            value={(c.textBlocks || []).join('\n')}
            onChange={e => setField({ textBlocks: e.target.value.split('\n') })}
            className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[100px] transition-colors"
            placeholder="Digite o texto aqui..."
          />
        </div>

        {/* Mídias (Carrossel) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mídias (Fotos/Vídeos do Carrossel)</label>
          <div className="space-y-3">
            {/* Lista de Mídias Atuais (combinando antigas e novas) */}
            {(() => {
              const items = c.mediaItems || [];
              // Retrocompatibilidade se não houver mediaItems mas tiver mediaUrl
              if (items.length === 0 && c.mediaUrl && c.mediaType && c.mediaType !== 'none') {
                items.push({ id: 'legacy', url: c.mediaUrl, type: c.mediaType });
              }

              return items.map((media, idx) => (
                <div key={media.id} className="bg-[#0c0e12] border border-slate-700 p-3 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={media.type}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx] = { ...media, type: e.target.value as any };
                          setField({ mediaItems: newItems, mediaUrl: undefined, mediaType: 'none' }); // Limpa o legacy
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 w-32"
                      >
                        <option value="image">🖼️ Imagem</option>
                        <option value="video">🎬 Vídeo</option>
                      </select>
                      <input
                        type="text"
                        value={media.url}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx] = { ...media, url: e.target.value };
                          setField({ mediaItems: newItems, mediaUrl: undefined, mediaType: 'none' }); // Limpa o legacy
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="URL (Google Drive, YouTube, Imagem...)"
                      />
                    </div>
                    {/* Preview Rápido */}
                    <div className="h-20 w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950/50 relative">
                       {media.type === 'image' ? (
                         <img src={media.url} className="w-full h-full object-cover" alt="preview" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Prévia de Vídeo não disponível aqui</div>
                       )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newItems = [...items];
                      newItems.splice(idx, 1);
                      setField({ mediaItems: newItems, mediaUrl: undefined, mediaType: 'none' });
                    }}
                    className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    title="Remover Mídia"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ));
            })()}

            {/* Adicionar Mídia */}
            <button
              onClick={() => {
                const items = c.mediaItems || [];
                // Se houver legacy
                if (items.length === 0 && c.mediaUrl && c.mediaType && c.mediaType !== 'none') {
                  items.push({ id: 'legacy', url: c.mediaUrl, type: c.mediaType });
                }
                const newItems = [...items, { id: `med_${Date.now()}`, url: '', type: 'image' as const }];
                setField({ mediaItems: newItems, mediaUrl: undefined, mediaType: 'none' });
              }}
              className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors"
            >
              <Plus size={16} /> Adicionar Nova Mídia
            </button>
          </div>
        </div>

        {/* Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Alerta Superior <span className="text-indigo-400">(azul)</span>
            </label>
            <input
              type="text"
              value={c.topAlert?.text || ''}
              onChange={e => setField({ topAlert: e.target.value ? { type: 'info', text: e.target.value } : undefined })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: Clique no link abaixo:"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Alerta Inferior <span className="text-red-400">(vermelho)</span>
            </label>
            <input
              type="text"
              value={c.bottomAlert?.text || ''}
              onChange={e => setField({ bottomAlert: e.target.value ? { type: 'danger', text: e.target.value } : undefined })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: 🚨 MANUTENÇÃO ANUAL R$19,00"
            />
          </div>
        </div>

        {/* Links */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-sm text-slate-300 flex items-center gap-2">
              <LinkIcon size={16} className="text-indigo-400" />
              Links / Botões
            </h5>
            <button
              onClick={() => setField({
                links: [...(c.links || []), { id: `link_${Date.now()}`, url: '', label: '', style: 'primary' }]
              })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Adicionar Link
            </button>
          </div>

          {(c.links || []).length === 0 && (
            <p className="text-slate-500 text-sm text-center py-3">Nenhum link adicionado</p>
          )}

          <div className="space-y-2">
            {(c.links || []).map((link, i) => (
              <div key={link.id} className="flex gap-2 items-center bg-[#0c0e12] p-3 rounded-xl border border-slate-800">
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    placeholder="URL (https://...)"
                    value={link.url}
                    onChange={e => {
                      const newLinks = [...(c.links || [])];
                      newLinks[i] = { ...newLinks[i], url: e.target.value };
                      setField({ links: newLinks });
                    }}
                    className="w-full bg-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Texto visível no botão"
                    value={link.label}
                    onChange={e => {
                      const newLinks = [...(c.links || [])];
                      newLinks[i] = { ...newLinks[i], label: e.target.value };
                      setField({ links: newLinks });
                    }}
                    className="w-full bg-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const newLinks = [...(c.links || [])];
                    newLinks.splice(i, 1);
                    setField({ links: newLinks });
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Captura de MAC e Device Key */}
        <div className="bg-[#0c0e12] border border-slate-700 rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h5 className="font-bold text-sm text-slate-300">Captura de MAC e Device Key</h5>
              <p className="text-xs text-slate-500 mt-1">Exibir campos opcionais para o cliente enviar o Código MAC e a Device Key para o seu WhatsApp.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={c.showMacInput || false}
                onChange={e => setField({ showMacInput: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {c.showMacInput && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nome do Aplicativo (Enviado automaticamente no WhatsApp)
              </label>
              <input
                type="text"
                value={c.macAppName || ''}
                onChange={e => setField({ macAppName: e.target.value })}
                placeholder="Ex: IBO Player, XCIPTV, Smarters Pro, Smart STB"
                className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500">
                Quando o cliente preencher o MAC ou Código, o nome deste aplicativo será anexado automaticamente na mensagem do WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── CABEÇALHO DO PAINEL ────────────────────────────────────────────────────
  const Header = () => {
    const device = localConfig.devices[deviceIdx];
    const sub = device?.subOptions?.[subIdx];

    return (
      <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button
              onClick={() => {
                if (view === 'suboption') setView('device');
                else setView('list');
              }}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span className={view === 'list' ? 'text-white font-semibold' : 'cursor-pointer hover:text-slate-300'} onClick={() => setView('list')}>
                Dispositivos
              </span>
              {view !== 'list' && (
                <>
                  <ArrowRight size={12} />
                  <span className={view === 'device' ? 'text-white font-semibold' : 'cursor-pointer hover:text-slate-300'} onClick={() => setView('device')}>
                    {device?.name}
                  </span>
                </>
              )}
              {view === 'suboption' && (
                <>
                  <ArrowRight size={12} />
                  <span className="text-white font-semibold">{sub?.name}</span>
                </>
              )}
            </div>
            <h3 className="text-base font-bold text-white">
              {view === 'list' ? 'Gerenciar Teste Grátis' : view === 'device' ? `Editando: ${device?.name}` : `Sub-opção: ${sub?.name}`}
            </h3>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all text-sm"
        >
          <Save size={16} />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    );
  };

  // ─── VIEW: LISTA DE DISPOSITIVOS ────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <Header />

        {/* ALERTA GLOBAL */}
        <div className="bg-[#0c0e12] border border-slate-800 p-5 rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              Aviso Global (Pop-up Inicial)
            </h4>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localConfig.globalAlert?.enabled || false}
                onChange={e => setLocalConfig({ ...localConfig, globalAlert: { ...localConfig.globalAlert, enabled: e.target.checked } as any })}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
          
          {localConfig.globalAlert?.enabled && (
            <div className="space-y-3 mt-4 border-t border-slate-800 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Título do Aviso</label>
                  <input
                    type="text"
                    value={localConfig.globalAlert?.title || ''}
                    onChange={e => setLocalConfig({ ...localConfig, globalAlert: { ...localConfig.globalAlert, title: e.target.value } as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Ex: MANUTENÇÃO PROGRAMADA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Cor/Tipo</label>
                  <select
                    value={localConfig.globalAlert?.type || 'warning'}
                    onChange={e => setLocalConfig({ ...localConfig, globalAlert: { ...localConfig.globalAlert, type: e.target.value as any } as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="info">Azul (Informativo)</option>
                    <option value="warning">Amarelo (Atenção)</option>
                    <option value="danger">Vermelho (Urgente)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Texto do Aviso</label>
                <textarea
                  value={localConfig.globalAlert?.text || ''}
                  onChange={e => setLocalConfig({ ...localConfig, globalAlert: { ...localConfig.globalAlert, text: e.target.value } as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors min-h-[80px]"
                  placeholder="Ex: Nossos servidores entrarão em manutenção às 22h..."
                />
              </div>
            </div>
          )}
        </div>

        {/* LISTA DE DISPOSITIVOS DRAGGABLE */}
        <h4 className="text-white font-bold flex items-center gap-2 px-1">Dispositivos Principais</h4>
        <Reorder.Group 
          axis="y" 
          values={localConfig.devices || []} 
          onReorder={(newOrder) => setLocalConfig({ ...localConfig, devices: newOrder })}
          className="grid grid-cols-1 gap-3"
        >
          {(localConfig.devices || []).map((device, index) => (
            <Reorder.Item
              key={device.id}
              value={device}
              className={`bg-[#0c0e12] border ${device.visible === false ? 'border-dashed border-slate-700 opacity-60' : 'border-slate-800'} hover:border-indigo-500/50 p-4 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between group cursor-grab active:cursor-grabbing gap-3`}
            >
              <div>
                <h4 className="text-white font-bold flex items-center gap-2">
                  {device.name}
                  {device.visible === false && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">Oculto</span>}
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  {device.type === 'content'
                    ? '📄 Conteúdo direto'
                    : `📂 ${device.subOptions?.length || 0} sub-opções`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => toggleDeviceVisibility(index)}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title={device.visible === false ? "Mostrar" : "Ocultar"}
                >
                  {device.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => duplicateDevice(index)}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Duplicar"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => { setDeviceIdx(index); setView('device'); }}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => deleteDevice(index)}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <button
          onClick={addDevice}
          className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500/50 p-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 min-h-[72px]"
        >
          <Plus size={20} />
          <span className="font-bold">Adicionar Dispositivo</span>
        </button>
      </div>
    );
  }

  // ─── VIEW: EDITOR DE DISPOSITIVO ────────────────────────────────────────────
  if (view === 'device') {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[deviceIdx];
    if (!device) {
      return (
        <div className="p-6 text-center text-slate-400">
          <p>Dispositivo não encontrado.</p>
          <button onClick={() => setView('list')} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <Header />

        {/* Nome e Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0c0e12] p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Nome da Aba</label>
            <input
              type="text"
              value={device.name}
              onChange={e => updateDevice(deviceIdx, { ...device, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Tipo de Ação</label>
            <select
              value={device.type}
              onChange={e => updateDevice(deviceIdx, { ...device, type: e.target.value as 'content' | 'suboptions' })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="content">📄 Exibir Conteúdo Direto</option>
              <option value="suboptions">📂 Exibir Sub-opções (ex: Marcas de TV)</option>
            </select>
          </div>
        </div>

        {/* Conteúdo direto */}
        {device.type === 'content' && (
          <div className="bg-[#0c0e12] p-4 rounded-2xl border border-slate-800">
            <ContentEditor
              content={device.content}
              onChange={newContent => updateDevice(deviceIdx, { ...device, content: newContent })}
            />
          </div>
        )}

        {/* Sub-opções */}
        {device.type === 'suboptions' && (
          <div className="bg-[#0c0e12] p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white">Sub-opções de {device.name}</h4>
              <button
                onClick={() => addSubOption(deviceIdx)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>

            {(!device.subOptions || device.subOptions.length === 0) && (
              <p className="text-slate-500 text-sm text-center py-6">Nenhuma sub-opção. Clique em "Adicionar".</p>
            )}

            <Reorder.Group 
              axis="y" 
              values={device.subOptions || []} 
              onReorder={(newOrder) => updateDevice(deviceIdx, { ...device, subOptions: newOrder })}
              className="space-y-2"
            >
              {(device.subOptions || []).map((sub, idx) => (
                <Reorder.Item
                  key={sub.id}
                  value={sub}
                  className={`flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-3 rounded-xl border ${sub.visible === false ? 'border-dashed border-slate-700 opacity-60' : 'border-slate-800'} hover:border-slate-700 transition-colors cursor-grab active:cursor-grabbing gap-3`}
                >
                  <div>
                    <p className="text-white font-bold flex items-center gap-2">
                      {sub.name}
                      {sub.visible === false && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">Oculto</span>}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {sub.content?.title || 'Sem título'} · {sub.content?.links?.length || 0} link(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => toggleSubOptionVisibility(deviceIdx, idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title={sub.visible === false ? "Mostrar" : "Ocultar"}
                    >
                      {sub.visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => duplicateSubOption(deviceIdx, idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="Duplicar"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => { setSubIdx(idx); setView('suboption'); }}
                      className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button
                      onClick={() => deleteSubOption(deviceIdx, idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW: EDITOR DE SUB-OPÇÃO ──────────────────────────────────────────────
  if (view === 'suboption') {
    const currentDevices = localConfig.devices || [];
    const device = currentDevices[deviceIdx];
    const sub = device?.subOptions?.[subIdx];
    if (!device || !sub) {
      return (
        <div className="p-6 text-center text-slate-400">
          <p>Sub-opção não encontrada.</p>
          <button onClick={() => setView('device')} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
            Voltar para o dispositivo
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <Header />

        {/* Nome da Sub-opção */}
        <div className="bg-[#0c0e12] p-4 rounded-2xl border border-slate-800">
          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Nome da Sub-opção (texto do botão)</label>
          <input
            type="text"
            value={sub.name}
            onChange={e => updateSubOption(deviceIdx, subIdx, { ...sub, name: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Ex: LG, SAMSUNG, ROKU..."
          />
        </div>

        {/* Conteúdo da Sub-opção */}
        <div className="bg-[#0c0e12] p-4 rounded-2xl border border-slate-800">
          <h4 className="font-bold text-indigo-400 mb-4 text-sm uppercase tracking-wider">Conteúdo da tela após clicar em "{sub.name}"</h4>
          <ContentEditor
            content={sub.content}
            onChange={newContent => updateSubOption(deviceIdx, subIdx, { ...sub, content: newContent })}
          />
        </div>
      </div>
    );
  }

  return null;
}
