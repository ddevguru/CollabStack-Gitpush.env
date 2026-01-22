import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const CursorFollower = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Main cursor follower */}
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 rounded-full bg-gradient-to-r from-collab-500 to-pink-500 pointer-events-none z-50 mix-blend-difference"
        animate={{
          x: mousePosition.x - 12,
          y: mousePosition.y - 12,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 28,
        }}
      />

      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 rounded-full border-2 border-collab-500/50 pointer-events-none z-50"
        animate={{
          x: mousePosition.x - 24,
          y: mousePosition.y - 24,
          scale: isHovering ? 1.2 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      />

      {/* Glow effect */}
      <motion.div
        className="fixed top-0 left-0 w-32 h-32 rounded-full bg-collab-500/20 blur-2xl pointer-events-none z-40"
        animate={{
          x: mousePosition.x - 64,
          y: mousePosition.y - 64,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 25,
        }}
      />
    </>
  );
};

