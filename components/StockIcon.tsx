
import React, { useState } from 'react';

interface StockIconProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StockIcon: React.FC<StockIconProps> = ({ name, logoUrl, size = 'md', className = '' }) => {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-[10px]',
    md: 'w-10 h-10 rounded-xl text-xs',
    lg: 'w-14 h-14 rounded-2xl text-lg',
  };

  if (logoUrl && !error) {
    return (
      <div className={`${sizeClasses[size]} bg-white flex items-center justify-center p-1 border border-[var(--color-border)] shadow-sm overflow-hidden flex-shrink-0 ${className}`}>
        <img 
          src={logoUrl} 
          alt={name} 
          className="w-full h-full object-contain"
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: Stylized initial with industrial gradient
  const initial = name.charAt(0);
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-[#00D4AA]/20 to-[#00D4AA]/5 border border-[#00D4AA]/30 flex items-center justify-center text-[#00D4AA] font-black uppercase tracking-tighter flex-shrink-0 ${className}`}>
      {initial}
    </div>
  );
};

export default StockIcon;
