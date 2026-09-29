import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Edit2, Trash2, Save, Check, Image, Video,
  MessageSquare, Zap, ChevronDown, Eye, EyeOff,
  AlertTriangle, Upload, Link,
} from 'lucide-react';

export interface CustomShortcut {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
  colorTheme: ColorTheme;
  message: string;
  mediaType: 'none' | 'image' | 'video';
  mediaUrl: string;
  createdAt: string;
}

export type ColorTheme = 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'pink' | 'cyan' | 'indigo';

const STORAGE_KEY = 'tbi_custom_slash_commands';

export const COLOR_THEMES: Record<ColorTheme, { label: string; badge: string; dot: string; ring: string }> = {
  purple: { label: 'Roxo', badge: 'bg-purple-500/25 text-purple-300 border border-purple-500/50', dot: 'bg-purple-500', ring: 'ring-purple-500' },
  blue: { label: 'Azul', badge: 'bg-blue-500/25 text-blue-300 border border-blue-500/50', dot: 'bg-blue-500', ring: 'ring-blue-500' },
  green: { label: 'Verde', badge: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  amber: { label: 'Ambar', badge: 'bg-amber-500/25 text-amber-300 border border-amber-500/50', dot: 'bg-amber-500', ring: 'ring-amber-500' },
  red: { label: 'Vermelho', badge: 'bg-red-500/25 text-red-300 border border-red-500/50', dot: 'bg-red-500', ring: 'ring-red-500' },
  pink: { label: 'Rosa', badge: 'bg-pink-500/25 text-pink-300 border border-pink-500/50', dot: 'bg-pink-500', ring: 'ring-pink-500' },
  cyan: { label: 'Ciano', badge: 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50', dot: 'bg-cyan-500', ring: 'ring-cyan-500' },
  indigo: { label: 'Indigo', badge: 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/50', dot: 'bg-indigo-500', ring: 'ring-indigo-500' },
};

const EMOJI_OPTIONS = ['🎁','🔥','💎','🎯','📢','⚡','🌟','🏆','💡','🎬','📸','🎉','📣','🛒','💰','📱','🖥️','🚀','✨','🎊','🔧','🛡️','🌈','💫'];

const DEFAULT_FORM: Omit<CustomShortcut, 'id' | 'createdAt'> = {
  command: '/',
  label: '',
  description: '',
  icon: '⚡',
  colorTheme: 'purple',
  message: '',
  mediaType: 'none',
  mediaUrl: '',
};

export const loadCustomShortcuts = (): CustomShortcut[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveCustomShortcuts = (shortcuts: CustomShortcut[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts)); } catch {}
};

export const isCustomShortcutMessage = (msg: string) =>
  msg.includes('[ATALHO_CUSTOM]') && msg.includes('[/ATALHO_CUSTOM]');

export interface CustomShortcutPayload {
  command: string;
  label: string;
  icon: string;
  colorTheme: ColorTheme;
  message: string;
  mediaType: 'none' | 'image' | 'video';
  mediaUrl: string;
}

export const parseCustomShortcutMessage = (msg: string): CustomShortcutPayload | null => {
  try {
    const match = msg.match(/\[ATALHO_CUSTOM\]([\s\S]*?)\[\/ATALHO_CUSTOM\]/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch { return null; }
};

export const buildCustomShortcutMessage = (s: CustomShortcut): string => {
  const payload: CustomShortcutPayload = {
    command: s.command, label: s.label, icon: s.icon, colorTheme: s.colorTheme,
    message: s.message, mediaType: s.mediaType, mediaUrl: s.mediaUrl,
  };
  return `[ATALHO_CUSTOM]${JSON.stringify(payload)}[/ATALHO_CUSTOM]`;
};

function ShortcutPreviewCard({ form }: { form: Omit<CustomShortcut, 'id' | 'createdAt'> }) {
  const theme = COLOR_THEMES[form.colorTheme];
  const isYouTube = form.mediaUrl.includes('youtube.com') || form.mediaUrl.includes('youtu.be');
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-600/50 bg-gradient-to-b from-[#181d2c] to-[#0c0f17] shadow-xl text-white">
      <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{form.icon || '⚡'}</span>
          <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">{form.label || 'Titulo do Atalho'}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}>{form.command || '/cmd'}</span>
      </div>
      {form.mediaType === 'image' && form.mediaUrl && (
        <div className="bg-black/50 flex justify-center p-2">
          <img src={form.mediaUrl} alt="Preview" className="max-h-32 w-auto rounded-xl border border-white/10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      {form.mediaType === 'video' && form.mediaUrl && (
        <div className="bg-black/50 p-2">
          {isYouTube ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
              <iframe src={`https://www.youtube.com/embed/${getYouTubeId(form.mediaUrl)}`} className="w-full h-full" allowFullScreen />
            </div>
          ) : (
            <video src={form.mediaUrl} controls className="w-full rounded-xl border border-white/10 max-h-40" />
          )}
        </div>
      )}
      {form.message && (
        <div className="px-3 py-2.5 text-xs text-slate-300 leading-relaxed bg-[#111520]/80 border-t border-slate-800">{form.message}</div>
      )}
    </div>
  );
}

interface ShortcutFormProps {
  initial: Omit<CustomShortcut, 'id' | 'createdAt'>;
  existingCommands: string[];
  editingId?: string;
  onSave: (data: Omit<CustomShortcut, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function ShortcutForm({ initial, existingCommands, editingId, onSave, onCancel }: ShortcutFormProps) {
  const [form, setForm] = useState(initial);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mediaInputMode, setMediaInputMode] = useState<'url' | 'upload'>('url');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleCommandInput = (val: string) => {
    if (!val.startsWith('/')) val = '/' + val;
    val = val.replace(/\s/g, '').toLowerCase();
    set('command', val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setUploadPreview(url);
      set('mediaUrl', url);
    };
    reader.readAsDataURL(file);
  };

  const isCommandDuplicate = existingCommands.includes(form.command) && form.command !== (editingId ? initial.command : '');
  const isValid = form.command.length >= 2 && form.label.trim() !== '' && form.message.trim() !== '' && !isCommandDuplicate;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar flex-1">
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 hover:border-indigo-500/60 text-2xl flex items-center justify-center transition-all active:scale-95">
            {form.icon}
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-[#0f1420] border border-slate-700 rounded-2xl p-2.5 shadow-2xl grid grid-cols-6 gap-1.5 w-52">
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => { set('icon', emoji); setShowEmojiPicker(false); }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-700 text-lg flex items-center justify-center transition-colors">{emoji}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Comando</label>
          <input type="text" value={form.command} onChange={(e) => handleCommandInput(e.target.value)} placeholder="/meu-atalho"
            className={`bg-[#181d28] border rounded-xl px-3 py-2.5 text-sm font-mono text-indigo-200 placeholder-slate-600 outline-none transition-all ${isCommandDuplicate ? 'border-red-500/60 focus:border-red-500' : 'border-slate-700/80 focus:border-indigo-500'}`} />
          {isCommandDuplicate && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle size={11} /> Comando ja existe</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Titulo do Atalho</label>
        <input type="text" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="ex: Promocao de Renovacao"
          className="bg-[#181d28] border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Descricao (aparece no menu /)</label>
        <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="ex: Envia arte e mensagem de renovacao"
          className="bg-[#181d28] border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cor do Badge</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
            <button key={theme} type="button" onClick={() => set('colorTheme', theme)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${form.colorTheme === theme ? COLOR_THEMES[theme].badge + ' ring-2 ' + COLOR_THEMES[theme].ring : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${COLOR_THEMES[theme].dot}`} />
              {COLOR_THEMES[theme].label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700/60" />

      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tipo de Midia</label>
        <div className="flex gap-2">
          {(['none', 'image', 'video'] as const).map((type) => {
            const icons = { none: <MessageSquare size={15} />, image: <Image size={15} />, video: <Video size={15} /> };
            const labels = { none: 'So Texto', image: 'Imagem', video: 'Video' };
            return (
              <button key={type} type="button" onClick={() => { set('mediaType', type); set('mediaUrl', ''); setUploadPreview(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${form.mediaType === type ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {icons[type]}{labels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {form.mediaType !== 'none' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">URL da {form.mediaType === 'image' ? 'Imagem' : 'Video'}</label>
            <div className="flex gap-1">
              <button type="button" onClick={() => setMediaInputMode('url')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${mediaInputMode === 'url' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                <Link size={11} /> URL
              </button>
              {form.mediaType === 'image' && (
                <button type="button" onClick={() => setMediaInputMode('upload')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${mediaInputMode === 'upload' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Upload size={11} /> Upload
                </button>
              )}
            </div>
          </div>
          {mediaInputMode === 'url' ? (
            <input type="text" value={form.mediaUrl} onChange={(e) => { set('mediaUrl', e.target.value); setUploadPreview(null); }}
              placeholder={form.mediaType === 'image' ? 'https://... ou /nome-da-imagem.jpg' : 'https://youtube.com/watch?v=... ou https://.../video.mp4'}
              className="bg-[#181d28] border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all font-mono text-xs" />
          ) : (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-300 text-sm flex flex-col items-center gap-2 transition-all">
                <Upload size={22} /><span>Clique para selecionar imagem</span>
              </button>
            </div>
          )}
          {form.mediaUrl && form.mediaType === 'image' && (
            <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 flex justify-center p-2">
              <img src={uploadPreview || form.mediaUrl} alt="Preview" className="max-h-28 w-auto rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-700/60" />

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Texto da Mensagem</label>
        <textarea value={form.message} onChange={(e) => set('message', e.target.value)}
          placeholder="Digite a mensagem que sera enviada ao cliente..." rows={4}
          className="bg-[#181d28] border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all resize-none leading-relaxed custom-scrollbar" />
      </div>

      <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-xs text-indigo-300 hover:text-indigo-200 font-semibold self-start transition-colors">
        {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
        {showPreview ? 'Ocultar' : 'Ver'} pre-visualizacao
      </button>

      {showPreview && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-[11px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Pre-visualizacao da mensagem:</p>
          <ShortcutPreviewCard form={form} />
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-slate-700/60 sticky bottom-0 bg-[#0f1420] py-3 -mx-4 px-4">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-all border border-slate-700 active:scale-95">Cancelar</button>
        <button type="button" disabled={!isValid} onClick={() => isValid && onSave(form)}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
          <Save size={16} />{editingId ? 'Salvar Alteracoes' : 'Criar Atalho'}
        </button>
      </div>
    </div>
  );
}

interface CustomShortcutsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutsChanged: (shortcuts: CustomShortcut[]) => void;
}

export const CustomShortcutsManagerModal: React.FC<CustomShortcutsManagerModalProps> = ({ isOpen, onClose, onShortcutsChanged }) => {
  const [shortcuts, setShortcuts] = useState<CustomShortcut[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingShortcut, setEditingShortcut] = useState<CustomShortcut | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setShortcuts(loadCustomShortcuts()); setView('list'); setEditingShortcut(null); }
  }, [isOpen]);

  const updateAndNotify = (updated: CustomShortcut[]) => {
    saveCustomShortcuts(updated); setShortcuts(updated); onShortcutsChanged(updated);
  };

  const handleCreate = (data: Omit<CustomShortcut, 'id' | 'createdAt'>) => {
    updateAndNotify([...shortcuts, { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
    setView('list');
  };

  const handleEdit = (data: Omit<CustomShortcut, 'id' | 'createdAt'>) => {
    if (!editingShortcut) return;
    updateAndNotify(shortcuts.map((s) => s.id === editingShortcut.id ? { ...s, ...data } : s));
    setView('list'); setEditingShortcut(null);
  };

  const handleDelete = (id: string) => { updateAndNotify(shortcuts.filter((s) => s.id !== id)); setDeleteConfirmId(null); };
  const existingCommands = shortcuts.map((s) => s.command);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => { if (view !== 'list') return; onClose(); }}>
      <div className="bg-[#0f1420] border border-slate-700/60 rounded-t-3xl sm:rounded-3xl w-full max-w-lg sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {(view === 'create' || view === 'edit') && (
              <button type="button" onClick={() => { setView('list'); setEditingShortcut(null); }}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60">
                <ChevronDown size={16} className="rotate-90" />
              </button>
            )}
            <div>
              <h2 className="font-black text-white text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/25 border border-indigo-500/40 flex items-center justify-center text-sm font-mono font-black text-indigo-200">/</span>
                {view === 'list' && 'Meus Atalhos Personalizados'}
                {view === 'create' && 'Criar Novo Atalho'}
                {view === 'edit' && 'Editar Atalho'}
              </h2>
              {view === 'list' && <p className="text-xs text-slate-400 mt-0.5">{shortcuts.length} atalho{shortcuts.length !== 1 ? 's' : ''} criado{shortcuts.length !== 1 ? 's' : ''}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-all border border-slate-700/60"><X size={18} /></button>
        </div>

        {view === 'list' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-4">
              <button type="button" onClick={() => { setView('create'); setEditingShortcut(null); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]">
                <Plus size={18} />Criar Novo Atalho (com imagem, video ou texto)
              </button>
            </div>
            {shortcuts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3"><Zap size={28} className="text-slate-600" /></div>
                <p className="font-bold text-slate-400">Nenhum atalho personalizado</p>
                <p className="text-xs mt-1">Crie seus proprios atalhos com imagens, videos e mensagens para enviar pelo /</p>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-2">
                {shortcuts.map((s) => {
                  const theme = COLOR_THEMES[s.colorTheme];
                  const isConfirmDelete = deleteConfirmId === s.id;
                  return (
                    <div key={s.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5 flex items-start gap-3">
                      <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono font-bold text-indigo-300 text-xs px-2 py-0.5 rounded bg-slate-700 border border-slate-600">{s.command}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}>{theme.label}</span>
                          {s.mediaType !== 'none' && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                              {s.mediaType === 'image' ? <Image size={10} /> : <Video size={10} />}
                              {s.mediaType === 'image' ? 'Imagem' : 'Video'}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-white text-sm truncate">{s.label}</p>
                        {s.description && <p className="text-xs text-slate-400 truncate mt-0.5">{s.description}</p>}
                        {s.message && <p className="text-xs text-slate-500 truncate mt-1 italic">"{s.message.slice(0, 60)}{s.message.length > 60 ? '...' : ''}"</p>}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button type="button" onClick={() => { setEditingShortcut(s); setView('edit'); }}
                          className="p-2 rounded-xl bg-slate-700/60 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 transition-all border border-slate-600/60" title="Editar"><Edit2 size={14} /></button>
                        {isConfirmDelete ? (
                          <div className="flex flex-col gap-1">
                            <button type="button" onClick={() => handleDelete(s.id)} className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"><Check size={14} /></button>
                            <button type="button" onClick={() => setDeleteConfirmId(null)} className="p-2 rounded-xl bg-slate-700/60 border border-slate-600/60 text-slate-400 transition-all"><X size={14} /></button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setDeleteConfirmId(s.id)} className="p-2 rounded-xl bg-slate-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-all border border-slate-600/60"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mx-4 mb-4 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-300/80 flex items-start gap-2">
              <Zap size={14} className="shrink-0 mt-0.5 text-indigo-400" />
              <p>No chat, digite <strong className="text-indigo-200">/</strong> para abrir a lista de atalhos. Seus atalhos personalizados aparecerao junto com os padrao.</p>
            </div>
          </div>
        )}
        {view === 'create' && <ShortcutForm initial={DEFAULT_FORM} existingCommands={existingCommands} onSave={handleCreate} onCancel={() => setView('list')} />}
        {view === 'edit' && editingShortcut && (
          <ShortcutForm
            initial={{ command: editingShortcut.command, label: editingShortcut.label, description: editingShortcut.description, icon: editingShortcut.icon, colorTheme: editingShortcut.colorTheme, message: editingShortcut.message, mediaType: editingShortcut.mediaType, mediaUrl: editingShortcut.mediaUrl }}
            existingCommands={existingCommands.filter((c) => c !== editingShortcut.command)}
            editingId={editingShortcut.id}
            onSave={handleEdit}
            onCancel={() => { setView('list'); setEditingShortcut(null); }}
          />
        )}
      </div>
    </div>
  );
};
