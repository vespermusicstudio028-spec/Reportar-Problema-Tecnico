export interface StoreProduct {
  id: string;
  name: string;
  price: string;
  period: string;
  screens: string;
  badge?: string;
  badge_color?: string;
  color_theme: 'blue' | 'purple' | 'amber' | 'emerald';
  description: string;
  features: string[];
  images: string[]; // Até 5 fotos
  video_url?: string; // YouTube, Vimeo ou link direto MP4
  payment_link: string;
  is_active: boolean;
  is_popular?: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
