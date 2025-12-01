'use client';

import { useState, useEffect } from 'react';

interface EmailPanelProps {
    thread: any;
    isOpen: boolean;
    onClose: () => void;
}

type ReplyMode = 'quick' | 'full' | 'ai';

export function EmailPanel({ thread, isOpen, onClose }: EmailPanelProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyMode, setReplyMode] = useState<ReplyMode | null>(null);
    const [quickPoints, setQuickPoints] = useState<string[]>(['']);
    const [fullReply, setFullReply] = useState('');
    const [draftLoading, setDraftLoading] = useState(false);
    const [generatedDraft, setGeneratedDraft] = useState('');

    useEffect(() => {
        if (isOpen && thread?.id) {
            loadThread();
            setReplyMode(null);
            setQuickPoints(['']);
            setFullReply('');
            setGeneratedDraft('');
        }
    }, [isOpen, thread?.id]);

    const loadThread = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/gmail/threads/${thread.id}`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (e) {
            console.error('Failed to load thread:', e);
        } finally {
            setLoading(false);
        }
    };

    const extractSender = (from: string) => {
        if (!from) return { name: 'Unknown', email: '', initials: 'UN' };
        const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
        if (match) {
            const name = match[1].trim();
            const words = name.split(/\s+/);
            return {
                name,
                email: match[2] || from,
                initials: words.length >= 2 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
            };
        }
        return { name: from.split('@')[0], email: from, initials: from.slice(0, 2).toUpperCase() };
    };

    const addQuickPoint = () => {
        setQuickPoints([...quickPoints, '']);
    };

    const updateQuickPoint = (index: number, value: string) => {
        const updated = [...quickPoints];
        updated[index] = value;
        setQuickPoints(updated);
    };

    const removeQuickPoint = (index: number) => {
        if (quickPoints.length > 1) {
            setQuickPoints(quickPoints.filter((_, i) => i !== index));
        }
    };

    const draftWithAI = async () => {
        setDraftLoading(true);
        try {
            const lastMessage = messages[messages.length - 1];
            const context = replyMode === 'quick'
                ? `User wants to make these points:\n${quickPoints.filter(p => p.trim()).map((p, i) => `${i + 1}. ${p}`).join('\n')}`
                : replyMode === 'full'
                    ? `User's draft so far: ${fullReply}`
                    : 'Generate a professional reply based on the email context';

            const res = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalEmail: lastMessage?.body || lastMessage?.snippet || '',
                    subject: thread?.subject || '',
                    from: lastMessage?.from || '',
                    replyContext: context,
                    mode: replyMode || 'ai',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedDraft(data.draft);
                setReplyMode('full');
                setFullReply(data.draft);
            }
        } catch (e) {
            console.error('Draft generation failed:', e);
        } finally {
            setDraftLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-[700px] max-w-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in">

                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/10 bg-[#0a0a0a]">
                    <div className="flex-1 pr-4">
                        <h2 className="text-xl font-semibold text-white mb-1 leading-tight">
                            {thread?.subject || 'No Subject'}
                        </h2>
                        <p className="text-sm text-white/50">{messages.length} message{messages.length !== 1 ? 's' : ''} in thread</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Email Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {messages.map((msg, index) => {
                                const sender = extractSender(msg.from);
                                return (
                                    <div key={index} className="p-6">
                                        {/* Message Header */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {sender.initials}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-semibold text-white">{sender.name}</span>
                                                    <span className="text-xs text-white/40">&lt;{sender.email}&gt;</span>
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    {msg.date ? new Date(msg.date).toLocaleString() : ''}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message Body - FIXED TEXT COLOR */}
                                        <div
                                            className="pl-13 text-[#e5e5e5] leading-relaxed text-sm"
                                            style={{ color: '#e5e5e5' }}
                                        >
                                            <div
                                                className="email-body-content"
                                                dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet || 'No content' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Reply Composer */}
                <div className="border-t border-white/10 bg-[#0d0d0d] p-5">

                    {/* Reply Mode Selector */}
                    {!replyMode && (
                        <div className="mb-4">
                            <p className="text-sm text-white/70 mb-3">How would you like to reply?</p>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setReplyMode('quick')}
                                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 transition-all text-left group"
                                >
                                    <span className="text-2xl mb-2 block">⚡</span>
                                    <span className="font-medium text-white block mb-1">Quick Points</span>
                                    <span className="text-xs text-white/50">Bullet points, AI writes the email</span>
                                </button>
                                <button
                                    onClick={() => setReplyMode('full')}
                                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 transition-all text-left group"
                                >
                                    <span className="text-2xl mb-2 block">📝</span>
                                    <span className="font-medium text-white block mb-1">Write Full Email</span>
                                    <span className="text-xs text-white/50">Compose your own reply</span>
                                </button>
                                <button
                                    onClick={() => { setReplyMode('ai'); draftWithAI(); }}
                                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 transition-all text-left group"
                                >
                                    <span className="text-2xl mb-2 block">🤖</span>
                                    <span className="font-medium text-white block mb-1">Let AI Draft</span>
                                    <span className="text-xs text-white/50">AI writes based on context</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quick Points Mode */}
                    {replyMode === 'quick' && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-white/70">Your key points (AI will write the email):</p>
                                <button onClick={() => setReplyMode(null)} className="text-xs text-white/40 hover:text-white/70">
                                    ← Change mode
                                </button>
                            </div>
                            <div className="space-y-2 mb-3">
                                {quickPoints.map((point, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-indigo-400">•</span>
                                        <input
                                            type="text"
                                            value={point}
                                            onChange={(e) => updateQuickPoint(i, e.target.value)}
                                            placeholder={`Point ${i + 1}...`}
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                                        />
                                        {quickPoints.length > 1 && (
                                            <button
                                                onClick={() => removeQuickPoint(i)}
                                                className="p-2 text-white/30 hover:text-red-400"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addQuickPoint}
                                className="text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                + Add another point
                            </button>
                        </div>
                    )}

                    {/* Full Email Mode */}
                    {replyMode === 'full' && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-white/70">Compose your reply:</p>
                                <button onClick={() => setReplyMode(null)} className="text-xs text-white/40 hover:text-white/70">
                                    ← Change mode
                                </button>
                            </div>
                            <textarea
                                value={fullReply}
                                onChange={(e) => setFullReply(e.target.value)}
                                placeholder="Write your reply..."
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    )}

                    {/* AI Loading State */}
                    {replyMode === 'ai' && draftLoading && (
                        <div className="mb-4 flex items-center justify-center py-8">
                            <div className="flex items-center gap-3 text-white/70">
                                <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                <span>AI is drafting your reply...</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {replyMode && replyMode !== 'ai' && (
                        <div className="flex items-center justify-between">
                            <button
                                onClick={draftWithAI}
                                disabled={draftLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition disabled:opacity-50"
                            >
                                {draftLoading ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full" />
                                        <span>Drafting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span>Draft with AI</span>
                                    </>
                                )}
                            </button>
                            <button
                                disabled={replyMode === 'quick' ? !quickPoints.some(p => p.trim()) : !fullReply.trim()}
                                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                            >
                                Send Reply
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
