"use client";

import {
  Handshake,
  Truck,
  Globe,
  Package,
  MapPin,
  BadgeCheck,
  Star,
  Info,
  Mail,
  Phone,
  Home,
  Tag,
  Leaf,
  Boxes,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  handshake: Handshake,
  truck: Truck,
  globe: Globe,
  package: Package,
  "map-pin": MapPin,
  "badge-check": BadgeCheck,
  star: Star,
  info: Info,
  mail: Mail,
  phone: Phone,
  home: Home,
  tag: Tag,
  leaf: Leaf,
  boxes: Boxes,
  shield: ShieldCheck,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon className={className} />;
}
