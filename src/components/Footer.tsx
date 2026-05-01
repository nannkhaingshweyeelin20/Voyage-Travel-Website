import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, Instagram, Twitter, Facebook, Youtube, MapPin, Mail, Phone, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                <Plane size={16} className="text-white" />
              </div>
              <span className="text-white font-black text-xl">Voyage</span>
            </div>
            <p className="text-sm leading-relaxed mb-5">
              Your travel companion. Plan, explore, and discover the world's most amazing destinations.
            </p>
            <div className="flex gap-2">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-purple-600 flex items-center justify-center transition group">
                  <Icon size={15} className="text-slate-400 group-hover:text-white transition" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2.5">
              {([
                ['Destinations', '/destinations'],
                ['Hotels & Stays', '/destinations'],
                ['Restaurants', '/destinations'],
                ['Itinerary Planner', '/itinerary'],
                ['Travel Blog', '/blog'],
              ] as [string, string][]).map(([label, path]) => (
                <li key={label}>
                  <Link to={path} className="text-sm hover:text-white transition">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5">
              {([
                ['About Us', '/'],
                ['Contact Us', '/contact'],
                ['Privacy Policy', '/'],
                ['Terms of Service', '/'],
                ['Support', '/contact'],
              ] as [string, string][]).map(([label, path]) => (
                <li key={label}>
                  <Link to={path} className="text-sm hover:text-white transition">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Get in Touch</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-purple-400 mt-0.5 shrink-0" />
                <span className="text-sm">123 Travel Street, Singapore 018956</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-purple-400 shrink-0" />
                <span className="text-sm">hello@voyage.travel</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-purple-400 shrink-0" />
                <span className="text-sm">+65 1234 5678</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-white text-xs font-bold uppercase tracking-wider mb-3">Weekly travel picks</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <button className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shrink-0">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© 2026 Voyage. All rights reserved.</p>
          <p className="text-xs flex items-center gap-1">
            Made with <Heart size={11} className="text-rose-400 fill-rose-400" /> for travelers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
