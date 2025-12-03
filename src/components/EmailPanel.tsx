'use client';

import { useState, useEffect } from 'react';
import { VoiceButton } from './VoiceButton';

interface EmailPanelProps {
    thread: any;
    isOpen: boolean;
    onClose: () => void;
}

type ReplyMode = 'select' | 'auto' | 'write';

export function EmailPanel({ thread, isOpen, onClose }: EmailPanelProps) {
    // Thread/messages state
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Reply state
    const [replyMode, setReplyMode] = useState<ReplyMode>('select');
    const [userMessage, setUserMessage] = useState('');
    const [generatedReply, setGeneratedReply] = useState('');
    const [subject, setSubject] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showPolished, setShowPolished] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load thread when opened
    useEffect(() => {
        if (isOpen && thread?.id) {
            loadThread();
            resetReplyState();
        }
    }, [isOpen, thread?.id]);

    const resetReplyState = () => {
        setReplyMode('select');
        setUserMessage('');
        setGeneratedReply('');
        setSubject('');
        setShowPolished(false);
        setError(null);
    };

    const loadThread = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/gmail/threads/${thread.id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                // Set reply subject
                const originalSubject = thread?.subject || '';
                setSubject(originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`);
            }
        } catch (e) {
            console.error('Failed to load thread:', e);
        } finally {
            setLoading(false);
        }
    };

    // Extract sender info
    const extractSender = (from: string) => {
        if (!from) return { name: 'Unknown', email: '', initials: 'UN' };
        const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
        if (match) {
            const name = match[1].trim();
            const words = name.split(/\s+/);
            return {
                name,
                email: match[2] || from,
                initials: words.length >= 2
                    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                    : name.slice(0, 2).toUpperCase()
            };
        }
        const email = from.includes('@') ? from : '';
        return { name: from.split('@')[0], email, initials: from.slice(0, 2).toUpperCase() };
    };

    // AUTO REPLY: Generate response automatically
    const handleAutoReply = async () => {
        console.log('Auto Reply clicked');
        setReplyMode('auto');
        setIsGenerating(true);
        setError(null);

        try {
            const lastMessage = messages[messages.length - 1];

            const res = await fetch('/api/ai/auto-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalEmail: lastMessage?.body || lastMessage?.snippet || '',
                    subject: thread?.subject || '',
                    from: lastMessage?.from || '',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedReply(data.reply);
            } else {
                setError('Failed to generate reply. Please try again.');
                setReplyMode('select');
            }
        } catch (e) {
            console.error('Auto reply error:', e);
            setError('Failed to generate reply. Please try again.');
            setReplyMode('select');
        } finally {
            setIsGenerating(false);
        }
    };

    // WRITE REPLY: User writes their own
    const handleWriteReply = () => {
        console.log('Write Reply clicked');
        setReplyMode('write');
        setUserMessage('');
        setGeneratedReply('');
        setShowPolished(false);
    };

    // Polish user's message
    const handlePolish = async () => {
        if (!userMessage.trim()) {
            setError('Please write a message first');
            return;
        }

        setIsPolishing(true);
        setError(null);

        try {
            const lastMessage = messages[messages.length - 1];
            const sender = extractSender(lastMessage?.from || '');

            const res = await fetch('/api/ai/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawMessage: userMessage,
                    recipientName: sender.name,
                    senderName: 'Nikhil', // Get from session
                    isReply: true,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedReply(data.body);
                setShowPolished(true);
            } else {
                setError('Failed to polish message');
            }
        } catch (e) {
            setError('Failed to polish message');
        } finally {
            setIsPolishing(false);
        }
    };

    // Send the reply
    const handleSend = async () => {
        const replyBody = showPolished ? generatedReply : (replyMode === 'auto' ? generatedReply : userMessage);

        if (!replyBody.trim()) {
            setError('Please write a message');
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const lastMessage = messages[messages.length - 1];
            const sender = extractSender(lastMessage?.from || '');

            const res = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: sender.email,
                    subject: subject,
                    message: replyBody,
                    threadId: thread?.id,
                }),
            });

            if (res.ok) {
                onClose();
                // Could show success toast
            } else {
                setError('Failed to send reply');
            }
        } catch (e) {
            setError('Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    // Voice input handler
    const handleVoiceInput = (text: string) => {
        setUserMessage(prev => prev ? `${prev} ${text}` : text);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-[700px] max-w-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-white/10">
                    <div className="flex-1 pr-4">
                        <h2 className="text-lg font-semibold text-white mb-1 leading-tight">
                            {thread?.subject || 'No Subject'}
                        </h2>
                        <p className="text-sm text-white/50">
                            {messages.length} message{messages.length !== 1 ? 's' : ''} in thread
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
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
                                    <div key={index} className="p-5">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {sender.initials}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="font-semibold text-white">{sender.name}</span>
                                                    {sender.email && (
                                                        <span className="text-xs text-white/40">&lt;{sender.email}&gt;</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    {msg.date ? new Date(msg.date).toLocaleString() : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pl-13 email-body-content" style={{ color: '#e5e5e5' }}>
                                            <div dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet || 'No content' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ════════════════════════════════════════════════════════════════════ */}
                {/* REPLY SECTION                                                        */}
                {/* ════════════════════════════════════════════════════════════════════ */}

                <div className="border-t border-white/10 bg-[#0d0d0d]">

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* MODE SELECT: Two clear options                                      */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {replyMode === 'select' && (
                        <div className="p-5">
                            <p className="text-sm font-medium text-white/70 mb-4">How would you like to reply?</p>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Auto Reply */}
                                <button
                                    type="button"
                                    onClick={handleAutoReply}
                                    className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-left"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">🤖</span>
                                        <span className="font-semibold text-white">Auto Reply</span>
                                    </div>
                                    <p className="text-xs text-white/50">
                                        AI generates a response based on the email — one click!
                                    </p>
                                </button>

                                {/* Write Reply */}
                                <button
                                    type="button"
                                    onClick={handleWriteReply}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all text-left"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">✍️</span>
                                        <span className="font-semibold text-white">Write Reply</span>
                                    </div>
                                    <p className="text-xs text-white/50">
                                        Type or speak your message — AI can polish it
                                    </p>
                                </button>
                            </div>

                            {error && (
                                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    ⚠️ {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* AUTO REPLY: Generating or Preview                                   */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {replyMode === 'auto' && (
                        <div className="p-5">
                            {/* Back button */}
                            <button
                                onClick={resetReplyState}
                                className="flex items-center gap-1 text-sm text-white/50 hover:text-white/70 mb-4"
                            >
                                ← Back to options
                            </button>

                            {isGenerating ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-4" />
                                    <p className="text-white/70">AI is writing your reply...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Subject */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-white/70 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    {/* Generated Reply */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-white/70">🤖 AI Generated Reply</label>
                                        </div>
                                        <textarea
                                            value={generatedReply}
                                            onChange={(e) => setGeneratedReply(e.target.value)}
                                            rows={8}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                                        />
                                    </div>

                                    {/* Regenerate button */}
                                    <button
                                        onClick={handleAutoReply}
                                        disabled={isGenerating}
                                        className="mb-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition flex items-center gap-2"
                                    >
                                        🔄 Regenerate
                                    </button>

                                    {error && (
                                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    {/* Send button */}
                                    <button
                                        onClick={handleSend}
                                        disabled={isSending || !generatedReply.trim()}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Reply</span>
                                                <span>→</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* WRITE REPLY: User composes with optional polish                     */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {replyMode === 'write' && (
                        <div className="p-5">
                            {/* Back button */}
                            <button
                                onClick={resetReplyState}
                                className="flex items-center gap-1 text-sm text-white/50 hover:text-white/70 mb-4"
                            >
                                ← Back to options
                            </button>

                            {!showPolished ? (
                                <>
                                    {/* User message input */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-white/70">Your message</label>
                                            <VoiceButton
                                                onTranscription={handleVoiceInput}
                                                size="sm"
                                            />
                                        </div>
                                        <textarea
                                            value={userMessage}
                                            onChange={(e) => setUserMessage(e.target.value)}
                                            placeholder="Type or speak your reply... e.g., 'Thanks for the update, looking forward to hearing back'"
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                                        />
                                        <p className="text-xs text-white/40 mt-2">
                                            💡 Click 🎙️ to speak your reply
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {userMessage.trim() && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Send as-is */}
                                            <button
                                                onClick={handleSend}
                                                disabled={isSending}
                                                className="py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition flex items-center justify-center gap-2"
                                            >
                                                <span>⚡</span>
                                                <span>Quick Send</span>
                                            </button>

                                            {/* Polish first */}
                                            <button
                                                onClick={handlePolish}
                                                disabled={isPolishing}
                                                className="py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                            >
                                                {isPolishing ? (
                                                    <>
                                                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        <span>Polishing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>✨</span>
                                                        <span>Polish with AI</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Polished preview */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-white/70 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-white/70">✨ Polished Reply</label>
                                            <button
                                                onClick={() => setShowPolished(false)}
                                                className="text-xs text-white/40 hover:text-white/70"
                                            >
                                                ← Edit original
                                            </button>
                                        </div>
                                        <textarea
                                            value={generatedReply}
                                            onChange={(e) => setGeneratedReply(e.target.value)}
                                            rows={8}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                                        />
                                    </div>

                                    {error && (
                                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSend}
                                        disabled={isSending || !generatedReply.trim()}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Reply</span>
                                                <span>→</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
