'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceButton } from './VoiceButton';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRecipient?: { name: string; email: string };
    defaultIntent?: string;
}

type ComposeStep = 'intent' | 'preview';
type Tone = 'professional' | 'friendly' | 'formal';

interface EmailDraft {
    to: { name: string; email: string } | null;
    subject: string;
    body: string;
}

const quickTemplates = [
    { emoji: '📅', label: 'Meeting', prompt: 'schedule a meeting to discuss' },
    { emoji: '🙏', label: 'Thank You', prompt: 'send a thank you for' },
    { emoji: '📋', label: 'Follow Up', prompt: 'follow up on' },
    { emoji: '❓', label: 'Question', prompt: 'ask about' },
    { emoji: '📣', label: 'Update', prompt: 'share an update about' },
    { emoji: '🤝', label: 'Intro', prompt: 'introduce myself regarding' },
    { emoji: '⏰', label: 'Reminder', prompt: 'send a reminder about' },
    { emoji: '📄', label: 'Share', prompt: 'share information about' },
];

export function ComposeModal({ isOpen, onClose, defaultRecipient, defaultIntent }: ComposeModalProps) {
    const [step, setStep] = useState<ComposeStep>('intent');
    const [userIntent, setUserIntent] = useState('');
    const [tone, setTone] = useState<Tone>('professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [draft, setDraft] = useState<EmailDraft>({ to: null, subject: '', body: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualRecipient, setManualRecipient] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('intent');
            setUserIntent(defaultIntent || '');
            setDraft({ to: defaultRecipient || null, subject: '', body: '' });
            setIsEditing(false);
            setError(null);
            setManualRecipient('');
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen, defaultIntent, defaultRecipient]);

    const handleVoiceTranscription = (text: string) => {
        setUserIntent(prev => {
            const newText = prev ? `${prev} ${text}` : text;
            return newText;
        });
    };

    const handleTemplateClick = (prompt: string) => {
        setUserIntent(prev => prev ? `${prev}, ${prompt}` : prompt);
        textareaRef.current?.focus();
    };

    const generateEmail = async () => {
        if (!userIntent.trim()) {
            setError('Please describe what you want to send');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/compose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent: userIntent,
                    tone,
                    existingRecipient: draft.to,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setDraft({
                    to: data.recipient || draft.to,
                    subject: data.subject || '',
                    body: data.body || '',
                });
                setStep('preview');
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Failed to generate email');
            }
        } catch (e) {
            console.error('Generate error:', e);
            setError('Failed to generate email. Please try again.');
        } finally {
            setIsGenerating(false);
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
                    message: draft.body, // Changed from body to message to match existing API
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
                                {step === 'intent' ? 'Describe your message' : 'Review & send'}
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
                <div className="flex-1 overflow-y-auto p-5">

                    {/* ════════════════════════════════════════════════════════════════ */}
                    {/* STEP 1: INTENT                                                    */}
                    {/* ════════════════════════════════════════════════════════════════ */}

                    {step === 'intent' && (
                        <div className="space-y-5">

                            {/* Main Voice/Text Input */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    What do you want to send?
                                </label>
                                <div className="relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={userIntent}
                                        onChange={(e) => setUserIntent(e.target.value)}
                                        placeholder="e.g., Email Sarah at Sequoia about our Series A meeting next week. Mention our 3x growth and new enterprise customers."
                                        rows={4}
                                        className="w-full px-4 py-3 pr-16 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 text-base leading-relaxed"
                                    />

                                    {/* Voice Button */}
                                    <div className="absolute bottom-3 right-3">
                                        <VoiceButton
                                            onTranscription={handleVoiceTranscription}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                                    <span>💡</span>
                                    <span>Click 🎙️ to speak your message, or type above</span>
                                </p>
                            </div>

                            {/* Quick Templates */}
                            <div>
                                <p className="text-xs text-white/50 mb-2">Quick templates:</p>
                                <div className="flex flex-wrap gap-2">
                                    {quickTemplates.map((t) => (
                                        <button
                                            key={t.label}
                                            onClick={() => handleTemplateClick(t.prompt)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 transition"
                                        >
                                            <span>{t.emoji}</span>
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recipient (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    To <span className="text-white/40 font-normal">(optional - AI can detect from message)</span>
                                </label>
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

                            {/* Tone Selector */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Tone</label>
                                <div className="flex gap-2">
                                    {(['professional', 'friendly', 'formal'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`px-4 py-2 rounded-xl text-sm capitalize transition ${tone === t
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 border'
                                                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                        >
                                            {t === 'professional' ? '💼 Professional' : t === 'friendly' ? '😊 Friendly' : '📜 Formal'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    ⚠️ {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════════ */}
                    {/* STEP 2: PREVIEW                                                   */}
                    {/* ════════════════════════════════════════════════════════════════ */}

                    {step === 'preview' && (
                        <div className="space-y-4">

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
                                            className="text-xs text-indigo-400 hover:text-indigo-300"
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
                                            placeholder="Add recipient email..."
                                            className="flex-1 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
                                        />
                                        <button
                                            onClick={handleAddManualRecipient}
                                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition"
                                        >
                                            Add
                                        </button>
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
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-white/70">Message</label>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        {isEditing ? '✓ Done' : '✏️ Edit'}
                                    </button>
                                </div>
                                {isEditing ? (
                                    <textarea
                                        value={draft.body}
                                        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                                        rows={12}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none focus:outline-none focus:border-indigo-500/50 font-mono text-sm leading-relaxed"
                                    />
                                ) : (
                                    <div
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white/90 whitespace-pre-wrap leading-relaxed cursor-text hover:border-white/20 transition min-h-[250px]"
                                    >
                                        {draft.body || 'Click to edit...'}
                                    </div>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    ⚠️ {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-[#0d0d0d]">
                    {step === 'intent' ? (
                        <button
                            onClick={generateEmail}
                            disabled={isGenerating || !userIntent.trim()}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨</span>
                                    <span>Generate Email</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setStep('intent')}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={generateEmail}
                                disabled={isGenerating}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition flex items-center gap-2"
                            >
                                🔄 Regenerate
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={handleSend}
                                disabled={isSending || !draft.to?.email || !draft.body.trim()}
                                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {isSending ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
