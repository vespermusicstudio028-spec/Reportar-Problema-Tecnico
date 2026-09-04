import { supabase } from './supabase';
import { StoreProduct } from '../types/store';

const BUCKET_NAME = 'store-media';

/**
 * Busca a lista de produtos da loja no Supabase.
 * @param onlyActive se true, filtra apenas produtos ativos (modo cliente)
 */
export async function fetchStoreProducts(onlyActive: boolean = true): Promise<StoreProduct[]> {
  try {
    let query = supabase
      .from('store_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar produtos da loja:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      period: item.period || '/mês',
      screens: item.screens || '1 Aparelho',
      badge: item.badge || '',
      badge_color: item.badge_color || '',
      color_theme: item.color_theme || 'blue',
      description: item.description || '',
      features: Array.isArray(item.features) ? item.features : [],
      images: Array.isArray(item.images) ? item.images : [],
      video_url: item.video_url || '',
      payment_link: item.payment_link || '',
      is_active: item.is_active ?? true,
      is_popular: item.is_popular ?? false,
      sort_order: item.sort_order ?? 0,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  } catch (err) {
    console.error('Exceção ao buscar produtos da loja:', err);
    return [];
  }
}

/**
 * Cria ou atualiza um produto da loja no Supabase.
 */
export async function saveStoreProduct(product: Partial<StoreProduct>): Promise<{ success: boolean; data?: StoreProduct; error?: string }> {
  try {
    const payload = {
      name: product.name,
      price: product.price,
      period: product.period || '/mês',
      screens: product.screens || '1 Aparelho',
      badge: product.badge || null,
      badge_color: product.badge_color || null,
      color_theme: product.color_theme || 'blue',
      description: product.description || '',
      features: product.features || [],
      images: (product.images || []).slice(0, 5), // Garantir máximo 5 fotos
      video_url: product.video_url || null,
      payment_link: product.payment_link || '',
      is_active: product.is_active ?? true,
      is_popular: product.is_popular ?? false,
      sort_order: product.sort_order ?? 0,
      updated_at: new Date().toISOString()
    };

    if (product.id) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('store_products')
        .update(payload)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('store_products')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as StoreProduct };
    }
  } catch (err: any) {
    console.error('Erro ao salvar produto da loja:', err);
    return { success: false, error: err?.message || 'Falha ao salvar produto' };
  }
}

/**
 * Exclui um produto da loja no Supabase.
 */
export async function deleteStoreProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir produto da loja:', err);
    return { success: false, error: err?.message || 'Falha ao excluir produto' };
  }
}

/**
 * Faz upload de imagem de produto para o Supabase Storage.
 * Retorna a URL pública da foto.
 */
export async function uploadProductImage(file: File): Promise<{ url: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.warn('Upload via Supabase Storage falhou, gerando base64 fallback:', uploadError);
      // Fallback base64
      const base64 = await fileToBase64(file);
      return { url: base64 };
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: data.publicUrl };
  } catch (err: any) {
    console.warn('Erro durante upload de imagem, usando fallback base64:', err);
    try {
      const base64 = await fileToBase64(file);
      return { url: base64 };
    } catch {
      return { url: '', error: 'Não foi possível carregar a imagem.' };
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Utilitário para converter URLs de vídeo (YouTube, Vimeo, etc.) em URL pronta para embed/preview.
 */
export function formatVideoEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | 'none'; embedUrl: string } {
  if (!url || !url.trim()) return { type: 'none', embedUrl: '' };
  const trimmed = url.trim();

  // YouTube match: youtube.com/watch?v=ID ou youtu.be/ID ou youtube.com/shorts/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
    };
  }

  // Vimeo match: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`
    };
  }

  // Vídeo direto (mp4, webm, etc.) ou outro link
  if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return {
      type: 'direct',
      embedUrl: trimmed
    };
  }

  return {
    type: 'direct',
    embedUrl: trimmed
  };
}

export interface StoreSettings {
  is_button_visible_in_chat: boolean;
}

const STORE_SETTINGS_KEY = 'tbi_store_button_visible_chat';

/**
 * Busca a configuração de exibição do botão da Loja no Chat.
 */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const local = localStorage.getItem(STORE_SETTINGS_KEY);
    const fallbackVisible = local !== null ? local === 'true' : true;

    const { data, error } = await supabase
      .from('app_settings')
      .select('config_data')
      .eq('id', 'store_settings')
      .single();

    if (error || !data || !data.config_data) {
      return { is_button_visible_in_chat: fallbackVisible };
    }

    const visible = data.config_data.is_button_visible_in_chat ?? true;
    localStorage.setItem(STORE_SETTINGS_KEY, String(visible));
    return { is_button_visible_in_chat: visible };
  } catch (err) {
    console.warn('Erro ao carregar store_settings, usando fallback:', err);
    const local = localStorage.getItem(STORE_SETTINGS_KEY);
    return { is_button_visible_in_chat: local !== null ? local === 'true' : true };
  }
}

/**
 * Salva a configuração de exibição do botão da Loja no Chat.
 */
export async function saveStoreSettings(settings: StoreSettings): Promise<{ success: boolean; error?: string }> {
  try {
    localStorage.setItem(STORE_SETTINGS_KEY, String(settings.is_button_visible_in_chat));
    // Notifica componentes na mesma aba
    window.dispatchEvent(new CustomEvent('tbi_store_settings_changed', { detail: settings }));

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: 'store_settings',
        config_data: settings
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar store_settings no Supabase:', err);
    return { success: false, error: err?.message || 'Falha ao salvar configuração da loja' };
  }
}

