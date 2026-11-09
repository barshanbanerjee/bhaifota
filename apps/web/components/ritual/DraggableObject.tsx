'use client';
import { useRef } from 'react';
import { motion } from 'framer-motion';

interface DraggableObjectProps {
  object: 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
  onDrop?: (x: number, y: number) => void;
  disabled?: boolean;
}

const OBJECT_CONFIG = {
  CHANDAN: { emoji: '🌸', label: 'চন্দন', labelEn: 'Chandan' },
  MISTI: { emoji: '🍬', label: 'মিষ্টি', labelEn: 'Mishti' },
  DHAN_DURBA: { emoji: '🌿', label: 'ধান দুর্বা', labelEn: 'Dhan Durba' },
};

export function DraggableObject({ object, onDrop, disabled }: DraggableObjectProps) {
  const config = OBJECT_CONFIG[object];
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-30 cursor-not-allowed select-none">
        <div className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center text-3xl">
          {config.emoji}
        </div>
        <span className="text-xs font-medium text-foreground/50">{config.labelEn}</span>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none"
      drag
      dragSnapToOrigin
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      onDragStart={(e, info) => {
        dragStartPos.current = { x: info.point.x, y: info.point.y };
      }}
      onDragEnd={(e, info) => {
        // Find the drop target element under the pointer
        const el = document.elementFromPoint(info.point.x, info.point.y);
        const videoContainer = el?.closest('[data-drop-target]');
        if (videoContainer) {
          const rect = videoContainer.getBoundingClientRect();
          const x = (info.point.x - rect.left) / rect.width;
          const y = (info.point.y - rect.top) / rect.height;
          onDrop?.(
            Math.max(0, Math.min(1, x)),
            Math.max(0, Math.min(1, y)),
          );
        }
      }}
    >
      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl hover:shadow-lg transition-shadow">
        {config.emoji}
      </div>
      <span className="text-xs font-medium text-foreground/70">{config.labelEn}</span>
    </motion.div>
  );
}

