import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Menu, X } from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-surface/95 backdrop-blur-xl border-b-2 border-gray-700/50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Code2 className="w-10 h-10 text-collab-400" />
            </motion.div>
            <span className="text-3xl font-black text-white">
              Collab<span className="bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Stack</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="#features"
              className="text-white font-semibold hover:text-collab-400 transition-colors text-lg"
            >
              Features
            </Link>
            <Link
              to="#tech"
              className="text-white font-semibold hover:text-collab-400 transition-colors text-lg"
            >
              Tech Stack
            </Link>
            <Link
              to="#pricing"
              className="text-white font-semibold hover:text-collab-400 transition-colors text-lg"
            >
              Pricing
            </Link>
            <Link
              to="/login"
              className="text-white font-semibold hover:text-collab-400 transition-colors text-lg"
            >
              Login
            </Link>
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-collab-500/50 transition-all"
              >
                Get Started
              </motion.button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-6 space-y-4 bg-dark-surface/98 rounded-b-2xl mt-2"
            >
              <Link
                to="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-semibold hover:text-collab-400 transition-colors text-lg px-4 py-2"
              >
                Features
              </Link>
              <Link
                to="#tech"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-semibold hover:text-collab-400 transition-colors text-lg px-4 py-2"
              >
                Tech Stack
              </Link>
              <Link
                to="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-semibold hover:text-collab-400 transition-colors text-lg px-4 py-2"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white font-semibold hover:text-collab-400 transition-colors text-lg px-4 py-2"
              >
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="px-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-xl font-bold"
                >
                  Get Started
                </motion.button>
              </Link>
            </motion.div>
          )}
      </div>
    </nav>
  );
};

