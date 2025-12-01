'use client';

import { useState, useRef, useEffect } from 'react';
import { VoiceButton } from './VoiceButton';
import { EmailCard } from './EmailCard';

interface EmailPanelProps {
    thread: any;
    isOpen: boolean;
    onClose: () => void;
}

type ReplyMode = 'intent' | 'write' | 'auto';

// Smart suggestion chips based on email type
const intentSuggestions = [
    { emoji: '👍', label: 'Acknowledge', prompt: 'acknowledge receipt and thank them' },
    { emoji: '📅', label: 'Schedule', prompt: 'suggest scheduling a meeting' },
    { emoji: '❓', label: 'Ask Question', prompt: 'ask for more details' },
    { emoji: '✅', label: 'Confirm', prompt: 'confirm and agree' },
    { emoji: '❌', label: 'Decline', prompt: 'politely decline' },
    { emoji: '⏰', label: 'Delay', prompt: 'ask for more time' },
    { emoji: '🔄', label: 'Follow Up', prompt: 'follow up on previous discussion' },
    { emoji: '📎', label: 'Share Info', prompt: 'share requested information' },
];

export function EmailPanel({ thread, isOpen, onClose }: EmailPanelProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyMode, setReplyMode] = useState<ReplyMode | null>(null);

    // Intent mode state
    const [userIntent, setUserIntent] = useState('');
    const [selectedChips, setSelectedChips] = useState<string[]>([]);

    // Write mode state
    const [manualReply, setManualReply] = useState('');

    // Generated draft
    const [generatedDraft, setGeneratedDraft] = useState('');
    const [draftLoading, setDraftLoading] = useState(false);
    const [showDraft, setShowDraft] = useState(false);

    useEffect(() => {
        if (isOpen && thread?.id) {
            loadThread();
            resetReplyState();
        }
    }, [isOpen, thread?.id]);

    const resetReplyState = () => {
        setReplyMode(null);
        setUserIntent('');
        setSelectedChips([]);
        setManualReply('');
        setGeneratedDraft('');
        setShowDraft(false);
    };

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
                initials: words.length >= 2
                    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                    : name.slice(0, 2).toUpperCase()
            };
        }
        return { name: from.split('@')[0], email: from, initials: from.slice(0, 2).toUpperCase() };
    };

    const toggleChip = (prompt: string) => {
        setSelectedChips(prev =>
            prev.includes(prompt)
                ? prev.filter(p => p !== prompt)
                : [...prev, prompt]
        );
    };

    const generateDraft = async (mode: 'intent' | 'auto' | 'improve') => {
        setDraftLoading(true);
        setShowDraft(true);

        try {
            const lastMessage = messages[messages.length - 1];

            let replyContext = '';
            if (mode === 'intent') {
                const chipText = selectedChips.length > 0 ? selectedChips.join(', ') : '';
                const intentText = userIntent.trim();
                replyContext = [chipText, intentText].filter(Boolean).join('. Also: ');
                if (!replyContext) {
                    replyContext = 'Write an appropriate professional reply';
                }
            } else if (mode === 'improve') {
                replyContext = `Improve this draft: ${manualReply}`;
            } else {
                replyContext = 'Write an appropriate professional reply based on the email context';
            }

            const res = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalEmail: lastMessage?.body || lastMessage?.snippet || '',
                    subject: thread?.subject || '',
                    from: lastMessage?.from || '',
                    replyContext,
                    mode: mode === 'improve' ? 'full' : mode,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedDraft(data.draft);
                setManualReply(data.draft);
                setReplyMode('write'); // Switch to write mode to show editable draft
            }
        } catch (e) {
            console.error('Draft generation failed:', e);
            setGeneratedDraft('Failed to generate draft. Please try again.');
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
                <div className="flex items-start justify-between p-6 border-b border-white/10">
                    <div className="flex-1 pr-4">
                        <h2 className="text-xl font-semibold text-white mb-1">
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

                {/* Email Content - Scrollable */}
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
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {sender.initials}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="font-semibold text-white">{sender.name}</span>
                                                    {sender.email && <span className="text-xs text-white/40">&lt;{sender.email}&gt;</span>}
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

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* REPLY COMPOSER - THE NEW DESIGN                                     */}
                {/* ═══════════════════════════════════════════════════════════════════ */}

                <div className="border-t border-white/10 bg-[#0d0d0d]">

                    {/* Mode Selection - Show when no mode selected */}
                    {!replyMode && !showDraft && (
                        <div className="p-5">
                            <p className="text-sm font-medium text-white/80 mb-4">How would you like to reply?</p>

                            <div className="grid grid-cols-3 gap-3">
                                {/* Option 1: Quick Intent */}
                                <button
                                    onClick={() => setReplyMode('intent')}
                                    className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all text-left group"
                                >
                                    <span className="text-2xl mb-2 block">🎯</span>
                                    <span className="font-medium text-white block mb-1">Quick Intent</span>
                                    <span className="text-xs text-white/50">Tell me what to say</span>
                                </button>

                                {/* Option 2: Write Yourself */}
                                <button
                                    onClick={() => setReplyMode('write')}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
                                >
                                    <span className="text-2xl mb-2 block">📝</span>
                                    <span className="font-medium text-white block mb-1">Write Myself</span>
                                    <span className="text-xs text-white/50">Compose from scratch</span>
                                </button>

                                {/* Option 3: Auto Reply */}
                                <button
                                    onClick={() => generateDraft('auto')}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
                                >
                                    <span className="text-2xl mb-2 block">🤖</span>
                                    <span className="font-medium text-white block mb-1">Auto Reply</span>
                                    <span className="text-xs text-white/50">AI writes for you</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* INTENT MODE - Natural language + chips                              */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {replyMode === 'intent' && !showDraft && (
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-white/80">What do you want to say?</p>
                                <button onClick={resetReplyState} className="text-xs text-white/40 hover:text-white/70">
                                    ← Back
                                </button>
                            </div>

                            {/* Voice + Text Input */}
                            <div className="relative mb-4">
                                <textarea
                                    value={userIntent}
                                    onChange={(e) => setUserIntent(e.target.value)}
                                    placeholder="e.g., Thank them for the update, confirm I'm interested, ask about next steps..."
                                    rows={3}
                                    className="w-full px-4 py-3 pr-16 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50"
                                />

                                {/* Voice Button */}
                                <div className="absolute bottom-3 right-3">
                                    <VoiceButton
                                        onTranscription={(text) => setUserIntent(prev => prev ? `${prev} ${text}` : text)}
                                        size="sm"
                                    />
                                </div>
                            </div>

                            {/* Quick action chips */}
                            <p className="text-xs text-white/50 mb-2">Or quick select:</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {intentSuggestions.map((chip) => (
                                    <button
                                        key={chip.label}
                                        onClick={() => toggleChip(chip.prompt)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${selectedChips.includes(chip.prompt)
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 border'
                                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                                            }`}
                                    >
                                        <span>{chip.emoji}</span>
                                        <span>{chip.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Generate button */}
                            <button
                                onClick={() => generateDraft('intent')}
                                disabled={!userIntent.trim() && selectedChips.length === 0}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span>✨</span>
                                <span>Generate Reply</span>
                            </button>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* WRITE MODE - Manual composition or editing generated draft          */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {replyMode === 'write' && (
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-white/80">
                                    {generatedDraft ? 'Edit your reply:' : 'Write your reply:'}
                                </p>
                                <button onClick={resetReplyState} className="text-xs text-white/40 hover:text-white/70">
                                    ← Back
                                </button>
                            </div>

                            <textarea
                                value={manualReply}
                                onChange={(e) => setManualReply(e.target.value)}
                                placeholder="Write your reply..."
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 mb-4"
                            />

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => generateDraft('improve')}
                                    disabled={draftLoading || !manualReply.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition disabled:opacity-50"
                                >
                                    {draftLoading ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full" />
                                            <span>Improving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>Improve with AI</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    disabled={!manualReply.trim()}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                >
                                    Send Reply
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────────── */}
                    {/* LOADING STATE                                                        */}
                    {/* ─────────────────────────────────────────────────────────────────── */}

                    {draftLoading && showDraft && !replyMode && (
                        <div className="p-8 flex flex-col items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-4" />
                            <p className="text-white/70">AI is writing your reply...</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
