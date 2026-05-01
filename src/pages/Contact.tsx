import React, { useState } from 'react';
import Footer from '../components/Footer';
import { Navigate } from 'react-router-dom';
import { AtSign, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { messageService } from '../lib/services';

const TOPICS = [
  'Reservation issue',
  'Payment question',
  'Destination advice',
  'Itinerary change',
  'General enquiry',
  'Technical support',
  'Partnership',
];

export default function ContactPage() {
  const { profile, isAdmin } = useAuth();
  const [sent, setSent] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    name: profile?.displayName || '',
    email: profile?.email || '',
    topic: '',
    destination: '',
    startDate: '',
    endDate: '',
    message: '',
  });

  if (isAdmin) return <Navigate to="/admin/contact" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const created = await messageService.create({
        name: form.name,
        email: form.email,
        topic: form.topic,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        message: form.message,
      });
      setSubmittedTicket(created.id);
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to send your message right now.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f2]">
      <section className="w-full px-0 pb-20 md:pb-24">
        <div className="overflow-hidden border border-black/10 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="relative h-[350px] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
              alt="Contact us banner"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.58),rgba(15,23,42,0.2),rgba(15,23,42,0.08))]" />
            <div className="absolute inset-y-0 right-[34%] hidden w-px rotate-[22deg] bg-black/65 shadow-[0_0_0_1px_rgba(255,255,255,0.18)] lg:block" />
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center lg:justify-start lg:px-12">
              <div className="lg:max-w-xl lg:text-left">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/75">Support Desk</p>
                <h1 className="font-serif text-4xl font-semibold italic text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:text-6xl">
                  Contact Us
                </h1>
                <p className="mt-3 text-sm text-white/80 md:max-w-md">
                  Reach our travel team for trip changes, destination help, or booking support.
                </p>
              </div>
            </div>
          </div>

          <div className="grid border-t border-black/10 lg:grid-cols-[1.25fr_0.95fr_1.1fr]">
            <div className="min-h-[320px] border-b border-black/10 lg:border-b-0 lg:border-r">
              <iframe
                title="Office map"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '320px' }}
                loading="lazy"
                allowFullScreen
                src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=Singapore&zoom=11"
              />
            </div>

            <div className="border-b border-black/10 bg-white p-8 lg:border-b-0 lg:p-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Meet Us</p>
              <h2 className="mb-8 text-4xl font-black text-slate-900">Meet Us</h2>
              <div className="space-y-6 text-sm text-slate-700">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 rounded-full border border-violet-200 bg-violet-50 p-2 text-violet-700">
                    <Phone size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone</p>
                    <p className="mt-1 text-base font-medium text-slate-900">+65 1234 5678</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 rounded-full border border-violet-200 bg-violet-50 p-2 text-violet-700">
                    <AtSign size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</p>
                    <p className="mt-1 text-base font-medium text-slate-900">hello@voyage.travel</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 rounded-full border border-violet-200 bg-violet-50 p-2 text-violet-700">
                    <MapPin size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Address</p>
                    <p className="mt-1 text-base font-medium leading-7 text-slate-900">123 Travel Street, Singapore 018956</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#ecebea] p-8 lg:relative lg:-mt-24 lg:mr-8 lg:mb-8 lg:rounded-[1.75rem] lg:border lg:border-black/10 lg:bg-white lg:p-10 lg:shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Contact</p>
              <h2 className="mb-8 text-4xl font-black text-slate-900">Contact</h2>

              {submitError && (
                <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</p>
              )}

              {sent ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-emerald-700 font-bold">Message sent successfully.</p>
                  {submittedTicket && <p className="mt-1 text-xs text-emerald-700">Ticket: {submittedTicket}</p>}
                  <p className="mt-1 text-xs text-emerald-700">Admin support queue now receives this message.</p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5b6cff]"
                  />

                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5b6cff]"
                  />

                  <select
                    required
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#5b6cff]"
                  >
                    <option value="">Subject</option>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Destination (optional)"
                    value={form.destination}
                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                    className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5b6cff]"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#5b6cff]"
                    />
                    <input
                      type="date"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#5b6cff]"
                    />
                  </div>

                  <textarea
                    rows={5}
                    required
                    placeholder="Message"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full resize-none rounded-none border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5b6cff]"
                  />

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)] transition hover:translate-y-[-1px]"
                  >
                    <Send size={14} /> Send
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 text-center">
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-slate-500">
          <Mail size={13} /> Find Us On Instagram
        </p>
        <p className="mt-3 text-2xl font-black text-slate-900">@Connect.Travelvoyage</p>
      </section>
      <Footer />
    </div>
  );
}
