'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '@/stores/roomStore';
import { RitualInteractionAccepted } from '@/types';

const OBJECT_EMOJI: Record<string, string> = {
  CHANDAN: '🌸',
  MISTI: '🍬',
  DHAN_DURBA: '🌿',
};

interface FloatingInteractionProps {
  interaction: RitualInteractionAccepted;
}

function FloatingInteraction({ interaction }: FloatingInteractionProps) {
  return (
    <motion.div
      className="absolute pointer-events-none z-40"
      style={{
        left: `${interaction.position.x * 100}%`,
        top: `${interaction.position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-4xl drop-shadow-lg">
        {OBJECT_EMOJI[interaction.object]}
      </div>
    </motion.div>
  );
}

export function RitualOverlay() {
  const interactions = useRoomStore((s) => s.interactions);
  // Show only last 5 interactions as floating overlays
  const recent = interactions.slice(-5);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {recent.map((interaction) => (
          <FloatingInteraction key={interaction.eventId} interaction={interaction} />
        ))}
      </AnimatePresence>
    </div>
  );
}

