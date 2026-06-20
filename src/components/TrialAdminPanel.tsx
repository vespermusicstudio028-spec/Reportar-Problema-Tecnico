import React, { useState } from 'react';
import { TrialConfig, TrialDevice, TrialSubOption, TrialContentBlock, TrialLink } from '../types/trial';
import { Save, Plus, Trash2, Edit2, ChevronLeft, Link as LinkIcon, ArrowRight } from 'lucide-react';

interface Props {
  config: TrialConfig;
  onSave: (config: TrialConfig) => Promise<void>;
}

type ViewLevel = 'list' | 'device' | 'suboption';

export function TrialAdminPanel({ config, onSave }: Props) {
  const [localConfig, setLocalConfig] = useState<TrialConfig>(JSON.parse(JSON.stringify(config)));
  const [view, setView] = useState<ViewLevel>('list');
  const [deviceIdx, setDeviceIdx] = useState<number>(0);
  const [subIdx, setSubIdx] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localConfig);
    setIsSaving(false);
    alert('✅ Configurações salvas com sucesso!');
  };

  const updateDevice = (index: number, updatedDevice: TrialDevice) => {
    const newDevices = [...localConfig.devices];
    newDevices[index] = updatedDevice;
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const updateSubOption = (devIdx: number, sIdx: number, updatedSub: TrialSubOption) => {
    const newDevices = [...localConfig.devices];
    const newSubs = [...(newDevices[devIdx].subOptions || [])];
    newSubs[sIdx] = updatedSub;
    newDevices[devIdx] = { ...newDevices[devIdx], subOptions: newSubs };
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const addDevice = () => {
    const newDevice: TrialDevice = {
      id: `dev_${Date.now()}`,
      name: 'Novo Dispositivo',
      type: 'content',
      content: { title: 'NOVO DISPOSITIVO', textBlocks: [] }
    };
    const newDevices = [...localConfig.devices, newDevice];
    setLocalConfig({ ...localConfig, devices: newDevices });
    setDeviceIdx(newDevices.length - 1);
    setView('device');
  };

  const deleteDevice = (index: number) => {
    if (!confirm('Tem certeza que deseja excluir este dispositivo?')) return;
    const newDevices = [...localConfig.devices];
    newDevices.splice(index, 1);
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  const addSubOption = (devIdx: number) => {
    const device = localConfig.devices[devIdx];
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
    const device = localConfig.devices[devIdx];
    const newSubs = [...(device.subOptions || [])];
    newSubs.splice(sIdx, 1);
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

        {/* Mídia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Tipo de Mídia</label>
            <select
              value={c.mediaType || 'none'}
              onChange={e => setField({ mediaType: e.target.value as any })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="none">Nenhuma</option>
              <option value="image">🖼️ Imagem (Foto)</option>
              <option value="video">🎬 Vídeo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">URL da Mídia</label>
            <input
              type="text"
              value={c.mediaUrl || ''}
              onChange={e => setField({ mediaUrl: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="https://..."
              disabled={!c.mediaType || c.mediaType === 'none'}
            />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {localConfig.devices.map((device, index) => (
            <div
              key={device.id}
              className="bg-[#0c0e12] border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-white font-bold">{device.name}</h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  {device.type === 'content'
                    ? '📄 Conteúdo direto'
                    : `📂 ${device.subOptions?.length || 0} sub-opções`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
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
            </div>
          ))}

          <button
            onClick={addDevice}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 p-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 min-h-[72px]"
          >
            <Plus size={20} />
            <span className="font-bold">Adicionar Dispositivo</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── VIEW: EDITOR DE DISPOSITIVO ────────────────────────────────────────────
  if (view === 'device') {
    const device = localConfig.devices[deviceIdx];

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

            <div className="space-y-2">
              {(device.subOptions || []).map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <p className="text-white font-bold">{sub.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {sub.content?.title || 'Sem título'} · {sub.content?.links?.length || 0} link(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setSubIdx(idx); setView('suboption'); }}
                      className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button
                      onClick={() => deleteSubOption(deviceIdx, idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW: EDITOR DE SUB-OPÇÃO ──────────────────────────────────────────────
  if (view === 'suboption') {
    const device = localConfig.devices[deviceIdx];
    const sub = device?.subOptions?.[subIdx];
    if (!sub) return null;

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
