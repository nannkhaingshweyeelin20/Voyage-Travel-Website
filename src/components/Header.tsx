import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Plane, Search, LogOut, LayoutDashboard, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Header() {
  const { user, profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isBannerPage = location.pathname === '/' || location.pathname === '/destinations';

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navTextClass = isBannerPage ? 'text-white/90 hover:text-white drop-shadow-md' : 'text-gray-500 hover:text-gray-900';

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/destinations', label: 'Trip Planner' },
    { to: '/blogs', label: 'Blogs' },
    { to: '/contact', label: 'Contact Us' },
    ...(user ? [
      { to: '/itinerary', label: 'My Trips' },
      { to: '/profile', label: 'Profile' },
    ] : []),
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { setSearchOpen(false); return; }
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setSearchQuery('');
    navigate(`/destinations?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <>
      <nav className={`flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-5 lg:py-6 transition-all z-[320] ${
      isBannerPage 
        ? 'absolute top-0 left-0 right-0 bg-transparent text-white' 
        : 'relative bg-transparent text-gray-900'
    }`}>
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
          <Plane className="text-white w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className={`text-xl md:text-2xl font-bold tracking-tight ${isBannerPage ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>Voyage</span>
      </Link>

      <div className="hidden lg:flex items-center gap-8 xl:gap-10">
        {navLinks.map((link) => (
          <Link key={link.to} to={link.to} className={`text-sm font-medium transition-colors ${navTextClass}`}>{link.label}</Link>
        ))}
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
              className="fixed inset-0 z-[520] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
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
        <Link to="/admin" className="hidden lg:flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all">
          <LayoutDashboard size={16} /> Admin
        </Link>
      )}

      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${isBannerPage ? 'border-white/20 bg-white/10 text-white backdrop-blur-md' : 'border-slate-200 bg-white text-slate-700 shadow-sm'}`}
          aria-label="Open search"
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMobileMenuOpen(true);
          }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${isBannerPage ? 'border-white/20 bg-white/10 text-white backdrop-blur-md' : 'border-slate-200 bg-white text-slate-700 shadow-sm'}`}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex h-full w-[86vw] max-w-sm flex-col bg-white px-5 pb-6 pt-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-500">Menu</p>
                  <p className="mt-1 text-lg font-black text-slate-900">Voyage</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <Search size={16} className="ml-2 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destinations"
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button type="submit" className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">
                  Go
                </button>
              </form>

              <div className="mt-5 flex flex-1 flex-col gap-2 overflow-y-auto">
                {navLinks.map((link) => {
                  const active = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {user && isAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white"
                  >
                    <LayoutDashboard size={16} /> Admin Dashboard
                  </Link>
                ) : null}
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  <LogOut size={16} /> Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-4 flex items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white"
                >
                  Login
                </Link>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
