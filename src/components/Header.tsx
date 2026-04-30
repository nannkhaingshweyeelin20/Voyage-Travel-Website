import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Plane, Search, User, LogOut, LayoutDashboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Header() {
  const { user, profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isBannerPage = location.pathname === '/' || location.pathname === '/destinations';

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { setSearchOpen(false); return; }
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/destinations?q=${encodeURIComponent(q)}`);
  };

  return (
    <nav className={`flex items-center justify-between px-6 md:px-12 py-6 transition-all z-50 ${
      isBannerPage 
        ? 'absolute top-0 left-0 right-0 bg-transparent text-white' 
        : 'relative bg-transparent text-gray-900'
    }`}>
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
          <Plane className="text-white w-6 h-6" />
        </div>
        <span className={`text-2xl font-bold tracking-tight ${isBannerPage ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>Voyage</span>
      </Link>

      <div className="hidden md:flex items-center gap-10">
        <Link to="/" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Home</Link>
        <Link to="/destinations" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Trip Planner</Link>
        <Link to="/blogs" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Blogs</Link>
        <Link to="/contact" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Contact Us</Link>
        {user && (
          <>
            <Link to="/itinerary" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>My Trips</Link>
            <Link to="/profile" className={`text-sm font-medium transition-colors ${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Profile</Link>
          </>
        )}
        <button className={`${isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-900'} transition-colors`}
          onClick={() => setSearchOpen(true)}>
          <Search size={20} />
        </button>

        {/* Search overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
              onClick={() => setSearchOpen(false)}
            >
              <motion.form
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                onSubmit={handleSearchSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex items-center overflow-hidden"
              >
                <Search size={18} className="ml-5 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destinations, hotels, restaurants…"
                  className="flex-1 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-5 py-4 transition shrink-0">
                  Search
                </button>
                <button type="button" onClick={() => setSearchOpen(false)} className="p-4 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {!user ? (
          <Link 
            to="/login" 
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all ${
              isBannerPage 
                ? 'bg-white text-gray-900 hover:bg-gray-100' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
            }`}
          >
            Login
          </Link>
        ) : (
          <button
            onClick={logout}
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all ${
              isBannerPage 
                ? 'bg-white text-gray-900 hover:bg-gray-100' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
            }`}
          >
            Logout
          </button>
        )}
      </div>

      {user && isAdmin && (
        <Link to="/admin" className="hidden md:flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all">
          <LayoutDashboard size={16} /> Admin
        </Link>
      )}
    </nav>
  );
}
