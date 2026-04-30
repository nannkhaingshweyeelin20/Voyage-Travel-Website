import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  Home, 
  MapPin, 
  Calendar, 
  LayoutDashboard, 
  User, 
  Users, 
  BookOpen, 
  LogOut,
  Plane,
  MessageSquare,
  Newspaper,
  Bed
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { profile, isAdmin, logout } = useAuth();
  const location = useLocation();

  const userLinks = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/destinations', icon: MapPin, label: 'Trip Planner' },
    { to: '/hotel', icon: Bed, label: 'Hotels' },
    { to: '/itinerary', icon: Calendar, label: 'My Trips' },
    { to: '/blogs', icon: Newspaper, label: 'Blogs' },
    { to: '/contact', icon: MessageSquare, label: 'Contact' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/destinations', icon: MapPin, label: 'Destinations' },
    { to: '/admin/bookings', icon: BookOpen, label: 'Bookings' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <nav className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full px-6 py-3 z-50 flex items-center gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "p-3 rounded-full transition-all flex items-center gap-2 group",
              isActive ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon size={20} />
            {isActive && <span className="text-sm font-medium pr-1">{link.label}</span>}
          </Link>
        );
      })}
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button
        onClick={() => logout()}
        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
      >
        <LogOut size={20} />
      </button>
    </nav>
  );
}
