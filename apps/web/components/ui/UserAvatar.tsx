'use client';
import { useState, useEffect } from 'react';

interface UserAvatarProps {
  image?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function UserAvatar({
  image,
  name,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = SIZE_MAP[size];
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  // Reset error state if image URL changes
  useEffect(() => {
    setImageError(false);
  }, [image]);

  if (image && !imageError) {
    return (
      <img
        src={image}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-black/10 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0 border border-accent/20 select-none ${className}`}
      aria-label={name || 'Avatar'}
    >
      {initial}
    </div>
  );
}

