import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ParticleBackground } from './ParticleBackground';
import { CursorFollower } from './CursorFollower';

interface PageLayoutProps {
  children: ReactNode;
  showParticles?: boolean;
  showCursor?: boolean;
}

export const PageLayout = ({ children, showParticles = true, showCursor = true }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-dark text-white overflow-x-hidden relative">
      {showCursor && <CursorFollower />}
      {showParticles && <ParticleBackground />}
      
      {/* Floating Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-collab-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            left: '10%',
            top: '20%',
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            right: '10%',
            top: '60%',
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -80, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            left: '50%',
            bottom: '10%',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

