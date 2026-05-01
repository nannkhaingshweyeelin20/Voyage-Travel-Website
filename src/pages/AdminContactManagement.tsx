import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, Trash2, Eye, Send, MessageSquare, CheckCircle2, Inbox, Filter } from 'lucide-react';
import { messageService, ContactMessage } from '../lib/services';

function statusPill(status: ContactMessage['status']) {
  if (status === 'replied') return 'bg-slate-100 text-slate-500';
  return 'bg-rose-50 text-rose-600';
}

export default function AdminContactManagementPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [newToast, setNewToast] = useState('');
  const [actionToast, setActionToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'replied'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const previousCountRef = useRef(0);

  const refresh = async () => {
    const next = await messageService.getAll();
    if (next.length > previousCountRef.current) {
      const diff = next.length - previousCountRef.current;
      setNewToast(`${diff} new message${diff > 1 ? 's' : ''} received`);
      setTimeout(() => setNewToast(''), 2600);
    }
    previousCountRef.current = next.length;
    setMessages(next);
  };

  useEffect(() => {
    refresh().catch(console.error);
    const timer = setInterval(() => {
      refresh().catch(console.error);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return messages.filter((msg) => {
      const matchSearch = !query || msg.name.toLowerCase().includes(query) || msg.email.toLowerCase().includes(query);
      const normalized = msg.status === 'replied' ? 'replied' : 'new';
      const matchStatus = statusFilter === 'all' || normalized === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [messages, search, statusFilter]);

  const selectedMessage = filtered.find((m) => m.id === selectedId) || messages.find((m) => m.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
    if (selectedId && !messages.some((m) => m.id === selectedId)) {
      setSelectedId(filtered[0]?.id || null);
      setReplyText('');
    }
  }, [filtered, selectedId, messages]);

  useEffect(() => {
    if (!selectedMessage) return;
    setReplyText(selectedMessage.reply || '');
  }, [selectedMessage?.id]);

  const totals = {
    total: messages.length,
    fresh: messages.filter((m) => m.status !== 'replied').length,
    replied: messages.filter((m) => m.status === 'replied').length,
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await messageService.delete(id);
    await refresh();
  };

  const onSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    await messageService.reply(selectedMessage.id, replyText.trim());
    await refresh();
    setActionToast('Reply sent successfully');
    setTimeout(() => setActionToast(''), 2600);
  };

  return (
    <div className="min-h-screen bg-[#eef2f8] pt-28 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnimatePresence>
          {newToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm font-semibold"
            >
              {newToast}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {actionToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-sky-200 bg-sky-50 text-sky-700 px-4 py-3 text-sm font-semibold"
            >
              {actionToast}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Admin Contact Center</p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">Contact Us Management</h1>
          </div>
          <button
            onClick={refresh}
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 shadow-sm"
          >
            Refresh
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Messages', value: totals.total, icon: Inbox, color: 'bg-sky-500' },
            { label: 'New Messages', value: totals.fresh, icon: MessageSquare, color: 'bg-rose-500' },
            { label: 'Replied Messages', value: totals.replied, icon: CheckCircle2, color: 'bg-emerald-500' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.color} text-white flex items-center justify-center`}>
                    <Icon size={18} />
                  </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{card.value}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'new' | 'replied')}
                  className="pl-8 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="replied">Replied</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1.2fr_0.8fr] min-h-[520px]">
            <div className="xl:border-r border-slate-100 overflow-auto">
              <div className="md:hidden divide-y divide-slate-100">
                {filtered.map((msg) => (
                  <div key={msg.id} className={`px-4 py-4 transition ${selectedId === msg.id ? 'bg-sky-50/60' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 truncate">{msg.name}</p>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusPill(msg.status)}`}>
                            {msg.status === 'replied' ? 'Replied' : 'New'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 break-all">{msg.email}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">{msg.topic || 'General'}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{msg.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedId(msg.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(msg.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Email', 'Subject', 'Message Preview', 'Date', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((msg) => (
                    <tr key={msg.id} className={`transition ${selectedId === msg.id ? 'bg-sky-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3 text-sm font-bold text-slate-900">{msg.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">{msg.email}</td>
                      <td className="px-5 py-3 text-sm text-slate-700">{msg.topic || 'General'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-[240px] truncate">{msg.message}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusPill(msg.status)}`}>
                          {msg.status === 'replied' ? 'Replied' : 'New'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedId(msg.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(msg.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div className="p-14 text-center text-slate-400">
                  <Mail size={28} className="mx-auto mb-2" />
                  <p className="font-semibold">No messages found</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 bg-slate-50/50 border-t xl:border-t-0 border-slate-100">
              <AnimatePresence mode="wait">
                {selectedMessage ? (
                  <motion.div
                    key={selectedMessage.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Sender Info</p>
                      <p className="font-black text-slate-900">{selectedMessage.name}</p>
                      <p className="text-sm text-slate-600">{selectedMessage.email}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Message Details</p>
                      <p className="font-bold text-slate-900 mb-2">{selectedMessage.topic || 'General enquiry'}</p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Reply</p>
                      <textarea
                        rows={5}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your response..."
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => { void onSendReply(); }}
                          disabled={!replyText.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-black"
                        >
                          <Send size={13} /> Send Reply
                        </button>
                        <button
                          onClick={() => {
                            void (async () => {
                              await messageService.updateStatus(selectedMessage.id, 'replied');
                              await refresh();
                            })();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black"
                        >
                          Mark Replied
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-slate-400">
                    <div>
                      <Eye size={28} className="mx-auto mb-2" />
                      <p className="font-semibold">Select a message to view details</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
