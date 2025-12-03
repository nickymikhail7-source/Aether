'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceButton } from './VoiceButton';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRecipient?: { name: string; email: string };
    defaultIntent?: string;
}

interface EmailDraft {
    to: { name: string; email: string } | null;
    subject: string;
    body: string;
}

export function ComposeModal({ isOpen, onClose, defaultRecipient, defaultIntent }: ComposeModalProps) {
    const [draft, setDraft] = useState<EmailDraft>({ to: null, subject: '', body: '' });
    const [manualRecipient, setManualRecipient] = useState('');
    const [isPolishing, setIsPolishing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showPolished, setShowPolished] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setDraft({
                to: defaultRecipient || null,
                subject: '',
                body: defaultIntent || ''
            });
            setManualRecipient('');
            setIsPolishing(false);
            setShowPolished(false);
            setError(null);
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen, defaultRecipient, defaultIntent]);

    const handleVoiceInput = (text: string) => {
        setDraft(prev => ({
            ...prev,
            body: prev.body ? `${prev.body} ${text}` : text
        }));
    };

    const handleAddManualRecipient = () => {
        if (!manualRecipient.trim()) return;

        // Parse email
        const emailMatch = manualRecipient.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            const email = emailMatch[1];
            const nameMatch = manualRecipient.match(/^([^<]+)</);
            const name = nameMatch ? nameMatch[1].trim() : email.split('@')[0];
            setDraft({ ...draft, to: { name, email } });
            setManualRecipient('');
        } else if (manualRecipient.includes('@')) {
            setDraft({ ...draft, to: { name: manualRecipient.split('@')[0], email: manualRecipient } });
            setManualRecipient('');
        } else {
            setError('Please enter a valid email address');
        }
    };

    const handlePolish = async () => {
        if (!draft.body.trim()) {
            setError('Please write a message first');
            return;
        }

        setIsPolishing(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawMessage: draft.body,
                    recipientName: draft.to?.name,
                    senderName: 'Nikhil', // Should come from session
                    isReply: false,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setDraft(prev => ({ ...prev, body: data.body }));
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

    const handleSend = async () => {
        if (!draft.to?.email) {
            setError('Please add a recipient');
            return;
        }
        if (!draft.body.trim()) {
            setError('Email body cannot be empty');
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const res = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: draft.to.email,
                    subject: draft.subject,
                    message: draft.body,
                }),
            });

            if (res.ok) {
                onClose();
                // Could add success toast here
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Failed to send email');
            }
        } catch (e) {
            console.error('Send error:', e);
            setError('Failed to send email. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[680px] md:max-h-[90vh] bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-lg">✨</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Compose</h2>
                            <p className="text-xs text-white/50">
                                {showPolished ? 'Review & Send' : 'Draft your message'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">To</label>
                        {draft.to ? (
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                        {draft.to.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{draft.to.name}</p>
                                        <p className="text-white/50 text-xs">{draft.to.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDraft({ ...draft, to: null })}
                                    className="text-white/40 hover:text-white/70 text-sm"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualRecipient}
                                    onChange={(e) => setManualRecipient(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualRecipient()}
                                    placeholder="name@email.com or Name <email@domain.com>"
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                                />
                                {manualRecipient && (
                                    <button
                                        onClick={handleAddManualRecipient}
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition"
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Subject</label>
                        <input
                            type="text"
                            value={draft.subject}
                            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                            placeholder="Enter subject..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-white/70">Message</label>
                            {!showPolished && (
                                <VoiceButton onTranscription={handleVoiceInput} size="sm" />
                            )}
                            {showPolished && (
                                <button
                                    onClick={() => setShowPolished(false)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300"
                                >
                                    ← Edit original
                                </button>
                            )}
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={draft.body}
                            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                            placeholder="Type or speak your message... e.g., 'Hi Sarah, checking in on the project status.'"
                            rows={10}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                        />

                        {!showPolished && (
                            <p className="text-xs text-white/40 mt-2">
                                💡 Click 🎙️ to speak your message
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-[#0d0d0d]">
                    <div className="flex items-center gap-3">
                        {!showPolished ? (
                            <>
                                <button
                                    onClick={handleSend}
                                    disabled={isSending || !draft.to?.email || !draft.body.trim()}
                                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition flex items-center justify-center gap-2"
                                >
                                    <span>⚡</span>
                                    <span>Send As-Is</span>
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={handlePolish}
                                    disabled={isPolishing || !draft.body.trim()}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    {isPolishing ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                            <span>Polishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>Polish & Preview</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex-1" />
                                <button
                                    onClick={handleSend}
                                    disabled={isSending}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    {isSending ? (
                                        <>
                                            <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Send Email</span>
                                            <span>→</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
