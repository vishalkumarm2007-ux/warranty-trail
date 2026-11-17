import { useState } from 'react';
import { Cpu, Home, Laptop, Refrigerator, ShieldCheck, Tv } from 'lucide-react';
import type { ProductCategory } from '../types/warranty';

interface ProductImageProps {
  src?: string;
  alt: string;
  category: ProductCategory;
  className?: string;
}

function getCategoryIcon(category: ProductCategory) {
  switch (category) {
    case 'Television & Audio':
      return Tv;
    case 'Kitchen Appliance':
      return Refrigerator;
    case 'Computing & Mobile':
      return Laptop;
    case 'Home Care':
      return Home;
    case 'Laundry & HVAC':
      return Cpu;
    default:
      return ShieldCheck;
  }
}

export function ProductImage({ src, alt, category, className = '' }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const Icon = getCategoryIcon(category);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 border-b border-slate-200 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 mb-2">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-slate-500 px-3 text-center truncate max-w-full">
          {category}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover bg-slate-100 ${className}`}
    />
  );
}
