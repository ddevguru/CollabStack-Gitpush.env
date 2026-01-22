import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import {
  Code2,
  Users,
  Zap,
  Github,
  Play,
  Cloud,
  Terminal,
  ArrowRight,
  Sparkles,
  Rocket,
  Shield,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '../components/nexus/Navbar';
import { CursorFollower } from '../components/nexus/CursorFollower';
import { ParticleBackground } from '../components/nexus/ParticleBackground';

export const Landing = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const containerRef = useRef<HTMLDivElement>(null);

  const stats = [
    { label: 'Active Sessions', value: '10K+', icon: Users, color: 'text-collab-400', delay: 0.1 },
    { label: 'Languages', value: '50+', icon: Code2, color: 'text-emerald-400', delay: 0.2 },
    { label: 'Hackathons', value: '100+', icon: Zap, color: 'text-pink-400', delay: 0.3 },
    { label: 'Teams', value: '5K+', icon: Users, color: 'text-yellow-400', delay: 0.4 },
  ];

  const features = [
    {
      icon: Users,
      title: 'Real-time Collaboration',
      description: 'Code together with live cursors, instant sync, and team presence indicators',
      gradient: 'from-collab-500 to-pink-500',
      rotate: -2,
    },
    {
      icon: Github,
      title: 'GitHub Auto-Branch',
      description: 'Automatic branch creation for team members with smart merge capabilities',
      gradient: 'from-gray-500 to-gray-700',
      rotate: 1,
    },
    {
      icon: Cloud,
      title: 'Drive Sync',
      description: 'Seamless integration with Google Drive for automatic backup and sharing',
      gradient: 'from-blue-500 to-cyan-500',
      rotate: -1,
    },
    {
      icon: Terminal,
      title: 'Instant Compile',
      description: 'Run code in 50+ languages with real-time output and error detection',
      gradient: 'from-emerald-500 to-teal-500',
      rotate: 2,
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security with end-to-end encryption for your code',
      gradient: 'from-purple-500 to-pink-500',
      rotate: -1.5,
    },
    {
      icon: Globe,
      title: 'Multi-platform',
      description: 'Works seamlessly on Web, Mobile, Desktop, and Server environments',
      gradient: 'from-orange-500 to-red-500',
      rotate: 1.5,
    },
  ];

  const techStack = [
    { name: 'React', icon: '⚛️', delay: 0 },
    { name: 'Node.js', icon: '🟢', delay: 0.1 },
    { name: 'Socket.IO', icon: '🔌', delay: 0.2 },
    { name: 'Monaco', icon: '📝', delay: 0.3 },
    { name: 'Docker', icon: '🐳', delay: 0.4 },
    { name: 'PostgreSQL', icon: '🐘', delay: 0.5 },
    { name: 'TypeScript', icon: '📘', delay: 0.6 },
    { name: 'Tailwind', icon: '🎨', delay: 0.7 },
  ];

  const benefits = [
    'No setup required - start coding instantly',
    'Real-time collaboration with live cursors',
    'Auto-save every change automatically',
    '50+ programming languages supported',
    'GitHub integration out of the box',
    'Free for open source projects',
  ];

  // 3D tilt effect for cards
  const use3DTilt = () => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) / rect.width);
      y.set((e.clientY - centerY) / rect.height);
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-dark text-white overflow-x-hidden relative">
      <CursorFollower />
      <ParticleBackground />
      <Navbar />

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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-40 px-4 min-h-screen flex items-center z-10">
        <div className="absolute inset-0 bg-cyber-grid opacity-5" />
        <motion.div
          style={{ y, opacity, scale }}
          className="max-w-7xl mx-auto relative z-10 w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="text-center mb-20"
          >
            {/* Badge with 3D effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.1, rotateY: 5 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-dark-surface/90 backdrop-blur-md border-2 border-collab-500/50 rounded-full mb-10 shadow-lg shadow-collab-500/20"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-5 h-5 text-collab-400" />
              </motion.div>
              <span className="text-base font-semibold text-white">Hackathon Winner 2024</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-[0.9] tracking-tight text-white"
              style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}
            >
              CollabStack
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="text-xl md:text-3xl lg:text-4xl text-white max-w-5xl mx-auto mb-6 font-semibold leading-relaxed"
              style={{
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              }}
            >
              Real-time collaborative coding platform for teams, hackathons, and developers
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="text-base md:text-xl text-white max-w-3xl mx-auto mb-16 font-normal"
              style={{
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              Code together, build faster, ship better. Experience the future of collaborative development.
            </motion.p>

            {/* CTA Buttons with 3D effect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Link to="/register">
                <motion.button
                  whileHover={{
                    scale: 1.08,
                    rotateY: 5,
                    boxShadow: '0 20px 60px rgba(99, 102, 241, 0.6)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-5 bg-gradient-to-r from-collab-500 via-pink-500 to-collab-500 bg-[length:200%_auto] rounded-2xl font-bold text-xl flex items-center gap-3 shadow-2xl shadow-collab-500/50 relative overflow-hidden group"
                  style={{
                    backgroundPosition: '0%',
                  }}
                  onHoverStart={(e) => {
                    if (e.currentTarget) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundPosition = '100%';
                    }
                  }}
                  onHoverEnd={(e) => {
                    if (e.currentTarget) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundPosition = '0%';
                    }
                  }}
                >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Rocket className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))' }} />
                </motion.div>
                  <span className="relative z-10 text-white font-bold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>Start Coding Now</span>
                  <ArrowRight className="w-6 h-6 relative z-10 text-white group-hover:translate-x-2 transition-transform" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))' }} />
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                </motion.button>
              </Link>
              <motion.button
                whileHover={{
                  scale: 1.05,
                  rotateY: -5,
                  borderColor: 'rgba(99, 102, 241, 0.8)',
                }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-dark-surface/80 backdrop-blur-md border-2 border-gray-700 rounded-2xl font-semibold text-xl flex items-center gap-3 hover:bg-dark-surface transition-all group"
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Play className="w-6 h-6 text-white" />
                </motion.div>
                <span className="text-white font-semibold" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>Watch Demo</span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Stats with 3D cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto mt-32"
          >
            {stats.map((stat) => {
              const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt();
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ delay: 1.4 + stat.delay, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -10, z: 50 }}
                  style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="bg-dark-surface/90 backdrop-blur-md rounded-2xl p-8 border-2 border-gray-800 hover:border-collab-500 transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-collab-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-10 -right-10 w-32 h-32 bg-collab-500/10 rounded-full blur-2xl"
                  />
                <stat.icon className={`w-12 h-12 ${stat.color} mb-4 relative z-10 group-hover:scale-125 transition-transform`} />
                <div className="text-4xl md:text-5xl font-black text-white mb-2 relative z-10" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)' }}>{stat.value}</div>
                <div className="text-base md:text-lg text-white font-semibold relative z-10" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }}>{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Code Editor Demo with 3D */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: 45 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ delay: 1.8, duration: 1, type: 'spring' }}
            className="max-w-7xl mx-auto mt-32"
          >
            <motion.div
              whileHover={{ y: -20, rotateY: 2, rotateX: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="bg-dark-editor rounded-3xl border-2 border-gray-800 p-10 shadow-2xl relative overflow-hidden group"
              style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
              {/* Animated gradient background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-collab-500/20 via-pink-500/20 to-emerald-500/20"
                animate={{
                  backgroundPosition: ['0%', '100%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-collab-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <motion.div
                  className="w-4 h-4 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="w-4 h-4 rounded-full bg-yellow-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-4 h-4 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                />
                <span className="ml-4 text-white text-base font-mono font-semibold" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>collabstack.tsx</span>
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/50">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs text-emerald-400 font-semibold">Live</span>
                </div>
              </div>
              
              <div className="font-mono text-base md:text-lg relative z-10 space-y-3 leading-relaxed">
                <div className="text-gray-400" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>// Real-time collaboration in action</div>
                <div>
                  <span className="text-purple-400 font-semibold">const</span>{' '}
                  <span className="text-emerald-400 font-semibold">team</span>{' '}
                  <span className="text-gray-400">=</span>{' '}
                  <span className="text-pink-400">[</span>
                  <span className="text-yellow-300">'You'</span>
                  <span className="text-gray-400">, </span>
                  <span className="text-yellow-300">'Alice'</span>
                  <span className="text-gray-400">, </span>
                  <span className="text-yellow-300">'Bob'</span>
                  <span className="text-pink-400">]</span>
                </div>
                <div className="text-gray-400" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>// Live cursors sync in real-time</div>
                <div>
                  <span className="text-purple-400 font-semibold">cursor</span>
                  <span className="text-gray-400">.</span>
                  <span className="text-emerald-400 font-semibold">move</span>
                  <span className="text-pink-400">(</span>
                  <span className="text-white">x, y</span>
                  <span className="text-pink-400">)</span>
                  <span className="text-gray-400"> </span>
                  <motion.span
                    className="text-emerald-500 inline-block"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    // ✨ Instant sync
                  </motion.span>
                </div>
                <div className="text-gray-400 mt-6" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>// Auto-save enabled</div>
                <div>
                  <span className="text-purple-400 font-semibold">await</span>{' '}
                  <span className="text-emerald-400 font-semibold">save</span>
                  <span className="text-pink-400">()</span>
                  <span className="text-gray-400"> </span>
                  <motion.span
                    className="text-emerald-500 font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1] }}
                    transition={{ delay: 2, duration: 0.5 }}
                  >
                    ✓ Saved
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section with 3D cards */}
      <section id="features" className="py-32 px-4 bg-dark-surface/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="text-5xl md:text-6xl font-black text-center mb-6 text-white"
            style={{
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
            }}
          >
            Why Choose CollabStack?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white text-center mb-20 max-w-3xl mx-auto font-semibold"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            Everything you need to code together, faster and better
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => {
              const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt();
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50, rotateY: -90 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -15, z: 50 }}
                  style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="group bg-dark-surface/90 backdrop-blur-md rounded-3xl p-8 border-2 border-gray-800 hover:border-collab-500 transition-all relative overflow-hidden cursor-pointer h-full"
                >
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                    animate={{
                      backgroundPosition: ['0%', '100%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                  <motion.div
                    className="relative z-10"
                    style={{ transform: `translateZ(50px)` }}
                  >
                    <motion.div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all shadow-lg`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-4 text-white" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>{feature.title}</h3>
                    <p className="text-white leading-relaxed text-lg" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }}>{feature.description}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-dark-surface/90 backdrop-blur-md rounded-3xl p-12 border-2 border-gray-800"
          >
            <h3 className="text-4xl font-bold text-center mb-12 text-white" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)' }}>Everything You Need</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 10, scale: 1.02 }}
                  className="flex items-center gap-4 group"
                >
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  </motion.div>
                  <span className="text-white text-xl font-semibold group-hover:text-emerald-400 transition-colors" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }}>{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="py-32 px-4 bg-dark-surface/30 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-6 text-white"
            style={{
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
            }}
          >
            Built With Modern Tech
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white text-center mb-16 font-semibold"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            Powered by industry-leading technologies
          </motion.p>
          <div className="flex flex-wrap justify-center gap-6">
            {techStack.map((tech) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: tech.delay, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.15, rotate: 5, y: -10, z: 50 }}
                className="px-8 py-5 bg-dark-surface/90 backdrop-blur-md rounded-2xl border-2 border-gray-800 hover:border-collab-500 transition-all font-mono text-xl cursor-pointer group relative overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-collab-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{
                    backgroundPosition: ['0%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
                <span className="mr-3 text-2xl relative z-10">{tech.icon}</span>
                <span className="text-white group-hover:text-collab-400 transition-colors relative z-10 font-bold" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }}>{tech.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-4 relative overflow-hidden z-10 bg-dark-surface/70">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-collab-600/30 via-pink-600/30 to-emerald-600/30"
          animate={{
            backgroundPosition: ['0%', '100%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Rocket className="w-32 h-32 text-white mx-auto drop-shadow-2xl" />
            </motion.div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black mb-8 text-white"
            style={{
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
            }}
          >
            Ready to Code Together?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-2xl mb-16 text-white font-semibold"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            Join thousands of developers building amazing projects together
          </motion.p>
          <Link to="/register">
            <motion.button
              whileHover={{
                scale: 1.1,
                rotateY: 10,
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
              }}
              whileTap={{ scale: 0.95 }}
              className="px-16 py-6 bg-white rounded-3xl font-black text-2xl hover:bg-gray-100 transition-all shadow-2xl relative overflow-hidden group"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="relative z-10 flex items-center gap-4 text-gray-900 font-black">
                Get Started Free
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-8 h-8 text-gray-900" />
                </motion.div>
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>
          </Link>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-xl text-white/80"
          >
            No credit card required • Free forever for open source
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 bg-dark-surface border-t-2 border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Code2 className="w-10 h-10 text-collab-500" />
                </motion.div>
                <span className="text-3xl font-black text-white">
                  CollabStack
                </span>
              </div>
              <p className="text-white text-base leading-relaxed">
                Real-time collaborative coding platform for teams, hackathons, and developers worldwide.
              </p>
            </div>
              <div>
                <h4 className="font-bold mb-6 text-white text-lg" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>Product</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/dashboard" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="#pricing" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link to="/docs" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link to="/features" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Features
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-white text-lg" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>Community</h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Discord
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Blog
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-white text-lg" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>Support</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/help" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-white hover:text-collab-400 transition-colors text-base font-medium" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
          </div>
          <div className="pt-8 border-t-2 border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white text-base" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>© 2024 CollabStack. All rights reserved.</p>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <span className="text-white text-base" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>Made with</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-pink-500 text-xl"
              >
                ❤️
              </motion.span>
              <span className="text-white text-base" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>for developers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
