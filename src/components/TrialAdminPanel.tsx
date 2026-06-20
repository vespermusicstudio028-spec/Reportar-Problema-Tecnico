import React, { useState } from 'react';
import { TrialConfig, TrialDevice, TrialSubOption, TrialContentBlock, TrialLink } from '../types/trial';
import { Save, Plus, Trash2, Edit2, ChevronLeft, ChevronDown, ChevronRight, Image as ImageIcon, Video, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  config: TrialConfig;
  onSave: (config: TrialConfig) => Promise<void>;
}

export function TrialAdminPanel({ config, onSave }: Props) {
  const [localConfig, setLocalConfig] = useState<TrialConfig>(JSON.parse(JSON.stringify(config)));
  const [editingDeviceIndex, setEditingDeviceIndex] = useState<number | null>(null);
  const [editingSubOptionIndex, setEditingSubOptionIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localConfig);
    setIsSaving(false);
    alert('Configurações salvas com sucesso!');
  };

  const addDevice = () => {
    const newDevice: TrialDevice = {
      id: `dev_${Date.now()}`,
      name: 'Novo Dispositivo',
      type: 'content',
      content: { title: 'NOVO DISPOSITIVO', textBlocks: [] }
    };
    setLocalConfig({ ...localConfig, devices: [...localConfig.devices, newDevice] });
    setEditingDeviceIndex(localConfig.devices.length);
  };

  const deleteDevice = (index: number) => {
    if (confirm('Tem certeza que deseja excluir este dispositivo?')) {
      const newDevices = [...localConfig.devices];
      newDevices.splice(index, 1);
      setLocalConfig({ ...localConfig, devices: newDevices });
    }
  };

  const updateDevice = (index: number, updatedDevice: TrialDevice) => {
    const newDevices = [...localConfig.devices];
    newDevices[index] = updatedDevice;
    setLocalConfig({ ...localConfig, devices: newDevices });
  };

  // --- RENDERS ---

  const renderContentEditor = (content: TrialContentBlock | undefined, onChange: (newContent: TrialContentBlock) => void) => {
    const safeContent = content || {};
    
    return (
      <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
        <h4 className="font-bold text-indigo-400 mb-2">Conteúdo da Tela</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Título</label>
            <input 
              type="text" 
              value={safeContent.title || ''} 
              onChange={e => onChange({ ...safeContent, title: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Ex: SMARTV SAMSUNG"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subtítulo (Opcional)</label>
            <input 
              type="text" 
              value={safeContent.subtitle || ''} 
              onChange={e => onChange({ ...safeContent, subtitle: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Parágrafos de Texto (um por linha)</label>
          <textarea 
            value={(safeContent.textBlocks || []).join('\n')}
            onChange={e => onChange({ ...safeContent, textBlocks: e.target.value.split('\n').filter(t => t.trim() !== '') })}
            className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 min-h-[100px]"
            placeholder="Digite o texto aqui..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo de Mídia</label>
            <select 
              value={safeContent.mediaType || 'none'}
              onChange={e => onChange({ ...safeContent, mediaType: e.target.value as any })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="none">Nenhuma</option>
              <option value="image">Imagem (Foto)</option>
              <option value="video">Vídeo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">URL da Mídia (Link)</label>
            <input 
              type="text" 
              value={safeContent.mediaUrl || ''} 
              onChange={e => onChange({ ...safeContent, mediaUrl: e.target.value })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Ex: https://..." 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Alerta Superior (Texto)</label>
            <input 
              type="text" 
              value={safeContent.topAlert?.text || ''} 
              onChange={e => onChange({ ...safeContent, topAlert: e.target.value ? { type: safeContent.topAlert?.type || 'info', text: e.target.value } : undefined })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Alerta Inferior (Texto em Vermelho)</label>
            <input 
              type="text" 
              value={safeContent.bottomAlert?.text || ''} 
              onChange={e => onChange({ ...safeContent, bottomAlert: e.target.value ? { type: 'danger', text: e.target.value } : undefined })}
              className="w-full bg-[#0c0e12] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Ex: MANUTENÇÃO ANUAL R$19,00"
            />
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4 mt-4">
          <h5 className="font-bold text-sm text-slate-300 mb-2 flex items-center gap-2"><LinkIcon size={16} /> Links / Botões</h5>
          {(safeContent.links || []).map((link, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center bg-[#0c0e12] p-2 rounded-lg">
              <input 
                type="text" placeholder="URL (abre.ai/..)" value={link.url}
                onChange={e => {
                  const newLinks = [...(safeContent.links || [])];
                  newLinks[i].url = e.target.value;
                  onChange({ ...safeContent, links: newLinks });
                }}
                className="flex-1 bg-transparent border-b border-slate-700 px-2 text-sm text-white"
              />
              <input 
                type="text" placeholder="Texto Visível" value={link.label}
                onChange={e => {
                  const newLinks = [...(safeContent.links || [])];
                  newLinks[i].label = e.target.value;
                  onChange({ ...safeContent, links: newLinks });
                }}
                className="flex-1 bg-transparent border-b border-slate-700 px-2 text-sm text-white"
              />
              <button onClick={() => {
                const newLinks = [...(safeContent.links || [])];
                newLinks.splice(i, 1);
                onChange({ ...safeContent, links: newLinks });
              }} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16}/></button>
            </div>
          ))}
          <button 
            onClick={() => onChange({ ...safeContent, links: [...(safeContent.links || []), { id: `link_${Date.now()}`, url: '', label: '', style: 'primary' }] })}
            className="text-indigo-400 text-sm hover:underline flex items-center gap-1 mt-2"
          >
            <Plus size={14} /> Adicionar Link
          </button>
        </div>
      </div>
    );
  };

  const renderDeviceEditor = () => {
    if (editingDeviceIndex === null) return null;
    const device = localConfig.devices[editingDeviceIndex];

    return (
      <div className="bg-[#0c0e12] p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { setEditingDeviceIndex(null); setEditingSubOptionIndex(null); }} className="text-slate-400 hover:text-white flex items-center gap-2">
            <ChevronLeft size={20} /> Voltar
          </button>
          <h3 className="text-xl font-bold text-white">Editando: {device.name}</h3>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Dispositivo (Aba)</label>
              <input 
                type="text" 
                value={device.name} 
                onChange={e => updateDevice(editingDeviceIndex, { ...device, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Ação</label>
              <select 
                value={device.type}
                onChange={e => updateDevice(editingDeviceIndex, { ...device, type: e.target.value as 'content' | 'suboptions' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="content">Exibir Conteúdo Direto</option>
                <option value="suboptions">Exibir Sub-opções (ex: Marcas de TV)</option>
              </select>
            </div>
          </div>

          {device.type === 'content' && (
            renderContentEditor(device.content, (newContent) => updateDevice(editingDeviceIndex, { ...device, content: newContent }))
          )}

          {device.type === 'suboptions' && (
            <div className="space-y-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">Sub-opções</h4>
                <button 
                  onClick={() => {
                    const newSub: TrialSubOption = { id: `sub_${Date.now()}`, name: 'Nova Opção', content: { title: 'NOVA OPÇÃO' } };
                    updateDevice(editingDeviceIndex, { ...device, subOptions: [...(device.subOptions || []), newSub] });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {(device.subOptions || []).map((sub, idx) => (
                  <div key={sub.id} className="border border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 p-3 flex items-center justify-between">
                      <input 
                        type="text" 
                        value={sub.name}
                        onChange={e => {
                          const newSubs = [...(device.subOptions || [])];
                          newSubs[idx].name = e.target.value;
                          updateDevice(editingDeviceIndex, { ...device, subOptions: newSubs });
                        }}
                        className="bg-transparent text-white font-bold focus:outline-none focus:border-b focus:border-indigo-500 px-1"
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingSubOptionIndex(editingSubOptionIndex === idx ? null : idx)}
                          className="text-indigo-400 hover:text-indigo-300 p-2"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Excluir esta sub-opção?')) {
                              const newSubs = [...(device.subOptions || [])];
                              newSubs.splice(idx, 1);
                              updateDevice(editingDeviceIndex, { ...device, subOptions: newSubs });
                            }
                          }}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {editingSubOptionIndex === idx && (
                      <div className="p-4 bg-slate-900">
                        {renderContentEditor(sub.content, (newContent) => {
                          const newSubs = [...(device.subOptions || [])];
                          newSubs[idx].content = newContent;
                          updateDevice(editingDeviceIndex, { ...device, subOptions: newSubs });
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
        <div>
          <h3 className="text-lg font-bold text-white">Configurações do Teste Grátis</h3>
          <p className="text-slate-400 text-sm">Edite os botões, abas e textos do fluxo de Teste Grátis.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
        >
          {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Tudo</>}
        </button>
      </div>

      {editingDeviceIndex === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localConfig.devices.map((device, index) => (
            <div key={device.id} className="bg-[#0c0e12] border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl transition-all group flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold text-lg">{device.name}</h4>
                <p className="text-slate-500 text-sm mt-1">
                  {device.type === 'content' ? 'Exibe conteúdo direto' : `${device.subOptions?.length || 0} sub-opções cadastradas`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingDeviceIndex(index)}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteDevice(index)}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={addDevice}
            className="bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 p-5 rounded-2xl transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-400 min-h-[100px]"
          >
            <Plus size={24} />
            <span className="font-bold">Adicionar Dispositivo</span>
          </button>
        </div>
      ) : (
        renderDeviceEditor()
      )}
    </div>
  );
}
