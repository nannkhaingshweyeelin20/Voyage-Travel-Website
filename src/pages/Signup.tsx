import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-sans text-gray-900">
      <div className="min-h-screen flex items-center justify-center p-4 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-[40px] border border-gray-100 bg-white p-12 shadow-xl"
        >
          <div className="mb-10 text-center">
            <h1 className="mb-3 text-4xl font-serif text-gray-900">Create Account</h1>
            <p className="text-gray-500">Start planning trips, saving places, and organizing your travel dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-transparent bg-gray-50 px-6 py-4 transition-all focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-transparent bg-gray-50 px-6 py-4 transition-all focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-transparent bg-gray-50 px-6 py-4 transition-all focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-transparent bg-gray-50 px-6 py-4 transition-all focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                placeholder="Re-enter your password"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-medium text-red-600"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-5 font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-gray-50 pt-8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
