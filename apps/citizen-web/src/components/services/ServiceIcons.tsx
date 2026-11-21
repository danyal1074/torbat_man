import React from 'react';
import {
  Building2,
  Home,
  Store,
  Sparkles,
  GraduationCap,
  Megaphone,
  Trees,
  Lightbulb,
  Construction,
  Trash2,
  ShoppingBag,
  Utensils,
  Bus,
  HeartPulse,
  ShoppingCart,
  Wrench,
  Briefcase,
  Package,
  Flower2,
  Sprout,
  Compass,
  Users,
  BookOpen,
  Dumbbell,
  BarChart3,
  Database,
  Search,
  Bot,
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const ServiceIcon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 24,
  color,
}) => {
  switch (name) {
    // Category Icons
    case 'building':
      return <Building2 size={size} className={className} style={{ color }} />;
    case 'home':
      return <Home size={size} className={className} style={{ color }} />;
    case 'store':
      return <Store size={size} className={className} style={{ color }} />;
    case 'flower':
      return <Flower2 size={size} className={className} style={{ color }} />;
    case 'graduation':
      return <GraduationCap size={size} className={className} style={{ color }} />;
    case 'sparkles':
      return <Sparkles size={size} className={className} style={{ color }} />;

    // Services
    case 'megaphone':
      return <Megaphone size={size} className={className} style={{ color: color || '#E08600' }} />;
    case 'tree':
      return <Trees size={size} className={className} style={{ color: color || '#16A34A' }} />;
    case 'lamp':
      return <Lightbulb size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'road':
      return <Construction size={size} className={className} style={{ color: color || '#7541A5' }} />;
    case 'trash':
      return <Trash2 size={size} className={className} style={{ color: color || '#7541A5' }} />;

    case 'shopping-bag':
      return <ShoppingBag size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'bread':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color || '#D97706'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M4 11c0-3.5 3-6 8-6s8 2.5 8 6-2 7-8 7-8-3.5-8-7z" />
          <path d="M8 10c1-1 2-1 3 0" />
          <path d="M13 10c1-1 2-1 3 0" />
        </svg>
      );
    case 'bus':
      return <Bus size={size} className={className} style={{ color: color || '#64158C' }} />;
    case 'health':
      return <HeartPulse size={size} className={className} style={{ color: color || '#E11D48' }} />;

    case 'shopping-cart':
      return <ShoppingCart size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'shop':
      return <Store size={size} className={className} style={{ color: color || '#64158C' }} />;
    case 'tools':
      return <Wrench size={size} className={className} style={{ color: color || '#E11D48' }} />;
    case 'briefcase':
      return <Briefcase size={size} className={className} style={{ color: color || '#64158C' }} />;

    case 'package':
      return <Package size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'saffron':
      return <Flower2 size={size} className={className} style={{ color: color || '#7541A5' }} />;
    case 'sprout':
      return <Sprout size={size} className={className} style={{ color: color || '#16A34A' }} />;
    case 'compass':
      return <Compass size={size} className={className} style={{ color: color || '#D97706' }} />;

    case 'graduation-cap':
      return <GraduationCap size={size} className={className} style={{ color: color || '#64158C' }} />;
    case 'family':
      return <Users size={size} className={className} style={{ color: color || '#7541A5' }} />;
    case 'book':
      return <BookOpen size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'dumbbell':
      return <Dumbbell size={size} className={className} style={{ color: color || '#64158C' }} />;

    case 'analytics':
      return <BarChart3 size={size} className={className} style={{ color: color || '#E11D48' }} />;
    case 'digital':
      return <Database size={size} className={className} style={{ color: color || '#64158C' }} />;
    case 'search':
      return <Search size={size} className={className} style={{ color: color || '#D97706' }} />;
    case 'robot':
      return <Bot size={size} className={className} style={{ color: color || '#64158C' }} />;

    default:
      return <Sparkles size={size} className={className} style={{ color }} />;
  }
};
