'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceButton } from './VoiceButton';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRecipient?: { name: string; email: string };
    defaultIntent?: string;
}

export function ComposeModal({ isOpen, onClose, defaultRecipient, defaultIntent }: ComposeModalProps) {
    // Form state
    const [recipient, setRecipient] = useState<{ name: string; email: string } | null>(null);
    const [recipientInput, setRecipientInput] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // UI state
    const [isPolishing, setIsPolishing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPolished, setShowPolished] = useState(false);
    const [polishedBody, setPolishedBody] = useState('');

    const bodyRef = useRef<HTMLTextAreaElement>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setRecipient(defaultRecipient || null);
            setRecipientInput('');
            setSubject('');
            setBody(defaultIntent || '');
            setError(null);
            setShowPolished(false);
            setPolishedBody('');
        }
    }, [isOpen, defaultRecipient, defaultIntent]);

    // Smart voice transcription handler
    const handleVoiceTranscription = async (transcript: string) => {
        setIsParsing(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/parse-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    existingTo: recipient?.email || recipientInput,
                    existingSubject: subject,
                    existingBody: body,
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // Update To field if detected
                if (data.to?.detected && data.to.email) {
                    setRecipient({
                        name: data.to.name || data.to.email.split('@')[0],
                        email: data.to.email
                    });
                    setRecipientInput('');
                } else if (data.to?.name && !recipient) {
                    // Just a name mentioned, put in input for user to complete
                    setRecipientInput(data.to.name);
                }

                // Update Subject if detected and empty
                if (data.subject?.detected && data.subject.text && !subject) {
                    setSubject(data.subject.text);
                }

                // Update Body
                if (data.body?.detected && data.body.text) {
                    setBody(prev => prev ? `${prev}\n\n${data.body.text}` : data.body.text);
                }
            } else {
                // Fallback: just append to body
                setBody(prev => prev ? `${prev} ${transcript}` : transcript);
            }
        } catch (e) {
            console.error('Parse error:', e);
            // Fallback: just append to body
            setBody(prev => prev ? `${prev} ${transcript}` : transcript);
        } finally {
            setIsParsing(false);
        }
    };

    // Handle manual email input
    const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && recipientInput.trim()) {
            const input = recipientInput.trim();

            // Try to parse email
            const emailMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                const email = emailMatch[1];
                const nameMatch = input.match(/^([^<]+)</);
                const name = nameMatch ? nameMatch[1].trim() : email.split('@')[0];
                setRecipient({ name, email });
                setRecipientInput('');
            } else if (input.includes('@')) {
                setRecipient({ name: input.split('@')[0], email: input });
                setRecipientInput('');
            } else {
                setError('Please enter a valid email address');
            }
        }
    };

    // Polish with AI
    const handlePolish = async () => {
        if (!body.trim()) {
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
                    rawMessage: body,
                    recipientName: recipient?.name,
                    isReply: false,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setPolishedBody(data.body || body);
                setShowPolished(true);
            } else {
                const errorData = await res.json();
                setError(errorData.details || 'Failed to polish message');
            }
        } catch (e) {
            setError('Failed to polish message');
        } finally {
            setIsPolishing(false);
        }
    };

    // Send email
    const handleSend = async (usePolished: boolean = false) => {
        const emailBody = usePolished ? polishedBody : body;

        if (!recipient?.email) {
            setError('Please add a recipient');
            return;
        }
        if (!emailBody.trim()) {
            setError('Please write a message');
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const res = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient.email,
                    subject: subject || '(No Subject)',
                    message: emailBody,
                }),
            });

            if (res.ok) {
                onClose();
                // Success!
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Failed to send email');
            }
        } catch (e) {
            setError('Failed to send email');
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
                                {isParsing ? '🎙️ Processing voice...' : showPolished ? 'Review & Send' : 'Type or speak your message'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* Voice Input Banner - Prominent CTA */}
                    {!showPolished && (
                        <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-white font-medium mb-1 flex items-center gap-2">
                                        <span>🎙️</span>
                                        <span>Voice Compose</span>
                                    </p>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Speak naturally: "Send to john@email.com about the meeting. Hey John, are you free tomorrow?"
                                    </p>
                                </div>
                                <VoiceButton
                                    onTranscription={handleVoiceTranscription}
                                    size="lg"
                                />
                            </div>
                        </div>
                    )}

                    {!showPolished ? (
                        <>
                            {/* To Field */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-2">To</label>
                                {recipient ? (
                                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                {recipient.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{recipient.name}</p>
                                                <p className="text-white/50 text-xs">{recipient.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setRecipient(null)}
                                            className="text-xs text-white/40 hover:text-white/70"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={recipientInput}
                                        onChange={(e) => setRecipientInput(e.target.value)}
                                        onKeyDown={handleRecipientKeyDown}
                                        placeholder="name@email.com or Name <email@domain.com>"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                                    />
                                )}
                            </div>

                            {/* Subject Field */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-white/70 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Enter subject..."
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>

                            {/* Message Field */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-white/70">Message</label>
                                    <VoiceButton
                                        onTranscription={handleVoiceTranscription}
                                        size="sm"
                                    />
                                </div>
                                <textarea
                                    ref={bodyRef}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Type or speak your message..."
                                    rows={10}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                                />
                                <p className="text-xs text-white/40 mt-2">
                                    💡 Voice will auto-fill To, Subject, and Message fields
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Polished Preview */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-white/70">✨ Polished Email</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPolished(false)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        ← Edit original
                                    </button>
                                </div>

                                <div className="mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-white/50 text-xs mb-1">To</p>
                                    <p className="text-white">{recipient?.email}</p>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-xs text-white/50 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="(No Subject)"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Message</label>
                                    <textarea
                                        value={polishedBody}
                                        onChange={(e) => setPolishedBody(e.target.value)}
                                        rows={10}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-[#0d0d0d]">
                    {!showPolished ? (
                        <div className="flex items-center gap-3">
                            {/* Quick Send */}
                            <button
                                type="button"
                                onClick={() => handleSend(false)}
                                disabled={isSending || !body.trim() || !recipient}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚡</span>
                                        <span>Quick Send</span>
                                    </>
                                )}
                            </button>

                            {/* Polish with AI */}
                            <button
                                type="button"
                                onClick={handlePolish}
                                disabled={isPolishing || !body.trim()}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSend(true)}
                            disabled={isSending}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    )}
                </div>
            </div>
        </>
    );
}
