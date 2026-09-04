import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Edit,
  ShoppingBag,
  Upload,
  Image as ImageIcon,
  Video,
  Play,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ExternalLink,
  Tv,
  Star,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { StoreProduct } from '../types/store';
import {
  fetchStoreProducts,
  saveStoreProduct,
  deleteStoreProduct,
  uploadProductImage,
  formatVideoEmbedUrl
} from '../lib/storeService';

interface AdminStoreManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsUpdated?: () => void;
}

const COLOR_THEMES = [
  { id: 'blue', label: 'Azul Neon', bg: 'bg-blue-600', border: 'border-blue-500' },
  { id: 'purple', label: 'Roxo / Violeta', bg: 'bg-purple-600', border: 'border-purple-500' },
  { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-600', border: 'border-emerald-500' },
  { id: 'amber', label: 'Dourado / Âmbar', bg: 'bg-amber-600', border: 'border-amber-500' },
] as const;

export const AdminStoreManagerModal: React.FC<AdminStoreManagerModalProps> = ({
  isOpen,
  onClose,
  onProductsUpdated,
}) => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Partial<StoreProduct> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setLoading(true);
    const data = await fetchStoreProducts(false); // trazer todos, inclusive inativos
    setProducts(data);
    setLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleStartNewProduct = () => {
    setSelectedProduct({
      name: '',
      price: 'R$ ',
      period: '/mês',
      screens: '1 Aparelho',
      badge: '',
      badge_color: 'from-blue-500 to-cyan-500',
      color_theme: 'blue',
      description: '',
      features: ['+100.000 Conteúdos 4K/FHD', 'Qualidade Antitrava', 'Suporte Especializado'],
      images: [],
      video_url: '',
      payment_link: '',
      is_active: true,
      is_popular: false,
      sort_order: products.length + 1
    });
    setFeatureInput('');
    setImageUrlInput('');
    setIsEditing(true);
  };

  const handleEditProduct = (prod: StoreProduct) => {
    setSelectedProduct({ ...prod });
    setFeatureInput('');
    setImageUrlInput('');
    setIsEditing(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;

    setSaving(true);
    const res = await deleteStoreProduct(id);
    setSaving(false);

    if (res.success) {
      showNotification('success', `Produto "${name}" excluído com sucesso!`);
      if (selectedProduct?.id === id) {
        setIsEditing(false);
        setSelectedProduct(null);
      }
      await loadProducts();
      if (onProductsUpdated) onProductsUpdated();
    } else {
      showNotification('error', res.error || 'Erro ao excluir produto.');
    }
  };

  // Alternar visibilidade (ocultar ou mostrar produto para os clientes)
  const handleToggleProductVisibility = async (prod: StoreProduct) => {
    const newStatus = !prod.is_active;

    // Atualização otimista imediata na UI
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, is_active: newStatus } : p))
    );

    const res = await saveStoreProduct({ id: prod.id, is_active: newStatus });
    if (res.success) {
      showNotification(
        'success',
        newStatus
          ? `O produto "${prod.name}" agora está VISÍVEL na loja para os clientes! 👁️`
          : `O produto "${prod.name}" agora está OCULTO dos clientes! 👁️‍🗨️`
      );
      if (onProductsUpdated) onProductsUpdated();
    } else {
      // Reverter em caso de falha
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, is_active: prod.is_active } : p))
      );
      showNotification('error', 'Erro ao alterar visibilidade do produto.');
    }
  };

  const handleSaveProduct = async () => {
    if (!selectedProduct) return;

    if (!selectedProduct.name?.trim()) {
      showNotification('error', 'Por favor, informe o nome do produto.');
      return;
    }
    if (!selectedProduct.price?.trim()) {
      showNotification('error', 'Por favor, informe o preço do produto.');
      return;
    }

    setSaving(true);
    const res = await saveStoreProduct(selectedProduct);
    setSaving(false);

    if (res.success) {
      showNotification('success', 'Produto salvo com sucesso no banco de dados!');
      setIsEditing(false);
      setSelectedProduct(null);
      await loadProducts();
      if (onProductsUpdated) onProductsUpdated();
    } else {
      showNotification('error', res.error || 'Erro ao salvar produto.');
    }
  };

  // Upload de imagem (até 5)
  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProduct) return;

    const currentImages = selectedProduct.images || [];
    const remainingSlots = 5 - currentImages.length;

    if (remainingSlots <= 0) {
      showNotification('error', 'Limite máximo de 5 fotos atingido.');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploadingImage(true);

    const newUrls: string[] = [];
    for (const file of filesToUpload) {
      const res = await uploadProductImage(file);
      if (res.url) {
        newUrls.push(res.url);
      }
    }

    setUploadingImage(false);

    if (newUrls.length > 0) {
      setSelectedProduct(prev => prev ? {
        ...prev,
        images: [...(prev.images || []), ...newUrls].slice(0, 5)
      } : null);
      showNotification('success', `${newUrls.length} foto(s) adicionada(s) com sucesso!`);
    } else {
      showNotification('error', 'Falha ao processar imagens.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || !selectedProduct) return;
    const current = selectedProduct.images || [];
    if (current.length >= 5) {
      showNotification('error', 'Limite máximo de 5 fotos atingido.');
      return;
    }

    setSelectedProduct(prev => prev ? {
      ...prev,
      images: [...(prev.images || []), imageUrlInput.trim()].slice(0, 5)
    } : null);
    setImageUrlInput('');
    showNotification('success', 'Foto adicionada via link!');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!selectedProduct) return;
    setSelectedProduct(prev => prev ? {
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    } : null);
  };

  // Benefícios / Features
  const handleAddFeature = () => {
    if (!featureInput.trim() || !selectedProduct) return;
    setSelectedProduct(prev => prev ? {
      ...prev,
      features: [...(prev.features || []), featureInput.trim()]
    } : null);
    setFeatureInput('');
  };

  const handleRemoveFeature = (idxToRemove: number) => {
    if (!selectedProduct) return;
    setSelectedProduct(prev => prev ? {
      ...prev,
      features: (prev.features || []).filter((_, idx) => idx !== idxToRemove)
    } : null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-[#0c101a] border border-slate-700/90 rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-[#111624] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-[#0c101a] rounded-[14px] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Gerenciador da Loja de Vendas
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Administrador
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Crie, edite e personalize planos, fotos (até 5), vídeos e preços da loja
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartNewProduct}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Plus size={15} />
                  <span>Novo Produto</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Feedback Alertas */}
          {feedback && (
            <div
              className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-600/20 text-emerald-300 border-b border-emerald-500/30'
                  : 'bg-rose-600/20 text-rose-300 border-b border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-amber-500" />
                <span className="text-sm">Carregando produtos da loja...</span>
              </div>
            ) : isEditing && selectedProduct ? (
              /* Formulário de Criação / Edição */
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedProduct(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline mr-2"
                    >
                      ← Voltar para a lista
                    </button>
                    <h3 className="text-base font-bold text-white">
                      {selectedProduct.id ? `Editando: ${selectedProduct.name}` : 'Cadastrar Novo Produto de Venda'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveProduct}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Salvar Produto</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coluna Esquerda: Dados Básicos & Preço */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nome do Produto / Plano *
                      </label>
                      <input
                        type="text"
                        value={selectedProduct.name || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                        placeholder="Ex: Plano Individual (1 Tela) ou Combo Família 4K"
                        className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Preço *
                        </label>
                        <input
                          type="text"
                          value={selectedProduct.price || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
                          placeholder="Ex: R$ 35,00"
                          className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Período de Cobrança
                        </label>
                        <input
                          type="text"
                          value={selectedProduct.period || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, period: e.target.value })}
                          placeholder="Ex: /mês, /anual, /ponto"
                          className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Telas / Conexões
                        </label>
                        <input
                          type="text"
                          value={selectedProduct.screens || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, screens: e.target.value })}
                          placeholder="Ex: 1 Aparelho ou 2 Telas simultâneas"
                          className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Etiqueta / Badge (Opcional)
                        </label>
                        <input
                          type="text"
                          value={selectedProduct.badge || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, badge: e.target.value })}
                          placeholder="Ex: MAIS VENDIDO 🔥, NOVO 🚀"
                          className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Link de Pagamento / Mercado Pago
                      </label>
                      <input
                        type="url"
                        value={selectedProduct.payment_link || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, payment_link: e.target.value })}
                        placeholder="Ex: https://mpago.la/..."
                        className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* Tema de Cores e Opções */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Cor do Card
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {COLOR_THEMES.map((th) => (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => setSelectedProduct({ ...selectedProduct, color_theme: th.id as any })}
                              className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                                selectedProduct.color_theme === th.id
                                  ? `${th.border} bg-white/10 text-white shadow-md`
                                  : 'border-slate-800 bg-[#101420] text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${th.bg}`} />
                              <span className="truncate">{th.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Visibilidade para Clientes
                        </label>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct({ ...selectedProduct, is_active: !selectedProduct.is_active })}
                          className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                            selectedProduct.is_active
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                          }`}
                          title={selectedProduct.is_active ? 'Clique para ocultar dos clientes' : 'Clique para mostrar aos clientes'}
                        >
                          <span className="flex items-center gap-1.5">
                            {selectedProduct.is_active ? <Eye size={15} className="text-emerald-400" /> : <EyeOff size={15} className="text-rose-400" />}
                            <span>{selectedProduct.is_active ? 'Visível na Loja' : 'Oculto dos Clientes'}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedProduct.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {selectedProduct.is_active ? 'Ativo' : 'Oculto'}
                          </span>
                        </button>

                        <label className="flex items-center gap-2 p-2 rounded-xl bg-[#101420] border border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProduct.is_popular ?? false}
                            onChange={(e) => setSelectedProduct({ ...selectedProduct, is_popular: e.target.checked })}
                            className="rounded accent-amber-500"
                          />
                          <span className="text-xs text-slate-200 flex items-center gap-1">
                            <Star size={12} className="text-amber-400" /> Destacar como Principal
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Descrição Detalhada */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Descrição Completa do Produto
                      </label>
                      <textarea
                        rows={4}
                        value={selectedProduct.description || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                        placeholder="Descreva todos os detalhes, benefícios, canais incluídos e vantagens para o cliente..."
                        className="w-full bg-[#131929] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Coluna Direita: Fotos (até 5), Vídeo & Recursos */}
                  <div className="space-y-5">
                    {/* Seção de Fotos (Até 5 Fotos) */}
                    <div className="p-4 rounded-2xl bg-[#101420] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-blue-400" />
                          <span>Fotos do Produto ({selectedProduct.images?.length || 0}/5 fotos)</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Máximo 5 imagens</span>
                      </div>

                      {/* Lista de Fotos Adicionadas */}
                      <div className="grid grid-cols-5 gap-2">
                        {(selectedProduct.images || []).map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
                          >
                            <img
                              src={imgUrl}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                                title="Remover Foto"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 px-1 rounded bg-black/70 text-[9px] text-white">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}

                        {/* Slot de Adicionar se < 5 */}
                        {(selectedProduct.images?.length || 0) < 5 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-900/40 hover:bg-slate-900 transition-all flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 active:scale-95"
                          >
                            {uploadingImage ? (
                              <Loader2 size={16} className="animate-spin text-amber-400" />
                            ) : (
                              <>
                                <Upload size={16} />
                                <span className="text-[9px] font-bold">Upload</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Input oculto para upload de arquivos */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFilesSelected}
                        className="hidden"
                      />

                      {/* Adicionar via link direto */}
                      {(selectedProduct.images?.length || 0) < 5 && (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="url"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="Ou cole o link direto de uma imagem (https://...)"
                            className="flex-1 bg-[#131929] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddImageUrl}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                          >
                            Adicionar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Seção de Vídeo do Produto */}
                    <div className="p-4 rounded-2xl bg-[#101420] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Video size={14} className="text-purple-400" />
                          <span>Vídeo Demonstrativo do Produto</span>
                        </label>
                        {selectedProduct.video_url && (
                          <button
                            type="button"
                            onClick={() => setVideoPreviewOpen(!videoPreviewOpen)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                          >
                            <Play size={11} /> {videoPreviewOpen ? 'Ocultar Preview' : 'Testar Vídeo'}
                          </button>
                        )}
                      </div>

                      <input
                        type="url"
                        value={selectedProduct.video_url || ''}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, video_url: e.target.value })}
                        placeholder="Cole o link do YouTube (ex: https://youtu.be/...) ou vídeo MP4"
                        className="w-full bg-[#131929] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                      />

                      {/* Preview do Vídeo */}
                      {videoPreviewOpen && selectedProduct.video_url && (
                        <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video mt-2">
                          {(() => {
                            const vInfo = formatVideoEmbedUrl(selectedProduct.video_url);
                            if (vInfo.type === 'youtube' || vInfo.type === 'vimeo') {
                              return (
                                <iframe
                                  src={vInfo.embedUrl}
                                  title="Pré-visualização do vídeo"
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              );
                            }
                            return (
                              <video
                                src={selectedProduct.video_url}
                                controls
                                className="w-full h-full object-contain"
                              />
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Lista de Benefícios / Itens Incluídos */}
                    <div className="p-4 rounded-2xl bg-[#101420] border border-slate-800 space-y-3">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Benefícios & Recursos Incluídos</span>
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFeature();
                            }
                          }}
                          placeholder="Ex: Canais Premiere e Combate liberados"
                          className="flex-1 bg-[#131929] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddFeature}
                          className="px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>Adicionar</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(selectedProduct.features || []).map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#131929] border border-slate-800 text-xs text-slate-200"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remover"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Ações */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  {selectedProduct.id ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteProduct(selectedProduct.id!, selectedProduct.name || '')}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      <span>Excluir Produto</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedProduct(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveProduct}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Salvar e Publicar na Loja</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de Produtos Cadastrados */
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Total de {products.length} produto(s) cadastrado(s) na Loja</span>
                  <span>Clique em Editar para alterar fotos, vídeo, preço ou descrição</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        prod.is_active
                          ? 'border-slate-800 bg-[#101420] hover:border-slate-700'
                          : 'border-dashed border-slate-800/80 bg-[#0c101a]/50 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Topo: Nome, Preço e Badges */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">{prod.name}</h4>
                              
                              {/* Botão do Olhinho para Ocultar ou Mostrar */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleProductVisibility(prod);
                                }}
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all active:scale-95 shadow-sm ${
                                  prod.is_active
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:border-emerald-500'
                                    : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40 hover:border-rose-500'
                                }`}
                                title={prod.is_active ? 'Clique para ocultar este produto dos clientes na loja' : 'Clique para mostrar este produto aos clientes na loja'}
                              >
                                {prod.is_active ? <Eye size={13} className="text-emerald-400" /> : <EyeOff size={13} className="text-rose-400" />}
                                <span>{prod.is_active ? 'Visível na Loja' : 'Oculto dos Clientes'}</span>
                              </button>

                              {prod.is_popular && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ⭐ Destaque
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Tv size={12} /> {prod.screens}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400">
                              {prod.price}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {prod.period}
                            </span>
                          </div>
                        </div>

                        {/* Mini-Galeria de Fotos e Indicador de Vídeo */}
                        <div className="flex items-center gap-2 my-2.5">
                          {prod.images && prod.images.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {prod.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                                />
                              ))}
                              <span className="text-[10px] text-slate-400 ml-1">
                                {prod.images.length}/5 fotos
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <ImageIcon size={12} /> Sem fotos cadastradas
                            </span>
                          )}

                          {prod.video_url && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Play size={10} /> Com Vídeo
                            </span>
                          )}
                        </div>

                        {/* Descrição Curta */}
                        {prod.description && (
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                            {prod.description}
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card: Ações */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 truncate">
                          {prod.features?.length || 0} recursos inclusos
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Botão de Ação Rápida com Olhinho */}
                          <button
                            type="button"
                            onClick={() => handleToggleProductVisibility(prod)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border ${
                              prod.is_active
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                            }`}
                            title={prod.is_active ? 'Clique para ocultar este produto dos clientes' : 'Clique para mostrar este produto aos clientes'}
                          >
                            {prod.is_active ? <Eye size={13} className="text-emerald-400" /> : <EyeOff size={13} className="text-rose-400" />}
                            <span>{prod.is_active ? 'Ocultar' : 'Mostrar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditProduct(prod)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Edit size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 transition-all active:scale-95"
                            title="Excluir produto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
