export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  images: string[];
  video: string;
  unit: string;
  minOrder: string;
  priceMin: number | null;
  priceMax: number | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  target: string;
  icon: string;
  visible: boolean;
  order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  photo: string;
  rating: number;
  visible: boolean;
  order: number;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
  status: string; // baru | dibaca | selesai
  createdAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  mimeType: string;
  type: string; // image | video
  size: number;
  createdAt: string;
}

export type SettingsMap = Record<string, string>;

export interface Tag {
  icon: string;
  label: string;
}
